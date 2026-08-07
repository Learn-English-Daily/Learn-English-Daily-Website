import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { WithId } from "mongodb";
import { CalendarCheck, CalendarClock, Gamepad2, LogOut, NotebookPen, Users } from "lucide-react";
import { generateTeacherGamesLink, logoutTeacher, saveTeacherAttendance, saveTeacherMonthlyAssessment } from "@/app/teacher/actions";
import { TeacherLoginForm } from "@/app/teacher/login-form";
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teacher Portal | LEAD",
  robots: { index: false, follow: false }
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

function numberParam(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const [sessionDocs, attendanceDocs, gameSessionDocs, batchDocs, studentDocs, assessmentDocs] = await Promise.all([
    db
      .collection<ClassSessionDocument>(getClassSessionsCollectionName())
      .find({ teacherIds: teacherId })
      .sort({ scheduledAt: 1, createdAt: 1 })
      .limit(200)
      .toArray() as Promise<WithId<ClassSessionDocument>[]>,
    db
      .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
      .find({ teacherIds: teacherId })
      .sort({ meetingDate: -1, updatedAt: -1 })
      .limit(40)
      .toArray() as Promise<WithId<AttendanceDocument>[]>,
    db
      .collection<GameSessionDocument>(getGameSessionsCollectionName())
      .find({ gameType: "games-hub" })
      .sort({ updatedAt: -1 })
      .limit(500)
      .toArray(),
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
      .toArray() as Promise<WithId<StudentDocument>[]>,
    db
      .collection<AssessmentDocument>(getMonthlyAssessmentsCollectionName())
      .find({ teacherId, month, year })
      .limit(2000)
      .toArray() as Promise<WithId<AssessmentDocument>[]>
  ]);
  const attendanceKeys = new Set(
    attendanceDocs.map((doc) => {
      const period = getRecordBillingPeriod(doc);
      return `${doc.studentId || ""}:${doc.meetingNumber || 0}:${period.billingPeriod}`;
    })
  );
  const gameSessionsByClassId = new Map(
    gameSessionDocs
      .filter((doc) => doc.classSessionId && doc.token && !isGameSessionExpired(doc.expiresAt))
      .map((doc) => [
        doc.classSessionId || "",
        {
          url: getGameSessionUrl(doc.token || ""),
          expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : ""
        }
      ])
  );

  const sessions: TeacherSession[] = sessionDocs.flatMap((doc) => {
    const studentId = doc.studentId || "";
    const meetingNumber = doc.meetingNumber || 0;
    const period = getRecordBillingPeriod(doc);
    const attendanceKey = `${studentId}:${meetingNumber}:${period.billingPeriod}`;

    if (doc.status === "Completed" || attendanceKeys.has(attendanceKey)) {
      return [];
    }

    return [{
      id: doc._id.toString(),
      studentId,
      studentName: doc.studentName || "Student",
      courseJoined: doc.courseJoined || "",
      classType: doc.classType || "",
      classMode: doc.classMode || "Online",
      meetingNumber,
      sessionDate: doc.sessionDate || "",
      scheduledAt: doc.scheduledAt || "",
      endsAt: doc.endsAt || "",
      status: getComputedClassSessionStatus({
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        endsAt: doc.endsAt,
        hasAttendance: attendanceKeys.has(attendanceKey)
      }),
      gameLink: gameSessionsByClassId.get(doc._id.toString()) || null
    }];
  });

  const teacherBatchIds = new Set(batchDocs.map((doc) => doc._id.toString()));
  const assessmentByStudent = new Map(assessmentDocs.map((doc) => [doc.studentId || "", doc]));

  return {
    sessions,
    recentAttendance: attendanceDocs.map((doc) => ({
      id: doc._id.toString(),
      studentName: doc.studentName || "Student",
      studentId: doc.studentId || "",
      meetingNumber: doc.meetingNumber || 0,
      meetingDate: doc.meetingDate || "",
      status: doc.status || "Present",
      notes: doc.notes || "",
      courseJoined: doc.courseJoined || "",
      classType: doc.classType || "",
      classMode: doc.classMode || ""
    })),
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
    }))
  };
}

export default async function TeacherPortalPage({
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
  const selectedAssessmentMonth = numberParam(resolvedSearchParams?.assessmentMonth, currentPeriod.month);
  const selectedAssessmentYear = numberParam(resolvedSearchParams?.assessmentYear, currentPeriod.year);
  const selectedAssessmentBatchId = firstParam(resolvedSearchParams?.assessmentBatchId);
  const selectedAssessmentStudentId = firstParam(resolvedSearchParams?.assessmentStudentId);
  const data = await getTeacherPortalData(teacher.id, selectedAssessmentMonth, selectedAssessmentYear);
  const today = getTodayJakarta();
  const todaysSessions = data.sessions.filter((session) => session.sessionDate === today);
  const missedSessions = data.sessions.filter((session) => session.sessionDate < today);
  const needsAttendance = todaysSessions.filter((session) => session.status === "Needs Attendance");
  const selectedBatch = data.batches.find((batch) => batch.id === selectedAssessmentBatchId);
  const selectedStudent = selectedBatch?.students.find((student) => student.studentId === selectedAssessmentStudentId);
  const selectedAssessment = data.assessments.find(
    (assessment) =>
      assessment.studentId === selectedAssessmentStudentId &&
      assessment.batchId === selectedAssessmentBatchId &&
      assessment.month === selectedAssessmentMonth &&
      assessment.year === selectedAssessmentYear
  );
  const selectedAssessmentMeetings = defaultMeetingsFromAssessment(selectedAssessment);
  const selectedAssessmentRatings = selectedAssessment?.ratings || defaultRatingsFromAssessment();
  const isAssessmentReadyToEdit = Boolean(selectedBatch && selectedStudent);

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)]">
        <div className="container-shell flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-lead-blue shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
              <NotebookPen className="h-4 w-4" />
              LEAD Teacher
            </p>
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-lead-navy sm:text-4xl">
              Welcome, {teacher.name}
            </h1>
            <p className="mt-3 text-sm leading-6 text-lead-gray">
              Your teaching command center: classes, attendance, journal notes, games links, and batch overview.
            </p>
          </div>
          <form action={logoutTeacher} className="lg:pt-2">
            <Button type="submit" variant="secondary">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </form>
        </div>
      </header>

      <section className="container-shell grid gap-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TeacherKpi icon={CalendarClock} label="Today" value={todaysSessions.length} detail="Classes scheduled today" />
          <TeacherKpi icon={CalendarCheck} label="Needs Attendance" value={needsAttendance.length} detail="Today's classes waiting" tone="rose" />
          <TeacherKpi icon={CalendarCheck} label="Missed" value={missedSessions.length} detail="Past unmarked classes" tone="rose" />
          <TeacherKpi icon={NotebookPen} label="Recent Records" value={data.recentAttendance.length} detail="Your latest attendance entries" tone="blue" />
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6 content-start">
            <TeacherSessionList
              title="Today's Class Queue"
              description="Only today's classes assigned to you appear here. Times are Indonesia WIB."
              badge={`${todaysSessions.length} today`}
              sessions={todaysSessions}
              emptyText="No classes assigned to you for today."
            />
            <TeacherSessionList
              title="Missed Attendance"
              description="Past assigned classes that still do not have attendance. Future scheduled classes stay hidden."
              badge={`${missedSessions.length} missed`}
              sessions={missedSessions}
              emptyText="No missed attendance. Nice and clean."
              urgent
            />
          </div>

          <div className="grid gap-6 content-start">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-lead-blue" />
                <h2 className="font-heading text-xl font-bold text-lead-navy">Assigned Batches</h2>
              </div>
              <form action="/teacher" className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-lead-navy">
                  Assessment Month
                  <select name="assessmentMonth" defaultValue={String(selectedAssessmentMonth)} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {monthName(index + 1, selectedAssessmentYear).replace(` ${selectedAssessmentYear}`, "")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-lead-navy">
                  Year
                  <input name="assessmentYear" type="number" min={2020} max={2100} defaultValue={selectedAssessmentYear} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
                </label>
                <Button type="submit" variant="secondary" className="sm:col-span-2">Load Month</Button>
              </form>
              <div className="mt-4 grid gap-3">
                {data.batches.map((batch) => (
                  <div key={batch.id} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-heading font-bold text-lead-navy">{batch.batchName}</p>
                        <p className="mt-1 text-sm text-lead-gray">{batch.program}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-lead-gray">{batch.days} / {batch.time}</p>
                      </div>
                      <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold text-lead-blue">{batch.students.length} students</span>
                    </div>
                    <div className="mt-4 grid gap-2">
                      {batch.students.map((student) => (
                        <a
                          key={student.studentId}
                          href={`/teacher?assessmentBatchId=${encodeURIComponent(batch.id)}&assessmentStudentId=${encodeURIComponent(student.studentId)}&assessmentMonth=${selectedAssessmentMonth}&assessmentYear=${selectedAssessmentYear}#batch-assessment`}
                          className={`focus-ring rounded-lg border p-3 transition hover:border-lead-blue hover:bg-blue-50 ${
                            selectedAssessmentBatchId === batch.id && selectedAssessmentStudentId === student.studentId
                              ? "border-lead-blue bg-blue-50"
                              : "border-slate-100 bg-slate-50"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-lead-navy">{student.studentName}</p>
                            <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${gradeClassName(student.overallGrade)}`}>
                              {student.overallGrade ? `Grade ${student.overallGrade}` : student.assessmentStatus}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-lead-gray">
                            {student.studentId} / {student.classMode} / Attendance {student.attendancePercentage === null ? "-" : `${student.attendancePercentage}%`} / Stars {student.participationStars}/60
                          </p>
                        </a>
                      ))}
                      {!batch.students.length ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-lead-gray">No students assigned to this batch yet.</p> : null}
                    </div>
                  </div>
                ))}
                {!data.batches.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No active batches assigned yet.</p> : null}
              </div>
            </Card>

            <Card id="batch-assessment" className="scroll-mt-6 p-5">
              <div className="flex items-center gap-3">
                <NotebookPen className="h-5 w-5 text-lead-blue" />
                <h2 className="font-heading text-xl font-bold text-lead-navy">Batch Assessment</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-lead-gray">
                Monthly assessment for your assigned group students. The system calculates grades automatically.
              </p>

              {isAssessmentReadyToEdit ? (
                <ActionFeedbackForm action={saveTeacherMonthlyAssessment} successMessage="Monthly assessment saved." className="mt-5 grid gap-4">
                  <input type="hidden" name="batchId" value={selectedAssessmentBatchId} />
                  <input type="hidden" name="studentId" value={selectedAssessmentStudentId} />
                  <input type="hidden" name="month" value={selectedAssessmentMonth} />
                  <input type="hidden" name="year" value={selectedAssessmentYear} />
                  <div className="grid gap-3 rounded-2xl bg-lead-navy p-4 text-white">
                    <AssessmentContextStat label="Student" value={selectedStudent?.studentName || selectedAssessmentStudentId} helper={selectedAssessmentStudentId} />
                    <AssessmentContextStat label="Batch" value={selectedBatch?.batchName || "Selected batch"} helper={selectedBatch?.program || ""} />
                    <AssessmentContextStat label="Period" value={monthName(selectedAssessmentMonth, selectedAssessmentYear)} helper={selectedAssessment ? "Editing saved marks" : "Creating new assessment"} />
                  </div>

                  <div className="rounded-xl border border-slate-200">
                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                      <h3 className="font-heading text-lg font-bold text-lead-navy">12 Meeting Tracker</h3>
                      <p className="text-xs text-lead-gray">Present and Excused count as completed. Teacher only fills status, stars, and late minutes.</p>
                    </div>
                    <div className="grid gap-3 p-4">
                      {selectedAssessmentMeetings.map((meeting, index) => (
                        <MeetingAssessmentRow key={index + 1} index={index + 1} meeting={meeting} />
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
                  <Button type="submit" className="w-full">Save Monthly Assessment</Button>
                </ActionFeedbackForm>
              ) : (
                <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">
                  Select a student from your assigned batch list above to open the assessment form.
                </p>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <NotebookPen className="h-5 w-5 text-lead-blue" />
                <h2 className="font-heading text-xl font-bold text-lead-navy">Recent Teaching Records</h2>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {data.recentAttendance.slice(0, 12).map((record) => (
                  <div key={record.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-bold text-lead-navy">{record.studentName}</p>
                      <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${statusClassName(record.status)}`}>{record.status}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-lead-gray">
                      Meeting {record.meetingNumber} / {formatDate(record.meetingDate)} / {record.courseJoined} / {record.classMode || "Mode not set"}
                    </p>
                    {record.notes ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-lead-gray">{record.notes}</p> : null}
                  </div>
                ))}
                {!data.recentAttendance.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No attendance records yet.</p> : null}
              </div>
            </Card>
          </div>
        </section>
      </section>
    </main>
  );
}

function TeacherKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone = "navy"
}: {
  icon: typeof CalendarClock;
  label: string;
  value: number;
  detail: string;
  tone?: "navy" | "rose" | "blue";
}) {
  const toneClassName =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "blue"
        ? "bg-blue-50 text-lead-blue"
        : "bg-slate-100 text-lead-navy";

  return (
    <Card className="p-5">
      <span className={`grid h-11 w-11 place-items-center rounded-xl ${toneClassName}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">{value}</p>
      <p className="mt-1 text-sm font-semibold text-lead-gray">{detail}</p>
    </Card>
  );
}

function TeacherSessionList({
  title,
  description,
  badge,
  sessions,
  emptyText,
  urgent = false
}: {
  title: string;
  description: string;
  badge: string;
  sessions: TeacherSession[];
  emptyText: string;
  urgent?: boolean;
}) {
  return (
    <Card className={`p-5 ${urgent && sessions.length ? "border-rose-200" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-lead-navy">{title}</h2>
          <p className="mt-1 text-sm text-lead-gray">{description}</p>
        </div>
        <span className={`w-fit rounded-lg px-3 py-2 text-sm font-bold ${urgent && sessions.length ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-lead-blue"}`}>
          {badge}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        {sessions.map((session) => (
          <TeacherSessionCard key={session.id} session={session} />
        ))}
        {!sessions.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">{emptyText}</p> : null}
      </div>
    </Card>
  );
}

function TeacherSessionCard({ session }: { session: TeacherSession }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-lg font-bold text-lead-navy">{session.studentName}</h3>
        <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{session.studentId}</span>
        <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(session.status)}`}>{session.status}</span>
        <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">{session.classMode}</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-lead-gray">
        Meeting {session.meetingNumber} / {formatDate(session.scheduledAt)} / {formatTimeRange(session.scheduledAt, session.endsAt)}
      </p>
      <p className="mt-1 text-sm text-lead-gray">{session.courseJoined} / {session.classType || "Class type not set"}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ActionFeedbackForm action={saveTeacherAttendance} successMessage="Attendance saved. This class will leave your queue." className="grid gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <input type="hidden" name="classSessionId" value={session.id} />
          <label className="grid gap-2 text-sm font-bold text-lead-navy">
            Attendance
            <select name="status" defaultValue="Present" className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
              {attendanceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-lead-navy">
            Class Mode
            <select name="classMode" defaultValue={session.classMode} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
              {classModeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-lead-navy sm:col-span-2">
            Journal Notes
            <textarea name="notes" rows={4} placeholder="Write what was covered, student progress, homework, or parent update." className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
          </label>
          <Button type="submit" className="sm:col-span-2">
            <CalendarCheck className="h-4 w-4" />
            Save Attendance
          </Button>
        </ActionFeedbackForm>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-lead-navy">Class games</p>
              <p className="mt-1 text-xs text-lead-gray">Private games hub link for this class.</p>
            </div>
            <ActionFeedbackForm action={generateTeacherGamesLink} successMessage="Games link generated." className="grid gap-2">
              <input type="hidden" name="classSessionId" value={session.id} />
              <Button type="submit" size="sm" variant="secondary">
                <Gamepad2 className="h-4 w-4" />
                {session.gameLink ? "Regenerate" : "Generate"}
              </Button>
            </ActionFeedbackForm>
          </div>
          {session.gameLink ? <div className="mt-3"><GameSessionLink url={session.gameLink.url} expiresAt={session.gameLink.expiresAt} /></div> : null}
        </div>
      </div>
    </div>
  );
}

function MeetingAssessmentRow({
  index,
  meeting
}: {
  index: number;
  meeting: {
    attendance: AssessmentAttendanceStatus;
    participationStars: number;
    minutesLate: number;
  };
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_8px_18px_rgba(15,23,42,0.04)] sm:grid-cols-[56px_1fr_1fr_1fr] sm:items-end">
      <p className="w-fit rounded-lg bg-blue-50 px-3 py-2 text-center font-heading text-sm font-extrabold text-lead-blue">M{index}</p>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
        <span>Status</span>
        <select name={`attendance_${index}`} defaultValue={meeting.attendance} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-lead-navy">
          {assessmentAttendanceStatuses.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
        <span>Stars</span>
        <select name={`stars_${index}`} defaultValue={String(meeting.participationStars)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-lead-navy">
          {[0, 1, 2, 3, 4, 5].map((star) => (
            <option key={star} value={star}>{star} stars</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-lead-gray">
        <span>Late mins</span>
        <input name={`late_${index}`} type="number" min={0} max={240} defaultValue={meeting.minutesLate} aria-label={`Meeting ${index} minutes late`} placeholder="0" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold normal-case tracking-normal text-lead-navy" />
      </label>
    </div>
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
