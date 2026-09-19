import type { Db } from "mongodb";
import type { BatchSessionStudent } from "@/lib/batch-class-sessions";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";

export async function getBatchAttendanceRoster(db: Db, batchId: string): Promise<BatchSessionStudent[]> {
  const students = await db.collection(getStudentRegistrationCollectionName()).find({
    $and: [getActiveStudentFilter(), { classType: "Basic Group", activeBatchId: batchId }]
  }).project({ studentId: 1, studentName: 1 }).sort({ studentName: 1, studentId: 1 }).toArray();

  return students.map((student) => ({
    studentId: String(student.studentId),
    studentName: String(student.studentName || "Student")
  }));
}
