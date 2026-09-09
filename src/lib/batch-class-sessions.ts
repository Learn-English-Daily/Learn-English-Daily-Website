export const batchSessionStatuses = ["Scheduled", "Completed", "Cancelled"] as const;
export type BatchSessionStatus = (typeof batchSessionStatuses)[number];

export type BatchSessionStudent = {
  studentId: string;
  studentName: string;
};

export type BatchAttendanceEntry = BatchSessionStudent & {
  attendance: "Present" | "Absent" | "Excused";
  participationStars: number;
  minutesLate: number;
  communication: number;
  englishSkills: number;
  creativity: number;
  learningHabits: number;
  automaticCommentEn: string;
  automaticCommentId: string;
};

export function buildGroupClassComment(entry: Pick<BatchAttendanceEntry, "communication" | "englishSkills" | "creativity" | "learningHabits">) {
  const average = (entry.communication + entry.englishSkills + entry.creativity + entry.learningHabits) / 4;
  if (average >= 4.5) return {
    en: "Excellent class performance. The student communicated confidently, showed strong English skills and creativity, and demonstrated excellent learning habits.",
    id: "Performa kelas sangat baik. Siswa berkomunikasi dengan percaya diri, menunjukkan kemampuan bahasa Inggris dan kreativitas yang kuat, serta kebiasaan belajar yang sangat baik."
  };
  if (average >= 3.5) return {
    en: "Good class performance. The student is making steady progress in communication, English skills, creativity, and learning habits.",
    id: "Performa kelas baik. Siswa menunjukkan perkembangan yang stabil dalam komunikasi, kemampuan bahasa Inggris, kreativitas, dan kebiasaan belajar."
  };
  if (average >= 2.5) return {
    en: "The student is developing well and will benefit from more practice in communication, English skills, creativity, and learning habits.",
    id: "Siswa berkembang dengan baik dan akan mendapat manfaat dari lebih banyak latihan dalam komunikasi, kemampuan bahasa Inggris, kreativitas, dan kebiasaan belajar."
  };
  return {
    en: "The student needs continued guidance and regular practice to build communication, English skills, creativity, and learning habits.",
    id: "Siswa membutuhkan bimbingan berkelanjutan dan latihan rutin untuk meningkatkan komunikasi, kemampuan bahasa Inggris, kreativitas, dan kebiasaan belajar."
  };
}

export type BatchClassSessionDocument = {
  batchId: string;
  batchName: string;
  program: string;
  meetingNumber: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classMode: "Online" | "Offline";
  teacherId: string;
  teacherName: string;
  topic: string;
  status: BatchSessionStatus;
  studentSnapshot: BatchSessionStudent[];
  attendance?: BatchAttendanceEntry[];
  attendanceMarked?: boolean;
  attendanceMarkedAt?: Date;
  attendanceMarkedBy?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export function getBatchClassSessionsCollectionName() {
  return process.env.MONGODB_BATCH_CLASS_SESSIONS_COLLECTION || "batchClassSessions";
}

export function getJakartaPeriod(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function getBatchClassEndAt(sessionDate: string, endTime: string) {
  if (!sessionDate || !endTime) return "";
  return `${sessionDate}T${endTime}:00+07:00`;
}

export function hasBatchClassEnded(session: Pick<BatchClassSessionDocument, "sessionDate" | "endTime">, now = new Date()) {
  const endValue = getBatchClassEndAt(session.sessionDate, session.endTime);
  if (!endValue) return false;
  const endTime = new Date(endValue).getTime();
  return Number.isFinite(endTime) && endTime <= now.getTime();
}

const weekdayAliases: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6
};

export function parseBatchWeekdays(value: string) {
  return [...new Set(value.toLowerCase().split(/[^a-z]+/).map((day) => weekdayAliases[day]).filter((day): day is number => day !== undefined))].sort();
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInput(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function generateBatchMeetingDates(firstDate: string, weekdays: number[], count: number) {
  const cursor = parseDateInput(firstDate);
  if (!cursor || !weekdays.length || count < 1) return [];

  const dates: string[] = [];
  for (let guard = 0; dates.length < count && guard < 370; guard += 1) {
    if (weekdays.includes(cursor.getUTCDay())) dates.push(formatDateInput(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
