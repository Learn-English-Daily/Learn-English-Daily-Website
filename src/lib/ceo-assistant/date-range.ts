import type { AssistantPeriod } from "@/lib/ceo-assistant/types";

export const assistantPeriods: AssistantPeriod[] = ["this_month", "last_month", "this_quarter", "this_year"];

export function isAssistantPeriod(value: unknown): value is AssistantPeriod {
  return typeof value === "string" && assistantPeriods.includes(value as AssistantPeriod);
}

function jakartaParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function key(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function finalDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getAssistantRange(period: AssistantPeriod, now = new Date()) {
  const current = jakartaParts(now);
  let startYear = current.year;
  let startMonth = current.month;
  let endYear = current.year;
  let endMonth = current.month;

  if (period === "last_month") {
    startMonth -= 1;
    if (startMonth === 0) { startMonth = 12; startYear -= 1; }
    endYear = startYear;
    endMonth = startMonth;
  } else if (period === "this_quarter") {
    startMonth = Math.floor((current.month - 1) / 3) * 3 + 1;
    endMonth = startMonth + 2;
  } else if (period === "this_year") {
    startMonth = 1;
    endMonth = 12;
  }

  const endDay = period === "this_month" ? current.day : finalDay(endYear, endMonth);
  return {
    period,
    timezone: "Asia/Jakarta",
    start: key(startYear, startMonth, 1),
    end: key(endYear, endMonth, endDay)
  };
}

export function jakartaToday(now = new Date()) {
  const value = jakartaParts(now);
  return key(value.year, value.month, value.day);
}
