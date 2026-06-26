export const classSessionStatuses = ["Scheduled", "Completed"] as const;

export type ClassSessionStatus = (typeof classSessionStatuses)[number];
export type ComputedClassSessionStatus = ClassSessionStatus | "Needs Attendance";

export type ClassSessionDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  meetingNumber?: number;
  sessionDate?: string;
  sessionTime?: string;
  startTime?: string;
  endTime?: string;
  scheduledAt?: string;
  endsAt?: string;
  teacherIds?: string[];
  teacherNames?: string[];
  status?: ClassSessionStatus;
  attendanceId?: string;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export function getClassSessionsCollectionName() {
  return process.env.MONGODB_CLASS_SESSIONS_COLLECTION || "class_sessions";
}

export function getScheduledAt(sessionDate: string, sessionTime: string) {
  if (!sessionDate || !sessionTime) return "";
  return `${sessionDate}T${sessionTime}:00+07:00`;
}

export function getSessionEndAt(sessionDate: string, endTime: string) {
  if (!sessionDate || !endTime) return "";
  return `${sessionDate}T${endTime}:00+07:00`;
}

export function getComputedClassSessionStatus({
  status,
  scheduledAt,
  endsAt,
  hasAttendance,
  now = new Date()
}: {
  status?: ClassSessionStatus;
  scheduledAt?: string;
  endsAt?: string;
  hasAttendance?: boolean;
  now?: Date;
}): ComputedClassSessionStatus {
  if (status === "Completed" || hasAttendance) return "Completed";
  const attendanceDueAt = endsAt || scheduledAt;
  if (attendanceDueAt && new Date(attendanceDueAt).getTime() <= now.getTime()) return "Needs Attendance";
  return "Scheduled";
}
