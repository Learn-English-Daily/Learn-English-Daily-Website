import { handleSchedule } from "@vercel/schedules";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = handleSchedule(async () => {
  const secret = process.env.CRON_SECRET?.trim();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.learn-english-daily.com").replace(/\/$/, "");
  if (!secret) throw new Error("CRON_SECRET is not configured");

  const response = await fetch(`${siteUrl}/api/cron/meet-monitoring`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Meet monitoring sync failed (${response.status}): ${await response.text()}`);
});
