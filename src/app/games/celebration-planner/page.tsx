import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { CelebrationTownGame } from "@/components/games/celebration-town/celebration-town-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "LEAD Celebration Town | LEAD Games", description: "A continuous 2D English adventure about special days, celebrations, and cultural traditions." };

export default async function CelebrationPlannerPage() {
  noStore();
  const store = await cookies();
  const authenticated = isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/celebration-planner" title="LEAD Celebration Quest" />;
  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-fuchsia-100 bg-[linear-gradient(135deg,#fae8ff,#fff_52%,#fef3c7)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-fuchsia-700 shadow-sm"><PartyPopper className="h-4 w-4" />Meeting 28 · Special Days &amp; Celebrations</span></div></section><section className="container-shell py-6"><CelebrationTownGame /></section></main>;
}
