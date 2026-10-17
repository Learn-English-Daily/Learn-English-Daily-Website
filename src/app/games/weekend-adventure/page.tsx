import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { WeekendAdventureGame } from "@/components/games/weekend-adventure/weekend-adventure-game";
import { GAMES_SESSION_COOKIE,isGamesPasswordConfigured,isValidGamesSession } from "@/lib/games-auth";

export const metadata:Metadata={title:"LEAD My Weekend Adventure | LEAD Games",description:"Five active arcade games for talking about weekend activities using the Simple Past."};
export const dynamic="force-dynamic";
export default async function WeekendAdventurePage(){noStore();const store=await cookies();const ok=isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);if(!isGamesPasswordConfigured()||!ok)return <GamesPasswordGate redirectTo="/games/weekend-adventure" title="LEAD My Weekend Adventure"/>;return <main className="min-h-screen bg-lead-soft"><section className="border-b border-orange-100 bg-[linear-gradient(135deg,#ffedd5,#fff_52%,#dbeafe)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4"/>Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-700 shadow-sm"><PartyPopper className="h-4 w-4"/>Meeting 25 · My Weekend</span></div></section><section className="container-shell py-6"><WeekendAdventureGame/></section></main>}
