import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";
import {
  getApprovedReviews,
  getReviewCollectionName,
  isReviewCourseValue,
  isReviewDisplayOption,
  isReviewRole
} from "@/lib/reviews";

export const runtime = "nodejs";

type ReviewPayload = {
  name?: string;
  role?: string;
  course?: string;
  rating?: number | string;
  feedback?: string;
  permission?: boolean;
  displayName?: string;
  locale?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const reviews = await getApprovedReviews();
  return NextResponse.json({ ok: true, reviews });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ReviewPayload | null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const name = clean(payload.name);
  const role = clean(payload.role);
  const course = clean(payload.course);
  const displayName = clean(payload.displayName) || "full";
  const feedback = clean(payload.feedback);
  const rating = Number(payload.rating);

  if (!name || !role || !course || !feedback || !payload.permission) {
    return NextResponse.json({ ok: false, error: "Please complete all required fields." }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json({ ok: false, error: "Name is too long." }, { status: 400 });
  }

  if (!isReviewRole(role)) {
    return NextResponse.json({ ok: false, error: "Please choose student or parent." }, { status: 400 });
  }

  if (!isReviewCourseValue(course)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid class or course." }, { status: 400 });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ ok: false, error: "Please choose a rating from 1 to 5." }, { status: 400 });
  }

  if (feedback.length < 10 || feedback.length > 700) {
    return NextResponse.json({ ok: false, error: "Feedback should be between 10 and 700 characters." }, { status: 400 });
  }

  if (!isReviewDisplayOption(displayName)) {
    return NextResponse.json({ ok: false, error: "Please choose a valid display option." }, { status: 400 });
  }

  const review = {
    name,
    role,
    course,
    rating,
    feedback,
    permission: true,
    displayName,
    locale: clean(payload.locale) || "en",
    status: "pending",
    source: "website-review",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  try {
    const db = await getMongoDb();
    const result = await db.collection(getReviewCollectionName()).insertOne(review);

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("Review form MongoDB insert failed", error);
    return NextResponse.json({ ok: false, error: "Unable to submit right now. Please try again." }, { status: 500 });
  }
}
