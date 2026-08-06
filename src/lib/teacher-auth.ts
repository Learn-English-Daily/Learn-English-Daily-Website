import { createHmac, timingSafeEqual } from "crypto";

export const TEACHER_SESSION_COOKIE = "lead_teacher_session";
export const TEACHER_ID_COOKIE = "lead_teacher_id";

export function getTeacherPasswordEnvName(teacherId: string) {
  return `TEACHER_PASSWORD_${teacherId.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export function getTeacherPassword(teacherId: string) {
  return process.env[getTeacherPasswordEnvName(teacherId)] || "";
}

export function isTeacherPasswordConfigured(teacherId: string) {
  return Boolean(getTeacherPassword(teacherId));
}

export function createTeacherSessionToken(teacherId: string) {
  const password = getTeacherPassword(teacherId);
  const secret = process.env.TEACHER_SESSION_SECRET || password;

  if (!teacherId || !password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`lead-teacher:${teacherId}:${password}`).digest("hex");
}

export function isValidTeacherSession(teacherId?: string, value?: string) {
  const expected = teacherId ? createTeacherSessionToken(teacherId) : "";

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
