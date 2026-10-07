import type { Db } from "mongodb";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";

let journalIndexPromise: Promise<string> | null = null;
let adminJournalIndexPromise: Promise<string> | null = null;

export function ensureTeacherJournalIndex(db: Db) {
  if (!journalIndexPromise) {
    journalIndexPromise = db.collection(getStudentAttendanceCollectionName()).createIndex(
      { teacherIds: 1, studentId: 1, meetingDate: -1, _id: -1 },
      { name: "teacher_student_journal_history" }
    );
  }
  return journalIndexPromise;
}

export function ensureAdminJournalIndex(db: Db) {
  if (!adminJournalIndexPromise) {
    adminJournalIndexPromise = db.collection(getStudentAttendanceCollectionName()).createIndex(
      { studentId: 1, meetingDate: -1, _id: -1 },
      { name: "admin_student_journal_history" }
    );
  }
  return adminJournalIndexPromise;
}
