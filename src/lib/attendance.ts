export const attendanceStatuses = ["Present", "Absent", "Late", "Cancelled"] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];

export function getStudentAttendanceCollectionName() {
  return process.env.MONGODB_STUDENT_ATTENDANCE_COLLECTION || "student_attendance";
}

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return attendanceStatuses.includes(value as AttendanceStatus);
}
