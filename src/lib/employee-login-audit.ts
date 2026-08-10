import "server-only";

import { ObjectId, type Db } from "mongodb";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";

export type EmployeePortal = "Admin" | "Finance" | "Teacher" | "CEO";

export async function recordEmployeeLogin(db: Db, employeeId: string, portal: EmployeePortal) {
  const rawId = employeeId.startsWith("employee:") ? employeeId.slice("employee:".length) : employeeId;
  if (!ObjectId.isValid(rawId)) return false;

  const result = await db.collection(getEmployeeOnboardingCollectionName()).updateOne(
    { _id: new ObjectId(rawId) },
    {
      $set: {
        lastLoginAt: new Date(),
        lastLoginPortal: portal
      }
    }
  );

  return result.matchedCount === 1;
}
