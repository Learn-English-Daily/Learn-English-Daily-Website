import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { Activity, Clock3, Radio, RefreshCw, Users } from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { syncMeetMonitoring } from "@/app/admin/meet-monitoring/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import { getMeetMonitoringCollectionName } from "@/lib/google-meet-monitoring";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

type MonitoringRecord = {
  conferenceRecordName?: string;
  studentId?: string;
  studentName?: string;
  meetingNumber?: number | null;
  sessionDate?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  teacherNames?: string[];
  actualStartAt?: string;
  actualEndAt?: string;
  durationMinutes?: number | null;
  startDifferenceMinutes?: number | null;
  endDifferenceMinutes?: number | null;
  participantCount?: number;
  participantNames?: string[];
  status?: string;
  syncedAt?: Date;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function formatDateTime(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date) + " WIB";
}

function timingLabel(minutes?: number | null, kind: "start" | "end" = "start") {
  if (minutes === null || minutes === undefined) return "No scheduled class match";
  if (Math.abs(minutes) <= 10) return kind === "start" ? "Started on time" : "Finished on time";
  if (kind === "start") return minutes > 0 ? `Started ${minutes} min late` : `Started ${Math.abs(minutes)} min early`;
  return minutes > 0 ? `Finished ${minutes} min late` : `Finished ${Math.abs(minutes)} min early`;
}

export default async function MeetMonitoringPage({ searchParams }: {
  searchParams?: Promise<{ success?: string | string[]; error?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!isValidAdminSession(session)) {
    return (
      <main className="grid min-h-screen place-items-center bg-lead-soft px-4 py-10">
        <Card className="w-full max-w-md p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Meet monitoring</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to view actual online-class start and finish times.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const admin = await getAuthenticatedAdmin();
  if (!admin || isGroupStudentAdminSession(session)) {
    return <main className="grid min-h-screen place-items-center bg-lead-soft p-6"><Card className="max-w-lg p-8"><h1 className="font-heading text-2xl font-bold text-lead-navy">Full admin access required</h1><p className="mt-3 text-lead-gray">Meet monitoring contains private 1-to-1 class data.</p></Card></main>;
  }

  const params = await searchParams;
  const db = await getMongoDb();
  const records = await db.collection<MonitoringRecord>(getMeetMonitoringCollectionName()).find({}).sort({ actualStartAt: -1 }).limit(100).toArray();
  const completed = records.filter((record) => record.actualEndAt);
  const onTime = records.filter((record) => record.startDifferenceMinutes !== null && record.startDifferenceMinutes !== undefined && Math.abs(record.startDifferenceMinutes) <= 10).length;
  const earlyEnds = records.filter((record) => typeof record.endDifferenceMinutes === "number" && record.endDifferenceMinutes < -10).length;

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader active="meet" title="Meet monitoring" description="Compare scheduled private online classes with actual Google Meet start, finish, duration, and participation logs." userName={admin.name} username={admin.username} logoutAction={logoutAdmin} />
      <section className="container-shell py-8">
        {first(params?.success) ? <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{first(params?.success)}</div> : null}
        {first(params?.error) ? <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{first(params?.error)}</div> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Radio} label="Calls found" value={records.length} detail="Latest 100 synced calls" />
          <Metric icon={Clock3} label="Ended calls" value={completed.length} detail="With complete duration" />
          <Metric icon={Activity} label="Started on time" value={onTime} detail="Within 10 minutes" />
          <Metric icon={Users} label="Ended early" value={earlyEnds} detail="More than 10 minutes early" />
        </div>

        <Card className="mt-6 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-heading text-xl font-extrabold text-lead-navy">Private online class logs</h2><p className="mt-1 text-sm text-lead-gray">Google retains Meet conference records for 30 days. Sync regularly to keep the operational history here.</p></div>
            <form action={syncMeetMonitoring}><Button type="submit"><RefreshCw className="h-4 w-4" />Sync Meet logs</Button></form>
          </div>

          <div className="mt-5 grid gap-4">
            {records.length ? records.map((record) => (
              <article key={record.conferenceRecordName} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-heading text-lg font-extrabold text-lead-navy">{record.studentName || "Unknown student"}</h3><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-lead-blue">{record.studentId}</span>{record.meetingNumber ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">Meeting {record.meetingNumber}</span> : null}</div>
                    <p className="mt-2 text-sm text-lead-gray">Teacher: {record.teacherNames?.join(", ") || "Not matched"}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${record.actualEndAt ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{record.status || "Unknown"}</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Detail label="Scheduled" value={record.scheduledStartAt ? `${formatDateTime(record.scheduledStartAt)} – ${formatDateTime(record.scheduledEndAt)}` : "No class matched"} />
                  <Detail label="Actual Meet" value={`${formatDateTime(record.actualStartAt)} – ${record.actualEndAt ? formatDateTime(record.actualEndAt) : "In progress"}`} />
                  <Detail label="Timing" value={`${timingLabel(record.startDifferenceMinutes)} · ${timingLabel(record.endDifferenceMinutes, "end")}`} />
                  <Detail label="Participation" value={`${record.participantCount || 0} participant${record.participantCount === 1 ? "" : "s"} · ${record.durationMinutes ?? "—"} min`} />
                </div>
                {record.participantNames?.length ? <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">Participants: {record.participantNames.join(", ")}</p> : null}
              </article>
            )) : <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center"><p className="font-bold text-lead-navy">No Meet logs synced yet</p><p className="mt-2 text-sm text-lead-gray">Use “Sync Meet logs” after the production environment variables are configured.</p></div>}
          </div>
        </Card>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Radio; label: string; value: number; detail: string }) {
  return <Card className="p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-lead-blue"><Icon className="h-5 w-5" /></div><p className="mt-4 text-sm font-bold text-lead-gray">{label}</p><p className="mt-1 font-heading text-3xl font-extrabold text-lead-navy">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></Card>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold leading-6 text-lead-navy">{value}</p></div>;
}
