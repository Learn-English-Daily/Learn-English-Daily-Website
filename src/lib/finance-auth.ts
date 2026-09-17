import { createExpiringSignature, verifyExpiringSignature } from "@/lib/auth-security";
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

  const { expiresAt, signature } = createExpiringSignature(`lead-finance:${employeeId}:${username}:${password}`, secret);
  return `${expiresAt}.${signature}`;
}

export function isValidFinanceSession(employeeId?: string, username?: string, value?: string) {
  const password = username ? getFinancePassword(username) : "";
  const secret = process.env.FINANCE_SESSION_SECRET || password;
  const [expiresAt = "", signature = ""] = (value || "").split(".");
  return Boolean(employeeId && username && password && secret && verifyExpiringSignature(`lead-finance:${employeeId}:${username}:${password}`, secret, expiresAt, signature));
}
