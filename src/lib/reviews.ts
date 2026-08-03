import type { Filter, WithId } from "mongodb";
import { unstable_noStore as noStore } from "next/cache";
import { getMongoDb } from "@/lib/mongodb";

export const reviewRoles = ["student", "parent"] as const;
export const reviewStatuses = ["pending", "approved", "hidden"] as const;
export const reviewDisplayOptions = ["full", "initials", "anonymous"] as const;
export const reviewCourseValues = ["Trial Class", "Foundation English", "Confident English", "Fluent English"] as const;

export type ReviewRole = (typeof reviewRoles)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type ReviewDisplayOption = (typeof reviewDisplayOptions)[number];
export type ReviewCourseValue = (typeof reviewCourseValues)[number];

type ReviewDocument = {
  name?: string;
  role?: ReviewRole;
  course?: string;
  rating?: number;
  feedback?: string;
  permission?: boolean;
  displayName?: ReviewDisplayOption;
  locale?: string;
  status?: ReviewStatus;
  createdAt?: Date;
};

export type PublicReview = {
  id: string;
  name: string;
  role: string;
  course: string;
  rating: number;
  feedback: string;
  createdAt: string;
};

export function isReviewRole(value: string): value is ReviewRole {
  return reviewRoles.includes(value as ReviewRole);
}

export function isReviewStatus(value: string): value is ReviewStatus {
  return reviewStatuses.includes(value as ReviewStatus);
}

export function isReviewDisplayOption(value: string): value is ReviewDisplayOption {
  return reviewDisplayOptions.includes(value as ReviewDisplayOption);
}

export function isReviewCourseValue(value: string): value is ReviewCourseValue {
  return reviewCourseValues.includes(value as ReviewCourseValue);
}

export function getReviewCollectionName() {
  return process.env.MONGODB_REVIEWS_COLLECTION || "reviews";
}

function getInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "LEAD";
}

function getPublicName(doc: ReviewDocument) {
  const name = doc.name || "LEAD Student";

  if (doc.displayName === "anonymous") {
    return doc.role === "parent" ? "LEAD Parent" : "LEAD Student";
  }

  if (doc.displayName === "initials") {
    return getInitials(name);
  }

  return name;
}

export async function getApprovedReviews(limit = 12): Promise<PublicReview[]> {
  noStore();

  try {
    const db = await getMongoDb();
    const filter: Filter<ReviewDocument> = {
      status: "approved",
      permission: { $ne: false }
    };
    const docs = (await db
      .collection<ReviewDocument>(getReviewCollectionName())
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()) as WithId<ReviewDocument>[];

    return docs.map((doc) => ({
      id: doc._id.toString(),
      name: getPublicName(doc),
      role: doc.role || "student",
      course: doc.course || "LEAD Class",
      rating: Math.min(Math.max(doc.rating || 5, 1), 5),
      feedback: doc.feedback || "",
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : ""
    }));
  } catch (error) {
    console.error("Approved reviews fetch failed", error);
    return [];
  }
}
