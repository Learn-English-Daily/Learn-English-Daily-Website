"use server";

import { randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import type { ClientSession, Db } from "mongodb";
import { assertFullAdminAccess } from "@/lib/admin-permissions";
import { getBillingPeriodFromDate, isBillingPeriodClosed } from "@/lib/billing-periods";
import {
  getClassSessionsCollectionName,
  getScheduledAt,
  getSessionEndAt,
  type ClassSessionDocument
} from "@/lib/class-sessions";
import {
  getGameSessionExpiry,
  getGameSessionsCollectionName,
  type GameType,
  type GameSessionDocument
} from "@/lib/game-sessions";
import { getMongoClient, getMongoDb } from "@/lib/mongodb";
import { getStudentNextMeetingNumbers } from "@/lib/meeting-sequence";
import { getActiveStudentFilter, getStudentRegistrationCollectionName, isClassMode } from "@/lib/student-registration";
import {
  resolveAvailableTeachers
} from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function addOneHour(time: string) {
  if (!time) return "";
  const [hours = "0", minutes = "0"] = time.split(":");
  const date = new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes)));
  date.setUTCHours(date.getUTCHours() + 1);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function resolveSessionTimes(formData: FormData) {
  const startTime = clean(formData.get("startTime")) || clean(formData.get("sessionTime"));
  const endTime = clean(formData.get("endTime")) || addOneHour(startTime);
  return { startTime, endTime };
}

async function findStudentTimeConflict({
  db,
  studentId,
  sessionDate,
  startTime,
  endTime,
  excludeId,
  session
}: {
  db: Db;
  studentId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  excludeId?: ObjectId;
  session?: ClientSession;
}) {
  const records = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName())
    .find({
      studentId,
      sessionDate,
      status: { $ne: "Completed" },
      ...(excludeId ? { _id: { $ne: excludeId } } : {})
    }, { session })
    .project({ meetingNumber: 1, startTime: 1, endTime: 1, sessionTime: 1 })
    .toArray();

  return records.find((record) => {
    const existingStart = record.startTime || record.sessionTime || "";
    const existingEnd = record.endTime || addOneHour(existingStart);
    return existingStart < endTime && existingEnd > startTime;
  });
}

async function assertAdmin() {
  await assertFullAdminAccess();
}

async function resolveSelectedTeachers(db: Db, formData: FormData) {
  const teacherIds = [...new Set(formData.getAll("teacherIds").map(clean).filter(Boolean))];

  if (!teacherIds.length) {
    throw new Error("Select at least one teacher");
  }

  return resolveAvailableTeachers(db, teacherIds);
}

export async function createClassSession(formData: FormData) {
  await assertAdmin();

  const studentId = clean(formData.get("studentId"));
  const sessionDate = clean(formData.get("sessionDate"));
  const selectedClassMode = clean(formData.get("classMode"));
  const { startTime, endTime } = resolveSessionTimes(formData);

  if (!studentId || !sessionDate || !startTime || !endTime) {
    throw new Error("Invalid class session");
  }

  if (endTime <= startTime) {
    throw new Error("The class end time must be later than the start time.");
  }

  const db = await getMongoDb();
  const student = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
    classMode?: string;
    meetingSequenceNextNumber?: number;
    meetingSequenceId?: string;
  }>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId }, getActiveStudentFilter()]
  });

  if (!student?.studentId || !student.studentName) {
    throw new Error("Active course student not found");
  }

  if (student.classType === "Basic Group") {
    throw new Error("Group students must be scheduled from Group Batch Classes.");
  }

  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);
  const classMode = isClassMode(selectedClassMode) ? selectedClassMode : isClassMode(student.classMode || "") ? student.classMode || "" : "Online";
  const now = new Date();
  const period = getBillingPeriodFromDate(sessionDate);

  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized class sessions cannot be changed.");
  }

  const databaseSession = (await getMongoClient()).startSession();
  try {
    await databaseSession.withTransaction(async () => {
      const studentCollection = db.collection<{
        studentId?: string;
        meetingSequenceNextNumber?: number;
        meetingSequenceId?: string;
      }>(getStudentRegistrationCollectionName());
      const sequenceStudent = await studentCollection.findOne({ studentId }, { session: databaseSession });
      if (!sequenceStudent) throw new Error("Student sequence record not found");
      const timeConflict = await findStudentTimeConflict({ db, studentId, sessionDate, startTime, endTime, session: databaseSession });
      if (timeConflict) {
        const conflictStart = timeConflict.startTime || timeConflict.sessionTime || "";
        const conflictEnd = timeConflict.endTime || addOneHour(conflictStart);
        throw new Error(`This student already has Meeting ${timeConflict.meetingNumber || "?"} scheduled from ${conflictStart} to ${conflictEnd} WIB on this date.`);
      }
      const configured = new Map<string, number>();
      if (sequenceStudent.meetingSequenceNextNumber && sequenceStudent.meetingSequenceNextNumber > 0) {
        configured.set(studentId, sequenceStudent.meetingSequenceNextNumber);
      }
      const nextNumbers = await getStudentNextMeetingNumbers(db, [studentId], configured, databaseSession);
      const meetingNumber = nextNumbers.get(studentId) || 1;
      const meetingSequenceId = sequenceStudent.meetingSequenceId || randomUUID();

      await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).insertOne({
        studentId,
        studentName: student.studentName,
        courseJoined: student.courseJoined || "",
        classType: student.classType || "",
        classMode,
        meetingNumber,
        sessionDate,
        billingMonth: period.billingMonth,
        billingYear: period.billingYear,
        billingPeriod: period.billingPeriod,
        sessionTime: startTime,
        startTime,
        endTime,
        scheduledAt: getScheduledAt(sessionDate, startTime),
        endsAt: getSessionEndAt(sessionDate, endTime),
        teacherIds,
        teacherNames,
        meetingSequenceId,
        status: "Scheduled",
        createdAt: now,
        updatedAt: now
      }, { session: databaseSession });

      await studentCollection.updateOne(
        { _id: sequenceStudent._id },
        { $set: { meetingSequenceId, meetingSequenceNextNumber: meetingNumber + 1, meetingSequenceUpdatedAt: now } },
        { session: databaseSession }
      );
    });
  } finally {
    await databaseSession.endSession();
  }

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
  revalidatePath("/ceo");
}

export async function updateClassSession(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const classMode = clean(formData.get("classMode"));

  if (!ObjectId.isValid(id) || !isClassMode(classMode)) {
    throw new Error("Invalid class session update");
  }

  const db = await getMongoDb();
  const recordId = new ObjectId(id);
  const existingSession = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).findOne({ _id: recordId });

  if (!existingSession?.studentId || !existingSession.sessionDate) {
    throw new Error("Class session not found");
  }

  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);
  const period = getBillingPeriodFromDate(existingSession.sessionDate);

  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized class sessions cannot be changed.");
  }

  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).updateOne(
    { _id: recordId },
    {
      $set: {
        classMode,
        teacherIds,
        teacherNames,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
  revalidatePath("/teacher");
  revalidatePath("/ceo");
}

export async function resetStudentMeetingSequence(formData: FormData) {
  await assertAdmin();
  const studentId = clean(formData.get("studentId"));
  if (!studentId) return { success: false, message: "Select a student first." };

  const db = await getMongoDb();
  const student = await db.collection<{ studentId?: string; classType?: string }>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId }, getActiveStudentFilter()]
  });
  if (!student || student.classType === "Basic Group") return { success: false, message: "Active private student not found." };

  const scheduledCount = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).countDocuments({ studentId });
  if (scheduledCount) {
    return { success: false, message: `Delete or complete the student's ${scheduledCount} scheduled class${scheduledCount === 1 ? "" : "es"} before resetting to Meeting 1.` };
  }

  const now = new Date();
  await db.collection(getStudentRegistrationCollectionName()).updateOne(
    { _id: student._id },
    { $set: { meetingSequenceId: randomUUID(), meetingSequenceNextNumber: 1, meetingSequenceResetAt: now, meetingSequenceUpdatedAt: now } }
  );

  revalidatePath("/admin/sessions");
  return { success: true };
}

export async function rescheduleClassSession(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const sessionDate = clean(formData.get("sessionDate"));
  const { startTime, endTime } = resolveSessionTimes(formData);

  if (!ObjectId.isValid(id) || !sessionDate || !startTime || !endTime) {
    return { success: false, message: "Select a valid new class date and time." };
  }

  if (endTime <= startTime) {
    return { success: false, message: "The class end time must be later than the start time." };
  }

  const jakartaToday = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(new Date());

  if (sessionDate < jakartaToday) {
    return { success: false, message: "A class can only be rescheduled to today or a future date (Indonesia time)." };
  }

  const db = await getMongoDb();
  const recordId = new ObjectId(id);
  const existingSession = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).findOne({ _id: recordId });

  if (!existingSession?.studentId || !existingSession.meetingNumber) {
    return { success: false, message: "This class session could not be found. Refresh the page and try again." };
  }

  const currentPeriod = getBillingPeriodFromDate(existingSession.sessionDate || "");
  const newPeriod = getBillingPeriodFromDate(sessionDate);

  if (!newPeriod.billingPeriod) {
    return { success: false, message: "Select a valid reschedule date." };
  }

  if (await isBillingPeriodClosed(db, currentPeriod)) {
    return { success: false, message: "The class cannot be rescheduled because its current month is already closed." };
  }

  if (await isBillingPeriodClosed(db, newPeriod)) {
    return { success: false, message: "The selected month is already closed. Choose an open month." };
  }

  const duplicateSession = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).findOne({
    _id: { $ne: recordId },
    studentId: existingSession.studentId,
    meetingNumber: existingSession.meetingNumber,
    billingMonth: newPeriod.billingMonth,
    billingYear: newPeriod.billingYear
  });

  if (duplicateSession) {
    return { success: false, message: `Meeting ${existingSession.meetingNumber} is already scheduled for this student in the selected month.` };
  }

  const timeConflict = await findStudentTimeConflict({
    db,
    studentId: existingSession.studentId,
    sessionDate,
    startTime,
    endTime,
    excludeId: recordId
  });

  if (timeConflict) {
    const conflictStart = timeConflict.startTime || timeConflict.sessionTime || "";
    const conflictEnd = timeConflict.endTime || addOneHour(conflictStart);
    return { success: false, message: `This student already has Meeting ${timeConflict.meetingNumber || "?"} scheduled from ${conflictStart} to ${conflictEnd} WIB on this date.` };
  }

  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).updateOne(
    { _id: recordId },
    {
      $set: {
        originalSessionDate: existingSession.originalSessionDate || existingSession.sessionDate || "",
        originalStartTime: existingSession.originalStartTime || existingSession.startTime || existingSession.sessionTime || "",
        originalEndTime: existingSession.originalEndTime || existingSession.endTime || "",
        rescheduledFromDate: existingSession.sessionDate || "",
        rescheduledFromStartTime: existingSession.startTime || existingSession.sessionTime || "",
        rescheduledFromEndTime: existingSession.endTime || "",
        sessionDate,
        billingMonth: newPeriod.billingMonth,
        billingYear: newPeriod.billingYear,
        billingPeriod: newPeriod.billingPeriod,
        sessionTime: startTime,
        startTime,
        endTime,
        scheduledAt: getScheduledAt(sessionDate, startTime),
        endsAt: getSessionEndAt(sessionDate, endTime),
        status: "Scheduled",
        rescheduledAt: new Date(),
        updatedAt: new Date()
      },
      $inc: { rescheduleCount: 1 }
    }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
  revalidatePath("/teacher");
  revalidatePath("/ceo");

  return { success: true };
}

export async function markClassSessionCompletedByAttendance({
  studentId,
  meetingNumber,
  meetingDate
}: {
  studentId: string;
  meetingNumber: number;
  meetingDate: string;
}) {
  const db = await getMongoDb();
  const period = getBillingPeriodFromDate(meetingDate);

  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).deleteMany(
    {
      $or: [
        { studentId, meetingNumber, billingMonth: period.billingMonth, billingYear: period.billingYear },
        { studentId, meetingNumber, sessionDate: meetingDate }
      ]
    }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
}

export async function deleteClassSession(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid class session");
  }

  const db = await getMongoDb();
  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).deleteOne({ _id: new ObjectId(id) });

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
}

async function generateClassGameLink(formData: FormData, gameType: GameType) {
  await assertAdmin();

  const classSessionId = clean(formData.get("classSessionId"));
  if (!ObjectId.isValid(classSessionId)) {
    throw new Error("Invalid class session");
  }

  const db = await getMongoDb();
  const classSession = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).findOne({ _id: new ObjectId(classSessionId) });

  if (!classSession) {
    throw new Error("Class session not found");
  }

  const now = new Date();
  const token = randomBytes(24).toString("base64url");

  await db.collection<GameSessionDocument>(getGameSessionsCollectionName()).updateOne(
    { classSessionId, gameType },
    {
      $set: {
        token,
        gameType,
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

  revalidatePath("/admin/sessions");
}

export async function generateSpeechGameLink(formData: FormData) {
  await generateClassGameLink(formData, "speech-competition");
}

export async function generateEscapeRoomGameLink(formData: FormData) {
  await generateClassGameLink(formData, "escape-room");
}

export async function generateGamesLink(formData: FormData) {
  await generateClassGameLink(formData, "games-hub");
}
