export const reviewRoles = ["student", "parent"] as const;
export const reviewStatuses = ["pending", "approved", "hidden"] as const;
export const reviewDisplayOptions = ["full", "initials", "anonymous"] as const;
export const reviewCourseValues = ["Trial Class", "Foundation English", "Confident English", "Fluent English"] as const;

export type ReviewRole = (typeof reviewRoles)[number];
export type ReviewStatus = (typeof reviewStatuses)[number];
export type ReviewDisplayOption = (typeof reviewDisplayOptions)[number];
export type ReviewCourseValue = (typeof reviewCourseValues)[number];

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
