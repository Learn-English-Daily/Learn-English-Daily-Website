import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 8;

function configuredSessionTtl() {
  const value = Number(process.env.PORTAL_SESSION_TTL_SECONDS || DEFAULT_SESSION_TTL_SECONDS);
  return Number.isInteger(value) && value >= 300 && value <= 60 * 60 * 24 * 7
    ? value
    : DEFAULT_SESSION_TTL_SECONDS;
}

export const PORTAL_SESSION_TTL_SECONDS = configuredSessionTtl();

export function constantTimeEqual(left: string, right: string) {
  const leftDigest = createHmac("sha256", "lead-credential-comparison").update(left).digest();
  const rightDigest = createHmac("sha256", "lead-credential-comparison").update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

export function createExpiringSignature(message: string, secret: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + PORTAL_SESSION_TTL_SECONDS;
  const signature = createHmac("sha256", secret).update(`${message}:${expiresAt}`).digest("hex");
  return { expiresAt, signature };
}

export function verifyExpiringSignature(message: string, secret: string, expiresAtValue: string, signature: string) {
  const expiresAt = Number(expiresAtValue);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || expiresAt > Math.floor(Date.now() / 1000) + PORTAL_SESSION_TTL_SECONDS) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(`${message}:${expiresAt}`).digest("hex");
  return Boolean(signature && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
}
