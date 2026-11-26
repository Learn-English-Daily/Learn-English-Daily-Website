import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Star } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { GuessTheStarGame } from "@/components/games/guess-the-star/guess-the-star-game";
import {
  GAMES_SESSION_COOKIE,
  isGamesPasswordConfigured,
  isValidGamesSession,
} from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Guess the Star! | LEAD Games",
  description:
    "A five-round celebrity guessing TV game show for describing inspiring people in English.",
};
export const dynamic = "force-dynamic";

export default async function GuessTheStarPage() {
  noStore();
  const store = await cookies();
  const authenticated = isValidGamesSession(
    store.get(GAMES_SESSION_COOKIE)?.value,
  );
  if (!isGamesPasswordConfigured() || !authenticated)
    return (
      <GamesPasswordGate
        redirectTo="/games/guess-the-star"
        title="LEAD Guess the Star!"
      />
    );
  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="border-b border-violet-100 bg-[linear-gradient(135deg,#ede9fe,#fff_52%,#fef3c7)] py-5">
        <div className="container-shell flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href="/games">
              <ArrowLeft className="h-4 w-4" />
              Back to Games
            </Link>
          </Button>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-700 shadow-sm">
            <Star className="h-4 w-4" />
            Lesson 31 · My Favorite Person
          </span>
        </div>
      </section>
      <section className="container-shell py-6">
        <GuessTheStarGame />
      </section>
    </main>
  );
}
