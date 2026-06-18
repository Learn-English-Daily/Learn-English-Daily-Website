"use client";

import { MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaymentRequestActions({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row print:hidden">
      <Button type="button" size="lg" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print / Save PDF
      </Button>
      <Button asChild variant="secondary" size="lg">
        <a href={whatsappUrl} target="_blank" rel="noreferrer">
          <MessageCircle className="h-4 w-4" />
          WhatsApp Parent
        </a>
      </Button>
    </div>
  );
}
