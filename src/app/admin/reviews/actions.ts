"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { assertFullAdminAccess } from "@/lib/admin-permissions";
import { getMongoDb } from "@/lib/mongodb";
import { getReviewCollectionName, isReviewStatus } from "@/lib/reviews";

export async function updateReviewStatus(formData: FormData) {
  await assertFullAdminAccess();

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
