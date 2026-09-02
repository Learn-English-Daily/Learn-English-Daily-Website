import { parseAdminSession } from "@/lib/admin-auth";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { normalizeEmployeeUsername } from "@/lib/teachers";
import { cookies } from "next/headers";

export type AdminAccessLevel = "full" | "group-students";

function getGroupAdminUsernames() {
  const configured = process.env.GROUP_STUDENT_ADMIN_USERNAMES || "kar";
  return new Set(configured.split(",").map(normalizeEmployeeUsername).filter(Boolean));
}

export function getAdminAccessForUsername(username: string): AdminAccessLevel {
  return getGroupAdminUsernames().has(normalizeEmployeeUsername(username)) ? "group-students" : "full";
}

export function getAdminAccessFromSession(session = ""): AdminAccessLevel {
  return getAdminAccessForUsername(parseAdminSession(session).username);
}

export function isGroupStudentAdminSession(session = "") {
  return getAdminAccessFromSession(session) === "group-students";
}

export async function assertFullAdminAccess() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  if (!isValidAdminSession(session) || isGroupStudentAdminSession(session)) {
    throw new Error("You do not have permission to perform this action.");
  }
}
