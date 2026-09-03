import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { CalendarClock, Gamepad2, Pencil, Search, Trash2, UserRound, Users } from "lucide-react";
import type { WithId } from "mongodb";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { cancelBatchClass, deleteBatchClass } from "@/app/admin/batches/actions";
import { BatchScheduleForm } from "@/app/admin/batches/batch-schedule-form";
import {
  deleteClassSession,
  generateGamesLink,
  rescheduleClassSession,
  updateClassSession
} from "@/app/admin/sessions/actions";
import { GameSessionLink } from "@/app/admin/sessions/game-session-link";
import { GchatSessionMessage } from "@/app/admin/sessions/gchat-session-message";
import { TemporaryMeetLink } from "@/app/admin/sessions/temporary-meet-link";
import { PrivateSessionForm } from "@/app/admin/sessions/private-session-form";
import { AdminLoginForm } from "@/app/admin/login-form";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import { getRecordBillingPeriod } from "@/lib/billing-periods";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument,
  type ComputedClassSessionStatus
} from "@/lib/class-sessions";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import { getBatchesCollectionName } from "@/lib/assessments";
import { getBatchClassSessionsCollectionName, type BatchClassSessionDocument } from "@/lib/batch-class-sessions";
import {
  getGameSessionUrl,
  getGameSessionsCollectionName,
  isGameSessionExpired,
  type GameSessionDocument
} from "@/lib/game-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentNextMeetingNumbers } from "@/lib/meeting-sequence";
import { classModeOptions, getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import {
  getAvailableTeachers,
  type TeacherOption
} from "@/lib/teachers";

export const dynamic = "force-dynamic";

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  parentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  meetingSequenceNextNumber?: number;
};

type Student = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  nextMeetingNumber: number;
};

type Teacher = TeacherOption;

type AttendanceDocument = {
  studentId?: string;
  meetingNumber?: number;
  meetingDate?: string;
  billingMonth?: number;
  billingYear?: number;
};

type ClassSession = {
  id: string;
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  classMode: string;
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
  rescheduled: boolean;
  rescheduleCount: number;
  rescheduledFromDate: string;
  rescheduledFromStartTime: string;
  rescheduledFromEndTime: string;
  gameLink: GameLink | null;
};

type GameLink = {
  url: string;
  expiresAt: string;
};

type SchedulingBatch = {
  id: string;
  batchName: string;
  program: string;
  teacherName: string;
  days: string;
  time: string;
};

type GroupClassSession = {
  id: string;
  batchId: string;
  batchName: string;
  meetingNumber: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topic: string;
  teacherName: string;
  studentCount: number;
  status: string;
  attendanceMarked: boolean;
};

async function getStudents(): Promise<Student[]> {
  const db = await getMongoDb();
  const docs = (await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .find({ $and: [getActiveStudentFilter(), { classType: { $ne: "Basic Group" } }] })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray()) as WithId<StudentDocument>[];

  const configuredNextNumbers = new Map(
    docs
      .filter((doc) => doc.studentId && doc.meetingSequenceNextNumber && doc.meetingSequenceNextNumber > 0)
      .map((doc) => [doc.studentId || "", doc.meetingSequenceNextNumber || 1])
  );
  const nextMeetingNumbers = await getStudentNextMeetingNumbers(db, docs.map((doc) => doc.studentId || ""), configuredNextNumbers);

  return docs.map((doc) => ({
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "Online",
    nextMeetingNumber: nextMeetingNumbers.get(doc.studentId || "") || 1
  }));
}

async function getGroupSchedulingData() {
  const db = await getMongoDb();
  const [batchDocs, sessionDocs] = await Promise.all([
    db.collection(getBatchesCollectionName()).find({ status: "active" }).sort({ batchName: 1 }).limit(100).toArray(),
    db.collection<BatchClassSessionDocument>(getBatchClassSessionsCollectionName()).find({ status: { $ne: "Cancelled" } }).sort({ sessionDate: -1, meetingNumber: -1 }).limit(500).toArray()
  ]);

  return {
    batches: batchDocs.map((batch): SchedulingBatch => ({
      id: batch._id.toString(),
      batchName: String(batch.batchName || "Untitled batch"),
      program: String(batch.program || ""),
      teacherName: String(batch.teacherName || "Not assigned"),
      days: String(batch.days || ""),
      time: String(batch.time || "")
    })),
    sessions: sessionDocs.map((session): GroupClassSession => ({
      id: session._id.toString(),
      batchId: session.batchId,
      batchName: session.batchName,
      meetingNumber: session.meetingNumber,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      topic: session.topic || "",
      teacherName: session.teacherName || "Not assigned",
      studentCount: session.studentSnapshot?.length || 0,
      status: session.status,
      attendanceMarked: Boolean(session.attendanceMarked)
    }))
  };
}

async function getTeachers(): Promise<Teacher[]> {
  const db = await getMongoDb();
  return getAvailableTeachers(db);
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
      .project({ studentId: 1, meetingNumber: 1, meetingDate: 1, billingMonth: 1, billingYear: 1 })
      .limit(20000)
      .toArray(),
    db
      .collection<GameSessionDocument>(getGameSessionsCollectionName())
      .find({ gameType: "games-hub" })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray()
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

  return sessionDocs.flatMap((doc) => {
    const studentId = doc.studentId || "";
    const meetingNumber = doc.meetingNumber || 0;
    const classSessionId = doc._id.toString();
    const period = getRecordBillingPeriod(doc);
    const attendanceKey = `${studentId}:${meetingNumber}:${period.billingPeriod}`;

    if (doc.status === "Completed" || attendanceKeys.has(attendanceKey)) {
      return [];
    }

    return [{
      id: classSessionId,
      studentId,
      studentName: doc.studentName || "Unknown",
      courseJoined: doc.courseJoined || "",
      classType: doc.classType || "",
      classMode: doc.classMode || "Online",
      meetingNumber,
      sessionDate: doc.sessionDate || "",
      sessionTime: doc.startTime || doc.sessionTime || "",
      startTime: doc.startTime || doc.sessionTime || "",
      endTime: doc.endTime || "",
      scheduledAt: doc.scheduledAt || "",
      endsAt: doc.endsAt || "",
      teacherIds: doc.teacherIds || [],
      teacherNames: doc.teacherNames || [],
      rescheduled: Boolean(doc.rescheduledAt || doc.rescheduleCount),
      rescheduleCount: doc.rescheduleCount || 0,
      rescheduledFromDate: doc.rescheduledFromDate || "",
      rescheduledFromStartTime: doc.rescheduledFromStartTime || "",
      rescheduledFromEndTime: doc.rescheduledFromEndTime || "",
      status: getComputedClassSessionStatus({
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        endsAt: doc.endsAt,
        hasAttendance: attendanceKeys.has(attendanceKey)
      }),
      gameLink: gameSessionsByClassId.get(classSessionId) || null
    }];
  });
}

function formatTimeRange(startValue: string, endValue: string) {
  if (!startValue && !endValue) return "Time not set";
  if (!endValue) return `${formatTime(startValue)} WIB`;
  return `${formatTime(startValue)} - ${formatTime(endValue)} WIB`;
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

function getIndonesiaDateInput(daysFromToday = 0) {
  const jakartaDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  jakartaDate.setDate(jakartaDate.getDate() + daysFromToday);
  return [
    jakartaDate.getFullYear(),
    String(jakartaDate.getMonth() + 1).padStart(2, "0"),
    String(jakartaDate.getDate()).padStart(2, "0")
  ].join("-");
}

function statusClassName(status: ComputedClassSessionStatus) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs Attendance") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-lead-blue";
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

export default async function AdminSessionsPage({ searchParams }: { searchParams?: Promise<{ type?: string | string[]; batchId?: string | string[]; q?: string | string[] }> }) {
  noStore();
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const isAuthenticated = isValidAdminSession(session);

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

  const resolvedSearchParams = await searchParams;
  const requestedType = Array.isArray(resolvedSearchParams?.type) ? resolvedSearchParams?.type[0] : resolvedSearchParams?.type;
  const requestedBatchId = Array.isArray(resolvedSearchParams?.batchId) ? resolvedSearchParams?.batchId[0] : resolvedSearchParams?.batchId;
  const sessionSearch = (Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams?.q[0] : resolvedSearchParams?.q || "").trim();
  const groupOnly = isGroupStudentAdminSession(session);
  const schedulingType = groupOnly || requestedType === "group" ? "group" : "private";
  const admin = await getAuthenticatedAdmin();
  const [students, teachers, sessions] = schedulingType === "private"
    ? await Promise.all([getStudents(), getTeachers(), getSessions()])
    : [[], [], []] as [Student[], Teacher[], ClassSession[]];
  const groupData = schedulingType === "group" ? await getGroupSchedulingData() : { batches: [], sessions: [] };
  const selectedBatchId = groupData.batches.some((batch) => batch.id === requestedBatchId) ? requestedBatchId || "" : groupData.batches[0]?.id || "";
  const selectedBatch = groupData.batches.find((batch) => batch.id === selectedBatchId);
  const selectedBatchSessions = groupData.sessions.filter((groupSession) => groupSession.batchId === selectedBatchId);
  const needsAttendance = sessions.filter((session) => session.status === "Needs Attendance");
  const today = getIndonesiaDateInput();
  const todaysSessions = sessions.filter((session) => session.sessionDate === today);
  const normalizedSessionSearch = sessionSearch.toLocaleLowerCase();
  const filteredSessions = normalizedSessionSearch
    ? sessions.filter((classSession) => classSession.studentName.toLocaleLowerCase().includes(normalizedSessionSearch) || classSession.studentId.toLocaleLowerCase().includes(normalizedSessionSearch))
    : sessions;

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="sessions"
        title="Class sessions"
        description="Schedule classes first, then close them by marking attendance."
        userName={admin?.name}
        username={admin?.username}
        logoutAction={logoutAdmin}
      />

      <section className="container-shell pt-8">
        <Card className="p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {!groupOnly ? (
              <a href="/admin/sessions?type=private" className={`focus-ring flex items-center gap-4 rounded-xl border p-4 transition ${schedulingType === "private" ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-lead-blue shadow-sm"><UserRound className="h-5 w-5" /></div>
                <div><p className="font-heading text-lg font-extrabold text-lead-navy">Private 1-to-1 Classes</p><p className="mt-1 text-sm text-lead-gray">Schedule one individual student at a time.</p></div>
              </a>
            ) : null}
            <a href="/admin/sessions?type=group" className={`focus-ring flex items-center gap-4 rounded-xl border p-4 transition ${schedulingType === "group" ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-lead-blue shadow-sm"><Users className="h-5 w-5" /></div>
              <div><p className="font-heading text-lg font-extrabold text-lead-navy">Group Batch Classes</p><p className="mt-1 text-sm text-lead-gray">Schedule one batch roster for 1 or 12 meetings.</p></div>
            </a>
          </div>
        </Card>
      </section>

      {schedulingType === "private" ? (
      <section className="container-shell grid gap-6 py-6 2xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-6 content-start">
          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Schedule class</h2>
            <p className="mt-2 text-sm leading-6 text-lead-gray">
              This creates a reminder record using Indonesia time (WIB / UTC+7). The Google Meet link is handled only on session cards, not saved in the database.
            </p>
            <div className="mt-5">
              <PrivateSessionForm students={students} teachers={teachers} defaultDate={getIndonesiaDateInput(1)} />
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
            <SummaryCard label="Needs attendance" value={needsAttendance.length} tone="text-rose-600" />
            <SummaryCard label="Today scheduled" value={todaysSessions.length} tone="text-lead-blue" />
          </div>
        </div>

        <Card className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-lead-navy">Session queue</h2>
              <p className="mt-2 text-sm text-lead-gray">Latest scheduled classes first. Times are Indonesia WIB. Sessions disappear after attendance is marked.</p>
            </div>
            <span className="w-fit shrink-0 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-lead-blue">{filteredSessions.length} class{filteredSessions.length === 1 ? "" : "es"}</span>
          </div>

          <form action="/admin/sessions" className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <input type="hidden" name="type" value="private" />
            <label className="text-sm font-bold text-lead-navy" htmlFor="session-student-search">Find a student&apos;s scheduled classes</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lead-gray" />
                <input id="session-student-search" name="q" defaultValue={sessionSearch} placeholder="Search student name or ID, e.g. STU002" className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-lead-navy" />
              </div>
              <Button type="submit"><Search className="h-4 w-4" /> Search</Button>
              {sessionSearch ? <Button asChild type="button" variant="secondary"><a href="/admin/sessions?type=private">Clear</a></Button> : null}
            </div>
            {sessionSearch ? <p className="mt-2 text-xs font-semibold text-lead-gray">Showing scheduled classes matching “{sessionSearch}”.</p> : null}
          </form>

          <div className="mt-5 grid gap-4">
            {filteredSessions.map((session) => {
              return (
                <div key={session.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-lg font-bold text-lead-navy">{session.studentName}</h3>
                        <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{session.studentId}</span>
                        <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(session.status)}`}>{session.status}</span>
                        {session.rescheduled ? (
                          <span className="rounded-lg bg-violet-50 px-3 py-1 text-xs font-bold uppercase text-violet-700">Rescheduled</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-lead-gray">
                        Meeting {session.meetingNumber} / {formatDate(session.scheduledAt)} / {formatTimeRange(session.scheduledAt, session.endsAt)}
                      </p>
                      <p className="mt-1 text-sm text-lead-gray">{session.courseJoined} / {session.classType || "Class type not set"} / {session.classMode}</p>
                      <p className="mt-1 text-sm text-lead-gray">
                        <span className="font-bold text-lead-navy">Teachers:</span> {session.teacherNames.length ? session.teacherNames.join(", ") : "Not assigned"}
                      </p>
                      {session.rescheduled ? (
                        <p className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                          Moved from {formatDate(session.rescheduledFromDate)} / {session.rescheduledFromStartTime || "Time not set"}{session.rescheduledFromEndTime ? ` - ${session.rescheduledFromEndTime}` : ""} WIB
                          {session.rescheduleCount > 1 ? ` / Rescheduled ${session.rescheduleCount} times` : ""}
                        </p>
                      ) : null}
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
                        {session.status === "Needs Attendance" ? (
                          <span className="inline-flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
                            <CalendarClock className="h-4 w-4" />
                            Waiting for teacher attendance
                          </span>
                        ) : session.sessionDate <= today ? (
                          <span className="inline-flex items-center gap-2 rounded-lg border border-yellow-100 bg-yellow-50 px-3 py-2 text-sm font-bold text-yellow-800">
                            <CalendarClock className="h-4 w-4" />
                            Teacher attendance opens after class
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-lead-blue">
                            <CalendarClock className="h-4 w-4" />
                            Attendance opens on {formatDate(session.scheduledAt)}
                          </span>
                        )}
                        <ActionFeedbackForm action={deleteClassSession} successMessage="Session removed." className="contents">
                          <input type="hidden" name="id" value={session.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </ActionFeedbackForm>
                      </div>
                    <details open={Boolean(sessionSearch) && filteredSessions.length === 1} className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60">
                      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-lead-blue [&::-webkit-details-marker]:hidden">
                        <CalendarClock className="h-4 w-4" />
                        Reschedule class
                      </summary>
                      <ActionFeedbackForm action={rescheduleClassSession} successMessage="Class rescheduled successfully." className="grid gap-4 border-t border-blue-200 p-4 sm:grid-cols-2">
                        <input type="hidden" name="id" value={session.id} />
                        <Field label="New Class Date (Indonesia)">
                          <input name="sessionDate" type="date" min={today} required defaultValue={session.sessionDate} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
                        </Field>
                        <div className="hidden sm:block" />
                        <Field label="New From Time (WIB)">
                          <input name="startTime" type="time" required defaultValue={session.startTime} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
                        </Field>
                        <Field label="New To Time (WIB)">
                          <input name="endTime" type="time" required defaultValue={session.endTime} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
                        </Field>
                        <p className="text-xs leading-5 text-lead-gray sm:col-span-2">Student, meeting number, teachers, class mode, and course stay unchanged.</p>
                        <Button type="submit" size="sm" className="sm:col-span-2 sm:w-fit">
                          <CalendarClock className="h-4 w-4" />
                          Confirm Reschedule
                        </Button>
                      </ActionFeedbackForm>
                    </details>
                    <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                      <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-lead-blue [&::-webkit-details-marker]:hidden">
                        <Pencil className="h-4 w-4" />
                        Edit class details
                      </summary>
                      <ActionFeedbackForm action={updateClassSession} successMessage="Class session updated successfully." className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
                        <input type="hidden" name="id" value={session.id} />
                        <Field label="Class Mode">
                          <select name="classMode" required defaultValue={session.classMode} className="focus-ring h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy">
                            {classModeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </Field>
                        <TeacherSelector teachers={teachers} selectedTeacherIds={session.teacherIds} compact />
                        <p className="text-xs leading-5 text-lead-gray sm:col-span-2">Meeting numbers are sequence-controlled and cannot be edited. To change the date or time, use Reschedule class above.</p>
                        <Button type="submit" size="sm" className="sm:col-span-2 sm:w-fit">Update Class Details</Button>
                      </ActionFeedbackForm>
                    </details>
                  </div>
                  <TemporaryMeetLink sessionId={session.id} expiresAt={expiresAt(session.endsAt, session.scheduledAt)} />
                </div>
              </div>
            );
            })}
            {!filteredSessions.length ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">
                {sessionSearch ? `No scheduled classes found for “${sessionSearch}”. Try the student ID or clear the search.` : "No class sessions yet. Schedule the next class to start tracking attendance reminders."}
              </p>
            ) : null}
          </div>
        </Card>
      </section>
      ) : (
        <section className="container-shell grid gap-6 py-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="grid gap-5">
            <Card className="p-5">
              <div className="flex items-center gap-3"><Users className="h-5 w-5 text-lead-blue" /><h2 className="font-heading text-xl font-extrabold text-lead-navy">Choose a Batch</h2></div>
              <p className="mt-2 text-sm leading-6 text-lead-gray">Select the whole group first. Students and the assigned teacher come from Batch Management automatically.</p>
              <form action="/admin/sessions" className="mt-4 grid gap-3">
                <input type="hidden" name="type" value="group" />
                <select name="batchId" defaultValue={selectedBatchId} className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-lead-navy">
                  {groupData.batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchName} - {batch.program}</option>)}
                </select>
                <Button type="submit" variant="secondary">Open Batch Schedule</Button>
              </form>
              {selectedBatch ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-lead-gray">
                  <p><strong className="text-lead-navy">Teacher:</strong> {selectedBatch.teacherName}</p>
                  <p><strong className="text-lead-navy">Class days:</strong> {selectedBatch.days}</p>
                  <p><strong className="text-lead-navy">Regular time:</strong> {selectedBatch.time}</p>
                </div>
              ) : null}
            </Card>
            {selectedBatch ? <Card className="p-5"><BatchScheduleForm batchId={selectedBatch.id} batchName={selectedBatch.batchName} days={selectedBatch.days} scheduledMeetingNumbers={selectedBatchSessions.map((session) => session.meetingNumber)} /></Card> : null}
            {!selectedBatch ? <Card className="p-6 text-sm text-lead-gray">Create an active batch and assign its students before scheduling group classes.</Card> : null}
          </div>

          <Card className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-heading text-xl font-extrabold text-lead-navy">{selectedBatch ? `${selectedBatch.batchName} Schedule` : "Group Schedule"}</h2><p className="mt-2 text-sm text-lead-gray">Only classes for the selected batch are shown here.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-lead-blue">{selectedBatchSessions.length} classes</span></div>
            <div className="mt-5 max-h-[760px] space-y-3 overflow-y-auto pr-1">
              {selectedBatchSessions.map((groupSession) => (
                <div key={groupSession.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><p className="font-heading text-lg font-bold text-lead-navy">Meeting {groupSession.meetingNumber}</p><p className="mt-1 text-sm font-semibold text-lead-gray">{formatDate(groupSession.sessionDate)} / {groupSession.startTime} - {groupSession.endTime} WIB</p><p className="mt-1 text-sm text-lead-gray">{groupSession.teacherName} / {groupSession.studentCount} students{groupSession.topic ? ` / ${groupSession.topic}` : ""}</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${groupSession.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-lead-blue"}`}>{groupSession.status}</span>
                      {groupSession.status === "Scheduled" && !groupSession.attendanceMarked ? (
                        <>
                          <ActionFeedbackForm action={cancelBatchClass} successMessage="Group class cancelled." className="contents">
                            <input type="hidden" name="sessionId" value={groupSession.id} />
                            <Button type="submit" variant="ghost" size="sm">Cancel</Button>
                          </ActionFeedbackForm>
                          <ActionFeedbackForm action={deleteBatchClass} successMessage="Group class deleted." className="contents">
                            <input type="hidden" name="sessionId" value={groupSession.id} />
                            <Button type="submit" variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700">
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          </ActionFeedbackForm>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
              {!selectedBatchSessions.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-lead-gray">No classes scheduled for this batch yet.</p> : null}
            </div>
          </Card>
        </section>
      )}
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
