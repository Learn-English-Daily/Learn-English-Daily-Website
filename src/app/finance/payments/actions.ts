"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getMonthlyAssessmentsCollectionName } from "@/lib/assessments";
import { getStudentAttendanceCollectionName } from "@/lib/attendance";
import {
  getBillingPeriodFromDate,
  getBillingPeriodFromMonthInput,
  getClosedBillingPeriodsCollectionName,
  getRecordBillingPeriod,
  isBillingPeriodClosed
} from "@/lib/billing-periods";
import { FINANCE_ID_COOKIE, FINANCE_SESSION_COOKIE, isValidFinanceSession } from "@/lib/finance-auth";
import { getFinanceEmployeeById } from "@/lib/finance-employees";
import { getClassSessionsCollectionName, type ClassSessionDocument } from "@/lib/class-sessions";
import { getMongoDb } from "@/lib/mongodb";
import { getEffectivePaymentAmountDue } from "@/lib/payment-pricing";
import {
  getStudentPaymentsCollectionName,
  isPaymentMethod,
  isPaymentStatus,
  type PaymentStatus
} from "@/lib/payments";
import { getActiveStudentFilter, getCourseStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";
import { assertFullAdminAccess } from "@/lib/admin-permissions";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberFromForm(value: unknown) {
  const numericValue = Number(clean(value));
  return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : 0;
}

async function assertFinance() {
  const cookieStore = await cookies();
  const employeeId = cookieStore.get(FINANCE_ID_COOKIE)?.value || "";
  const session = cookieStore.get(FINANCE_SESSION_COOKIE)?.value || "";
  const db = await getMongoDb();
  const employee = employeeId ? await getFinanceEmployeeById(db, employeeId) : null;

  if (!employee?.username || !isValidFinanceSession(employee.id, employee.username, session)) {
    throw new Error("Unauthorized");
  }
}

export async function updateStudentPaymentStatus(formData: FormData) {
  await assertFinance();

  const id = clean(formData.get("id"));
  const status = clean(formData.get("status")) as PaymentStatus;
  const paidDate = clean(formData.get("paidDate"));
  const paymentMethod = clean(formData.get("paymentMethod"));
  const notes = clean(formData.get("notes"));
  const receiptUploadedToDrive = formData.get("receiptUploadedToDrive") === "on";

  if (!ObjectId.isValid(id) || !isPaymentStatus(status)) {
    throw new Error("Invalid payment update");
  }

  if (paymentMethod && !isPaymentMethod(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const db = await getMongoDb();
  const existingPayment = await db.collection<{
    studentId?: string;
    status?: PaymentStatus;
    source?: string;
    amountDue?: number;
    meetingNumber?: number;
    billingMonth?: number;
    billingYear?: number;
    meetingDate?: string;
  }>(getStudentPaymentsCollectionName()).findOne({ _id: new ObjectId(id) });

  const period = getRecordBillingPeriod(existingPayment || {});
  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized payments cannot be changed.");
  }

  const student = existingPayment?.studentId
    ? await db.collection<{
        studentId?: string;
        studentName?: string;
        courseJoined?: string;
        classType?: string;
        classMode?: string;
      }>(getStudentRegistrationCollectionName()).findOne({
        $and: [{ studentId: existingPayment.studentId }, getCourseStudentFilter()]
      })
    : null;
  const amountDue = getEffectivePaymentAmountDue(existingPayment || {}, student);

  await db.collection(getStudentPaymentsCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...(status === "Paid" && amountDue > 0 ? { amountDue } : {}),
        ...(student
          ? {
              studentName: student.studentName || "Student",
              courseJoined: student.courseJoined || "",
              classType: student.classType || "",
              classMode: student.classMode || ""
            }
          : {}),
        status,
        paidDate: status === "Paid" ? paidDate || new Date().toISOString().slice(0, 10) : "",
        paymentMethod,
        notes,
        receiptUploadedToDrive,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/finance/payments");
  revalidatePath("/ceo/finance");
}

export async function saveGroupStudentPayment(formData: FormData) {
  await assertFinance();

  const studentId = clean(formData.get("studentId"));
  const billingMonthValue = clean(formData.get("billingMonth"));
  const amountPerMeeting = numberFromForm(formData.get("amountPerMeeting"));
  const totalAmountDue = numberFromForm(formData.get("totalAmountDue"));
  const status = clean(formData.get("status")) as PaymentStatus;
  const paidDate = clean(formData.get("paidDate"));
  const paymentMethod = clean(formData.get("paymentMethod"));
  const notes = clean(formData.get("notes"));
  const receiptUploadedToDrive = formData.get("receiptUploadedToDrive") === "on";
  const [yearValue, monthValue] = billingMonthValue.split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);

  if (!studentId || !billingMonthValue || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !isPaymentStatus(status)) {
    throw new Error("Invalid group payment");
  }

  if (paymentMethod && !isPaymentMethod(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const db = await getMongoDb();
  const period = getBillingPeriodFromMonthInput(billingMonthValue);

  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized payments cannot be changed.");
  }

  const student = await db.collection(getStudentRegistrationCollectionName()).findOne({
    $and: [{ studentId, classType: "Basic Group" }, getActiveStudentFilter()]
  });

  if (!student) {
    throw new Error("Select a valid Basic Group student");
  }

  const assessment = await db.collection(getMonthlyAssessmentsCollectionName()).findOne({
    studentId,
    month,
    year
  });
  const completedMeetings = Math.max(0, Math.round(Number(assessment?.attendance?.completedMeetings || 0)));
  const amountDue = totalAmountDue || amountPerMeeting * completedMeetings;

  if (!assessment || completedMeetings <= 0 || amountDue <= 0) {
    throw new Error("Finalize batch assessment and enter a payment amount first");
  }

  await db.collection(getStudentPaymentsCollectionName()).updateOne(
    {
      studentId,
      source: "batch-assessment",
      billingMonth: month,
      billingYear: year
    },
    {
      $set: {
        studentId,
        studentName: student.studentName || "Student",
        courseJoined: student.courseJoined || "",
        classType: student.classType || "",
        classMode: student.classMode || "",
        batchId: assessment.batchId || "",
        batchName: assessment.batchName || "",
        billingMonth: month,
        billingYear: year,
        meetingNumber: completedMeetings,
        meetingDate: `${yearValue}-${monthValue}-01`,
        completedMeetings,
        amountPerMeeting,
        amountDue,
        status,
        paidDate: status === "Paid" ? paidDate || new Date().toISOString().slice(0, 10) : "",
        paymentMethod,
        notes,
        receiptUploadedToDrive,
        source: "batch-assessment",
        attendanceStatus: `${completedMeetings}/12 completed from batch assessment`,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    },
    { upsert: true }
  );

  revalidatePath("/finance/payments");
  revalidatePath("/ceo/finance");
}

export async function closeMonthlyBalance(formData: FormData) {
  await assertFullAdminAccess();

  const billingMonthValue = clean(formData.get("billingMonth"));
  const notes = clean(formData.get("notes"));
  const period = getBillingPeriodFromMonthInput(billingMonthValue);

  if (!period.billingPeriod) {
    return { success: false, message: "Select a valid month to close." };
  }

  const db = await getMongoDb();
  if (await isBillingPeriodClosed(db, period)) {
    return { success: false, message: `${period.billingPeriod} is already closed.` };
  }

  const payments = await db.collection<{
    studentId?: string;
    studentName?: string;
    billingMonth?: number;
    billingYear?: number;
    meetingDate?: string;
    status?: PaymentStatus;
    amountDue?: number;
    source?: string;
    meetingNumber?: number;
    receiptUploadedToDrive?: boolean;
  }>(getStudentPaymentsCollectionName()).find({}).limit(50000).toArray();
  const students = await db.collection<{
    studentId?: string;
    studentName?: string;
    courseJoined?: string;
    classType?: string;
    classMode?: string;
  }>(getStudentRegistrationCollectionName()).find(getCourseStudentFilter()).limit(50000).toArray();
  const studentsById = new Map(students.filter((student) => student.studentId).map((student) => [student.studentId || "", student]));

  const monthPayments = payments.filter((payment) => {
    const paymentPeriod = payment.billingMonth && payment.billingYear
      ? { billingMonth: payment.billingMonth, billingYear: payment.billingYear, billingPeriod: `${payment.billingYear}-${String(payment.billingMonth).padStart(2, "0")}` }
      : getBillingPeriodFromDate(payment.meetingDate || "");
    return paymentPeriod.billingPeriod === period.billingPeriod;
  });
  const paidPayments = monthPayments.filter((payment) => payment.status === "Paid");
  const unpaidPayments = monthPayments.filter((payment) => payment.status !== "Paid");
  const receiptsPending = paidPayments.filter((payment) => payment.receiptUploadedToDrive !== true);
  const monthStart = `${period.billingPeriod}-01`;
  const nextMonthDate = new Date(Date.UTC(period.billingYear, period.billingMonth, 1));
  const nextMonthStart = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(period.billingYear, period.billingMonth, 0)).getUTCDate();
  const closeAvailableDate = `${period.billingPeriod}-${String(lastDay).padStart(2, "0")}`;
  const jakartaToday = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta"
  }).format(new Date());

  const [monthSessions, monthAttendance] = await Promise.all([
    db.collection<ClassSessionDocument>(getClassSessionsCollectionName()).find({
      $or: [
        { billingMonth: period.billingMonth, billingYear: period.billingYear },
        { sessionDate: { $gte: monthStart, $lt: nextMonthStart } }
      ]
    }).limit(50000).toArray(),
    db.collection<{
      studentId?: string;
      studentName?: string;
      meetingNumber?: number;
      meetingDate?: string;
      status?: string;
      notes?: string;
    }>(getStudentAttendanceCollectionName()).find({
      $or: [
        { billingMonth: period.billingMonth, billingYear: period.billingYear },
        { meetingDate: { $gte: monthStart, $lt: nextMonthStart } }
      ]
    }).limit(50000).toArray()
  ]);
  const attendanceKeys = new Set(
    monthAttendance.map((record) => `${record.studentId || ""}:${record.meetingNumber || 0}:${record.meetingDate || ""}`)
  );
  const sessionsMissingAttendance = monthSessions.filter(
    (session) => !attendanceKeys.has(`${session.studentId || ""}:${session.meetingNumber || 0}:${session.sessionDate || ""}`)
  );
  const missingJournals = monthAttendance.filter(
    (record) => (record.status === "Present" || record.status === "Late") && !record.notes?.trim()
  );
  const reasons: string[] = [];

  if (jakartaToday < closeAvailableDate) {
    reasons.push(`This month can only be closed on or after ${closeAvailableDate} (Indonesia time).`);
  }
  if (unpaidPayments.length) {
    reasons.push(`${unpaidPayments.length} meeting payment${unpaidPayments.length === 1 ? " is" : "s are"} still unpaid.`);
  }
  if (receiptsPending.length) {
    reasons.push(`${receiptsPending.length} paid receipt${receiptsPending.length === 1 ? " has" : "s have"} not been marked uploaded to Google Drive.`);
  }
  if (sessionsMissingAttendance.length) {
    const affectedStudents = [...new Set(sessionsMissingAttendance.map((session) => session.studentName || session.studentId || "Unknown student"))];
    const studentSummary = affectedStudents.slice(0, 4).join(", ");
    reasons.push(
      `${sessionsMissingAttendance.length} scheduled class${sessionsMissingAttendance.length === 1 ? " is" : "es are"} missing attendance${studentSummary ? ` (${studentSummary}${affectedStudents.length > 4 ? ", and others" : ""})` : ""}.`
    );
  }
  if (missingJournals.length) {
    const affectedStudents = [...new Set(missingJournals.map((record) => record.studentName || record.studentId || "Unknown student"))];
    const studentSummary = affectedStudents.slice(0, 4).join(", ");
    reasons.push(
      `${missingJournals.length} attended class journal${missingJournals.length === 1 ? " is" : "s are"} still missing${studentSummary ? ` (${studentSummary}${affectedStudents.length > 4 ? ", and others" : ""})` : ""}.`
    );
  }

  if (reasons.length) {
    return {
      success: false,
      message: `Month cannot be closed:\n${reasons.map((reason) => `- ${reason}`).join("\n")}`
    };
  }

  const now = new Date();

  await db.collection(getClosedBillingPeriodsCollectionName()).updateOne(
    { billingPeriod: period.billingPeriod },
    {
      $set: {
        ...period,
        notes,
        paymentCount: monthPayments.length,
        paidCount: paidPayments.length,
        unpaidCount: unpaidPayments.length,
        journalCount: monthAttendance.filter((record) => (record.status === "Present" || record.status === "Late") && Boolean(record.notes?.trim())).length,
        totalPaid: paidPayments.reduce((sum, payment) => sum + (payment.amountDue || 0), 0),
        totalUnpaid: unpaidPayments.reduce((sum, payment) => sum + getEffectivePaymentAmountDue(payment, studentsById.get(payment.studentId || "")), 0),
        updatedAt: now
      },
      $setOnInsert: {
        closedAt: now,
        closedBy: "admin",
        createdAt: now
      }
    },
    { upsert: true }
  );

  revalidatePath("/finance/payments");
  revalidatePath("/admin");
  revalidatePath("/admin/attendance");
  revalidatePath("/ceo/finance");
  revalidatePath("/ceo");

  return { success: true };
}
