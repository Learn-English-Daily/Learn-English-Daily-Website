import { createHmac, timingSafeEqual } from "crypto";
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

  return createHmac("sha256", secret).update(`lead-ceo:${password}`).digest("hex");
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

function signMasterCeoSession(employeeId: string, username: string) {
  const password = getMasterPassword(username);
  const secret = process.env.CEO_SESSION_SECRET || process.env.MASTER_SESSION_SECRET || password;

  if (!employeeId || !username || !password || !secret) {
    return "";
  }

  return createHmac("sha256", secret).update(`lead-ceo-master:${employeeId}:${username}:${password}`).digest("hex");
}

export function createMasterCeoSessionToken(employeeId: string, username: string) {
  const signature = signMasterCeoSession(employeeId, username);
  if (!signature) return "";
  return `master.${encodeTokenPart(employeeId)}.${encodeTokenPart(username)}.${signature}`;
}

export function parseMasterCeoSession(value = "") {
  const [prefix, employeeIdPart, usernamePart, signature = ""] = value.split(".");
  if (prefix !== "master") return { employeeId: "", username: "", signature: "" };

  return {
    employeeId: decodeTokenPart(employeeIdPart || ""),
    username: decodeTokenPart(usernamePart || ""),
    signature
  };
}

export function isValidCeoSession(value?: string) {
  if (value?.startsWith("master.")) {
    const { employeeId, username, signature } = parseMasterCeoSession(value);
    const expectedSignature = employeeId && username ? signMasterCeoSession(employeeId, username) : "";

    if (!signature || !expectedSignature || signature.length !== expectedSignature.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  const expected = createCeoSessionToken();

  if (!value || !expected || value.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
