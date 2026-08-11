import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { BookOpenCheck, CalendarCheck, CalendarClock, Search, UserRoundCheck } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { getAttendanceReminders, type AttendanceReminder } from "@/lib/attendance-reminders";
import { getStudentAttendanceCollectionName, type AttendanceStatus } from "@/lib/attendance";
import { getClosedBillingPeriodKeys, getRecordBillingPeriod } from "@/lib/billing-periods";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument,
  type ComputedClassSessionStatus
} from "@/lib/class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { getAvailableTeachers, type TeacherOption } from "@/lib/teachers";

export const dynamic = "force-dynamic";

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  parentName?: string;
  whatsapp?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
};

type Student = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  courseJoined: string;
  classType: string;
  classMode: string;
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
  billingPeriod?: string;
  status?: AttendanceStatus;
  notes?: string | null;
  teacherIds?: string[];
  teacherNames?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

type Attendance = {
  id: string;
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  meetingNumber: number;
  meetingDate: string;
  billingPeriod: string;
  status: AttendanceStatus;
  classMode: string;
  hasJournal: boolean;
  teacherIds: string[];
  teacherNames: string[];
};

type TodaySession = {
  id: string;
  studentName: string;
  meetingNumber: number;
  scheduledAt: string;
  teacherNames: string[];
  status: ComputedClassSessionStatus;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getIndividualStudentFilter(): Filter<StudentDocument> {
  return { $and: [getActiveStudentFilter(), { classType: { $ne: "Basic Group" } }] };
}

function jakartaDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(new Date());
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function formatDateTime(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function statusClassName(status: AttendanceStatus | ComputedClassSessionStatus) {
  if (status === "Present" || status === "Completed") return "bg-emerald-50 text-emerald-700";
  if (status === "Absent" || status === "Needs Attendance") return "bg-rose-50 text-rose-700";
  if (status === "Late") return "bg-yellow-50 text-yellow-800";
  return "bg-blue-50 text-lead-blue";
}

function mapAttendance(doc: WithId<AttendanceDocument>): Attendance {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Student",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    meetingNumber: doc.meetingNumber || 0,
    meetingDate: doc.meetingDate || "",
    billingPeriod: getRecordBillingPeriod(doc).billingPeriod,
    status: doc.status || "Present",
    classMode: doc.classMode || "Online",
    hasJournal: Boolean(doc.notes?.trim()),
    teacherIds: doc.teacherIds || [],
    teacherNames: doc.teacherNames || []
  };
}

async function getStudents(query: string): Promise<Student[]> {
  const db = await getMongoDb();
  const search = query.trim();
  const searchFilter: Filter<StudentDocument> = search
    ? {
        $or: ["studentId", "studentName", "parentName", "whatsapp", "courseJoined"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" }
        }))
      }
    : {};
  const filter = search ? { $and: [getIndividualStudentFilter(), searchFilter] } : getIndividualStudentFilter();
  const docs = (await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .find(filter)
    .sort({ studentId: 1, studentName: 1 })
    .limit(300)
    .toArray()) as WithId<StudentDocument>[];

  return docs.map((doc) => ({
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "Online"
  }));
}

async function getSelectedStudent(studentId: string) {
  if (!studentId) return null;
  const db = await getMongoDb();
  const doc = await db.collection<StudentDocument>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId }, getIndividualStudentFilter()]
  });
  if (!doc) return null;

  return {
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "Online"
  } satisfies Student;
}

async function getAttendance({
  studentId,
  status,
  teacherId,
  month,
  showArchived,
  closedPeriods
}: {
  studentId: string;
  status: string;
  teacherId: string;
  month: string;
  showArchived: boolean;
  closedPeriods: Set<string>;
}) {
  if (!studentId) return [];
  const filter: Filter<AttendanceDocument> = {
    studentId,
    ...(status ? { status: status as AttendanceStatus } : {}),
    ...(teacherId ? { teacherIds: teacherId } : {}),
    ...(month ? { meetingDate: { $regex: `^${escapeRegex(month)}` } } : {})
  };
  const db = await getMongoDb();
  const docs = (await db
    .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
    .find(filter)
    .sort({ meetingDate: -1, meetingNumber: -1, updatedAt: -1 })
    .limit(500)
    .toArray()) as WithId<AttendanceDocument>[];

  return docs
    .filter((doc) => {
      const period = getRecordBillingPeriod(doc).billingPeriod;
      return showArchived ? closedPeriods.has(period) : !closedPeriods.has(period);
    })
    .map(mapAttendance);
}

async function getOperationsData(db: Awaited<ReturnType<typeof getMongoDb>>) {
  const today = jakartaDateKey();
  const missingJournalFilter: Filter<AttendanceDocument> = {
    status: { $in: ["Present", "Late"] },
    $or: [{ notes: { $exists: false } }, { notes: null }, { notes: "" }, { notes: { $regex: "^\\s*$" } }]
  };
  const [reminders, sessionDocs, attendanceDocs, todayAttendanceDocs, missingJournalDocs, missingJournalCount] = await Promise.all([
    getAttendanceReminders(db, { limit: 50 }),
    db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).find({ sessionDate: today }).sort({ scheduledAt: 1 }).limit(100).toArray(),
    db
      .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
      .find({})
      .project({ studentId: 1, meetingNumber: 1, meetingDate: 1, billingMonth: 1, billingYear: 1, billingPeriod: 1 })
      .limit(20000)
      .toArray(),
    db
      .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
      .find({ meetingDate: today })
      .sort({ meetingDate: 1, meetingNumber: 1 })
      .limit(200)
      .toArray() as Promise<WithId<AttendanceDocument>[]>,
    db
      .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
      .find(missingJournalFilter)
      .sort({ meetingDate: -1, updatedAt: -1 })
      .limit(50)
      .toArray() as Promise<WithId<AttendanceDocument>[]>,
    db.collection<AttendanceDocument>(getStudentAttendanceCollectionName()).countDocuments(missingJournalFilter)
  ]);
  const attendanceKeys = new Set(
    attendanceDocs.map((doc) => `${doc.studentId || ""}:${doc.meetingNumber || 0}:${getRecordBillingPeriod(doc).billingPeriod}`)
  );
  const todaySessions: TodaySession[] = sessionDocs.map((doc) => {
    const period = getRecordBillingPeriod(doc);
    const hasAttendance = attendanceKeys.has(`${doc.studentId || ""}:${doc.meetingNumber || 0}:${period.billingPeriod}`);
    return {
      id: doc._id.toString(),
      studentName: doc.studentName || "Student",
      meetingNumber: doc.meetingNumber || 0,
      scheduledAt: doc.scheduledAt || "",
      teacherNames: doc.teacherNames || [],
      status: getComputedClassSessionStatus({
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        endsAt: doc.endsAt,
        hasAttendance
      })
    };
  });
  const scheduledKeys = new Set(sessionDocs.map((doc) => `${doc.studentId || ""}:${doc.meetingNumber || 0}`));
  for (const record of todayAttendanceDocs) {
    const key = `${record.studentId || ""}:${record.meetingNumber || 0}`;
    if (scheduledKeys.has(key)) continue;
    todaySessions.push({
      id: `attendance-${record._id.toString()}`,
      studentName: record.studentName || "Student",
      meetingNumber: record.meetingNumber || 0,
      scheduledAt: record.meetingDate ? `${record.meetingDate}T00:00:00+07:00` : "",
      teacherNames: record.teacherNames || [],
      status: "Completed"
    });
  }
  const missingJournals = missingJournalDocs.map(mapAttendance);
  const recentDocs = (await db
    .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
    .find({})
    .sort({ meetingDate: -1, updatedAt: -1 })
    .limit(12)
    .toArray()) as WithId<AttendanceDocument>[];

  return { reminders, todaySessions, missingJournals, missingJournalCount, recentAttendance: recentDocs.map(mapAttendance) };
}

export default async function AdminAttendancePage({
  searchParams
}: {
  searchParams?: Promise<{
    q?: string | string[];
    studentId?: string | string[];
    status?: string | string[];
    teacherId?: string | string[];
    month?: string | string[];
    view?: string | string[];
  }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const params = await searchParams;
  const query = firstParam(params?.q);
  const studentId = firstParam(params?.studentId);
  const status = firstParam(params?.status);
  const teacherId = firstParam(params?.teacherId);
  const month = firstParam(params?.month);
  const showArchived = firstParam(params?.view) === "history";

  if (!isAdminConfigured()) {
    return (
      <main className="min-h-screen bg-lead-soft px-4 py-10">
        <Card className="mx-auto max-w-xl p-8">
          <h1 className="font-heading text-3xl font-extrabold text-lead-navy">Admin access is not configured</h1>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Attendance monitoring</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to monitor attendance completion and student records.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const db = await getMongoDb();
  const [students, selectedStudent, teachers, closedPeriods, operations, admin] = await Promise.all([
    getStudents(query),
    getSelectedStudent(studentId),
    getAvailableTeachers(db),
    getClosedBillingPeriodKeys(db),
    getOperationsData(db),
    getAuthenticatedAdmin()
  ]);
  const attendance = selectedStudent
    ? await getAttendance({ studentId, status, teacherId, month, showArchived, closedPeriods })
    : [];
  const todayCompleted = operations.todaySessions.filter((session) => session.status === "Completed").length;

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="attendance"
        title="Attendance monitoring"
        description="Read-only oversight of teacher attendance, missing journals, and student history. Teachers own attendance entry."
        userName={admin?.name}
        logoutAction={logoutAdmin}
      />

      <section className="container-shell grid gap-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={CalendarClock} label="Attendance Needed" value={operations.reminders.length} helper="Overdue scheduled classes" tone="rose" />
          <KpiCard icon={CalendarCheck} label="Today's Classes" value={operations.todaySessions.length} helper={`${todayCompleted} attendance completed`} tone="blue" />
          <KpiCard icon={BookOpenCheck} label="Missing Journals" value={operations.missingJournalCount} helper="Present or late records" tone="amber" />
          <KpiCard icon={UserRoundCheck} label="Completed Today" value={todayCompleted} helper="Attendance submitted" tone="green" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <OperationsList title="Attendance Needed" helper="Classes past their end time without attendance." empty="No overdue attendance." tone="rose">
            {operations.reminders.map((record) => <ReminderRow key={record.id} record={record} />)}
          </OperationsList>
          <OperationsList title="Today's Classes" helper="Live status for classes scheduled today in WIB." empty="No classes scheduled today." tone="blue">
            {operations.todaySessions.map((session) => (
              <CompactRow
                key={session.id}
                title={`${session.studentName} / Meeting ${session.meetingNumber}`}
                detail={`${formatDateTime(session.scheduledAt)}${session.teacherNames.length ? ` / ${session.teacherNames.join(", ")}` : ""}`}
                badge={session.status}
                badgeClassName={statusClassName(session.status)}
              />
            ))}
          </OperationsList>
          <OperationsList title="Missing Journals" helper="Attendance exists, but the teacher journal is empty." empty="No missing journals." tone="amber">
            {operations.missingJournals.map((record) => (
              <CompactRow
                key={record.id}
                title={`${record.studentName} / Meeting ${record.meetingNumber}`}
                detail={`${formatDate(record.meetingDate)}${record.teacherNames.length ? ` / ${record.teacherNames.join(", ")}` : " / Teacher not assigned"}`}
                badge={record.status}
                badgeClassName={statusClassName(record.status)}
              />
            ))}
          </OperationsList>
          <OperationsList title="Recent Attendance" helper="Latest teacher-submitted attendance records." empty="No attendance records yet." tone="green">
            {operations.recentAttendance.map((record) => (
              <CompactRow
                key={record.id}
                title={`${record.studentName} / Meeting ${record.meetingNumber}`}
                detail={`${formatDate(record.meetingDate)}${record.teacherNames.length ? ` / ${record.teacherNames.join(", ")}` : ""}`}
                badge={record.status}
                badgeClassName={statusClassName(record.status)}
              />
            ))}
          </OperationsList>
        </div>

        <Card className="p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-extrabold text-lead-navy">Student Attendance History</h2>
              <p className="mt-1 text-sm text-lead-gray">Search and inspect records without changing teacher submissions.</p>
            </div>
            <span className="w-fit rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase text-lead-gray">Read only</span>
          </div>
          <form action="/admin/attendance" className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <label className="relative md:col-span-2">
              <span className="sr-only">Search students</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lead-gray" />
              <input name="q" defaultValue={query} placeholder="Student ID, name, parent..." className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm text-lead-navy" />
            </label>
            <input type="hidden" name="studentId" value={studentId} />
            <input type="hidden" name="view" value={showArchived ? "history" : "active"} />
            <select name="status" defaultValue={status} aria-label="Attendance status" className="focus-ring h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy">
              <option value="">All statuses</option>
              {(["Present", "Late", "Absent", "Cancelled"] as AttendanceStatus[]).map((option) => <option key={option}>{option}</option>)}
            </select>
            <select name="teacherId" defaultValue={teacherId} aria-label="Teacher" className="focus-ring h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy">
              <option value="">All teachers</option>
              {teachers.map((teacher: TeacherOption) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
            <input name="month" type="month" defaultValue={month} aria-label="Attendance month" className="focus-ring h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm text-lead-navy" />
            <Button type="submit" size="lg"><Search className="h-4 w-4" />Apply Filters</Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant={showArchived ? "secondary" : "primary"}>
              <a href={historyHref({ studentId, query, status, teacherId, month, archived: false })}>Current Records</a>
            </Button>
            <Button asChild size="sm" variant={showArchived ? "primary" : "secondary"}>
              <a href={historyHref({ studentId, query, status, teacherId, month, archived: true })}>Closed Months</a>
            </Button>
          </div>
        </Card>

        <div className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="p-5 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Students</h2>
            <p className="mt-1 text-xs text-lead-gray">Individual students only. Group attendance remains in batches.</p>
            <div className="mt-4 grid gap-3">
              {students.map((student) => (
                <a
                  key={student.id}
                  href={studentHref(student.studentId, { query, status, teacherId, month, showArchived })}
                  className={`focus-ring rounded-lg border p-4 transition hover:border-lead-blue hover:bg-blue-50 ${selectedStudent?.studentId === student.studentId ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{student.studentId}</span>
                    <span className="font-heading font-bold text-lead-navy">{student.studentName}</span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-lead-gray">{student.courseJoined} / {student.classMode}</p>
                </a>
              ))}
              {!students.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No students found.</p> : null}
            </div>
          </Card>

          <div className="grid gap-6">
            {selectedStudent ? (
              <>
                <Card className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-heading text-2xl font-bold text-lead-navy">{selectedStudent.studentName}</h2>
                        <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{selectedStudent.studentId}</span>
                      </div>
                      <p className="mt-2 text-sm text-lead-gray">{selectedStudent.courseJoined} / {selectedStudent.classType} / {selectedStudent.classMode}</p>
                    </div>
                    <p className="text-sm font-bold text-lead-blue">{attendance.length} filtered record{attendance.length === 1 ? "" : "s"}</p>
                  </div>
                </Card>
                <Card className="p-5">
                  <h2 className="font-heading text-xl font-bold text-lead-navy">{showArchived ? "Closed-month history" : "Current attendance records"}</h2>
                  <div className="mt-5 grid gap-3">
                    {attendance.map((record) => <AttendanceRow key={record.id} record={record} />)}
                    {!attendance.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No attendance matches these filters.</p> : null}
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <h2 className="font-heading text-2xl font-bold text-lead-navy">Choose a student</h2>
                <p className="mt-3 text-lead-gray">Select a student to inspect their attendance history.</p>
              </Card>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ icon: Icon, label, value, helper, tone }: { icon: typeof CalendarCheck; label: string; value: number; helper: string; tone: "rose" | "blue" | "amber" | "green" }) {
  const tones = { rose: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-lead-blue", amber: "bg-yellow-50 text-yellow-800", green: "bg-emerald-50 text-emerald-700" };
  return <Card className="p-5"><div className={`grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></div><p className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">{value}</p><p className="mt-1 text-sm font-bold text-lead-navy">{label}</p><p className="mt-1 text-xs text-lead-gray">{helper}</p></Card>;
}

function OperationsList({ title, helper, empty, tone, children }: { title: string; helper: string; empty: string; tone: "rose" | "blue" | "amber" | "green"; children: React.ReactNode }) {
  const border = { rose: "border-rose-100", blue: "border-blue-100", amber: "border-yellow-100", green: "border-emerald-100" }[tone];
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <Card className={`overflow-hidden ${border}`}><div className="border-b border-slate-100 p-5"><h2 className="font-heading text-xl font-bold text-lead-navy">{title}</h2><p className="mt-1 text-xs leading-5 text-lead-gray">{helper}</p></div><div className="max-h-80 overflow-y-auto p-4"><div className="grid gap-3">{hasItems ? children : <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">{empty}</p>}</div></div></Card>;
}

function ReminderRow({ record }: { record: AttendanceReminder }) {
  return <CompactRow title={`${record.studentName} / Meeting ${record.meetingNumber}`} detail={`${formatDateTime(record.scheduledAt)}${record.teacherNames.length ? ` / ${record.teacherNames.join(", ")}` : ""}`} badge="Needed" badgeClassName="bg-rose-50 text-rose-700" />;
}

function CompactRow({ title, detail, badge, badgeClassName }: { title: string; detail: string; badge: string; badgeClassName: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-lead-navy">{title}</p><span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase ${badgeClassName}`}>{badge}</span></div><p className="mt-1 text-xs leading-5 text-lead-gray">{detail}</p></div>;
}

function AttendanceRow({ record }: { record: Attendance }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-heading font-bold text-lead-navy">Meeting {record.meetingNumber}</h3><span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(record.status)}`}>{record.status}</span><span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">{record.classMode}</span></div><p className="mt-2 text-sm text-lead-gray">{formatDate(record.meetingDate)}</p><p className="mt-1 text-sm text-lead-gray"><span className="font-bold text-lead-navy">Teachers:</span> {record.teacherNames.join(", ") || "Not assigned"}</p></div><span className={`w-fit rounded-lg px-3 py-1 text-xs font-bold ${record.hasJournal ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-800"}`}>{record.hasJournal ? "Journal complete" : "Journal missing"}</span></div></div>;
}

function historyHref({ studentId, query, status, teacherId, month, archived }: { studentId: string; query: string; status: string; teacherId: string; month: string; archived: boolean }) {
  const params = new URLSearchParams();
  if (studentId) params.set("studentId", studentId);
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (teacherId) params.set("teacherId", teacherId);
  if (month) params.set("month", month);
  if (archived) params.set("view", "history");
  return `/admin/attendance${params.size ? `?${params}` : ""}`;
}

function studentHref(studentId: string, filters: { query: string; status: string; teacherId: string; month: string; showArchived: boolean }) {
  return historyHref({ studentId, query: filters.query, status: filters.status, teacherId: filters.teacherId, month: filters.month, archived: filters.showArchived });
}
