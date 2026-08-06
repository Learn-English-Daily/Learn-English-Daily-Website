import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { WithId } from "mongodb";
import { CalendarCheck, CircleHelp } from "lucide-react";
import { TranslateJournalButton } from "@/components/parent/translate-journal-button";
import { Card } from "@/components/ui/card";
import { getMonthlyAssessmentsCollectionName, type AssessmentGrade } from "@/lib/assessments";
import {
  getStudentAttendanceCollectionName,
  type AttendanceStatus
} from "@/lib/attendance";
import { getMongoDb } from "@/lib/mongodb";
import { getStudentRegistrationCollectionName } from "@/lib/student-registration";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Parent Attendance Portal | LEAD",
  robots: {
    index: false,
    follow: false
  }
};

type StudentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  parentAccessToken?: string;
};

type AttendanceDocument = {
  studentId?: string;
  meetingNumber?: number;
  meetingDate?: string;
  status?: AttendanceStatus;
  classMode?: string;
  notes?: string;
  teacherNames?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

type MonthlyAssessmentDocument = {
  studentId?: string;
  studentName?: string;
  batchName?: string;
  program?: string;
  teacherName?: string;
  month?: number;
  year?: number;
  attendance?: { attendancePercentage?: number; completedMeetings?: number; score?: number; grade?: AssessmentGrade; label?: string };
  participation?: { totalStars?: number; averageStars?: number; score?: number; grade?: AssessmentGrade; label?: string };
  communication?: { score?: number; grade?: AssessmentGrade; label?: string };
  englishSkills?: { score?: number; grade?: AssessmentGrade; label?: string };
  confidence?: { score?: number; grade?: AssessmentGrade; label?: string };
  creativity?: { score?: number; grade?: AssessmentGrade; label?: string };
  learningHabits?: { score?: number; grade?: AssessmentGrade; label?: string };
  overall?: { score?: number; grade?: AssessmentGrade; label?: string };
  teacherComments?: { en?: string; id?: string };
};

type Student = {
  studentName: string;
  courseJoined: string;
  classType: string;
};

type Attendance = {
  meetingNumber: number;
  meetingDate: string;
  status: AttendanceStatus;
  classMode: string;
  notes: string;
  teacherNames: string[];
};

type MonthlyAssessment = {
  batchName: string;
  program: string;
  teacherName: string;
  month: number;
  year: number;
  attendancePercentage: number;
  completedMeetings: number;
  participationStars: number;
  communicationGrade: AssessmentGrade | "";
  englishSkillsGrade: AssessmentGrade | "";
  confidenceGrade: AssessmentGrade | "";
  creativityGrade: AssessmentGrade | "";
  learningHabitsGrade: AssessmentGrade | "";
  overallScore: number;
  overallGrade: AssessmentGrade | "";
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

function statusClassName(status: AttendanceStatus) {
  if (status === "Present") return "bg-emerald-50 text-emerald-700";
  if (status === "Absent") return "bg-rose-50 text-rose-700";
  if (status === "Late") return "bg-yellow-50 text-yellow-800";
  return "bg-slate-100 text-slate-600";
}

function countStatus(attendance: Attendance[], status: AttendanceStatus) {
  return attendance.filter((record) => record.status === status).length;
}

function gradeClassName(grade: AssessmentGrade | "") {
  if (grade === "A") return "bg-emerald-50 text-emerald-700";
  if (grade === "B") return "bg-yellow-50 text-yellow-800";
  if (grade === "C") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

function monthName(month: number, year: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
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

async function getParentPortalData(token: string): Promise<{ student: Student; attendance: Attendance[]; assessment: MonthlyAssessment | null } | null> {
  if (!token || token.length < 20) return null;

  const db = await getMongoDb();
  const currentPeriod = currentJakartaMonth();
  const studentDoc = (await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .findOne({ parentAccessToken: token })) as WithId<StudentDocument> | null;

  if (!studentDoc?.studentId) return null;

  const attendanceDocs = (await db
    .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
    .find({ studentId: studentDoc.studentId })
    .sort({ meetingDate: -1, updatedAt: -1, createdAt: -1, meetingNumber: -1 })
    .limit(200)
    .toArray()) as WithId<AttendanceDocument>[];
  const assessmentDoc = (await db
    .collection<MonthlyAssessmentDocument>(getMonthlyAssessmentsCollectionName())
    .find({ studentId: studentDoc.studentId, month: currentPeriod.month, year: currentPeriod.year })
    .sort({ updatedAt: -1 })
    .limit(1)
    .next()) as WithId<MonthlyAssessmentDocument> | null;

  return {
    student: {
      studentName: studentDoc.studentName || "Student",
      courseJoined: studentDoc.courseJoined || "",
      classType: studentDoc.classType || ""
    },
    attendance: attendanceDocs.map((record) => ({
      meetingNumber: record.meetingNumber || 0,
      meetingDate: record.meetingDate || "",
      status: record.status || "Present",
      classMode: record.classMode || "Online",
      notes: record.notes || "",
      teacherNames: record.teacherNames || []
    })),
    assessment: assessmentDoc
      ? {
          batchName: assessmentDoc.batchName || "",
          program: assessmentDoc.program || "",
          teacherName: assessmentDoc.teacherName || "",
          month: assessmentDoc.month || currentPeriod.month,
          year: assessmentDoc.year || currentPeriod.year,
          attendancePercentage: assessmentDoc.attendance?.attendancePercentage || 0,
          completedMeetings: assessmentDoc.attendance?.completedMeetings || 0,
          participationStars: assessmentDoc.participation?.totalStars || 0,
          communicationGrade: assessmentDoc.communication?.grade || "",
          englishSkillsGrade: assessmentDoc.englishSkills?.grade || "",
          confidenceGrade: assessmentDoc.confidence?.grade || "",
          creativityGrade: assessmentDoc.creativity?.grade || "",
          learningHabitsGrade: assessmentDoc.learningHabits?.grade || "",
          overallScore: assessmentDoc.overall?.score || 0,
          overallGrade: assessmentDoc.overall?.grade || "",
          teacherCommentEn: assessmentDoc.teacherComments?.en || "",
          teacherCommentId: assessmentDoc.teacherComments?.id || ""
        }
      : null
  };
}

export default async function ParentAttendancePortalPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  noStore();
  const resolvedParams = await params;
  const data = await getParentPortalData(resolvedParams.token);

  if (!data) {
    notFound();
  }

  const { student, attendance, assessment } = data;
  const isGroupStudent = student.classType === "Basic Group";
  const latestAttendance = attendance[0];
  const presentCount = countStatus(attendance, "Present");
  const lateCount = countStatus(attendance, "Late");
  const absentCount = countStatus(attendance, "Absent");
  const cancelledCount = countStatus(attendance, "Cancelled");
  const countedMeetings = presentCount + lateCount + absentCount;
  const attendanceRate = countedMeetings ? Math.round(((presentCount + lateCount) / countedMeetings) * 100) : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-8">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Parent Portal</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{isGroupStudent ? "Progress Report" : "Attendance Report"}</h1>
            <p className="mt-2 text-sm text-lead-gray">{isGroupStudent ? "Read-only monthly progress view for parents." : "Read-only attendance view for parents."}</p>
          </div>
        </header>

        <Card className="overflow-hidden">
          <div className="bg-lead-blue p-5 text-white">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-100">Student</p>
              <h2 className="mt-2 font-heading text-3xl font-extrabold">{student.studentName}</h2>
              <p className="mt-2 text-blue-50">{student.courseJoined} / {student.classType}</p>
            </div>
          </div>

          {!isGroupStudent ? (
            <div className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-heading text-xl font-bold text-lead-navy">Attendance to date</h3>
                <p className="mt-1 text-sm text-lead-gray">Cumulative results for all recorded meetings.</p>
              </div>
              <p className="text-sm font-semibold text-lead-gray">
                Attendance rate: <span className="font-heading text-xl font-extrabold text-lead-blue">{attendanceRate === null ? "Not available" : `${attendanceRate}%`}</span>
              </p>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <Summary label="Present" value={presentCount} total={countedMeetings} className="text-emerald-600" description={`Attended ${presentCount} ${meetingWord(presentCount)} on time.`} />
                <Summary label="Late" value={lateCount} total={countedMeetings} className="text-yellow-700" description={`Attended ${lateCount} ${meetingWord(lateCount)} after the scheduled start time.`} />
                <Summary label="Absent" value={absentCount} total={countedMeetings} className="text-rose-600" description={`Missed ${absentCount} scheduled ${meetingWord(absentCount)}.`} />
                <Summary label="Cancelled" value={cancelledCount} total={attendance.length} className="text-slate-600" description={`${cancelledCount} ${meetingWord(cancelledCount)} cancelled and excluded from the attendance rate.`} />
              </div>
            </div>
          ) : null}
        </Card>

        {!isGroupStudent ? (
        <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-lead-blue">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-lead-navy">Latest Class Update</h2>
                <p className="text-sm text-lead-gray">The most recent attendance and journal note.</p>
              </div>
            </div>
            {latestAttendance ? (
              <article className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-lead-gray">Meeting {latestAttendance.meetingNumber}</p>
                      <p className="mt-2 font-heading text-2xl font-bold text-lead-navy">{formatDate(latestAttendance.meetingDate)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`w-fit rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(latestAttendance.status)}`}>
                        {latestAttendance.status}
                      </span>
                      <span className="w-fit rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">
                        {latestAttendance.classMode}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-lead-gray">
                    <span className="font-bold text-lead-navy">Teachers:</span> {latestAttendance.teacherNames.length ? latestAttendance.teacherNames.join(", ") : "Not assigned"}
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-heading text-lg font-bold text-lead-navy">Journal Notes</h3>
                  {latestAttendance.notes ? (
                    <>
                      <p lang="en" className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-lead-gray">
                        {latestAttendance.notes}
                      </p>
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <TranslateJournalButton text={latestAttendance.notes} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-lead-gray">No journal notes were added for this meeting.</p>
                  )}
                </div>
              </article>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No attendance has been marked yet.</p>
            )}
        </Card>
        ) : null}

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-lead-blue">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-lead-navy">Monthly Assessment</h2>
              <p className="text-sm text-lead-gray">Current month progress report.</p>
            </div>
          </div>

          {assessment ? (
            <div className="mt-5 grid gap-5">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-lead-gray">{monthName(assessment.month, assessment.year)}</p>
                    <h3 className="mt-1 font-heading text-2xl font-extrabold text-lead-navy">{assessment.batchName || student.courseJoined}</h3>
                    <p className="mt-1 text-sm text-lead-gray">{assessment.program || student.courseJoined} / Teacher: {assessment.teacherName || "Not assigned"}</p>
                  </div>
                  <span className={`w-fit rounded-lg px-4 py-2 text-sm font-extrabold uppercase ${gradeClassName(assessment.overallGrade)}`}>
                    Overall Grade {assessment.overallGrade || "-"} / {assessment.overallScore}%
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <AssessmentStat label="Attendance" value={`${assessment.attendancePercentage}%`} helper={`${assessment.completedMeetings}/12 meetings completed`} />
                <AssessmentStat label="Participation" value={`${assessment.participationStars}/60`} helper="Monthly stars earned" />
                <AssessmentStat label="Confidence" value={assessment.confidenceGrade || "-"} helper="From participation score" />
                <AssessmentStat label="Learning Habits" value={assessment.learningHabitsGrade || "-"} helper="Attendance, punctuality, homework, respect" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <GradePill label="Communication" grade={assessment.communicationGrade} />
                <GradePill label="English Skills" grade={assessment.englishSkillsGrade} />
                <GradePill label="Creativity" grade={assessment.creativityGrade} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="font-heading text-lg font-bold text-lead-navy">Teacher Comment</h3>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-lead-gray">{assessment.teacherCommentEn || "No comment added yet."}</p>
                  {assessment.teacherCommentEn ? (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <TranslateJournalButton text={assessment.teacherCommentEn} />
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                  <h3 className="font-heading text-lg font-bold text-lead-navy">Komentar Guru</h3>
                  <p lang="id" className="mt-3 whitespace-pre-wrap text-sm leading-6 text-lead-gray">{assessment.teacherCommentId || "Belum ada komentar."}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No monthly assessment has been finalized yet.</p>
          )}
        </Card>
      </section>
    </main>
  );
}

function Summary({
  label,
  value,
  total,
  className,
  description
}: {
  label: string;
  value: number;
  total: number;
  className: string;
  description: string;
}) {
  return (
    <div
      tabIndex={0}
      aria-label={`${label}: ${value}. ${description}`}
      className="group rounded-lg bg-slate-50 p-4 outline-none transition focus-ring"
    >
      <p className={`font-heading text-3xl font-extrabold ${className}`}>
        {value} <span className="text-base font-bold text-lead-gray">of {total} {meetingWord(total)}</span>
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-lead-gray">
        <span>{label}</span>
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <p className="max-h-0 overflow-hidden text-xs leading-5 text-lead-gray opacity-0 transition-all duration-200 group-hover:mt-2 group-hover:max-h-16 group-hover:opacity-100 group-focus:mt-2 group-focus:max-h-16 group-focus:opacity-100">
        {description}
      </p>
    </div>
  );
}

function meetingWord(count: number) {
  return count === 1 ? "meeting" : "meetings";
}

function AssessmentStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="font-heading text-2xl font-extrabold text-lead-blue">{value}</p>
      <p className="mt-1 text-sm font-bold text-lead-navy">{label}</p>
      <p className="mt-1 text-xs leading-5 text-lead-gray">{helper}</p>
    </div>
  );
}

function GradePill({ label, grade }: { label: string; grade: AssessmentGrade | "" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <span className="text-sm font-bold text-lead-navy">{label}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase ${gradeClassName(grade)}`}>{grade || "-"}</span>
    </div>
  );
}
