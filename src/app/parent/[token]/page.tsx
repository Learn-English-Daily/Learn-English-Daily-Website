import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import type { WithId } from "mongodb";
import { CalendarCheck, Clock, UserRound } from "lucide-react";
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
  parentName?: string;
  courseJoined?: string;
  classType?: string;
  parentAccessToken?: string;
};

type AttendanceDocument = {
  studentId?: string;
  meetingNumber?: number;
  meetingDate?: string;
  status?: AttendanceStatus;
  createdAt?: Date;
};

type Student = {
  studentId: string;
  studentName: string;
  parentName: string;
  courseJoined: string;
  classType: string;
};

type Attendance = {
  meetingNumber: number;
  meetingDate: string;
  status: AttendanceStatus;
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
      studentId: studentDoc.studentId,
      studentName: studentDoc.studentName || "Student",
      parentName: studentDoc.parentName || "Parent",
      courseJoined: studentDoc.courseJoined || "",
      classType: studentDoc.classType || ""
    },
    attendance: attendanceDocs.map((record) => ({
      meetingNumber: record.meetingNumber || 0,
      meetingDate: record.meetingDate || "",
      status: record.status || "Present"
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
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-soft md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Parent Portal</p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Attendance Report</h1>
            <p className="mt-2 text-sm text-lead-gray">Read-only attendance view for parents.</p>
          </div>
          <div className="rounded-lg bg-lead-navy px-4 py-3 text-sm font-bold text-white">
            {student.studentId}
          </div>
        </header>

        <Card className="overflow-hidden">
          <div className="bg-lead-blue p-5 text-white">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-blue-100">Student</p>
                <h2 className="mt-2 font-heading text-3xl font-extrabold">{student.studentName}</h2>
                <p className="mt-2 text-blue-50">{student.courseJoined} / {student.classType}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-3 text-sm font-bold">
                <UserRound className="h-4 w-4" />
                Parent: {student.parentName}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-4">
            <Summary label="Present" value={countStatus(attendance, "Present")} className="text-emerald-600" />
            <Summary label="Late" value={countStatus(attendance, "Late")} className="text-yellow-700" />
            <Summary label="Absent" value={countStatus(attendance, "Absent")} className="text-rose-600" />
            <Summary label="Cancelled" value={countStatus(attendance, "Cancelled")} className="text-slate-600" />
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-lead-blue">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-lead-navy">Latest Update</h2>
                <p className="text-sm text-lead-gray">Attendance updates after admin marks class.</p>
              </div>
            </div>
            {latestAttendance ? (
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-lead-gray">Meeting {latestAttendance.meetingNumber}</p>
                <p className="mt-2 font-heading text-2xl font-bold text-lead-navy">{formatDate(latestAttendance.meetingDate)}</p>
                <span className={`mt-3 inline-flex rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(latestAttendance.status)}`}>
                  {latestAttendance.status}
                </span>
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No attendance has been marked yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-lead-blue">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-lead-navy">Class Attendance</h2>
                <p className="text-sm text-lead-gray">Meeting-by-meeting attendance history.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {attendance.map((record) => (
                <div key={`${record.meetingNumber}-${record.meetingDate}`} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-heading font-bold text-lead-navy">Meeting {record.meetingNumber}</p>
                    <p className="mt-1 text-sm text-lead-gray">{formatDate(record.meetingDate)}</p>
                  </div>
                  <span className={`w-fit rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(record.status)}`}>
                    {record.status}
                  </span>
                </div>
              ))}
              {!attendance.length ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">Attendance records will appear here after classes begin.</p>
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}

function Summary({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className={`font-heading text-3xl font-extrabold ${className}`}>{value}</p>
      <p className="mt-1 text-sm font-semibold text-lead-gray">{label}</p>
    </div>
  );
}
