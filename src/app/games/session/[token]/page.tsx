import Link from "next/link";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Clock, LockKeyhole, Mic } from "lucide-react";
import { SpeechCompetitionGame } from "@/app/games/speech-competition/speech-competition-game";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getGameSessionsCollectionName,
  isGameSessionExpired,
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
  studentName: string;
  meetingNumber: number;
  expiresAt: string;
};

async function getGameSession(token: string): Promise<GameSession | null> {
  if (!token) return null;

  const db = await getMongoDb();
  const doc = await db.collection<GameSessionDocument>(getGameSessionsCollectionName()).findOne({
    token,
    gameType: "speech-competition"
  });

  if (!doc?.token || isGameSessionExpired(doc.expiresAt)) return null;

  return {
    token: doc.token,
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
  params
}: {
  params: Promise<{ token: string }>;
}) {
  noStore();
  const resolvedParams = await params;
  const gameSession = await getGameSession(resolvedParams.token || "");

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
                <Mic className="h-4 w-4" />
                Private Class Game
              </p>
              <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
                Speech Competition Game
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-lead-gray">
                Practice your speech during class. This link is temporary and only works during the class game window.
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
        <SpeechCompetitionGame />
      </section>
    </main>
  );
}
