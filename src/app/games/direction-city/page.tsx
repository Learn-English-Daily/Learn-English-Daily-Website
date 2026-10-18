import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, MapPinned } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { DirectionCityGame } from "@/components/games/direction-city/direction-city-game";
import { GAMES_SESSION_COOKIE,isGamesPasswordConfigured,isValidGamesSession } from "@/lib/games-auth";
export const metadata:Metadata={title:"LEAD Direction City | LEAD Games",description:"Five interactive map adventures for asking for and giving directions."};export const dynamic="force-dynamic";
export default async function DirectionCityPage(){noStore();const store=await cookies();const ok=isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);if(!isGamesPasswordConfigured()||!ok)return <GamesPasswordGate redirectTo="/games/direction-city" title="LEAD Direction City"/>;return <main className="min-h-screen bg-lead-soft"><section className="border-b border-sky-100 bg-[linear-gradient(135deg,#e0f2fe,#fff_52%,#fef3c7)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4"/>Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-sky-700 shadow-sm"><MapPinned className="h-4 w-4"/>Directions · Map Challenge</span></div></section><section className="container-shell py-6"><DirectionCityGame/></section></main>}
