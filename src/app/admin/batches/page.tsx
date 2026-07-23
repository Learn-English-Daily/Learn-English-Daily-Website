import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { WithId } from "mongodb";
import { Archive, ClipboardCheck, Pencil, Plus, UserPlus, type LucideIcon } from "lucide-react";
import type React from "react";
import { logoutAdmin } from "@/app/admin/actions";
import {
  archiveBatch,
  assignStudentToBatch,
  createBatch,
  removeStudentFromBatch,
  saveMonthlyAssessment,
  updateBatch
} from "@/app/admin/batches/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import {
  assessmentAttendanceStatuses,
  assessmentPrograms,
  getBatchesCollectionName,
  getMonthlyAssessmentsCollectionName,
  type AssessmentGrade
} from "@/lib/assessments";
import { getMongoDb } from "@/lib/mongodb";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { ensureDefaultTeachers, getTeachersCollectionName, type TeacherDocument } from "@/lib/teachers";

export const dynamic = "force-dynamic";

type BatchDocument = {
  batchName?: string;
  program?: string;
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
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  activeBatchId?: string;
};

type AssessmentDocument = {
  studentId?: string;
  batchId?: string;
  batchName?: string;
  month?: number;
  year?: number;
  status?: string;
  attendance?: { attendancePercentage?: number; completedMeetings?: number; grade?: AssessmentGrade };
  participation?: { totalStars?: number; grade?: AssessmentGrade };
  overall?: { score?: number; grade?: AssessmentGrade };
  updatedAt?: Date;
};

type Batch = {
  id: string;
  batchName: string;
  program: string;
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
  courseJoined: string;
  classType: string;
  classMode: string;
  activeBatchId: string;
};

type Assessment = {
  id: string;
  studentId: string;
  batchId: string;
  batchName: string;
  month: number;
  year: number;
  status: string;
  attendancePercentage: number | null;
  completedMeetings: number;
  participationStars: number;
  overallScore: number | null;
  overallGrade: AssessmentGrade | "";
};

type Teacher = {
  id: string;
  name: string;
};

function currentJakartaMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(new Date());

  return {
    month: Number(parts.find((part) => part.type === "month")?.value || new Date().getMonth() + 1),
    year: Number(parts.find((part) => part.type === "year")?.value || new Date().getFullYear())
  };
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

async function getBatchPageData() {
  const db = await getMongoDb();
  await ensureDefaultTeachers(db);
  const { month, year } = currentJakartaMonth();

  const [batchDocs, teacherDocs, studentDocs, assessmentDocs] = await Promise.all([
    db.collection<BatchDocument>(getBatchesCollectionName()).find({}).sort({ status: 1, startDate: -1 }).limit(100).toArray() as Promise<WithId<BatchDocument>[]>,
    db.collection<TeacherDocument>(getTeachersCollectionName()).find({ active: true }).sort({ name: 1 }).toArray(),
    db.collection<StudentDocument>(getStudentRegistrationCollectionName()).find(getActiveStudentFilter()).sort({ studentName: 1 }).limit(1000).toArray() as Promise<WithId<StudentDocument>[]>,
    db.collection<AssessmentDocument>(getMonthlyAssessmentsCollectionName()).find({ month, year }).limit(2000).toArray() as Promise<WithId<AssessmentDocument>[]>
  ]);

  return {
    month,
    year,
    batches: batchDocs.map((batch) => ({
      id: batch._id.toString(),
      batchName: batch.batchName || "Untitled batch",
      program: batch.program || "",
      teacherId: batch.teacherId || "",
      teacherName: batch.teacherName || "",
      startDate: batch.startDate || "",
      days: batch.days || "",
      time: batch.time || "",
      maximumStudents: batch.maximumStudents || 12,
      status: batch.status || "active"
    })),
    teachers: teacherDocs.map((teacher) => ({ id: teacher._id, name: teacher.name })),
    students: studentDocs.map((student) => ({
      id: student._id.toString(),
      studentId: student.studentId || "",
      studentName: student.studentName || "Unknown",
      courseJoined: student.courseJoined || "",
      classType: student.classType || "",
      classMode: student.classMode || "Online",
      activeBatchId: student.activeBatchId || ""
    })),
    assessments: assessmentDocs.map((assessment) => ({
      id: assessment._id.toString(),
      studentId: assessment.studentId || "",
      batchId: assessment.batchId || "",
      batchName: assessment.batchName || "",
      month: assessment.month || month,
      year: assessment.year || year,
      status: assessment.status || "Not started",
      attendancePercentage: assessment.attendance?.attendancePercentage ?? null,
      completedMeetings: assessment.attendance?.completedMeetings || 0,
      participationStars: assessment.participation?.totalStars || 0,
      overallScore: assessment.overall?.score ?? null,
      overallGrade: normalizeGrade(assessment.overall?.grade)
    }))
  };
}

function gradeClassName(grade: AssessmentGrade | "") {
  if (grade === "A") return "bg-emerald-50 text-emerald-700";
  if (grade === "B") return "bg-yellow-50 text-yellow-800";
  if (grade === "C") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function normalizeGrade(grade: unknown): AssessmentGrade | "" {
  return grade === "A" || grade === "B" || grade === "C" ? grade : "";
}

function monthName(month: number, year: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
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
          <p className="mt-3 leading-7 text-lead-gray">Sign in to manage batches and monthly student assessments.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const { batches, teachers, students, assessments, month, year } = await getBatchPageData();
  const activeBatches = batches.filter((batch) => batch.status === "active");
  const unassignedStudents = students.filter((student) => !student.activeBatchId);
  const assessmentsByStudent = new Map<string, Assessment>(assessments.map((assessment) => [assessment.studentId, assessment]));

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="batches"
        title="Batch management"
        description="Create group batches, assign active students, and finalize monthly assessments without manual score calculations."
        logoutAction={logoutAdmin}
      />

      <section className="container-shell grid gap-6 py-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Card className="p-5">
            <SectionTitle icon={Plus} title="Create Batch" description="One batch can hold active course students only. Trial students stay separate." />
            <ActionFeedbackForm action={createBatch} successMessage="Batch created successfully." className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Batch Name" name="batchName" placeholder="Foundation A" required />
              <SelectField label="Program" name="program" options={assessmentPrograms} required />
              <SelectField label="Teacher" name="teacherId" options={teachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))} required />
              <Field label="Start Date" name="startDate" type="date" required />
              <Field label="Days" name="days" placeholder="Mon, Wed, Fri" required />
              <Field label="Time" name="time" placeholder="7:00 PM - 8:00 PM" required />
              <Field label="Maximum Students" name="maximumStudents" type="number" min={1} max={100} defaultValue={12} required />
              <div className="flex items-end">
                <Button type="submit" className="w-full">Create Batch</Button>
              </div>
            </ActionFeedbackForm>
          </Card>

          <Card className="p-5">
            <SectionTitle icon={UserPlus} title="Assign Student" description="Each student belongs to one active batch." />
            <ActionFeedbackForm action={assignStudentToBatch} successMessage="Student assigned to batch." className="mt-5 grid gap-4">
              <SelectField label="Batch" name="batchId" options={activeBatches.map((batch) => ({ label: batch.batchName, value: batch.id }))} required />
              <SelectField
                label="Student"
                name="studentId"
                options={unassignedStudents.map((student) => ({
                  label: `${student.studentId} - ${student.studentName}`,
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

        <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="grid gap-5">
            {batches.map((batch) => {
              const batchStudents = students.filter((student) => student.activeBatchId === batch.id);
              const batchAssessments = batchStudents.map((student) => assessmentsByStudent.get(student.studentId)).filter(Boolean) as Assessment[];
              const averageAttendance = batchAssessments.length
                ? Math.round(batchAssessments.reduce((sum, item) => sum + (item.attendancePercentage || 0), 0) / batchAssessments.length)
                : null;
              const averageParticipation = batchAssessments.length
                ? Math.round(batchAssessments.reduce((sum, item) => sum + item.participationStars, 0) / batchAssessments.length)
                : null;
              const needsAttention = batchAssessments.filter((item) => item.overallGrade === "C" || (item.attendancePercentage ?? 100) < 75).length;
              const aGradeStudents = batchAssessments.filter((item) => item.overallGrade === "A").length;

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
                          <Field label="Batch Name" name="batchName" defaultValue={batch.batchName} required />
                          <SelectField label="Program" name="program" options={assessmentPrograms} defaultValue={batch.program} required />
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
                    <div className="mt-5 grid gap-3 sm:grid-cols-4">
                      <Metric label="Students" value={`${batchStudents.length}/${batch.maximumStudents}`} />
                      <Metric label="Attendance" value={averageAttendance === null ? "-" : `${averageAttendance}%`} />
                      <Metric label="Avg Stars" value={averageParticipation === null ? "-" : `${averageParticipation}/60`} />
                      <Metric label="Needs Attention" value={String(needsAttention)} tone={needsAttention ? "danger" : "good"} />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-lead-gray">{aGradeStudents} students currently have A grade for {monthName(month, year)}.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-lead-gray">
                        <tr>
                          <th className="px-5 py-3">Student ID</th>
                          <th className="px-5 py-3">Name</th>
                          <th className="px-5 py-3">Attendance</th>
                          <th className="px-5 py-3">Monthly Stars</th>
                          <th className="px-5 py-3">Assessment Status</th>
                          <th className="px-5 py-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {batchStudents.map((student) => {
                          const assessment = assessmentsByStudent.get(student.studentId);
                          return (
                            <tr key={student.studentId} className="bg-white">
                              <td className="px-5 py-4 font-bold text-lead-navy">{student.studentId}</td>
                              <td className="px-5 py-4">
                                <p className="font-semibold text-lead-navy">{student.studentName}</p>
                                <p className="text-xs text-lead-gray">{student.classMode} / {student.classType}</p>
                              </td>
                              <td className="px-5 py-4">{assessment ? `${assessment.attendancePercentage}% (${assessment.completedMeetings}/12)` : "-"}</td>
                              <td className="px-5 py-4">{assessment ? `${assessment.participationStars}/60` : "-"}</td>
                              <td className="px-5 py-4">
                                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${gradeClassName(assessment?.overallGrade || "")}`}>
                                  {assessment ? `Grade ${assessment.overallGrade} / ${assessment.status}` : "Not started"}
                                </span>
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
                            <td colSpan={6} className="px-5 py-6 text-center text-sm text-lead-gray">No students assigned yet.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="h-fit p-5">
            <SectionTitle icon={ClipboardCheck} title="Monthly Assessment" description="Teachers enter attendance, stars, lateness, and monthly ratings. Scores calculate automatically." />
            <ActionFeedbackForm action={saveMonthlyAssessment} successMessage="Monthly assessment saved." className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Batch" name="batchId" options={activeBatches.map((batch) => ({ label: batch.batchName, value: batch.id }))} required />
                <SelectField label="Student" name="studentId" options={students.filter((student) => student.activeBatchId).map((student) => ({ label: `${student.studentId} - ${student.studentName}`, value: student.studentId }))} required />
                <SelectField label="Month" name="month" defaultValue={String(month)} options={Array.from({ length: 12 }, (_, index) => ({ label: monthName(index + 1, year).replace(` ${year}`, ""), value: String(index + 1) }))} required />
                <Field label="Year" name="year" type="number" defaultValue={year} min={2020} max={2100} required />
              </div>

              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="font-heading text-lg font-bold text-lead-navy">12 Meeting Tracker</h3>
                  <p className="text-xs text-lead-gray">Excused counts as completed for monthly assessment discipline.</p>
                </div>
                <div className="grid gap-3 p-4">
                  {Array.from({ length: 12 }, (_, index) => (
                    <MeetingRow key={index + 1} index={index + 1} />
                  ))}
                </div>
              </div>

              <AssessmentGroup
                title="Communication"
                items={[
                  ["Speaking", "speaking"],
                  ["Pronunciation", "pronunciation"],
                  ["Fluency", "fluency"]
                ]}
              />
              <AssessmentGroup
                title="English Skills"
                items={[
                  ["Vocabulary", "vocabulary"],
                  ["Grammar", "grammar"]
                ]}
              />
              <AssessmentGroup
                title="Creativity"
                items={[
                  ["Original Ideas", "originalIdeas"],
                  ["Storytelling", "storytelling"],
                  ["Role-play", "rolePlay"]
                ]}
              />
              <AssessmentGroup
                title="Learning Habits"
                items={[
                  ["Homework", "homework"],
                  ["Respect", "respect"]
                ]}
              />

              <label className="grid gap-2 text-sm font-bold text-lead-navy">
                Teacher Comment (English)
                <textarea name="teacherCommentEn" rows={4} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-lead-navy outline-none transition focus:border-lead-blue focus:ring-4 focus:ring-blue-100" placeholder="Leave blank to use automatic comment." />
              </label>
              <label className="grid gap-2 text-sm font-bold text-lead-navy">
                Teacher Comment (Bahasa Indonesia)
                <textarea name="teacherCommentId" rows={4} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-lead-navy outline-none transition focus:border-lead-blue focus:ring-4 focus:ring-blue-100" placeholder="Kosongkan untuk komentar otomatis." />
              </label>
              <Button type="submit" className="w-full">Save Monthly Assessment</Button>
            </ActionFeedbackForm>
          </Card>
        </div>
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

function MeetingRow({ index }: { index: number }) {
  return (
    <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[70px_1fr_90px_100px] sm:items-center">
      <p className="font-heading text-sm font-extrabold text-lead-navy">M{index}</p>
      <select name={`attendance_${index}`} defaultValue="Present" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-lead-navy">
        {assessmentAttendanceStatuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
      <select name={`stars_${index}`} defaultValue="3" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-lead-navy">
        {[0, 1, 2, 3, 4, 5].map((star) => (
          <option key={star} value={star}>{star} stars</option>
        ))}
      </select>
      <input name={`late_${index}`} type="number" min={0} max={240} defaultValue={0} aria-label={`Meeting ${index} minutes late`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-lead-navy" />
    </div>
  );
}

function AssessmentGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-heading text-lg font-bold text-lead-navy">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map(([label, name]) => (
          <label key={name} className="grid gap-2 text-sm font-bold text-lead-navy">
            {label}
            <select name={name} defaultValue="3" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-lead-navy">
              {[1, 2, 3, 4, 5].map((star) => (
                <option key={star} value={star}>{star} stars</option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "danger" }) {
  const className = tone === "good" ? "text-emerald-700" : tone === "danger" ? "text-rose-600" : "text-lead-blue";

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className={`font-heading text-2xl font-extrabold ${className}`}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
    </div>
  );
}
