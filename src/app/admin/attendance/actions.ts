"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { markClassSessionCompletedByAttendance } from "@/app/admin/sessions/actions";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  getStudentAttendanceCollectionName,
  isAttendanceStatus,
  type AttendanceStatus
} from "@/lib/attendance";
import { getMongoDb } from "@/lib/mongodb";
import {
  getStudentPaymentsCollectionName,
  getSuggestedPerMeetingPrice
} from "@/lib/payments";
import {
  ensureDefaultTeachers,
  getTeachersCollectionName,
  type TeacherDocument
} from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPositiveInteger(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

async function resolveSelectedTeachers(db: Db, formData: FormData) {
  await ensureDefaultTeachers(db);
  const teacherIds = [...new Set(formData.getAll("teacherIds").map(clean).filter(Boolean))];

  if (!teacherIds.length) {
    throw new Error("Select at least one teacher");
  }

  const teachers = await db
    .collection<TeacherDocument>(getTeachersCollectionName())
    .find({ _id: { $in: teacherIds }, active: true })
    .toArray();
  const namesById = new Map(teachers.map((teacher) => [teacher._id, teacher.name]));
  const teacherNames = teacherIds.map((id) => namesById.get(id)).filter((name): name is string => Boolean(name));

  if (teacherNames.length !== teacherIds.length) {
    throw new Error("Invalid teacher selection");
  }

  return { teacherIds, teacherNames };
}

async function assertAdmin() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }
}

function isBillableAttendance(status: AttendanceStatus) {
  return status === "Present" || status === "Late";
}

async function syncPaymentFromAttendance({
  studentId,
  studentName,
  courseJoined,
  classType,
  meetingNumber,
  meetingDate,
  status
}: {
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  meetingNumber: number;
  meetingDate: string;
  status: AttendanceStatus;
}) {
  const db = await getMongoDb();
  const payments = db.collection(getStudentPaymentsCollectionName());
  const amountDue = getSuggestedPerMeetingPrice(courseJoined, classType);

  if (!isBillableAttendance(status) || amountDue <= 0) {
    await payments.updateOne(
      {
        studentId,
        meetingNumber,
        status: "Paid",
        source: "attendance"
      },
      {
        $set: {
          meetingDate,
          attendanceStatus: status,
          updatedAt: new Date()
        }
      }
    );
    await payments.deleteOne({
      studentId,
      meetingNumber,
      status: "Unpaid",
      source: "attendance"
    });
    return;
  }

  const now = new Date();

  await payments.updateOne(
    { studentId, meetingNumber },
    {
      $set: {
        studentId,
        studentName,
        courseJoined,
        classType,
        meetingNumber,
        meetingDate,
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

export async function saveStudentAttendance(formData: FormData) {
  await assertAdmin();

  const studentId = clean(formData.get("studentId"));
  const studentName = clean(formData.get("studentName"));
  const courseJoined = clean(formData.get("courseJoined"));
  const classType = clean(formData.get("classType"));
  const meetingNumber = getPositiveInteger(formData.get("meetingNumber"));
  const meetingDate = clean(formData.get("meetingDate"));
  const status = clean(formData.get("status")) as AttendanceStatus;
  const notes = clean(formData.get("notes"));

  if (!studentId || !studentName || !courseJoined || !classType || !meetingNumber || !meetingDate || !isAttendanceStatus(status)) {
    throw new Error("Invalid attendance record");
  }

  const now = new Date();
  const db = await getMongoDb();
  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);
  const attendanceResult = await db.collection(getStudentAttendanceCollectionName()).updateOne(
    { studentId, meetingNumber },
    {
      $set: {
        studentId,
        studentName,
        courseJoined,
        classType,
        meetingNumber,
        meetingDate,
        status,
        notes,
        teacherIds,
        teacherNames,
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );
  await syncPaymentFromAttendance({
    studentId,
    studentName,
    courseJoined,
    classType,
    meetingNumber,
    meetingDate,
    status
  });
  await markClassSessionCompletedByAttendance({
    studentId,
    meetingNumber,
    attendanceId: attendanceResult.upsertedId?.toString()
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/sessions");
}

export async function updateStudentAttendance(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const meetingDate = clean(formData.get("meetingDate"));
  const status = clean(formData.get("status")) as AttendanceStatus;
  const notes = clean(formData.get("notes"));

  if (!ObjectId.isValid(id) || !meetingDate || !isAttendanceStatus(status)) {
    throw new Error("Invalid attendance update");
  }

  const db = await getMongoDb();
  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);
  const existingAttendance = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
    meetingNumber?: number;
  }>(getStudentAttendanceCollectionName()).findOne({ _id: new ObjectId(id) });

  if (
    !existingAttendance?.studentId ||
    !existingAttendance.studentName ||
    !existingAttendance.courseJoined ||
    !existingAttendance.classType ||
    !existingAttendance.meetingNumber
  ) {
    throw new Error("Attendance record not found");
  }

  await db.collection(getStudentAttendanceCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        meetingDate,
        status,
        notes,
        teacherIds,
        teacherNames,
        updatedAt: new Date()
      }
    }
  );
  await syncPaymentFromAttendance({
    studentId: existingAttendance.studentId,
    studentName: existingAttendance.studentName,
    courseJoined: existingAttendance.courseJoined,
    classType: existingAttendance.classType,
    meetingNumber: existingAttendance.meetingNumber,
    meetingDate,
    status
  });
  await markClassSessionCompletedByAttendance({
    studentId: existingAttendance.studentId,
    meetingNumber: existingAttendance.meetingNumber,
    attendanceId: id
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/sessions");
}
