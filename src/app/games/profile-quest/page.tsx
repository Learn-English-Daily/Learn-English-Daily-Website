import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Users } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { ProfileQuestGame } from "@/components/games/profile-quest/profile-quest-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Profile Quest | LEAD Games",
  description: "Meet, interview, remember, and introduce a new friend in English."
};

export const dynamic = "force-dynamic";

export default async function ProfileQuestPage() {
  noStore();
  const cookieStore = await cookies();
  const authenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) {
    return <GamesPasswordGate redirectTo="/games/profile-quest" title="Profile Quest" />;
  }

  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#dbeafe,#ffffff_50%,#fef3c7)] py-6">
        <div className="absolute inset-0 play-grid opacity-40" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft"><Users className="h-4 w-4" />Introduction Level Up</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold text-lead-navy sm:text-5xl">Profile Quest</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-lead-gray">Meet the character, collect clues, and introduce your new friend.</p>
        </div>
      </section>
      <section className="container-shell py-7"><ProfileQuestGame /></section>
    </main>
  );
}
