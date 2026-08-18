import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Map } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { TransportationAdventureGame } from "@/app/games/transportation-adventure/transportation-adventure-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Transportation Adventure | LEAD Games",
  description: "Explore land, air, and water transportation through a five-stage English adventure."
};

export const dynamic = "force-dynamic";

export default async function TransportationAdventurePage() {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);

  if (!isGamesPasswordConfigured() || !isAuthenticated) {
    return <GamesPasswordGate redirectTo="/games/transportation-adventure" title="Transportation Adventure" />;
  }

  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#dbeafe_0%,#ffffff_48%,#fef3c7_100%)] py-8">
        <div className="absolute inset-0 play-grid opacity-50" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <Button asChild variant="secondary" size="sm">
            <Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link>
          </Button>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft">
            <Map className="h-4 w-4" /> LEAD Games
          </p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
            Transportation Adventure
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-lead-gray">
            Travel with Wisey, learn useful transportation English, and earn the Explorer badge.
          </p>
        </div>
      </section>
      <section className="container-shell py-8"><TransportationAdventureGame /></section>
    </main>
  );
}
