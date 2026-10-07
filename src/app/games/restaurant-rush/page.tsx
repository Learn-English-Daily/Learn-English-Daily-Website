import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Utensils } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { RestaurantRushGame } from "@/components/games/restaurant-rush/restaurant-rush-game";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = { title: "LEAD Restaurant Rush | LEAD Games", description: "Run a crazy restaurant while learning polite English requests." };
export const dynamic = "force-dynamic";

export default async function RestaurantRushPage() {
  noStore();
  const cookieStore = await cookies();
  const authenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/restaurant-rush" title="LEAD Restaurant Rush" />;
  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-amber-100 bg-[linear-gradient(135deg,#dbeafe,#fff_52%,#fef3c7)] py-5"><div className="container-shell"><div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-700 shadow-sm"><Utensils className="h-4 w-4" />At a Restaurant · Arcade Series</span></div></div></section><section className="container-shell py-6"><RestaurantRushGame /></section></main>;
}
