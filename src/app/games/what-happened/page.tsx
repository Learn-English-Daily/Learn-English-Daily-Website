import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Search } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { WhatHappenedGame } from "@/components/games/what-happened/what-happened-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "LEAD What Happened? | LEAD Games", description: "Five interactive challenges for talking about yesterday, last night, last week, and time ago." };

export default async function WhatHappenedPage() {
  noStore(); const store = await cookies(); const authenticated = isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/what-happened" title="LEAD What Happened?" />;
  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-cyan-100 bg-[linear-gradient(135deg,#cffafe,#fff_52%,#dbeafe)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-700 shadow-sm"><Search className="h-4 w-4" />Meeting 27 · Yesterday &amp; Last Week</span></div></section><section className="container-shell py-6"><WhatHappenedGame /></section></main>;
}
