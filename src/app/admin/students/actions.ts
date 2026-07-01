"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";
import { generateParentAccessToken } from "@/lib/parent-access";
import {
  getStudentIdCountersCollectionName,
  getStudentRegistrationCollectionName,
  isClassMode,
  isClassType,
  isCourseJoined,
  isEnglishLevel,
  isLearningGoal,
  isTrialCourse
} from "@/lib/student-registration";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, "");
}

function isReasonableShortText(value: string, max = 120) {
  return value.length > 0 && value.length <= max;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
}

function formatStudentId(prefix: "STU" | "TR", sequence: number) {
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

async function getNextStudentId(prefix: "STU" | "TR") {
  const db = await getMongoDb();
  const counter = await db.collection<{ _id: string; seq: number }>(getStudentIdCountersCollectionName()).findOneAndUpdate(
    { _id: prefix },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return formatStudentId(prefix, counter?.seq || 1);
}

async function assertAdmin() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }
}

export async function updateStudentRegistration(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const registration = {
    studentName: clean(formData.get("studentName")),
    whatsapp: clean(formData.get("whatsapp")),
    email: clean(formData.get("email")).toLowerCase(),
    normalizedWhatsapp: normalizeWhatsapp(clean(formData.get("whatsapp"))),
    parentName: clean(formData.get("parentName")),
    age: clean(formData.get("age")),
    grade: clean(formData.get("grade")),
    preferredSchedule: clean(formData.get("preferredSchedule")),
    preferredTime: clean(formData.get("preferredTime")),
    courseJoined: clean(formData.get("courseJoined")),
    classType: clean(formData.get("classType")),
    classMode: clean(formData.get("classMode")),
    englishLevel: clean(formData.get("englishLevel")),
    learningGoal: clean(formData.get("learningGoal")),
    countryCity: clean(formData.get("countryCity")),
    locale: clean(formData.get("locale")) || "en"
  };

  if (
    !ObjectId.isValid(id) ||
    !isReasonableShortText(registration.studentName) ||
    !isReasonableShortText(registration.whatsapp) ||
    !isValidEmail(registration.email) ||
    !isReasonableShortText(registration.parentName) ||
    !isReasonableShortText(registration.age, 20) ||
    !isReasonableShortText(registration.grade, 60) ||
    !isReasonableShortText(registration.preferredSchedule) ||
    !isReasonableShortText(registration.preferredTime) ||
    !isCourseJoined(registration.courseJoined) ||
    !isClassType(registration.classType) ||
    !isClassMode(registration.classMode) ||
    !isEnglishLevel(registration.englishLevel) ||
    !isLearningGoal(registration.learningGoal) ||
    !["en", "id"].includes(registration.locale)
  ) {
    throw new Error("Invalid student registration update");
  }

  const db = await getMongoDb();
  const collection = db.collection<{
    studentId?: string;
    studentIdType?: string;
    courseJoined?: string;
  }>(getStudentRegistrationCollectionName());
  const existingRegistration = await collection.findOne({ _id: new ObjectId(id) });
  const isJoiningCourse = !isTrialCourse(registration.courseJoined);
  const wasTrial =
    existingRegistration?.studentIdType === "trial" ||
    existingRegistration?.courseJoined === "Trial Class" ||
    /^TR/i.test(existingRegistration?.studentId || "");
  const upgradedStudentId = wasTrial && isJoiningCourse ? await getNextStudentId("STU") : "";

  await db.collection(getStudentRegistrationCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...registration,
        ...(upgradedStudentId
          ? {
              studentId: upgradedStudentId,
              studentIdType: "student",
              previousStudentId: existingRegistration?.studentId || "",
              upgradedToStudentId: upgradedStudentId,
              upgradedFromTrial: true,
              upgradedAt: new Date()
            }
          : {
              studentIdType: isJoiningCourse ? "student" : existingRegistration?.studentIdType || "trial"
            }),
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/students");
  revalidatePath("/admin/students/trials");
  revalidatePath(`/admin/students/${id}/edit`);
  redirect(`/admin/students/${id}/edit?updated=1`);
}

export async function regenerateParentAccessToken(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));

  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid student");
  }

  const db = await getMongoDb();
  const parentAccessToken = generateParentAccessToken();
  await db.collection(getStudentRegistrationCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        parentAccessToken,
        parentAccessTokenUpdatedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/students");
  revalidatePath("/admin/students/trials");
  revalidatePath(`/admin/students/${id}/parent-qr`);
  redirect(`/admin/students/${id}/parent-qr?regenerated=1`);
}
