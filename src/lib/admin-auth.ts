import { cookies } from "next/headers";
import { createExpiringSignature, verifyExpiringSignature } from "@/lib/auth-security";
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

function getAdminSessionSecret(employeeId: string, username: string) {
  const password = getAdminPassword(username);
  const secret = process.env.ADMIN_SESSION_SECRET || password;

  if (!employeeId || !username || !password || !secret) {
    return { message: "", secret: "" };
  }

  return { message: `lead-admin:${employeeId}:${username}:${password}`, secret };
}

export function createAdminSessionToken(employeeId: string, username: string) {
  const session = getAdminSessionSecret(employeeId, username);
  if (!session.secret) {
    return "";
  }
  const { expiresAt, signature } = createExpiringSignature(session.message, session.secret);
  return `${encodeTokenPart(employeeId)}.${encodeTokenPart(username)}.${expiresAt}.${signature}`;
}

export function parseAdminSession(value = "") {
  const [employeeIdPart, usernamePart, expiresAt = "", signature = ""] = value.split(".");
  const employeeId = decodeTokenPart(employeeIdPart || "");
  const username = decodeTokenPart(usernamePart || "");

  return { employeeId, username, expiresAt, signature };
}

export function isValidAdminSession(value?: string) {
  const { employeeId, username, expiresAt, signature } = parseAdminSession(value || "");
  const session = employeeId && username ? getAdminSessionSecret(employeeId, username) : { message: "", secret: "" };
  return Boolean(session.secret && verifyExpiringSignature(session.message, session.secret, expiresAt, signature));
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
