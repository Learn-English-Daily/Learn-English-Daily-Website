import { randomBytes } from "crypto";

export function generateParentAccessToken() {
  return randomBytes(24).toString("base64url");
}

export function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://www.learn-english-daily.com";
}

export function getParentPortalUrl(token: string) {
  return `${getSiteUrl()}/parent/${encodeURIComponent(token)}`;
}

export function getQrCodeUrl(value: string, size = 300) {
  const encodedValue = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=14&data=${encodedValue}`;
}
