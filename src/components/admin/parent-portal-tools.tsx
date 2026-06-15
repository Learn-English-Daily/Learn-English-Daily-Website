"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ParentPortalTools({
  portalUrl,
  qrCodeUrl
}: {
  portalUrl: string;
  qrCodeUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-semibold text-lead-navy">
        Parent portal link
        <input
          readOnly
          value={portalUrl}
          className="focus-ring rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-lead-navy"
        />
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={copyLink} size="lg">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy Link"}
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href={qrCodeUrl} download target="_blank" rel="noreferrer">
            <Download className="h-4 w-4" />
            Open QR
          </a>
        </Button>
      </div>
    </div>
  );
}
