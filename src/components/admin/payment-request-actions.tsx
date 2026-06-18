"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PaymentRequestActions() {
  return (
    <div className="print:hidden">
      <Button type="button" size="lg" onClick={() => window.print()}>
        <Download className="h-4 w-4" />
        Download Receipt
      </Button>
    </div>
  );
}
