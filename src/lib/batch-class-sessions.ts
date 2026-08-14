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
};

export type BatchClassSessionDocument = {
  batchId: string;
  batchName: string;
  program: string;
  meetingNumber: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
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
