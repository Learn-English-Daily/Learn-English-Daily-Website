import { createHmac, timingSafeEqual } from "crypto";

export const TEACHER_SESSION_COOKIE = "lead_teacher_session";
export const TEACHER_ID_COOKIE = "lead_teacher_id";

export function getTeacherPasswordEnvName(teacherUsername: string) {
  return `TEACHER_PASSWORD_${teacherUsername.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export function getTeacherPassword(teacherUsername: string) {
  return process.env[getTeacherPasswordEnvName(teacherUsername)] || "";
}

export function isTeacherPasswordConfigured(teacherUsername: string) {
  return Boolean(getTeacherPassword(teacherUsername));
}

export function createTeacherSessionToken(teacherId: string, teacherUsername: string) {
  const password = getTeacherPassword(teacherUsername);
  const secret = process.env.TEACHER_SESSION_SECRET || password;

  if (!teacherId || !teacherUsername || !password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`lead-teacher:${teacherId}:${teacherUsername}:${password}`).digest("hex");
}

export function isValidTeacherSession(teacherId?: string, teacherUsername?: string, value?: string) {
  const expected = teacherId && teacherUsername ? createTeacherSessionToken(teacherId, teacherUsername) : "";

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
