import type { Db, Filter, WithId } from "mongodb";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import { getRecordBillingPeriod } from "@/lib/billing-periods";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument
} from "@/lib/class-sessions";

type AttendanceLookupDocument = {
  studentId?: string;
  meetingNumber?: number;
  billingMonth?: number;
  billingYear?: number;
  billingPeriod?: string;
  meetingDate?: string;
};

export type AttendanceReminder = {
  id: string;
  studentId: string;
  studentName: string;
  meetingNumber: number;
  sessionDate: string;
  scheduledAt: string;
  endsAt: string;
  teacherNames: string[];
};

function attendanceKey(record: {
  studentId?: string;
  meetingNumber?: number;
  billingMonth?: number;
  billingYear?: number;
  billingPeriod?: string;
  meetingDate?: string;
  sessionDate?: string;
}) {
  const period = record.billingPeriod || getRecordBillingPeriod(record).billingPeriod;
  return `${record.studentId || ""}:${record.meetingNumber || 0}:${period}`;
}

export async function getAttendanceReminders(
  db: Db,
  options: {
    teacherId?: string;
    limit?: number;
  } = {}
): Promise<AttendanceReminder[]> {
  const sessionFilter: Filter<ClassSessionDocument> = {
    status: { $ne: "Completed" },
    ...(options.teacherId ? { teacherIds: options.teacherId } : {})
  };

  const [sessionDocs, attendanceDocs] = await Promise.all([
    db
      .collection<ClassSessionDocument>(getClassSessionsCollectionName())
      .find(sessionFilter)
      .sort({ scheduledAt: 1, createdAt: 1 })
      .limit(300)
      .toArray() as Promise<WithId<ClassSessionDocument>[]>,
    db
      .collection<AttendanceLookupDocument>(getStudentAttendanceCollectionName())
      .find({})
      .project({ studentId: 1, meetingNumber: 1, billingMonth: 1, billingYear: 1, billingPeriod: 1, meetingDate: 1 })
      .limit(10000)
      .toArray() as Promise<WithId<AttendanceLookupDocument>[]>
  ]);

  const attendanceKeys = new Set(attendanceDocs.map((doc) => attendanceKey(doc)));

  const reminders = sessionDocs.flatMap((doc) => {
    const key = attendanceKey(doc);
    const hasAttendance = attendanceKeys.has(key);
    const status = getComputedClassSessionStatus({
      status: doc.status,
      scheduledAt: doc.scheduledAt,
      endsAt: doc.endsAt,
      hasAttendance
    });

    if (status !== "Needs Attendance") return [];

    return [
      {
        id: doc._id.toString(),
        studentId: doc.studentId || "",
        studentName: doc.studentName || "Student",
        meetingNumber: doc.meetingNumber || 0,
        sessionDate: doc.sessionDate || "",
        scheduledAt: doc.scheduledAt || "",
        endsAt: doc.endsAt || "",
        teacherNames: doc.teacherNames || []
      }
    ];
  });

  return options.limit ? reminders.slice(0, options.limit) : reminders;
}
