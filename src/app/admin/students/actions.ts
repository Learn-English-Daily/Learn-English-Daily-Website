"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";
import {
  getStudentRegistrationCollectionName,
  isClassType,
  isCourseJoined,
  isEnglishLevel,
  isLearningGoal
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
    !isEnglishLevel(registration.englishLevel) ||
    !isLearningGoal(registration.learningGoal) ||
    !["en", "id"].includes(registration.locale)
  ) {
    throw new Error("Invalid student registration update");
  }

  const db = await getMongoDb();
  await db.collection(getStudentRegistrationCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...registration,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}/edit`);
  redirect(`/admin/students/${id}/edit?updated=1`);
}
