"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import {
  generateBatchMeetingDates,
  getBatchClassSessionsCollectionName,
  parseBatchWeekdays
} from "@/lib/batch-class-sessions";
import {
  getBatchesCollectionName,
  isAssessmentProgram
} from "@/lib/assessments";
import { getMongoDb } from "@/lib/mongodb";
import { ensureGroupMonthlyInvoice } from "@/lib/group-monthly-invoices";
import {
  getActiveStudentFilter,
  getStudentRegistrationCollectionName
} from "@/lib/student-registration";
import { resolveAvailableTeacher } from "@/lib/teachers";

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
  const admin = await getAuthenticatedAdmin();
  if (!admin) throw new Error("Unauthorized");
  return admin;
}

async function resolveTeacher(teacherId: string) {
  const db = await getMongoDb();
  return resolveAvailableTeacher(db, teacherId);
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

  const assignedStudent = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
    classMode?: string;
  }>(getStudentRegistrationCollectionName()).findOne({ studentId });
  if (assignedStudent) {
    await ensureGroupMonthlyInvoice(db, {
      ...assignedStudent,
      activeBatchId: batch._id.toString(),
      activeBatchName: String(batch.batchName || ""),
      batchProgram: String(batch.program || "")
    });
  }

  revalidatePath("/admin/batches");
  revalidatePath("/finance/payments");
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

export async function scheduleBatchClasses(formData: FormData) {
  const admin = await assertAdmin();
  const batchId = clean(formData.get("batchId"));
  const scheduleMode = clean(formData.get("scheduleMode"));
  const firstMeetingNumber = numberInRange(formData.get("firstMeetingNumber"), 1, 12, 1);
  const firstDate = clean(formData.get("firstDate"));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  const topic = clean(formData.get("topic"));

  if (!ObjectId.isValid(batchId) || !/^\d{4}-\d{2}-\d{2}$/.test(firstDate) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime) {
    throw new Error("Enter a valid date and WIB time range.");
  }

  const db = await getMongoDb();
  const batch = await db.collection(getBatchesCollectionName()).findOne({ _id: new ObjectId(batchId), status: "active" });
  if (!batch) throw new Error("Active batch not found.");

  const existingMeetings = scheduleMode === "series"
    ? await db.collection(getBatchClassSessionsCollectionName()).find({
        batchId,
        meetingNumber: { $gte: 1, $lte: 12 },
        status: { $ne: "Cancelled" }
      }).project({ meetingNumber: 1 }).toArray()
    : [];
  const existingMeetingNumbers = new Set(existingMeetings.map((meeting) => Number(meeting.meetingNumber)));
  const meetingNumbers = scheduleMode === "series"
    ? Array.from({ length: 12 }, (_, index) => index + 1).filter((meetingNumber) => !existingMeetingNumbers.has(meetingNumber))
    : [firstMeetingNumber];
  const count = meetingNumbers.length;

  if (!count) throw new Error("All 12 meetings are already scheduled for this batch.");

  const weekdays = scheduleMode === "series" ? parseBatchWeekdays(String(batch.days || "")) : [new Date(`${firstDate}T00:00:00Z`).getUTCDay()];
  const dates = generateBatchMeetingDates(firstDate, weekdays, count);
  if (dates.length !== count) throw new Error("Could not generate meeting dates. Check the batch Days field.");

  const conflict = await db.collection(getBatchClassSessionsCollectionName()).findOne({
    batchId,
    meetingNumber: { $in: meetingNumbers },
    status: { $ne: "Cancelled" }
  });
  if (conflict) throw new Error(`Meeting ${conflict.meetingNumber} is already scheduled for this batch.`);

  const students = await db.collection(getStudentRegistrationCollectionName()).find({
    ...getBasicGroupStudentFilter(),
    activeBatchId: batchId
  }).sort({ studentName: 1 }).toArray();
  if (!students.length) throw new Error("Assign at least one student before scheduling classes.");

  const now = new Date();
  await db.collection(getBatchClassSessionsCollectionName()).insertMany(dates.map((sessionDate, index) => ({
    batchId,
    batchName: String(batch.batchName || "Batch"),
    program: String(batch.program || ""),
    meetingNumber: meetingNumbers[index],
    sessionDate,
    startTime,
    endTime,
    teacherId: String(batch.teacherId || ""),
    teacherName: String(batch.teacherName || ""),
    topic,
    status: "Scheduled",
    studentSnapshot: students.map((student) => ({ studentId: String(student.studentId || ""), studentName: String(student.studentName || "Student") })),
    attendanceMarked: false,
    createdBy: admin.name,
    createdAt: now,
    updatedAt: now
  })));

  revalidatePath("/admin/batches");
  revalidatePath("/teacher/group-classes");
}

export async function cancelBatchClass(formData: FormData) {
  await assertAdmin();
  const sessionId = clean(formData.get("sessionId"));
  if (!ObjectId.isValid(sessionId)) throw new Error("Invalid group class.");

  const db = await getMongoDb();
  await db.collection(getBatchClassSessionsCollectionName()).updateOne(
    { _id: new ObjectId(sessionId), attendanceMarked: { $ne: true } },
    { $set: { status: "Cancelled", updatedAt: new Date() } }
  );
  revalidatePath("/admin/batches");
  revalidatePath("/teacher/group-classes");
}

export async function deleteBatchClass(formData: FormData) {
  await assertAdmin();
  const sessionId = clean(formData.get("sessionId"));
  if (!ObjectId.isValid(sessionId)) {
    return { success: false, message: "Invalid group class." };
  }

  const db = await getMongoDb();
  const result = await db.collection(getBatchClassSessionsCollectionName()).deleteOne({
    _id: new ObjectId(sessionId),
    status: "Scheduled",
    attendanceMarked: { $ne: true }
  });

  if (!result.deletedCount) {
    return { success: false, message: "Only scheduled group classes without attendance can be deleted." };
  }

  revalidatePath("/admin/sessions");
  revalidatePath("/admin/batches");
  revalidatePath("/teacher/group-classes");
  return { success: true };
}
