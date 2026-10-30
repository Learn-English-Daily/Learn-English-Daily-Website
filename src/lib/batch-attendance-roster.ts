import { ObjectId, type Db } from "mongodb";
import { getBatchType, type BatchSessionStudent, type BatchType } from "@/lib/batch-class-sessions";
import { getBatchesCollectionName } from "@/lib/assessments";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";

export async function getBatchAttendanceRoster(db: Db, batchId: string, expectedType?: BatchType): Promise<BatchSessionStudent[]> {
  const batch = expectedType || !ObjectId.isValid(batchId) ? null : await db.collection(getBatchesCollectionName()).findOne({ _id: new ObjectId(batchId) });
  const batchType = expectedType || getBatchType(batch?.batchType);
  const students = await db.collection(getStudentRegistrationCollectionName()).find({
    $and: [getActiveStudentFilter(), { classType: batchType, activeBatchId: batchId }]
  }).project({ studentId: 1, studentName: 1 }).sort({ studentName: 1, studentId: 1 }).toArray();

  return students.map((student) => ({
    studentId: String(student.studentId),
    studentName: String(student.studentName || "Student")
  }));
}
