import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Mail, MessageCircle, Star } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/sections/contact-form";
import { Counter, MotionDiv, Reveal } from "@/components/sections/motion";
import { content, iconMap, sharedContent, type Locale } from "@/lib/content";

function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const Component = iconMap[name as keyof typeof iconMap] ?? CheckCircle2;
  return <Component className={className} aria-hidden="true" />;
}

const accentStyles = [
  "bg-blue-50 text-lead-blue border-blue-100",
  "bg-yellow-50 text-yellow-700 border-yellow-100",
  "bg-emerald-50 text-emerald-700 border-emerald-100",
  "bg-rose-50 text-rose-700 border-rose-100",
  "bg-sky-50 text-sky-700 border-sky-100",
  "bg-violet-50 text-violet-700 border-violet-100",
  "bg-orange-50 text-orange-700 border-orange-100",
  "bg-teal-50 text-teal-700 border-teal-100"
];

const heroPatternItems = [
  { label: "ABC", icon: "BookOpen", className: "left-[7%] top-[18%] rotate-[-8deg]" },
  { label: "Speak", icon: "Mic", className: "right-[9%] top-[17%] rotate-[7deg]" },
  { label: "Practice", icon: "Target", className: "left-[41%] top-[12%] rotate-[4deg]" },
  { label: "Grammar", icon: "PenTool", className: "right-[42%] top-[55%] rotate-[-5deg]" },
  { label: "Listen", icon: "Headphones", className: "left-[12%] bottom-[14%] rotate-[6deg]" },
  { label: "Words", icon: "Languages", className: "right-[14%] bottom-[18%] rotate-[-7deg]" }
];

const teacherAccentStyles = {
  blue: {
    card: "from-blue-50 to-sky-100 text-lead-blue",
    icon: "bg-lead-blue text-white",
    badge: "bg-blue-100 text-blue-700"
  },
  yellow: {
    card: "from-yellow-50 to-amber-100 text-yellow-700",
    icon: "bg-lead-yellow text-lead-navy",
    badge: "bg-yellow-100 text-yellow-800"
  },
  green: {
    card: "from-emerald-50 to-teal-100 text-emerald-700",
    icon: "bg-emerald-500 text-white",
    badge: "bg-emerald-100 text-emerald-700"
  }
} as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const copy = content[locale];
  const teacherPhotos = sharedContent.teachers;
  const whatsappHref = "https://wa.me/6281578161241";
  const whatsappDisplay = "+62 815-7816-1241";
  const funCopy =
    locale === "id"
      ? {
          pills: ["Quest speaking harian", "Streak vocabulary", "Feedback ramah"],
          todayQuest: "Quest hari ini",
          speakMinutes: "Berbicara 5 menit",
          confidenceScore: "Skor percaya diri",
          skillQuest: "Quest skill · Latihan live",
          step: "Langkah",
          whatsappNudge: "Butuh bantuan?"
        }
      : {
          pills: ["Daily speaking quests", "Vocabulary streaks", "Friendly feedback"],
          todayQuest: "Today's quest",
          speakMinutes: "Speak for 5 minutes",
          confidenceScore: "Confidence score",
          skillQuest: "Skill quest · Live practice",
          step: "Step",
          whatsappNudge: "Need help?"
        };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "LEAD (Learn English Daily)",
    url: "https://learnenglishdaily.example",
    slogan: "Speak English with Confidence.",
    sameAs: ["https://instagram.com", "https://facebook.com", "https://tiktok.com", "https://youtube.com"]
  };

  return (
    <main id="home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="soft-wave relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_46%,#fff7d6_100%)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(37,99,235,0.14),transparent_24%),radial-gradient(circle_at_86%_18%,rgba(250,204,21,0.22),transparent_22%),radial-gradient(circle_at_72%_82%,rgba(16,185,129,0.12),transparent_24%)]" />
          {heroPatternItems.map((item) => (
            <div
              key={item.label}
              className={`absolute hidden items-center gap-2 rounded-lg border border-white/80 bg-white/45 px-4 py-3 text-sm font-extrabold text-slate-400/70 shadow-[0_14px_35px_rgba(15,23,42,0.05)] backdrop-blur-sm md:flex ${item.className}`}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </div>
          ))}
          <div className="absolute left-[31%] top-[31%] hidden h-24 w-24 rotate-12 rounded-[24px] border-2 border-dashed border-blue-200/70 md:block" />
          <div className="absolute bottom-[10%] right-[36%] hidden h-20 w-20 -rotate-6 rounded-full border-2 border-dashed border-yellow-300/70 md:block" />
        </div>
        <div className="container-shell relative z-10 grid min-h-[calc(100vh-80px)] items-center gap-12 py-16 lg:grid-cols-[1.02fr_0.98fr]">
          <Reveal>
            <p className="mb-5 inline-flex rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
              {copy.hero.eyebrow}
            </p>
            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-normal text-lead-navy sm:text-5xl lg:text-6xl">
              {copy.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-lead-gray">{copy.hero.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {funCopy.pills.map((item, index) => (
                <span
                  key={item}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold ${accentStyles[index]}`}
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={`/${locale}#contact`}>{copy.cta.trial}</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href={`/${locale}#courses`}>{copy.cta.courses}</Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {copy.hero.trust.map((badge, index) => (
                <div key={badge} className="flex items-center gap-3 rounded-lg border border-white bg-white/90 px-4 py-3 text-sm font-semibold text-lead-navy shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
                  <CheckCircle2 className="h-5 w-5 text-lead-blue" />
                  {badge}
                  <span className={`ml-auto h-2 w-2 rounded-sm ${index % 2 ? "bg-lead-yellow" : "bg-emerald-400"}`} aria-hidden="true" />
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm font-semibold text-lead-gray">{copy.hero.note}</p>
          </Reveal>
          <MotionDiv
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-lg border-4 border-white bg-white shadow-soft">
              <Image
                src="/images/lead-hero.png"
                alt="Students learning English online with a teacher"
                width={1200}
                height={900}
                priority
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute left-4 top-4 rounded-lg border border-white/80 bg-white/90 px-4 py-3 shadow-soft backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-blue">{funCopy.todayQuest}</p>
                <p className="mt-1 text-sm font-bold text-lead-navy">{funCopy.speakMinutes}</p>
              </div>
              <div className="absolute bottom-4 right-4 rounded-lg bg-lead-navy px-4 py-3 text-white shadow-soft">
                <p className="text-xs font-semibold text-blue-100">{funCopy.confidenceScore}</p>
                <p className="font-heading text-2xl font-extrabold">+28%</p>
              </div>
            </div>
          </MotionDiv>
        </div>
      </section>

      <section id="about" className="section-pad bg-white">
        <div className="container-shell">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="font-bold uppercase tracking-[0.16em] text-lead-blue">{copy.why.eyebrow}</p>
            <h2 className="mt-4 font-heading text-3xl font-bold text-lead-navy sm:text-4xl">{copy.why.title}</h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {copy.why.items.map(([title, description, icon], index) => (
              <Reveal key={title} delay={index * 0.04}>
                <Card className={`h-full border-t-4 p-6 transition hover:-translate-y-1 hover:shadow-soft ${accentStyles[index % accentStyles.length]}`}>
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/80">
                    <Icon name={icon} />
                  </span>
                  <h3 className="mt-5 font-heading text-xl font-bold text-lead-navy">{title}</h3>
                  <p className="mt-3 leading-7 text-lead-gray">{description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="courses" className="section-pad bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_52%,#fffbea_100%)]">
        <div className="container-shell">
          <Reveal className="max-w-3xl">
            <h2 className="font-heading text-3xl font-bold text-lead-navy sm:text-4xl">{copy.coursesTitle}</h2>
            <p className="mt-4 text-lg leading-8 text-lead-gray">{copy.coursesIntro}</p>
          </Reveal>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {copy.courses.map(([title, description, duration, level, icon], index) => (
              <Reveal key={title} delay={index * 0.03}>
                <Card className="flex h-full flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-soft">
                  <div className={`h-2 ${index % 3 === 0 ? "bg-lead-blue" : index % 3 === 1 ? "bg-lead-yellow" : "bg-emerald-400"}`} />
                  <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`grid h-12 w-12 place-items-center rounded-lg border ${accentStyles[index % accentStyles.length]}`}>
                      <Icon name={icon} />
                    </span>
                    <span className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-lead-gray shadow-[0_5px_18px_rgba(15,23,42,0.06)]">{level}</span>
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-bold text-lead-navy">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-lead-gray">{description}</p>
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-lead-blue">{funCopy.skillQuest}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold">
                    <span className="text-lead-gray">{duration}</span>
                    <Link className="text-lead-blue hover:text-blue-700" href={`/${locale}/courses`}>
                      {copy.cta.learn}
                    </Link>
                  </div>
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-shell grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <h2 className="font-heading text-3xl font-bold text-lead-navy sm:text-4xl">{copy.levels.title}</h2>
            <p className="mt-5 leading-8 text-lead-gray">
              LEAD classes are mapped to clear outcomes, so students always understand what progress should feel like.
            </p>
          </Reveal>
          <div className="relative grid gap-4">
            {copy.levels.items.map(([level, outcome], index) => (
              <Reveal key={level} delay={index * 0.05}>
                <div className="relative rounded-lg border border-slate-200 bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.05)]">
                  <span className="absolute -left-2 top-6 grid h-5 w-5 place-items-center rounded-md bg-lead-yellow text-[10px] font-bold text-lead-navy">
                    {index + 1}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-lead-navy">{level}</h3>
                  <p className="mt-2 text-sm leading-7 text-lead-gray">{outcome}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad play-grid bg-lead-navy text-white">
        <div className="container-shell">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {copy.process.map(([title, description, icon], index) => (
              <Reveal key={title} delay={index * 0.05}>
                <div className="relative h-full rounded-lg border border-white/10 bg-white/10 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
                  <span className={`mb-5 grid h-12 w-12 place-items-center rounded-lg ${index % 2 ? "bg-white text-lead-blue" : "bg-lead-yellow text-lead-navy"}`}>
                    <Icon name={icon} />
                  </span>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-200">
                    {funCopy.step} {index + 1}
                  </p>
                  <h3 className="font-heading text-xl font-bold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="teachers" className="section-pad bg-white">
        <div className="container-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl font-bold text-lead-navy sm:text-4xl">{copy.teachersTitle}</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {teacherPhotos.map((teacher) => {
              const accent = teacherAccentStyles[teacher.accent as keyof typeof teacherAccentStyles] ?? teacherAccentStyles.blue;
              return (
              <Card key={teacher.name} className="overflow-hidden">
                <div className={`grid h-72 place-items-center bg-gradient-to-br ${accent.card}`}>
                  <div className="relative grid h-32 w-32 place-items-center rounded-full bg-white shadow-soft">
                    <span className={`absolute -right-2 -top-2 grid h-12 w-12 place-items-center rounded-lg ${accent.icon}`}>
                      <Icon name="GraduationCap" className="h-6 w-6" />
                    </span>
                    <span className="font-heading text-4xl font-extrabold tracking-[0.04em]">{teacher.initials}</span>
                    <span className="absolute -bottom-3 rounded-lg bg-white px-3 py-1 text-xs font-bold text-lead-gray shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                      LEAD
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-xl font-bold text-lead-navy">{teacher.name}</h3>
                  <p className={`mt-2 inline-flex rounded-lg px-3 py-1 text-sm font-semibold ${accent.badge}`}>{teacher.qualification}</p>
                  <p className="mt-3 text-sm text-lead-gray">{teacher.experience} experience</p>
                  <blockquote className="mt-4 border-l-4 border-lead-yellow pl-4 text-sm italic leading-7 text-lead-gray">
                    &ldquo;{teacher.specialization}&rdquo;
                  </blockquote>
                </div>
              </Card>
            );
            })}
          </div>
        </div>
      </section>

      <section id="testimonials" className="section-pad bg-lead-soft">
        <div className="container-shell">
          <Reveal className="text-center">
            <h2 className="font-heading text-3xl font-bold text-lead-navy sm:text-4xl">{copy.testimonialsTitle}</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {sharedContent.testimonials.map((student, index) => (
              <Card key={student.name} className="p-6">
                <div className="flex items-center gap-4">
                  <Image src={student.photo} alt={student.name} width={72} height={72} className="h-14 w-14 rounded-full object-cover" />
                  <div>
                    <h3 className="font-heading font-bold text-lead-navy">{student.name}</h3>
                    <p className="text-sm text-lead-gray">{student.country}</p>
                  </div>
                </div>
                <div className="mt-5 flex text-lead-yellow" aria-label="5 star rating">
                  {Array.from({ length: 5 }).map((_, star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 leading-7 text-lead-gray">{copy.feedback[index]}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-lead-blue py-12 text-white">
        <div className="container-shell grid gap-6 md:grid-cols-4">
          {copy.statLabels.map((label, index) => {
            const stat = sharedStat(index);
            return (
              <div key={label} className="text-center">
                <p className="font-heading text-4xl font-extrabold">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-sm font-semibold text-blue-100">{label}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="blog" className="section-pad bg-white">
        <div className="container-shell">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {copy.resources.map(([title, description, icon]) => (
              <Card key={title} className="p-5">
                <Icon name={icon} className="h-6 w-6 text-lead-blue" />
                <h3 className="mt-4 font-heading font-bold text-lead-navy">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-lead-gray">{description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-lead-soft">
        <div className="container-shell grid gap-6 md:grid-cols-3">
          {copy.pricing.map(([plan, label, price, features], index) => (
            <Card key={plan} className={`p-6 ${index === 1 ? "border-lead-blue shadow-soft ring-2 ring-lead-blue/15" : ""}`}>
              <p className="text-sm font-bold text-lead-blue">{label}</p>
              <h3 className="mt-3 font-heading text-2xl font-bold text-lead-navy">{plan}</h3>
              <p className="mt-4 font-heading text-4xl font-extrabold text-lead-navy">{price}</p>
              <ul className="mt-6 grid gap-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-semibold text-lead-gray">
                    <CheckCircle2 className="h-5 w-5 text-lead-blue" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="mt-7 w-full" variant={index === 1 ? "primary" : "secondary"}>
                {copy.cta.enroll}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section id="faq" className="section-pad bg-white">
        <div className="container-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <h2 className="font-heading text-3xl font-bold text-lead-navy sm:text-4xl">FAQ</h2>
            <p className="mt-4 leading-8 text-lead-gray">Answers to common questions before joining your first class.</p>
          </Reveal>
          <Accordion type="single" collapsible className="rounded-lg border border-slate-200 bg-white px-6">
            {copy.faq.map(([question, answer], index) => (
              <AccordionItem key={question} value={`item-${index}`}>
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section id="contact" className="section-pad bg-lead-soft">
        <div className="container-shell grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <h2 className="font-heading text-3xl font-bold text-lead-navy sm:text-4xl">{copy.contact.title}</h2>
            <p className="mt-4 leading-8 text-lead-gray">{copy.contact.subtitle}</p>
            <div className="mt-8 grid gap-4 text-sm font-semibold text-lead-gray">
              <a href="mailto:hello@learnenglishdaily.com" className="flex items-center gap-3 hover:text-lead-blue">
                <Mail className="h-5 w-5" /> hello@learnenglishdaily.com
              </a>
              <a href={whatsappHref} className="flex items-center gap-3 hover:text-lead-blue">
                <MessageCircle className="h-5 w-5" /> {whatsappDisplay}
              </a>
              <p>{sharedContent.socials.join(" · ")}</p>
            </div>
          </Reveal>
          <Card className="p-6">
            <ContactForm content={copy} />
          </Card>
        </div>
      </section>

      <section className="bg-lead-navy py-16 text-white">
        <div className="container-shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div>
            <h2 className="font-heading text-3xl font-bold">{copy.finalCta.title}</h2>
            <p className="mt-3 text-slate-300">{copy.finalCta.subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="yellow" size="lg">
              <Link href={`/${locale}#contact`}>{copy.cta.trial}</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href={whatsappHref}>{copy.cta.whatsapp}</a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-white py-12">
        <div className="container-shell grid gap-8 md:grid-cols-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-lead-navy">LEAD</h2>
            <p className="mt-3 text-sm leading-7 text-lead-gray">Speak English with Confidence.</p>
          </div>
          {["Quick Links", "Courses", "Resources"].map((heading) => (
            <div key={heading}>
              <h3 className="font-heading font-bold text-lead-navy">{heading}</h3>
              <div className="mt-4 grid gap-2 text-sm text-lead-gray">
                {copy.nav.slice(0, 5).map((item, index) => (
                  <Link key={item} href={`/${locale}#${index === 1 ? "courses" : "home"}`} className="hover:text-lead-blue">
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="container-shell mt-10 border-t border-slate-200 pt-6 text-sm text-lead-gray">{copy.footer}</div>
      </footer>

      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-green-100 bg-white px-4 py-3 text-sm font-bold text-lead-navy shadow-soft sm:flex">
          <span>{funCopy.whatsappNudge}</span>
          <span className="h-3 w-3 rotate-45 rounded-sm bg-white shadow-[4px_-4px_8px_rgba(15,23,42,0.04)]" aria-hidden="true" />
        </div>
        <a
          href={whatsappHref}
          aria-label={copy.cta.whatsapp}
          className="focus-ring group relative grid h-16 w-16 place-items-center rounded-full bg-green-500 text-white shadow-[0_18px_40px_rgba(34,197,94,0.42)] transition hover:-translate-y-1 hover:bg-green-600"
        >
          <span className="absolute inset-0 rounded-full bg-green-400 opacity-70 motion-safe:animate-ping" aria-hidden="true" />
          <span className="absolute inset-0 rounded-full ring-4 ring-green-300/50" aria-hidden="true" />
          <span className="relative grid h-16 w-16 place-items-center rounded-full bg-green-500 transition group-hover:bg-green-600">
            <MessageCircle className="h-7 w-7" />
          </span>
        </a>
      </div>
    </main>
  );
}

function sharedStat(index: number) {
  const stats = [
    { value: 1000, suffix: "+" },
    { value: 50, suffix: "+" },
    { value: 20, suffix: "+" },
    { value: 95, suffix: "%" }
  ];
  return stats[index];
}
