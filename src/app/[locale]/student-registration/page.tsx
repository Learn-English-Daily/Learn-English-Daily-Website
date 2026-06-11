import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StudentRegistrationForm } from "@/components/sections/student-registration-form";
import { content, type Locale } from "@/lib/content";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  return {
    title: locale === "id" ? "Registrasi Siswa | LEAD" : "Student Registration | LEAD",
    description:
      locale === "id"
        ? "Form registrasi siswa LEAD untuk kelas bahasa Inggris online."
        : "Simple LEAD student registration form for online English classes."
  };
}

export default async function StudentRegistrationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  const copy = content[locale];
  const pageCopy =
    locale === "id"
      ? {
          eyebrow: "Registrasi Siswa",
          title: "Lengkapi data siswa",
          subtitle: "Form singkat ini membantu tim LEAD mengatur kelas, jadwal, dan kebutuhan belajar siswa.",
          noteTitle: "Sebelum mengisi",
          notes: ["Gunakan nomor WhatsApp aktif.", "Isi jadwal dan waktu yang paling mudah dihubungi.", "Jika level belum yakin, pilih Not sure."]
        }
      : {
          eyebrow: "Student Registration",
          title: "Complete the student details",
          subtitle: "This short form helps the LEAD team arrange the right class, schedule, and learning support.",
          noteTitle: "Before you submit",
          notes: ["Use an active WhatsApp number.", "Add the schedule and time that works best.", "If the level is unclear, choose Not sure."]
        };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff7d6_100%)] py-12">
      <section className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">{pageCopy.eyebrow}</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold leading-tight text-lead-navy">{pageCopy.title}</h1>
          <p className="mt-4 max-w-xl leading-8 text-lead-gray">{pageCopy.subtitle}</p>
          <Card className="mt-8 p-5">
            <h2 className="font-heading text-xl font-bold text-lead-navy">{pageCopy.noteTitle}</h2>
            <div className="mt-4 grid gap-3">
              {pageCopy.notes.map((note) => (
                <p key={note} className="flex items-start gap-3 text-sm font-semibold leading-6 text-lead-gray">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-lead-blue" />
                  {note}
                </p>
              ))}
            </div>
          </Card>
          <Link href={`/${locale}`} className="mt-6 inline-flex text-sm font-bold text-lead-blue hover:text-blue-700">
            Back to {copy.nav[0]}
          </Link>
        </div>
        <Card className="p-6">
          <StudentRegistrationForm locale={locale} />
        </Card>
      </section>
    </main>
  );
}
