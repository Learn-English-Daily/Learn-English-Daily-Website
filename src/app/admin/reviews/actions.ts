"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { getMongoDb } from "@/lib/mongodb";
import { getReviewCollectionName, isReviewStatus } from "@/lib/reviews";

export async function updateReviewStatus(formData: FormData) {
  const cookieStore = await cookies();
  const isAuthenticated = isValidAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!isAuthenticated) {
    throw new Error("Unauthorized");
  }

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");

  if (!ObjectId.isValid(id) || !isReviewStatus(status)) {
    throw new Error("Invalid review update");
  }

  const db = await getMongoDb();
  await db.collection(getReviewCollectionName()).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date()
      }
    }
  );

  revalidatePath("/admin/reviews");
  revalidatePath("/en");
  revalidatePath("/id");
}
