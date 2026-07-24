import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Trophy } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { SentenceBuilderGame } from "@/app/games/sentence-builder/sentence-builder-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Sentence Builder | LEAD Games",
  description: "Build clear English sentences from shuffled word cards."
};

export const dynamic = "force-dynamic";

export default async function SentenceBuilderPage() {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);

  if (!isGamesPasswordConfigured() || !isAuthenticated) {
    return <GamesPasswordGate redirectTo="/games/sentence-builder" title="Sentence Builder" />;
  }

  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#f5f3ff_100%)] py-10">
        <div className="absolute inset-0 play-grid opacity-60" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <Button asChild variant="secondary" size="sm">
            <Link href="/games">
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Link>
          </Button>
          <p className="mt-6 inline-flex items-center gap-2 rounded-lg border border-violet-100 bg-white px-4 py-2 text-sm font-bold text-violet-700 shadow-soft">
            <Trophy className="h-4 w-4" />
            LEAD Games
          </p>
          <h1 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
            Sentence Builder
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-lead-gray">
            Arrange shuffled word cards into clear English sentences and strengthen grammar confidence.
          </p>
        </div>
      </section>

      <section className="container-shell grid gap-6 py-8">
        <SentenceBuilderGame />
      </section>
    </main>
  );
}
