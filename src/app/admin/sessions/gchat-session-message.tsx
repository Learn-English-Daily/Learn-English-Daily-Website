"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const gchatSpaceUrl = "https://chat.google.com/room/AAQAqq1Kv0E?cls=7";

type GchatSessionMessageProps = {
  studentName: string;
  meetingNumber: number;
  meetingDate: string;
  meetingTime: string;
  teachers: string[];
};

export function GchatSessionMessage({
  studentName,
  meetingNumber,
  meetingDate,
  meetingTime,
  teachers
}: GchatSessionMessageProps) {
  const [copied, setCopied] = useState(false);
  const message = useMemo(
    () =>
      [
        "Class scheduled",
        `Student: ${studentName}`,
        `Meeting: ${meetingNumber}`,
        `Date: ${meetingDate}`,
        `Time: ${meetingTime}`,
        `Teacher(s): ${teachers.length ? teachers.join(", ") : "Not assigned"}`,
        "",
        "Please confirm and use this class session record for attendance after class."
      ].join("\n"),
    [meetingDate, meetingNumber, meetingTime, studentName, teachers]
  );

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-lead-blue">Google Chat message</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={copyMessage}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy Message"}
          </Button>
          <Button asChild variant="secondary" size="sm">
            <a href={gchatSpaceUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open GChat Space
            </a>
          </Button>
        </div>
      </div>
      <textarea
        readOnly
        value={message}
        className="mt-3 min-h-[150px] w-full resize-y rounded-lg border border-blue-100 bg-white px-3 py-2 text-sm leading-6 text-lead-navy"
      />
    </div>
  );
}
