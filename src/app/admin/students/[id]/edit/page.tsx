import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft, Save, UserRoundCheck } from "lucide-react";
import { ObjectId, type WithId } from "mongodb";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { changeStudentStatus, updateStudentRegistration } from "@/app/admin/students/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentAgeLabel } from "@/lib/student-age";
import { getClassSessionsCollectionName } from "@/lib/class-sessions";
import { getAttendanceReminders } from "@/lib/attendance-reminders";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import { getStudentPaymentsCollectionName } from "@/lib/payments";
import {
  classTypeOptions,
  classModeOptions,
  courseJoinedOptions,
  englishLevelOptions,
  getStudentRegistrationCollectionName,
  learningGoalOptions,
  studentStatusOptions,
  type StudentStatus,
  type StudentStatusHistoryEntry
} from "@/lib/student-registration";
import type { CourseHistoryEntry } from "@/lib/student-registration";

export const dynamic = "force-dynamic";

type StudentRegistrationDocument = {
  studentId?: string;
  previousStudentId?: string;
  upgradedFromTrial?: boolean;
  studentName?: string;
  whatsapp?: string;
  email?: string;
  parentName?: string;
  age?: string;
  dateOfBirth?: string;
  grade?: string;
  preferredSchedule?: string;
  preferredTime?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  englishLevel?: string;
  learningGoal?: string;
  countryCity?: string;
  locale?: string;
  courseHistory?: CourseHistoryEntry[];
  studentStatus?: StudentStatus;
  statusHistory?: StudentStatusHistoryEntry[];
  createdAt?: Date;
  updatedAt?: Date;
};

type StudentRegistration = {
  id: string;
  studentId: string;
  previousStudentId: string;
  upgradedFromTrial: boolean;
  studentName: string;
  whatsapp: string;
  email: string;
  parentName: string;
  age: string;
  dateOfBirth: string;
  grade: string;
  preferredSchedule: string;
  preferredTime: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  englishLevel: string;
  learningGoal: string;
  countryCity: string;
  locale: string;
  createdAt: string;
  updatedAt: string;
  courseHistory: Array<{
    fromCourse: string;
    toCourse: string;
    changedAt: string;
    changedByName: string;
    changedByUsername: string;
    source: CourseHistoryEntry["source"];
  }>;
  studentStatus: StudentStatus;
  statusHistory: Array<{
    fromStatus: StudentStatus;
    toStatus: StudentStatus;
    effectiveDate: string;
    note: string;
    changedAt: string;
    changedByName: string;
    changedByUsername: string;
  }>;
};

async function getStudentRegistration(id: string): Promise<StudentRegistration | null> {
  if (!ObjectId.isValid(id)) return null;

  const db = await getMongoDb();
  const doc = (await db
    .collection<StudentRegistrationDocument>(getStudentRegistrationCollectionName())
    .findOne({ _id: new ObjectId(id) })) as WithId<StudentRegistrationDocument> | null;

  if (!doc) return null;

  return {
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    previousStudentId: doc.previousStudentId || "",
    upgradedFromTrial: doc.upgradedFromTrial || false,
    studentName: doc.studentName || "",
    whatsapp: doc.whatsapp || "",
    email: doc.email || "",
    parentName: doc.parentName || "",
    age: doc.age || "",
    dateOfBirth: doc.dateOfBirth || "",
    grade: doc.grade || "",
    preferredSchedule: doc.preferredSchedule || "",
    preferredTime: doc.preferredTime || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "",
    englishLevel: doc.englishLevel || "",
    learningGoal: doc.learningGoal || "",
    countryCity: doc.countryCity || "",
    locale: doc.locale || "en",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
    courseHistory: (doc.courseHistory || [])
      .map((entry) => ({
        fromCourse: entry.fromCourse || "",
        toCourse: entry.toCourse || "",
        changedAt: entry.changedAt ? new Date(entry.changedAt).toISOString() : "",
        changedByName: entry.changedByName || "System",
        changedByUsername: entry.changedByUsername || "",
        source: entry.source || "data-backfill"
      }))
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt)),
    studentStatus: doc.studentStatus || "Active",
    statusHistory: (doc.statusHistory || [])
      .map((entry) => ({
        fromStatus: entry.fromStatus || "Active",
        toStatus: entry.toStatus || "Inactive",
        effectiveDate: entry.effectiveDate || "",
        note: entry.note || "",
        changedAt: entry.changedAt ? new Date(entry.changedAt).toISOString() : "",
        changedByName: entry.changedByName || "System",
        changedByUsername: entry.changedByUsername || ""
      }))
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
  };
}

async function getLifecycleWarnings(studentId: string) {
  if (!studentId) return { futureSessions: 0, unpaidPayments: 0, attendanceNeeded: 0, missingJournals: 0 };
  const db = await getMongoDb();
  const [futureSessions, unpaidPayments, reminders, missingJournals] = await Promise.all([
    db.collection(getClassSessionsCollectionName()).countDocuments({ studentId, status: { $ne: "Completed" } }),
    db.collection(getStudentPaymentsCollectionName()).countDocuments({ studentId, status: "Unpaid" }),
    getAttendanceReminders(db),
    db.collection(getStudentAttendanceCollectionName()).countDocuments({
      studentId,
      status: { $in: ["Present", "Late"] },
      $or: [{ notes: { $exists: false } }, { notes: null }, { notes: "" }, { notes: { $regex: "^\\s*$" } }]
    })
  ]);
  return { futureSessions, unpaidPayments, attendanceNeeded: reminders.filter((record) => record.studentId === studentId).length, missingJournals };
}

function formatDate(value: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export default async function EditStudentRegistrationPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string | string[]; statusUpdated?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const isAuthenticated = isValidAdminSession(session);
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const updated = Array.isArray(resolvedSearchParams?.updated)
    ? resolvedSearchParams?.updated[0] === "1"
    : resolvedSearchParams?.updated === "1";
  const statusUpdated = Array.isArray(resolvedSearchParams?.statusUpdated)
    ? resolvedSearchParams.statusUpdated[0] === "1"
    : resolvedSearchParams?.statusUpdated === "1";

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
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Edit student registration</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to update registered student details.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const registration = await getStudentRegistration(resolvedParams.id);

  if (!registration) {
    notFound();
  }
  if (isGroupStudentAdminSession(session) && registration.classType !== "Basic Group") {
    notFound();
  }
  const lifecycleWarnings = await getLifecycleWarnings(registration.studentId);
  const groupOnly = isGroupStudentAdminSession(session);
  const todayWib = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(new Date());

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-shell flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Edit student registration</h1>
            <p className="mt-2 text-sm text-lead-gray">Update contact, course, schedule, and learning details.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <a href="/admin/students">
                <ArrowLeft className="h-4 w-4" />
                Back to Registrations
              </a>
            </Button>
            <form action={logoutAdmin}>
              <Button type="submit" variant="primary">Logout</Button>
            </form>
          </div>
        </div>
      </header>

      <section className="container-shell py-8">
        <Card className="p-5 md:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-heading text-2xl font-bold text-lead-navy">{registration.studentName || "Student"}</h2>
                {registration.studentId ? (
                  <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{registration.studentId}</span>
                ) : null}
                {registration.upgradedFromTrial && registration.previousStudentId ? (
                  <span className="rounded-lg bg-yellow-50 px-3 py-1 text-xs font-bold uppercase text-yellow-800">
                    Upgraded from {registration.previousStudentId}
                  </span>
                ) : null}
                <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${registration.studentStatus === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                  {registration.studentStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-lead-gray">Created: {formatDate(registration.createdAt)} / Updated: {formatDate(registration.updatedAt)}</p>
            </div>
            {updated ? (
              <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Saved successfully</p>
            ) : null}
            {statusUpdated ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Student status updated</p> : null}
          </div>

          <form action={updateStudentRegistration} className="mt-6 grid gap-5 md:grid-cols-2">
            <input type="hidden" name="id" value={registration.id} />
            <Field label="Student ID">
              <input value={registration.studentId || "Not assigned"} readOnly className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-lead-gray" />
            </Field>
            <Field label="Student Name">
              <input name="studentName" required defaultValue={registration.studentName} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="WhatsApp Number">
              <input name="whatsapp" required defaultValue={registration.whatsapp} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="Email Address">
              <input name="email" type="email" required defaultValue={registration.email} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="Parent Name">
              <input name="parentName" required defaultValue={registration.parentName} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="Date of Birth">
              <input name="dateOfBirth" type="date" max={todayWib} defaultValue={registration.dateOfBirth} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
              <span className="text-xs font-medium text-lead-gray">
                Current age: {getStudentAgeLabel(registration.dateOfBirth, registration.age)}{!registration.dateOfBirth ? ". Add DOB when available; the stored legacy age is preserved." : ""}
              </span>
            </Field>
            <Field label="Grade">
              <input name="grade" required defaultValue={registration.grade} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="Preferred Schedule">
              <input name="preferredSchedule" required defaultValue={registration.preferredSchedule} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="Preferred Time">
              <input name="preferredTime" required defaultValue={registration.preferredTime} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="Course Joined">
              <select name="courseJoined" required defaultValue={registration.courseJoined} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                {courseJoinedOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Class Type">
              <select name="classType" required defaultValue={registration.classType} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                {(groupOnly ? ["Basic Group"] : classTypeOptions).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Class Mode">
              <select name="classMode" required defaultValue={registration.classMode || "Online"} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                {classModeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Current English Level">
              <select name="englishLevel" required defaultValue={registration.englishLevel} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                {englishLevelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Main Learning Goal">
              <select name="learningGoal" required defaultValue={registration.learningGoal} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                {learningGoalOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            <Field label="Country/City">
              <input name="countryCity" defaultValue={registration.countryCity} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
            </Field>
            <Field label="Language">
              <select name="locale" required defaultValue={registration.locale} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </Field>
            <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:justify-end">
              <Button asChild variant="secondary" size="lg">
                <a href="/admin/students">Cancel</a>
              </Button>
              <Button type="submit" size="lg">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-lead-blue"><UserRoundCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="font-heading text-xl font-bold text-lead-navy">Student Lifecycle</h2>
                <p className="mt-1 text-sm text-lead-gray">Pause, complete, withdraw, deactivate, or reactivate this student without deleting their records.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <p className={`rounded-lg p-3 text-sm font-semibold ${lifecycleWarnings.futureSessions ? "bg-yellow-50 text-yellow-800" : "bg-slate-50 text-lead-gray"}`}>
                {lifecycleWarnings.futureSessions} unfinished scheduled class{lifecycleWarnings.futureSessions === 1 ? "" : "es"}
              </p>
              <p className={`rounded-lg p-3 text-sm font-semibold ${lifecycleWarnings.unpaidPayments ? "bg-yellow-50 text-yellow-800" : "bg-slate-50 text-lead-gray"}`}>
                {lifecycleWarnings.unpaidPayments} unpaid payment{lifecycleWarnings.unpaidPayments === 1 ? "" : "s"} (kept visible to Finance)
              </p>
              <p className={`rounded-lg p-3 text-sm font-semibold ${lifecycleWarnings.attendanceNeeded ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-lead-gray"}`}>
                {lifecycleWarnings.attendanceNeeded} overdue attendance record{lifecycleWarnings.attendanceNeeded === 1 ? "" : "s"}
              </p>
              <p className={`rounded-lg p-3 text-sm font-semibold ${lifecycleWarnings.missingJournals ? "bg-yellow-50 text-yellow-800" : "bg-slate-50 text-lead-gray"}`}>
                {lifecycleWarnings.missingJournals} missing journal{lifecycleWarnings.missingJournals === 1 ? "" : "s"}
              </p>
            </div>
            <form action={changeStudentStatus} className="mt-4 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <input type="hidden" name="id" value={registration.id} />
              <Field label="New Status">
                <select name="studentStatus" required defaultValue={registration.studentStatus === "Active" ? "Completed" : "Active"} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                  {studentStatusOptions.filter((status) => status !== registration.studentStatus).map((status) => <option key={status}>{status}</option>)}
                </select>
              </Field>
              <Field label="Effective Date (WIB)">
                <input name="effectiveDate" type="date" required defaultValue={todayWib} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
              </Field>
              <label className="grid gap-2 text-sm font-semibold text-lead-navy md:col-span-2">
                Reason / Note
                <textarea name="statusNote" rows={3} placeholder="Example: Completed Fluent English course" className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy" />
              </label>
              <p className="text-xs leading-5 text-lead-gray md:col-span-2">Changing away from Active closes unfinished scheduled classes but preserves attendance, journals, payments, receipts, Parent QR access, and Student ID.</p>
              <Button type="submit" className="md:col-span-2 md:w-fit">Update Student Status</Button>
            </form>
            <div className="mt-4 grid gap-3">
              {registration.statusHistory.map((entry, index) => (
                <div key={`${entry.changedAt}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-heading font-bold text-lead-navy">{entry.fromStatus} <span className="px-1 text-lead-blue">to</span> {entry.toStatus}</p>
                    <span className="text-xs font-semibold text-lead-gray">Effective {formatDateOnly(entry.effectiveDate)} / recorded {formatDate(entry.changedAt)} WIB</span>
                  </div>
                  <p className="mt-2 text-sm text-lead-gray">{entry.note || "No note"}</p>
                  <p className="mt-1 text-xs text-lead-gray">Changed by {entry.changedByName}{entry.changedByUsername ? ` (${entry.changedByUsername})` : ""}</p>
                </div>
              ))}
              {!registration.statusHistory.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No status changes recorded yet.</p> : null}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-heading text-xl font-bold text-lead-navy">Course History</h2>
                <p className="mt-1 text-sm text-lead-gray">Permanent record of course changes. This history cannot be edited from the form.</p>
              </div>
              <span className="w-fit rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">
                {registration.courseHistory.length} change{registration.courseHistory.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {registration.courseHistory.map((entry, index) => (
                <div key={`${entry.changedAt}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-heading font-bold text-lead-navy">
                      {entry.fromCourse || "Not set"} <span className="px-1 text-lead-blue">to</span> {entry.toCourse || "Not set"}
                    </p>
                    <span className="text-xs font-semibold text-lead-gray">{formatDate(entry.changedAt)} WIB</span>
                  </div>
                  <p className="mt-2 text-xs text-lead-gray">
                    Changed by <span className="font-bold text-lead-navy">{entry.changedByName}</span>
                    {entry.changedByUsername ? ` (${entry.changedByUsername})` : ""}
                  </p>
                </div>
              ))}
              {!registration.courseHistory.length ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No course changes recorded yet.</p>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}

function formatDateOnly(value: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(`${value}T00:00:00+07:00`));
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-lead-navy">
      {label}
      {children}
    </label>
  );
}
