"use client";

import { useState, type FormEvent } from "react";
import { Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale, SiteContent } from "@/lib/content";

export function ReviewForm({ content, locale }: { content: SiteContent; locale: Locale }) {
  const [rating, setRating] = useState(5);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSent(false);
    setError("");
    setSubmitting(true);

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || ""),
      role: String(formData.get("role") || ""),
      course: String(formData.get("course") || ""),
      rating,
      feedback: String(formData.get("feedback") || ""),
      permission: formData.get("permission") === "on",
      displayName: String(formData.get("displayName") || "full"),
      locale
    };

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to submit right now. Please try again.");
      }

      form.reset();
      setRating(5);
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-lead-navy">
          {content.reviews.form.name}
          <input
            required
            name="name"
            maxLength={100}
            className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-lead-navy">
          {content.reviews.form.role}
          <select
            required
            name="role"
            defaultValue=""
            className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
          >
            <option value="" disabled>
              {content.reviews.form.choose}
            </option>
            {content.reviews.roles.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-lead-navy">
        {content.reviews.form.course}
        <select
          required
          name="course"
          defaultValue=""
          className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
        >
          <option value="" disabled>
            {content.reviews.form.choose}
          </option>
          {content.reviews.courseOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-2">
        <span className="text-sm font-semibold text-lead-navy">{content.reviews.form.rating}</span>
        <div className="flex gap-2" role="radiogroup" aria-label={content.reviews.form.rating}>
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1;
            const active = value <= rating;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} ${content.reviews.form.stars}`}
                onClick={() => setRating(value)}
                className="focus-ring rounded-lg p-2 text-lead-yellow transition hover:bg-yellow-50"
              >
                <Star className={`h-6 w-6 ${active ? "fill-current" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-lead-navy">
        {content.reviews.form.feedback}
        <textarea
          required
          name="feedback"
          rows={5}
          minLength={10}
          maxLength={700}
          className="focus-ring resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-lead-navy">
        {content.reviews.form.displayName}
        <select
          name="displayName"
          defaultValue="full"
          className="focus-ring rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-lead-navy"
        >
          {content.reviews.displayOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex gap-3 rounded-lg bg-blue-50 p-4 text-sm font-semibold leading-6 text-lead-navy">
        <input name="permission" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-lead-blue" />
        <span>{content.reviews.form.permission}</span>
      </label>

      <Button type="submit" size="lg" disabled={submitting}>
        <Send className="h-4 w-4" />
        {submitting ? content.reviews.form.sending : content.reviews.form.submit}
      </Button>
      {sent ? <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-lead-blue">{content.reviews.form.success}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
    </form>
  );
}
