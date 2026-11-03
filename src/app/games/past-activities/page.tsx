import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, History } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { PastActivitiesGame } from "@/components/games/past-activities/past-activities-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "LEAD Past Activities Arcade | LEAD Games", description: "Five interactive games for learning regular and irregular Simple Past verbs." };

export default async function PastActivitiesPage() {
  noStore();
  const store = await cookies();
  const authenticated = isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/past-activities" title="LEAD Past Activities Arcade" />;
  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-violet-100 bg-[linear-gradient(135deg,#ede9fe,#fff_52%,#fef3c7)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-700 shadow-sm"><History className="h-4 w-4" />Meeting 26 · Past Activities</span></div></section><section className="container-shell py-6"><PastActivitiesGame /></section></main>;
}

