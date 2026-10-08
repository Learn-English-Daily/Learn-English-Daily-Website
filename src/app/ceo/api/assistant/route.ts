import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { askGemini, friendlyGeminiError } from "@/lib/ceo-assistant/gemini";
import type { AssistantDataMode, AssistantMessage } from "@/lib/ceo-assistant/types";
import { CEO_SESSION_COOKIE, isValidCeoSession } from "@/lib/ceo-auth";
import { getMongoDb } from "@/lib/mongodb";
import { isRateLimited, requestBodyTooLarge } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validMessages(value: unknown): value is AssistantMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 12) return false;
  let characters = 0;
  for (const item of value) {
    if (!item || typeof item !== "object") return false;
    const message = item as Record<string, unknown>;
    if (message.role !== "user" && message.role !== "assistant") return false;
    if (typeof message.content !== "string" || !message.content.trim() || message.content.length > 4000) return false;
    characters += message.content.length;
  }
  return characters <= 16_000 && value[value.length - 1]?.role === "user";
}

async function audit(data: Record<string, unknown>) {
  try {
    const db = await getMongoDb();
    await db.collection("ceo_ai_audit").insertOne({ ...data, createdAt: new Date() });
  } catch {
    // Auditing must never expose or replace the user-facing provider error.
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = (await cookies()).get(CEO_SESSION_COOKIE)?.value;
  if (!isValidCeoSession(session)) return NextResponse.json({ error: "CEO authentication required." }, { status: 401 });
  if (requestBodyTooLarge(request)) return NextResponse.json({ error: "The conversation is too large. Start a new chat." }, { status: 413 });
  if (await isRateLimited(await headers(), "ceo-ai-assistant", 12, 60_000)) {
    return NextResponse.json({ error: "Too many assistant requests. Please wait one minute." }, { status: 429 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const messages = (body as { messages?: unknown })?.messages;
  if (!validMessages(messages)) return NextResponse.json({ error: "Send 1-12 valid conversation messages." }, { status: 400 });

  const dataMode: AssistantDataMode = process.env.GEMINI_DATA_MODE === "aggregates" ? "aggregates" : "synthetic";
  try {
    const result = await askGemini(messages, dataMode);
    await audit({ success: true, dataMode, model: result.model, toolsUsed: result.toolsUsed, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ...result, dataMode, retrievedAt: new Date().toISOString() });
  } catch (error) {
    const friendly = friendlyGeminiError(error);
    await audit({ success: false, dataMode, errorCategory: friendly.status, durationMs: Date.now() - startedAt });
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
