import { createHmac, timingSafeEqual } from "crypto";

export const CEO_SESSION_COOKIE = "lead_ceo_session";

export function getCeoPassword() {
  return process.env.CEO_PASSWORD || "";
}

export function isCeoConfigured() {
  return Boolean(getCeoPassword());
}

export function createCeoSessionToken() {
  const password = getCeoPassword();
  const secret = process.env.CEO_SESSION_SECRET || password;

  if (!password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`lead-ceo:${password}`).digest("hex");
}

export function isValidCeoSession(value?: string) {
  const expected = createCeoSessionToken();

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
