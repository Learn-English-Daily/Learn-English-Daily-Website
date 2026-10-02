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
  getStudentRegistrationCollectionName,
  isClassMode
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

function parseBatchTimeRange(value: string) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(\d)\.(\d)/g, "$1:$2")
    .replace(/\./g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\bto\b/g, "-")
    .replace(/\bwib\b/g, "")
    .replace(/[;,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  function toTime(hourValue: string, minuteValue: string | undefined, meridiem: string | undefined) {
    let hour = Number(hourValue);
    const minute = Number(minuteValue || "0");
    if (minute < 0 || minute > 59) return null;
    if (meridiem) {
      if (hour < 1 || hour > 12) return null;
      hour = hour % 12 + (meridiem.toLowerCase() === "pm" ? 12 : 0);
    } else if (hour < 0 || hour > 23) {
      return null;
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const startTime = toTime(match[1], match[2], match[3]);
  const endTime = toTime(match[4], match[5], match[6]);
  return startTime && endTime && endTime > startTime ? { startTime, endTime } : null;
}

function getJakartaDateInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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
    groupRegistrationFeeStatus?: "pending" | "paid" | "waived";
    groupRegistrationFeeInvoiceId?: string;
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
  try {
  const admin = await assertAdmin();
  const batchId = clean(formData.get("batchId"));
  const scheduleMode = clean(formData.get("scheduleMode"));
  const seriesMonth = clean(formData.get("seriesMonth"));
  const firstMeetingNumber = numberInRange(formData.get("firstMeetingNumber"), 1, 9999, 1);
  const requestedFirstDate = clean(formData.get("firstDate"));
  const requestedStartTime = clean(formData.get("startTime"));
  const requestedEndTime = clean(formData.get("endTime"));
  const classMode = clean(formData.get("classMode"));
  const topic = clean(formData.get("topic"));

  if (!ObjectId.isValid(batchId)) throw new Error("Select a valid batch.");
  if (!isClassMode(classMode)) throw new Error("Select Online or Offline for this group schedule.");

  const db = await getMongoDb();
  const batch = await db.collection(getBatchesCollectionName()).findOne({ _id: new ObjectId(batchId), status: "active" });
  if (!batch) throw new Error("Active batch not found.");

  if (scheduleMode === "series" && !/^\d{4}-\d{2}$/.test(seriesMonth)) throw new Error("Select a valid month for the 12-class series.");
  const existingMeetings = await db.collection(getBatchClassSessionsCollectionName()).find({
    batchId,
    status: { $ne: "Cancelled" }
  }).project({ meetingNumber: 1, sessionDate: 1 }).toArray();
  const meetingsInMonth = scheduleMode === "series" ? existingMeetings.filter((meeting) => String(meeting.sessionDate || "").startsWith(`${seriesMonth}-`)) : [];
  const nextMeetingNumber = existingMeetings.reduce((highest, meeting) => Math.max(highest, Number(meeting.meetingNumber) || 0), 0) + 1;
  const meetingNumbers = scheduleMode === "series"
    ? Array.from({ length: Math.max(0, 12 - meetingsInMonth.length) }, (_, index) => nextMeetingNumber + index)
    : [firstMeetingNumber];
  const count = meetingNumbers.length;

  if (!count) throw new Error(`All 12 classes are already scheduled for ${seriesMonth}.`);

  const savedTime = scheduleMode === "series" ? parseBatchTimeRange(String(batch.time || "")) : null;
  if (scheduleMode === "series" && !savedTime) {
    throw new Error("The batch time is invalid. Edit the batch and use a range such as 7:00 PM - 8:00 PM.");
  }
  const monthStart = scheduleMode === "series" ? `${seriesMonth}-01` : "";
  const today = getJakartaDateInput();
  const automaticFirstDate = [String(batch.startDate || ""), monthStart, today.startsWith(`${seriesMonth}-`) ? today : ""].filter(Boolean).sort().at(-1) || monthStart;
  const firstDate = scheduleMode === "series" ? automaticFirstDate : requestedFirstDate;
  const startTime = scheduleMode === "series" ? savedTime!.startTime : requestedStartTime;
  const endTime = scheduleMode === "series" ? savedTime!.endTime : requestedEndTime;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDate) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || endTime <= startTime) {
    throw new Error("Enter a valid date and WIB time range.");
  }

  const weekdays = scheduleMode === "series" ? parseBatchWeekdays(String(batch.days || "")) : [new Date(`${firstDate}T00:00:00Z`).getUTCDay()];
  const existingDates = new Set(meetingsInMonth.map((meeting) => String(meeting.sessionDate || "")));
  const dates = scheduleMode === "series"
    ? generateBatchMeetingDates(firstDate, weekdays, 31).filter((date) => date.startsWith(`${seriesMonth}-`) && !existingDates.has(date)).slice(0, count)
    : generateBatchMeetingDates(firstDate, weekdays, count);
  if (dates.length !== count) throw new Error(`There are only ${dates.length} available ${String(batch.days || "class")} dates remaining in ${seriesMonth}. Choose another month or schedule individual classes.`);

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
    classMode,
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
  revalidatePath("/admin/sessions");
  revalidatePath("/teacher/group-classes");
  return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safePrefixes = ["Select ", "Active batch", "All 12", "The batch", "Enter ", "There are", "Meeting ", "Assign "];
    if (safePrefixes.some((prefix) => message.startsWith(prefix))) return { success: false, message };
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return { success: false, message: "This class conflicts with an existing meeting number. Refresh the page and use the suggested next meeting number." };
    }
    console.error("Failed to schedule batch classes", error);
    return { success: false, message: "The schedule could not be saved because of a server or database error. Please try again once, then contact support if it continues." };
  }
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

export async function updateBatchClassTime(formData: FormData) {
  const admin = await assertAdmin();
  const sessionId = clean(formData.get("sessionId"));
  const sessionDate = clean(formData.get("sessionDate"));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  const classMode = clean(formData.get("classMode"));
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!ObjectId.isValid(sessionId) || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || !validTime.test(startTime) || !validTime.test(endTime) || endTime <= startTime || !isClassMode(classMode)) {
    return { success: false, message: "Enter a valid class date, WIB time range, and class mode." };
  }
  const db = await getMongoDb();
  const result = await db.collection(getBatchClassSessionsCollectionName()).updateOne(
    { _id: new ObjectId(sessionId), status: "Scheduled", attendanceMarked: { $ne: true } },
    { $set: { sessionDate, startTime, endTime, classMode, updatedAt: new Date(), updatedBy: admin.name } }
  );
  if (!result.matchedCount) return { success: false, message: "Only scheduled classes without attendance can be edited. Refresh the page." };
  revalidatePath("/admin/sessions");
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/teacher/group-classes");
  return { success: true };
}
