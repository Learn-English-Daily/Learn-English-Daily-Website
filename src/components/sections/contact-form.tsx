"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale, SiteContent } from "@/lib/content";

export function ContactForm({ content, locale }: { content: SiteContent; locale: Locale }) {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fieldNames = ["name", "email", "whatsapp", "goal"] as const;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(false);
    setError("");
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      whatsapp: String(formData.get("whatsapp") || ""),
      goal: String(formData.get("goal") || ""),
      locale
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to submit right now. Please try again.");
      }

      event.currentTarget.reset();
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={handleSubmit}
    >
      {content.contact.fields.map((field, index) => (
        <label key={field} className="grid gap-2 text-sm font-semibold text-lead-navy">
          {field}
          {index === 3 ? (
            <textarea
              required
              name={fieldNames[index]}
              rows={4}
              className="focus-ring resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
            />
          ) : (
            <input
              required
              name={fieldNames[index]}
              type={index === 1 ? "email" : "text"}
              className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
            />
          )}
        </label>
      ))}
      <Button type="submit" size="lg" disabled={submitting}>
        <Send className="h-4 w-4" />
        {submitting ? (locale === "id" ? "Mengirim..." : "Sending...") : content.cta.submit}
      </Button>
      {sent ? <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-lead-blue">{content.contact.success}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
    </form>
  );
}
