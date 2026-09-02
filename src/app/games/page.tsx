import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowRight, Bus, Footprints, KeyRound, Lock, MapPinned, Mic, PawPrint, Puzzle, Sparkles, Trophy } from "lucide-react";
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
    title: "Action Hero",
    description: "Control Bill in a real 2D world and learn action verbs by running, jumping, reading, swimming, dancing, and climbing.",
    status: "Available",
    icon: Footprints,
    accent: "border-blue-100 bg-blue-50 text-lead-blue",
    available: true,
    href: "/games/action-hero"
  },
  {
    title: "My City Adventure",
    description: "Explore a lively town, visit public places, shop, deliver packages, and speak useful real-life English.",
    status: "Available",
    icon: MapPinned,
    accent: "border-sky-100 bg-sky-50 text-sky-700",
    available: true,
    href: "/games/my-city-adventure"
  },
  {
    title: "Pet Rescue Adventure",
    description: "Match, remember, feed, groom, and rescue cute pets through hands-on English activities.",
    status: "Available",
    icon: PawPrint,
    accent: "border-emerald-100 bg-emerald-50 text-emerald-700",
    available: true,
    href: "/games/pet-rescue-adventure"
  },
  {
    title: "Transportation Adventure",
    description: "Travel with Wisey through five playful stages while learning land, air, and water transportation English.",
    status: "Available",
    icon: Bus,
    accent: "border-cyan-100 bg-cyan-50 text-cyan-700",
    available: true,
    href: "/games/transportation-adventure"
  },
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
    status: "Available",
    icon: Puzzle,
    accent: "border-emerald-100 bg-emerald-50 text-emerald-700",
    available: true,
    href: "/games/vocabulary-match"
  },
  {
    title: "Sentence Builder",
    description: "Build clear English sentences from word blocks and grammar clues.",
    status: "Available",
    icon: Trophy,
    accent: "border-violet-100 bg-violet-50 text-violet-700",
    available: true,
    href: "/games/sentence-builder"
  },
  {
    title: "Tongue Twister Battle",
    description: "Race through fun tongue twisters and improve speaking control.",
    status: "Available",
    icon: Mic,
    accent: "border-rose-100 bg-rose-50 text-rose-700",
    available: true,
    href: "/games/tongue-twister-battle"
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
      <section id="games" className="section-pad relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)]">
        <div className="absolute inset-0 play-grid opacity-50" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-bold uppercase tracking-[0.16em] text-lead-blue">Interactive practice</p>
            <h1 className="mt-4 font-heading text-5xl font-extrabold tracking-tight text-lead-navy sm:text-6xl">LEAD Games</h1>
            <h2 className="mt-4 font-heading text-2xl font-bold text-lead-blue sm:text-3xl">Pick a game and start speaking</h2>
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
