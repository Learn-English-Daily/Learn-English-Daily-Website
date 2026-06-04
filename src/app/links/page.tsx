import Image from "next/image";
import type { Metadata } from "next";
import { Facebook, Globe, Instagram, Mail, MessageCircle, Music2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const links = [
  {
    label: "Website",
    value: "www.learn-english-daily.com",
    href: "https://www.learn-english-daily.com",
    icon: Globe
  },
  {
    label: "TikTok + Daily Live Stream",
    value: "@learn.english.daily.1",
    href: "https://www.tiktok.com/@learn.english.daily.1?_r=1&_t=ZS-96arOrfHLBl",
    icon: Music2
  },
  {
    label: "Instagram",
    value: "@learnenglishdaily_2026",
    href: "https://www.instagram.com/learnenglishdaily_2026?igsh=cjN2aXd3ODN5dXUw",
    icon: Instagram
  },
  {
    label: "Facebook",
    value: "LEAD Facebook",
    href: "https://www.facebook.com/share/1FL2BNgMWr/",
    icon: Facebook
  },
  {
    label: "WhatsApp",
    value: "+62 815-7816-1241",
    href: "https://wa.me/6281578161241",
    icon: MessageCircle
  },
  {
    label: "Email",
    value: "Lead@learn-english-daily.com",
    href: "mailto:Lead@learn-english-daily.com",
    icon: Mail
  }
];

export const metadata: Metadata = {
  title: "LEAD Online Presence",
  description: "Official website, social media, WhatsApp, and email links for LEAD (Learn English Daily).",
  alternates: {
    canonical: "/links"
  }
};

export default function LinksPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)] px-4 py-8">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-lg flex-col justify-center">
        <Card className="overflow-hidden shadow-soft">
          <div className="bg-white px-6 py-8 text-center">
            <Image
              src="/images/lead-wordmark-reference.png"
              alt="LEAD - Speak English with Confidence"
              width={910}
              height={345}
              priority
              className="mx-auto h-20 w-56 object-contain"
            />
            <h1 className="mt-6 font-heading text-3xl font-extrabold text-lead-navy">LEAD Online Presence</h1>
            <p className="mt-3 leading-7 text-lead-gray">Learn English Daily. Speak English with confidence.</p>
          </div>
          <div className="grid gap-3 bg-lead-soft p-5">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={item.href.startsWith("mailto:") ? undefined : "noreferrer"}
                  className="focus-ring flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-lead-blue hover:shadow-soft"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-lead-blue">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-lead-navy">{item.label}</span>
                    <span className="mt-1 block break-all text-sm text-lead-gray">{item.value}</span>
                  </span>
                </a>
              );
            })}
          </div>
        </Card>
      </section>
    </main>
  );
}
