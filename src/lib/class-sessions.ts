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
  scheduledAt?: string;
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

export function getComputedClassSessionStatus({
  status,
  scheduledAt,
  hasAttendance,
  now = new Date()
}: {
  status?: ClassSessionStatus;
  scheduledAt?: string;
  hasAttendance?: boolean;
  now?: Date;
}): ComputedClassSessionStatus {
  if (status === "Completed" || hasAttendance) return "Completed";
  if (scheduledAt && new Date(scheduledAt).getTime() <= now.getTime()) return "Needs Attendance";
  return "Scheduled";
}
