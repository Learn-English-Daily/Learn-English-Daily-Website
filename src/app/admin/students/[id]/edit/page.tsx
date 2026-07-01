import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowLeft, Save } from "lucide-react";
import { ObjectId, type WithId } from "mongodb";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { updateStudentRegistration } from "@/app/admin/students/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";
import {
  classTypeOptions,
  classModeOptions,
  courseJoinedOptions,
  englishLevelOptions,
  getStudentRegistrationCollectionName,
  learningGoalOptions
} from "@/lib/student-registration";

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
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : ""
  };
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
  searchParams?: Promise<{ updated?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const updated = Array.isArray(resolvedSearchParams?.updated)
    ? resolvedSearchParams?.updated[0] === "1"
    : resolvedSearchParams?.updated === "1";

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
              </div>
              <p className="mt-2 text-sm text-lead-gray">Created: {formatDate(registration.createdAt)} / Updated: {formatDate(registration.updatedAt)}</p>
            </div>
            {updated ? (
              <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Saved successfully</p>
            ) : null}
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
            <Field label="Age">
              <input name="age" required defaultValue={registration.age} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
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
                {classTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
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
        </Card>
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-lead-navy">
      {label}
      {children}
    </label>
  );
}
