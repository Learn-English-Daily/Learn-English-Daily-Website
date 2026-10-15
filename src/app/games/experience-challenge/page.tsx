import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft,Medal } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { ExperienceChallengeGame } from "@/components/games/experience-challenge/experience-challenge-game";
import { GAMES_SESSION_COOKIE,isGamesPasswordConfigured,isValidGamesSession } from "@/lib/games-auth";
export const metadata:Metadata={title:"LEAD Have You Ever? Challenge | LEAD Games",description:"Five challenging games for Present Perfect, life experiences, achievements, ever, never, already, and yet."};export const dynamic="force-dynamic";
export default async function ExperienceChallengePage(){noStore();const store=await cookies();const ok=isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);if(!isGamesPasswordConfigured()||!ok)return <GamesPasswordGate redirectTo="/games/experience-challenge" title="LEAD Have You Ever? Challenge"/>;return <main className="min-h-screen bg-lead-soft"><section className="border-b border-indigo-100 bg-[linear-gradient(135deg,#e0e7ff,#fff_52%,#fef3c7)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4"/>Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-700 shadow-sm"><Medal className="h-4 w-4"/>Experiences &amp; Achievements</span></div></section><section className="container-shell py-6"><ExperienceChallengeGame/></section></main>}
