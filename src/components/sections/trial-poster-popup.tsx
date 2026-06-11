"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Locale, SiteContent } from "@/lib/content";

const STORAGE_KEY = "lead-trial-poster-dismissed-at";
const DISMISS_DURATION = 1000 * 60 * 60 * 24;

export function TrialPosterPopup({ content, locale }: { content: SiteContent; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.includes("/student-registration")) {
      return;
    }

    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION) {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), 1400);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  function rememberDismissal() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      rememberDismissal();
    }
    setOpen(nextOpen);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] max-h-[94vh] w-[min(94vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg bg-white shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
          <Dialog.Close className="focus-ring absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-lead-navy shadow-soft transition hover:bg-slate-100" aria-label="Close trial class poster">
            <X className="h-5 w-5" />
          </Dialog.Close>
          <Dialog.Title className="sr-only">Book your free trial class</Dialog.Title>
          <Dialog.Description className="sr-only">
            LEAD free trial class poster for fun, interactive, and engaging online English classes.
          </Dialog.Description>
          <div className="bg-lead-navy p-2">
            <Image
              src="/images/trial-class-poster.jpg"
              alt="LEAD free trial class poster"
              width={941}
              height={1680}
              priority={false}
              className="mx-auto max-h-[74vh] w-auto rounded-md object-contain"
            />
          </div>
          <div className="grid gap-3 border-t border-slate-200 bg-white p-4 sm:grid-cols-2">
            <Button asChild size="lg" onClick={rememberDismissal}>
              <Link href={`/${locale}#contact`}>{content.cta.trial}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg" onClick={rememberDismissal}>
              <a href="https://wa.me/6281578161241" target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                {content.cta.whatsapp}
              </a>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
