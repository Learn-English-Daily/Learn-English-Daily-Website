import Link from "next/link";
import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { Button } from "@/components/ui/button";
import { CalendarQuestGame } from "@/components/games/calendar-quest/calendar-quest-game";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata: Metadata = { title: "Calendar Quest: Race Against Time! | LEAD Games", description: "A five-stage LEAD arcade adventure for mastering days, dates, months, ordinals, schedules, and speaking." };
export const dynamic = "force-dynamic";

export default async function CalendarQuestPage() {
  noStore();
  const store = await cookies();
  const authenticated = isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value);
  if (!isGamesPasswordConfigured() || !authenticated) return <GamesPasswordGate redirectTo="/games/calendar-quest" title="Calendar Quest: Race Against Time!" />;
  return <main className="min-h-screen bg-lead-soft"><section className="border-b border-blue-100 bg-[linear-gradient(135deg,#dbeafe,#fff_52%,#fef3c7)] py-5"><div className="container-shell flex flex-wrap items-center justify-between gap-3"><Button asChild variant="secondary" size="sm"><Link href="/games"><ArrowLeft className="h-4 w-4"/>Back to Games</Link></Button><span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700 shadow-sm"><CalendarDays className="h-4 w-4"/>Lesson 17 · Day and Date</span></div></section><section className="container-shell py-6"><CalendarQuestGame/></section></main>;
}

