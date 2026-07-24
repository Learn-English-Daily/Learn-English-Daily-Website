import Link from "next/link";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { ArrowRight, Clock, Gamepad2, KeyRound, LockKeyhole, Mic, Sparkles } from "lucide-react";
import { EscapeRoomGame } from "@/app/games/escape-room/escape-room-game";
import { PronunciationChallengeGame } from "@/app/games/pronunciation-challenge/pronunciation-challenge-game";
import { SpeechCompetitionGame } from "@/app/games/speech-competition/speech-competition-game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getGameSessionsCollectionName,
  isGameSessionExpired,
  type GameType,
  type GameSessionDocument
} from "@/lib/game-sessions";
import { getMongoDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "LEAD Class Game | Learn English Daily",
  robots: { index: false, follow: false }
};

type GameSession = {
  token: string;
  gameType: GameType;
  studentName: string;
  meetingNumber: number;
  expiresAt: string;
};

async function getGameSession(token: string): Promise<GameSession | null> {
  if (!token) return null;

  const db = await getMongoDb();
  const doc = await db.collection<GameSessionDocument>(getGameSessionsCollectionName()).findOne({
    token
  });

  if (!doc?.token || !doc.gameType || isGameSessionExpired(doc.expiresAt)) return null;

  return {
    token: doc.token,
    gameType: doc.gameType,
    studentName: doc.studentName || "Student",
    meetingNumber: doc.meetingNumber || 0,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : ""
  };
}

function formatExpiry(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export default async function GameSessionPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ game?: string }>;
}) {
  noStore();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const gameSession = await getGameSession(resolvedParams.token || "");
  const selectedGame = resolvedSearchParams.game;
  const activeGame = gameSession?.gameType === "games-hub" ? selectedGame : gameSession?.gameType;
  const isEscapeRoom = activeGame === "escape-room";
  const isSpeechCompetition = activeGame === "speech-competition";
  const isPronunciationChallenge = activeGame === "pronunciation-challenge";
  const shouldShowHub = gameSession?.gameType === "games-hub" && !isEscapeRoom && !isSpeechCompetition && !isPronunciationChallenge;
  const gameTitle = shouldShowHub ? "LEAD Class Games" : isEscapeRoom ? "LEAD Escape Room" : isPronunciationChallenge ? "Pronunciation Challenge" : "Speech Competition Game";
  const gameDescription = shouldShowHub
    ? "Choose a class game. This private link is temporary and only works during the class game window."
    : isEscapeRoom
    ? "Complete five English rooms, collect password digits, and escape before the class game window ends."
    : isPronunciationChallenge
    ? "Listen, repeat, and improve tricky English sounds before the class game window ends."
    : "Practice your speech during class. This link is temporary and only works during the class game window.";
  const GameIcon = shouldShowHub ? Gamepad2 : isEscapeRoom ? KeyRound : isPronunciationChallenge ? Sparkles : Mic;

  if (!gameSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff7d6_100%)] px-4 py-10">
        <Card className="w-full max-w-lg p-8 text-center shadow-soft">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-rose-50 text-rose-600">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">LEAD Games</p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold text-lead-navy">This game session has ended</h1>
          <p className="mt-4 leading-7 text-lead-gray">
            Please ask your teacher for a new class game link.
          </p>
          <Button asChild className="mt-6">
            <Link href="/games">Back to Games Hub</Link>
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#fff7d6_100%)] py-10">
        <div className="absolute inset-0 play-grid opacity-60" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft">
                <GameIcon className="h-4 w-4" />
                Private Class Game
              </p>
              <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
                {gameTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-lead-gray">
                {gameDescription}
              </p>
            </div>
            <Card className="p-4">
              <p className="font-heading text-lg font-bold text-lead-navy">{gameSession.studentName}</p>
              <p className="mt-1 text-sm text-lead-gray">Meeting {gameSession.meetingNumber || "not set"}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs font-bold text-yellow-800">
                <Clock className="h-4 w-4" />
                Expires {formatExpiry(gameSession.expiresAt)}
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-8">
        {shouldShowHub ? (
          <GameHub token={gameSession.token} />
        ) : isEscapeRoom ? (
          <EscapeRoomGame />
        ) : isPronunciationChallenge ? (
          <PronunciationChallengeGame />
        ) : (
          <SpeechCompetitionGame />
        )}
      </section>
    </main>
  );
}

function GameHub({ token }: { token: string }) {
  const games = [
    {
      title: "Speech Competition Game",
      description: "Practice memorization, pronunciation, and confident delivery.",
      href: `/games/session/${encodeURIComponent(token)}?game=speech-competition`,
      icon: Mic,
      accent: "border-blue-100 bg-blue-50 text-lead-blue"
    },
    {
      title: "LEAD Escape Room",
      description: "Solve five English rooms, collect digits, and unlock the final door.",
      href: `/games/session/${encodeURIComponent(token)}?game=escape-room`,
      icon: KeyRound,
      accent: "border-yellow-100 bg-yellow-50 text-yellow-700"
    },
    {
      title: "Pronunciation Challenge",
      description: "Listen, repeat, and improve tricky English sounds.",
      href: `/games/session/${encodeURIComponent(token)}?game=pronunciation-challenge`,
      icon: Sparkles,
      accent: "border-violet-100 bg-violet-50 text-violet-700"
    }
  ];

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {games.map((game) => {
        const Icon = game.icon;
        return (
          <Card key={game.title} className="group overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-soft">
            <div className="h-2 bg-lead-blue" />
            <div className="p-6">
              <div className={`grid h-14 w-14 place-items-center rounded-2xl border ${game.accent}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-heading text-2xl font-extrabold text-lead-navy">{game.title}</h2>
              <p className="mt-3 min-h-[56px] leading-7 text-lead-gray">{game.description}</p>
              <Button asChild className="mt-6 w-full">
                <Link href={game.href}>
                  Play Now
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
