"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteContent } from "@/lib/content";

export function ContactForm({ content }: { content: SiteContent }) {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
    >
      {content.contact.fields.map((field, index) => (
        <label key={field} className="grid gap-2 text-sm font-semibold text-lead-navy">
          {field}
          {index === 3 ? (
            <textarea
              required
              rows={4}
              className="focus-ring resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
            />
          ) : (
            <input
              required
              type={index === 1 ? "email" : "text"}
              className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
            />
          )}
        </label>
      ))}
      <Button type="submit" size="lg">
        <Send className="h-4 w-4" />
        {content.cta.submit}
      </Button>
      {sent ? <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-lead-blue">{content.contact.success}</p> : null}
    </form>
  );
}

