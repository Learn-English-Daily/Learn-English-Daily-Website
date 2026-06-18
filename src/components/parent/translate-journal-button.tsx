"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TranslateJournalButton({ text }: { text: string }) {
  const translateUrl = `https://translate.google.com/?sl=auto&tl=id&text=${encodeURIComponent(text)}&op=translate`;

  return (
    <Button asChild variant="secondary" size="sm">
      <a href={translateUrl} target="_blank" rel="noreferrer">
        <Languages className="h-4 w-4" />
        Translate to Bahasa Indonesia
      </a>
    </Button>
  );
}
