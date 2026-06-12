"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  getStudentAttendanceCollectionName,
  isAttendanceStatus,
  type AttendanceStatus
} from "@/lib/attendance";
import { getMongoDb } from "@/lib/mongodb";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPositiveInteger(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

async function assertAdmin() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }
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
  await db.collection(getStudentAttendanceCollectionName()).updateOne(
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
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  revalidatePath("/admin/attendance");
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
  await db.collection(getStudentAttendanceCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        meetingDate,
        status,
        notes,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/attendance");
}
