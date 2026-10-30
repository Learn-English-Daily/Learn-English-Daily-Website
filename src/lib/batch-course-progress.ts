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

export type StudentGroupClassProgress = {
  totalClasses: number;
  months: Array<{ monthKey: string; monthLabel: string; classesTaken: number }>;
};

export function buildStudentGroupClassProgress(sessions: BatchClassSessionDocument[]) {
  const monthlyCounts = new Map<string, Map<string, number>>();
  for (const session of sessions) {
    if (session.status !== "Completed") continue;
    const monthKey = session.sessionDate.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) continue;
    for (const attendance of session.attendance || []) {
      if (attendance.attendance !== "Present") continue;
      const studentMonths = monthlyCounts.get(attendance.studentId) || new Map<string, number>();
      studentMonths.set(monthKey, (studentMonths.get(monthKey) || 0) + 1);
      monthlyCounts.set(attendance.studentId, studentMonths);
    }
  }

  return new Map([...monthlyCounts.entries()].map(([studentId, months]) => {
    const monthRows = [...months.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([monthKey, classesTaken]) => ({ monthKey, monthLabel: monthLabel(monthKey), classesTaken }));
    return [studentId, {
      totalClasses: monthRows.reduce((sum, month) => sum + month.classesTaken, 0),
      months: monthRows
    }] as const;
  }));
}
