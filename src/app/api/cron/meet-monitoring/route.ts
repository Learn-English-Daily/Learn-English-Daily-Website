import { NextResponse } from "next/server";
import { syncMeetMonitoringAutomatically } from "@/app/ceo/meet-monitoring/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...(await syncMeetMonitoringAutomatically()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automated Meet sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("Unauthorized") ? 401 : 500 });
  }
}
