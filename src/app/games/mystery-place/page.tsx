import { cookies } from "next/headers";
import Link from "next/link";
import { GamesPasswordGate } from "@/app/games/password-gate";
import { MysteryPlace } from "@/components/games/mystery-place";
import { GAMES_SESSION_COOKIE, isGamesPasswordConfigured, isValidGamesSession } from "@/lib/games-auth";

export const metadata = { title: "Mystery Place | LEAD Games" };

export default async function MysteryPlacePage() {
  const store = await cookies();
  if (!isGamesPasswordConfigured() || !isValidGamesSession(store.get(GAMES_SESSION_COOKIE)?.value)) {
    return <GamesPasswordGate redirectTo="/games/mystery-place" title="Mystery Place" />;
  }
  return <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
    <div className="mx-auto max-w-4xl">
      <Link href="/games" className="focus-ring inline-block rounded-lg border border-slate-500 px-4 py-2 font-bold">Back to Games</Link>
      <MysteryPlace />
    </div>
  </main>;
}
