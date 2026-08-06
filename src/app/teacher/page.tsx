import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { WithId } from "mongodb";
import { CalendarCheck, CalendarClock, Gamepad2, LogOut, NotebookPen, Users } from "lucide-react";
import { generateTeacherGamesLink, logoutTeacher, saveTeacherAttendance } from "@/app/teacher/actions";
import { TeacherLoginForm } from "@/app/teacher/login-form";
import { GameSessionLink } from "@/app/admin/sessions/game-session-link";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentAttendanceCollectionName, attendanceStatuses, type AttendanceStatus } from "@/lib/attendance";
import { getRecordBillingPeriod } from "@/lib/billing-periods";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument,
  type ComputedClassSessionStatus
} from "@/lib/class-sessions";
import { getGameSessionUrl, getGameSessionsCollectionName, isGameSessionExpired, type GameSessionDocument } from "@/lib/game-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { classModeOptions } from "@/lib/student-registration";
import { getBatchesCollectionName } from "@/lib/assessments";
import {
  isValidTeacherSession,
  TEACHER_ID_COOKIE,
  TEACHER_SESSION_COOKIE
} from "@/lib/teacher-auth";
import { ensureDefaultTeachers, getTeachersCollectionName, type TeacherDocument } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teacher Portal | LEAD",
  robots: { index: false, follow: false }
};

type AttendanceDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  meetingNumber?: number;
  meetingDate?: string;
  billingMonth?: number;
  billingYear?: number;
  status?: AttendanceStatus;
  notes?: string;
  teacherIds?: string[];
  teacherNames?: string[];
  updatedAt?: Date;
};

type BatchDocument = {
  batchName?: string;
  program?: string;
  teacherId?: string;
  teacherName?: string;
  days?: string;
  time?: string;
  status?: "active" | "archived";
};

type TeacherSession = {
  id: string;
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  meetingNumber: number;
  sessionDate: string;
  scheduledAt: string;
  endsAt: string;
  status: ComputedClassSessionStatus;
  gameLink: { url: string; expiresAt: string } | null;
};

type TeacherAttendance = {
  id: string;
  studentName: string;
  studentId: string;
  meetingNumber: number;
  meetingDate: string;
  status: AttendanceStatus;
  notes: string;
  courseJoined: string;
  classType: string;
  classMode: string;
};

type TeacherBatch = {
  id: string;
  batchName: string;
  program: string;
  days: string;
  time: string;
};

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

function formatTimeRange(startValue: string, endValue: string) {
  if (!startValue && !endValue) return "Time not set";
  if (!endValue) return `${formatTime(startValue)} WIB`;
  return `${formatTime(startValue)} - ${formatTime(endValue)} WIB`;
}

function getTodayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function statusClassName(status: ComputedClassSessionStatus | AttendanceStatus) {
  if (status === "Completed" || status === "Present") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs Attendance" || status === "Absent") return "bg-rose-50 text-rose-700";
  if (status === "Late") return "bg-yellow-50 text-yellow-800";
  return "bg-blue-50 text-lead-blue";
}

async function getAuthenticatedTeacher() {
  const cookieStore = await cookies();
  const teacherId = cookieStore.get(TEACHER_ID_COOKIE)?.value || "";
  const session = cookieStore.get(TEACHER_SESSION_COOKIE)?.value || "";

  if (!isValidTeacherSession(teacherId, session)) {
    return null;
  }

  const db = await getMongoDb();
  await ensureDefaultTeachers(db);
  const teacher = await db.collection<TeacherDocument>(getTeachersCollectionName()).findOne({ _id: teacherId, active: true });
  return teacher ? { id: teacher._id, name: teacher.name } : null;
}

async function getTeacherPortalData(teacherId: string) {
  const db = await getMongoDb();
  const [sessionDocs, attendanceDocs, gameSessionDocs, batchDocs] = await Promise.all([
    db
      .collection<ClassSessionDocument>(getClassSessionsCollectionName())
      .find({ teacherIds: teacherId })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .limit(200)
      .toArray() as Promise<WithId<ClassSessionDocument>[]>,
    db
      .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
      .find({ teacherIds: teacherId })
      .sort({ meetingDate: -1, updatedAt: -1 })
      .limit(40)
      .toArray() as Promise<WithId<AttendanceDocument>[]>,
    db
      .collection<GameSessionDocument>(getGameSessionsCollectionName())
      .find({ gameType: "games-hub" })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray(),
    db
      .collection<BatchDocument>(getBatchesCollectionName())
      .find({ teacherId, status: { $ne: "archived" } })
      .sort({ startDate: -1 })
      .limit(50)
      .toArray() as Promise<WithId<BatchDocument>[]>
  ]);
  const attendanceKeys = new Set(
    attendanceDocs.map((doc) => {
      const period = getRecordBillingPeriod(doc);
      return `${doc.studentId || ""}:${doc.meetingNumber || 0}:${period.billingPeriod}`;
    })
  );
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

  const sessions: TeacherSession[] = sessionDocs.flatMap((doc) => {
    const studentId = doc.studentId || "";
    const meetingNumber = doc.meetingNumber || 0;
    const period = getRecordBillingPeriod(doc);
    const attendanceKey = `${studentId}:${meetingNumber}:${period.billingPeriod}`;

    if (doc.status === "Completed" || attendanceKeys.has(attendanceKey)) {
      return [];
    }

    return [{
      id: doc._id.toString(),
      studentId,
      studentName: doc.studentName || "Student",
      courseJoined: doc.courseJoined || "",
      classType: doc.classType || "",
      classMode: doc.classMode || "Online",
      meetingNumber,
      sessionDate: doc.sessionDate || "",
      scheduledAt: doc.scheduledAt || "",
      endsAt: doc.endsAt || "",
      status: getComputedClassSessionStatus({
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        endsAt: doc.endsAt,
        hasAttendance: attendanceKeys.has(attendanceKey)
      }),
      gameLink: gameSessionsByClassId.get(doc._id.toString()) || null
    }];
  });

  return {
    sessions,
    recentAttendance: attendanceDocs.map((doc) => ({
      id: doc._id.toString(),
      studentName: doc.studentName || "Student",
      studentId: doc.studentId || "",
      meetingNumber: doc.meetingNumber || 0,
      meetingDate: doc.meetingDate || "",
      status: doc.status || "Present",
      notes: doc.notes || "",
      courseJoined: doc.courseJoined || "",
      classType: doc.classType || "",
      classMode: doc.classMode || ""
    })),
    batches: batchDocs.map((doc) => ({
      id: doc._id.toString(),
      batchName: doc.batchName || "Batch",
      program: doc.program || "",
      days: doc.days || "",
      time: doc.time || ""
    }))
  };
}

export default async function TeacherPortalPage() {
  noStore();
  const teacher = await getAuthenticatedTeacher();

  if (!teacher) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Teacher</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Teacher portal</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to see your classes, mark attendance, write journal notes, and generate games links.</p>
          <TeacherLoginForm />
        </Card>
      </main>
    );
  }

  const data = await getTeacherPortalData(teacher.id);
  const today = getTodayJakarta();
  const todaysSessions = data.sessions.filter((session) => session.sessionDate === today);
  const missedSessions = data.sessions.filter((session) => session.sessionDate < today);
  const needsAttendance = todaysSessions.filter((session) => session.status === "Needs Attendance");

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)]">
        <div className="container-shell flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-lead-blue shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
              <NotebookPen className="h-4 w-4" />
              LEAD Teacher
            </p>
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-lead-navy sm:text-4xl">
              Welcome, {teacher.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-lead-gray">
              Your teaching command center: classes, attendance, journal notes, games links, and batch overview.
            </p>
          </div>
          <form action={logoutTeacher} className="lg:pt-2">
            <Button type="submit" variant="secondary">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </form>
        </div>
      </header>

      <section className="container-shell grid gap-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TeacherKpi icon={CalendarClock} label="Today" value={todaysSessions.length} detail="Classes scheduled today" />
          <TeacherKpi icon={CalendarCheck} label="Needs Attendance" value={needsAttendance.length} detail="Today's classes waiting" tone="rose" />
          <TeacherKpi icon={CalendarCheck} label="Missed" value={missedSessions.length} detail="Past unmarked classes" tone="rose" />
          <TeacherKpi icon={NotebookPen} label="Recent Records" value={data.recentAttendance.length} detail="Your latest attendance entries" tone="blue" />
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6 content-start">
            <TeacherSessionList
              title="Today's Class Queue"
              description="Only today's classes assigned to you appear here. Times are Indonesia WIB."
              badge={`${todaysSessions.length} today`}
              sessions={todaysSessions}
              emptyText="No classes assigned to you for today."
            />
            <TeacherSessionList
              title="Missed Attendance"
              description="Past assigned classes that still do not have attendance. Future scheduled classes stay hidden."
              badge={`${missedSessions.length} missed`}
              sessions={missedSessions}
              emptyText="No missed attendance. Nice and clean."
              urgent
            />
          </div>

          <div className="grid gap-6 content-start">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-lead-blue" />
                <h2 className="font-heading text-xl font-bold text-lead-navy">Assigned Batches</h2>
              </div>
              <div className="mt-4 grid gap-3">
                {data.batches.map((batch) => (
                  <div key={batch.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <p className="font-heading font-bold text-lead-navy">{batch.batchName}</p>
                    <p className="mt-1 text-sm text-lead-gray">{batch.program}</p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-lead-gray">{batch.days} / {batch.time}</p>
                  </div>
                ))}
                {!data.batches.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No active batches assigned yet.</p> : null}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <NotebookPen className="h-5 w-5 text-lead-blue" />
                <h2 className="font-heading text-xl font-bold text-lead-navy">Recent Teaching Records</h2>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {data.recentAttendance.slice(0, 12).map((record) => (
                  <div key={record.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-bold text-lead-navy">{record.studentName}</p>
                      <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${statusClassName(record.status)}`}>{record.status}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-lead-gray">
                      Meeting {record.meetingNumber} / {formatDate(record.meetingDate)} / {record.courseJoined} / {record.classMode || "Mode not set"}
                    </p>
                    {record.notes ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-lead-gray">{record.notes}</p> : null}
                  </div>
                ))}
                {!data.recentAttendance.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No attendance records yet.</p> : null}
              </div>
            </Card>
          </div>
        </section>
      </section>
    </main>
  );
}

function TeacherKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone = "navy"
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
  detail: string;
  tone?: "navy" | "rose" | "blue";
}) {
  const toneClassName =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "blue"
        ? "bg-blue-50 text-lead-blue"
        : "bg-slate-100 text-lead-navy";

  return (
    <Card className="p-5">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${toneClassName}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">{value}</p>
      <p className="mt-1 text-sm font-semibold text-lead-gray">{detail}</p>
    </Card>
  );
}

function TeacherSessionList({
  title,
  description,
  badge,
  sessions,
  emptyText,
  urgent = false
}: {
  title: string;
  description: string;
  badge: string;
  sessions: TeacherSession[];
  emptyText: string;
  urgent?: boolean;
}) {
  return (
    <Card className={`p-5 ${urgent && sessions.length ? "border-rose-200" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-lead-navy">{title}</h2>
          <p className="mt-1 text-sm text-lead-gray">{description}</p>
        </div>
        <span className={`w-fit rounded-lg px-3 py-2 text-sm font-bold ${urgent && sessions.length ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-lead-blue"}`}>
          {badge}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        {sessions.map((session) => (
          <TeacherSessionCard key={session.id} session={session} />
        ))}
        {!sessions.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">{emptyText}</p> : null}
      </div>
    </Card>
  );
}

function TeacherSessionCard({ session }: { session: TeacherSession }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-lg font-bold text-lead-navy">{session.studentName}</h3>
        <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{session.studentId}</span>
        <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(session.status)}`}>{session.status}</span>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">{session.classMode}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-lead-gray">
        Meeting {session.meetingNumber} / {formatDate(session.scheduledAt)} / {formatTimeRange(session.scheduledAt, session.endsAt)}
      </p>
      <p className="mt-1 text-sm text-lead-gray">{session.courseJoined} / {session.classType || "Class type not set"}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ActionFeedbackForm action={saveTeacherAttendance} successMessage="Attendance saved. This class will leave your queue." className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <input type="hidden" name="classSessionId" value={session.id} />
          <label className="grid gap-2 text-sm font-bold text-lead-navy">
            Attendance
            <select name="status" defaultValue="Present" className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
              {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-lead-navy">
            Class Mode
            <select name="classMode" defaultValue={session.classMode} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
              {classModeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-lead-navy sm:col-span-2">
            Journal Notes
            <textarea name="notes" rows={4} placeholder="Write what was covered, student progress, homework, or parent update." className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
          </label>
          <Button type="submit" className="sm:col-span-2">
            <CalendarCheck className="h-4 w-4" />
            Save Attendance
          </Button>
        </ActionFeedbackForm>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-lead-navy">Class games</p>
              <p className="mt-1 text-xs text-lead-gray">Private games hub link for this class.</p>
            </div>
            <ActionFeedbackForm action={generateTeacherGamesLink} successMessage="Games link generated." className="grid gap-2">
              <input type="hidden" name="classSessionId" value={session.id} />
              <Button type="submit" size="sm" variant="secondary">
                <Gamepad2 className="h-4 w-4" />
                {session.gameLink ? "Regenerate" : "Generate"}
              </Button>
            </ActionFeedbackForm>
          </div>
          {session.gameLink ? <div className="mt-3"><GameSessionLink url={session.gameLink.url} expiresAt={session.gameLink.expiresAt} /></div> : null}
        </div>
      </div>
    </div>
  );
}
