import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewForm } from "@/components/sections/review-form";
import { content, locales, type Locale } from "@/lib/content";

const allowed = ["about", "courses", "blog", "contact", "review", "privacy-policy", "terms"] as const;

export function generateStaticParams() {
  return locales.flatMap((locale) => allowed.map((slug) => ({ locale, slug })));
}

export default async function InfoPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = rawLocale as Locale;
  if (!locales.includes(locale) || !allowed.includes(slug as (typeof allowed)[number])) notFound();
  const copy = content[locale];
  const titles: Record<string, string> = {
    about: copy.nav[2],
    courses: copy.nav[1],
    blog: copy.nav[5],
    contact: copy.nav[7],
    review: copy.reviews.title,
    "privacy-policy": "Privacy Policy",
    terms: "Terms & Conditions"
  };
  const body: Record<string, string> = {
    about: copy.pages.about,
    courses: copy.coursesIntro,
    blog: copy.pages.blog,
    contact: copy.contact.subtitle,
    review: copy.reviews.subtitle,
    "privacy-policy": copy.pages.privacy,
    terms: copy.pages.terms
  };

  return (
    <main className="min-h-[70vh] bg-lead-soft py-16">
      <div className="container-shell">
        <Card className="p-8 md:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold text-lead-navy">{titles[slug]}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-lead-gray">{body[slug]}</p>
          {slug === "review" ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-lg bg-blue-50 p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">{copy.reviews.eyebrow}</p>
                <h2 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">{copy.reviews.title}</h2>
                <p className="mt-4 leading-7 text-lead-gray">{copy.reviews.subtitle}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <ReviewForm content={copy} locale={locale} />
              </div>
            </div>
          ) : null}
          {slug === "courses" ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {copy.courses.map(([title, description, duration, level]) => (
                <div key={title} className="rounded-lg border border-slate-200 p-5">
                  <h2 className="font-heading text-xl font-bold text-lead-navy">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-lead-gray">{description}</p>
                  <p className="mt-3 text-sm font-semibold text-lead-blue">
                    {duration} · {level}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
          {slug === "blog" ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {["5 speaking habits for daily English", "Simple grammar mistakes to fix", "How to speak confidently in class"].map((post) => (
                <div key={post} className="rounded-lg border border-slate-200 p-5">
                  <h2 className="font-heading text-lg font-bold text-lead-navy">{post}</h2>
                  <p className="mt-2 text-sm leading-7 text-lead-gray">Short, practical guidance for building English confidence step by step.</p>
                </div>
              ))}
            </div>
          ) : null}
          {slug !== "review" ? (
            <Button asChild className="mt-8">
              <Link href={`/${locale}#contact`}>{copy.cta.trial}</Link>
            </Button>
          ) : null}
        </Card>
      </div>
    </main>
  );
}
