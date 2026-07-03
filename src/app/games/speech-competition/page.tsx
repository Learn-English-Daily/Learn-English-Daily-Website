import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Mic } from "lucide-react";
import { SpeechCompetitionGame } from "@/app/games/speech-competition/speech-competition-game";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Speech Competition Game | LEAD Games",
  description: "Practice speech memorization, pronunciation, and delivery with LEAD's interactive speech game."
};

export default function SpeechCompetitionPage() {
  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)] py-10">
        <div className="absolute inset-0 play-grid opacity-60" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <Button asChild variant="secondary" size="sm">
            <Link href="/games">
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Link>
          </Button>
          <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft">
            <Mic className="h-4 w-4" />
            LEAD Games
          </p>
          <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
            Speech Competition Game
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-lead-gray">
            Paste a speech, start the microphone, and watch each correct word fade away as you speak.
          </p>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-8">
        <SpeechCompetitionGame />
      </section>
    </main>
  );
}
