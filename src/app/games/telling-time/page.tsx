import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, Clock3 } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { TellingTimeGame } from "@/components/games/telling-time/telling-time-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = { title: "Telling Time | LEAD Games", description: "Help Bill use an interactive analog clock throughout his day." };
export const dynamic = "force-dynamic";

export default async function TellingTimePage() {
  noStore();
  const cookieStore = await cookies();
  const authenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/telling-time" title="Telling Time" />;
  return <main className="min-h-screen bg-lead-soft"><section className="bg-[linear-gradient(135deg,#dbeafe,#ffffff_50%,#fef3c7)] py-7"><div className="container-shell"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4"/>Back to Games</Link></Button><p className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-lead-blue shadow-soft"><Clock3 className="h-4 w-4"/>LEAD Fun Learning</p><h1 className="mt-4 font-heading text-4xl font-extrabold text-lead-navy sm:text-5xl">Telling Time</h1><p className="mt-3 max-w-2xl text-lg leading-8 text-lead-gray">Move the clock hands and help Bill complete his day from morning to bedtime.</p></div></section><section className="container-shell py-7"><TellingTimeGame/></section></main>;
}
