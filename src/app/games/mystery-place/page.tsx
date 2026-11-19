import Link from "next/link";
import { MysteryPlace } from "@/components/games/mystery-place-adventure";

export const metadata = { title: "Mystery Place: The Lost Postcards | LEAD Games" };

export default function MysteryPlacePage() {
  return <main className="min-h-screen bg-gradient-to-b from-sky-200 to-yellow-100 px-3 py-4">
    <div className="mx-auto max-w-5xl">
      <Link href="/games" className="focus-ring mb-3 inline-block rounded-lg border border-blue-200 bg-white px-4 py-2 font-bold text-lead-blue">Back to Games</Link>
      <MysteryPlace />
    </div>
  </main>;
}
