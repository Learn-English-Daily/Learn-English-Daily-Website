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
