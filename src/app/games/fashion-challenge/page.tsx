import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Shirt } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { FashionChallengeGame } from "@/components/games/fashion-challenge/fashion-challenge-game";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = { title: "LEAD Fashion Challenge | LEAD Games", description: "Five varied clothing games for describing outfits and explaining preferences in English." };
export const dynamic = "force-dynamic";

export default async function FashionChallengePage() {
  noStore(); const cookieStore = await cookies(); const authenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/fashion-challenge" title="LEAD Fashion Challenge" />;
  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-fuchsia-100 bg-[linear-gradient(135deg,#fae8ff,#fff_52%,#fef3c7)] py-5"><div className="container-shell"><div className="flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-fuchsia-700 shadow-sm"><Shirt className="h-4 w-4" />Clothes · Fashion Challenge</span></div></div></section><section className="container-shell py-6"><FashionChallengeGame /></section></main>;
}
