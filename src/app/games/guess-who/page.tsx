import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, ScanFace } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { GuessWhoGame } from "@/components/games/guess-who/guess-who-game";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata:Metadata={title:"LEAD Guess Who? | LEAD Games",description:"Five playful English challenges for describing people's bodies and appearance using he, she, has, is, and looks."};
export const dynamic="force-dynamic";
export default async function GuessWhoPage(){noStore();const cookieStore=await cookies();const authenticated=isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);if(!isGamesPasswordConfigured()||!authenticated)return <GamesPasswordGate redirectTo="/games/guess-who" title="LEAD Guess Who?"/>;return <main className="min-h-screen bg-lead-soft"><section className="border-b border-violet-100 bg-[linear-gradient(135deg,#ede9fe,#fff_52%,#fef3c7)] py-5"><div className="container-shell"><div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4"/>Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-700 shadow-sm"><ScanFace className="h-4 w-4"/>Body &amp; Appearance · Guess Who?</span></div></div></section><section className="container-shell py-6"><GuessWhoGame/></section></main>;}
