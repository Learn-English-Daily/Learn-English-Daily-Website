"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isValidAdminSession } from "@/lib/admin-auth";
import { getAdminAccessForUsername } from "@/lib/admin-permissions";
import { getClassSessionsCollectionName } from "@/lib/class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { ensureGroupMonthlyInvoice } from "@/lib/group-monthly-invoices";
import { refreshUnpaidStudentPaymentPricing } from "@/lib/payment-pricing";
import { generateParentAccessToken } from "@/lib/parent-access";
import { isValidDateOfBirth } from "@/lib/student-age";
import {
  getStudentIdCountersCollectionName,
  getStudentRegistrationCollectionName,
  isClassMode,
  isClassType,
  isCourseJoined,
  isEnglishLevel,
  isLearningGoal,
  isStudentStatus,
  isTrialCourse,
  type CourseHistoryEntry,
  type StudentStatus,
  type StudentStatusHistoryEntry
} from "@/lib/student-registration";

type EditableStudentDocument = {
  studentId?: string;
  studentIdType?: string;
  courseJoined?: string;
  courseHistory?: CourseHistoryEntry[];
  studentStatus?: StudentStatus;
  statusHistory?: StudentStatusHistoryEntry[];
  [key: string]: unknown;
};

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
  const admin = isAuthenticated ? await getAuthenticatedAdmin() : null;

  if (!admin) {
    throw new Error("Unauthorized");
  }

  return admin;
}

export async function updateStudentRegistration(formData: FormData) {
  const admin = await assertAdmin();

  const id = clean(formData.get("id"));
  const registration = {
    studentName: clean(formData.get("studentName")),
    nickname: clean(formData.get("nickname")),
    whatsapp: clean(formData.get("whatsapp")),
    email: clean(formData.get("email")).toLowerCase(),
    normalizedWhatsapp: normalizeWhatsapp(clean(formData.get("whatsapp"))),
    parentName: clean(formData.get("parentName")),
    dateOfBirth: clean(formData.get("dateOfBirth")),
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

  if (getAdminAccessForUsername(admin.username) === "group-students" && registration.classType !== "Basic Group") {
    throw new Error("You can only manage Basic Group students.");
  }

  if (
    !ObjectId.isValid(id) ||
    !isReasonableShortText(registration.studentName) ||
    registration.nickname.length > 120 ||
    !isReasonableShortText(registration.whatsapp) ||
    !isValidEmail(registration.email) ||
    !isReasonableShortText(registration.parentName) ||
    (registration.dateOfBirth !== "" && !isValidDateOfBirth(registration.dateOfBirth)) ||
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
  const collection = db.collection<EditableStudentDocument>(getStudentRegistrationCollectionName());
  const existingRegistration = await collection.findOne({ _id: new ObjectId(id) });
  if (getAdminAccessForUsername(admin.username) === "group-students" && existingRegistration?.classType !== "Basic Group") {
    throw new Error("You can only manage Basic Group students.");
  }
  const isJoiningCourse = !isTrialCourse(registration.courseJoined);
  const wasTrial =
    existingRegistration?.studentIdType === "trial" ||
    existingRegistration?.courseJoined === "Trial Class" ||
    /^TR/i.test(existingRegistration?.studentId || "");
  const upgradedStudentId = wasTrial && isJoiningCourse ? await getNextStudentId("STU") : "";
  const courseChanged = Boolean(
    existingRegistration?.courseJoined && existingRegistration.courseJoined !== registration.courseJoined
  );
  const now = new Date();
  const courseHistoryEntry: CourseHistoryEntry | null = courseChanged
    ? {
        fromCourse: existingRegistration?.courseJoined || "",
        toCourse: registration.courseJoined,
        changedAt: now,
        changedByEmployeeId: admin.id,
        changedByName: admin.name,
        changedByUsername: admin.username,
        source: "admin-update"
      }
    : null;

  await collection.updateOne(
    { _id: new ObjectId(id) },
    [
      {
        $set: {
        ...registration,
        nickname: { $literal: registration.nickname },
        ...(upgradedStudentId
          ? {
              studentId: upgradedStudentId,
              studentIdType: "student",
              previousStudentId: existingRegistration?.studentId || "",
              upgradedToStudentId: upgradedStudentId,
              upgradedFromTrial: true,
              upgradedAt: now
            }
          : {
              studentIdType: isJoiningCourse ? "student" : existingRegistration?.studentIdType || "trial"
            }),
          updatedAt: now,
          ...(courseHistoryEntry
            ? { courseHistory: { $concatArrays: [{ $ifNull: ["$courseHistory", []] }, [courseHistoryEntry]] } }
            : {})
        }
      }
    ]
  );

  const currentStudentId = upgradedStudentId || existingRegistration?.studentId || "";

  await refreshUnpaidStudentPaymentPricing(db, {
    studentId: currentStudentId,
    studentName: registration.studentName,
    courseJoined: registration.courseJoined,
    classType: registration.classType,
    classMode: registration.classMode
  });
  await ensureGroupMonthlyInvoice(db, {
    studentId: currentStudentId,
    studentName: registration.studentName,
    courseJoined: registration.courseJoined,
    classType: registration.classType,
    classMode: registration.classMode,
    activeBatchId: typeof existingRegistration?.activeBatchId === "string" ? existingRegistration.activeBatchId : "",
    activeBatchName: typeof existingRegistration?.activeBatchName === "string" ? existingRegistration.activeBatchName : "",
    batchProgram: typeof existingRegistration?.batchProgram === "string" ? existingRegistration.batchProgram : ""
  });

  if (currentStudentId) {
    await db.collection(getClassSessionsCollectionName()).updateMany(
      { studentId: currentStudentId, status: { $ne: "Completed" } },
      {
        $set: {
          studentName: registration.studentName,
          courseJoined: registration.courseJoined,
          classType: registration.classType,
          classMode: registration.classMode,
          studentProfileSyncedAt: now,
          updatedAt: now
        }
      }
    );
  }

  revalidatePath("/admin/students");
  revalidatePath("/admin/sessions");
  revalidatePath("/teacher");
  revalidatePath("/admin/students/trials");
  revalidatePath("/finance/payments");
  revalidatePath("/ceo");
  revalidatePath("/ceo/finance");
  revalidatePath(`/admin/students/${id}/edit`);
  redirect(`/admin/students/${id}/edit?updated=1`);
}

export async function regenerateParentAccessToken(formData: FormData) {
  const admin = await assertAdmin();

  const id = clean(formData.get("id"));

  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid student");
  }

  const db = await getMongoDb();
  if (getAdminAccessForUsername(admin.username) === "group-students") {
    const student = await db.collection<EditableStudentDocument>(getStudentRegistrationCollectionName()).findOne({ _id: new ObjectId(id) });
    if (student?.classType !== "Basic Group") throw new Error("You can only manage Basic Group students.");
  }
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

export async function changeStudentStatus(formData: FormData) {
  const admin = await assertAdmin();
  const id = clean(formData.get("id"));
  const toStatus = clean(formData.get("studentStatus")) as StudentStatus;
  const effectiveDate = clean(formData.get("effectiveDate"));
  const note = clean(formData.get("statusNote"));

  if (!ObjectId.isValid(id) || !isStudentStatus(toStatus) || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) {
    throw new Error("Choose a valid student status and effective date.");
  }
  if (toStatus !== "Active" && note.length < 3) {
    throw new Error("Add a short reason for changing the student's status.");
  }
  if (note.length > 500) {
    throw new Error("Status note must be 500 characters or fewer.");
  }

  const db = await getMongoDb();
  const collection = db.collection<EditableStudentDocument>(getStudentRegistrationCollectionName());
  const recordId = new ObjectId(id);
  const student = await collection.findOne({ _id: recordId });
  if (!student?.studentId || isTrialCourse(String(student.courseJoined || ""))) {
    throw new Error("Course student not found.");
  }
  if (getAdminAccessForUsername(admin.username) === "group-students" && student.classType !== "Basic Group") {
    throw new Error("You can only manage Basic Group students.");
  }

  const fromStatus = isStudentStatus(String(student.studentStatus || "")) ? student.studentStatus as StudentStatus : "Active";
  if (fromStatus === toStatus) {
    throw new Error(`Student is already ${toStatus.toLowerCase()}.`);
  }

  const now = new Date();
  const historyEntry: StudentStatusHistoryEntry = {
    fromStatus,
    toStatus,
    effectiveDate,
    note,
    changedAt: now,
    changedByEmployeeId: admin.id,
    changedByName: admin.name,
    changedByUsername: admin.username
  };

  await collection.updateOne(
    { _id: recordId },
    [
      {
        $set: {
          studentStatus: toStatus,
          statusEffectiveDate: effectiveDate,
          statusNote: note,
          statusChangedAt: now,
          statusChangedByEmployeeId: admin.id,
          statusChangedByName: admin.name,
          statusHistory: { $concatArrays: [{ $ifNull: ["$statusHistory", []] }, [historyEntry]] },
          updatedAt: now
        }
      }
    ]
  );

  if (toStatus !== "Active") {
    await db.collection(getClassSessionsCollectionName()).updateMany(
      { studentId: student.studentId, status: { $ne: "Completed" } },
      {
        $set: {
          status: "Completed",
          studentLifecycleClosed: true,
          studentLifecycleStatus: toStatus,
          studentLifecycleClosedAt: now,
          studentLifecycleClosedBy: admin.name,
          updatedAt: now
        }
      }
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/attendance");
  revalidatePath("/teacher");
  revalidatePath("/teacher/journals");
  revalidatePath("/finance/payments");
  revalidatePath("/ceo");
  revalidatePath(`/admin/students/${id}/edit`);
  redirect(`/admin/students/${id}/edit?statusUpdated=1`);
}
