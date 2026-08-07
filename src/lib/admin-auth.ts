import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAdminEmployeeById, type AdminEmployee } from "@/lib/admin-employees";
import { getMasterPassword } from "@/lib/master-auth";
import { getMongoDb } from "@/lib/mongodb";

export const ADMIN_SESSION_COOKIE = "lead_admin_session";
export const ADMIN_ID_COOKIE = "lead_admin_id";

export function getAdminPasswordEnvName(username: string) {
  return `ADMIN_PASSWORD_${username.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export function getAdminPassword(username: string) {
  return process.env[getAdminPasswordEnvName(username)] || getMasterPassword(username);
}

export function isAdminConfigured() {
  return true;
}

function encodeTokenPart(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeTokenPart(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function signAdminSession(employeeId: string, username: string) {
  const password = getAdminPassword(username);
  const secret = process.env.ADMIN_SESSION_SECRET || password;

  if (!employeeId || !username || !password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`lead-admin:${employeeId}:${username}:${password}`).digest("hex");
}

export function createAdminSessionToken(employeeId: string, username: string) {
  const signature = signAdminSession(employeeId, username);

  if (!signature) {
    return "";
  }

  return `${encodeTokenPart(employeeId)}.${encodeTokenPart(username)}.${signature}`;
}

export function parseAdminSession(value = "") {
  const [employeeIdPart, usernamePart, signature = ""] = value.split(".");
  const employeeId = decodeTokenPart(employeeIdPart || "");
  const username = decodeTokenPart(usernamePart || "");

  return { employeeId, username, signature };
}

export function isValidAdminSession(value?: string) {
  const { employeeId, username, signature } = parseAdminSession(value || "");
  const expectedSignature = employeeId && username ? signAdminSession(employeeId, username) : "";

  if (!signature || !expectedSignature || signature.length !== expectedSignature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export async function getAuthenticatedAdmin(): Promise<AdminEmployee | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value || "";
  const parsedSession = parseAdminSession(session);
  const employeeId = cookieStore.get(ADMIN_ID_COOKIE)?.value || parsedSession.employeeId;
  const db = await getMongoDb();
  const admin = employeeId ? await getAdminEmployeeById(db, employeeId) : null;

  if (!admin?.username || admin.username !== parsedSession.username || !isValidAdminSession(session)) {
    return null;
  }

  return admin;
}
