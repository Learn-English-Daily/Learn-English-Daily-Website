import { createExpiringSignature, verifyExpiringSignature } from "@/lib/auth-security";
import { getMasterPassword } from "@/lib/master-auth";

export const CEO_SESSION_COOKIE = "lead_ceo_session";

export function getCeoPassword() {
  return process.env.CEO_PASSWORD || "";
}

export function isCeoConfigured() {
  return true;
}

export function createCeoSessionToken() {
  const password = getCeoPassword();
  const secret = process.env.CEO_SESSION_SECRET || password;

  if (!password || !secret) {
    return "";
  }

  const { expiresAt, signature } = createExpiringSignature(`lead-ceo:${password}`, secret);
  return `${expiresAt}.${signature}`;
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

function getMasterCeoSessionSecret(employeeId: string, username: string) {
  const password = getMasterPassword(username);
  const secret = process.env.CEO_SESSION_SECRET || process.env.MASTER_SESSION_SECRET || password;

  if (!employeeId || !username || !password || !secret) {
    return { message: "", secret: "" };
  }

  return { message: `lead-ceo-master:${employeeId}:${username}:${password}`, secret };
}

export function createMasterCeoSessionToken(employeeId: string, username: string) {
  const session = getMasterCeoSessionSecret(employeeId, username);
  if (!session.secret) return "";
  const { expiresAt, signature } = createExpiringSignature(session.message, session.secret);
  return `master.${encodeTokenPart(employeeId)}.${encodeTokenPart(username)}.${expiresAt}.${signature}`;
}

export function parseMasterCeoSession(value = "") {
  const [prefix, employeeIdPart, usernamePart, expiresAt = "", signature = ""] = value.split(".");
  if (prefix !== "master") return { employeeId: "", username: "", expiresAt: "", signature: "" };

  return {
    employeeId: decodeTokenPart(employeeIdPart || ""),
    username: decodeTokenPart(usernamePart || ""),
    expiresAt,
    signature
  };
}

export function isValidCeoSession(value?: string) {
  if (value?.startsWith("master.")) {
    const { employeeId, username, expiresAt, signature } = parseMasterCeoSession(value);
    const session = employeeId && username ? getMasterCeoSessionSecret(employeeId, username) : { message: "", secret: "" };
    return Boolean(session.secret && verifyExpiringSignature(session.message, session.secret, expiresAt, signature));
  }

  const password = getCeoPassword();
  const secret = process.env.CEO_SESSION_SECRET || password;
  const [expiresAt = "", signature = ""] = (value || "").split(".");
  return Boolean(password && secret && verifyExpiringSignature(`lead-ceo:${password}`, secret, expiresAt, signature));
}
