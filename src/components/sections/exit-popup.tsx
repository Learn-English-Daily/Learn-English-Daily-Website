"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteContent } from "@/lib/content";

export function ExitPopup({ content }: { content: SiteContent }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("lead-exit-seen")) return;
    const onMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) {
        sessionStorage.setItem("lead-exit-seen", "true");
        setOpen(true);
      }
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-soft">
          <Dialog.Close className="focus-ring absolute right-4 top-4 rounded-lg p-2 text-lead-gray hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4" />
          </Dialog.Close>
          <Dialog.Title className="font-heading text-2xl font-bold text-lead-navy">
            {content.cta.download}
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-7 text-lead-gray">
            Get a practical English starter worksheet and begin improving before your free trial class.
          </Dialog.Description>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button className="flex-1">
              <Download className="h-4 w-4" />
              {content.cta.download}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              {content.cta.trial}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
