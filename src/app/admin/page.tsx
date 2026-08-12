import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import {
  AlertCircle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Inbox,
  Star,
  Users
} from "lucide-react";
import type { WithId } from "mongodb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument
} from "@/lib/class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { getReviewCollectionName } from "@/lib/reviews";
import { getActiveStudentFilter, getStudentRegistrationCollectionName, getTrialStudentFilter } from "@/lib/student-registration";

export const dynamic = "force-dynamic";

type LeadDocument = {
  name?: string;
  email?: string;
  whatsapp?: string;
  goal?: string;
  createdAt?: Date;
};

type ReviewDocument = {
  status?: string;
  name?: string;
  rating?: number;
  createdAt?: Date;
};

type DashboardData = {
  todaySessions: Array<{
    id: string;
    studentName: string;
    meetingNumber: number;
    scheduledAt: string;
    status: string;
    teacherNames: string[];
  }>;
  needsAttendance: number;
  newInquiries: number;
  pendingReviews: number;
  currentStudents: number;
  trialStudents: number;
  latestInquiry: {
    name: string;
    goal: string;
  } | null;
};

function getTodayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function formatDateTime(value: string) {
  if (!value) return "Time not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

async function getDashboardData(): Promise<DashboardData> {
  const db = await getMongoDb();
  const today = getTodayJakarta();
  const leadsCollectionName = process.env.MONGODB_COLLECTION || "leads";

  const [
    sessionDocs,
    newInquiries,
    pendingReviews,
    currentStudents,
    trialStudents,
    latestInquiry
  ] = await Promise.all([
    db
      .collection<ClassSessionDocument>(getClassSessionsCollectionName())
      .find({ status: { $ne: "Completed" } })
      .sort({ scheduledAt: 1 })
      .limit(200)
      .toArray() as Promise<WithId<ClassSessionDocument>[]>,
    db.collection<LeadDocument>(leadsCollectionName).countDocuments(),
    db.collection<ReviewDocument>(getReviewCollectionName()).countDocuments({ status: "pending" }),
    db.collection(getStudentRegistrationCollectionName()).countDocuments(getActiveStudentFilter()),
    db.collection(getStudentRegistrationCollectionName()).countDocuments(getTrialStudentFilter()),
    db.collection<LeadDocument>(leadsCollectionName).find({}).sort({ createdAt: -1 }).limit(1).next()
  ]);

  const todaySessions = sessionDocs
    .filter((doc) => doc.sessionDate === today)
    .slice(0, 5)
    .map((doc) => ({
      id: doc._id.toString(),
      studentName: doc.studentName || "Unknown",
      meetingNumber: doc.meetingNumber || 0,
      scheduledAt: doc.scheduledAt || "",
      teacherNames: doc.teacherNames || [],
      status: getComputedClassSessionStatus({
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        endsAt: doc.endsAt
      })
    }));

  const needsAttendance = sessionDocs.filter(
    (doc) =>
      getComputedClassSessionStatus({
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        endsAt: doc.endsAt
      }) === "Needs Attendance"
  ).length;

  return {
    todaySessions,
    needsAttendance,
    newInquiries,
    pendingReviews,
    currentStudents,
    trialStudents,
    latestInquiry: latestInquiry
      ? {
          name: latestInquiry.name || "Unknown",
          goal: latestInquiry.goal || "No message"
        }
      : null
  };
}

export default async function AdminDashboardPage() {
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
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Admin dashboard</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to see today&apos;s classes, payments, inquiries, and reviews.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const [data, admin] = await Promise.all([getDashboardData(), getAuthenticatedAdmin()]);

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="dashboard"
        title="Admin dashboard"
        description="Start here after login: see today's classes, follow-ups, payments, inquiries, and reviews in one place."
        userName={admin?.name}
        logoutAction={logoutAdmin}
      />

      <section className="container-shell grid gap-6 py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardKpi icon={CalendarClock} label="Today's classes" value={data.todaySessions.length} detail="Scheduled for today" href="/admin/sessions" />
          <DashboardKpi icon={AlertCircle} label="Need attendance" value={data.needsAttendance} detail="Past classes not closed" href="/admin/sessions" tone="rose" />
          <DashboardKpi icon={Star} label="Pending reviews" value={data.pendingReviews} detail="Waiting approval" href="/admin/reviews" tone="blue" />
          <DashboardKpi icon={Users} label="Current students" value={data.currentStudents} detail="Active registrations" href="/admin/students" tone="blue" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl font-extrabold text-lead-navy">Today&apos;s classes</h2>
                <p className="mt-1 text-sm text-lead-gray">Quick view of sessions scheduled for today.</p>
              </div>
              <Button asChild>
                <a href="/admin/sessions">
                  Open Sessions
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="mt-5 grid gap-3">
              {data.todaySessions.map((session) => (
                <a key={session.id} href="/admin/sessions" className="focus-ring rounded-lg border border-slate-200 bg-white p-4 transition hover:border-lead-blue hover:bg-blue-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">Meeting {session.meetingNumber}</span>
                    <span className="font-heading font-bold text-lead-navy">{session.studentName}</span>
                    <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">{session.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-lead-gray">{formatDateTime(session.scheduledAt)}</p>
                  <p className="mt-1 text-sm text-lead-gray">
                    <span className="font-bold text-lead-navy">Teachers:</span> {session.teacherNames.length ? session.teacherNames.join(", ") : "Not assigned"}
                  </p>
                </a>
              ))}
              {!data.todaySessions.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No classes scheduled for today.</p> : null}
            </div>
          </Card>

          <div className="grid gap-6">
            <Card className="p-5">
              <h2 className="font-heading text-xl font-extrabold text-lead-navy">Quick actions</h2>
              <div className="mt-4 grid gap-3">
                <QuickAction href="/admin/sessions" label="Schedule class" icon={CalendarClock} />
                <QuickAction href="/admin/attendance" label="Monitor attendance" icon={CalendarCheck} />
                <QuickAction href="/admin/students" label="View students" icon={Users} />
                <QuickAction href="/admin/inquiries" label="View inquiries" icon={Inbox} />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-heading text-xl font-extrabold text-lead-navy">Pipeline</h2>
              <div className="mt-4 grid gap-3 text-sm">
                <PipelineItem label="Current students" value={data.currentStudents} href="/admin/students" />
                <PipelineItem label="Trial students" value={data.trialStudents} href="/admin/students/trials" />
                <PipelineItem label="Total inquiries" value={data.newInquiries} href="/admin/inquiries" />
              </div>
            </Card>
          </div>
        </div>

        <div className="grid gap-6">
          <InsightCard
            icon={Inbox}
            title="Latest inquiry"
            href="/admin/inquiries"
            action="Open inquiries"
            empty="No inquiries yet."
            lines={data.latestInquiry ? [data.latestInquiry.name, data.latestInquiry.goal] : []}
          />
        </div>
      </section>
    </main>
  );
}

function DashboardKpi({
  icon: Icon,
  label,
  value,
  detail,
  href,
  tone = "navy"
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
  detail: string;
  href: string;
  tone?: "navy" | "rose" | "yellow" | "blue";
}) {
  const toneClassName =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "yellow"
        ? "bg-yellow-50 text-yellow-800"
        : tone === "blue"
          ? "bg-blue-50 text-lead-blue"
          : "bg-slate-100 text-lead-navy";

  return (
    <a href={href} className="focus-ring rounded-2xl border border-white bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-100">
      <span className={`grid h-12 w-12 place-items-center rounded-xl ${toneClassName}`}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">{value}</p>
      <p className="mt-1 text-sm font-semibold text-lead-gray">{detail}</p>
    </a>
  );
}

function QuickAction({ href, label, icon: Icon }: { href: string; label: string; icon: typeof CalendarClock }) {
  return (
    <a href={href} className="focus-ring flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-lead-navy transition hover:border-lead-blue hover:bg-blue-50">
      <span className="inline-flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-lead-blue">
          <Icon className="h-5 w-5" />
        </span>
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-lead-gray" />
    </a>
  );
}

function PipelineItem({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="focus-ring flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 font-semibold text-lead-gray transition hover:bg-blue-50 hover:text-lead-blue">
      <span>{label}</span>
      <span className="font-heading text-lg font-extrabold text-lead-navy">{value}</span>
    </a>
  );
}

function InsightCard({
  icon: Icon,
  title,
  lines,
  empty,
  href,
  action
}: {
  icon: typeof Inbox;
  title: string;
  lines: string[];
  empty: string;
  href: string;
  action: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-lead-blue">
            <Icon className="h-5 w-5" />
          </span>
          <h2 className="mt-4 font-heading text-xl font-extrabold text-lead-navy">{title}</h2>
        </div>
        <Button asChild variant="secondary" size="sm">
          <a href={href}>{action}</a>
        </Button>
      </div>
      {lines.length ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-4">
          <p className="font-heading font-bold text-lead-navy">{lines[0]}</p>
          <p className="mt-2 text-sm leading-6 text-lead-gray">{lines[1]}</p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">{empty}</p>
      )}
    </Card>
  );
}
