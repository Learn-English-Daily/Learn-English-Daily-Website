"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  assessmentAttendanceStatuses,
  buildMonthlyAssessment,
  getBatchesCollectionName,
  getMonthlyAssessmentsCollectionName,
  isAssessmentAttendanceStatus,
  isAssessmentProgram,
  type MeetingAssessmentInput
} from "@/lib/assessments";
import { getMongoDb } from "@/lib/mongodb";
import {
  getActiveStudentFilter,
  getStudentRegistrationCollectionName
} from "@/lib/student-registration";
import {
  ensureDefaultTeachers,
  getTeachersCollectionName,
  type TeacherDocument
} from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberInRange(value: FormDataEntryValue | null, min: number, max: number, fallback = min) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

async function assertAdmin() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }
}

async function resolveTeacher(teacherId: string) {
  const db = await getMongoDb();
  await ensureDefaultTeachers(db);
  const teacher = await db.collection<TeacherDocument>(getTeachersCollectionName()).findOne({
    _id: teacherId,
    active: true
  });

  if (!teacher) {
    throw new Error("Select a valid teacher");
  }

  return teacher;
}

function getBasicGroupStudentFilter() {
  return {
    $and: [getActiveStudentFilter(), { classType: "Basic Group" }]
  };
}

function parseBatchFields(formData: FormData) {
  const batchName = clean(formData.get("batchName"));
  const program = clean(formData.get("program"));
  const teacherId = clean(formData.get("teacherId"));
  const startDate = clean(formData.get("startDate"));
  const days = clean(formData.get("days"));
  const time = clean(formData.get("time"));
  const maximumStudents = numberInRange(formData.get("maximumStudents"), 1, 100, 12);

  if (!batchName || !isAssessmentProgram(program) || !teacherId || !startDate || !days || !time || !maximumStudents) {
    throw new Error("Invalid batch details");
  }

  return { batchName, program, teacherId, startDate, days, time, maximumStudents };
}

export async function createBatch(formData: FormData) {
  await assertAdmin();

  const fields = parseBatchFields(formData);
  const teacher = await resolveTeacher(fields.teacherId);
  const now = new Date();
  const db = await getMongoDb();

  await db.collection(getBatchesCollectionName()).insertOne({
    ...fields,
    teacherName: teacher.name,
    status: "active",
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/admin/batches");
}

export async function updateBatch(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const fields = parseBatchFields(formData);
  const teacher = await resolveTeacher(fields.teacherId);

  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid batch");
  }

  const db = await getMongoDb();
  await db.collection(getBatchesCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...fields,
        teacherName: teacher.name,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/batches");
}

export async function archiveBatch(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid batch");
  }

  const db = await getMongoDb();
  await db.collection(getBatchesCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/batches");
}

export async function assignStudentToBatch(formData: FormData) {
  await assertAdmin();

  const batchId = clean(formData.get("batchId"));
  const studentId = clean(formData.get("studentId"));

  if (!ObjectId.isValid(batchId) || !studentId) {
    throw new Error("Invalid student or batch");
  }

  const db = await getMongoDb();
  const batch = await db.collection(getBatchesCollectionName()).findOne({
    _id: new ObjectId(batchId),
    status: "active"
  });

  if (!batch) {
    throw new Error("Batch not found");
  }

  const updateResult = await db.collection(getStudentRegistrationCollectionName()).updateOne(
    {
      studentId,
      ...getBasicGroupStudentFilter()
    },
    {
      $set: {
        activeBatchId: batch._id.toString(),
        activeBatchName: batch.batchName,
        batchProgram: batch.program,
        batchTeacherName: batch.teacherName,
        batchAssignedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  if (!updateResult.matchedCount) {
    throw new Error("Student not found");
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin/students");
}

export async function removeStudentFromBatch(formData: FormData) {
  await assertAdmin();

  const batchId = clean(formData.get("batchId"));
  const studentId = clean(formData.get("studentId"));

  if (!batchId || !studentId) {
    throw new Error("Invalid student or batch");
  }

  const db = await getMongoDb();
  await db.collection(getStudentRegistrationCollectionName()).updateOne(
    { studentId, activeBatchId: batchId },
    {
      $unset: {
        activeBatchId: "",
        activeBatchName: "",
        batchProgram: "",
        batchTeacherName: "",
        batchAssignedAt: ""
      },
      $set: {
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/batches");
  revalidatePath("/admin/students");
}

function parseMeetings(formData: FormData) {
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

export async function saveMonthlyAssessment(formData: FormData) {
  await assertAdmin();

  const batchId = clean(formData.get("batchId"));
  const studentId = clean(formData.get("studentId"));
  const month = numberInRange(formData.get("month"), 1, 12, new Date().getMonth() + 1);
  const year = numberInRange(formData.get("year"), 2020, 2100, new Date().getFullYear());

  if (!ObjectId.isValid(batchId) || !studentId) {
    throw new Error("Select a student and batch");
  }

  const db = await getMongoDb();
  const [batch, student] = await Promise.all([
    db.collection(getBatchesCollectionName()).findOne({ _id: new ObjectId(batchId) }),
    db.collection(getStudentRegistrationCollectionName()).findOne({
      studentId,
      ...getBasicGroupStudentFilter()
    })
  ]);

  if (!batch || !student) {
    throw new Error("Student or batch not found");
  }

  if (student.activeBatchId !== batchId) {
    throw new Error("Student must be assigned to the selected batch before assessment");
  }

  const calculated = buildMonthlyAssessment({
    meetings: parseMeetings(formData),
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
        teacherId: batch.teacherId || "",
        teacherName: batch.teacherName || "",
        month,
        year,
        status: "finalized",
        ...calculated,
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

  revalidatePath("/admin/batches");
  revalidatePath("/admin");
}
