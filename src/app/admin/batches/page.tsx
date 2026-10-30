import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { WithId } from "mongodb";
import { Archive, Pencil, Plus, UserPlus, Users, type LucideIcon } from "lucide-react";
import type React from "react";
import { logoutAdmin } from "@/app/admin/actions";
import {
  archiveBatch,
  assignStudentToBatch,
  createBatch,
  removeStudentFromBatch,
  updateBatch
} from "@/app/admin/batches/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, getAuthenticatedAdmin, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { isGroupStudentAdminSession } from "@/lib/admin-permissions";
import {
  assessmentPrograms,
  getBatchesCollectionName
} from "@/lib/assessments";
import { getBatchClassSessionsCollectionName, getBatchType, type BatchClassSessionDocument, type BatchType } from "@/lib/batch-class-sessions";
import { buildBatchCourseProgress, buildStudentGroupClassProgress, getCourseClassTarget, getJakartaMonthKey } from "@/lib/batch-course-progress";
import { getMongoDb } from "@/lib/mongodb";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { getAvailableTeachers, type TeacherOption } from "@/lib/teachers";

export const dynamic = "force-dynamic";

type BatchDocument = {
  batchName?: string;
  program?: string;
  batchType?: BatchType;
  teacherId?: string;
  teacherName?: string;
  startDate?: string;
  days?: string;
  time?: string;
  maximumStudents?: number;
  status?: "active" | "archived";
  createdAt?: Date;
};

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  email?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  activeBatchId?: string;
};

type Batch = {
  id: string;
  batchName: string;
  program: string;
  batchType: BatchType;
  teacherId: string;
  teacherName: string;
  startDate: string;
  days: string;
  time: string;
  maximumStudents: number;
  status: "active" | "archived";
};

type Student = {
  id: string;
  studentId: string;
  studentName: string;
  email: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  activeBatchId: string;
};

type Teacher = TeacherOption;

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function getBasicGroupStudentFilter() {
  return {
    $and: [getActiveStudentFilter(), { classType: "Basic Group" }]
  };
}

async function getBatchPageData(groupOnly: boolean) {
  const db = await getMongoDb();
  const batchFilter = groupOnly ? { $or: [{ batchType: "Basic Group" as const }, { batchType: { $exists: false } }] } : {};
  const studentClassTypes = groupOnly ? ["Basic Group"] : ["Basic Group", "Standard/Buddy"];

  const [batchDocs, teacherDocs, studentDocs, sessionDocs] = await Promise.all([
    db.collection<BatchDocument>(getBatchesCollectionName()).find(batchFilter).sort({ status: 1, startDate: -1 }).limit(100).toArray() as Promise<WithId<BatchDocument>[]>,
    getAvailableTeachers(db),
    db.collection<StudentDocument>(getStudentRegistrationCollectionName()).find({ $and: [getActiveStudentFilter(), { classType: { $in: studentClassTypes } }] }).sort({ studentName: 1 }).limit(1000).toArray() as Promise<WithId<StudentDocument>[]>,
    db.collection<BatchClassSessionDocument>(getBatchClassSessionsCollectionName()).find({ status: "Completed", ...(groupOnly ? { $or: [{ batchType: "Basic Group" }, { batchType: { $exists: false } }] } : {}) }).sort({ sessionDate: -1 }).limit(5000).toArray()
  ]);

  const batchProgress = new Map(batchDocs.map((batch) => {
    const id = batch._id.toString();
    return [id, buildBatchCourseProgress(sessionDocs.filter((session) => session.batchId === id), getCourseClassTarget(batch.program || ""))] as const;
  }));

  return {
    batches: batchDocs.map((batch) => ({
      id: batch._id.toString(),
      batchName: batch.batchName || "Untitled batch",
      program: batch.program || "",
      batchType: getBatchType(batch.batchType),
      teacherId: batch.teacherId || "",
      teacherName: batch.teacherName || "",
      startDate: batch.startDate || "",
      days: batch.days || "",
      time: batch.time || "",
      maximumStudents: batch.maximumStudents || 12,
      status: batch.status || "active"
    })),
    teachers: teacherDocs,
    students: studentDocs.map((student) => ({
      id: student._id.toString(),
      studentId: student.studentId || "",
      studentName: student.studentName || "Unknown",
      email: student.email || "",
      courseJoined: student.courseJoined || "",
      classType: student.classType || "",
      classMode: student.classMode || "Online",
      activeBatchId: student.activeBatchId || ""
    })),
    batchProgress,
    studentClassProgress: buildStudentGroupClassProgress(sessionDocs),
    currentMonthKey: getJakartaMonthKey()
  };
}

export default async function AdminBatchesPage() {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAdminConfigured()) {
    return (
      <main className="min-h-screen bg-lead-soft px-4 py-10">
        <Card className="mx-auto max-w-xl p-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Admin password missing</h1>
          <p className="mt-4 leading-7 text-lead-gray">Add ADMIN_PASSWORD before using Batch Management.</p>
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Admin</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Batch management</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to create batches and assign group students.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const groupOnly = isGroupStudentAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "");
  const [batchPageData, admin] = await Promise.all([getBatchPageData(groupOnly), getAuthenticatedAdmin()]);
  const { batches, teachers, students, batchProgress, studentClassProgress, currentMonthKey } = batchPageData;
  const activeBatches = batches.filter((batch) => batch.status === "active");
  const archivedBatches = batches.filter((batch) => batch.status === "archived");
  const unassignedStudents = students.filter((student) => !student.activeBatchId);
  const availablePrograms = groupOnly ? assessmentPrograms.filter((program) => program !== "Academic English") : assessmentPrograms;

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="batches"
        title="Batch management"
        description="Create group batches, assign teachers, and manage student membership. Teachers complete assessments in their portal."
        userName={admin?.name}
        username={admin?.username}
        logoutAction={logoutAdmin}
      />

      <section className="container-shell grid gap-6 py-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="p-5">
            <SectionTitle icon={Plus} title="Create Batch" description="One batch can hold active course students only. Trial students stay separate." />
            <ActionFeedbackForm action={createBatch} successMessage="Batch created successfully." className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Batch Name" name="batchName" placeholder="Foundation A" required />
              <SelectField label="Program" name="program" options={availablePrograms} required />
              {!groupOnly ? <SelectField label="Batch Type" name="batchType" options={["Basic Group", "Standard/Buddy"]} required /> : <input type="hidden" name="batchType" value="Basic Group" />}
              <SelectField label="Teacher" name="teacherId" options={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))} required />
              <Field label="Start Date" name="startDate" type="date" required />
              <Field label="Days" name="days" placeholder="Mon, Wed, Fri" required />
              <Field label="Time" name="time" placeholder="7:00 PM - 8:00 PM" required />
              <Field label="Maximum Students (Buddy is always 2)" name="maximumStudents" type="number" min={1} max={100} defaultValue={12} required />
              <div className="flex items-end">
                <Button type="submit" className="w-full">Create Batch</Button>
              </div>
            </ActionFeedbackForm>
          </Card>

          <Card className="p-5">
            <SectionTitle icon={UserPlus} title="Assign Student" description="Each student belongs to one active batch." />
            <ActionFeedbackForm action={assignStudentToBatch} successMessage="Student assigned to batch." className="mt-5 grid gap-4">
              <SelectField label="Batch" name="batchId" options={activeBatches.map((batch) => ({ label: `${batch.batchName} (${batch.batchType})`, value: batch.id }))} required />
              <SelectField
                label="Student"
                name="studentId"
                options={unassignedStudents.map((student) => ({
                  label: `${student.studentId} - ${student.studentName} (${student.classType})`,
                  value: student.studentId
                }))}
                required
              />
              <Button type="submit">Assign Student</Button>
            </ActionFeedbackForm>
            {!unassignedStudents.length ? (
              <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">All active students are assigned to a batch.</p>
            ) : null}
          </Card>
        </div>

        <div>
          <div className="mb-4">
            <h2 className="font-heading text-2xl font-extrabold text-lead-navy">Active Batches</h2>
            <p className="mt-1 text-sm text-lead-gray">Only batches currently in use are shown here.</p>
          </div>
          <div className="grid gap-5">
            {activeBatches.map((batch) => {
              const batchStudents = students.filter((student) => student.activeBatchId === batch.id);
              const courseTarget = getCourseClassTarget(batch.program);
              const progress = batchProgress.get(batch.id) || buildBatchCourseProgress([], courseTarget);
              const currentMonth = progress.months.find((month) => month.monthKey === currentMonthKey);

              return (
                <Card key={batch.id} className="overflow-hidden">
                  <div className="border-b border-slate-100 bg-white p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-heading text-2xl font-extrabold text-lead-navy">{batch.batchName}</h2>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${batch.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {batch.status}
                          </span>
                          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold uppercase text-violet-700">{batch.batchType}</span>
                        </div>
                        <p className="mt-2 text-sm text-lead-gray">
                          {batch.program} / {batch.teacherName} / {batch.days} / {batch.time}
                        </p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-lead-gray">Starts {formatDate(batch.startDate)}</p>
                      </div>
                      <details className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                        <summary className="cursor-pointer text-sm font-bold text-lead-blue">Edit batch</summary>
                        <ActionFeedbackForm action={updateBatch} successMessage="Batch updated." className="mt-4 grid gap-3 sm:grid-cols-2">
                          <input type="hidden" name="id" value={batch.id} />
                          <input type="hidden" name="batchType" value={batch.batchType} />
                          <Field label="Batch Name" name="batchName" defaultValue={batch.batchName} required />
                          <SelectField label="Program" name="program" options={availablePrograms} defaultValue={batch.program} required />
                          <SelectField label="Teacher" name="teacherId" options={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))} defaultValue={batch.teacherId} required />
                          <Field label="Start Date" name="startDate" type="date" defaultValue={batch.startDate} required />
                          <Field label="Days" name="days" defaultValue={batch.days} required />
                          <Field label="Time" name="time" defaultValue={batch.time} required />
                          <Field label="Maximum" name="maximumStudents" type="number" defaultValue={batch.maximumStudents} min={1} max={100} required />
                          <Button type="submit" variant="secondary" className="self-end"><Pencil className="mr-2 h-4 w-4" /> Update</Button>
                        </ActionFeedbackForm>
                        {batch.status === "active" ? (
                          <ActionFeedbackForm action={archiveBatch} successMessage="Batch archived." className="mt-3">
                            <input type="hidden" name="id" value={batch.id} />
                            <Button type="submit" variant="secondary" className="w-full"><Archive className="mr-2 h-4 w-4" /> Archive Batch</Button>
                          </ActionFeedbackForm>
                        ) : null}
                      </details>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Metric label="Students" value={`${batchStudents.length}/${batch.maximumStudents}`} />
                      <Metric label="Course classes completed" value={`${progress.completedClasses}/${courseTarget}`} />
                      <Metric label="Classes remaining" value={String(progress.remainingClasses)} />
                      <Metric label={`${currentMonth?.monthLabel || "This month"} attendance`} value={`${currentMonth?.completedClasses || 0} classes / ${currentMonth?.studentsAttended || 0} students`} />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${progress.progressPercent}% of course classes completed`}>
                      <div className="h-full rounded-full bg-lead-blue" style={{ width: `${progress.progressPercent}%` }} />
                    </div>
                    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <summary className="cursor-pointer text-sm font-bold text-lead-blue">View month-by-month class history</summary>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[460px] text-left text-sm">
                          <thead className="text-xs uppercase tracking-[0.1em] text-lead-gray"><tr><th className="pb-2">Month</th><th className="pb-2">Classes completed</th><th className="pb-2">Students attended</th></tr></thead>
                          <tbody className="divide-y divide-slate-200">
                            {progress.months.map((month) => <tr key={month.monthKey}><td className="py-2 font-semibold text-lead-navy">{month.monthLabel}</td><td className="py-2">{month.completedClasses}</td><td className="py-2">{month.studentsAttended}</td></tr>)}
                            {!progress.months.length ? <tr><td colSpan={3} className="py-3 text-lead-gray">No completed group classes recorded yet.</td></tr> : null}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </div>

                  <div className="border-b border-slate-100 bg-white p-5">
                    <SectionTitle icon={Users} title={`Students in ${batch.batchName}`} description={`These ${batchStudents.length} students belong to this batch. They will appear together in the teacher's group attendance roster.`} />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-lead-gray">
                        <tr>
                          <th className="px-5 py-3">Student ID</th>
                          <th className="px-5 py-3">Name</th>
                          <th className="px-5 py-3">Email</th>
                          <th className="px-5 py-3">Classes taken</th>
                          <th className="px-5 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchStudents.map((student) => {
                          const classProgress = studentClassProgress.get(student.studentId) || { totalClasses: 0, months: [] };
                          return (
                            <tr key={student.studentId} className="bg-white align-top">
                              <td className="px-5 py-4 font-bold text-lead-navy">{student.studentId}</td>
                              <td className="px-5 py-4">
                                <p className="font-semibold text-lead-navy">{student.studentName}</p>
                                <p className="text-xs text-lead-gray">{student.classMode} / {student.classType}</p>
                              </td>
                              <td className="px-5 py-4">
                                {student.email ? <a href={`mailto:${student.email}`} className="font-semibold text-lead-blue hover:text-blue-700 hover:underline">{student.email}</a> : <span className="text-lead-gray">Not set</span>}
                              </td>
                              <td className="px-5 py-4">
                                <details className="group w-56 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 marker:content-none">
                                    <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-lead-blue">{classProgress.totalClasses}/{courseTarget}</span>
                                    <span className="text-[10px] font-bold uppercase text-lead-blue group-open:hidden">View months</span>
                                  </summary>
                                  <div className="mt-3 space-y-1.5 border-t border-blue-100 pt-2">
                                    {classProgress.months.map((month) => <div key={month.monthKey} className="flex items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-2 text-xs"><span className="font-semibold text-lead-navy">{month.monthLabel}</span><span className="font-bold text-lead-blue">{month.classesTaken} classes</span></div>)}
                                    {!classProgress.months.length ? <p className="px-1 py-2 text-xs text-lead-gray">No Present classes recorded yet.</p> : null}
                                    <p className="px-1 pt-1 text-[10px] leading-4 text-lead-gray">Total includes Present classes across group transfers.</p>
                                  </div>
                                </details>
                              </td>
                              <td className="px-5 py-4">
                                <ActionFeedbackForm action={removeStudentFromBatch} successMessage="Student removed.">
                                  <input type="hidden" name="batchId" value={batch.id} />
                                  <input type="hidden" name="studentId" value={student.studentId} />
                                  <button type="submit" className="text-xs font-bold text-rose-600 hover:text-rose-700">Remove</button>
                                </ActionFeedbackForm>
                              </td>
                            </tr>
                          );
                        })}
                        {!batchStudents.length ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-sm text-lead-gray">No students assigned yet.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
            {!activeBatches.length ? <Card className="p-8 text-center text-sm text-lead-gray">No active batches.</Card> : null}
          </div>
        </div>

        {archivedBatches.length ? (
          <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:content-none">
              <div>
                <h2 className="font-heading text-lg font-extrabold text-lead-navy">Archived Batches</h2>
                <p className="mt-1 text-sm text-lead-gray">Hidden from active management · {archivedBatches.length} archived</p>
              </div>
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase text-slate-600 group-open:hidden">Show history</span>
            </summary>
            <div className="grid gap-3 border-t border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {archivedBatches.map((batch) => (
                <div key={batch.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-heading font-extrabold text-lead-navy">{batch.batchName}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">Archived</span>
                  </div>
                  <p className="mt-2 text-sm text-lead-gray">{batch.program} / {batch.teacherName || "Teacher not assigned"}</p>
                  <p className="mt-1 text-xs text-lead-gray">Started {formatDate(batch.startDate)}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </section>
    </main>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-lead-blue">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-heading text-xl font-extrabold text-lead-navy">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-lead-gray">{description}</p>
      </div>
    </div>
  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-lead-navy">
      {label}
      <input
        {...props}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-lead-navy outline-none transition focus:border-lead-blue focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label: string;
  name: string;
  options: ReadonlyArray<string> | ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-lead-navy">
      {label}
      <select
        {...props}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-lead-navy outline-none transition focus:border-lead-blue focus:ring-4 focus:ring-blue-100"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          return (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="font-heading text-2xl font-extrabold text-lead-blue">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
    </div>
  );
}
