import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { AlertCircle, CheckCircle2, ExternalLink, ReceiptText, Search, UploadCloud } from "lucide-react";
import type { Filter, WithId } from "mongodb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logoutFinance } from "@/app/finance/actions";
import { FinanceLoginForm } from "@/app/finance/login-form";
import { saveGroupStudentPayment, updateStudentPaymentStatus } from "@/app/finance/payments/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import { getMonthlyAssessmentsCollectionName } from "@/lib/assessments";
import { getClosedBillingPeriodKeys, getRecordBillingPeriod } from "@/lib/billing-periods";
import { FINANCE_ID_COOKIE, FINANCE_SESSION_COOKIE, isValidFinanceSession } from "@/lib/finance-auth";
import { getFinanceEmployeeById } from "@/lib/finance-employees";
import { getMongoDb } from "@/lib/mongodb";
import { getEffectivePaymentAmountDue } from "@/lib/payment-pricing";
import {
  formatRupiah,
  getStudentPaymentsCollectionName,
  paymentMethods,
  paymentStatuses,
  type PaymentStatus
} from "@/lib/payments";
import { getCourseStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";

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
  studentStatus?: string;
  createdAt?: Date;
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
  studentStatus: string;
  unpaidCount: number;
  totalUnpaid: number;
};

type PaymentDocument = {
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
  amountDue?: number;
  status?: PaymentStatus;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  receiptUploadedToDrive?: boolean;
  source?: string;
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
  billingPeriod: string;
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

type FinancePaymentSummary = {
  paidCount: number;
  unpaidCount: number;
  activeRecordCount: number;
  receiptPendingCount: number;
  totalPaid: number;
  totalUnpaid: number;
};

type PendingReceiptStudent = {
  studentId: string;
  studentName: string;
  courseJoined: string;
  classMode: string;
  pendingCount: number;
};

type FinancePaymentOverview = {
  summary: FinancePaymentSummary;
  pendingReceiptStudents: PendingReceiptStudent[];
  unpaidByStudent: Record<string, { count: number; total: number }>;
};

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

function isActiveFinanceStudent(student: StudentDocument) {
  return !student.studentStatus || student.studentStatus === "Active";
}

async function getStudents(query = "", unpaidByStudent: FinancePaymentOverview["unpaidByStudent"] = {}, showArchived = false): Promise<Student[]> {
  const db = await getMongoDb();
  const search = query.trim();
  const searchFilter: Filter<StudentDocument> = search
    ? {
        $or: ["studentId", "studentName", "parentName", "whatsapp", "courseJoined", "classType"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" }
        }))
      }
    : {};
  const filter = search ? { $and: [getCourseStudentFilter(), searchFilter] } : getCourseStudentFilter();

  const docs = (await db
    .collection<StudentDocument>(getStudentRegistrationCollectionName())
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(search ? 200 : 1000)
    .toArray()) as WithId<StudentDocument>[];

  return docs
    .filter((doc) => showArchived || isActiveFinanceStudent(doc) || (unpaidByStudent[doc.studentId || ""]?.count || 0) > 0)
    .map((doc) => ({
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    whatsapp: doc.whatsapp || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "",
    englishLevel: doc.englishLevel || "",
    studentStatus: doc.studentStatus || "Active",
    unpaidCount: unpaidByStudent[doc.studentId || ""]?.count || 0,
    totalUnpaid: unpaidByStudent[doc.studentId || ""]?.total || 0
  }))
    .sort((left, right) => right.unpaidCount - left.unpaidCount || left.studentName.localeCompare(right.studentName))
    .slice(0, search ? 20 : 8);
}

async function getSelectedStudent(studentId = "", unpaidByStudent: FinancePaymentOverview["unpaidByStudent"] = {}, showArchived = false) {
  if (!studentId) return null;

  const db = await getMongoDb();
  const doc = await db.collection<StudentDocument>(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId }, getCourseStudentFilter()]
  });
  if (!doc) return null;
  if (!showArchived && !isActiveFinanceStudent(doc) && !(unpaidByStudent[doc.studentId || ""]?.count > 0)) return null;

  return {
    id: doc._id.toString(),
    studentId: doc.studentId || "",
    studentName: doc.studentName || "Unknown",
    parentName: doc.parentName || "",
    whatsapp: doc.whatsapp || "",
    courseJoined: doc.courseJoined || "",
    classType: doc.classType || "",
    classMode: doc.classMode || "",
    englishLevel: doc.englishLevel || "",
    studentStatus: doc.studentStatus || "Active",
    unpaidCount: unpaidByStudent[doc.studentId || ""]?.count || 0,
    totalUnpaid: unpaidByStudent[doc.studentId || ""]?.total || 0
  };
}

async function getPayments(student: Student, showArchived = false, closedPeriodKeys = new Set<string>()): Promise<Payment[]> {
  if (!student.studentId) return [];

  const db = await getMongoDb();
  const normalizedStudentName = normalizePaymentName(student.studentName);
  const docs = (await db
    .collection<PaymentDocument>(getStudentPaymentsCollectionName())
    .find({ studentId: student.studentId })
    .sort({ meetingNumber: -1, meetingDate: -1 })
    .limit(200)
    .toArray()) as WithId<PaymentDocument>[];

  return docs.filter((doc) => {
    const paymentName = normalizePaymentName(doc.studentName);
    const period = getRecordBillingPeriod(doc);
    const isClosed = period.billingPeriod ? closedPeriodKeys.has(period.billingPeriod) : false;
    return isLikelySamePaymentName(paymentName, normalizedStudentName) && (showArchived ? isClosed : !isClosed);
  }).map((doc) => ({
    id: doc._id.toString(),
    meetingNumber: doc.meetingNumber || 0,
    meetingDate: doc.meetingDate || "",
    billingPeriod: getRecordBillingPeriod(doc).billingPeriod,
    amountDue: getEffectivePaymentAmountDue(doc, student),
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
    classMode: doc.classMode || student.classMode || "",
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

async function getFinancePaymentOverview(closedPeriodKeys = new Set<string>()): Promise<FinancePaymentOverview> {
  const db = await getMongoDb();
  const [paymentDocs, studentDocs] = await Promise.all([
    db.collection<PaymentDocument>(getStudentPaymentsCollectionName()).find({}).limit(50000).toArray() as Promise<WithId<PaymentDocument>[]>,
    db.collection<StudentDocument>(getStudentRegistrationCollectionName()).find(getCourseStudentFilter()).limit(50000).toArray() as Promise<WithId<StudentDocument>[]>
  ]);
  const studentsById = new Map(studentDocs.filter((student) => student.studentId).map((student) => [student.studentId || "", student]));
  const activePayments = paymentDocs.filter((payment) => {
    const period = getRecordBillingPeriod(payment);
    return period.billingPeriod ? !closedPeriodKeys.has(period.billingPeriod) : true;
  });
  const paidPayments = activePayments.filter((payment) => payment.status === "Paid");
  const unpaidPayments = activePayments.filter((payment) => payment.status !== "Paid");
  const unpaidByStudent = unpaidPayments.reduce((students, payment) => {
    const studentId = payment.studentId || "";
    if (!studentId) return students;
    const current = students[studentId] || { count: 0, total: 0 };
    current.count += 1;
    current.total += getEffectivePaymentAmountDue(payment, studentsById.get(studentId));
    students[studentId] = current;
    return students;
  }, {} as Record<string, { count: number; total: number }>);

  const pendingReceiptStudents = Array.from(
    paidPayments
      .filter((payment) => payment.receiptUploadedToDrive !== true)
      .reduce((students, payment) => {
        const studentId = payment.studentId || "";
        const student = studentsById.get(studentId);
        const key = studentId || normalizePaymentName(payment.studentName || "Unknown student");
        const existing = students.get(key);

        if (existing) {
          existing.pendingCount += 1;
        } else {
          students.set(key, {
            studentId,
            studentName: student?.studentName || payment.studentName || "Unknown student",
            courseJoined: student?.courseJoined || payment.courseJoined || "Course not set",
            classMode: student?.classMode || payment.classMode || "Mode not set",
            pendingCount: 1
          });
        }

        return students;
      }, new Map<string, PendingReceiptStudent>())
      .values()
  ).sort((left, right) => right.pendingCount - left.pendingCount || left.studentName.localeCompare(right.studentName));

  return {
    summary: {
      paidCount: paidPayments.length,
      unpaidCount: unpaidPayments.length,
      activeRecordCount: activePayments.length,
      receiptPendingCount: paidPayments.filter((payment) => payment.receiptUploadedToDrive !== true).length,
      totalPaid: paidPayments.reduce((sum, payment) => sum + getEffectivePaymentAmountDue(payment, studentsById.get(payment.studentId || "")), 0),
      totalUnpaid: unpaidPayments.reduce((sum, payment) => sum + getEffectivePaymentAmountDue(payment, studentsById.get(payment.studentId || "")), 0)
    },
    pendingReceiptStudents,
    unpaidByStudent
  };
}

function statusClassName(status: PaymentStatus) {
  return status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-yellow-50 text-yellow-800";
}

async function getAuthenticatedFinanceEmployee() {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get(FINANCE_ID_COOKIE)?.value || "";
  const session = cookieStore.get(FINANCE_SESSION_COOKIE)?.value || "";

  const db = await getMongoDb();
  const employee = employeeId ? await getFinanceEmployeeById(db, employeeId) : null;

  if (!employee?.username || !isValidFinanceSession(employee.id, employee.username, session)) {
    return null;
  }

  return employee;
}

export default async function FinancePaymentsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[]; studentId?: string | string[]; view?: string | string[] }>;
}) {
  noStore();
  const financeEmployee = await getAuthenticatedFinanceEmployee();
  const resolvedSearchParams = await searchParams;
  const searchQuery = Array.isArray(resolvedSearchParams?.q) ? resolvedSearchParams?.q[0] || "" : resolvedSearchParams?.q || "";
  const selectedStudentId = Array.isArray(resolvedSearchParams?.studentId) ? resolvedSearchParams?.studentId[0] || "" : resolvedSearchParams?.studentId || "";
  const viewMode = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams?.view[0] || "" : resolvedSearchParams?.view || "";
  const showArchived = viewMode === "history";

  if (!financeEmployee) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_50%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-md p-8 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Finance</p>
          <h1 className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Track student payments</h1>
          <p className="mt-3 leading-7 text-lead-gray">Sign in to update payment status for attendance-generated records.</p>
          <FinanceLoginForm />
        </Card>
      </main>
    );
  }

  const closedPeriodKeys = await getClosedBillingPeriodKeys(await getMongoDb());
  const financeOverview = await getFinancePaymentOverview(closedPeriodKeys);
  const [students, selectedStudent] = await Promise.all([
    getStudents(searchQuery, financeOverview.unpaidByStudent, showArchived),
    getSelectedStudent(selectedStudentId, financeOverview.unpaidByStudent, showArchived)
  ]);
  const { summary: financeSummary, pendingReceiptStudents } = financeOverview;
  const isGroupStudent = selectedStudent?.classType === "Basic Group";
  const [payments, groupPaymentContext] = await Promise.all([
    selectedStudent ? getPayments(selectedStudent, showArchived, closedPeriodKeys) : [],
    selectedStudent ? getGroupPaymentContext(selectedStudent.studentId, isGroupStudent) : null
  ]);
  const totalPaid = payments.filter((payment) => payment.status === "Paid").reduce((sum, payment) => sum + payment.amountDue, 0);
  const totalUnpaid = payments.filter((payment) => payment.status === "Unpaid").reduce((sum, payment) => sum + payment.amountDue, 0);

  return (
    <main className="min-h-screen bg-lead-soft">
      <FinancePageHeader
        title="Student payments"
        description="Review individual attendance payments and create flexible group payments from batch assessments."
        employeeName={financeEmployee.name}
        logoutAction={logoutFinance}
      />

      <section className="container-shell grid gap-6 py-8">
        {pendingReceiptStudents.length ? (
          <Card className="overflow-hidden border-blue-200 bg-blue-50/70">
            <div className="flex flex-col gap-4 border-b border-blue-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lead-blue text-white">
                  <UploadCloud className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-heading text-xl font-bold text-lead-navy">Receipts need uploading</h2>
                  <p className="mt-1 text-sm leading-6 text-lead-gray">
                    {financeSummary.receiptPendingCount} paid receipt{financeSummary.receiptPendingCount === 1 ? "" : "s"} for {pendingReceiptStudents.length} student{pendingReceiptStudents.length === 1 ? "" : "s"} still need to be uploaded and marked complete.
                  </p>
                </div>
              </div>
              <Button asChild className="shrink-0">
                <a href={paymentReceiptsDriveUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Google Drive
                </a>
              </Button>
            </div>
            <div className="grid max-h-72 gap-2 overflow-y-auto p-4 sm:grid-cols-2 xl:grid-cols-3">
              {pendingReceiptStudents.map((student) => (
                <a
                  key={student.studentId || student.studentName}
                  href={student.studentId ? `/finance/payments?studentId=${encodeURIComponent(student.studentId)}#payment-history` : "/finance/payments"}
                  className="focus-ring flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-lead-navy">{student.studentName}</span>
                    <span className="mt-1 block truncate text-xs text-lead-gray">{student.courseJoined} / {student.classMode}</span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-yellow-100 px-2.5 py-1 text-xs font-extrabold text-yellow-800">
                    {student.pendingCount} pending
                  </span>
                </a>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FinanceKpi icon={CheckCircle2} label="Paid active payments" value={formatRupiah(financeSummary.totalPaid)} detail={`${financeSummary.paidCount} paid record${financeSummary.paidCount === 1 ? "" : "s"}`} tone="green" />
          <FinanceKpi icon={AlertCircle} label="Unpaid dues" value={formatRupiah(financeSummary.totalUnpaid)} detail={`${financeSummary.unpaidCount} unpaid record${financeSummary.unpaidCount === 1 ? "" : "s"}`} tone="yellow" />
          <FinanceKpi icon={UploadCloud} label="Receipt pending" value={financeSummary.receiptPendingCount.toString()} detail="Paid records not marked uploaded" tone="blue" />
          <FinanceKpi icon={ReceiptText} label="Active records" value={financeSummary.activeRecordCount.toString()} detail="Open payment records" />
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6 xl:sticky xl:top-6 xl:self-start">
          <Card className="p-4">
            <form action="/finance/payments" className="flex flex-col gap-3 md:flex-row">
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
                <a href={`/finance/payments${selectedStudentId ? `?studentId=${encodeURIComponent(selectedStudentId)}` : ""}`}>Active Payments</a>
              </Button>
              <Button asChild size="sm" variant={showArchived ? "primary" : "secondary"}>
                <a href={`/finance/payments?view=history${selectedStudentId ? `&studentId=${encodeURIComponent(selectedStudentId)}` : ""}`}>Archived History</a>
              </Button>
            </div>
          </Card>

          <Card className="p-5 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
            <h2 className="font-heading text-xl font-bold text-lead-navy">Select student</h2>
            <div className="mt-4 grid gap-3">
              {students.map((student) => (
                <a
                  key={student.id}
                  href={`/finance/payments?studentId=${encodeURIComponent(student.studentId)}${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}${showArchived ? "&view=history" : ""}`}
                  className={`focus-ring rounded-lg border p-4 transition hover:border-lead-blue hover:bg-blue-50 ${
                    selectedStudent?.studentId === student.studentId ? "border-lead-blue bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-lead-navy px-3 py-1 text-xs font-bold uppercase text-white">{student.studentId || "No ID"}</span>
                    <span className="font-heading font-bold text-lead-navy">{student.studentName}</span>
                    {student.unpaidCount > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-700">
                        <AlertCircle className="h-3.5 w-3.5" /> Unpaid dues
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-lead-gray">{student.courseJoined} / {student.classType} / {student.classMode || "Mode not set"}</p>
                  <p className="mt-1 text-xs text-lead-gray">Parent: {student.parentName || "Not set"}</p>
                  {student.unpaidCount > 0 ? <p className="mt-2 text-xs font-bold text-rose-700">{student.unpaidCount} unpaid payment{student.unpaidCount === 1 ? "" : "s"} / {formatRupiah(student.totalUnpaid)}</p> : null}
                </a>
              ))}
              {!students.length ? <p className="rounded-lg bg-white p-4 text-sm text-lead-gray">No students found.</p> : null}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          {selectedStudent ? (
            <>
              <Card id="payment-history" className="scroll-mt-6 p-5">
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
                    {totalUnpaid > 0 && !showArchived ? (
                      <Button asChild variant="secondary" size="sm">
                        <a href={`/finance/payments/student/${encodeURIComponent(selectedStudent.studentId)}/request`} target="_blank" rel="noreferrer">
                          <ReceiptText className="h-4 w-4" />
                          Open Cumulative Request
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>

              {isGroupStudent && !showArchived ? (
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
                <h2 className="font-heading text-xl font-bold text-lead-navy">{showArchived ? "Archived payment history" : "Payment history"}</h2>
                <p className="mt-2 text-sm text-lead-gray">
                  {showArchived ? "Closed month payments are shown read-only." : "Update payment status, paid date, payment method, and notes here."}
                </p>
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
                          {payment.status === "Unpaid" && !showArchived ? (
                            <Button asChild variant="secondary" size="sm" className="mt-3">
                              <a href={`/finance/payments/${payment.id}/request`} target="_blank" rel="noreferrer">
                                <ReceiptText className="h-4 w-4" />
                                Open Payment Request
                              </a>
                            </Button>
                          ) : null}
                        </div>
                        {!showArchived ? (
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
                        ) : null}
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
        </div>
      </section>
    </main>
  );
}

function FinanceKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone = "navy"
}: {
  icon: typeof ReceiptText;
  label: string;
  value: string;
  detail: string;
  tone?: "navy" | "green" | "yellow" | "blue";
}) {
  const toneClassName =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "yellow"
        ? "bg-yellow-50 text-yellow-800"
        : tone === "blue"
          ? "bg-blue-50 text-lead-blue"
          : "bg-slate-100 text-lead-navy";

  return (
    <Card className="p-5">
      <span className={`grid h-12 w-12 place-items-center rounded-xl ${toneClassName}`}>
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{value}</p>
      <p className="mt-1 text-sm font-semibold text-lead-gray">{detail}</p>
    </Card>
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
