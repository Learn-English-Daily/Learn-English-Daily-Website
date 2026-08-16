import type { ClientSession, Db } from "mongodb";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import { getClassSessionsCollectionName } from "@/lib/class-sessions";

type SequenceRecord = {
  studentId?: string;
  meetingNumber?: number;
  meetingDate?: string;
  sessionDate?: string;
  scheduledAt?: string;
  createdAt?: Date;
};

function recordDate(record: SequenceRecord) {
  return record.meetingDate || record.sessionDate || record.scheduledAt || record.createdAt?.toISOString() || "";
}

export async function getStudentNextMeetingNumbers(
  db: Db,
  studentIds: string[],
  configuredNextNumbers = new Map<string, number>(),
  session?: ClientSession
) {
  const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))];
  const result = new Map<string, number>();
  for (const studentId of uniqueStudentIds) {
    const configured = configuredNextNumbers.get(studentId);
    if (configured && configured > 0) result.set(studentId, configured);
  }

  const unresolvedIds = uniqueStudentIds.filter((studentId) => !result.has(studentId));
  if (!unresolvedIds.length) return result;

  const options = session ? { session } : undefined;
  const [attendance, sessions] = await Promise.all([
    db.collection<SequenceRecord>(getStudentAttendanceCollectionName())
      .find({ studentId: { $in: unresolvedIds } }, options)
      .project({ studentId: 1, meetingNumber: 1, meetingDate: 1, createdAt: 1 })
      .toArray(),
    db.collection<SequenceRecord>(getClassSessionsCollectionName())
      .find({ studentId: { $in: unresolvedIds } }, options)
      .project({ studentId: 1, meetingNumber: 1, sessionDate: 1, scheduledAt: 1, createdAt: 1 })
      .toArray()
  ]);

  const recordsByStudent = new Map<string, SequenceRecord[]>();
  for (const record of [...attendance, ...sessions]) {
    const studentId = record.studentId || "";
    if (!studentId || !record.meetingNumber) continue;
    const records = recordsByStudent.get(studentId) || [];
    records.push(record);
    recordsByStudent.set(studentId, records);
  }

  for (const studentId of unresolvedIds) {
    const records = (recordsByStudent.get(studentId) || []).sort((left, right) => recordDate(left).localeCompare(recordDate(right)));
    let latestResetIndex = -1;
    records.forEach((record, index) => {
      if (record.meetingNumber === 1) latestResetIndex = index;
    });
    const currentSequence = latestResetIndex >= 0 ? records.slice(latestResetIndex) : records;
    const highestMeeting = currentSequence.reduce((highest, record) => Math.max(highest, record.meetingNumber || 0), 0);
    result.set(studentId, highestMeeting + 1);
  }

  return result;
}
