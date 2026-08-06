import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { CalendarCheck, Search } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/admin/actions";
import { saveStudentAttendance, updateStudentAttendance } from "@/app/admin/attendance/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { getClosedBillingPeriodKeys, getRecordBillingPeriod } from "@/lib/billing-periods";
import {
  attendanceStatuses,
  getStudentAttendanceCollectionName,
  type AttendanceStatus
} from "@/lib/attendance";
import { getMongoDb } from "@/lib/mongodb";
import { classModeOptions, getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import {
  getAvailableTeachers,
  type TeacherOption
} from "@/lib/teachers";

export const dynamic = "force-dynamic";

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  parentName?: string;
  whatsapp?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  englishLevel?: string;
};

type Student = {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  whatsapp: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  englishLevel: string;
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
  notes?: string;
  teacherIds?: string[];
  teacherNames?: string[];
  createdAt?: Date;
};

type Attendance = {
  id: string;
  meetingNumber: number;
  meetingDate: string;
  billingPeriod: string;
  status: AttendanceStatus;
  classMode: string;
  notes: string;
  teacherIds: string[];
  teacherNames: string[];
  createdAt: string;
};

type Teacher = TeacherOption;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getIndividualAttendanceStudentFilter(): Filter<StudentDocument> {
  return {
    $and: [
      getActiveStudentFilter(),
      { classType: { $ne: "Basic Group" } }
    ]
  };
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

async function getStudents(query = ""): Promise<Student[]> {
  const db = await getMongoDb();
  const search = query.trim();
  const searchFilter: Filter<StudentDocument> = search
    ? {
        $or: ["studentId", "studentName", "parentName", "whatsapp", "courseJoined", "classType"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" }
        }))
      }
    : {};
  const filter = search ? { $and: [getIndividualAttendanceStudentFilter(), searchFilter] } : getIndividualAttendanceStudentFilter();

  const docs = (await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(search ? 20 : 8)
    .toArray()) as WithId<StudentDocument>[];

  return docs.map((doc) => ({
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    whatsapp: doc.whatsapp || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "Online",
    englishLevel: doc.englishLevel || ""
  }));
}

async function getSelectedStudent(studentId = "") {
  if (!studentId) return null;

  const db = await getMongoDb();
  const doc = await db.collection<StudentDocument>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId }, getIndividualAttendanceStudentFilter()]
  });
  if (!doc) return null;

  return {
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    whatsapp: doc.whatsapp || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "Online",
    englishLevel: doc.englishLevel || ""
  };
}

async function getAttendance(studentId = "", showArchived = false, closedPeriodKeys = new Set<string>()): Promise<Attendance[]> {
  if (!studentId) return [];

  const db = await getMongoDb();
  const docs = (await db
    .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
    .find({ studentId })
    .sort({ meetingNumber: -1, meetingDate: -1 })
    .limit(200)
    .toArray()) as WithId<AttendanceDocument>[];

  return docs.filter((doc) => {
    const period = getRecordBillingPeriod(doc);
    const isClosed = period.billingPeriod ? closedPeriodKeys.has(period.billingPeriod) : false;
    return showArchived ? isClosed : !isClosed;
  }).map((doc) => ({
    id: doc._id.toString(),
    meetingNumber: doc.meetingNumber || 0,
    meetingDate: doc.meetingDate || "",
    billingPeriod: getRecordBillingPeriod(doc).billingPeriod,
    status: doc.status || "Present",
    classMode: doc.classMode || "Online",
    notes: doc.notes || "",
    teacherIds: doc.teacherIds || [],
    teacherNames: doc.teacherNames || [],
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : ""
  }));
}

async function getTeachers(): Promise<Teacher[]> {
  const db = await getMongoDb();
  return getAvailableTeachers(db);
}

function nextMeetingNumber(attendance: Attendance[]) {
  return attendance.reduce((highest, record) => Math.max(highest, record.meetingNumber), 0) + 1;
}

function statusClassName(status: AttendanceStatus) {
  if (status === "Present") return "bg-emerald-50 text-emerald-700";
  if (status === "Absent") return "bg-rose-50 text-rose-700";
  if (status === "Late") return "bg-yellow-50 text-yellow-800";
  return "bg-slate-100 text-slate-600";
}

function summaryTextClassName(status: AttendanceStatus) {
  if (status === "Present") return "text-emerald-600";
  if (status === "Absent") return "text-rose-600";
  if (status === "Late") return "text-yellow-700";
  return "text-slate-600";
}

function countStatus(attendance: Attendance[], status: AttendanceStatus) {
  return attendance.filter((record) => record.status === status).length;
}

export default async function AdminAttendancePage({
  searchParams
}: {
  searchParams?: Promise<{
    q?: string | string[];
    studentId?: string | string[];
    meetingNumber?: string | string[];
    meetingDate?: string | string[];
    classMode?: string | string[];
    teacherIds?: string | string[];
    view?: string | string[];
  }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const resolvedSearchParams = await searchParams;
  const searchQuery = Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams?.q[0] || "" : resolvedSearchParams?.q || "";
  const selectedStudentId = Array.isArray(resolvedSearchParams?.studentId)
    ? resolvedSearchParams?.studentId[0] || ""
    : resolvedSearchParams?.studentId || "";
  const prefillMeetingNumberValue = Array.isArray(resolvedSearchParams?.meetingNumber)
    ? resolvedSearchParams?.meetingNumber[0] || ""
    : resolvedSearchParams?.meetingNumber || "";
  const prefillMeetingDate = Array.isArray(resolvedSearchParams?.meetingDate)
    ? resolvedSearchParams?.meetingDate[0] || ""
    : resolvedSearchParams?.meetingDate || "";
  const prefillClassMode = Array.isArray(resolvedSearchParams?.classMode)
    ? resolvedSearchParams?.classMode[0] || ""
    : resolvedSearchParams?.classMode || "";
  const prefillTeacherIds = Array.isArray(resolvedSearchParams?.teacherIds)
    ? resolvedSearchParams?.teacherIds
    : resolvedSearchParams?.teacherIds
      ? [resolvedSearchParams.teacherIds]
      : [];
  const viewMode = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams?.view[0] || "" : resolvedSearchParams?.view || "";
  const showArchived = viewMode === "history";
  const prefillMeetingNumber = Number(prefillMeetingNumberValue);

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
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Track student attendance</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to mark attendance for each class meeting.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const [students, selectedStudent, teachers] = await Promise.all([
    getStudents(searchQuery),
    getSelectedStudent(selectedStudentId),
    getTeachers()
  ]);
  const closedPeriodKeys = await getClosedBillingPeriodKeys(await getMongoDb());
  const attendance = selectedStudent ? await getAttendance(selectedStudent.studentId, showArchived, closedPeriodKeys) : [];

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="attendance"
        title="Student attendance"
        description="Mark attendance by meeting and review each student's class history."
        logoutAction={logoutAdmin}
      />

      <section className="container-shell grid items-start gap-6 py-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="p-4">
            <form action="/admin/attendance" className="flex flex-col gap-3 md:flex-row">
              <input type="hidden" name="view" value={showArchived ? "history" : "active"} />
              <label className="relative flex-1">
                <span className="sr-only">Search students</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-lead-gray" />
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Search by student ID, name, parent, WhatsApp..."
                  className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-sm text-lead-navy"
                />
              </label>
              <Button type="submit" size="lg">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </form>
            <div className="mt-3 flex gap-2">
              <Button asChild size="sm" variant={showArchived ? "secondary" : "primary"}>
                <a href={`/admin/attendance${selectedStudentId ? `?studentId=${encodeURIComponent(selectedStudentId)}` : ""}`}>Current Attendance</a>
              </Button>
              <Button asChild size="sm" variant={showArchived ? "primary" : "secondary"}>
                <a href={`/admin/attendance?view=history${selectedStudentId ? `&studentId=${encodeURIComponent(selectedStudentId)}` : ""}`}>Archived History</a>
              </Button>
            </div>
          </Card>

          <Card className="p-5 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Select student</h2>
            <div className="mt-4 grid gap-3">
              {students.map((student) => (
                <a
                  key={student.id}
                  href={`/admin/attendance?studentId=${encodeURIComponent(student.studentId)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${showArchived ? "&view=history" : ""}`}
                  className={`focus-ring rounded-lg border p-4 transition hover:border-lead-blue hover:bg-blue-50 ${
                    selectedStudent?.studentId === student.studentId ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{student.studentId || "No ID"}</span>
                    <span className="font-heading font-bold text-lead-navy">{student.studentName}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-lead-gray">{student.courseJoined} / {student.classType} / {student.classMode}</p>
                  <p className="mt-1 text-xs text-lead-gray">Parent: {student.parentName || "Not set"}</p>
                </a>
              ))}
              {!students.length ? <p className="rounded-lg bg-white p-4 text-sm text-lead-gray">No students found.</p> : null}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          {selectedStudent ? (
            <>
              <Card className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-heading text-2xl font-bold text-lead-navy">{selectedStudent.studentName}</h2>
                      <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{selectedStudent.studentId}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-lead-gray">{selectedStudent.courseJoined} / {selectedStudent.classType} / Default: {selectedStudent.classMode}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm font-bold md:text-right">
                    {attendanceStatuses.map((status) => (
                      <p key={status} className={summaryTextClassName(status)}>
                        {status}: {countStatus(attendance, status)}
                      </p>
                    ))}
                  </div>
                </div>
              </Card>

              {!showArchived ? (
              <Card className="p-5">
                <h2 className="font-heading text-xl font-bold text-lead-navy">Mark attendance</h2>
                {prefillMeetingNumber && prefillMeetingDate ? (
                  <p className="mt-2 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-lead-blue">
                    Prefilled from class session: Meeting {prefillMeetingNumber} on {formatDate(prefillMeetingDate)}.
                  </p>
                ) : null}
                <ActionFeedbackForm action={saveStudentAttendance} successMessage="Attendance saved successfully." className="mt-5 grid gap-4 md:grid-cols-2">
                  <input type="hidden" name="studentId" value={selectedStudent.studentId} />
                  <input type="hidden" name="studentName" value={selectedStudent.studentName} />
                  <input type="hidden" name="courseJoined" value={selectedStudent.courseJoined} />
                  <input type="hidden" name="classType" value={selectedStudent.classType} />
                  <Field label="Meeting Number">
                    <input name="meetingNumber" type="number" min="1" required defaultValue={prefillMeetingNumber || nextMeetingNumber(attendance)} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
                  </Field>
                  <Field label="Meeting Date">
                    <input name="meetingDate" type="date" required defaultValue={prefillMeetingDate} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
                  </Field>
                  <Field label="Status">
                    <select name="status" defaultValue="Present" required className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                      {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </Field>
                  <Field label="Class Mode">
                    <select name="classMode" defaultValue={prefillClassMode || selectedStudent.classMode || "Online"} required className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                      {classModeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </Field>
                  <TeacherSelector teachers={teachers} selectedTeacherIds={prefillTeacherIds} />
                  <label className="grid gap-2 text-sm font-semibold text-lead-navy md:col-span-2">
                    Journal Notes
                    <textarea name="notes" rows={8} className="focus-ring resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal leading-7 text-lead-navy" />
                  </label>
                  <Button type="submit" size="lg" className="md:col-span-2">
                    <CalendarCheck className="h-4 w-4" />
                    Save Attendance
                  </Button>
                </ActionFeedbackForm>
              </Card>
              ) : null}

              <Card className="p-5">
                <h2 className="font-heading text-xl font-bold text-lead-navy">{showArchived ? "Archived attendance history" : "Attendance history"}</h2>
                {showArchived ? <p className="mt-2 text-sm text-lead-gray">Closed months are shown read-only.</p> : null}
                <div className="mt-5 grid gap-4">
                  {attendance.map((record) => (
                    <div key={record.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading font-bold text-lead-navy">Meeting {record.meetingNumber}</h3>
                            <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(record.status)}`}>{record.status}</span>
                            <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">{record.classMode}</span>
                          </div>
                          <p className="mt-2 text-sm text-lead-gray">{formatDate(record.meetingDate)}</p>
                          <p className="mt-1 text-sm text-lead-gray">
                            <span className="font-bold text-lead-navy">Teachers:</span> {record.teacherNames.length ? record.teacherNames.join(", ") : "Not assigned"}
                          </p>
                        </div>
                        {!showArchived ? (
                        <ActionFeedbackForm action={updateStudentAttendance} successMessage="Attendance updated successfully." className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
                          <input type="hidden" name="id" value={record.id} />
                          <input name="meetingDate" type="date" defaultValue={record.meetingDate} required className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
                          <select name="status" defaultValue={record.status} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
                            {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <select name="classMode" defaultValue={record.classMode} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
                            {classModeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          <TeacherSelector teachers={teachers} selectedTeacherIds={record.teacherIds} compact />
                          <textarea name="notes" rows={5} defaultValue={record.notes} placeholder="Journal notes" className="focus-ring resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-lead-navy sm:col-span-2" />
                          <Button type="submit" size="sm" className="sm:col-span-2">Update</Button>
                        </ActionFeedbackForm>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {!attendance.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No attendance records yet.</p> : null}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <h2 className="font-heading text-2xl font-bold text-lead-navy">Choose a student</h2>
              <p className="mt-3 text-lead-gray">Search or select a student to mark and review attendance.</p>
            </Card>
          )}
        </div>
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

function TeacherSelector({
  teachers,
  selectedTeacherIds = [],
  compact = false
}: {
  teachers: Teacher[];
  selectedTeacherIds?: string[];
  compact?: boolean;
}) {
  return (
    <fieldset className={`rounded-lg border border-slate-200 bg-white ${compact ? "p-3 sm:col-span-2" : "p-4 md:col-span-2"}`}>
      <legend className="px-1 text-sm font-semibold text-lead-navy">Teachers <span className="text-lead-blue">*</span></legend>
      <p className="mb-3 text-xs text-lead-gray">Select one or more teachers for this meeting.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {teachers.map((teacher) => (
          <label key={teacher.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-lead-navy">
            <input
              type="checkbox"
              name="teacherIds"
              value={teacher.id}
              defaultChecked={selectedTeacherIds.includes(teacher.id)}
              className="h-4 w-4 accent-lead-blue"
            />
            {teacher.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
