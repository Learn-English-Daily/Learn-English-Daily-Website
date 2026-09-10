import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { ReadingDetectiveGame } from "@/components/games/reading-detective/reading-detective-game";
import { Button } from "@/components/ui/button";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = {
  title: "Reading Detective | LEAD Games",
  description: "Rebuild stories, read for meaning, and solve interactive English reading mysteries with LEAD."
};

export const dynamic = "force-dynamic";

export default async function ReadingDetectivePage() {
  noStore();
  const cookieStore = await cookies();
  const isAuthenticated = isValidGamesSession(cookieStore.get(GAMES_SESSION_COOKIE)?.value);

  if (!isGamesPasswordConfigured() || !isAuthenticated) {
    return <GamesPasswordGate redirectTo="/games/reading-detective" />;
  }

  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff,#ffffff_48%,#fef9c3)]"><div className="container-shell py-6"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4" />Back to Games</Link></Button><div className="mt-5 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-lead-blue text-white"><BookOpen className="h-6 w-6" /></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-lead-blue">Reading Skills</p><h1 className="font-heading text-3xl font-black text-lead-navy sm:text-4xl">Reading Detective — Find the Story!</h1></div></div></div></section><div className="container-shell py-6 sm:py-8"><ReadingDetectiveGame /></div></main>;
}
