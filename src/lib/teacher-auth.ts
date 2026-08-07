import { createHmac, timingSafeEqual } from "crypto";

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

  return createHmac("sha256", secret).update(`lead-teacher:${teacherId}:${username}:${password}`).digest("hex");
}

export function isValidTeacherSession(teacherId?: string, username?: string, value?: string) {
  const expected = teacherId && username ? createTeacherSessionToken(teacherId, username) : "";

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
