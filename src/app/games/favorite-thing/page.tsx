import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft,Gift } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { FavoriteThingGame } from "@/components/games/favorite-thing/favorite-thing-game";
import { GAMES_SESSION_COOKIE,isGamesPasswordConfigured,isValidGamesSession } from "@/lib/games-auth";
export const metadata:Metadata={title:"LEAD My Favorite Thing | LEAD Games",description:"Five interactive games for describing a favorite thing, its usefulness, and personal meaning."};export const dynamic="force-dynamic";
export default async function FavoriteThingPage(){noStore();const store=await cookies();const ok=isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);if(!isGamesPasswordConfigured()||!ok)return <GamesPasswordGate redirectTo="/games/favorite-thing" title="LEAD My Favorite Thing"/>;return <main className="min-h-screen bg-lead-soft"><section className="border-b border-violet-100 bg-[linear-gradient(135deg,#f3e8ff,#fff_52%,#fef3c7)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4"/>Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-700 shadow-sm"><Gift className="h-4 w-4"/>Preferences · Show & Tell</span></div></section><section className="container-shell py-6"><FavoriteThingGame/></section></main>}
