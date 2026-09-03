"use client";

import { useState } from "react";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { scheduleBatchClasses } from "@/app/admin/batches/actions";
import { ActionFeedbackForm } from "@/components/admin/action-feedback-form";
import { Button } from "@/components/ui/button";

export function BatchScheduleForm({ batchId, batchName, days, scheduledMeetingNumbers = [] }: { batchId: string; batchName: string; days: string; scheduledMeetingNumbers?: number[] }) {
  const [mode, setMode] = useState<"single" | "series">("single");
  const isSeries = mode === "series";
  const scheduledCount = new Set(scheduledMeetingNumbers.filter((meeting) => meeting >= 1 && meeting <= 12)).size;
  const remainingCount = 12 - scheduledCount;

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-lead-blue">
          <CalendarPlus className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-heading text-xl font-extrabold text-lead-navy">Schedule Classes</h3>
          <p className="mt-1 text-sm leading-6 text-lead-gray">Create classes for <strong>{batchName}</strong>. All times are WIB.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1" role="group" aria-label="Schedule type">
        <button type="button" onClick={() => setMode("single")} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${!isSeries ? "bg-white text-lead-blue shadow-sm" : "text-lead-gray hover:text-lead-navy"}`}>One Class</button>
        <button type="button" onClick={() => setMode("series")} className={`rounded-lg px-3 py-3 text-sm font-bold transition ${isSeries ? "bg-white text-lead-blue shadow-sm" : "text-lead-gray hover:text-lead-navy"}`}>Full 12-Class Series</button>
      </div>

      <div className={`mt-4 rounded-xl border p-4 ${isSeries ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
        <div className="flex gap-3">
          <CalendarDays className={`mt-0.5 h-5 w-5 shrink-0 ${isSeries ? "text-lead-blue" : "text-slate-500"}`} />
          {isSeries ? (
            <div><p className="font-bold text-lead-navy">Schedules the {remainingCount} remaining {remainingCount === 1 ? "class" : "classes"}</p><p className="mt-1 text-sm leading-6 text-lead-gray">{scheduledCount ? `${scheduledCount} of 12 meetings already exist. ` : ""}Choose the next starting date once. Missing meetings are created in sequence on this batch&apos;s class days: <strong>{days}</strong>.</p></div>
          ) : (
            <div><p className="font-bold text-lead-navy">Creates one selected meeting</p><p className="mt-1 text-sm leading-6 text-lead-gray">Use this for a single class, replacement class, or a meeting you want to schedule separately.</p></div>
          )}
        </div>
      </div>

      <ActionFeedbackForm action={scheduleBatchClasses} successMessage={isSeries ? "Remaining group classes scheduled." : "Group class scheduled."} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="batchId" value={batchId} />
        <input type="hidden" name="scheduleMode" value={mode} />
        {isSeries ? <input type="hidden" name="firstMeetingNumber" value="1" /> : (
          <label className="grid gap-2 text-sm font-bold text-lead-navy">Meeting Number<input name="firstMeetingNumber" type="number" min={1} max={12} defaultValue={1} required className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-lead-blue focus:ring-4 focus:ring-blue-100" /></label>
        )}
        <label className="grid gap-2 text-sm font-bold text-lead-navy">{isSeries ? "Series Starting Date" : "Class Date"}<input name="firstDate" type="date" required className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-lead-blue focus:ring-4 focus:ring-blue-100" /></label>
        <label className="grid gap-2 text-sm font-bold text-lead-navy">Start Time (WIB)<input name="startTime" type="time" required className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-lead-blue focus:ring-4 focus:ring-blue-100" /></label>
        <label className="grid gap-2 text-sm font-bold text-lead-navy">End Time (WIB)<input name="endTime" type="time" required className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-lead-blue focus:ring-4 focus:ring-blue-100" /></label>
        <label className="grid gap-2 text-sm font-bold text-lead-navy sm:col-span-2">{isSeries ? "Series Topic or Note (optional)" : "Class Topic (optional)"}<input name="topic" placeholder={isSeries ? "Applied to all 12 meetings" : "Introductions and greetings"} className="rounded-lg border border-slate-200 px-3 py-2 font-medium outline-none focus:border-lead-blue focus:ring-4 focus:ring-blue-100" /></label>
        <Button type="submit" disabled={isSeries && remainingCount === 0} className="sm:col-span-2">{isSeries ? remainingCount ? `Schedule ${remainingCount} Remaining ${remainingCount === 1 ? "Class" : "Classes"}` : "All 12 Classes Scheduled" : "Schedule This Class"}</Button>
      </ActionFeedbackForm>
    </div>
  );
}
