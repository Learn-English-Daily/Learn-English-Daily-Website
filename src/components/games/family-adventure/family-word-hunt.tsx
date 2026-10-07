"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb, RotateCcw, Volume2 } from "lucide-react";
import { arcadeTone, speak } from "./game-audio";
import { familyMembers, shuffle } from "./game-data";
import type { StageProps } from "./types";

const GRID_SIZE = 6;
const filler = "AEFGHILMNOPRSTUY";

function makePuzzle(word: string) {
  const letters = Array.from({ length: GRID_SIZE * GRID_SIZE }, () => filler[Math.floor(Math.random() * filler.length)]);
  const path: number[] = [];
  let row = Math.floor(Math.random() * 3);
  let col = Math.random() > .5 ? 0 : GRID_SIZE - 1;
  let direction = col === 0 ? 1 : -1;
  for (const letter of word.toUpperCase()) {
    const index = row * GRID_SIZE + col; letters[index] = letter; path.push(index);
    if (direction === 1 && col === GRID_SIZE - 1) { row += 1; direction = -1; }
    else if (direction === -1 && col === 0) { row += 1; direction = 1; }
    else col += direction;
  }
  return { letters, path };
}

export function FamilyWordHunt({ sound, onComplete }: StageProps) {
  const targets = useMemo(() => shuffle(familyMembers).slice(0, 6), []);
  const [round, setRound] = useState(0); const [selected, setSelected] = useState<number[]>([]); const [found, setFound] = useState<string[]>([]);
  const [score, setScore] = useState(0); const [correct, setCorrect] = useState(0); const [attempts, setAttempts] = useState(0);
  const [combo, setCombo] = useState(0); const [best, setBest] = useState(0); const [mistakes, setMistakes] = useState(0); const [hint, setHint] = useState<number | null>(null);
  const target = targets[round];
  const puzzle = useMemo(() => makePuzzle(target.word), [target.word]);
  useEffect(() => { speak(`Find the word ${target.word}`, sound); }, [sound, target.word]);

  function choose(index: number) {
    const expected = puzzle.path[selected.length];
    if (index !== expected) {
      const nextMistakes = mistakes + 1; setAttempts((value) => value + 1); setMistakes(nextMistakes); setCombo(0); setSelected([]); setHint(nextMistakes >= 2 ? puzzle.path[0] : null); arcadeTone("wrong", sound); return;
    }
    const nextSelected = [...selected, index]; setSelected(nextSelected); setHint(null);
    if (nextSelected.length < target.word.length) { arcadeTone("correct", sound); return; }
    const nextAttempts = attempts + 1; const nextCombo = combo + 1; const nextBest = Math.max(best, nextCombo); const nextCorrect = correct + 1; const nextScore = score + 300 * nextCombo + target.word.length * 25;
    setAttempts(nextAttempts); setCombo(nextCombo); setBest(nextBest); setCorrect(nextCorrect); setScore(nextScore); setFound((current) => [...current, target.word]); arcadeTone("complete", sound); speak(target.word, sound);
    if (round === targets.length - 1) {
      const accuracy = nextCorrect / targets.length;
      window.setTimeout(() => onComplete({ stars: accuracy >= .9 ? 3 : accuracy >= .65 ? 2 : 1, score: nextScore, correct: nextCorrect, attempts: Math.max(targets.length, nextAttempts), bestCombo: nextBest }), 700);
    } else window.setTimeout(() => { setRound((value) => value + 1); setSelected([]); setMistakes(0); setHint(null); }, 600);
  }

  function showHint() { setHint(puzzle.path[selected.length]); window.setTimeout(() => setHint(null), 1200); }
  return <section className="relative min-h-[590px] overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_top,#1d4ed8,#172554_58%,#020617)] p-4 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-yellow-300">Family Word Hunt · Word {round + 1}/{targets.length}</p><h2 className="mt-1 font-heading text-3xl font-black">Find <span className="text-yellow-300">{target.word.toUpperCase()}</span></h2><p className="mt-1 text-sm font-bold text-blue-100">Start at the first letter and follow the connected path.</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950">{score.toLocaleString()} pts</span><button aria-label="Listen to target word" onClick={() => speak(target.word, sound)} className="focus-ring rounded-full bg-white/15 p-3"><Volume2 className="h-5 w-5" /></button></div></div>
    <div className="mx-auto mt-5 grid max-w-[31rem] grid-cols-6 gap-2 rounded-[2rem] border-4 border-yellow-300 bg-white/10 p-3 sm:gap-3 sm:p-5">{puzzle.letters.map((letter, index) => { const picked = selected.includes(index); return <button key={`${round}-${index}`} onClick={() => choose(index)} aria-label={`Letter ${letter}, row ${Math.floor(index / GRID_SIZE) + 1}, column ${(index % GRID_SIZE) + 1}`} className={`focus-ring aspect-square rounded-xl border-2 font-heading text-xl font-black transition sm:text-3xl ${picked ? "scale-90 border-emerald-300 bg-emerald-400 text-slate-950" : hint === index ? "animate-pulse border-yellow-200 bg-yellow-300 text-slate-950" : "border-blue-200/50 bg-white text-slate-900 hover:-translate-y-1 hover:bg-blue-50"}`}>{letter}</button>; })}</div>
    <div className="mx-auto mt-4 flex max-w-[31rem] items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-blue-200">Building</p><p className="mt-1 min-h-8 font-heading text-2xl font-black tracking-[.18em] text-yellow-300">{selected.map((index) => puzzle.letters[index]).join("") || "_"}</p></div><div className="flex gap-2"><button onClick={showHint} className="focus-ring rounded-xl bg-yellow-400 px-3 py-2 text-xs font-black text-slate-950"><Lightbulb className="mr-1 inline h-4 w-4" />HINT</button><button onClick={() => { setSelected([]); setHint(null); }} className="focus-ring rounded-xl bg-white/15 px-3 py-2 text-xs font-black"><RotateCcw className="mr-1 inline h-4 w-4" />RESET</button></div></div>
    <div className="mt-4 flex flex-wrap justify-center gap-2">{targets.map((item, index) => <span key={item.id} className={`rounded-full px-3 py-1 text-xs font-black ${found.includes(item.word) ? "bg-emerald-400 text-slate-950" : index === round ? "bg-yellow-300 text-slate-950" : "bg-white/10 text-blue-100"}`}>{found.includes(item.word) ? "✓ " : ""}{item.word}</span>)}</div>
  </section>;
}
