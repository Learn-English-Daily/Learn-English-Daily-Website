import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { BookOpenCheck, CalendarClock, GraduationCap, Mail, MessageCircle, Users } from "lucide-react";
import type { WithId } from "mongodb";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import { getBatchesCollectionName } from "@/lib/assessments";
import { getBatchClassSessionsCollectionName, type BatchClassSessionDocument } from "@/lib/batch-class-sessions";
import { getClassSessionsCollectionName, type ClassSessionDocument } from "@/lib/class-sessions";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";
import { getMongoDb } from "@/lib/mongodb";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { employeeTeacherId } from "@/lib/teachers";

export const dynamic = "force-dynamic";

type TeacherDocument = {
  employeeId?: string;
  fullName?: string;
  preferredName?: string;
  email?: string;
  whatsapp?: string;
  username?: string;
  teacherUsername?: string;
  role?: string;
  employeeStatus?: string;
  employmentType?: string;
  workMode?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
  lastLoginAtWib?: string;
};

type AttendanceDocument = {
  teacherIds?: string[];
  meetingDate?: string;
  status?: string;
  notes?: string;
};

type BatchDocument = { teacherId?: string; status?: string };
type StudentDocument = { studentId?: string; activeBatchId?: string };

function jakartaDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function formatDate(value?: Date) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

async function getTeacherOverview() {
  const db = await getMongoDb();
  const today = jakartaDate();
  const monthKey = today.slice(0, 7);
  const [teachers, privateSessions, batchSessions, attendance, batches, batchStudents] = await Promise.all([
    db.collection<TeacherDocument>(getEmployeeOnboardingCollectionName()).find({ role: "Teacher" }).sort({ employeeStatus: 1, fullName: 1 }).toArray(),
    db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).find({ studentLifecycleClosed: { $ne: true } }).limit(5000).toArray(),
    db.collection<BatchClassSessionDocument>(getBatchClassSessionsCollectionName()).find({ status: { $ne: "Cancelled" } }).limit(5000).toArray(),
    db.collection<AttendanceDocument>(getStudentAttendanceCollectionName()).find({ meetingDate: { $regex: `^${monthKey}` } }).limit(5000).toArray(),
    db.collection<BatchDocument>(getBatchesCollectionName()).find({ status: "active" }).toArray(),
    db.collection<StudentDocument>(getStudentRegistrationCollectionName()).find({ ...getActiveStudentFilter(), activeBatchId: { $exists: true, $ne: "" } }).project({ studentId: 1, activeBatchId: 1 }).toArray()
  ]);

  return teachers.map((teacher) => {
    const teacherId = employeeTeacherId(teacher._id);
    const teacherPrivateSessions = privateSessions.filter((session) => session.teacherIds?.includes(teacherId));
    const teacherBatchSessions = batchSessions.filter((session) => session.teacherId === teacherId);
    const teacherBatches = batches.filter((batch) => batch.teacherId === teacherId);
    const batchIds = new Set(teacherBatches.map((batch) => batch._id.toString()));
    const assignedStudents = new Set([
      ...teacherPrivateSessions.map((session) => session.studentId || "").filter(Boolean),
      ...batchStudents.filter((student) => batchIds.has(student.activeBatchId || "")).map((student) => student.studentId || "").filter(Boolean)
    ]);
    const completedThisMonth = attendance.filter((record) => record.teacherIds?.includes(teacherId) && (record.status === "Present" || record.status === "Late")).length
      + teacherBatchSessions.filter((session) => session.status === "Completed" && session.sessionDate.startsWith(monthKey)).length;
    const needsAttendance = teacherPrivateSessions.filter((session) => Boolean(session.sessionDate && session.sessionDate <= today) && session.status !== "Completed").length
      + teacherBatchSessions.filter((session) => session.sessionDate <= today && session.status === "Scheduled" && !session.attendanceMarked).length;
    const upcoming = teacherPrivateSessions.filter((session) => Boolean(session.sessionDate && session.sessionDate >= today) && session.status !== "Completed").length
      + teacherBatchSessions.filter((session) => session.sessionDate >= today && session.status === "Scheduled").length;
    const missingJournals = attendance.filter((record) => record.teacherIds?.includes(teacherId) && (record.status === "Present" || record.status === "Late") && !record.notes?.trim()).length;

    return {
      id: teacherId,
      employeeId: teacher.employeeId || "Not assigned",
      name: teacher.preferredName || teacher.fullName || "Teacher",
      email: teacher.email || "",
      whatsapp: teacher.whatsapp || "",
      username: teacher.username || teacher.teacherUsername || "Not configured",
      status: teacher.employeeStatus || "Active",
      employmentType: teacher.employmentType || "Not recorded",
      workMode: teacher.workMode || "Not recorded",
      joinedAt: teacher.createdAt,
      lastLogin: teacher.lastLoginAtWib || formatDate(teacher.lastLoginAt),
      assignedStudents: assignedStudents.size,
      activeBatches: teacherBatches.length,
      completedThisMonth,
      needsAttendance,
      upcoming,
      missingJournals
    };
  });
}

export default async function AdminTeachersPage() {
  noStore();
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!isAdminConfigured() || !isValidAdminSession(session)) {
    return <main className="grid min-h-screen place-items-center bg-lead-soft px-4 py-10"><Card className="w-full max-w-md p-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p><h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Teacher overview</h1><p className="mt-3 text-lead-gray">Sign in with the main admin account to review teacher information.</p><AdminLoginForm /></Card></main>;
  }
  if (isGroupStudentAdminSession(session)) redirect("/admin/batches");

  const [teachers, admin] = await Promise.all([getTeacherOverview(), getAuthenticatedAdmin()]);
  const activeTeachers = teachers.filter((teacher) => teacher.status.toLowerCase() !== "inactive");
  const totalStudents = activeTeachers.reduce((sum, teacher) => sum + teacher.assignedStudents, 0);
  const totalNeedsAttendance = activeTeachers.reduce((sum, teacher) => sum + teacher.needsAttendance, 0);
  const totalMissingJournals = activeTeachers.reduce((sum, teacher) => sum + teacher.missingJournals, 0);

  return <main className="min-h-screen bg-lead-soft">
    <AdminPageHeader active="teachers" title="Teachers" description="Teacher profiles, current workload, operational follow-ups, and recent activity for staffing decisions." userName={admin?.name} username={admin?.username} logoutAction={logoutAdmin} />
    <section className="container-shell grid gap-6 py-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Summary icon={GraduationCap} label="Active teachers" value={activeTeachers.length} />
        <Summary icon={Users} label="Students in schedule" value={totalStudents} />
        <Summary icon={CalendarClock} label="Needs attendance" value={totalNeedsAttendance} alert={totalNeedsAttendance > 0} />
        <Summary icon={BookOpenCheck} label="Missing journals" value={totalMissingJournals} alert={totalMissingJournals > 0} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {teachers.map((teacher) => <Card key={teacher.id} className="overflow-hidden">
          <div className="border-b border-blue-100 bg-blue-50/60 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-blue">{teacher.employeeId}</p><h2 className="mt-1 font-heading text-2xl font-extrabold text-lead-navy">{teacher.name}</h2><p className="mt-1 text-sm text-lead-gray">@{teacher.username} · {teacher.employmentType} · {teacher.workMode}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${teacher.status.toLowerCase() === "inactive" ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>{teacher.status}</span></div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">{teacher.email ? <a className="inline-flex items-center gap-2 font-semibold text-lead-blue" href={`mailto:${teacher.email}`}><Mail className="h-4 w-4" />{teacher.email}</a> : null}{teacher.whatsapp ? <a className="inline-flex items-center gap-2 font-semibold text-emerald-700" href={`https://wa.me/${teacher.whatsapp.replace(/\D/g, "")}`}><MessageCircle className="h-4 w-4" />{teacher.whatsapp}</a> : null}</div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Students in schedule" value={teacher.assignedStudents} /><Metric label="Active batches" value={teacher.activeBatches} /><Metric label="Upcoming" value={teacher.upcoming} /><Metric label="Completed this month" value={teacher.completedThisMonth} /><Metric label="Needs attendance" value={teacher.needsAttendance} alert={teacher.needsAttendance > 0} /><Metric label="Missing journals this month" value={teacher.missingJournals} alert={teacher.missingJournals > 0} /></div>
            <div className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-4 text-sm text-lead-gray sm:grid-cols-2"><p><span className="font-bold text-lead-navy">Joined:</span> {formatDate(teacher.joinedAt)}</p><p><span className="font-bold text-lead-navy">Last portal login:</span> {teacher.lastLogin}</p></div>
          </div>
        </Card>)}
        {!teachers.length ? <Card className="p-8 text-center text-lead-gray">No teacher employee records found.</Card> : null}
      </div>
    </section>
  </main>;
}

function Summary({ icon: Icon, label, value, alert = false }: { icon: typeof Users; label: string; value: number; alert?: boolean }) {
  return <Card className="flex items-center gap-4 p-5"><span className={`grid h-11 w-11 place-items-center rounded-xl ${alert ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-lead-blue"}`}><Icon className="h-5 w-5" /></span><div><p className="font-heading text-2xl font-extrabold text-lead-navy">{value}</p><p className="text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">{label}</p></div></Card>;
}

function Metric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return <div className={`rounded-xl p-3 ${alert ? "bg-amber-50" : "bg-slate-50"}`}><p className={`font-heading text-xl font-extrabold ${alert ? "text-amber-700" : "text-lead-navy"}`}>{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-lead-gray">{label}</p></div>;
}
