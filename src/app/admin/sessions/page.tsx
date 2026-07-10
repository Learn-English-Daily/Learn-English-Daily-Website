import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { CalendarClock, CalendarCheck, Gamepad2, Pencil, Trash2 } from "lucide-react";
import type { WithId } from "mongodb";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import {
  createClassSession,
  deleteClassSession,
  generateGamesLink,
  updateClassSession
} from "@/app/admin/sessions/actions";
import { GameSessionLink } from "@/app/admin/sessions/game-session-link";
import { GchatSessionMessage } from "@/app/admin/sessions/gchat-session-message";
import { TemporaryMeetLink } from "@/app/admin/sessions/temporary-meet-link";
import { AdminLoginForm } from "@/app/admin/login-form";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument,
  type ComputedClassSessionStatus
} from "@/lib/class-sessions";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import {
  getGameSessionUrl,
  getGameSessionsCollectionName,
  isGameSessionExpired,
  type GameSessionDocument
} from "@/lib/game-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import {
  ensureDefaultTeachers,
  getTeachersCollectionName,
  type TeacherDocument
} from "@/lib/teachers";

export const dynamic = "force-dynamic";

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  parentName?: string;
  courseJoined?: string;
  classType?: string;
};

type Student = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  courseJoined: string;
  classType: string;
};

type Teacher = {
  id: string;
  name: string;
};

type AttendanceDocument = {
  studentId?: string;
  meetingNumber?: number;
};

type ClassSession = {
  id: string;
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  meetingNumber: number;
  sessionDate: string;
  sessionTime: string;
  startTime: string;
  endTime: string;
  scheduledAt: string;
  endsAt: string;
  teacherIds: string[];
  teacherNames: string[];
  status: ComputedClassSessionStatus;
  gameLink: GameLink | null;
};

type GameLink = {
  url: string;
  expiresAt: string;
};

async function getStudents(): Promise<Student[]> {
  const db = await getMongoDb();
  const docs = (await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .find(getActiveStudentFilter())
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()) as WithId<StudentDocument>[];

  return docs.map((doc) => ({
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || ""
  }));
}

async function getTeachers(): Promise<Teacher[]> {
  const db = await getMongoDb();
  await ensureDefaultTeachers(db);
  const teachers = await db
    .collection<TeacherDocument>(getTeachersCollectionName())
    .find({ active: true })
    .sort({ name: 1 })
    .toArray();

  return teachers.map((teacher) => ({ id: teacher._id, name: teacher.name }));
}

async function getSessions(): Promise<ClassSession[]> {
  const db = await getMongoDb();
  const [sessionDocs, attendanceDocs, gameSessionDocs] = await Promise.all([
    db
      .collection<ClassSessionDocument>(getClassSessionsCollectionName())
      .find({})
      .sort({ scheduledAt: -1, createdAt: -1 })
      .limit(100)
      .toArray() as Promise<WithId<ClassSessionDocument>[]>,
    db
      .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
      .find({})
      .project({ studentId: 1, meetingNumber: 1 })
      .limit(20000)
      .toArray(),
    db
      .collection<GameSessionDocument>(getGameSessionsCollectionName())
      .find({ gameType: "games-hub" })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray()
  ]);
  const attendanceKeys = new Set(attendanceDocs.map((doc) => `${doc.studentId || ""}:${doc.meetingNumber || 0}`));
  const gameSessionsByClassId = new Map(
    gameSessionDocs
      .filter((doc) => doc.classSessionId && doc.token && !isGameSessionExpired(doc.expiresAt))
      .map((doc) => [
        doc.classSessionId || "",
        {
          url: getGameSessionUrl(doc.token || ""),
          expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : ""
        }
      ])
  );

  return sessionDocs.map((doc) => {
    const studentId = doc.studentId || "";
    const meetingNumber = doc.meetingNumber || 0;
    const classSessionId = doc._id.toString();

    return {
      id: classSessionId,
      studentId,
      studentName: doc.studentName || "Unknown",
      courseJoined: doc.courseJoined || "",
      classType: doc.classType || "",
      meetingNumber,
      sessionDate: doc.sessionDate || "",
      sessionTime: doc.startTime || doc.sessionTime || "",
      startTime: doc.startTime || doc.sessionTime || "",
      endTime: doc.endTime || "",
      scheduledAt: doc.scheduledAt || "",
      endsAt: doc.endsAt || "",
      teacherIds: doc.teacherIds || [],
      teacherNames: doc.teacherNames || [],
      status: getComputedClassSessionStatus({
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        endsAt: doc.endsAt,
        hasAttendance: attendanceKeys.has(`${studentId}:${meetingNumber}`)
      }),
      gameLink: gameSessionsByClassId.get(classSessionId) || null
    };
  });
}

function formatTimeRange(startValue: string, endValue: string) {
  if (!startValue && !endValue) return "Time not set";
  if (!endValue) return formatTime(startValue);
  return `${formatTime(startValue)} - ${formatTime(endValue)}`;
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function formatTime(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

function statusClassName(status: ComputedClassSessionStatus) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs Attendance") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-lead-blue";
}

function attendanceHref(session: ClassSession) {
  const params = new URLSearchParams({
    studentId: session.studentId,
    meetingNumber: String(session.meetingNumber),
    meetingDate: session.sessionDate
  });

  for (const teacherId of session.teacherIds) {
    params.append("teacherIds", teacherId);
  }

  return `/admin/attendance?${params.toString()}`;
}

function expiresAt(endsAt: string, scheduledAt: string) {
  const date = endsAt ? new Date(endsAt) : scheduledAt ? new Date(scheduledAt) : new Date();
  date.setHours(date.getHours() + 3);
  return date.toISOString();
}

function ClassGamePanel({ classSessionId, link }: { classSessionId: string; link: GameLink | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-lead-navy">Class games link</p>
          <p className="mt-1 text-xs text-lead-gray">One private link with all available games. It expires 1.5 hours after generation.</p>
        </div>
        <ActionFeedbackForm action={generateGamesLink} successMessage="Games link generated." className="grid gap-2">
          <input type="hidden" name="classSessionId" value={classSessionId} />
          <Button type="submit" size="sm" variant="secondary">
            <Gamepad2 className="h-4 w-4" />
            {link ? "Regenerate Games Link" : "Generate Games Link"}
          </Button>
        </ActionFeedbackForm>
      </div>
      {link ? (
        <div className="mt-3">
          <GameSessionLink url={link.url} expiresAt={link.expiresAt} />
        </div>
      ) : null}
    </div>
  );
}

export default async function AdminSessionsPage() {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAdminConfigured()) {
    return (
      <main className="min-h-screen bg-lead-soft px-4 py-10">
        <Card className="mx-auto max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Admin password missing</h1>
          <p className="mt-4 leading-7 text-lead-gray">
            Add <code className="rounded bg-slate-100 px-2 py-1">ADMIN_PASSWORD</code> in Vercel Environment Variables and in
            your local <code className="rounded bg-slate-100 px-2 py-1">.env.local</code> file.
          </p>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Class sessions</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to schedule classes and track missing attendance.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const [students, teachers, sessions] = await Promise.all([getStudents(), getTeachers(), getSessions()]);
  const needsAttendance = sessions.filter((session) => session.status === "Needs Attendance");
  const today = new Date().toISOString().slice(0, 10);
  const todaysSessions = sessions.filter((session) => session.sessionDate === today);

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="sessions"
        title="Class sessions"
        description="Schedule classes first, then close them by marking attendance."
        logoutAction={logoutAdmin}
      />

      <section className="container-shell grid gap-6 py-8 2xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-6 content-start">
          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Schedule class</h2>
            <p className="mt-2 text-sm leading-6 text-lead-gray">
              This creates a reminder record. The Google Meet link is handled only on session cards, not saved in the database.
            </p>
            <ActionFeedbackForm action={createClassSession} successMessage="Class session saved successfully." className="mt-5 grid gap-4">
              <Field label="Student">
                <select name="studentId" required className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                  <option value="">Select student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.studentId}>
                      {student.studentName} ({student.studentId}) - {student.courseJoined}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Meeting Number">
                  <input name="meetingNumber" type="number" min="1" required className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy" />
                </Field>
                <Field label="Class Date">
                  <input name="sessionDate" type="date" required defaultValue={getTomorrowDate()} className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy" />
                </Field>
                <Field label="From Time">
                  <input name="startTime" type="time" required className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy" />
                </Field>
                <Field label="To Time">
                  <input name="endTime" type="time" required className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-lead-navy" />
                </Field>
              </div>
              <TeacherSelector teachers={teachers} />
              <Button type="submit" size="lg" className="w-full sm:w-fit">
                <CalendarClock className="h-4 w-4" />
                Save Class Session
              </Button>
            </ActionFeedbackForm>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
            <SummaryCard label="Needs attendance" value={needsAttendance.length} tone="text-rose-600" />
            <SummaryCard label="Today scheduled" value={todaysSessions.length} tone="text-lead-blue" />
          </div>
        </div>

        <Card className="p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-lead-navy">Session queue</h2>
              <p className="mt-2 text-sm text-lead-gray">Latest scheduled classes first. Past sessions without attendance are highlighted.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg font-bold text-lead-navy">{session.studentName}</h3>
                      <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{session.studentId}</span>
                      <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(session.status)}`}>{session.status}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-lead-gray">
                      Meeting {session.meetingNumber} / {formatDate(session.scheduledAt)} / {formatTimeRange(session.scheduledAt, session.endsAt)}
                    </p>
                    <p className="mt-1 text-sm text-lead-gray">{session.courseJoined} / {session.classType || "Class type not set"}</p>
                    <p className="mt-1 text-sm text-lead-gray">
                      <span className="font-bold text-lead-navy">Teachers:</span> {session.teacherNames.length ? session.teacherNames.join(", ") : "Not assigned"}
                    </p>
                    <div className="mt-4">
                      <GchatSessionMessage
                        studentName={session.studentName}
                        meetingNumber={session.meetingNumber}
                        meetingDate={formatDate(session.scheduledAt)}
                        meetingTime={formatTimeRange(session.scheduledAt, session.endsAt)}
                        teachers={session.teacherNames}
                      />
                    </div>
                    <div className="mt-4">
                      <ClassGamePanel classSessionId={session.id} link={session.gameLink} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant={session.status === "Completed" ? "secondary" : "primary"}>
                        <a href={attendanceHref(session)}>
                          <CalendarCheck className="h-4 w-4" />
                          {session.status === "Completed" ? "View Attendance" : "Mark Attendance"}
                        </a>
                      </Button>
                      <ActionFeedbackForm action={deleteClassSession} successMessage="Session removed." className="contents">
                        <input type="hidden" name="id" value={session.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </ActionFeedbackForm>
                    </div>
                    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-lead-blue [&::-webkit-details-marker]:hidden">
                        <Pencil className="h-4 w-4" />
                        Edit class session
                      </summary>
                      <ActionFeedbackForm action={updateClassSession} successMessage="Class session updated successfully." className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
                        <input type="hidden" name="id" value={session.id} />
                        <Field label="Meeting Number">
                          <input name="meetingNumber" type="number" min="1" required defaultValue={session.meetingNumber} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
                        </Field>
                        <Field label="Class Date">
                          <input name="sessionDate" type="date" required defaultValue={session.sessionDate} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
                        </Field>
                        <Field label="From Time">
                          <input name="startTime" type="time" required defaultValue={session.startTime} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
                        </Field>
                        <Field label="To Time">
                          <input name="endTime" type="time" required defaultValue={session.endTime} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
                        </Field>
                        <TeacherSelector teachers={teachers} selectedTeacherIds={session.teacherIds} compact />
                        <Button type="submit" size="sm" className="sm:col-span-2">Update Class Session</Button>
                      </ActionFeedbackForm>
                    </details>
                  </div>
                  <TemporaryMeetLink sessionId={session.id} expiresAt={expiresAt(session.endsAt, session.scheduledAt)} />
                </div>
              </div>
            ))}
            {!sessions.length ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">
                No class sessions yet. Schedule the next class to start tracking attendance reminders.
              </p>
            ) : null}
          </div>
        </Card>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold text-lead-navy">
      {label}
      {children}
    </label>
  );
}

function TeacherSelector({
  teachers,
  selectedTeacherIds = [],
  compact = false
}: {
  teachers: Teacher[];
  selectedTeacherIds?: string[];
  compact?: boolean;
}) {
  return (
    <fieldset className={`rounded-lg border border-slate-200 bg-white ${compact ? "p-3 sm:col-span-2" : "p-4"}`}>
      <legend className="px-1 text-sm font-semibold text-lead-navy">Teachers <span className="text-lead-blue">*</span></legend>
      <p className="mb-3 text-xs text-lead-gray">Select one or more teachers for this class.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {teachers.map((teacher) => (
          <label key={teacher.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-lead-navy">
            <input type="checkbox" name="teacherIds" value={teacher.id} defaultChecked={selectedTeacherIds.includes(teacher.id)} className="h-4 w-4 accent-lead-blue" />
            {teacher.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className={`mt-2 font-heading text-4xl font-extrabold ${tone}`}>{value}</p>
    </Card>
  );
}
