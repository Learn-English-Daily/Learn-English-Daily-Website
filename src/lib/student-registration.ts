export const courseJoinedOptions = ["Foundation English", "Confident English", "Fluent English", "Trial Class"] as const;
export const classTypeOptions = ["Basic Group", "Standard/Buddy", "Premium 1-to-1"] as const;
export const englishLevelOptions = ["Beginner", "Elementary", "Intermediate", "Not sure"] as const;
export const learningGoalOptions = ["Speaking confidence", "School English", "Grammar", "Vocabulary", "Daily conversation"] as const;

export type CourseJoined = (typeof courseJoinedOptions)[number];
export type ClassType = (typeof classTypeOptions)[number];
export type EnglishLevel = (typeof englishLevelOptions)[number];
export type LearningGoal = (typeof learningGoalOptions)[number];

export function getStudentRegistrationCollectionName() {
  return process.env.MONGODB_STUDENTS_COLLECTION || "student_registrations";
}

export function getStudentIdCountersCollectionName() {
  return process.env.MONGODB_STUDENT_ID_COUNTERS_COLLECTION || "student_id_counters";
}

export function isTrialCourse(courseJoined: string) {
  return courseJoined === "Trial Class";
}

export function isCourseJoined(value: string): value is CourseJoined {
  return courseJoinedOptions.includes(value as CourseJoined);
}

export function isClassType(value: string): value is ClassType {
  return classTypeOptions.includes(value as ClassType);
}

export function isEnglishLevel(value: string): value is EnglishLevel {
  return englishLevelOptions.includes(value as EnglishLevel);
}

export function isLearningGoal(value: string): value is LearningGoal {
  return learningGoalOptions.includes(value as LearningGoal);
}
