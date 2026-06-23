"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type TemporaryMeetLinkProps = {
  sessionId: string;
  expiresAt: string;
};

function storageKey(sessionId: string) {
  return `lead-temp-meet-link:${sessionId}`;
}

function isExpired(expiresAt: string) {
  return expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
}

export function TemporaryMeetLink({ sessionId, expiresAt }: TemporaryMeetLinkProps) {
  const [link, setLink] = useState("");

  useEffect(() => {
    const key = storageKey(sessionId);
    const saved = window.localStorage.getItem(key) || "";

    if (saved && isExpired(expiresAt)) {
      window.localStorage.removeItem(key);
      setLink("");
      return;
    }

    setLink(saved);
  }, [expiresAt, sessionId]);

  function updateLink(value: string) {
    setLink(value);
    const key = storageKey(sessionId);

    if (!value || isExpired(expiresAt)) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  }

  function clearLink() {
    window.localStorage.removeItem(storageKey(sessionId));
    setLink("");
  }

  return (
    <div className="grid gap-2">
      <label className="text-xs font-bold uppercase tracking-[0.08em] text-lead-gray">
        Temporary Meet link
        <input
          type="url"
          value={link}
          onChange={(event) => updateLink(event.target.value)}
          placeholder="Paste Google Meet link for this browser only"
          className="focus-ring mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal normal-case tracking-normal text-lead-navy"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm" className={!link ? "pointer-events-none opacity-50" : ""}>
          <a href={link || "#"} target="_blank" rel="noreferrer" aria-disabled={!link}>
            <ExternalLink className="h-4 w-4" />
            Open Meet
          </a>
        </Button>
        {link ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearLink}>
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-lead-gray">
        This link is saved only in this browser and clears after the class window. It is not stored in MongoDB.
      </p>
    </div>
  );
}
