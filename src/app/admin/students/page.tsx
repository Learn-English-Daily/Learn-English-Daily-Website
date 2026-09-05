import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { ChevronDown, MessageCircle, Pencil, QrCode, Search, Users } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentAgeLabel } from "@/lib/student-age";
import {
  getActiveStudentFilter,
  getInactiveStudentFilter,
  getStudentRegistrationCollectionName,
  getTrialStudentFilter
} from "@/lib/student-registration";

export const dynamic = "force-dynamic";

type StudentRegistrationDocument = {
  studentId?: string;
  previousStudentId?: string;
  upgradedToStudentId?: string;
  upgradedFromTrial?: boolean;
  studentName?: string;
  nickname?: string;
  whatsapp?: string;
  email?: string;
  normalizedWhatsapp?: string;
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
  source?: string;
  createdAt?: Date;
  studentStatus?: string;
};

type StudentRegistration = {
  id: string;
  studentId: string;
  previousStudentId: string;
  upgradedFromTrial: boolean;
  studentName: string;
  nickname: string;
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
  source: string;
  createdAt: string;
  studentStatus: string;
};

type RegistrationViewMode = "active" | "trial" | "archived";
type StudentListScope = "all" | "private" | "group";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getStudentRegistrations(query = "", mode: RegistrationViewMode, scope: StudentListScope = "all"): Promise<StudentRegistration[]> {
  const db = await getMongoDb();
  const search = query.trim();
  const modeFilter = mode === "trial" ? getTrialStudentFilter() : mode === "archived" ? getInactiveStudentFilter() : getActiveStudentFilter();
  const searchFilter: Filter<StudentRegistrationDocument> = search
    ? {
        $or: [
          "studentName",
          "nickname",
          "studentId",
          "previousStudentId",
          "whatsapp",
          "email",
          "normalizedWhatsapp",
          "parentName",
          "age",
          "dateOfBirth",
          "grade",
          "preferredSchedule",
          "preferredTime",
          "courseJoined",
          "classType",
          "classMode",
          "englishLevel",
          "learningGoal",
          "countryCity",
          "locale"
        ].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" }
        }))
      }
    : {};
  const accessFilter = scope === "group" ? { classType: "Basic Group" } : scope === "private" ? { classType: { $ne: "Basic Group" } } : {};
  const filter = search ? { $and: [modeFilter, accessFilter, searchFilter] } : { $and: [modeFilter, accessFilter] };

  const docs = (await db
    .collection<StudentRegistrationDocument>(getStudentRegistrationCollectionName())
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray()) as WithId<StudentRegistrationDocument>[];

  return docs.map((doc) => ({
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    previousStudentId: doc.previousStudentId || "",
    upgradedFromTrial: doc.upgradedFromTrial || false,
    studentName: doc.studentName || "Unknown",
    nickname: doc.nickname || "",
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
    source: doc.source || "student-registration",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    studentStatus: doc.studentStatus || "Active"
  }));
}

async function getActiveBasicGroupStudentCount() {
  const db = await getMongoDb();
  return db.collection<StudentRegistrationDocument>(getStudentRegistrationCollectionName()).countDocuments({
    $and: [getActiveStudentFilter(), { classType: "Basic Group" }]
  });
}

function formatDate(value: string) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export default async function AdminStudentsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[]; view?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const isAuthenticated = isValidAdminSession(session);
  const groupOnly = isGroupStudentAdminSession(session);
  const resolvedSearchParams = await searchParams;
  const searchQuery = Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams?.q[0] || "" : resolvedSearchParams?.q || "";
  const view = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams?.view[0] || "" : resolvedSearchParams?.view || "";
  const mode: RegistrationViewMode = !groupOnly && view === "trial" ? "trial" : view === "archived" ? "archived" : "active";

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
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">View student registrations</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to see student registration submissions from MongoDB.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const splitActiveStudents = mode === "active" && !groupOnly;
  const [registrations, groupRegistrations, activeGroupStudentCount, admin] = await Promise.all([
    getStudentRegistrations(searchQuery, mode, groupOnly ? "group" : splitActiveStudents ? "private" : "all"),
    splitActiveStudents ? getStudentRegistrations(searchQuery, mode, "group") : Promise.resolve([]),
    groupOnly && mode === "active" ? getActiveBasicGroupStudentCount() : Promise.resolve(0),
    getAuthenticatedAdmin()
  ]);
  const isTrialView = mode === "trial";
  const isArchivedView = mode === "archived";
  const pagePath = isTrialView ? "/admin/students?view=trial" : isArchivedView ? "/admin/students?view=archived" : "/admin/students";
  const pageTitle = isTrialView ? "Trial class students" : isArchivedView ? "Archived students" : "Current course students";
  const emptyTitle = searchQuery ? "No matching registrations" : isTrialView ? "No trial students yet" : isArchivedView ? "No archived students yet" : "No current students yet";

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="students"
        title={pageTitle}
        description={
          searchQuery
            ? `Showing ${registrations.length + groupRegistrations.length} result${registrations.length + groupRegistrations.length === 1 ? "" : "s"} for "${searchQuery}".`
            : splitActiveStudents ? `${registrations.length} private students and ${groupRegistrations.length} group students.` : `Showing latest ${registrations.length} ${isTrialView ? "trial" : isArchivedView ? "archived" : "current"} registrations.`
        }
        userName={admin?.name}
        username={admin?.username}
        logoutAction={logoutAdmin}
      />

      <section className="container-shell py-8">
        <Card className="mb-6 border-blue-100 bg-white/90 p-4 shadow-soft">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-lead-navy">Student list view</h2>
              <p className="mt-1 text-sm text-lead-gray">
                {isTrialView ? "You are viewing trial class students." : isArchivedView ? "Completed, paused, withdrawn, and inactive students." : "You are viewing current course students."}
              </p>
            </div>
            {groupOnly && mode === "active" ? (
              <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-lead-blue text-white"><Users className="h-5 w-5" /></span>
                <span><span className="block text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Active Basic Group</span><strong className="font-heading text-2xl text-lead-navy">{activeGroupStudentCount} students</strong></span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant={mode === "active" ? "primary" : "secondary"}><a href="/admin/students">Current</a></Button>
              {!groupOnly ? <Button asChild variant={isTrialView ? "primary" : "secondary"}><a href="/admin/students/trials">Trials</a></Button> : null}
              <Button asChild variant={isArchivedView ? "primary" : "secondary"}><a href="/admin/students?view=archived">Archived</a></Button>
            </div>
          </div>
        </Card>

        <Card className="mb-6 p-4">
          <form action="/admin/students" className="flex flex-col gap-3 md:flex-row">
            {mode !== "active" ? <input type="hidden" name="view" value={mode} /> : null}
            <label className="relative flex-1">
              <span className="sr-only">Search registrations</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lead-gray" />
              <input
                name="q"
                defaultValue={searchQuery}
                placeholder="Search by student, parent, email, WhatsApp, course, schedule..."
                className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm text-lead-navy"
              />
            </label>
            <Button type="submit" size="lg">
              <Search className="h-4 w-4" />
              Search
            </Button>
            {searchQuery ? (
              <Button asChild variant="secondary" size="lg">
                <a href={pagePath}>Clear</a>
              </Button>
            ) : null}
          </form>
        </Card>

        {splitActiveStudents ? (
          <details open={Boolean(searchQuery)} className="group mb-6 overflow-hidden rounded-xl border border-blue-200 bg-white shadow-soft">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 bg-blue-50 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-lead-blue text-white"><Users className="h-5 w-5" /></span>
                <span><strong className="block font-heading text-lg text-lead-navy">Group Students</strong><span className="text-sm text-lead-gray">{groupRegistrations.length} active Basic Group student{groupRegistrations.length === 1 ? "" : "s"}</span></span>
              </span>
              <ChevronDown className="h-5 w-5 text-lead-blue transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 border-t border-blue-100 p-4 sm:p-5">
              {groupRegistrations.length ? groupRegistrations.map((registration) => <RegistrationCard key={registration.id} registration={registration} isTrialView={false} groupOnly={groupOnly} />) : <p className="rounded-lg bg-slate-50 p-5 text-sm text-lead-gray">{searchQuery ? "No group students match this search." : "No active group students."}</p>}
            </div>
          </details>
        ) : null}

        {splitActiveStudents ? <div className="mb-4"><h2 className="font-heading text-2xl font-extrabold text-lead-navy">Private Students</h2><p className="mt-1 text-sm text-lead-gray">Active one-to-one course students.</p></div> : null}

        {registrations.length ? (
          <div className="grid gap-4">
            {registrations.map((registration) => <RegistrationCard key={registration.id} registration={registration} isTrialView={isTrialView} groupOnly={groupOnly} />)}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h2 className="font-heading text-2xl font-bold text-lead-navy">{splitActiveStudents && !searchQuery ? "No active private students" : emptyTitle}</h2>
            <p className="mt-3 text-lead-gray">
              {searchQuery ? "Try a different student name, parent name, email, WhatsApp, course, or schedule." : isTrialView ? "Trial class registrations will appear here." : splitActiveStudents ? "Private students will appear here after registration." : "Students appear here after they join a course and receive an STU ID."}
            </p>
          </Card>
        )}
      </section>
    </main>
  );
}

function RegistrationCard({ registration, isTrialView, groupOnly }: { registration: StudentRegistration; isTrialView: boolean; groupOnly: boolean }) {
  return (
    <Card className="p-5">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-heading text-xl font-bold text-lead-navy">{registration.studentName}</h2>
                      {registration.studentId ? (
                        <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{registration.studentId}</span>
                      ) : null}
                      {registration.upgradedFromTrial && registration.previousStudentId ? (
                        <span className="rounded-lg bg-yellow-50 px-3 py-1 text-xs font-bold uppercase text-yellow-800">
                          Upgraded from {registration.previousStudentId}
                        </span>
                      ) : null}
                      {!isTrialView ? <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${registration.studentStatus === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>{registration.studentStatus}</span> : null}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-lead-gray">Parent: {registration.parentName}</p>
                    {registration.nickname ? <p className="mt-1 text-sm text-lead-gray">Nickname: {registration.nickname}</p> : null}
                    {registration.whatsapp ? (
                      <a
                        href={`https://wa.me/${registration.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-2 font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {registration.whatsapp}
                      </a>
                    ) : null}
                    {registration.email ? (
                      <a
                        href={`mailto:${registration.email}`}
                        className="mt-2 block font-semibold text-lead-blue hover:text-blue-700"
                      >
                        {registration.email}
                      </a>
                    ) : null}
                  </div>
                  {registration.studentId ? (
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <a href={`/admin/students/${registration.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </a>
                      </Button>
                      {!isTrialView ? (
                        <>
                          <Button asChild variant="secondary" size="sm">
                            <a href={`/admin/students/${registration.id}/parent-qr`}>
                              <QrCode className="h-4 w-4" />
                              Parent QR
                            </a>
                          </Button>
                          {!groupOnly ? (
                            <>
                              <Button asChild variant="secondary" size="sm">
                                <a href={`/admin/attendance?studentId=${encodeURIComponent(registration.studentId)}`}>Attendance</a>
                              </Button>
                              <Button asChild variant="secondary" size="sm">
                                <a href={`/finance/payments?studentId=${encodeURIComponent(registration.studentId)}`}>Payments</a>
                              </Button>
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {[registration.courseJoined, registration.classType, registration.classMode || "Mode not set", registration.englishLevel, registration.locale.toUpperCase()].map((item) => (
                      <span key={item} className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-lead-gray md:grid-cols-2 lg:grid-cols-4">
                  <p><span className="font-bold text-lead-navy">Date of Birth:</span> {registration.dateOfBirth || "Not recorded"}</p>
                  <p><span className="font-bold text-lead-navy">Age:</span> {getStudentAgeLabel(registration.dateOfBirth, registration.age)}</p>
                  <p><span className="font-bold text-lead-navy">Grade:</span> {registration.grade}</p>
                  <p><span className="font-bold text-lead-navy">Schedule:</span> {registration.preferredSchedule}</p>
                  <p><span className="font-bold text-lead-navy">Time:</span> {registration.preferredTime}</p>
                  <p><span className="font-bold text-lead-navy">Mode:</span> {registration.classMode || "Not set"}</p>
                  <p><span className="font-bold text-lead-navy">Goal:</span> {registration.learningGoal}</p>
                  <p><span className="font-bold text-lead-navy">Country/City:</span> {registration.countryCity || "Not provided"}</p>
                  <p><span className="font-bold text-lead-navy">Submitted:</span> {formatDate(registration.createdAt)}</p>
                </div>
    </Card>
  );
}
