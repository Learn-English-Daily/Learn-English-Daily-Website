import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { CalendarDays, CheckCircle2, ClipboardCheck, Clock3, LogOut, Users } from "lucide-react";
import { logoutTeacher, saveBatchClassAttendance } from "@/app/teacher/actions";
import { TeacherLoginForm } from "@/app/teacher/login-form";
import { TeacherPortalTabs } from "@/app/teacher/teacher-tabs";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { assessmentAttendanceStatuses } from "@/lib/assessments";
import { getBatchClassSessionsCollectionName, type BatchClassSessionDocument } from "@/lib/batch-class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { isValidTeacherSession, TEACHER_ID_COOKIE, TEACHER_SESSION_COOKIE } from "@/lib/teacher-auth";
import { getEmployeeTeacherById } from "@/lib/teachers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Group Classes | LEAD Teacher", robots: { index: false, follow: false } };

function todayWib() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "full", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
}

async function authenticatedTeacher() {
  const cookieStore = await cookies();
  const teacherId = cookieStore.get(TEACHER_ID_COOKIE)?.value || "";
  const session = cookieStore.get(TEACHER_SESSION_COOKIE)?.value || "";
  const db = await getMongoDb();
  const teacher = await getEmployeeTeacherById(db, teacherId);
  if (!teacher?.username || !isValidTeacherSession(teacher.id, teacher.username, session)) return null;
  return teacher;
}

export default async function TeacherGroupClassesPage() {
  noStore();
  const teacher = await authenticatedTeacher();
  if (!teacher) {
    return (
      <main className="grid min-h-screen place-items-center bg-lead-soft px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Teacher</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Teacher portal</h1>
          <p className="mt-3 text-lead-gray">Sign in to open your assigned group classes.</p>
          <TeacherLoginForm />
        </Card>
      </main>
    );
  }

  const db = await getMongoDb();
  const sessions = await db.collection<BatchClassSessionDocument>(getBatchClassSessionsCollectionName())
    .find({ teacherId: teacher.id, status: { $ne: "Cancelled" } })
    .sort({ sessionDate: -1, meetingNumber: -1 })
    .limit(100)
    .toArray();
  const today = todayWib();
  const open = sessions.filter((session) => session.status === "Scheduled" && session.sessionDate <= today).reverse();
  const future = sessions.filter((session) => session.status === "Scheduled" && session.sessionDate > today).reverse();
  const completed = sessions.filter((session) => session.status === "Completed").slice(0, 12);

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-blue-100 bg-white">
        <div className="container-shell flex items-start justify-between gap-4 py-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Teacher / {teacher.name}</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Group Classes</h1>
            <p className="mt-2 text-sm text-lead-gray">Mark the whole batch roster once. Results flow into monthly assessments.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/teacher/assessments" className="focus-ring inline-flex items-center gap-2 rounded-lg bg-lead-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700">
              <ClipboardCheck className="h-4 w-4" /> Batch Assessment
            </a>
            <form action={logoutTeacher}><Button type="submit" variant="secondary"><LogOut className="h-4 w-4" /> Logout</Button></form>
          </div>
        </div>
        <TeacherPortalTabs active="group-classes" />
      </header>

      <section className="container-shell grid gap-6 py-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Attendance needed" value={open.length} icon={Users} tone="amber" />
          <Metric label="Upcoming classes" value={future.length} icon={CalendarDays} tone="blue" />
          <Metric label="Recently completed" value={completed.length} icon={CheckCircle2} tone="green" />
        </div>

        <div className="grid gap-5">
          {open.map((session) => (
            <Card key={session._id.toString()} className="overflow-hidden">
              <div className="border-b border-blue-100 bg-blue-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="font-heading text-xl font-extrabold text-lead-navy">{session.batchName} / Meeting {session.meetingNumber}</h2><p className="mt-1 text-sm text-lead-gray">{displayDate(session.sessionDate)} / {session.startTime} - {session.endTime} WIB{session.topic ? ` / ${session.topic}` : ""}</p></div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Attendance needed</span>
                </div>
              </div>
              <ActionFeedbackForm action={saveBatchClassAttendance} successMessage="Group attendance saved and assessment tracker updated." className="p-5">
                <input type="hidden" name="sessionId" value={session._id.toString()} />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.12em] text-lead-gray"><tr><th className="pb-3">Student</th><th className="pb-3">Attendance</th><th className="pb-3">Stars</th><th className="pb-3">Minutes Late</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {session.studentSnapshot.map((student, index) => (
                        <tr key={student.studentId}><td className="py-3 pr-3"><p className="font-bold text-lead-navy">{student.studentName}</p><p className="text-xs text-lead-gray">{student.studentId}</p></td><td className="py-3 pr-3"><select name={`attendance_${index}`} defaultValue="Present" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">{assessmentAttendanceStatuses.map((status) => <option key={status}>{status}</option>)}</select></td><td className="py-3 pr-3"><select name={`stars_${index}`} defaultValue="3" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2">{[0,1,2,3,4,5].map((stars) => <option key={stars} value={stars}>{stars} stars</option>)}</select></td><td className="py-3"><input name={`late_${index}`} type="number" min={0} max={240} defaultValue={0} className="w-full rounded-lg border border-slate-200 px-3 py-2" /></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="submit" className="mt-5 w-full sm:w-auto">Save Group Attendance</Button>
              </ActionFeedbackForm>
            </Card>
          ))}
          {!open.length ? <Card className="p-8 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><h2 className="mt-3 font-heading text-xl font-bold text-lead-navy">No group attendance pending</h2><p className="mt-2 text-sm text-lead-gray">Today and overdue group classes will appear here.</p></Card> : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <SessionList title="Upcoming Schedule" sessions={future} empty="No upcoming group classes." />
          <SessionList title="Completed Classes" sessions={completed} empty="No group classes completed yet." />
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Users; tone: "amber" | "blue" | "green" }) {
  const colors = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-lead-blue";
  return <Card className="flex items-center gap-4 p-4"><div className={`grid h-11 w-11 place-items-center rounded-xl ${colors}`}><Icon className="h-5 w-5" /></div><div><p className="font-heading text-2xl font-extrabold text-lead-navy">{value}</p><p className="text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">{label}</p></div></Card>;
}

function SessionList({ title, sessions, empty }: { title: string; sessions: Array<BatchClassSessionDocument & { _id: { toString(): string } }>; empty: string }) {
  return <Card className="p-5"><h2 className="font-heading text-xl font-extrabold text-lead-navy">{title}</h2><div className="mt-4 max-h-80 space-y-2 overflow-y-auto">{sessions.map((session) => <div key={session._id.toString()} className="rounded-xl bg-slate-50 p-3"><p className="font-bold text-lead-navy">{session.batchName} / Meeting {session.meetingNumber}</p><p className="mt-1 flex items-center gap-1 text-xs text-lead-gray"><Clock3 className="h-3.5 w-3.5" /> {displayDate(session.sessionDate)} / {session.startTime} - {session.endTime} WIB</p></div>)}{!sessions.length ? <p className="text-sm text-lead-gray">{empty}</p> : null}</div></Card>;
}
