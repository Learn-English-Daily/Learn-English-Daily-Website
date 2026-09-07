import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { WithId } from "mongodb";
import { BookOpenText, CalendarCheck, CalendarClock, Gamepad2, LogOut, NotebookPen, Users } from "lucide-react";
import { generateTeacherGamesLink, logoutTeacher, saveTeacherAttendance, saveTeacherMonthlyAssessment } from "@/app/teacher/actions";
import { TeacherLoginForm } from "@/app/teacher/login-form";
import { TeacherPortalTabs } from "@/app/teacher/teacher-tabs";
import { AssessmentStudentSelector } from "@/app/teacher/assessments/assessment-student-selector";
import { GameSessionLink } from "@/app/admin/sessions/game-session-link";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentAttendanceCollectionName, attendanceStatuses, type AttendanceStatus } from "@/lib/attendance";
import {
  assessmentAttendanceStatuses,
  getMonthlyAssessmentsCollectionName,
  type AssessmentAttendanceStatus,
  type AssessmentGrade,
  type MeetingAssessmentInput
} from "@/lib/assessments";
import { getRecordBillingPeriod } from "@/lib/billing-periods";
import {
  getClassSessionsCollectionName,
  getComputedClassSessionStatus,
  type ClassSessionDocument,
  type ComputedClassSessionStatus
} from "@/lib/class-sessions";
import { getGameSessionUrl, getGameSessionsCollectionName, isGameSessionExpired, type GameSessionDocument } from "@/lib/game-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { classModeOptions, getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { getBatchesCollectionName } from "@/lib/assessments";
import {
  isValidTeacherSession,
  TEACHER_ID_COOKIE,
  TEACHER_SESSION_COOKIE
} from "@/lib/teacher-auth";
import { getEmployeeTeacherById } from "@/lib/teachers";


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
  status?: AttendanceStatus;
  notes?: string;
  teacherIds?: string[];
  teacherNames?: string[];
  updatedAt?: Date;
};

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  activeBatchId?: string;
};

type BatchDocument = {
  batchName?: string;
  program?: string;
  teacherId?: string;
  teacherName?: string;
  days?: string;
  time?: string;
  status?: "active" | "archived";
};

type AssessmentRatings = {
  communication: {
    speaking: number;
    pronunciation: number;
    fluency: number;
  };
  englishSkills: {
    vocabulary: number;
    grammar: number;
  };
  creativity: {
    originalIdeas: number;
    storytelling: number;
    rolePlay: number;
  };
  learningHabits: {
    homework: number;
    respect: number;
  };
};

type AssessmentDocument = {
  studentId?: string;
  teacherId?: string;
  batchId?: string;
  batchName?: string;
  month?: number;
  year?: number;
  status?: string;
  meetings?: MeetingAssessmentInput[];
  attendance?: { attendancePercentage?: number; completedMeetings?: number; grade?: AssessmentGrade };
  participation?: { totalStars?: number; grade?: AssessmentGrade };
  communication?: { score?: number; grade?: AssessmentGrade };
  englishSkills?: { score?: number; grade?: AssessmentGrade };
  creativity?: { score?: number; grade?: AssessmentGrade };
  learningHabits?: { score?: number; grade?: AssessmentGrade };
  overall?: { score?: number; grade?: AssessmentGrade };
  ratings?: AssessmentRatings;
  teacherComments?: { en?: string; id?: string };
  updatedAt?: Date;
};

type TeacherSession = {
  id: string;
  studentId: string;
  studentName: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  meetingNumber: number;
  sessionDate: string;
  scheduledAt: string;
  endsAt: string;
  status: ComputedClassSessionStatus;
  gameLink: { url: string; expiresAt: string } | null;
};

type TeacherAttendance = {
  id: string;
  studentName: string;
  studentId: string;
  meetingNumber: number;
  meetingDate: string;
  status: AttendanceStatus;
  notes: string;
  courseJoined: string;
  classType: string;
  classMode: string;
};

type TeacherBatch = {
  id: string;
  batchName: string;
  program: string;
  days: string;
  time: string;
  students: TeacherBatchStudent[];
};

type TeacherBatchStudent = {
  studentId: string;
  studentName: string;
  classMode: string;
  assessmentStatus: string;
  attendancePercentage: number | null;
  completedMeetings: number;
  participationStars: number;
  overallGrade: AssessmentGrade | "";
  overallScore: number | null;
};

type TeacherAssessment = {
  id: string;
  studentId: string;
  batchId: string;
  batchName: string;
  month: number;
  year: number;
  status: string;
  meetings: MeetingAssessmentInput[];
  ratings: AssessmentRatings;
  teacherCommentEn: string;
  teacherCommentId: string;
};

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function formatTime(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function formatTimeRange(startValue: string, endValue: string) {
  if (!startValue && !endValue) return "Time not set";
  if (!endValue) return `${formatTime(startValue)} WIB`;
  return `${formatTime(startValue)} - ${formatTime(endValue)} WIB`;
}

function getTodayJakarta() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

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

function monthName(month: number, year: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function numberParam(value: string | string[] | undefined, fallback: number, min: number, max: number) {
  const rawValue = firstParam(value).trim();
  if (!rawValue) return fallback;

  const parsed = Number(rawValue);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function statusClassName(status: ComputedClassSessionStatus | AttendanceStatus) {
  if (status === "Completed" || status === "Present") return "bg-emerald-50 text-emerald-700";
  if (status === "Needs Attendance" || status === "Absent") return "bg-rose-50 text-rose-700";
  if (status === "Late") return "bg-yellow-50 text-yellow-800";
  return "bg-blue-50 text-lead-blue";
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

function starFromScore(score: number | undefined) {
  if (!score) return 3;
  return Math.max(1, Math.min(5, Math.round(score / 20)));
}

function defaultRatingsFromAssessment(assessment?: AssessmentDocument | null): AssessmentRatings {
  return {
    communication: {
      speaking: assessment?.ratings?.communication?.speaking || starFromScore(assessment?.communication?.score),
      pronunciation: assessment?.ratings?.communication?.pronunciation || starFromScore(assessment?.communication?.score),
      fluency: assessment?.ratings?.communication?.fluency || starFromScore(assessment?.communication?.score)
    },
    englishSkills: {
      vocabulary: assessment?.ratings?.englishSkills?.vocabulary || starFromScore(assessment?.englishSkills?.score),
      grammar: assessment?.ratings?.englishSkills?.grammar || starFromScore(assessment?.englishSkills?.score)
    },
    creativity: {
      originalIdeas: assessment?.ratings?.creativity?.originalIdeas || starFromScore(assessment?.creativity?.score),
      storytelling: assessment?.ratings?.creativity?.storytelling || starFromScore(assessment?.creativity?.score),
      rolePlay: assessment?.ratings?.creativity?.rolePlay || starFromScore(assessment?.creativity?.score)
    },
    learningHabits: {
      homework: assessment?.ratings?.learningHabits?.homework || starFromScore(assessment?.learningHabits?.score),
      respect: assessment?.ratings?.learningHabits?.respect || starFromScore(assessment?.learningHabits?.score)
    }
  };
}

function defaultMeetingsFromAssessment(assessment?: TeacherAssessment | null) {
  return Array.from({ length: 12 }, (_, index) => {
    const meeting = assessment?.meetings[index];

    return {
      attendance: meeting?.attendance || "Present",
      participationStars: meeting?.participationStars ?? 3,
      minutesLate: meeting?.minutesLate ?? 0
    };
  }) as Array<{
    attendance: AssessmentAttendanceStatus;
    participationStars: number;
    minutesLate: number;
  }>;
}

async function getAuthenticatedTeacher() {
  const cookieStore = await cookies();
  const teacherId = cookieStore.get(TEACHER_ID_COOKIE)?.value || "";
  const session = cookieStore.get(TEACHER_SESSION_COOKIE)?.value || "";

  const db = await getMongoDb();
  const teacher = await getEmployeeTeacherById(db, teacherId);

  if (!teacher?.username || !isValidTeacherSession(teacher.id, teacher.username, session)) {
    return null;
  }

  return { id: teacher.id, name: teacher.name };
}

async function getTeacherPortalData(teacherId: string, month: number, year: number) {
  const db = await getMongoDb();
  const [batchDocs, studentDocs] = await Promise.all([
    db
      .collection<BatchDocument>(getBatchesCollectionName())
      .find({ teacherId, status: { $ne: "archived" } })
      .sort({ startDate: -1 })
      .limit(50)
      .toArray() as Promise<WithId<BatchDocument>[]>,
    db
      .collection<StudentDocument>(getStudentRegistrationCollectionName())
      .find({
        $and: [
          getActiveStudentFilter(),
          { classType: "Basic Group" },
          { activeBatchId: { $exists: true, $ne: "" } }
        ]
      })
      .sort({ studentName: 1 })
      .limit(1000)
      .toArray() as Promise<WithId<StudentDocument>[]>
  ]);
  const assignedBatchIds = batchDocs.map((batch) => batch._id.toString());
  const savedAssessmentDocs = assignedBatchIds.length
    ? await db
        .collection<AssessmentDocument>(getMonthlyAssessmentsCollectionName())
        .find({ batchId: { $in: assignedBatchIds }, month, year })
        .sort({ year: -1, month: -1, updatedAt: -1 })
        .limit(5000)
        .toArray() as WithId<AssessmentDocument>[]
    : [];
  const assessmentDocs = savedAssessmentDocs.filter((assessment) => assessment.month === month && assessment.year === year);
  const teacherBatchIds = new Set(batchDocs.map((doc) => doc._id.toString()));
  const assessmentByStudent = new Map(assessmentDocs.map((doc) => [doc.studentId || "", doc]));

  return {
    batches: batchDocs.map((doc) => {
      const batchId = doc._id.toString();
      const students = studentDocs
        .filter((student) => student.activeBatchId === batchId && teacherBatchIds.has(student.activeBatchId || ""))
        .map((student) => {
          const assessment = assessmentByStudent.get(student.studentId || "");

          return {
            studentId: student.studentId || "",
            studentName: student.studentName || "Student",
            classMode: student.classMode || "Online",
            assessmentStatus: assessment?.status || "Not started",
            attendancePercentage: assessment?.attendance?.attendancePercentage ?? null,
            completedMeetings: assessment?.attendance?.completedMeetings || 0,
            participationStars: assessment?.participation?.totalStars || 0,
            overallGrade: normalizeGrade(assessment?.overall?.grade),
            overallScore: assessment?.overall?.score ?? null
          };
        });

      return {
        id: batchId,
        batchName: doc.batchName || "Batch",
        program: doc.program || "",
        days: doc.days || "",
        time: doc.time || "",
        students
      };
    }),
    assessments: assessmentDocs.map((assessment) => ({
      id: assessment._id.toString(),
      studentId: assessment.studentId || "",
      batchId: assessment.batchId || "",
      batchName: assessment.batchName || "",
      month: assessment.month || month,
      year: assessment.year || year,
      status: assessment.status || "Not started",
      meetings: assessment.meetings || [],
      ratings: defaultRatingsFromAssessment(assessment),
      teacherCommentEn: assessment.teacherComments?.en || "",
      teacherCommentId: assessment.teacherComments?.id || ""
    })),
    savedAssessments: savedAssessmentDocs.map((assessment) => ({
      id: assessment._id.toString(),
      studentId: assessment.studentId || "",
      batchId: assessment.batchId || "",
      batchName: assessment.batchName || "",
      month: assessment.month || month,
      year: assessment.year || year,
      status: assessment.status || "Not started",
      meetings: assessment.meetings || [],
      ratings: defaultRatingsFromAssessment(assessment),
      teacherCommentEn: assessment.teacherComments?.en || "",
      teacherCommentId: assessment.teacherComments?.id || ""
    }))
  };
}

export async function GroupMonthlyAssessment({
  searchParams
}: {
  searchParams?: Promise<{
    assessmentBatchId?: string | string[];
    assessmentStudentId?: string | string[];
    assessmentMonth?: string | string[];
    assessmentYear?: string | string[];
  }>;
}) {
  noStore();
  const resolvedSearchParams = await searchParams;
  const teacher = await getAuthenticatedTeacher();

  if (!teacher) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Teacher</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Teacher portal</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to see your classes, mark attendance, write journal notes, and generate games links.</p>
          <TeacherLoginForm />
        </Card>
      </main>
    );
  }

  const currentPeriod = currentJakartaMonth();
  const hasOpenedPeriod = Boolean(firstParam(resolvedSearchParams?.assessmentMonth) && firstParam(resolvedSearchParams?.assessmentYear));
  const requestedAssessmentMonth = numberParam(resolvedSearchParams?.assessmentMonth, currentPeriod.month, 1, 12);
  const requestedAssessmentYear = numberParam(resolvedSearchParams?.assessmentYear, currentPeriod.year, 2020, 2100);
  const data = await getTeacherPortalData(teacher.id, requestedAssessmentMonth, requestedAssessmentYear);
  const selectedAssessmentMonth = requestedAssessmentMonth;
  const selectedAssessmentYear = requestedAssessmentYear;
  const selectedAssessmentBatchId = firstParam(resolvedSearchParams?.assessmentBatchId) || data.batches[0]?.id || "";
  const selectedAssessmentStudentId = firstParam(resolvedSearchParams?.assessmentStudentId);
  const selectedBatch = data.batches.find((batch) => batch.id === selectedAssessmentBatchId);
  const selectedStudent = selectedBatch?.students.find((student) => student.studentId === selectedAssessmentStudentId);
  const selectedAssessment = data.savedAssessments.find(
    (assessment) =>
      assessment.studentId === selectedAssessmentStudentId &&
      assessment.batchId === selectedAssessmentBatchId &&
      assessment.month === selectedAssessmentMonth &&
      assessment.year === selectedAssessmentYear
  );
  const selectedAssessmentMeetings = defaultMeetingsFromAssessment(selectedAssessment);
  const selectedAssessmentRatings = selectedAssessment?.ratings || defaultRatingsFromAssessment();
  const isAssessmentReadyToEdit = Boolean(selectedBatch && selectedStudent && hasOpenedPeriod);

  return (
      <section id="monthly-assessment" className="scroll-mt-6">
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
            <AssessmentStudentSelector
              batches={data.batches}
              selectedBatchId={selectedAssessmentBatchId}
              selectedStudentId={selectedAssessmentStudentId}
            />

            <Card id="batch-assessment" className="scroll-mt-6 p-5">
              <div className="flex items-center gap-3">
                <NotebookPen className="h-5 w-5 text-lead-blue" />
                <h2 className="font-heading text-xl font-bold text-lead-navy">Monthly Student Assessment</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-lead-gray">
                Monthly assessment for your assigned group students. The system calculates grades automatically.
              </p>

              {selectedStudent && !hasOpenedPeriod ? (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="font-bold text-lead-navy">Choose the assessment period</p>
                  <p className="mt-1 text-sm text-lead-gray">Current month and year are selected by default.</p>
                </div>
              ) : null}

              {selectedStudent ? (
                <form action="/teacher/group-classes#monthly-assessment" className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="assessmentBatchId" value={selectedAssessmentBatchId} />
                  <input type="hidden" name="assessmentStudentId" value={selectedAssessmentStudentId} />
                  <label className="grid flex-1 gap-1 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
                    Month
                    <select name="assessmentMonth" defaultValue={String(selectedAssessmentMonth)} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-lead-navy">
                      {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{monthName(index + 1, selectedAssessmentYear).replace(` ${selectedAssessmentYear}`, "")}</option>)}
                    </select>
                  </label>
                  <label className="grid flex-1 gap-1 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
                    Year
                    <input name="assessmentYear" type="number" min={2020} max={2100} defaultValue={selectedAssessmentYear} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-lead-navy" />
                  </label>
                  <Button type="submit" variant="secondary">Open Period</Button>
                </form>
              ) : null}

              {isAssessmentReadyToEdit ? (
                <ActionFeedbackForm key={`${selectedAssessmentBatchId}:${selectedAssessmentStudentId}:${selectedAssessmentYear}:${selectedAssessmentMonth}`} action={saveTeacherMonthlyAssessment} successMessage="Monthly assessment saved." className="mt-5 grid gap-4">
                  <input type="hidden" name="batchId" value={selectedAssessmentBatchId} />
                  <input type="hidden" name="studentId" value={selectedAssessmentStudentId} />
                  <input type="hidden" name="month" value={selectedAssessmentMonth} />
                  <input type="hidden" name="year" value={selectedAssessmentYear} />
                  <div className="grid gap-3 rounded-2xl bg-lead-navy p-4 text-white">
                    <AssessmentContextStat label="Student" value={selectedStudent?.studentName || selectedAssessmentStudentId} helper={selectedAssessmentStudentId} />
                    <AssessmentContextStat label="Batch" value={selectedBatch?.batchName || "Selected batch"} helper={selectedBatch?.program || ""} />
                    <AssessmentContextStat label="Period" value={monthName(selectedAssessmentMonth, selectedAssessmentYear)} helper={selectedAssessment ? "Editing saved marks" : "Creating new assessment"} />
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-lead-gray">
                    <p className="font-bold text-lead-navy">Attendance from Group Classes</p>
                    <p className="mt-2">{selectedAssessmentMeetings.filter((meeting) => meeting.attendance === "Present" || meeting.attendance === "Excused").length}/12 meetings completed / {selectedAssessmentMeetings.reduce((total, meeting) => total + meeting.participationStars, 0)}/60 stars</p>
                    <p className="mt-2">Attendance, participation and lateness are loaded automatically. Rate the monthly skills below.</p>
                  </div>

                  <AssessmentGroup
                    title="Communication"
                    items={[
                      ["Speaking", "speaking"],
                      ["Pronunciation", "pronunciation"],
                      ["Fluency", "fluency"]
                    ]}
                    values={selectedAssessmentRatings.communication}
                  />
                  <AssessmentGroup
                    title="English Skills"
                    items={[
                      ["Vocabulary", "vocabulary"],
                      ["Grammar", "grammar"]
                    ]}
                    values={selectedAssessmentRatings.englishSkills}
                  />
                  <AssessmentGroup
                    title="Creativity"
                    items={[
                      ["Original Ideas", "originalIdeas"],
                      ["Storytelling", "storytelling"],
                      ["Role-play", "rolePlay"]
                    ]}
                    values={selectedAssessmentRatings.creativity}
                  />
                  <AssessmentGroup
                    title="Learning Habits"
                    items={[
                      ["Homework", "homework"],
                      ["Respect", "respect"]
                    ]}
                    values={selectedAssessmentRatings.learningHabits}
                  />

                  <label className="grid gap-2 text-sm font-bold text-lead-navy">
                    Teacher Comment (English)
                    <textarea name="teacherCommentEn" rows={4} defaultValue={selectedAssessment?.teacherCommentEn || ""} placeholder="Leave blank to use automatic comment." className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-lead-navy">
                    Teacher Comment (Bahasa Indonesia)
                    <textarea name="teacherCommentId" rows={4} defaultValue={selectedAssessment?.teacherCommentId || ""} placeholder="Kosongkan untuk komentar otomatis." className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-lead-gray"><input type="checkbox" name="regenerateComments" /> Regenerate both comments from the updated grade</label>
                  <Button type="submit" className="w-full">Save Monthly Assessment</Button>
                </ActionFeedbackForm>
              ) : (
                <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">
                  {selectedStudent ? "Select the month and year, then press Open Period to begin the assessment." : "Select a student from the left to continue."}
                </p>
              )}
            </Card>
        </div>
      </section>
  );
}


function AssessmentGroup({
  title,
  items,
  values
}: {
  title: string;
  items: Array<[string, string]>;
  values?: Record<string, number>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <h3 className="font-heading text-lg font-bold text-lead-navy">{title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map(([label, name]) => (
          <label key={name} className="grid gap-2 text-sm font-bold text-lead-navy">
            {label}
            <select name={name} defaultValue={String(values?.[name] || 3)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-lead-navy">
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

function AssessmentContextStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-100">{label}</p>
      <p className="mt-1 font-heading text-lg font-extrabold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-blue-100">{helper}</p> : null}
    </div>
  );
}
