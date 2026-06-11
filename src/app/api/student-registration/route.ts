import { NextResponse } from "next/server";
import { notifyNewStudentRegistration } from "@/lib/admin-notifications";
import { getMongoDb } from "@/lib/mongodb";
import {
  getStudentRegistrationCollectionName,
  isClassType,
  isCourseJoined,
  isEnglishLevel,
  isLearningGoal
} from "@/lib/student-registration";

export const runtime = "nodejs";

type StudentRegistrationPayload = {
  studentName?: string;
  whatsapp?: string;
  parentName?: string;
  age?: string;
  grade?: string;
  preferredSchedule?: string;
  preferredTime?: string;
  courseJoined?: string;
  classType?: string;
  englishLevel?: string;
  learningGoal?: string;
  countryCity?: string;
  consent?: boolean;
  locale?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isReasonableShortText(value: string, max = 120) {
  return value.length > 0 && value.length <= max;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as StudentRegistrationPayload | null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const registration = {
    studentName: clean(payload.studentName),
    whatsapp: clean(payload.whatsapp),
    parentName: clean(payload.parentName),
    age: clean(payload.age),
    grade: clean(payload.grade),
    preferredSchedule: clean(payload.preferredSchedule),
    preferredTime: clean(payload.preferredTime),
    courseJoined: clean(payload.courseJoined),
    classType: clean(payload.classType),
    englishLevel: clean(payload.englishLevel),
    learningGoal: clean(payload.learningGoal),
    countryCity: clean(payload.countryCity),
    locale: clean(payload.locale) || "en",
    consent: payload.consent === true,
    source: "student-registration",
    createdAt: new Date()
  };

  if (
    !isReasonableShortText(registration.studentName) ||
    !isReasonableShortText(registration.whatsapp) ||
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
    const result = await db.collection(getStudentRegistrationCollectionName()).insertOne(registration);
    await notifyNewStudentRegistration(registration).catch((notificationError) => {
      console.error("Student registration admin notification failed", notificationError);
    });

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("Student registration MongoDB insert failed", error);
    return NextResponse.json({ ok: false, error: "Unable to submit right now. Please try again." }, { status: 500 });
  }
}
