"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, Shield } from "lucide-react";
import { arcadeTone, speak } from "./game-audio";
import { familyMembers, shuffle } from "./game-data";
import type { StageProps } from "./types";

const ROUND_SECONDS = 5;

export function FamilyRush({ sound, onComplete }: StageProps) {
  const rounds = useMemo(() => shuffle(familyMembers).slice(0, 7), []);
  const [round, setRound] = useState(0); const [lane, setLane] = useState(1); const laneRef = useRef(1); const resolvingRef = useRef(false);
  const [countdown, setCountdown] = useState(ROUND_SECONDS); const [jumping, setJumping] = useState(false);
  const [score, setScore] = useState(0); const [correct, setCorrect] = useState(0); const [combo, setCombo] = useState(0); const [best, setBest] = useState(0);
  const [shield, setShield] = useState(true); const [feedback, setFeedback] = useState("Use LEFT and RIGHT — the gates come to you!");
  const target = rounds[round];
  const options = useMemo(() => target ? shuffle([target, ...shuffle(familyMembers.filter((item) => item.id !== target.id)).slice(0, 2)]) : [], [target]);
  const clue = target ? (round < 2 ? target.word : target.sentence) : "Get ready!";
  const move = useCallback((direction: -1 | 1) => setLane((current) => Math.max(0, Math.min(2, current + direction))), []);
  const jump = useCallback(() => { setJumping(true); window.setTimeout(() => setJumping(false), 500); }, []);

  const resolveLane = useCallback(() => {
    if (resolvingRef.current || !target) return;
    resolvingRef.current = true;
    const hit = options[laneRef.current]?.id === target.id;
    let nextCorrect = correct; let nextScore = score; let nextBest = best;
    if (hit) {
      const nextCombo = combo + 1; nextCorrect += 1; nextScore += 150 * nextCombo; nextBest = Math.max(best, nextCombo);
      setCombo(nextCombo); setCorrect(nextCorrect); setScore(nextScore); setBest(nextBest);
      setFeedback(nextCombo >= 3 ? `🔥 RUSH COMBO x${nextCombo}` : "✅ Perfect lane!"); arcadeTone("correct", sound);
    } else if (shield) {
      setShield(false); setFeedback("🛡️ Wisey Shield saved you!"); arcadeTone("wrong", sound);
    } else {
      setCombo(0); setFeedback(`That was ${options[laneRef.current]?.word}. Keep running!`); arcadeTone("wrong", sound);
    }
    if (round === rounds.length - 1) {
      const accuracy = nextCorrect / rounds.length;
      window.setTimeout(() => onComplete({ stars: accuracy >= .8 ? 3 : accuracy >= .55 ? 2 : 1, score: nextScore + 300, correct: nextCorrect, attempts: rounds.length, bestCombo: nextBest }), 650);
      return;
    }
    window.setTimeout(() => { setRound((value) => value + 1); setCountdown(ROUND_SECONDS); setFeedback("New clue — move before the gate reaches you!"); resolvingRef.current = false; }, 600);
  }, [best, combo, correct, onComplete, options, round, rounds.length, score, shield, sound, target]);

  useEffect(() => { laneRef.current = lane; }, [lane]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (["arrowleft", "arrowright", "arrowup", "a", "d", "w", " "].includes(key)) event.preventDefault(); if (key === "arrowleft" || key === "a") move(-1); if (key === "arrowright" || key === "d") move(1); if (key === "arrowup" || key === "w" || key === " ") jump(); };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, [jump, move]);
  useEffect(() => { const timer = window.setTimeout(() => speak(clue, sound), 150); return () => window.clearTimeout(timer); }, [clue, sound]);
  useEffect(() => { if (countdown <= 0) { resolveLane(); return; } const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000); return () => window.clearTimeout(timer); }, [countdown, resolveLane]);

  if (!target) return null;
  const approach = Math.max(0, Math.min(1, (ROUND_SECONDS - countdown) / ROUND_SECONDS));
  return <section className="relative min-h-[590px] overflow-hidden rounded-3xl bg-[linear-gradient(#38bdf8_0_35%,#15803d_35%_48%,#334155_48%)] p-4">
    <div className="relative z-20 flex items-start justify-between gap-3"><div className="rounded-2xl bg-slate-950/90 px-4 py-3"><p className="text-xs font-black uppercase text-yellow-300">Move into the correct lane</p><p className="mt-1 text-lg font-black">🔊 “{clue}”</p></div><div className="flex gap-2"><span className="grid h-12 w-12 place-items-center rounded-full bg-yellow-400 text-xl font-black text-slate-950">{countdown}</span><span className="rounded-full bg-white/90 px-3 py-2 text-xs font-black text-slate-900">{score} pts</span>{shield ? <span className="rounded-full bg-blue-500 p-2" title="Wisey Shield"><Shield className="h-4 w-4" /></span> : null}</div></div>
    <div className="absolute inset-x-4 bottom-24 top-28 grid grid-cols-3 gap-2">{options.map((option, index) => <div key={option.id} className={`relative overflow-hidden rounded-t-[3rem] border-x-4 border-dashed transition ${lane === index ? "border-yellow-300 bg-yellow-300/15" : "border-white/25 bg-slate-900/20"}`}><div className="absolute left-1/2 rounded-2xl border-4 border-white bg-white px-4 py-3 text-center text-slate-900 shadow-xl transition-all duration-1000" style={{ top: `${10 + approach * 52}%`, transform: `translateX(-50%) scale(${.65 + approach * .55})` }}><span className="block text-5xl">{option.emoji}</span><span className="text-xs font-black">{option.word.toUpperCase()}</span></div>{round > 1 ? <span className="absolute bottom-[15%] left-1/2 -translate-x-1/2 text-3xl">{index === (round + 1) % 3 ? "🧸" : "⭐"}</span> : null}</div>)}</div>
    <div className="absolute bottom-20 left-0 right-0 grid grid-cols-3"><span /><div className="text-center text-6xl transition-all duration-150" style={{ transform: `translateX(${(lane - 1) * 100}%) translateY(${jumping ? -65 : 0}px)` }}>🏃</div><span /></div>
    <p className="absolute inset-x-4 bottom-14 text-center text-sm font-black text-yellow-300">{feedback}</p>
    <div className="absolute inset-x-4 bottom-3 flex justify-center gap-4"><button aria-label="Move left" onClick={() => move(-1)} className="focus-ring grid h-12 w-20 place-items-center rounded-xl bg-white/20 hover:bg-white/30"><ArrowLeft /></button><button aria-label="Jump" onClick={jump} className="focus-ring grid h-12 w-16 place-items-center rounded-xl bg-yellow-400 text-slate-900"><ArrowUp /></button><button aria-label="Move right" onClick={() => move(1)} className="focus-ring grid h-12 w-20 place-items-center rounded-xl bg-white/20 hover:bg-white/30"><ArrowRight /></button></div>
  </section>;
}
