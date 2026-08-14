import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, BookOpenText, ChevronDown, LogOut, UserRound } from "lucide-react";
import { ObjectId } from "mongodb";
import { logoutTeacher } from "@/app/teacher/actions";
import { TeacherLoginForm } from "@/app/teacher/login-form";
import { TeacherPortalTabs } from "@/app/teacher/teacher-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentAttendanceCollectionName, type AttendanceStatus } from "@/lib/attendance";
import { ensureTeacherJournalIndex } from "@/lib/journal-indexes";
import { getMongoDb } from "@/lib/mongodb";
import { isValidTeacherSession, TEACHER_ID_COOKIE, TEACHER_SESSION_COOKIE } from "@/lib/teacher-auth";
import { getEmployeeTeacherById } from "@/lib/teachers";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "All Journals | LEAD Teacher", robots: { index: false, follow: false } };

const PAGE_SIZE = 12;

type JournalDocument = {
  studentId?: string;
  studentName?: string;
  meetingNumber?: number;
  meetingDate?: string;
  courseJoined?: string;
  classMode?: string;
  status?: AttendanceStatus;
  notes?: string;
  teacherIds?: string[];
  updatedAt?: Date;
};

type StudentSummary = { _id: string; studentName: string; journalCount: number; latestJournalDate: string };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function formatDate(value: string) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

function statusColor(status: AttendanceStatus | undefined) {
  if (status === "Present") return "bg-emerald-50 text-emerald-700";
  if (status === "Late") return "bg-amber-50 text-amber-800";
  if (status === "Absent") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-600";
}

async function getTeacher() {
  const cookieStore = await cookies();
  const teacherId = cookieStore.get(TEACHER_ID_COOKIE)?.value || "";
  const session = cookieStore.get(TEACHER_SESSION_COOKIE)?.value || "";
  const db = await getMongoDb();
  const teacher = await getEmployeeTeacherById(db, teacherId);
  if (!teacher?.username || !isValidTeacherSession(teacher.id, teacher.username, session)) return null;
  return teacher;
}

function archiveHref(studentId: string, beforeDate?: string, beforeId?: string) {
  const params = new URLSearchParams();
  if (studentId) params.set("studentId", studentId);
  if (beforeDate && beforeId) {
    params.set("beforeDate", beforeDate);
    params.set("beforeId", beforeId);
  }
  return `/teacher/journals/all?${params.toString()}`;
}

export default async function AllTeacherJournalsPage({ searchParams }: { searchParams?: Promise<{ studentId?: string | string[]; beforeDate?: string | string[]; beforeId?: string | string[] }> }) {
  noStore();
  const teacher = await getTeacher();
  if (!teacher) {
    return <main className="grid min-h-screen place-items-center bg-lead-soft px-4 py-10"><Card className="w-full max-w-md p-8"><p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Teacher</p><h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Journal archive</h1><p className="mt-3 text-lead-gray">Sign in to see journals written by you.</p><TeacherLoginForm /></Card></main>;
  }

  const params = await searchParams;
  const requestedStudentId = first(params?.studentId);
  const beforeDate = first(params?.beforeDate);
  const beforeId = first(params?.beforeId);
  const db = await getMongoDb();
  await ensureTeacherJournalIndex(db);
  const collection = db.collection<JournalDocument>(getStudentAttendanceCollectionName());
  const studentSummaries = await collection.aggregate<StudentSummary>([
    { $match: { teacherIds: teacher.id, studentId: { $type: "string", $ne: "" }, notes: { $type: "string", $ne: "" } } },
    { $group: { _id: "$studentId", studentName: { $last: "$studentName" }, journalCount: { $sum: 1 }, latestJournalDate: { $max: "$meetingDate" } } },
    { $sort: { studentName: 1 } },
    { $limit: 500 }
  ]).toArray();
  const selectedStudentId = studentSummaries.some((student) => student._id === requestedStudentId) ? requestedStudentId : studentSummaries[0]?._id || "";
  const selectedStudent = studentSummaries.find((student) => student._id === selectedStudentId);

  const baseFilter: Record<string, unknown> = { teacherIds: teacher.id, studentId: selectedStudentId, notes: { $type: "string", $ne: "" } };
  let filter: Record<string, unknown> = baseFilter;
  if (beforeDate && ObjectId.isValid(beforeId)) {
    filter = { $and: [baseFilter, { $or: [{ meetingDate: { $lt: beforeDate } }, { meetingDate: beforeDate, _id: { $lt: new ObjectId(beforeId) } }] }] };
  }
  const journals = selectedStudentId ? await collection.find(filter, {
    projection: { studentId: 1, studentName: 1, meetingNumber: 1, meetingDate: 1, courseJoined: 1, classMode: 1, status: 1, notes: 1, updatedAt: 1 }
  }).sort({ meetingDate: -1, _id: -1 }).limit(PAGE_SIZE + 1).toArray() : [];
  const hasMore = journals.length > PAGE_SIZE;
  const visibleJournals = journals.slice(0, PAGE_SIZE);
  const lastJournal = visibleJournals.at(-1);

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-blue-100 bg-white">
        <div className="container-shell flex flex-col gap-4 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Journal Archive</p><h1 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">All Journals</h1><p className="mt-2 text-sm text-lead-gray">Student-wise history of journals written by {teacher.name}.</p></div>
          <div className="flex flex-wrap gap-2"><Button asChild variant="secondary"><a href="/teacher/journals"><ArrowLeft className="h-4 w-4" /> Journal Center</a></Button><form action={logoutTeacher}><Button type="submit" variant="secondary"><LogOut className="h-4 w-4" /> Logout</Button></form></div>
        </div>
        <TeacherPortalTabs active="journal" />
      </header>

      <section className="container-shell grid gap-6 py-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
        <Card className="p-5 lg:sticky lg:top-5">
          <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-lead-blue" /><h2 className="font-heading text-xl font-bold text-lead-navy">Select Student</h2></div>
          <p className="mt-2 text-sm leading-6 text-lead-gray">Only students with journals written by you are listed.</p>
          <form action="/teacher/journals/all" className="mt-4 grid gap-3">
            <select name="studentId" defaultValue={selectedStudentId} className="focus-ring w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-lead-navy">
              {studentSummaries.map((student) => <option key={student._id} value={student._id}>{student.studentName} ({student.journalCount})</option>)}
            </select>
            <Button type="submit">Open Journals</Button>
          </form>
          <div className="mt-5 rounded-xl bg-blue-50 p-4"><p className="font-heading text-2xl font-extrabold text-lead-blue">{selectedStudent?.journalCount || 0}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Total journals</p></div>
        </Card>

        <div className="grid gap-4">
          <Card className="flex items-start gap-3 p-5"><BookOpenText className="mt-1 h-5 w-5 text-lead-blue" /><div><h2 className="font-heading text-xl font-extrabold text-lead-navy">{selectedStudent?.studentName || "No journals found"}</h2><p className="mt-1 text-sm text-lead-gray">Newest journals are shown first. Older records load 12 at a time.</p></div></Card>
          {visibleJournals.map((journal) => (
            <Card key={journal._id.toString()} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-heading text-lg font-bold text-lead-navy">Meeting {journal.meetingNumber || "-"}</h3><p className="mt-1 text-sm font-semibold text-lead-gray">{formatDate(journal.meetingDate || "")} / {journal.courseJoined || "Course not set"} / {journal.classMode || "Mode not set"}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase ${statusColor(journal.status)}`}>{journal.status || "Recorded"}</span></div>
              <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-lead-navy">{journal.notes}</div>
            </Card>
          ))}
          {!visibleJournals.length ? <Card className="p-8 text-center text-sm text-lead-gray">No completed journals written by you yet.</Card> : null}
          {hasMore && lastJournal ? <Button asChild variant="secondary" className="mx-auto"><a href={archiveHref(selectedStudentId, lastJournal.meetingDate || "", lastJournal._id.toString())}><ChevronDown className="h-4 w-4" /> Load Older Journals</a></Button> : null}
        </div>
      </section>
    </main>
  );
}
