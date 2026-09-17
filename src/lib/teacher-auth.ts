import { createExpiringSignature, verifyExpiringSignature } from "@/lib/auth-security";

export const TEACHER_SESSION_COOKIE = "lead_teacher_session";
export const TEACHER_ID_COOKIE = "lead_teacher_id";

export function getTeacherPasswordEnvName(username: string) {
  return `TEACHER_PASSWORD_${username.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export function getTeacherPassword(username: string) {
  return process.env[getTeacherPasswordEnvName(username)] || "";
}

export function isTeacherPasswordConfigured(username: string) {
  return Boolean(getTeacherPassword(username));
}

export function createTeacherSessionToken(teacherId: string, username: string) {
  const password = getTeacherPassword(username);
  const secret = process.env.TEACHER_SESSION_SECRET || password;

  if (!teacherId || !username || !password || !secret) {
    return "";
  }

  const { expiresAt, signature } = createExpiringSignature(`lead-teacher:${teacherId}:${username}:${password}`, secret);
  return `${expiresAt}.${signature}`;
}

export function isValidTeacherSession(teacherId?: string, username?: string, value?: string) {
  const password = username ? getTeacherPassword(username) : "";
  const secret = process.env.TEACHER_SESSION_SECRET || password;
  const [expiresAt = "", signature = ""] = (value || "").split(".");
  return Boolean(teacherId && username && password && secret && verifyExpiringSignature(`lead-teacher:${teacherId}:${username}:${password}`, secret, expiresAt, signature));
}
