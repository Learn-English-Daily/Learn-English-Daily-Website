import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck, ShieldCheck, Sparkles } from "lucide-react";
import { EmployeeOnboardingForm } from "@/components/sections/employee-onboarding-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Employee Form | LEAD",
  description: "LEAD employee onboarding form for new team members.",
  robots: {
    index: false,
    follow: false
  }
};

export default function EmployeeFormPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff7d6_100%)] py-10 sm:py-14">
        <div className="absolute inset-0 play-grid opacity-50" aria-hidden="true" />
        <div className="absolute -right-24 top-8 h-72 w-72 rounded-full bg-lead-yellow/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-lead-blue/10 blur-3xl" aria-hidden="true" />

        <div className="container-shell relative z-10">
          <Button asChild variant="secondary">
            <Link href="/en">
              <ArrowLeft className="h-4 w-4" />
              Back to LEAD
            </Link>
          </Button>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-lead-blue shadow-soft">
                <Sparkles className="h-4 w-4" />
                LEAD Employee Onboarding
              </p>
              <h1 className="mt-5 max-w-4xl font-heading text-4xl font-black tracking-tight text-lead-navy sm:text-5xl">
                Welcome to LEAD
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-lead-gray">
                Please complete this form before joining so the admin team can prepare your employee record, schedule,
                documents, and payment details.
              </p>
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-1 h-5 w-5 shrink-0 text-lead-blue" />
                <div>
                  <p className="font-bold text-lead-navy">Takes 5-8 minutes</p>
                  <p className="text-sm leading-6 text-lead-gray">Use accurate details so admin does not need to ask twice.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold text-lead-navy">Private company record</p>
                  <p className="text-sm leading-6 text-lead-gray">Submissions are saved for LEAD internal onboarding only.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell py-8 sm:py-10">
        <EmployeeOnboardingForm />
      </section>
    </main>
  );
}
