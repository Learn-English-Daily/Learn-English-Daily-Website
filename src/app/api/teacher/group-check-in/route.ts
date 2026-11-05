import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getBatchAttendanceRoster } from "@/lib/batch-attendance-roster";
import { getBatchClassSessionsCollectionName, type BatchClassSessionDocument, type BatchSelfCheckIn } from "@/lib/batch-class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { isValidTeacherSession, TEACHER_ID_COOKIE, TEACHER_SESSION_COOKIE } from "@/lib/teacher-auth";
import { getEmployeeTeacherById } from "@/lib/teachers";

function jakartaDateKey() {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());
}

function parentTokenFromQr(raw: unknown) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return "";
  try {
    const url = new URL(value);
    const match = /^\/parent\/([^/]+)\/?$/.exec(url.pathname);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : "";
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const teacherId = cookieStore.get(TEACHER_ID_COOKIE)?.value || "";
  const teacherSession = cookieStore.get(TEACHER_SESSION_COOKIE)?.value || "";
  const db = await getMongoDb();
  const teacher = await getEmployeeTeacherById(db, teacherId);
  if (!teacher?.username || !isValidTeacherSession(teacher.id, teacher.username, teacherSession)) {
    return NextResponse.json({ error: "Teacher sign-in expired. Please sign in again." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { sessionId?: unknown; qrValue?: unknown } | null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
  const token = parentTokenFromQr(body?.qrValue);
  if (!ObjectId.isValid(sessionId) || !token) return NextResponse.json({ error: "This is not a valid LEAD student QR code." }, { status: 400 });

  const sessions = db.collection<BatchClassSessionDocument>(getBatchClassSessionsCollectionName());
  const session = await sessions.findOne({ _id: new ObjectId(sessionId), teacherId: teacher.id, status: "Scheduled" });
  if (!session) return NextResponse.json({ error: "This group class is no longer open for check-in." }, { status: 404 });
  if (session.sessionDate !== jakartaDateKey()) return NextResponse.json({ error: "QR check-in is available only on the scheduled class date (WIB)." }, { status: 400 });

  const student = await db.collection<{ studentId?: string; studentName?: string }>(getStudentRegistrationCollectionName()).findOne(
    { parentAccessToken: token },
    { projection: { studentId: 1, studentName: 1 } }
  );
  if (!student?.studentId) return NextResponse.json({ error: "Student QR code was not found." }, { status: 404 });

  const roster = await getBatchAttendanceRoster(db, session.batchId, session.batchType);
  const rosterStudent = roster.find((entry) => entry.studentId === student.studentId);
  if (!rosterStudent) return NextResponse.json({ error: `${student.studentName || "This student"} is not an active member of ${session.batchName}.` }, { status: 400 });

  const existing = session.selfCheckIns?.find((entry) => entry.studentId === rosterStudent.studentId);
  if (existing) return NextResponse.json({ duplicate: true, student: { ...rosterStudent, checkedInAt: existing.checkedInAt } });

  const checkIn: BatchSelfCheckIn = { ...rosterStudent, checkedInAt: new Date(), source: "parent-qr" };
  const result = await sessions.updateOne(
    { _id: session._id, teacherId: teacher.id, status: "Scheduled", "selfCheckIns.studentId": { $ne: rosterStudent.studentId } },
    { $push: { selfCheckIns: checkIn }, $set: { updatedAt: new Date() } }
  );
  if (!result.modifiedCount) return NextResponse.json({ duplicate: true, student: checkIn });
  return NextResponse.json({ success: true, student: checkIn });
}
