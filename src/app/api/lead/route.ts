import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodb";

export const runtime = "nodejs";

type LeadPayload = {
  name?: string;
  email?: string;
  whatsapp?: string;
  goal?: string;
  locale?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as LeadPayload | null;
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const lead = {
    name: clean(payload.name),
    email: clean(payload.email).toLowerCase(),
    whatsapp: clean(payload.whatsapp),
    goal: clean(payload.goal),
    locale: clean(payload.locale) || "en",
    source: "website",
    createdAt: new Date()
  };

  if (!lead.name || !lead.email || !lead.whatsapp || !lead.goal) {
    return NextResponse.json({ ok: false, error: "Please complete all fields." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const db = await getMongoDb();
    const collectionName = process.env.MONGODB_COLLECTION || "leads";
    const result = await db.collection(collectionName).insertOne(lead);

    return NextResponse.json({ ok: true, id: result.insertedId.toString() }, { status: 201 });
  } catch (error) {
    console.error("Lead form MongoDB insert failed", error);
    return NextResponse.json({ ok: false, error: "Unable to submit right now. Please try again." }, { status: 500 });
  }
}
