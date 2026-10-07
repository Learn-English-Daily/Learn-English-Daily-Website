"use client";

import { useEffect, useMemo, useState } from "react";
import { arcadeSound, speakArcade } from "../lead-arcade/audio";
import type { ArcadeStageProps } from "../lead-arcade/types";
import { restaurantItems, shuffle } from "./game-data";

const challenges = [
  { item: "pizza", answer: ["CAN", "I", "HAVE", "A", "PIZZA", "PLEASE"] },
  { item: "burger", answer: ["CAN", "I", "HAVE", "A", "BURGER", "PLEASE"] },
  { item: "juice", answer: ["I'D", "LIKE", "SOME", "JUICE", "PLEASE"] },
  { item: "chicken", alternatives: [["CAN", "I", "HAVE", "SOME", "CHICKEN", "PLEASE"], ["I'D", "LIKE", "SOME", "CHICKEN", "PLEASE"]] },
  { item: "combo", answer: ["I'D", "LIKE", "A", "BURGER", "AND", "SOME", "JUICE", "PLEASE"] }
];
const distractors = ["MY", "IS", "THE", "WANT", "GIVE", "TO", "LIKE", "CAN", "SOME", "A", "AND"];

export function OrderBuilder({ sound, onComplete }: ArcadeStageProps) {
  const [round, setRound] = useState(0); const [built, setBuilt] = useState<string[]>([]); const [beltTick, setBeltTick] = useState(0); const [score, setScore] = useState(0); const [combo, setCombo] = useState(0); const [best, setBest] = useState(0); const [correct, setCorrect] = useState(0); const [attempts, setAttempts] = useState(0); const [flash, setFlash] = useState<"good" | "bad" | "">("");
  const challenge = challenges[round]; const validAnswers = useMemo(() => challenge.alternatives || [challenge.answer!], [challenge]); const target = validAnswers.find((answer) => built.every((word, index) => answer[index] === word)) || validAnswers[0];
  const belt = useMemo(() => {
    const required = [...new Set(validAnswers.flat())];
    const extras = shuffle(distractors.filter((word) => !required.includes(word))).slice(0, Math.max(4, (round > 2 ? 14 : 11) - required.length));
    const words = shuffle([...required, ...extras]);
    const shift = beltTick % Math.max(1, words.length);
    return [...words.slice(shift), ...words.slice(0, shift)];
  }, [round, beltTick, validAnswers]);
  useEffect(() => { const timer = window.setInterval(() => setBeltTick((value) => value + 1), Math.max(850, 1450 - round * 120)); return () => window.clearInterval(timer); }, [round]);
  function select(word: string) {
    setAttempts((value) => value + 1);
    if (validAnswers.some((answer) => answer[built.length] === word && built.every((chosen, index) => answer[index] === chosen))) { const next = [...built, word]; setBuilt(next); setFlash("good"); arcadeSound("correct", sound); if (validAnswers.some((answer) => answer.join() === next.join())) { const nextCombo = combo + 1; setCombo(nextCombo); setBest((value) => Math.max(value, nextCombo)); setCorrect((value) => value + 1); setScore((value) => value + 350 + nextCombo * 75); speakArcade(`${next.join(" ").toLowerCase()}.`, sound); window.setTimeout(() => { if (round === challenges.length - 1) onComplete({ stars: correct >= 4 ? 3 : correct >= 3 ? 2 : 1, score: score + 350 + nextCombo * 75, correct: correct + 1, attempts, bestCombo: Math.max(best, nextCombo), practiced: ["Can I have a pizza, please?", "I'd like some juice, please."] }); else { setRound((value) => value + 1); setBuilt([]); } }, 850); } else setBuilt(next); }
    else { setFlash("bad"); setCombo(0); arcadeSound("wrong", sound); }
    window.setTimeout(() => setFlash(""), 300);
  }
  const desired = challenge.item === "combo" ? "🍔 + 🧃" : restaurantItems.find((item) => item.id === challenge.item)?.emoji;
  return <section className="mx-auto max-w-5xl"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-yellow-300">Order {round + 1}/5</p><h2 className="font-heading text-3xl font-black">Build the polite request</h2></div><div className="font-black">{score} · 🔥 x{combo}</div></div><div className="mt-5 rounded-[2rem] border-4 border-amber-200 bg-[#fff7d6] p-5 text-slate-900"><div className="flex items-center justify-center gap-6"><span className="text-7xl">{desired}</span><div><p className="text-sm font-black uppercase text-blue-700">Customer wants</p><p className="font-heading text-2xl font-black">{challenge.item === "combo" ? "Burger and juice" : challenge.item}</p></div></div><div className={`mx-auto mt-6 min-h-20 max-w-4xl rounded-2xl border-4 p-4 transition ${flash === "bad" ? "border-rose-500 bg-rose-50" : flash === "good" ? "border-emerald-400 bg-emerald-50" : "border-blue-200 bg-white"}`}><div className="flex min-h-10 flex-wrap items-center justify-center gap-2">{built.length ? built.map((word, index) => <span key={`${word}-${index}`} className="rounded-lg bg-blue-600 px-3 py-2 font-black text-white">{word}</span>) : <span className="font-bold text-slate-400">Catch the words in order...</span>}</div></div>{round === 0 ? <p className="mt-3 text-center text-sm font-bold text-blue-700">Hint: CAN / I / HAVE / A / ____ / PLEASE</p> : round === 3 ? <p className="mt-3 text-center text-sm font-bold text-emerald-700">Both “Can I have…” and “I&apos;d like…” are correct.</p> : null}<div className="relative mt-7 overflow-hidden rounded-2xl border-4 border-slate-600 bg-slate-800 p-5"><div className="absolute inset-x-0 top-1/2 h-2 bg-yellow-400/30" /><div key={beltTick} className="relative flex flex-wrap justify-center gap-3 animate-[pulse_1s_ease-in-out]"><span className="text-3xl">⚙️</span>{belt.map((word) => <button key={word} onClick={() => select(word)} className="min-w-20 rounded-xl border-b-4 border-blue-800 bg-white px-4 py-3 font-black text-slate-900 transition hover:-translate-y-1 hover:bg-yellow-200">{word}</button>)}<span className="text-3xl">⚙️</span></div></div><div className="mt-5 flex justify-center gap-3"><button onClick={() => setBuilt((value) => value.slice(0, -1))} className="rounded-xl bg-slate-200 px-5 py-3 font-black">UNDO</button><button onClick={() => speakArcade(target.join(" ").toLowerCase(), sound)} className="rounded-xl bg-blue-100 px-5 py-3 font-black text-blue-700">🔊 HINT</button></div></div></section>;
}
