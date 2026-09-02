import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Footprints } from "lucide-react";
import { ActionHeroGame } from "@/app/games/action-hero/action-hero-game";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Action Hero | LEAD Games",
  description: "Control Bill and learn action verbs through a real interactive LEAD adventure."
};

export const dynamic = "force-dynamic";

export default async function ActionHeroPage() {
  noStore();
  const cookieStore = await cookies();
  const authenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) {
    return <GamesPasswordGate redirectTo="/games/action-hero" title="Action Hero" />;
  }

  return (
    <main className="min-h-screen bg-lead-soft">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#dbeafe_0%,#ffffff_48%,#fef3c7_100%)] py-7">
        <div className="absolute inset-0 play-grid opacity-40" aria-hidden="true" />
        <div className="container-shell relative z-10">
          <Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft"><Footprints className="h-4 w-4" />LEAD Fun Learning</p>
          <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">Action Hero</h1>
          <p className="mt-3 max-w-2xl text-lg leading-8 text-lead-gray">Move, explore, and make Bill run, jump, read, eat, swim, dance, and climb through a connected action world.</p>
        </div>
      </section>
      <section className="container-shell py-7"><ActionHeroGame /></section>
    </main>
  );
}
