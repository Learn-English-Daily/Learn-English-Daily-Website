import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { WithId } from "mongodb";
import { CalendarCheck, CircleHelp } from "lucide-react";
import { TranslateJournalButton } from "@/components/parent/translate-journal-button";
import { Card } from "@/components/ui/card";
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
  notes?: string;
  teacherNames?: string[];
  createdAt?: Date;
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
  notes: string;
  teacherNames: string[];
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

async function getParentPortalData(token: string): Promise<{ student: Student; attendance: Attendance[] } | null> {
  if (!token || token.length < 20) return null;

  const db = await getMongoDb();
  const studentDoc = (await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .findOne({ parentAccessToken: token })) as WithId<StudentDocument> | null;

  if (!studentDoc?.studentId) return null;

  const attendanceDocs = (await db
    .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
    .find({ studentId: studentDoc.studentId })
    .sort({ meetingNumber: 1, meetingDate: 1 })
    .limit(200)
    .toArray()) as WithId<AttendanceDocument>[];

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
      notes: record.notes || "",
      teacherNames: record.teacherNames || []
    }))
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

  const { student, attendance } = data;
  const latestAttendance = attendance[attendance.length - 1];

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-8">
      <section className="mx-auto grid w-full max-w-5xl gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Parent Portal</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Attendance Report</h1>
            <p className="mt-2 text-sm text-lead-gray">Read-only attendance view for parents.</p>
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

          <div className="grid gap-4 p-5 md:grid-cols-4">
            <Summary label="Present" value={countStatus(attendance, "Present")} className="text-emerald-600" description="Classes attended as scheduled." />
            <Summary label="Late" value={countStatus(attendance, "Late")} className="text-yellow-700" description="Classes attended after the scheduled start time." />
            <Summary label="Absent" value={countStatus(attendance, "Absent")} className="text-rose-600" description="Scheduled classes the student did not attend." />
            <Summary label="Cancelled" value={countStatus(attendance, "Cancelled")} className="text-slate-600" description="Classes cancelled and not treated as an absence." />
          </div>
        </Card>

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
                    <span className={`w-fit rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(latestAttendance.status)}`}>
                      {latestAttendance.status}
                    </span>
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
      </section>
    </main>
  );
}

function Summary({
  label,
  value,
  className,
  description
}: {
  label: string;
  value: number;
  className: string;
  description: string;
}) {
  return (
    <div
      tabIndex={0}
      aria-label={`${label}: ${value}. ${description}`}
      className="group rounded-lg bg-slate-50 p-4 outline-none transition focus-ring"
    >
      <p className={`font-heading text-3xl font-extrabold ${className}`}>{value}</p>
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
