"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";
import {
  getStudentPaymentsCollectionName,
  isPaymentMethod,
  isPaymentStatus,
  type PaymentStatus
} from "@/lib/payments";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getPositiveInteger(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function getAmount(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : -1;
}

async function assertAdmin() {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }
}

export async function createStudentPayment(formData: FormData) {
  await assertAdmin();

  const studentId = clean(formData.get("studentId"));
  const studentName = clean(formData.get("studentName"));
  const courseJoined = clean(formData.get("courseJoined"));
  const classType = clean(formData.get("classType"));
  const meetingNumber = getPositiveInteger(formData.get("meetingNumber"));
  const meetingDate = clean(formData.get("meetingDate"));
  const amountDue = getAmount(formData.get("amountDue"));
  const status = clean(formData.get("status"));
  const paidDate = clean(formData.get("paidDate"));
  const paymentMethod = clean(formData.get("paymentMethod"));
  const notes = clean(formData.get("notes"));

  if (!studentId || !studentName || !courseJoined || !classType || !meetingNumber || !meetingDate || amountDue < 0 || !isPaymentStatus(status)) {
    throw new Error("Invalid payment record");
  }

  if (paymentMethod && !isPaymentMethod(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const now = new Date();
  const db = await getMongoDb();
  await db.collection(getStudentPaymentsCollectionName()).insertOne({
    studentId,
    studentName,
    courseJoined,
    classType,
    meetingNumber,
    meetingDate,
    amountDue,
    status,
    paidDate: status === "Paid" ? paidDate || new Date().toISOString().slice(0, 10) : "",
    paymentMethod,
    notes,
    createdAt: now,
    updatedAt: now
  });

  revalidatePath("/admin/payments");
}

export async function updateStudentPaymentStatus(formData: FormData) {
  await assertAdmin();

  const id = clean(formData.get("id"));
  const status = clean(formData.get("status")) as PaymentStatus;
  const paidDate = clean(formData.get("paidDate"));
  const paymentMethod = clean(formData.get("paymentMethod"));
  const notes = clean(formData.get("notes"));

  if (!ObjectId.isValid(id) || !isPaymentStatus(status)) {
    throw new Error("Invalid payment update");
  }

  if (paymentMethod && !isPaymentMethod(paymentMethod)) {
    throw new Error("Invalid payment method");
  }

  const db = await getMongoDb();
  await db.collection(getStudentPaymentsCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        paidDate: status === "Paid" ? paidDate || new Date().toISOString().slice(0, 10) : "",
        paymentMethod,
        notes,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/payments");
}
