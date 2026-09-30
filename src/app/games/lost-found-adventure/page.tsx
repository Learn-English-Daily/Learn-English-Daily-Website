import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Search } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { LostFoundAdventure } from "@/components/games/lost-found-adventure/lost-found-adventure";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = { title: "Lost & Found Adventure | LEAD Games", description: "Explore the LEAD School Fun Fair, find missing accessories, and practise confident Show & Tell English." };
export const dynamic = "force-dynamic";

export default async function LostFoundAdventurePage() {
  noStore();
  const cookieStore = await cookies();
  const authenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/lost-found-adventure" title="Lost & Found Adventure" />;

  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-blue-100 bg-[linear-gradient(135deg,#dbeafe,#ffffff_50%,#fef3c7)] py-5"><div className="container-shell"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button><p className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft"><Search className="h-4 w-4" />LEAD School Fun Fair</p><h1 className="mt-3 font-heading text-4xl font-extrabold text-lead-navy sm:text-5xl">Lost &amp; Found Adventure</h1><p className="mt-2 max-w-3xl text-base leading-7 text-lead-gray">Explore, remember clues, return missing accessories, and finish with a confident Show &amp; Tell.</p></div></section><section className="container-shell py-6"><LostFoundAdventure /></section></main>;
}

