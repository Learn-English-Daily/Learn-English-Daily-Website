import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowRight, KeyRound, Lock, Mic, Puzzle, Sparkles, Trophy } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

type GameCard = {
  title: string;
  description: string;
  status: string;
  icon: typeof Mic;
  accent: string;
  available: boolean;
  href?: string;
};

export const metadata: Metadata = {
  title: "LEAD Games | Learn English Daily",
  description: "Practice English through fun interactive games from LEAD."
};

export const dynamic = "force-dynamic";

const games: GameCard[] = [
  {
    title: "Speech Competition Game",
    description: "Practice memorization, pronunciation, and confident delivery with live microphone feedback.",
    status: "Available",
    icon: Mic,
    accent: "border-blue-100 bg-blue-50 text-lead-blue",
    available: true,
    href: "/games/speech-competition"
  },
  {
    title: "LEAD Escape Room",
    description: "Unlock five English rooms, collect password digits, and escape with English challenges.",
    status: "Available",
    icon: KeyRound,
    accent: "border-yellow-100 bg-yellow-50 text-yellow-700",
    available: true,
    href: "/games/escape-room"
  },
  {
    title: "Pronunciation Challenge",
    description: "Train tricky sounds and rhythm with bite-sized pronunciation rounds.",
    status: "Available",
    icon: Sparkles,
    accent: "border-yellow-100 bg-yellow-50 text-yellow-700",
    available: true,
    href: "/games/pronunciation-challenge"
  },
  {
    title: "Vocabulary Match",
    description: "Match words, meanings, and examples before the timer runs out.",
    status: "Coming Soon",
    icon: Puzzle,
    accent: "border-emerald-100 bg-emerald-50 text-emerald-700",
    available: false
  },
  {
    title: "Sentence Builder",
    description: "Build clear English sentences from word blocks and grammar clues.",
    status: "Coming Soon",
    icon: Trophy,
    accent: "border-violet-100 bg-violet-50 text-violet-700",
    available: false
  },
  {
    title: "Tongue Twister Battle",
    description: "Race through fun tongue twisters and improve speaking control.",
    status: "Coming Soon",
    icon: Mic,
    accent: "border-rose-100 bg-rose-50 text-rose-700",
    available: false
  }
];

export default async function GamesPage() {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);

  if (!isGamesPasswordConfigured() || !isAuthenticated) {
    return <GamesPasswordGate redirectTo="/games" />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)]">
        <div className="absolute inset-0 play-grid opacity-70" aria-hidden="true" />
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-lead-yellow/30 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-24 bottom-8 h-80 w-80 rounded-full bg-lead-blue/15 blur-3xl" aria-hidden="true" />

        <div className="container-shell relative z-10 grid min-h-[680px] items-center gap-12 py-16 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <Link href="/en" className="focus-ring mb-6 inline-flex rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-[0_8px_24px_rgba(37,99,235,0.08)]">
              LEAD - Speak English with confidence
            </Link>
            <h1 className="font-heading text-5xl font-extrabold tracking-tight text-lead-navy sm:text-6xl">
              LEAD Games
            </h1>
            <p className="mt-6 text-2xl font-bold text-lead-blue">Learn English through fun interactive games.</p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-lead-gray">
              Practice speaking, pronunciation, vocabulary, and confidence through gamified learning.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="secondary" size="lg">
                <Link href="#games">Explore Games</Link>
              </Button>
              <Button asChild size="lg">
                <Link href="/en#contact">
                  Join a Class
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Card className="relative overflow-hidden border-white bg-white/90 p-6 shadow-soft backdrop-blur">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-lead-blue text-white shadow-soft">
                  <Image src="/images/brand-icon-cropped.png" alt="Wisey the owl" width={48} height={48} className="h-12 w-12 object-contain" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">Wisey&apos;s Game Hub</p>
                  <h2 className="font-heading text-2xl font-extrabold text-lead-navy">Choose your challenge</h2>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {games.slice(0, 4).map((game, index) => {
                  const Icon = game.icon;
                  return (
                    <div
                      key={game.title}
                      className="motion-safe:animate-[float_4s_ease-in-out_infinite] rounded-lg border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                      style={{ animationDelay: `${index * 0.2}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`grid h-11 w-11 place-items-center rounded-lg border ${game.accent}`}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="font-heading font-bold text-lead-navy">{game.title}</p>
                          <p className="text-xs font-bold text-lead-blue">{game.status}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="games" className="section-pad bg-white">
        <div className="container-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-bold uppercase tracking-[0.16em] text-lead-blue">Interactive practice</p>
            <h2 className="mt-4 font-heading text-3xl font-bold text-lead-navy sm:text-4xl">Pick a game and start speaking</h2>
            <p className="mt-4 text-lg leading-8 text-lead-gray">
              Built for online tutoring, class warmups, homework, and confidence practice.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => {
              const Icon = game.icon;
              return (
                <Card key={game.title} className="flex h-full flex-col overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-soft">
                  <div className={`h-2 ${game.available ? "bg-lead-blue" : "bg-slate-200"}`} />
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`grid h-12 w-12 place-items-center rounded-lg border ${game.accent}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className={`rounded-lg px-3 py-1 text-xs font-bold uppercase ${game.available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {game.status}
                      </span>
                    </div>
                    <h3 className="mt-5 font-heading text-xl font-bold text-lead-navy">{game.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-7 text-lead-gray">{game.description}</p>
                    {game.available && game.href ? (
                      <Button asChild className="mt-6">
                        <Link href={game.href}>
                          Play Now
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <Button disabled variant="secondary" className="mt-6">
                        <Lock className="h-4 w-4" />
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
