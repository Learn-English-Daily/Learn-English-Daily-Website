import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, PawPrint } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { PetRescueAdventure } from "@/app/games/pet-rescue-adventure/pet-rescue-adventure";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Pet Rescue Adventure | LEAD Games",
  description: "Rescue, match, feed, groom, and care for pets while practicing English."
};

export const dynamic = "force-dynamic";

export default async function PetRescueAdventurePage() {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);

  if (!isGamesPasswordConfigured() || !isAuthenticated) {
    return <GamesPasswordGate redirectTo="/games/pet-rescue-adventure" title="Pet Rescue Adventure" />;
  }

  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#dcfce7_0%,#ffffff_48%,#fef3c7_100%)] py-8">
        <div className="absolute inset-0 play-grid opacity-40" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-soft"><PawPrint className="h-4 w-4" /> LEAD Games</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">Pet Rescue Adventure</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-lead-gray">Match, remember, shop, groom, and care for cute pets with Wisey.</p>
        </div>
      </section>
      <section className="container-shell py-8"><PetRescueAdventure /></section>
    </main>
  );
}
