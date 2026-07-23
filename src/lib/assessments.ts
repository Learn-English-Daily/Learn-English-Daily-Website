export const assessmentPrograms = ["Foundation English", "Confident English", "Fluent English"] as const;
export const assessmentAttendanceStatuses = ["Present", "Absent", "Excused"] as const;

export type AssessmentProgram = (typeof assessmentPrograms)[number];
export type AssessmentAttendanceStatus = (typeof assessmentAttendanceStatuses)[number];
export type AssessmentGrade = "A" | "B" | "C";

export type MeetingAssessmentInput = {
  attendance: AssessmentAttendanceStatus;
  participationStars: number;
  minutesLate: number;
};

export type MonthlyAssessmentInput = {
  meetings: MeetingAssessmentInput[];
  communication: {
    speaking: number;
    pronunciation: number;
    fluency: number;
  };
  englishSkills: {
    vocabulary: number;
    grammar: number;
  };
  creativity: {
    originalIdeas: number;
    storytelling: number;
    rolePlay: number;
  };
  learningHabits: {
    homework: number;
    respect: number;
  };
};

export function getBatchesCollectionName() {
  return process.env.MONGODB_BATCHES_COLLECTION || "batches";
}

export function getMonthlyAssessmentsCollectionName() {
  return process.env.MONGODB_MONTHLY_ASSESSMENTS_COLLECTION || "monthlyAssessments";
}

export function isAssessmentProgram(value: string): value is AssessmentProgram {
  return assessmentPrograms.includes(value as AssessmentProgram);
}

export function isAssessmentAttendanceStatus(value: string): value is AssessmentAttendanceStatus {
  return assessmentAttendanceStatuses.includes(value as AssessmentAttendanceStatus);
}

export function scoreToGrade(score: number): AssessmentGrade {
  if (score >= 85) return "A";
  if (score >= 76) return "B";
  return "C";
}

export function gradeLabel(grade: AssessmentGrade) {
  if (grade === "A") return "Excellent";
  if (grade === "B") return "Good";
  return "Developing";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundedAverage(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function starScore(values: number[]) {
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const score = Math.round((average / 5) * 100);
  const grade = scoreToGrade(score);

  return {
    average: Number(average.toFixed(1)),
    score,
    grade,
    label: gradeLabel(grade)
  };
}

export function calculateAttendance(meetings: MeetingAssessmentInput[]) {
  const completedMeetings = meetings.filter((meeting) => meeting.attendance === "Present" || meeting.attendance === "Excused").length;
  const totalMeetings = meetings.length || 12;
  const attendancePercentage = Math.round((completedMeetings / totalMeetings) * 100);
  const grade: AssessmentGrade = completedMeetings >= 10 ? "A" : completedMeetings >= 7 ? "B" : "C";
  const score =
    grade === "A"
      ? clamp(85 + Math.round(((completedMeetings - 10) / 2) * 15), 85, 100)
      : grade === "B"
        ? clamp(76 + Math.round(((completedMeetings - 7) / 2) * 8), 76, 84)
        : clamp(Math.round((completedMeetings / 6) * 75), 0, 75);

  return {
    completedMeetings,
    totalMeetings,
    attendancePercentage,
    score,
    grade,
    label: gradeLabel(grade)
  };
}

export function calculateParticipation(meetings: MeetingAssessmentInput[]) {
  const totalStars = meetings.reduce((sum, meeting) => sum + meeting.participationStars, 0);
  const maxStars = (meetings.length || 12) * 5;
  const averageStars = meetings.length ? Number((totalStars / meetings.length).toFixed(1)) : 0;
  const grade: AssessmentGrade = totalStars >= 41 ? "A" : totalStars >= 21 ? "B" : "C";
  const score =
    grade === "A"
      ? clamp(85 + Math.round(((totalStars - 41) / 19) * 15), 85, 100)
      : grade === "B"
        ? clamp(76 + Math.round(((totalStars - 21) / 19) * 8), 76, 84)
        : clamp(Math.round((totalStars / 20) * 75), 0, 75);

  return {
    totalStars,
    maxStars,
    averageStars,
    score,
    grade,
    label: gradeLabel(grade)
  };
}

export function calculatePunctuality(meetings: MeetingAssessmentInput[]) {
  const totalMinutesLate = meetings.reduce((sum, meeting) => sum + meeting.minutesLate, 0);
  const deductions = meetings.reduce((sum, meeting) => sum + Math.floor(meeting.minutesLate / 5), 0);
  const score = clamp(85 - deductions, 0, 100);
  const grade = scoreToGrade(score);

  return {
    totalMinutesLate,
    deductions,
    score,
    grade,
    label: gradeLabel(grade)
  };
}

export function buildMonthlyAssessment(input: MonthlyAssessmentInput) {
  const meetings = input.meetings.slice(0, 12);
  const attendance = calculateAttendance(meetings);
  const participation = calculateParticipation(meetings);
  const punctuality = calculatePunctuality(meetings);
  const communication = starScore([
    input.communication.speaking,
    input.communication.pronunciation,
    input.communication.fluency
  ]);
  const englishSkills = starScore([input.englishSkills.vocabulary, input.englishSkills.grammar]);
  const creativity = starScore([
    input.creativity.originalIdeas,
    input.creativity.storytelling,
    input.creativity.rolePlay
  ]);
  const homework = starScore([input.learningHabits.homework]);
  const respect = starScore([input.learningHabits.respect]);
  const learningHabitsScore = roundedAverage([attendance.score, punctuality.score, homework.score, respect.score]);
  const learningHabitsGrade = scoreToGrade(learningHabitsScore);
  const confidence = {
    score: participation.score,
    grade: participation.grade,
    label: participation.label
  };
  const learningHabits = {
    discipline: attendance,
    punctuality,
    homework,
    respect,
    score: learningHabitsScore,
    grade: learningHabitsGrade,
    label: gradeLabel(learningHabitsGrade)
  };
  const overallScore = roundedAverage([
    attendance.score,
    participation.score,
    communication.score,
    englishSkills.score,
    confidence.score,
    creativity.score,
    learningHabits.score
  ]);
  const overallGrade = scoreToGrade(overallScore);

  return {
    meetings,
    attendance,
    participation,
    communication,
    englishSkills,
    confidence,
    creativity,
    learningHabits,
    overall: {
      score: overallScore,
      grade: overallGrade,
      label: gradeLabel(overallGrade)
    },
    automaticComments: automaticComments(overallGrade)
  };
}

export function automaticComments(grade: AssessmentGrade) {
  if (grade === "A") {
    return {
      en: "Communicates confidently and clearly using English. Keep building fluency through consistent speaking practice.",
      id: "Ananda berkomunikasi dengan percaya diri dan jelas menggunakan bahasa Inggris. Terus tingkatkan kelancaran melalui latihan berbicara yang konsisten."
    };
  }

  if (grade === "B") {
    return {
      en: "Communicates well but still needs more confidence and fluency. Regular practice will help strengthen progress.",
      id: "Ananda sudah berkomunikasi dengan baik, namun masih perlu meningkatkan kepercayaan diri dan kelancaran. Latihan rutin akan membantu perkembangan ananda."
    };
  }

  return {
    en: "Needs more speaking practice and confidence. Extra support and regular class participation will help improve progress.",
    id: "Ananda masih membutuhkan lebih banyak latihan berbicara dan kepercayaan diri. Dukungan tambahan dan partisipasi rutin di kelas akan membantu perkembangan ananda."
  };
}
