import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Mic, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { SpeechCompetitionGame } from "@/app/games/speech-competition/speech-competition-game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Speech Competition Game | LEAD Games",
  description: "Practice speech memorization and confident delivery with LEAD's interactive speech competition game."
};

const bosses = [
  ["Memory Monster", "Clear the words from memory."],
  ["Pronunciation Dragon", "Speak each word clearly."],
  ["Eye Contact Eagle", "Practice without staring at notes."],
  ["Confidence King", "Finish strong with stage energy."]
];

export default function SpeechCompetitionPage() {
  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)] py-10">
        <div className="absolute inset-0 play-grid opacity-60" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="secondary">
              <Link href="/games">
                <ArrowLeft className="h-4 w-4" />
                Back to Games
              </Link>
            </Button>
            <span className="w-fit rounded-lg bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft">
              LEAD - Speak English with confidence
            </span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft">
                <Mic className="h-4 w-4" />
                Speech Competition Game
              </p>
              <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
                Make speech practice feel like a game.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-lead-gray">
                Paste a speech, start the microphone, and watch words fade away as the student says them correctly.
              </p>
            </div>

            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-lead-yellow text-lead-navy">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-lead-navy">Boss Path</h2>
                  <p className="text-sm text-lead-gray">MVP today, bigger scoring next.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {bosses.map(([name, description], index) => (
                  <div key={name} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-extrabold text-lead-blue shadow-[0_6px_16px_rgba(15,23,42,0.06)]">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-lead-navy">{name}</p>
                      <p className="text-xs text-lead-gray">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-8">
        <SpeechCompetitionGame />

        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard icon={ShieldCheck} title="Phase 1 MVP" text="Speech input, microphone listening, word matching, disappearing words, and progress bar." />
          <InfoCard icon={Trophy} title="Phase 2 Next" text="Badges, bonus points, stronger scoring, and teacher mistake marking." />
          <InfoCard icon={Sparkles} title="Phase 3 Later" text="AI feedback, student profiles, session history, and advanced pronunciation reports." />
        </section>
      </section>
    </main>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <Card className="p-5">
      <Icon className="h-6 w-6 text-lead-blue" />
      <h2 className="mt-4 font-heading text-lg font-bold text-lead-navy">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-lead-gray">{text}</p>
    </Card>
  );
}
