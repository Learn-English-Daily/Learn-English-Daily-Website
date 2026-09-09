import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Sunrise } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { DailyRoutineGame } from "@/components/games/daily-routine/daily-routine-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Daily Routine Level Up | LEAD Games",
  description: "Build, explore, speak, and write your own daily routine with LEAD."
};

export const dynamic = "force-dynamic";

export default async function DailyRoutinePage() {
  noStore();
  const cookieStore = await cookies();
  const authenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) {
    return <GamesPasswordGate redirectTo="/games/daily-routine" title="Daily Routine Level Up" />;
  }

  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="border-b border-blue-100 bg-[linear-gradient(135deg,#dbeafe,#ffffff_50%,#fef3c7)] py-6">
        <div className="container-shell">
          <Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft"><Sunrise className="h-4 w-4" />LEAD Fun Learning</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold text-lead-navy sm:text-5xl">Daily Routine Level Up</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-lead-gray">Become the character, explore your day, and speak English with confidence.</p>
        </div>
      </section>
      <section className="container-shell py-7"><DailyRoutineGame /></section>
    </main>
  );
}
