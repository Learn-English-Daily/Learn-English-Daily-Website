import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

