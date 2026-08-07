"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { markClassSessionCompletedByAttendance } from "@/app/admin/sessions/actions";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getBillingPeriodFromDate, isBillingPeriodClosed } from "@/lib/billing-periods";
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
import { getActiveStudentFilter, getStudentRegistrationCollectionName, isClassMode } from "@/lib/student-registration";
import {
  resolveAvailableTeachers
} from "@/lib/teachers";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPositiveInteger(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

async function resolveSelectedTeachers(db: Db, formData: FormData) {
  const teacherIds = [...new Set(formData.getAll("teacherIds").map(clean).filter(Boolean))];

  if (!teacherIds.length) {
    throw new Error("Select at least one teacher");
  }

  return resolveAvailableTeachers(db, teacherIds);
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
  classMode,
  meetingNumber,
  meetingDate,
  previousMeetingDate,
  status
}: {
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  meetingNumber: number;
  meetingDate: string;
  previousMeetingDate?: string;
  status: AttendanceStatus;
}) {
  const db = await getMongoDb();
  const payments = db.collection(getStudentPaymentsCollectionName());
  const amountDue = getSuggestedPerMeetingPrice(courseJoined, classType);
  const period = getBillingPeriodFromDate(meetingDate);
  const previousPeriod = previousMeetingDate ? getBillingPeriodFromDate(previousMeetingDate) : period;

  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized records cannot be changed.");
  }

  if (previousPeriod.billingPeriod && previousPeriod.billingPeriod !== period.billingPeriod) {
    await payments.deleteOne({
      studentId,
      meetingNumber,
      billingMonth: previousPeriod.billingMonth,
      billingYear: previousPeriod.billingYear,
      status: "Unpaid",
      source: "attendance"
    });
  }

  if (!isBillableAttendance(status) || amountDue <= 0) {
    await payments.updateOne(
      {
        $or: [
          { studentId, meetingNumber, billingMonth: period.billingMonth, billingYear: period.billingYear, status: "Paid", source: "attendance" },
          { studentId, meetingNumber, meetingDate, status: "Paid", source: "attendance" }
        ]
      },
      {
        $set: {
          meetingDate,
          billingMonth: period.billingMonth,
          billingYear: period.billingYear,
          billingPeriod: period.billingPeriod,
          classMode,
          attendanceStatus: status,
          updatedAt: new Date()
        }
      }
    );
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

export async function saveStudentAttendance(formData: FormData) {
  await assertAdmin();

  const studentId = clean(formData.get("studentId"));
  const studentName = clean(formData.get("studentName"));
  const courseJoined = clean(formData.get("courseJoined"));
  const classType = clean(formData.get("classType"));
  const classMode = clean(formData.get("classMode"));
  const meetingNumber = getPositiveInteger(formData.get("meetingNumber"));
  const meetingDate = clean(formData.get("meetingDate"));
  const status = clean(formData.get("status")) as AttendanceStatus;
  const notes = clean(formData.get("notes"));

  if (!studentId || !studentName || !courseJoined || !classType || !isClassMode(classMode) || !meetingNumber || !meetingDate || !isAttendanceStatus(status)) {
    throw new Error("Invalid attendance record");
  }

  const now = new Date();
  const db = await getMongoDb();
  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);
  const period = getBillingPeriodFromDate(meetingDate);

  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized records cannot be changed.");
  }

  await db.collection(getStudentAttendanceCollectionName()).updateOne(
    {
      $or: [
        { studentId, meetingNumber, billingMonth: period.billingMonth, billingYear: period.billingYear },
        { studentId, meetingNumber, meetingDate }
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
    classMode,
    meetingNumber,
    meetingDate,
    status
  });
  await markClassSessionCompletedByAttendance({
    studentId,
    meetingNumber,
    meetingDate
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/finance/payments");
  revalidatePath("/admin/sessions");
}

export async function updateStudentAttendance(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const meetingDate = clean(formData.get("meetingDate"));
  const classMode = clean(formData.get("classMode"));
  const status = clean(formData.get("status")) as AttendanceStatus;
  const notes = clean(formData.get("notes"));

  if (!ObjectId.isValid(id) || !meetingDate || !isClassMode(classMode) || !isAttendanceStatus(status)) {
    throw new Error("Invalid attendance update");
  }

  const db = await getMongoDb();
  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);
  const existingAttendance = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
    classMode?: string;
    meetingNumber?: number;
    meetingDate?: string;
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
  const currentStudent = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
  }>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId: existingAttendance.studentId }, getActiveStudentFilter()]
  });
  const studentName = currentStudent?.studentName || existingAttendance.studentName;
  const courseJoined = currentStudent?.courseJoined || existingAttendance.courseJoined;
  const classType = currentStudent?.classType || existingAttendance.classType;

  const period = getBillingPeriodFromDate(meetingDate);
  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized records cannot be changed.");
  }

  await db.collection(getStudentAttendanceCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        meetingDate,
        billingMonth: period.billingMonth,
        billingYear: period.billingYear,
        billingPeriod: period.billingPeriod,
        studentName,
        courseJoined,
        classType,
        classMode,
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
    studentName,
    courseJoined,
    classType,
    classMode,
    meetingNumber: existingAttendance.meetingNumber,
    meetingDate,
    previousMeetingDate: existingAttendance.meetingDate,
    status
  });
  await markClassSessionCompletedByAttendance({
    studentId: existingAttendance.studentId,
    meetingNumber: existingAttendance.meetingNumber,
    meetingDate
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/finance/payments");
  revalidatePath("/admin/sessions");
}
