"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
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
  const { startTime, endTime } = resolveSessionTimes(formData);

  if (!studentId || !meetingNumber || !sessionDate || !startTime || !endTime) {
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
        sessionTime: startTime,
        startTime,
        endTime,
        scheduledAt: getScheduledAt(sessionDate, startTime),
        endsAt: getSessionEndAt(sessionDate, endTime),
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
  revalidatePath("/ceo");
}

export async function updateClassSession(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const meetingNumber = getPositiveInteger(formData.get("meetingNumber"));
  const sessionDate = clean(formData.get("sessionDate"));
  const { startTime, endTime } = resolveSessionTimes(formData);

  if (!ObjectId.isValid(id) || !meetingNumber || !sessionDate || !startTime || !endTime) {
    throw new Error("Invalid class session update");
  }

  const db = await getMongoDb();
  const { teacherIds, teacherNames } = await resolveSelectedTeachers(db, formData);

  await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        meetingNumber,
        sessionDate,
        sessionTime: startTime,
        startTime,
        endTime,
        scheduledAt: getScheduledAt(sessionDate, startTime),
        endsAt: getSessionEndAt(sessionDate, endTime),
        teacherIds,
        teacherNames,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
  revalidatePath("/ceo");
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
