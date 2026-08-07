import { createHmac, timingSafeEqual } from "crypto";
import { getMasterPassword } from "@/lib/master-auth";

export const FINANCE_SESSION_COOKIE = "lead_finance_session";
export const FINANCE_ID_COOKIE = "lead_finance_id";

export function getFinancePasswordEnvName(username: string) {
  return `FINANCE_PASSWORD_${username.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

export function getFinancePassword(username: string) {
  return process.env[getFinancePasswordEnvName(username)] || getMasterPassword(username);
}

export function createFinanceSessionToken(employeeId: string, username: string) {
  const password = getFinancePassword(username);
  const secret = process.env.FINANCE_SESSION_SECRET || password;

  if (!employeeId || !username || !password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`lead-finance:${employeeId}:${username}:${password}`).digest("hex");
}

export function isValidFinanceSession(employeeId?: string, username?: string, value?: string) {
  const expected = employeeId && username ? createFinanceSessionToken(employeeId, username) : "";

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
