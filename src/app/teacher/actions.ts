"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import {
  assessmentAttendanceStatuses,
  buildMonthlyAssessment,
  getBatchesCollectionName,
  getMonthlyAssessmentsCollectionName,
  isAssessmentAttendanceStatus,
  type MeetingAssessmentInput
} from "@/lib/assessments";
import {
  getBillingPeriodFromDate,
  isBillingPeriodClosed
} from "@/lib/billing-periods";
import { getClassSessionsCollectionName, hasClassSessionEnded, type ClassSessionDocument } from "@/lib/class-sessions";
import {
  getBatchClassSessionsCollectionName,
  getJakartaPeriod,
  hasBatchClassEnded,
  type BatchAttendanceEntry,
  type BatchClassSessionDocument
} from "@/lib/batch-class-sessions";
import {
  getGameSessionExpiry,
  getGameSessionsCollectionName,
  type GameSessionDocument
} from "@/lib/game-sessions";
import {
  getStudentAttendanceCollectionName,
  isAttendanceStatus,
  type AttendanceStatus
} from "@/lib/attendance";
import { getMongoDb } from "@/lib/mongodb";
import { recordEmployeeLogin } from "@/lib/employee-login-audit";
import { getStudentPaymentsCollectionName, getSuggestedPerMeetingPrice } from "@/lib/payments";
import { getActiveStudentFilter, getStudentRegistrationCollectionName, isClassMode } from "@/lib/student-registration";
import {
  createTeacherSessionToken,
  getTeacherPassword,
  isValidTeacherSession,
  TEACHER_ID_COOKIE,
  TEACHER_SESSION_COOKIE
} from "@/lib/teacher-auth";
import { getEmployeeTeacherById, getEmployeeTeacherByUsername, normalizeEmployeeUsername, type TeacherOption } from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberInRange(value: FormDataEntryValue | null, min: number, max: number, fallback = min) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function isBillableAttendance(status: AttendanceStatus) {
  return status === "Present" || status === "Late";
}

function getBasicGroupStudentFilter() {
  return {
    $and: [getActiveStudentFilter(), { classType: "Basic Group" }]
  };
}

function parseAssessmentMeetings(formData: FormData) {
  const meetings: MeetingAssessmentInput[] = [];

  for (let index = 1; index <= 12; index += 1) {
    const attendance = clean(formData.get(`attendance_${index}`));
    meetings.push({
      attendance: isAssessmentAttendanceStatus(attendance) ? attendance : assessmentAttendanceStatuses[1],
      participationStars: numberInRange(formData.get(`stars_${index}`), 0, 5, 0),
      minutesLate: numberInRange(formData.get(`late_${index}`), 0, 240, 0)
    });
  }

  return meetings;
}

async function getCurrentTeacher() {
  const cookieStore = await cookies();
  const teacherId = cookieStore.get(TEACHER_ID_COOKIE)?.value || "";
  const session = cookieStore.get(TEACHER_SESSION_COOKIE)?.value || "";

  const db = await getMongoDb();
  const teacher = await getEmployeeTeacherById(db, teacherId);

  if (!teacher?.username || !isValidTeacherSession(teacher.id, teacher.username, session)) {
    return null;
  }

  return teacher;
}

async function assertTeacher() {
  const teacher = await getCurrentTeacher();
  if (!teacher) {
    throw new Error("Unauthorized");
  }
  return teacher;
}

async function syncPaymentFromTeacherAttendance({
  studentId,
  studentName,
  courseJoined,
  classType,
  classMode,
  meetingNumber,
  meetingDate,
  status
}: {
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  meetingNumber: number;
  meetingDate: string;
  status: AttendanceStatus;
}) {
  const db = await getMongoDb();
  const payments = db.collection(getStudentPaymentsCollectionName());
  const amountDue = getSuggestedPerMeetingPrice(courseJoined, classType);
  const period = getBillingPeriodFromDate(meetingDate);

  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized records cannot be changed.");
  }

  if (!isBillableAttendance(status) || amountDue <= 0) {
    await payments.deleteOne({
      $or: [
        { studentId, meetingNumber, billingMonth: period.billingMonth, billingYear: period.billingYear, status: "Unpaid", source: "attendance" },
        { studentId, meetingNumber, meetingDate, status: "Unpaid", source: "attendance" }
      ]
    });
    return;
  }

  const now = new Date();

  await payments.updateOne(
    {
      $or: [
        { studentId, meetingNumber, billingMonth: period.billingMonth, billingYear: period.billingYear },
        { studentId, meetingNumber, meetingDate, source: "attendance" }
      ]
    },
    {
      $set: {
        studentId,
        studentName,
        courseJoined,
        classType,
        classMode,
        meetingNumber,
        meetingDate,
        billingMonth: period.billingMonth,
        billingYear: period.billingYear,
        billingPeriod: period.billingPeriod,
        amountDue,
        source: "attendance",
        attendanceStatus: status,
        updatedAt: now
      },
      $setOnInsert: {
        status: "Unpaid",
        paidDate: "",
        paymentMethod: "",
        notes: "",
        receiptUploadedToDrive: false,
        createdAt: now
      }
    },
    { upsert: true }
  );
}

export async function loginTeacher(_: unknown, formData: FormData) {
  const username = normalizeEmployeeUsername(clean(formData.get("username")) || clean(formData.get("teacherId")));
  const password = clean(formData.get("password"));

  const db = await getMongoDb();
  const teacher = await getEmployeeTeacherByUsername(db, username);

  if (!teacher) {
    return { error: "Select a valid teacher." };
  }

  if (!teacher.username) {
    return { error: "This employee does not have a portal username configured yet." };
  }

  const teacherPassword = getTeacherPassword(teacher.username);
  if (!teacherPassword) {
    return { error: "This teacher password is not configured yet." };
  }

  if (password !== teacherPassword) {
    return { error: "Invalid password." };
  }

  await recordEmployeeLogin(db, teacher.id, "Teacher");

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/teacher"
  };

  cookieStore.set(TEACHER_ID_COOKIE, teacher.id, cookieOptions);
  cookieStore.set(TEACHER_SESSION_COOKIE, createTeacherSessionToken(teacher.id, teacher.username), cookieOptions);

  redirect("/teacher");
}

export async function logoutTeacher() {
  const cookieStore = await cookies();
  cookieStore.delete(TEACHER_ID_COOKIE);
  cookieStore.delete(TEACHER_SESSION_COOKIE);
  redirect("/teacher");
}

export async function saveTeacherAttendance(formData: FormData) {
  const teacher = await assertTeacher();

  const classSessionId = clean(formData.get("classSessionId"));
  const status = clean(formData.get("status")) as AttendanceStatus;
  const classMode = clean(formData.get("classMode"));
  const notes = clean(formData.get("notes"));

  if (!ObjectId.isValid(classSessionId) || !isAttendanceStatus(status) || !isClassMode(classMode)) {
    throw new Error("Invalid attendance record");
  }

  const db = await getMongoDb();
  const session = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).findOne({ _id: new ObjectId(classSessionId) });

  if (!session?.studentId || !session.meetingNumber || !session.sessionDate || !session.teacherIds?.includes(teacher.id)) {
    throw new Error("Class session not found for this teacher");
  }

  if (!hasClassSessionEnded(session)) {
    throw new Error("Attendance can only be marked after the class end time (WIB).");
  }

  const student = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
  }>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId: session.studentId }, getActiveStudentFilter()]
  });
  const studentName = student?.studentName || session.studentName || "Student";
  const courseJoined = student?.courseJoined || session.courseJoined || "";
  const classType = student?.classType || session.classType || "";
  const period = getBillingPeriodFromDate(session.sessionDate);

  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized records cannot be changed.");
  }

  await db.collection(getStudentAttendanceCollectionName()).updateOne(
    {
      $or: [
        { studentId: session.studentId, meetingNumber: session.meetingNumber, billingMonth: period.billingMonth, billingYear: period.billingYear },
        { studentId: session.studentId, meetingNumber: session.meetingNumber, meetingDate: session.sessionDate }
      ]
    },
    {
      $set: {
        studentId: session.studentId,
        studentName,
        courseJoined,
        classType,
        classMode,
        meetingNumber: session.meetingNumber,
        meetingDate: session.sessionDate,
        billingMonth: period.billingMonth,
        billingYear: period.billingYear,
        billingPeriod: period.billingPeriod,
        status,
        notes,
        teacherIds: [teacher.id],
        teacherNames: [teacher.name],
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  await syncPaymentFromTeacherAttendance({
    studentId: session.studentId,
    studentName,
    courseJoined,
    classType,
    classMode,
    meetingNumber: session.meetingNumber,
    meetingDate: session.sessionDate,
    status
  });

  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).deleteMany({
    $or: [
      { studentId: session.studentId, meetingNumber: session.meetingNumber, billingMonth: period.billingMonth, billingYear: period.billingYear },
      { studentId: session.studentId, meetingNumber: session.meetingNumber, sessionDate: session.sessionDate }
    ]
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/journals");
  revalidatePath("/admin/attendance");
  revalidatePath("/finance/payments");
  revalidatePath("/admin/sessions");
  revalidatePath("/ceo");
}

export async function updateTeacherJournal(formData: FormData) {
  const teacher = await assertTeacher();
  const attendanceId = clean(formData.get("attendanceId"));
  const notes = clean(formData.get("notes"));

  if (!ObjectId.isValid(attendanceId)) {
    throw new Error("Invalid journal record");
  }

  if (notes.length > 4000) {
    throw new Error("Journal notes are too long");
  }

  const db = await getMongoDb();
  const recordId = new ObjectId(attendanceId);
  const existingRecord = await db.collection(getStudentAttendanceCollectionName()).findOne({
    _id: recordId,
    teacherIds: teacher.id
  });

  if (!existingRecord) {
    throw new Error("Journal record not found for this teacher");
  }

  await db.collection(getStudentAttendanceCollectionName()).updateOne(
    { _id: recordId },
    {
      $set: {
        notes,
        journalUpdatedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/teacher");
  revalidatePath("/teacher/journals");
  revalidatePath("/admin/attendance");
}

export async function generateTeacherGamesLink(formData: FormData) {
  const teacher = await assertTeacher();

  const classSessionId = clean(formData.get("classSessionId"));
  if (!ObjectId.isValid(classSessionId)) {
    throw new Error("Invalid class session");
  }

  const db = await getMongoDb();
  const classSession = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).findOne({ _id: new ObjectId(classSessionId) });

  if (!classSession?.teacherIds?.includes(teacher.id)) {
    throw new Error("Class session not found for this teacher");
  }

  const now = new Date();
  const token = randomBytes(24).toString("base64url");

  await db.collection<GameSessionDocument>(getGameSessionsCollectionName()).updateOne(
    { classSessionId, gameType: "games-hub" },
    {
      $set: {
        token,
        gameType: "games-hub",
        classSessionId,
        studentId: classSession.studentId || "",
        studentName: classSession.studentName || "",
        meetingNumber: classSession.meetingNumber || 0,
        expiresAt: getGameSessionExpiry(now),
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  revalidatePath("/teacher");
}

export async function saveTeacherMonthlyAssessment(formData: FormData) {
  const teacher = await assertTeacher();

  const batchId = clean(formData.get("batchId"));
  const studentId = clean(formData.get("studentId"));
  const month = numberInRange(formData.get("month"), 1, 12, new Date().getMonth() + 1);
  const year = numberInRange(formData.get("year"), 2020, 2100, new Date().getFullYear());

  if (!ObjectId.isValid(batchId) || !studentId) {
    throw new Error("Select a student and batch");
  }

  const db = await getMongoDb();
  const [batch, student] = await Promise.all([
    db.collection(getBatchesCollectionName()).findOne({ _id: new ObjectId(batchId), teacherId: teacher.id }),
    db.collection(getStudentRegistrationCollectionName()).findOne({
      studentId,
      ...getBasicGroupStudentFilter()
    })
  ]);

  if (!batch || !student) {
    throw new Error("Student or batch not found for this teacher");
  }

  if (student.activeBatchId !== batchId) {
    throw new Error("Student must be assigned to this batch before assessment");
  }

  const calculated = buildMonthlyAssessment({
    meetings: parseAssessmentMeetings(formData),
    communication: {
      speaking: numberInRange(formData.get("speaking"), 1, 5, 3),
      pronunciation: numberInRange(formData.get("pronunciation"), 1, 5, 3),
      fluency: numberInRange(formData.get("fluency"), 1, 5, 3)
    },
    englishSkills: {
      vocabulary: numberInRange(formData.get("vocabulary"), 1, 5, 3),
      grammar: numberInRange(formData.get("grammar"), 1, 5, 3)
    },
    creativity: {
      originalIdeas: numberInRange(formData.get("originalIdeas"), 1, 5, 3),
      storytelling: numberInRange(formData.get("storytelling"), 1, 5, 3),
      rolePlay: numberInRange(formData.get("rolePlay"), 1, 5, 3)
    },
    learningHabits: {
      homework: numberInRange(formData.get("homework"), 1, 5, 3),
      respect: numberInRange(formData.get("respect"), 1, 5, 3)
    }
  });
  const ratings = {
    communication: {
      speaking: numberInRange(formData.get("speaking"), 1, 5, 3),
      pronunciation: numberInRange(formData.get("pronunciation"), 1, 5, 3),
      fluency: numberInRange(formData.get("fluency"), 1, 5, 3)
    },
    englishSkills: {
      vocabulary: numberInRange(formData.get("vocabulary"), 1, 5, 3),
      grammar: numberInRange(formData.get("grammar"), 1, 5, 3)
    },
    creativity: {
      originalIdeas: numberInRange(formData.get("originalIdeas"), 1, 5, 3),
      storytelling: numberInRange(formData.get("storytelling"), 1, 5, 3),
      rolePlay: numberInRange(formData.get("rolePlay"), 1, 5, 3)
    },
    learningHabits: {
      homework: numberInRange(formData.get("homework"), 1, 5, 3),
      respect: numberInRange(formData.get("respect"), 1, 5, 3)
    }
  };
  const teacherCommentEn = clean(formData.get("teacherCommentEn")) || calculated.automaticComments.en;
  const teacherCommentId = clean(formData.get("teacherCommentId")) || calculated.automaticComments.id;
  const now = new Date();

  await db.collection(getMonthlyAssessmentsCollectionName()).updateOne(
    {
      studentId,
      month,
      year
    },
    {
      $set: {
        studentId,
        studentName: student.studentName || "Student",
        batchId: batch._id.toString(),
        batchName: batch.batchName || "",
        program: batch.program || "",
        teacherId: teacher.id,
        teacherName: teacher.name,
        month,
        year,
        status: "finalized",
        ...calculated,
        ratings,
        teacherComments: {
          en: teacherCommentEn,
          id: teacherCommentId
        },
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  revalidatePath("/teacher");
  revalidatePath("/teacher/assessments");
  revalidatePath("/admin/batches");
  revalidatePath("/parent");
}

export async function saveBatchClassAttendance(formData: FormData) {
  const teacher = await assertTeacher();
  const sessionId = clean(formData.get("sessionId"));
  if (!ObjectId.isValid(sessionId)) throw new Error("Invalid group class.");

  const db = await getMongoDb();
  const sessions = db.collection<BatchClassSessionDocument>(getBatchClassSessionsCollectionName());
  const session = await sessions.findOne({
    _id: new ObjectId(sessionId),
    teacherId: teacher.id,
    status: "Scheduled"
  });

  if (!session) throw new Error("Scheduled group class not found for this teacher.");
  if (!hasBatchClassEnded(session)) throw new Error("Attendance can only be marked after the class end time (WIB).");

  const attendance: BatchAttendanceEntry[] = session.studentSnapshot.map((student, index) => {
    const status = clean(formData.get(`attendance_${index}`));
    if (!isAssessmentAttendanceStatus(status)) throw new Error(`Select attendance for ${student.studentName}.`);
    return {
      ...student,
      attendance: status,
      participationStars: numberInRange(formData.get(`stars_${index}`), 0, 5, 0),
      minutesLate: numberInRange(formData.get(`late_${index}`), 0, 240, 0)
    };
  });

  const now = new Date();
  await sessions.updateOne(
    { _id: session._id, status: "Scheduled" },
    { $set: { attendance, attendanceMarked: true, attendanceMarkedAt: now, attendanceMarkedBy: teacher.id, status: "Completed", updatedAt: now } }
  );

  const period = getJakartaPeriod(session.sessionDate);
  if (period && session.meetingNumber >= 1 && session.meetingNumber <= 12) {
    const assessments = db.collection(getMonthlyAssessmentsCollectionName());
    for (const entry of attendance) {
      const existing = await assessments.findOne({ studentId: entry.studentId, month: period.month, year: period.year });
      const meetings: MeetingAssessmentInput[] = Array.from({ length: 12 }, (_, index) => {
        const saved = Array.isArray(existing?.meetings) ? existing.meetings[index] as MeetingAssessmentInput | undefined : undefined;
        return saved || { attendance: "Absent", participationStars: 0, minutesLate: 0 };
      });
      meetings[session.meetingNumber - 1] = {
        attendance: entry.attendance,
        participationStars: entry.participationStars,
        minutesLate: entry.minutesLate
      };

      await assessments.updateOne(
        { studentId: entry.studentId, month: period.month, year: period.year },
        {
          $set: {
            studentId: entry.studentId,
            studentName: entry.studentName,
            batchId: session.batchId,
            batchName: session.batchName,
            program: session.program,
            teacherId: teacher.id,
            teacherName: teacher.name,
            month: period.month,
            year: period.year,
            status: existing?.status === "finalized" ? "finalized" : "in-progress",
            meetings,
            updatedAt: now
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
    }
  }

  revalidatePath("/teacher/group-classes");
  revalidatePath("/teacher/assessments");
  revalidatePath("/admin/batches");
  revalidatePath("/parent");
}
