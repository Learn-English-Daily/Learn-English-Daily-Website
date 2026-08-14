import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Archive, BookOpenText, Copy, LogOut, NotebookPen, Search } from "lucide-react";
import { ObjectId, type WithId } from "mongodb";
import { logoutTeacher, updateTeacherJournal } from "@/app/teacher/actions";
import { TeacherLoginForm } from "@/app/teacher/login-form";
import { TeacherPortalTabs } from "@/app/teacher/teacher-tabs";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getStudentAttendanceCollectionName, type AttendanceStatus } from "@/lib/attendance";
import { getMongoDb } from "@/lib/mongodb";
import {
  isValidTeacherSession,
  TEACHER_ID_COOKIE,
  TEACHER_SESSION_COOKIE
} from "@/lib/teacher-auth";
import { getEmployeeTeacherById } from "@/lib/teachers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teacher Journal Center | LEAD",
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
  createdAt?: Date;
};

type JournalRecord = {
  id: string;
  studentId: string;
  studentName: string;
  meetingNumber: number;
  meetingDate: string;
  status: AttendanceStatus;
  notes: string;
  courseJoined: string;
  classType: string;
  classMode: string;
  updatedAt: Date | null;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(value: string) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function formatUpdatedAt(value: Date | null) {
  if (!value) return "Not saved yet";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(value);
}

function statusClassName(status: AttendanceStatus) {
  if (status === "Present") return "bg-emerald-50 text-emerald-700";
  if (status === "Absent") return "bg-rose-50 text-rose-700";
  if (status === "Late") return "bg-yellow-50 text-yellow-800";
  return "bg-slate-100 text-slate-600";
}

function journalStateClassName(hasNotes: boolean) {
  return hasNotes ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-800";
}

function buildBlankJournalTemplate(record: JournalRecord) {
  const topic = record.courseJoined ? `${record.courseJoined} class` : "";

  return `TOPIC: ${topic}

1. OBJECTIVE TODAY
[ ] Vocab    [ ] Speaking    [ ] Game    [ ] Review

2. WHAT WE DID:
- Activity 1: 
- Activity 2: 
- Activity 3: 

3. STUDENT PROGRESS:
Performance Score: 1  2  3  4  5  6  7  8  9  10

Progress:

Problem:

4. NEXT MEETING PLAN:
Teach:
Homework:

5. NOTE FOR PARENT / REFLEKSI GURU:
`;
}

function mapJournalRecord(doc: WithId<AttendanceDocument>): JournalRecord {
  return {
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Student",
    meetingNumber: doc.meetingNumber || 0,
    meetingDate: doc.meetingDate || "",
    status: doc.status || "Present",
    notes: doc.notes || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "",
    updatedAt: doc.updatedAt || doc.createdAt || null
  };
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

async function getTeacherJournalRecords(teacherId: string, search: string) {
  const db = await getMongoDb();
  const filter: Record<string, unknown> = { teacherIds: teacherId };
  const trimmedSearch = search.trim();

  if (trimmedSearch) {
    const regex = new RegExp(escapeRegex(trimmedSearch), "i");
    filter.$or = [
      { studentName: regex },
      { studentId: regex },
      { courseJoined: regex },
      { notes: regex }
    ];
  }

  const records = await db
    .collection<AttendanceDocument>(getStudentAttendanceCollectionName())
    .find(filter)
    .sort({ meetingDate: -1, updatedAt: -1, createdAt: -1 })
    .limit(90)
    .toArray() as WithId<AttendanceDocument>[];

  return records.map(mapJournalRecord);
}

async function getTeacherJournalRecord(teacherId: string, recordId: string) {
  if (!ObjectId.isValid(recordId)) return null;

  const db = await getMongoDb();
  const record = await db.collection<AttendanceDocument>(getStudentAttendanceCollectionName()).findOne({
    _id: new ObjectId(recordId),
    teacherIds: teacherId
  }) as WithId<AttendanceDocument> | null;

  return record ? mapJournalRecord(record) : null;
}

function buildJournalHref(recordId: string, copyFromId?: string, search?: string) {
  const params = new URLSearchParams({ recordId });
  if (copyFromId) params.set("copyFromId", copyFromId);
  if (search) params.set("search", search);
  return `/teacher/journals?${params.toString()}`;
}

function JournalRecordCard({
  record,
  selected,
  search
}: {
  record: JournalRecord;
  selected: boolean;
  search: string;
}) {
  return (
    <a
      href={buildJournalHref(record.id, undefined, search)}
      className={`focus-ring block rounded-xl border p-4 transition hover:border-lead-blue hover:bg-blue-50 ${
        selected ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-heading text-lg font-bold text-lead-navy">{record.studentName}</p>
        <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${statusClassName(record.status)}`}>{record.status}</span>
        <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${journalStateClassName(Boolean(record.notes))}`}>
          {record.notes ? "Journal done" : "Needs journal"}
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold text-lead-gray">
        Meeting {record.meetingNumber} / {formatDate(record.meetingDate)} / {record.classMode || "Mode not set"}
      </p>
      <p className="mt-2 text-sm text-lead-gray">
        {record.notes ? `${record.notes.slice(0, 120)}${record.notes.length > 120 ? "..." : ""}` : "No journal written yet."}
      </p>
    </a>
  );
}

function TemplateCard({
  record,
  selectedRecordId,
  search
}: {
  record: JournalRecord;
  selectedRecordId: string;
  search: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-lead-navy">{record.studentName}</p>
          <p className="mt-1 text-xs font-semibold text-lead-gray">
            Meeting {record.meetingNumber} / {formatDate(record.meetingDate)}
          </p>
        </div>
        <a
          href={buildJournalHref(selectedRecordId, record.id, search)}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-lead-blue transition hover:bg-blue-100"
        >
          <Copy className="h-3.5 w-3.5" />
          Use
        </a>
      </div>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-lead-gray">{record.notes}</p>
    </div>
  );
}

export default async function TeacherJournalPage({
  searchParams
}: {
  searchParams?: Promise<{
    recordId?: string | string[];
    copyFromId?: string | string[];
    search?: string | string[];
  }>;
}) {
  noStore();
  const teacher = await getAuthenticatedTeacher();

  if (!teacher) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Teacher</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Journal center</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to write parent-ready class journals and reuse previous notes.</p>
          <TeacherLoginForm />
        </Card>
      </main>
    );
  }

  const resolvedSearchParams = await searchParams;
  const search = firstParam(resolvedSearchParams?.search);
  const requestedRecordId = firstParam(resolvedSearchParams?.recordId);
  const copyFromId = firstParam(resolvedSearchParams?.copyFromId);
  const records = await getTeacherJournalRecords(teacher.id, search);
  const requestedRecord = requestedRecordId ? await getTeacherJournalRecord(teacher.id, requestedRecordId) : null;
  const journalQueue = records.filter((record) => !record.notes);
  const completedRecords = records.filter((record) => record.notes);
  const selectedRecord = requestedRecord || journalQueue[0] || records[0] || null;
  const copySource = copyFromId ? await getTeacherJournalRecord(teacher.id, copyFromId) : null;
  const draftNotes = selectedRecord ? copySource?.notes || selectedRecord.notes || buildBlankJournalTemplate(selectedRecord) : "";
  const lastThreeStudentJournals = selectedRecord
    ? records.filter((record) => record.id !== selectedRecord.id && record.studentId === selectedRecord.studentId && record.notes).slice(0, 3)
    : [];
  const recentTemplates = selectedRecord
    ? records.filter((record) => record.id !== selectedRecord.id && record.notes && record.studentId !== selectedRecord.studentId).slice(0, 5)
    : records.filter((record) => record.notes).slice(0, 5);

  return (
    <main className="min-h-screen bg-lead-soft">
      <header className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)]">
        <div className="container-shell flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-lead-blue shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
              <BookOpenText className="h-4 w-4" />
              LEAD Journal Center
            </p>
            <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-lead-navy sm:text-4xl">
              Class journals made faster
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-lead-gray">
              Pick a recent class, write the parent update, or reuse a previous journal as a template. Saved notes update the same parent QR journal.
            </p>
            <p className="mt-3 text-sm font-semibold text-lead-gray">Signed in as <span className="text-lead-navy">{teacher.name}</span></p>
          </div>
          <div className="flex flex-wrap gap-3 lg:pt-2">
            <Button asChild>
              <a href="/teacher/journals/all"><Archive className="h-4 w-4" /> All Journals</a>
            </Button>
            <form action={logoutTeacher}>
              <Button type="submit" variant="secondary">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </form>
          </div>
        </div>
        <TeacherPortalTabs active="journal" />
      </header>

      <section className="container-shell grid gap-6 py-8 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="grid gap-5 content-start">
          <Card className="p-5">
            <form action="/teacher/journals" className="grid gap-3">
              <label className="grid gap-2 text-sm font-bold text-lead-navy">
                Search student or notes
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-lead-gray" />
                  <input
                    name="search"
                    defaultValue={search}
                    placeholder="Student name, ID, course, keyword..."
                    className="focus-ring w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-lead-navy"
                  />
                </div>
              </label>
              <Button type="submit" variant="secondary">Search Journals</Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <NotebookPen className="h-5 w-5 text-lead-blue" />
              <h2 className="font-heading text-xl font-bold text-lead-navy">Classes Needing Journal</h2>
            </div>
            <p className="mt-1 text-sm text-lead-gray">
              Select the class first, then complete the guided report.
            </p>
            <div className="mt-4 grid max-h-[760px] gap-3 overflow-y-auto pr-1">
              {journalQueue.map((record) => (
                <JournalRecordCard key={record.id} record={record} selected={selectedRecord?.id === record.id} search={search} />
              ))}
              {!journalQueue.length ? <p className="rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">No unfinished journals found. All clean.</p> : null}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Completed Journals</h2>
            <p className="mt-1 text-sm text-lead-gray">Open an older class if you need to edit it.</p>
            <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
              {completedRecords.map((record) => (
                <JournalRecordCard key={record.id} record={record} selected={selectedRecord?.id === record.id} search={search} />
              ))}
              {!completedRecords.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No completed journals yet.</p> : null}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 content-start">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-lead-blue">Journal Editor</p>
                <h2 className="mt-2 font-heading text-2xl font-extrabold text-lead-navy">
                  {selectedRecord ? selectedRecord.studentName : "Select a class record"}
                </h2>
                {selectedRecord ? (
                  <p className="mt-1 text-sm font-semibold text-lead-gray">
                    Meeting {selectedRecord.meetingNumber} / {formatDate(selectedRecord.meetingDate)} / {selectedRecord.courseJoined || "Course not set"} / {selectedRecord.classMode || "Mode not set"}
                  </p>
                ) : null}
              </div>
              {selectedRecord ? (
                <span className={`w-fit rounded-lg px-3 py-2 text-xs font-bold uppercase ${statusClassName(selectedRecord.status)}`}>
                  {selectedRecord.status}
                </span>
              ) : null}
            </div>

            {copySource ? (
              <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-lead-blue">
                Copied draft from {copySource.studentName}, meeting {copySource.meetingNumber}. Review it before saving.
              </p>
            ) : null}

            {selectedRecord ? (
              <ActionFeedbackForm action={updateTeacherJournal} successMessage="Journal saved successfully." className="mt-5 grid gap-4">
                <input type="hidden" name="attendanceId" value={selectedRecord.id} />
                <label className="grid gap-2 text-sm font-bold text-lead-navy">
                  Guided journal report
                  <textarea
                    name="notes"
                    rows={24}
                    defaultValue={draftNotes}
                    placeholder="Complete the guided journal report for this class."
                    className="focus-ring min-h-[760px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-4 font-mono text-sm leading-7 text-lead-navy"
                  />
                </label>
                <Button type="submit" className="w-full sm:w-fit">
                  <NotebookPen className="h-4 w-4" />
                  Save Journal
                </Button>
              </ActionFeedbackForm>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">
                Mark attendance first, then the class will appear here for journaling.
              </p>
            )}
          </Card>

          {selectedRecord ? (
            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-heading text-xl font-bold text-lead-navy">Last 3 Journals For This Student</h3>
                <p className="mt-1 text-sm text-lead-gray">Copy one when today continues from the previous class.</p>
                <div className="mt-4 grid gap-3">
                  {lastThreeStudentJournals.map((record) => (
                    <TemplateCard key={record.id} record={record} selectedRecordId={selectedRecord.id} search={search} />
                  ))}
                  {!lastThreeStudentJournals.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No previous journal notes for this student yet.</p> : null}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-heading text-xl font-bold text-lead-navy">Recent Journal Templates</h3>
                <p className="mt-1 text-sm text-lead-gray">Useful when teachers want a structure they already wrote well.</p>
                <div className="mt-4 grid gap-3">
                  {recentTemplates.map((record) => (
                    <TemplateCard key={record.id} record={record} selectedRecordId={selectedRecord.id} search={search} />
                  ))}
                  {!recentTemplates.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">No reusable journal templates yet.</p> : null}
                </div>
              </Card>
            </section>
          ) : null}

          {selectedRecord ? (
            <Card className="p-5">
              <h3 className="font-heading text-xl font-bold text-lead-navy">Journal Details</h3>
              <div className="mt-4 grid gap-3 text-sm text-lead-gray sm:grid-cols-2 lg:grid-cols-4">
                <p><span className="font-bold text-lead-navy">Student ID:</span> {selectedRecord.studentId || "-"}</p>
                <p><span className="font-bold text-lead-navy">Class type:</span> {selectedRecord.classType || "-"}</p>
                <p><span className="font-bold text-lead-navy">Last saved:</span> {formatUpdatedAt(selectedRecord.updatedAt)}</p>
                <p><span className="font-bold text-lead-navy">Parent QR:</span> Updates automatically</p>
              </div>
            </Card>
          ) : null}
        </div>
      </section>
    </main>
  );
}
