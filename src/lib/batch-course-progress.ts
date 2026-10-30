import type { BatchClassSessionDocument } from "@/lib/batch-class-sessions";

export const GROUP_COURSE_CLASS_TARGET = 72;

export type BatchMonthProgress = {
  monthKey: string;
  monthLabel: string;
  completedClasses: number;
  studentsAttended: number;
};

export type BatchCourseProgress = {
  completedClasses: number;
  remainingClasses: number;
  progressPercent: number;
  months: BatchMonthProgress[];
};

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export function getJakartaMonthKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(now);
}

export function buildBatchCourseProgress(sessions: BatchClassSessionDocument[]): BatchCourseProgress {
  const completed = sessions.filter((session) => session.status === "Completed");
  const monthly = new Map<string, { completedClasses: number; studentIds: Set<string> }>();

  for (const session of completed) {
    const monthKey = session.sessionDate.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
    const entry = monthly.get(monthKey) || { completedClasses: 0, studentIds: new Set<string>() };
    entry.completedClasses += 1;
    for (const attendance of session.attendance || []) {
      if (attendance.attendance === "Present") entry.studentIds.add(attendance.studentId);
    }
    monthly.set(monthKey, entry);
  }

  const completedClasses = completed.length;
  return {
    completedClasses,
    remainingClasses: Math.max(0, GROUP_COURSE_CLASS_TARGET - completedClasses),
    progressPercent: Math.min(100, Math.round((completedClasses / GROUP_COURSE_CLASS_TARGET) * 100)),
    months: [...monthly.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([monthKey, entry]) => ({
        monthKey,
        monthLabel: monthLabel(monthKey),
        completedClasses: entry.completedClasses,
        studentsAttended: entry.studentIds.size
      }))
  };
}

export function buildStudentGroupClassCounts(sessions: BatchClassSessionDocument[]) {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== "Completed") continue;
    for (const attendance of session.attendance || []) {
      if (attendance.attendance !== "Present") continue;
      counts.set(attendance.studentId, (counts.get(attendance.studentId) || 0) + 1);
    }
  }
  return counts;
}
