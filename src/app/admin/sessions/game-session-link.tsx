"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type GameSessionLinkProps = {
  url: string;
  expiresAt: string;
};

function formatExpiry(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export function GameSessionLink({ url, expiresAt }: GameSessionLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Student game link</p>
      <p className="mt-1 text-xs text-emerald-800">Expires: {formatExpiry(expiresAt)}</p>
      <input
        readOnly
        value={url}
        className="mt-3 w-full rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs text-lead-navy"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={copyLink}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Link"}
        </Button>
        <Button asChild size="sm" variant="secondary">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        </Button>
      </div>
    </div>
  );
}
