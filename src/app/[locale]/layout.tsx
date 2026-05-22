import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/sections/header";
import { content, locales, type Locale } from "@/lib/content";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const copy = content[locale];
  if (!copy) return {};
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    openGraph: {
      title: copy.meta.title,
      description: copy.meta.description,
      type: "website",
      images: ["/images/lead-hero.png"]
    },
    icons: {
      icon: "/images/brand-icon-cropped.png",
      apple: "/images/brand-icon-cropped.png"
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        id: "/id"
      }
    },
    keywords: [
      "Online English classes",
      "Spoken English course",
      "Learn English online",
      "English speaking classes",
      "IELTS preparation",
      "Grammar course"
    ]
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  if (!locales.includes(locale)) notFound();
  const copy = content[locale];

  return (
    <>
      <Header locale={locale} content={copy} />
      {children}
    </>
  );
}
