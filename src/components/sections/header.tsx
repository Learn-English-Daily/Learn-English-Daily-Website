"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Locale, SiteContent } from "@/lib/content";

export function Header({ locale, content }: { locale: Locale; content: SiteContent }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getLocalizedHref = (nextLocale: Locale) => {
    const segments = pathname.split("/");
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  };

  const rememberLanguage = (nextLocale: Locale) => {
    try {
      localStorage.setItem("lead-locale", nextLocale);
    } catch {
      // Navigation should still work if storage is unavailable.
    }
  };

  const navIds = ["home", "courses", "about", "teachers", "testimonials", "pricing", "faq", "contact"];
  const reviewFormLabel = locale === "id" ? "Form Review" : "Review Form";

  return (
    <header
      className={`sticky top-0 z-50 bg-white/90 backdrop-blur transition-shadow ${
        scrolled ? "shadow-[0_10px_35px_rgba(15,23,42,0.1)]" : ""
      }`}
    >
      <div className="container-shell flex h-20 items-center justify-between gap-4">
        <Link href={`/${locale}`} className="focus-ring block rounded-lg" aria-label="LEAD home">
          <Image
            src="/images/lead-wordmark-reference.png"
            alt="LEAD - Speak English with Confidence"
            width={910}
            height={345}
            className="h-[54px] w-[142px] object-contain object-left sm:w-[162px] lg:h-[62px] lg:w-[184px]"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {content.nav.map((item, index) => (
            <Link
              key={item}
              href={`/${locale}#${navIds[index]}`}
              className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-lead-gray hover:bg-slate-100 hover:text-lead-blue"
            >
              {item}
            </Link>
          ))}
          <Link
            href={`/${locale}/review`}
            className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-lead-gray hover:bg-slate-100 hover:text-lead-blue"
          >
            {reviewFormLabel}
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="rounded-lg border border-slate-200 bg-white p-1" aria-label="Language switcher">
            {(["en", "id"] as Locale[]).map((lang) => (
              <a
                key={lang}
                href={getLocalizedHref(lang)}
                onClick={() => rememberLanguage(lang)}
                className={`focus-ring rounded-md px-3 py-1.5 text-xs font-bold uppercase ${
                  locale === lang ? "bg-lead-navy text-white" : "text-lead-gray hover:text-lead-blue"
                }`}
              >
                {lang}
              </a>
            ))}
          </div>
          <Button asChild>
            <Link href={`/${locale}#contact`}>{content.cta.trial}</Link>
          </Button>
        </div>

        <button
          className="focus-ring grid h-11 w-11 place-items-center rounded-lg border border-slate-200 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="container-shell grid gap-2 py-4">
            {content.nav.map((item, index) => (
              <Link
                key={item}
                href={`/${locale}#${navIds[index]}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 font-semibold text-lead-gray hover:bg-slate-100 hover:text-lead-blue"
              >
                {item}
              </Link>
            ))}
            <Link
              href={`/${locale}/review`}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 font-semibold text-lead-gray hover:bg-slate-100 hover:text-lead-blue"
            >
              {reviewFormLabel}
            </Link>
            <div className="flex items-center gap-2 px-3 pt-2">
              <Button asChild variant={locale === "en" ? "primary" : "secondary"} size="sm">
                <a href={getLocalizedHref("en")} onClick={() => rememberLanguage("en")}>
                  EN
                </a>
              </Button>
              <Button asChild variant={locale === "id" ? "primary" : "secondary"} size="sm">
                <a href={getLocalizedHref("id")} onClick={() => rememberLanguage("id")}>
                  ID
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
