import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { ExternalLink, ReceiptText, Search } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminLoginForm } from "@/app/admin/login-form";
import { saveGroupStudentPayment, updateStudentPaymentStatus } from "@/app/admin/payments/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_SESSION_COOKIE, isAdminConfigured, isValidAdminSession } from "@/lib/admin-auth";
import { getMonthlyAssessmentsCollectionName } from "@/lib/assessments";
import { getMongoDb } from "@/lib/mongodb";
import {
  formatRupiah,
  getStudentPaymentsCollectionName,
  paymentMethods,
  paymentStatuses,
  type PaymentStatus
} from "@/lib/payments";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";

export const dynamic = "force-dynamic";

const paymentReceiptsDriveUrl = "https://drive.google.com/drive/folders/1E7IPAVCN_oRlYGYGkpQk3hTrHNuOVF4B?usp=drive_link";

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

type PaymentDocument = {
  studentId?: string;
  studentName?: string;
  courseJoined?: string;
  classType?: string;
  classMode?: string;
  meetingNumber?: number;
  meetingDate?: string;
  amountDue?: number;
  status?: PaymentStatus;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  receiptUploadedToDrive?: boolean;
  source?: string;
  billingMonth?: number;
  billingYear?: number;
  completedMeetings?: number;
  amountPerMeeting?: number;
  batchName?: string;
  attendanceStatus?: string;
  createdAt?: Date;
};

type Payment = {
  id: string;
  meetingNumber: number;
  meetingDate: string;
  amountDue: number;
  status: PaymentStatus;
  paidDate: string;
  paymentMethod: string;
  notes: string;
  receiptUploadedToDrive: boolean;
  source: string;
  billingMonth: number;
  billingYear: number;
  completedMeetings: number;
  amountPerMeeting: number;
  batchName: string;
  attendanceStatus: string;
  classMode: string;
  createdAt: string;
};

type GroupAssessmentDocument = {
  studentId?: string;
  batchName?: string;
  program?: string;
  month?: number;
  year?: number;
  attendance?: {
    completedMeetings?: number;
    attendancePercentage?: number;
  };
};

type GroupPaymentContext = {
  batchName: string;
  program: string;
  month: number;
  year: number;
  completedMeetings: number;
  attendancePercentage: number;
} | null;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

function monthName(month: number, year: number) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthInputValue(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function normalizePaymentName(value = "") {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function nameEditDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const beforeUpdate = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      diagonal = beforeUpdate;
    }
  }

  return previous[right.length];
}

function isLikelySamePaymentName(paymentName: string, studentName: string) {
  if (!paymentName || !studentName || paymentName === studentName) return true;
  if (paymentName.includes(studentName) || studentName.includes(paymentName)) return true;

  const maxDistance = Math.max(2, Math.ceil(Math.max(paymentName.length, studentName.length) * 0.16));
  return nameEditDistance(paymentName, studentName) <= maxDistance;
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
  const filter = search ? { $and: [getActiveStudentFilter(), searchFilter] } : getActiveStudentFilter();

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
    classMode: doc.classMode || "",
    englishLevel: doc.englishLevel || ""
  }));
}

async function getSelectedStudent(studentId = "") {
  if (!studentId) return null;

  const db = await getMongoDb();
  const doc = await db.collection<StudentDocument>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId }, getActiveStudentFilter()]
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
    classMode: doc.classMode || "",
    englishLevel: doc.englishLevel || ""
  };
}

async function getPayments(studentId = "", studentName = ""): Promise<Payment[]> {
  if (!studentId) return [];

  const db = await getMongoDb();
  const normalizedStudentName = normalizePaymentName(studentName);
  const docs = (await db
    .collection<PaymentDocument>(getStudentPaymentsCollectionName())
    .find({ studentId })
    .sort({ meetingNumber: -1, meetingDate: -1 })
    .limit(200)
    .toArray()) as WithId<PaymentDocument>[];

  return docs.filter((doc) => {
    const paymentName = normalizePaymentName(doc.studentName);
    return isLikelySamePaymentName(paymentName, normalizedStudentName);
  }).map((doc) => ({
    id: doc._id.toString(),
    meetingNumber: doc.meetingNumber || 0,
    meetingDate: doc.meetingDate || "",
    amountDue: doc.amountDue || 0,
    status: doc.status || "Unpaid",
    paidDate: doc.paidDate || "",
    paymentMethod: doc.paymentMethod || "",
    notes: doc.notes || "",
    receiptUploadedToDrive: doc.receiptUploadedToDrive === true,
    source: doc.source || "",
    billingMonth: doc.billingMonth || 0,
    billingYear: doc.billingYear || 0,
    completedMeetings: doc.completedMeetings || 0,
    amountPerMeeting: doc.amountPerMeeting || 0,
    batchName: doc.batchName || "",
    attendanceStatus: doc.attendanceStatus || "",
    classMode: doc.classMode || "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : ""
  }));
}

async function getGroupPaymentContext(studentId = "", isGroupStudent = false): Promise<GroupPaymentContext> {
  if (!studentId || !isGroupStudent) return null;

  const db = await getMongoDb();
  const currentPeriod = currentJakartaMonth();
  const currentAssessment = (await db
    .collection<GroupAssessmentDocument>(getMonthlyAssessmentsCollectionName())
    .findOne({ studentId, month: currentPeriod.month, year: currentPeriod.year })) as WithId<GroupAssessmentDocument> | null;
  const assessment =
    currentAssessment ||
    ((await db
      .collection<GroupAssessmentDocument>(getMonthlyAssessmentsCollectionName())
      .find({ studentId })
      .sort({ year: -1, month: -1, updatedAt: -1 })
      .limit(1)
      .next()) as WithId<GroupAssessmentDocument> | null);

  if (!assessment) return null;

  return {
    batchName: assessment.batchName || "",
    program: assessment.program || "",
    month: assessment.month || currentPeriod.month,
    year: assessment.year || currentPeriod.year,
    completedMeetings: assessment.attendance?.completedMeetings || 0,
    attendancePercentage: assessment.attendance?.attendancePercentage || 0
  };
}

function statusClassName(status: PaymentStatus) {
  return status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-800";
}

export default async function AdminPaymentsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[]; studentId?: string | string[] }>;
}) {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const resolvedSearchParams = await searchParams;
  const searchQuery = Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams?.q[0] || "" : resolvedSearchParams?.q || "";
  const selectedStudentId = Array.isArray(resolvedSearchParams?.studentId) ? resolvedSearchParams?.studentId[0] || "" : resolvedSearchParams?.studentId || "";

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
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Track student payments</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to update payment status for attendance-generated records.</p>
          <AdminLoginForm />
        </Card>
      </main>
    );
  }

  const [students, selectedStudent] = await Promise.all([getStudents(searchQuery), getSelectedStudent(selectedStudentId)]);
  const isGroupStudent = selectedStudent?.classType === "Basic Group";
  const [payments, groupPaymentContext] = await Promise.all([
    selectedStudent ? getPayments(selectedStudent.studentId, selectedStudent.studentName) : [],
    selectedStudent ? getGroupPaymentContext(selectedStudent.studentId, isGroupStudent) : null
  ]);
  const totalPaid = payments.filter((payment) => payment.status === "Paid").reduce((sum, payment) => sum + payment.amountDue, 0);
  const totalUnpaid = payments.filter((payment) => payment.status === "Unpaid").reduce((sum, payment) => sum + payment.amountDue, 0);

  return (
    <main className="min-h-screen bg-lead-soft">
      <AdminPageHeader
        active="payments"
        title="Student payments"
        description="Review individual attendance payments and create flexible group payments from batch assessments."
        logoutAction={logoutAdmin}
      />

      <section className="container-shell grid items-start gap-6 py-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="p-4">
            <form action="/admin/payments" className="flex flex-col gap-3 md:flex-row">
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
          </Card>

          <Card className="p-5 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Select student</h2>
            <div className="mt-4 grid gap-3">
              {students.map((student) => (
                <a
                  key={student.id}
                  href={`/admin/payments?studentId=${encodeURIComponent(student.studentId)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`}
                  className={`focus-ring rounded-lg border p-4 transition hover:border-lead-blue hover:bg-blue-50 ${
                    selectedStudent?.studentId === student.studentId ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{student.studentId || "No ID"}</span>
                    <span className="font-heading font-bold text-lead-navy">{student.studentName}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-lead-gray">{student.courseJoined} / {student.classType} / {student.classMode || "Mode not set"}</p>
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
                    <p className="mt-2 text-sm font-semibold text-lead-gray">{selectedStudent.courseJoined} / {selectedStudent.classType} / {selectedStudent.classMode || "Mode not set"}</p>
                    <p className="mt-2 text-sm text-lead-gray">
                      {isGroupStudent
                        ? "Use the batch assessment attendance below to create this student's group payment."
                        : "Mark attendance as Present or Late to generate a payment due for that meeting."}
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm font-bold md:text-right">
                    <p className="text-emerald-600">Paid: {formatRupiah(totalPaid)}</p>
                    <p className="text-yellow-700">Unpaid: {formatRupiah(totalUnpaid)}</p>
                    {totalUnpaid > 0 ? (
                      <Button asChild variant="secondary" size="sm">
                        <a href={`/admin/payments/student/${encodeURIComponent(selectedStudent.studentId)}/request`} target="_blank" rel="noreferrer">
                          <ReceiptText className="h-4 w-4" />
                          Open Cumulative Request
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>

              {isGroupStudent ? (
                <Card className="p-5">
                  <h2 className="font-heading text-xl font-bold text-lead-navy">Create group payment</h2>
                  <p className="mt-2 text-sm text-lead-gray">
                    Pricing is open for now. Enter either a total amount, or a per-meeting amount and the system will multiply it by completed meetings from the batch assessment.
                  </p>

                  {groupPaymentContext ? (
                    <>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <GroupPaymentStat label="Batch" value={groupPaymentContext.batchName || selectedStudent.courseJoined} helper={groupPaymentContext.program || selectedStudent.courseJoined} />
                        <GroupPaymentStat label="Period" value={monthName(groupPaymentContext.month, groupPaymentContext.year)} helper="From monthly assessment" />
                        <GroupPaymentStat label="Attendance" value={`${groupPaymentContext.completedMeetings}/12`} helper={`${groupPaymentContext.attendancePercentage}% completed`} />
                      </div>

                      <ActionFeedbackForm action={saveGroupStudentPayment} successMessage="Group payment saved successfully." className="mt-5 grid gap-4 md:grid-cols-2">
                        <input type="hidden" name="studentId" value={selectedStudent.studentId} />
                        <label className="grid gap-2 text-sm font-semibold text-lead-navy">
                          Billing Month
                          <input name="billingMonth" type="month" required defaultValue={monthInputValue(groupPaymentContext.month, groupPaymentContext.year)} className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold text-lead-navy">
                          Completed Meetings
                          <input value={groupPaymentContext.completedMeetings} readOnly className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-lead-gray" />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold text-lead-navy">
                          Amount Per Meeting
                          <input name="amountPerMeeting" type="number" min="0" placeholder="Optional" className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold text-lead-navy">
                          Total Amount Due
                          <input name="totalAmountDue" type="number" min="0" placeholder="Required if per-meeting is empty" className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
                        </label>
                        <select name="status" defaultValue="Unpaid" className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                          {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                        <input name="paidDate" type="date" className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
                        <select name="paymentMethod" defaultValue="" className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy">
                          <option value="">Payment method</option>
                          {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                        </select>
                        <input name="notes" placeholder="Notes, discount, package detail..." className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-lead-navy" />
                        <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:items-stretch">
                          <label className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-lead-navy">
                            <input type="checkbox" name="receiptUploadedToDrive" className="h-4 w-4 accent-lead-blue" />
                            Payment receipt uploaded to Google Drive
                          </label>
                          <Button asChild type="button" variant="secondary" className="h-auto min-h-11">
                            <a href={paymentReceiptsDriveUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                              Open Google Drive
                            </a>
                          </Button>
                        </div>
                        <Button type="submit" size="lg" className="md:col-span-2">
                          <ReceiptText className="h-4 w-4" />
                          Save Group Payment
                        </Button>
                      </ActionFeedbackForm>
                    </>
                  ) : (
                    <p className="mt-5 rounded-lg bg-yellow-50 p-4 text-sm font-semibold text-yellow-800">
                      No batch assessment found yet. Finalize this student's monthly assessment in Batches first, then create the group payment here.
                    </p>
                  )}
                </Card>
              ) : null}

              <Card className="p-5">
                <h2 className="font-heading text-xl font-bold text-lead-navy">Payment history</h2>
                <p className="mt-2 text-sm text-lead-gray">Update payment status, paid date, payment method, and notes here.</p>
                <div className="mt-5 grid gap-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading font-bold text-lead-navy">
                              {payment.source === "batch-assessment" && payment.billingMonth && payment.billingYear
                                ? `Group payment - ${monthName(payment.billingMonth, payment.billingYear)}`
                                : `Meeting ${payment.meetingNumber}`}
                            </h3>
                            <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${statusClassName(payment.status)}`}>{payment.status}</span>
                            {payment.attendanceStatus ? (
                              <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-bold uppercase text-lead-blue">
                                {payment.attendanceStatus}
                              </span>
                            ) : null}
                            {payment.classMode ? (
                              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                                {payment.classMode}
                              </span>
                            ) : null}
                            {payment.receiptUploadedToDrive ? (
                              <span className="rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold uppercase text-emerald-700">
                                Drive receipt uploaded
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-lead-gray">
                            {payment.source === "batch-assessment"
                              ? `${payment.batchName || "Batch"} / ${payment.completedMeetings || payment.meetingNumber}/12 meetings / ${formatRupiah(payment.amountDue)}`
                              : `${formatDate(payment.meetingDate)} / ${formatRupiah(payment.amountDue)}`}
                          </p>
                          <p className="mt-1 text-xs text-lead-gray">Paid date: {payment.paidDate ? formatDate(payment.paidDate) : "Not paid yet"} / Method: {payment.paymentMethod || "Not set"}</p>
                          {payment.notes ? <p className="mt-2 text-sm leading-6 text-lead-gray">{payment.notes}</p> : null}
                          {payment.status === "Unpaid" ? (
                            <Button asChild variant="secondary" size="sm" className="mt-3">
                              <a href={`/admin/payments/${payment.id}/request`} target="_blank" rel="noreferrer">
                                <ReceiptText className="h-4 w-4" />
                                Open Payment Request
                              </a>
                            </Button>
                          ) : null}
                        </div>
                        <ActionFeedbackForm action={updateStudentPaymentStatus} successMessage="Payment updated successfully." className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
                          <input type="hidden" name="id" value={payment.id} />
                          <select name="status" defaultValue={payment.status} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
                            {paymentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <input name="paidDate" type="date" defaultValue={payment.paidDate} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
                          <select name="paymentMethod" defaultValue={payment.paymentMethod} className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy">
                            <option value="">Not set</option>
                            {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                          </select>
                          <input name="notes" defaultValue={payment.notes} placeholder="Notes" className="focus-ring rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-lead-navy" />
                          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-stretch">
                            <label className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-lead-navy">
                              <input
                                type="checkbox"
                                name="receiptUploadedToDrive"
                                defaultChecked={payment.receiptUploadedToDrive}
                                className="h-4 w-4 accent-lead-blue"
                              />
                              Payment receipt uploaded to Google Drive
                            </label>
                            <Button asChild type="button" variant="secondary" className="h-auto min-h-11">
                              <a href={paymentReceiptsDriveUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                Open Google Drive
                              </a>
                            </Button>
                          </div>
                          <Button type="submit" size="sm" className="sm:col-span-2">Update</Button>
                        </ActionFeedbackForm>
                      </div>
                    </div>
                  ))}
                  {!payments.length ? (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm text-lead-gray">
                      {isGroupStudent
                        ? "No group payment records yet. Use the group payment form above after a batch assessment is finalized."
                        : "No payment records yet. Mark attendance as Present or Late to generate one automatically."}
                    </p>
                  ) : null}
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center">
              <h2 className="font-heading text-2xl font-bold text-lead-navy">Choose a student</h2>
              <p className="mt-3 text-lead-gray">Search or select a student to review attendance-generated payments.</p>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}

function GroupPaymentStat({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className="mt-2 font-heading text-xl font-extrabold text-lead-navy">{value}</p>
      <p className="mt-1 text-xs leading-5 text-lead-gray">{helper}</p>
    </div>
  );
}
