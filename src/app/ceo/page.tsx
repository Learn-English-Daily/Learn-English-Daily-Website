import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import {
  AlertTriangle,
  CalendarCheck,
  CircleDollarSign,
  Clock,
  GraduationCap,
  RefreshCcw,
  Star,
  UserPlus,
  Users,
  WalletCards
} from "lucide-react";
import { logoutCeo } from "@/app/ceo/actions";
import { CeoLoginForm } from "@/app/ceo/login-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentAttendanceCollectionName, type AttendanceStatus } from "@/lib/attendance";
import { CEO_SESSION_COOKIE, isCeoConfigured, isValidCeoSession } from "@/lib/ceo-auth";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument,
  type ComputedClassSessionStatus
} from "@/lib/class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { formatRupiah, getStudentPaymentsCollectionName, type PaymentStatus } from "@/lib/payments";
import { getReviewCollectionName, type ReviewStatus } from "@/lib/reviews";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CEO Dashboard | LEAD",
  robots: { index: false, follow: false }
};

type Period = "this_month" | "last_month" | "90_days" | "all";

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  createdAt?: Date;
};

type AttendanceDocument = {
  studentId?: string;
  studentName?: string;
  meetingNumber?: number;
  meetingDate?: string;
  status?: AttendanceStatus;
  teacherNames?: string[];
  notes?: string;
};

type PaymentDocument = {
  studentId?: string;
  studentName?: string;
  meetingNumber?: number;
  meetingDate?: string;
  amountDue?: number;
  status?: PaymentStatus;
  paidDate?: string;
  receiptUploadedToDrive?: boolean;
  createdAt?: Date;
};

type LeadDocument = {
  name?: string;
  createdAt?: Date;
};

type ReviewDocument = {
  rating?: number;
  status?: ReviewStatus;
  createdAt?: Date;
};

type DateRange = { start: string | null; end: string | null; label: string };

type TodaySession = {
  id: string;
  studentId: string;
  studentName: string;
  meetingNumber: number;
  scheduledAt: string;
  teacherNames: string[];
  status: ComputedClassSessionStatus;
};

const periodOptions: Array<{ value: Period; label: string }> = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "90_days", label: "Last 90 days" },
  { value: "all", label: "All time" }
];

function jakartaDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(value);
}

function addMonths(year: number, monthIndex: number, offset: number) {
  const date = new Date(Date.UTC(year, monthIndex + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function getDateRange(period: Period): DateRange {
  const today = jakartaDateKey(new Date());
  const [year, month] = today.split("-").map(Number);

  if (period === "all") return { start: null, end: null, label: "All time" };

  if (period === "last_month") {
    const previous = addMonths(year, month - 1, -1);
    return {
      start: monthStart(previous.year, previous.month),
      end: monthStart(year, month),
      label: "Last month"
    };
  }

  if (period === "90_days") {
    const endDate = new Date(`${today}T00:00:00+07:00`);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 89);
    endDate.setDate(endDate.getDate() + 1);
    return { start: jakartaDateKey(startDate), end: jakartaDateKey(endDate), label: "Last 90 days" };
  }

  const next = addMonths(year, month - 1, 1);
  return {
    start: monthStart(year, month),
    end: monthStart(next.year, next.month),
    label: "This month"
  };
}

function isInRange(value: string, range: DateRange) {
  if (!value) return false;
  if (range.start && value < range.start) return false;
  if (range.end && value >= range.end) return false;
  return true;
}

function formatDate(value?: Date | string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function formatTime(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function percentage(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function plural(value: number, singular: string, pluralValue = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralValue}`;
}

async function getDashboardData(period: Period) {
  const db = await getMongoDb();
  const range = getDateRange(period);
  const leadCollectionName = process.env.MONGODB_COLLECTION || "leads";

  const [students, attendance, payments, leads, reviews, classSessions] = await Promise.all([
    db.collection<StudentDocument>(getStudentRegistrationCollectionName()).find({}).sort({ createdAt: -1 }).limit(5000).toArray(),
    db.collection<AttendanceDocument>(getStudentAttendanceCollectionName()).find({}).sort({ meetingDate: -1 }).limit(20000).toArray(),
    db.collection<PaymentDocument>(getStudentPaymentsCollectionName()).find({}).sort({ meetingDate: -1 }).limit(20000).toArray(),
    db.collection<LeadDocument>(leadCollectionName).find({}).sort({ createdAt: -1 }).limit(5000).toArray(),
    db.collection<ReviewDocument>(getReviewCollectionName()).find({}).sort({ createdAt: -1 }).limit(5000).toArray(),
    db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).find({}).sort({ scheduledAt: -1 }).limit(5000).toArray()
  ]);
  const attendanceKeys = new Set(attendance.map((record) => `${record.studentId || ""}:${record.meetingNumber || 0}`));

  const periodAttendance = attendance.filter((record) => isInRange(record.meetingDate || "", range));
  const present = periodAttendance.filter((record) => record.status === "Present").length;
  const late = periodAttendance.filter((record) => record.status === "Late").length;
  const absent = periodAttendance.filter((record) => record.status === "Absent").length;
  const countedAttendance = present + late + absent;
  const attendanceRate = percentage(present + late, countedAttendance);

  const paidInPeriod = payments.filter(
    (payment) => payment.status === "Paid" && isInRange(payment.paidDate || payment.meetingDate || "", range)
  );
  const revenue = paidInPeriod.reduce((sum, payment) => sum + (payment.amountDue || 0), 0);
  const unpaidPayments = payments.filter((payment) => payment.status === "Unpaid");
  const outstandingAmount = unpaidPayments.reduce((sum, payment) => sum + (payment.amountDue || 0), 0);
  const outstandingByStudent = new Map<
    string,
    { studentId: string; name: string; amount: number; meetings: number; oldestDate: string; oldestMeeting: number }
  >();
  for (const payment of unpaidPayments) {
    const key = payment.studentId || payment.studentName || "Unknown";
    const current = outstandingByStudent.get(key) || {
      studentId: payment.studentId || "",
      name: payment.studentName || payment.studentId || "Unknown student",
      amount: 0,
      meetings: 0,
      oldestDate: payment.meetingDate || "",
      oldestMeeting: payment.meetingNumber || 0
    };
    current.amount += payment.amountDue || 0;
    current.meetings += 1;
    if (payment.meetingDate && (!current.oldestDate || payment.meetingDate < current.oldestDate)) {
      current.oldestDate = payment.meetingDate;
      current.oldestMeeting = payment.meetingNumber || 0;
    }
    outstandingByStudent.set(key, current);
  }
  const outstandingStudents = [...outstandingByStudent.values()].sort((a, b) => b.amount - a.amount);
  const pendingReceipts = payments.filter(
    (payment) => payment.status === "Paid" && payment.receiptUploadedToDrive !== true
  );
  const newStudents = students.filter((student) => student.createdAt && isInRange(jakartaDateKey(new Date(student.createdAt)), range));
  const newLeads = leads.filter((lead) => lead.createdAt && isInRange(jakartaDateKey(new Date(lead.createdAt)), range));
  const approvedReviews = reviews.filter((review) => review.status === "approved" && typeof review.rating === "number");
  const averageRating = approvedReviews.length
    ? approvedReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / approvedReviews.length
    : 0;
  const pendingReviews = reviews.filter((review) => review.status === "pending");
  const missingClassDetails = periodAttendance.filter(
    (record) => !record.teacherNames?.length || !record.notes?.trim()
  );
  const today = jakartaDateKey(new Date());
  const todaySessions = classSessions
    .filter((session) => session.sessionDate === today)
    .map((session) => {
      const studentId = session.studentId || "";
      const meetingNumber = session.meetingNumber || 0;

      return {
        id: session._id.toString(),
        studentId,
        studentName: session.studentName || "Unknown student",
        meetingNumber,
        scheduledAt: session.scheduledAt || "",
        teacherNames: session.teacherNames || [],
        status: getComputedClassSessionStatus({
          status: session.status,
          scheduledAt: session.scheduledAt,
          endsAt: session.endsAt,
          hasAttendance: attendanceKeys.has(`${studentId}:${meetingNumber}`)
        })
      };
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const scheduledInPeriod = classSessions.filter((session) => isInRange(session.sessionDate || "", range));
  const sessionsNeedingAttendance = classSessions.filter(
    (session) =>
      getComputedClassSessionStatus({
        status: session.status,
        scheduledAt: session.scheduledAt,
        endsAt: session.endsAt,
        hasAttendance: attendanceKeys.has(`${session.studentId || ""}:${session.meetingNumber || 0}`)
      }) === "Needs Attendance"
  );

  const courseCounts = new Map<string, number>();
  for (const student of students) {
    const course = student.courseJoined || "Not assigned";
    courseCounts.set(course, (courseCounts.get(course) || 0) + 1);
  }
  const courses = [...courseCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const teacherCounts = new Map<string, number>();
  for (const record of periodAttendance) {
    for (const teacher of record.teacherNames || []) {
      teacherCounts.set(teacher, (teacherCounts.get(teacher) || 0) + 1);
    }
  }
  const teachers = [...teacherCounts.entries()]
    .map(([name, meetings]) => ({ name, meetings }))
    .sort((a, b) => b.meetings - a.meetings);

  const studentAttendance = new Map<string, { name: string; attended: number; counted: number }>();
  for (const record of attendance) {
    if (record.status === "Cancelled") continue;
    const key = record.studentId || record.studentName || "Unknown";
    const current = studentAttendance.get(key) || { name: record.studentName || key, attended: 0, counted: 0 };
    current.counted += 1;
    if (record.status === "Present" || record.status === "Late") current.attended += 1;
    studentAttendance.set(key, current);
  }
  const lowAttendance = [...studentAttendance.values()]
    .filter((student) => student.counted >= 3 && percentage(student.attended, student.counted) < 75)
    .map((student) => ({ ...student, rate: percentage(student.attended, student.counted) }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 8);

  const [currentYear, currentMonth] = jakartaDateKey(new Date()).split("-").map(Number);
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const value = addMonths(currentYear, currentMonth - 1, index - 5);
    const key = `${value.year}-${String(value.month).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
      new Date(Date.UTC(value.year, value.month - 1, 1))
    );
    const monthPayments = payments.filter((payment) => payment.status === "Paid" && (payment.paidDate || "").startsWith(key));
    const monthAttendance = attendance.filter((record) => (record.meetingDate || "").startsWith(key));
    const monthAttended = monthAttendance.filter((record) => record.status === "Present" || record.status === "Late").length;
    const monthCounted = monthAttendance.filter((record) => record.status !== "Cancelled").length;
    return {
      key,
      label,
      revenue: monthPayments.reduce((sum, payment) => sum + (payment.amountDue || 0), 0),
      attendanceRate: percentage(monthAttended, monthCounted)
    };
  });

  return {
    range,
    kpis: {
      registeredStudents: students.length,
      newStudents: newStudents.length,
      inquiries: newLeads.length,
      classes: periodAttendance.length,
      scheduledClasses: scheduledInPeriod.length,
      attendanceRate,
      revenue,
      outstandingAmount,
      averageRating
    },
    actions: {
      unpaidCount: unpaidPayments.length,
      pendingReceipts: pendingReceipts.length,
      pendingReviews: pendingReviews.length,
      missingClassDetails: missingClassDetails.length,
      sessionsNeedingAttendance: sessionsNeedingAttendance.length,
      lowAttendance
    },
    todaySessions,
    courses,
    teachers,
    outstandingStudents,
    trendMonths,
    recent: {
      students: students.slice(0, 5),
      payments: payments.slice(0, 5),
      leads: leads.slice(0, 5)
    }
  };
}

export default async function CeoDashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidCeoSession(cookieStore.get(CEO_SESSION_COOKIE)?.value);
  const resolvedSearchParams = await searchParams;
  const requestedPeriod = Array.isArray(resolvedSearchParams?.period)
    ? resolvedSearchParams?.period[0]
    : resolvedSearchParams?.period;
  const period: Period = periodOptions.some((option) => option.value === requestedPeriod)
    ? (requestedPeriod as Period)
    : "this_month";

  if (!isCeoConfigured()) {
    return (
      <main className="min-h-screen bg-lead-soft px-4 py-10">
        <Card className="mx-auto max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">CEO password missing</h1>
          <p className="mt-4 leading-7 text-lead-gray">
            Add <code className="rounded bg-slate-100 px-2 py-1">CEO_PASSWORD</code> and <code className="rounded bg-slate-100 px-2 py-1">CEO_SESSION_SECRET</code> in Vercel Environment Variables.
          </p>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Business overview</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to view academy performance, finances, and operational priorities.</p>
          <CeoLoginForm />
        </Card>
      </main>
    );
  }

  const data = await getDashboardData(period);
  const maxCourseCount = Math.max(...data.courses.map((course) => course.count), 1);
  const maxRevenue = Math.max(...data.trendMonths.map((month) => month.revenue), 1);

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-shell flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD CEO Dashboard</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Academy overview</h1>
            <p className="mt-2 text-sm text-lead-gray">Performance snapshot for {data.range.label.toLowerCase()}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <a href={`/ceo?period=${period}`}><RefreshCcw className="h-4 w-4" />Refresh</a>
            </Button>
            <form action={logoutCeo}><Button type="submit">Logout</Button></form>
          </div>
        </div>
      </header>

      <div className="container-shell grid gap-6 py-8">
        <Card className="p-3">
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <Button key={option.value} asChild size="sm" variant={period === option.value ? "primary" : "secondary"}>
                <a href={`/ceo?period=${option.value}`}>{option.label}</a>
              </Button>
            ))}
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={Users} label="Registered students" value={String(data.kpis.registeredStudents)} detail={`${plural(data.kpis.newStudents, "new registration")} in period`} color="text-blue-600" />
          <Kpi icon={UserPlus} label="New inquiries" value={String(data.kpis.inquiries)} detail={data.range.label} color="text-violet-600" />
          <Kpi icon={CalendarCheck} label="Classes recorded" value={String(data.kpis.classes)} detail={`${data.kpis.attendanceRate}% attendance rate`} color="text-emerald-600" />
          <Kpi icon={Clock} label="Classes scheduled" value={String(data.kpis.scheduledClasses)} detail={`${data.actions.sessionsNeedingAttendance} need attendance`} color="text-blue-600" />
          <Kpi icon={WalletCards} label="Revenue collected" value={formatRupiah(data.kpis.revenue)} detail={data.range.label} color="text-emerald-600" />
          <Kpi icon={CircleDollarSign} label="Outstanding" value={formatRupiah(data.kpis.outstandingAmount)} detail="Current unpaid balance" color="text-yellow-700" />
          <Kpi icon={Star} label="Average rating" value={data.kpis.averageRating ? data.kpis.averageRating.toFixed(1) : "N/A"} detail="Approved reviews" color="text-yellow-600" />
        </section>

        <Card className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-lead-navy">Today&apos;s scheduled classes</h2>
              <p className="mt-1 text-sm text-lead-gray">Read-only view of class sessions and attendance status for today.</p>
            </div>
            <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-lead-blue">{plural(data.todaySessions.length, "class", "classes")}</span>
          </div>
          <div className="mt-5 grid gap-3">
            {data.todaySessions.map((session) => (
              <div key={session.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading font-bold text-lead-navy">{session.studentName}</p>
                    <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">Meeting {session.meetingNumber}</span>
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${sessionStatusClassName(session.status)}`}>{session.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-lead-gray">
                    {formatTime(session.scheduledAt)} / {session.teacherNames.length ? session.teacherNames.join(", ") : "Teachers not assigned"}
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <a href={session.studentId ? `/admin/attendance?studentId=${encodeURIComponent(session.studentId)}` : "/admin/attendance"}>Open attendance</a>
                </Button>
              </div>
            ))}
            {!data.todaySessions.length ? <Empty text="No class sessions scheduled for today." /> : null}
          </div>
        </Card>

        <details className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
          <summary className="focus-ring flex cursor-pointer list-none flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-yellow-50 text-yellow-700"><CircleDollarSign className="h-5 w-5" /></div>
              <div>
                <h2 className="font-heading text-xl font-bold text-lead-navy">Outstanding students</h2>
                <p className="mt-1 text-sm text-lead-gray">View balances, unpaid meetings, and the oldest outstanding class.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-yellow-50 px-3 py-2 text-sm font-bold text-yellow-800">{plural(data.outstandingStudents.length, "student")}</span>
              <span className="text-sm font-bold text-lead-blue group-open:hidden">View details</span>
              <span className="hidden text-sm font-bold text-lead-blue group-open:inline">Hide details</span>
            </div>
          </summary>
          <div className="border-t border-slate-200 p-4 sm:p-5">
            {data.outstandingStudents.length ? (
              <div className="grid gap-3">
                {data.outstandingStudents.map((student) => (
                  <div key={student.studentId || student.name} className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-[1.2fr_0.8fr_0.9fr_auto] sm:items-center">
                    <div>
                      <p className="font-heading font-bold text-lead-navy">{student.name}</p>
                      <p className="mt-1 text-xs font-semibold text-lead-gray">{student.studentId || "No student ID"}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-lead-gray">Balance</p>
                      <p className="mt-1 font-bold text-rose-600">{formatRupiah(student.amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-lead-navy">{plural(student.meetings, "unpaid meeting")}</p>
                      <p className="mt-1 text-xs text-lead-gray">Oldest: Meeting {student.oldestMeeting} / {formatDate(student.oldestDate)}</p>
                    </div>
                    <Button asChild variant="secondary" size="sm">
                      <a href={student.studentId ? `/admin/payments?studentId=${encodeURIComponent(student.studentId)}` : "/admin/payments"}>View payments</a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="No outstanding payments. All current balances are clear." />
            )}
          </div>
        </details>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-rose-50 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
            <div><h2 className="font-heading text-2xl font-bold text-lead-navy">Action required</h2><p className="text-sm text-lead-gray">Items that may need management attention.</p></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ActionCard label="Unpaid payments" value={data.actions.unpaidCount} detail={formatRupiah(data.kpis.outstandingAmount)} href="/admin/payments" />
            <ActionCard label="Drive receipts pending" value={data.actions.pendingReceipts} detail="Paid receipts not marked uploaded" href="/admin/payments" />
            <ActionCard label="Reviews pending" value={data.actions.pendingReviews} detail="Waiting for approval" href="/admin/reviews" />
            <ActionCard label="Class details missing" value={data.actions.missingClassDetails} detail="Missing journal or teacher in period" href="/admin/attendance" />
            <ActionCard label="Sessions need attendance" value={data.actions.sessionsNeedingAttendance} detail="Scheduled classes past their time" href="/admin/sessions" />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Six-month revenue</h2>
            <p className="mt-1 text-sm text-lead-gray">Collected payments by paid date.</p>
            <div className="mt-6 grid gap-4">
              {data.trendMonths.map((month) => (
                <div key={month.key} className="grid grid-cols-[60px_1fr_auto] items-center gap-3 text-sm">
                  <span className="font-semibold text-lead-gray">{month.label}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-lead-blue" style={{ width: `${Math.max((month.revenue / maxRevenue) * 100, month.revenue ? 4 : 0)}%` }} /></div>
                  <span className="min-w-[110px] text-right font-bold text-lead-navy">{formatRupiah(month.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Six-month attendance</h2>
            <p className="mt-1 text-sm text-lead-gray">Present and late divided by non-cancelled meetings.</p>
            <div className="mt-6 grid gap-4">
              {data.trendMonths.map((month) => (
                <div key={month.key} className="grid grid-cols-[60px_1fr_45px] items-center gap-3 text-sm">
                  <span className="font-semibold text-lead-gray">{month.label}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${month.attendanceRate}%` }} /></div>
                  <span className="text-right font-bold text-lead-navy">{month.attendanceRate}%</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-lead-blue" /><h2 className="font-heading text-xl font-bold text-lead-navy">Students by course</h2></div>
            <div className="mt-5 grid gap-4">
              {data.courses.map((course) => (
                <div key={course.name}>
                  <div className="flex justify-between gap-3 text-sm"><span className="font-semibold text-lead-navy">{course.name}</span><span className="font-bold text-lead-gray">{course.count}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-lead-blue" style={{ width: `${(course.count / maxCourseCount) * 100}%` }} /></div>
                </div>
              ))}
              {!data.courses.length ? <Empty text="No registrations yet." /> : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Teacher activity</h2>
            <p className="mt-1 text-sm text-lead-gray">Meetings assigned in {data.range.label.toLowerCase()}.</p>
            <div className="mt-5 divide-y divide-slate-100">
              {data.teachers.map((teacher) => <ListRow key={teacher.name} label={teacher.name} value={plural(teacher.meetings, "meeting")} />)}
              {!data.teachers.length ? <Empty text="No teacher activity in this period." /> : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Low attendance</h2>
            <p className="mt-1 text-sm text-lead-gray">Students below 75% after at least 3 meetings.</p>
            <div className="mt-5 divide-y divide-slate-100">
              {data.actions.lowAttendance.map((student) => <ListRow key={`${student.name}-${student.counted}`} label={student.name} value={`${student.rate}% (${student.attended}/${student.counted})`} danger />)}
              {!data.actions.lowAttendance.length ? <Empty text="No students currently below the threshold." /> : null}
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <RecentCard title="Recent registrations" items={data.recent.students.map((student) => ({ title: student.studentName || "Student", detail: `${student.courseJoined || "No course"} / ${student.classType || "No class"}`, date: formatDate(student.createdAt) }))} />
          <RecentCard title="Recent payments" items={data.recent.payments.map((payment) => ({ title: `${payment.studentName || "Student"} - Meeting ${payment.meetingNumber || 0}`, detail: `${payment.status || "Unpaid"} / ${formatRupiah(payment.amountDue || 0)}`, date: formatDate(payment.meetingDate) }))} />
          <RecentCard title="Recent inquiries" items={data.recent.leads.map((lead) => ({ title: lead.name || "Unknown", detail: "Website inquiry", date: formatDate(lead.createdAt) }))} />
        </section>
      </div>
    </main>
  );
}

function Kpi({ icon: Icon, label, value, detail, color }: { icon: typeof Users; label: string; value: string; detail: string; color: string }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-lead-gray">{label}</p><p className={`mt-2 font-heading text-3xl font-extrabold ${color}`}>{value}</p><p className="mt-2 text-xs text-lead-gray">{detail}</p></div><Icon className={`h-6 w-6 ${color}`} /></div></Card>;
}

function ActionCard({ label, value, detail, href }: { label: string; value: number; detail: string; href: string }) {
  return <Card className="border-l-4 border-l-yellow-400 p-5"><p className="text-sm font-semibold text-lead-gray">{label}</p><p className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{value}</p><p className="mt-2 text-xs leading-5 text-lead-gray">{detail}</p><a href={href} className="mt-4 inline-flex text-sm font-bold text-lead-blue hover:text-blue-700">Open admin page</a></Card>;
}

function sessionStatusClassName(status: ComputedClassSessionStatus) {
  if (status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs Attendance") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-lead-blue";
}

function ListRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="flex items-center justify-between gap-3 py-3 text-sm"><span className="font-semibold text-lead-navy">{label}</span><span className={`font-bold ${danger ? "text-rose-600" : "text-lead-gray"}`}>{value}</span></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">{text}</p>;
}

function RecentCard({ title, items }: { title: string; items: Array<{ title: string; detail: string; date: string }> }) {
  return <Card className="p-5"><h2 className="font-heading text-xl font-bold text-lead-navy">{title}</h2><div className="mt-4 divide-y divide-slate-100">{items.map((item, index) => <div key={`${item.title}-${index}`} className="py-3"><p className="font-semibold text-lead-navy">{item.title}</p><p className="mt-1 text-xs text-lead-gray">{item.detail}</p><p className="mt-1 text-xs font-semibold text-lead-blue">{item.date}</p></div>)}{!items.length ? <Empty text="No records yet." /> : null}</div></Card>;
}
