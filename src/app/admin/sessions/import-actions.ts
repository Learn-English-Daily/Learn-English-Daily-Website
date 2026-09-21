"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { assertFullAdminAccess } from "@/lib/admin-permissions";
import { getBillingPeriodFromDate, isBillingPeriodClosed } from "@/lib/billing-periods";
import { getClassSessionsCollectionName, getScheduledAt, getSessionEndAt, type ClassSessionDocument } from "@/lib/class-sessions";
import { getMongoClient, getMongoDb } from "@/lib/mongodb";
import { getStudentNextMeetingNumbers } from "@/lib/meeting-sequence";
import { getActiveStudentFilter, getStudentRegistrationCollectionName, isClassMode } from "@/lib/student-registration";
import { getAvailableTeachers } from "@/lib/teachers";

type ImportRow = {
  rowNumber: number;
  studentId: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classMode: string;
  teacherUsernames: string[];
};

type ImportStudent = {
  _id: ObjectId;
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  meetingSequenceNextNumber?: number;
  meetingSequenceId?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function addOneHour(time: string) {
  const [hours = "0", minutes = "0"] = time.split(":");
  const date = new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes)));
  date.setUTCHours(date.getUTCHours() + 1);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export async function importPrivateClassSessions(formData: FormData) {
  await assertFullAdminAccess();
  const payload = clean(formData.get("rows"));
  if (!payload || payload.length > 250_000) return { success: false, message: "The import file is empty or too large." };

  let input: ImportRow[];
  try {
    input = JSON.parse(payload) as ImportRow[];
  } catch {
    return { success: false, message: "The import data could not be read. Upload the template again." };
  }
  if (!Array.isArray(input) || input.length < 1 || input.length > 300) {
    return { success: false, message: "Import between 1 and 300 private classes at a time." };
  }

  const rows = input.map((row, index) => ({
    rowNumber: Number(row.rowNumber) || index + 2,
    studentId: clean(row.studentId),
    sessionDate: clean(row.sessionDate),
    startTime: clean(row.startTime),
    endTime: clean(row.endTime),
    classMode: clean(row.classMode),
    teacherUsernames: Array.isArray(row.teacherUsernames)
      ? [...new Set(row.teacherUsernames.map(clean).filter(Boolean).map((value) => value.toLowerCase()))]
      : []
  }));
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const timePattern = /^\d{2}:\d{2}$/;
  const errors = rows.flatMap((row) => {
    const rowErrors: string[] = [];
    if (!row.studentId) rowErrors.push("student ID is required");
    if (!datePattern.test(row.sessionDate)) rowErrors.push("date must be YYYY-MM-DD");
    if (!timePattern.test(row.startTime) || !timePattern.test(row.endTime) || row.endTime <= row.startTime) rowErrors.push("time range is invalid");
    if (!isClassMode(row.classMode)) rowErrors.push("class mode must be Online or Offline");
    if (!row.teacherUsernames.length) rowErrors.push("at least one teacher username is required");
    return rowErrors.map((error) => `Row ${row.rowNumber}: ${error}.`);
  });
  if (errors.length) return { success: false, message: errors.slice(0, 12).join("\n") };

  const db = await getMongoDb();
  const studentIds = [...new Set(rows.map((row) => row.studentId))];
  const students = await db.collection<ImportStudent>(getStudentRegistrationCollectionName()).find({
    $and: [{ studentId: { $in: studentIds } }, getActiveStudentFilter(), { classType: { $ne: "Basic Group" } }]
  }).toArray();
  const studentsById = new Map(students.map((student) => [student.studentId || "", student]));
  const missingStudents = studentIds.filter((studentId) => !studentsById.has(studentId));
  if (missingStudents.length) return { success: false, message: `Active private student not found: ${missingStudents.join(", ")}.` };

  const teachers = await getAvailableTeachers(db);
  const teachersByUsername = new Map(teachers.filter((teacher) => teacher.username).map((teacher) => [teacher.username.toLowerCase(), teacher]));
  const requestedUsernames = [...new Set(rows.flatMap((row) => row.teacherUsernames))];
  const missingTeachers = requestedUsernames.filter((username) => !teachersByUsername.has(username));
  if (missingTeachers.length) return { success: false, message: `Active teacher username not found: ${missingTeachers.join(", ")}.` };

  const periods = [...new Map(rows.map((row) => {
    const period = getBillingPeriodFromDate(row.sessionDate);
    return [period.billingPeriod, period] as const;
  })).values()];
  for (const period of periods) {
    if (await isBillingPeriodClosed(db, period)) return { success: false, message: `${period.billingPeriod} is closed. Classes cannot be imported into a finalized month.` };
  }

  const existing = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).find({
    studentId: { $in: studentIds },
    sessionDate: { $in: [...new Set(rows.map((row) => row.sessionDate))] },
    status: { $ne: "Completed" }
  }).project({ studentId: 1, sessionDate: 1, startTime: 1, endTime: 1, sessionTime: 1, meetingNumber: 1 }).toArray();
  const conflicts: string[] = [];
  rows.forEach((row, index) => {
    const existingConflict = existing.find((session) => session.studentId === row.studentId && session.sessionDate === row.sessionDate && (session.startTime || session.sessionTime || "") < row.endTime && (session.endTime || addOneHour(session.startTime || session.sessionTime || "")) > row.startTime);
    if (existingConflict) conflicts.push(`Row ${row.rowNumber}: ${row.studentId} overlaps existing Meeting ${existingConflict.meetingNumber || "?"}.`);
    const uploadConflict = rows.slice(0, index).find((other) => other.studentId === row.studentId && other.sessionDate === row.sessionDate && other.startTime < row.endTime && other.endTime > row.startTime);
    if (uploadConflict) conflicts.push(`Row ${row.rowNumber}: overlaps row ${uploadConflict.rowNumber} for ${row.studentId}.`);
  });
  if (conflicts.length) return { success: false, message: conflicts.slice(0, 12).join("\n") };

  const databaseSession = (await getMongoClient()).startSession();
  try {
    await databaseSession.withTransaction(async () => {
      const transactionStudents = await db.collection<ImportStudent>(getStudentRegistrationCollectionName()).find(
        { studentId: { $in: studentIds } },
        { session: databaseSession }
      ).toArray();
      const transactionExisting = await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).find({
        studentId: { $in: studentIds },
        sessionDate: { $in: [...new Set(rows.map((row) => row.sessionDate))] },
        status: { $ne: "Completed" }
      }, { session: databaseSession }).project({ studentId: 1, sessionDate: 1, startTime: 1, endTime: 1, sessionTime: 1 }).toArray();
      const changedConflict = rows.find((row) => transactionExisting.some((session) => session.studentId === row.studentId && session.sessionDate === row.sessionDate && (session.startTime || session.sessionTime || "") < row.endTime && (session.endTime || addOneHour(session.startTime || session.sessionTime || "")) > row.startTime));
      if (changedConflict) throw new Error(`The schedule changed while importing. ${changedConflict.studentId} now has a conflicting class on ${changedConflict.sessionDate}.`);

      const configured = new Map(transactionStudents.filter((student) => (student.meetingSequenceNextNumber || 0) > 0).map((student) => [student.studentId || "", student.meetingSequenceNextNumber || 1]));
      const nextNumbers = await getStudentNextMeetingNumbers(db, studentIds, configured, databaseSession);
      const sequenceIds = new Map(transactionStudents.map((student) => [student.studentId || "", student.meetingSequenceId || randomUUID()]));
      const assignedNumbers = new Map<string, number>();
      const orderedRows = [...rows].sort((left, right) => left.studentId.localeCompare(right.studentId) || left.sessionDate.localeCompare(right.sessionDate) || left.startTime.localeCompare(right.startTime) || left.rowNumber - right.rowNumber);
      const now = new Date();
      const documents = orderedRows.map((row) => {
        const student = studentsById.get(row.studentId)!;
        const meetingNumber = assignedNumbers.get(row.studentId) || nextNumbers.get(row.studentId) || 1;
        assignedNumbers.set(row.studentId, meetingNumber + 1);
        const selectedTeachers = row.teacherUsernames.map((username) => teachersByUsername.get(username)!);
        const period = getBillingPeriodFromDate(row.sessionDate);
        return {
          studentId: row.studentId, studentName: student.studentName || "Student", courseJoined: student.courseJoined || "", classType: student.classType || "", classMode: row.classMode,
          meetingNumber, sessionDate: row.sessionDate, billingMonth: period.billingMonth, billingYear: period.billingYear, billingPeriod: period.billingPeriod,
          sessionTime: row.startTime, startTime: row.startTime, endTime: row.endTime, scheduledAt: getScheduledAt(row.sessionDate, row.startTime), endsAt: getSessionEndAt(row.sessionDate, row.endTime),
          teacherIds: selectedTeachers.map((teacher) => teacher.id), teacherNames: selectedTeachers.map((teacher) => teacher.name), meetingSequenceId: sequenceIds.get(row.studentId),
          status: "Scheduled" as const, createdAt: now, updatedAt: now
        };
      });
      await db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).insertMany(documents, { session: databaseSession });
      const studentCollection = db.collection(getStudentRegistrationCollectionName());
      for (const studentId of studentIds) {
        await studentCollection.updateOne({ studentId }, { $set: { meetingSequenceId: sequenceIds.get(studentId), meetingSequenceNextNumber: assignedNumbers.get(studentId), meetingSequenceUpdatedAt: now } }, { session: databaseSession });
      }
    });
  } finally {
    await databaseSession.endSession();
  }

  revalidatePath("/admin");
  revalidatePath("/admin/sessions");
  revalidatePath("/ceo");
  return { success: true, message: `${rows.length} private classes imported successfully.` };
}
