"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getMonthlyAssessmentsCollectionName } from "@/lib/assessments";
import {
  getBillingPeriodFromDate,
  getBillingPeriodFromMonthInput,
  getClosedBillingPeriodsCollectionName,
  getRecordBillingPeriod,
  isBillingPeriodClosed
} from "@/lib/billing-periods";
import { getMongoDb } from "@/lib/mongodb";
import {
  getStudentPaymentsCollectionName,
  isPaymentMethod,
  isPaymentStatus,
  type PaymentStatus
} from "@/lib/payments";
import { getActiveStudentFilter, getStudentRegistrationCollectionName } from "@/lib/student-registration";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberFromForm(value: unknown) {
  const numericValue = Number(clean(value));
  return Number.isFinite(numericValue) ? Math.max(0, Math.round(numericValue)) : 0;
}

async function assertAdmin() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }
}

export async function updateStudentPaymentStatus(formData: FormData) {
  await assertAdmin();

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
    billingMonth?: number;
    billingYear?: number;
    meetingDate?: string;
  }>(getStudentPaymentsCollectionName()).findOne({ _id: new ObjectId(id) });

  const period = getRecordBillingPeriod(existingPayment || {});
  if (await isBillingPeriodClosed(db, period)) {
    throw new Error("This month is closed. Finalized payments cannot be changed.");
  }

  await db.collection(getStudentPaymentsCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        paidDate: status === "Paid" ? paidDate || new Date().toISOString().slice(0, 10) : "",
        paymentMethod,
        notes,
        receiptUploadedToDrive,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/payments");
}

export async function saveGroupStudentPayment(formData: FormData) {
  await assertAdmin();

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

  revalidatePath("/admin/payments");
}

export async function closeMonthlyBalance(formData: FormData) {
  await assertAdmin();

  const billingMonthValue = clean(formData.get("billingMonth"));
  const notes = clean(formData.get("notes"));
  const period = getBillingPeriodFromMonthInput(billingMonthValue);

  if (!period.billingPeriod) {
    throw new Error("Select a valid month to close");
  }

  const db = await getMongoDb();
  const payments = await db.collection<{
    billingMonth?: number;
    billingYear?: number;
    meetingDate?: string;
    status?: PaymentStatus;
    amountDue?: number;
  }>(getStudentPaymentsCollectionName()).find({}).limit(50000).toArray();

  const monthPayments = payments.filter((payment) => {
    const paymentPeriod = payment.billingMonth && payment.billingYear
      ? { billingMonth: payment.billingMonth, billingYear: payment.billingYear, billingPeriod: `${payment.billingYear}-${String(payment.billingMonth).padStart(2, "0")}` }
      : getBillingPeriodFromDate(payment.meetingDate || "");
    return paymentPeriod.billingPeriod === period.billingPeriod;
  });
  const paidPayments = monthPayments.filter((payment) => payment.status === "Paid");
  const unpaidPayments = monthPayments.filter((payment) => payment.status !== "Paid");
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
        totalPaid: paidPayments.reduce((sum, payment) => sum + (payment.amountDue || 0), 0),
        totalUnpaid: unpaidPayments.reduce((sum, payment) => sum + (payment.amountDue || 0), 0),
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

  revalidatePath("/admin/payments");
  revalidatePath("/admin/attendance");
  revalidatePath("/ceo/finance");
}
