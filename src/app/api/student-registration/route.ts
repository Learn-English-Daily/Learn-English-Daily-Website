import { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { notifyNewStudentRegistration } from "@/lib/admin-notifications";
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
  isTrialCourse,
  type CourseHistoryEntry
} from "@/lib/student-registration";

export const runtime = "nodejs";

type StudentRegistrationPayload = {
  studentName?: string;
  whatsapp?: string;
  email?: string;
  parentName?: string;
  age?: string;
  grade?: string;
  preferredSchedule?: string;
  preferredTime?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  englishLevel?: string;
  learningGoal?: string;
  countryCity?: string;
  consent?: boolean;
  locale?: string;
};

type ExistingTrialRegistration = {
  _id?: ObjectId;
  studentId?: string;
  courseJoined?: string;
  courseHistory?: CourseHistoryEntry[];
  [key: string]: unknown;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isReasonableShortText(value: string, max = 120) {
  return value.length > 0 && value.length <= max;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160;
}

function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, "");
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

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as StudentRegistrationPayload | null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const registration = {
    studentName: clean(payload.studentName),
    whatsapp: clean(payload.whatsapp),
    email: clean(payload.email).toLowerCase(),
    normalizedWhatsapp: normalizeWhatsapp(clean(payload.whatsapp)),
    parentName: clean(payload.parentName),
    age: clean(payload.age),
    grade: clean(payload.grade),
    preferredSchedule: clean(payload.preferredSchedule),
    preferredTime: clean(payload.preferredTime),
    courseJoined: clean(payload.courseJoined),
    classType: clean(payload.classType),
    classMode: clean(payload.classMode),
    englishLevel: clean(payload.englishLevel),
    learningGoal: clean(payload.learningGoal),
    countryCity: clean(payload.countryCity),
    locale: clean(payload.locale) || "en",
    consent: payload.consent === true,
    source: "student-registration"
  };

  if (
    !isReasonableShortText(registration.studentName) ||
    !isReasonableShortText(registration.whatsapp) ||
    !isValidEmail(registration.email) ||
    !isReasonableShortText(registration.parentName) ||
    !isReasonableShortText(registration.age, 20) ||
    !isReasonableShortText(registration.grade, 60) ||
    !isReasonableShortText(registration.preferredSchedule) ||
    !isReasonableShortText(registration.preferredTime)
  ) {
    return NextResponse.json({ ok: false, error: "Please complete all required fields." }, { status: 400 });
  }

  if (!isCourseJoined(registration.courseJoined)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid course." }, { status: 400 });
  }

  if (!isClassType(registration.classType)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid class type." }, { status: 400 });
  }

  if (!isClassMode(registration.classMode)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid class mode." }, { status: 400 });
  }

  if (!isEnglishLevel(registration.englishLevel)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid English level." }, { status: 400 });
  }

  if (!isLearningGoal(registration.learningGoal)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid learning goal." }, { status: 400 });
  }

  if (!registration.consent) {
    return NextResponse.json({ ok: false, error: "Please confirm the consent checkbox." }, { status: 400 });
  }

  try {
    const db = await getMongoDb();
    const collection = db.collection<ExistingTrialRegistration>(getStudentRegistrationCollectionName());
    const now = new Date();
    const joinedStudent = !isTrialCourse(registration.courseJoined);
    const studentId = await getNextStudentId(joinedStudent ? "STU" : "TR");
    const existingTrial = joinedStudent
      ? await collection.findOne<ExistingTrialRegistration>({
          normalizedWhatsapp: registration.normalizedWhatsapp,
          courseJoined: "Trial Class",
          studentId: { $regex: "^TR" },
          upgradedToStudentId: { $exists: false }
        })
      : null;
    const savedRegistration = {
      ...registration,
      studentId,
      studentIdType: joinedStudent ? "student" : "trial",
      studentStatus: "Active",
      parentAccessToken: generateParentAccessToken(),
      updatedAt: now
    };

    if (existingTrial) {
      const courseHistoryEntry: CourseHistoryEntry = {
        fromCourse: existingTrial.courseJoined || "Trial Class",
        toCourse: registration.courseJoined,
        changedAt: now,
        changedByEmployeeId: "",
        changedByName: "Student registration",
        changedByUsername: "self-service",
        source: "trial-upgrade"
      };
      await collection.updateOne(
        { _id: existingTrial._id },
        [
          {
            $set: {
              ...savedRegistration,
              previousStudentId: existingTrial.studentId || "",
              upgradedToStudentId: studentId,
              upgradedFromTrial: true,
              upgradedAt: now,
              courseHistory: { $concatArrays: [{ $ifNull: ["$courseHistory", []] }, [courseHistoryEntry]] }
            }
          }
        ]
      );
      await notifyNewStudentRegistration(savedRegistration).catch((notificationError) => {
        console.error("Student registration admin notification failed", notificationError);
      });

      return NextResponse.json({ ok: true, id: String(existingTrial._id), studentId, upgraded: true }, { status: 200 });
    }

    const result = await collection.insertOne({
      ...savedRegistration,
      createdAt: now
    });
    await notifyNewStudentRegistration(savedRegistration).catch((notificationError) => {
      console.error("Student registration admin notification failed", notificationError);
    });

    return NextResponse.json({ ok: true, id: result.insertedId.toString(), studentId }, { status: 201 });
  } catch (error) {
    console.error("Student registration MongoDB insert failed", error);
    return NextResponse.json({ ok: false, error: "Unable to submit right now. Please try again." }, { status: 500 });
  }
}
