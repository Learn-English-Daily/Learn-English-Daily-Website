import { createHash } from "crypto";
import type { Db } from "mongodb";
import { getMongoDb } from "@/lib/mongodb";

const RATE_LIMIT_COLLECTION = "request_rate_limits";
let rateLimitIndexPromise: Promise<string> | null = null;

function clientKey(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = headers.get("x-real-ip") || forwarded || "unknown";
  return createHash("sha256").update(address).digest("hex").slice(0, 24);
}

async function ensureRateLimitIndex(db: Db) {
  if (!rateLimitIndexPromise) {
    rateLimitIndexPromise = db.collection(RATE_LIMIT_COLLECTION).createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "expire_request_rate_limits" }
    );
  }
  await rateLimitIndexPromise;
}

export async function isRateLimited(headers: Headers, scope: string, limit: number, windowMs: number) {
  const db = await getMongoDb();
  await ensureRateLimitIndex(db);
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const id = `${scope}:${clientKey(headers)}:${windowStart}`;
  const result = await db.collection<{ _id: string; count: number; expiresAt: Date }>(RATE_LIMIT_COLLECTION).findOneAndUpdate(
    { _id: id },
    {
      $inc: { count: 1 },
      $setOnInsert: { expiresAt: new Date(windowStart + windowMs * 2) }
    },
    { upsert: true, returnDocument: "after" }
  );
  return (result?.count || 1) > limit;
}

export function requestBodyTooLarge(request: Request, maxBytes = 32_768) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  return Number.isFinite(contentLength) && contentLength > maxBytes;
}
