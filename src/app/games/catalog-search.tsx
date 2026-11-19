"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";

export function CatalogSearch({ entries }: { entries: { title: string; keywords: string; card: ReactNode }[] }) {
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = entries.filter(({ keywords }) => words.every((word) => keywords.includes(word)));

  return (
    <div className="mt-10">
      <div className="mx-auto max-w-xl">
        <label htmlFor="game-search" className="font-bold text-lead-navy">Search games</label>
        <div className="relative mt-2">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-lead-gray" />
          <input id="game-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title or topic..."
            className="focus-ring h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-4 text-lead-navy" />
        </div>
        <p role="status" className="mt-2 text-sm text-lead-gray">
          {matches.length === 0 ? "No games match your search." : `${matches.length} ${matches.length === 1 ? "game" : "games"}`}
        </p>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {matches.map(({ title, card }) => <div key={title}>{card}</div>)}
      </div>
    </div>
  );
}
