"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import {
  getClassSessionsCollectionName,
  getScheduledAt,
  type ClassSessionDocument
} from "@/lib/class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";
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

async function assertAdmin() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }
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

export async function createClassSession(formData: FormData) {
  await assertAdmin();

  const studentId = clean(formData.get("studentId"));
  const meetingNumber = getPositiveInteger(formData.get("meetingNumber"));
  const sessionDate = clean(formData.get("sessionDate"));
  const sessionTime = clean(formData.get("sessionTime"));

  if (!studentId || !meetingNumber || !sessionDate || !sessionTime) {
    throw new Error("Invalid class session");
  }

  const db = await getMongoDb();
  const student = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
  }>(getStudentRegistrationCollectionName()).findOne({ studentId });

  if (!student?.studentId || !student.studentName) {
    throw new Error("Student not found");
  }

  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);
  const now = new Date();

  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).updateOne(
    { studentId, meetingNumber },
    {
      $set: {
        studentId,
        studentName: student.studentName,
        courseJoined: student.courseJoined || "",
        classType: student.classType || "",
        meetingNumber,
        sessionDate,
        sessionTime,
        scheduledAt: getScheduledAt(sessionDate, sessionTime),
        teacherIds,
        teacherNames,
        status: "Scheduled",
        updatedAt: now
      },
      $setOnInsert: {
        createdAt: now
      }
    },
    { upsert: true }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
}

export async function markClassSessionCompletedByAttendance({
  studentId,
  meetingNumber,
  attendanceId
}: {
  studentId: string;
  meetingNumber: number;
  attendanceId?: string;
}) {
  const db = await getMongoDb();

  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).updateOne(
    { studentId, meetingNumber },
    {
      $set: {
        status: "Completed",
        attendanceId,
        completedAt: new Date(),
        updatedAt: new Date()
      }
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
