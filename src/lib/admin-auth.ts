import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "lead_admin_session";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword());
}

export function createAdminSessionToken() {
  const password = getAdminPassword();
  const secret = process.env.ADMIN_SESSION_SECRET || password;

  if (!password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`lead-admin:${password}`).digest("hex");
}

export function isValidAdminSession(value?: string) {
  const expected = createAdminSessionToken();

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

