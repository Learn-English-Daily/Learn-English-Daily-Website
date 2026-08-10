import "server-only";

import { ObjectId, type Db } from "mongodb";
import { getEmployeeOnboardingCollectionName } from "@/lib/employee-onboarding";

export type EmployeePortal = "Admin" | "Finance" | "Teacher" | "CEO";

function formatWibDateTime(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";

  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")} WIB`;
}

export async function recordEmployeeLogin(db: Db, employeeId: string, portal: EmployeePortal) {
  const rawId = employeeId.startsWith("employee:") ? employeeId.slice("employee:".length) : employeeId;
  if (!ObjectId.isValid(rawId)) return false;
  const now = new Date();

  const result = await db.collection(getEmployeeOnboardingCollectionName()).updateOne(
    { _id: new ObjectId(rawId) },
    {
      $set: {
        lastLoginAt: now,
        lastLoginAtWib: formatWibDateTime(now),
        lastLoginTimeZone: "Asia/Jakarta",
        lastLoginPortal: portal
      }
    }
  );

  return result.matchedCount === 1;
}
