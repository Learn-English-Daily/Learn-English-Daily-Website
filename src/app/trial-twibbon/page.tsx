import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { TwibbonCamera } from "@/app/trial-twibbon/twibbon-camera";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "LEAD Trial Class Twibbon | Learn English Daily",
  description: "Capture your LEAD free trial class photo with the official trial twibbon frame."
};

export default function TrialTwibbonPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff7d6_100%)] py-10">
        <div className="absolute inset-0 play-grid opacity-60" aria-hidden="true" />
        <div className="absolute -right-24 top-8 h-72 w-72 rounded-full bg-lead-yellow/30 blur-3xl" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <Button asChild variant="secondary">
            <Link href="/en">
              <ArrowLeft className="h-4 w-4" />
              Back to LEAD
            </Link>
          </Button>
          <p className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft">
            <Sparkles className="h-4 w-4" />
            LEAD Free Trial Class
          </p>
          <h1 className="mt-5 max-w-4xl font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
            Create Your LEAD Trial Twibbon
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-lead-gray">
            Take a picture with the official LEAD frame and celebrate joining your free trial class.
          </p>
        </div>
      </section>

      <section className="container-shell py-8">
        <TwibbonCamera />
      </section>
    </main>
  );
}
