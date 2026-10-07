"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { arcadeSound, speakArcade } from "../lead-arcade/audio";
import type { ArcadeStageProps } from "../lead-arcade/types";
import { restaurantItems, shuffle, type RestaurantItem } from "./game-data";

type FallingItem = { key: number; item: RestaurantItem; x: number; y: number; power?: "double" | "slow" | "shield" };
const rounds = [["burger"], ["pizza"], ["fries", "juice"], ["chicken", "water"]];

export function OrderCatch({ sound, onComplete }: ArcadeStageProps) {
  const [round, setRound] = useState(0); const [tray, setTray] = useState(50); const [falling, setFalling] = useState<FallingItem[]>([]); const [caught, setCaught] = useState<string[]>([]); const [score, setScore] = useState(0); const [combo, setCombo] = useState(0); const [best, setBest] = useState(0); const [attempts, setAttempts] = useState(0); const [correct, setCorrect] = useState(0); const [shield, setShield] = useState(false); const [slow, setSlow] = useState(false); const [double, setDouble] = useState(false); const [training, setTraining] = useState(true); const key = useRef(0);
  const target = useMemo(() => rounds[round] || [], [round]);
  const announce = useCallback(() => { const words = target.join(" and "); speakArcade(words, sound); }, [sound, target]);

  useEffect(() => { if (!training) announce(); }, [round, training, announce]);
  useEffect(() => {
    if (training) return;
    const keyboard = (event: KeyboardEvent) => { if (["ArrowLeft", "a", "A"].includes(event.key)) setTray((value) => Math.max(7, value - 8)); if (["ArrowRight", "d", "D"].includes(event.key)) setTray((value) => Math.min(93, value + 8)); };
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, [training]);
  useEffect(() => {
    if (training) return;
    const spawn = window.setInterval(() => {
      const pool = restaurantItems.filter((item) => item.difficulty <= (round > 1 ? 2 : 1));
      const isPower = Math.random() < 0.08;
      const item = target.some((id) => !caught.includes(id)) && Math.random() < 0.48 ? restaurantItems.find((value) => value.id === target.find((id) => !caught.includes(id)))! : pool[Math.floor(Math.random() * pool.length)];
      setFalling((items) => [...items.slice(-10), { key: key.current++, item, x: 8 + Math.random() * 84, y: -8, power: isPower ? shuffle(["double", "slow", "shield"] as const)[0] : undefined }]);
    }, Math.max(430, 820 - round * 110));
    return () => window.clearInterval(spawn);
  }, [training, round, target, caught]);
  useEffect(() => {
    if (training) return;
    const tick = window.setInterval(() => setFalling((items) => {
      const next: FallingItem[] = [];
      items.forEach((fall) => {
        const moved = { ...fall, y: fall.y + (slow ? 2.2 : 3.7 + round * 0.55) };
        if (moved.y >= 80 && moved.y <= 94 && Math.abs(moved.x - tray) < 12) {
          if (moved.power) { arcadeSound("power", sound); if (moved.power === "double") { setDouble(true); window.setTimeout(() => setDouble(false), 6000); } if (moved.power === "slow") { setSlow(true); window.setTimeout(() => setSlow(false), 5500); } if (moved.power === "shield") setShield(true); return; }
          setAttempts((value) => value + 1);
          if (target.includes(moved.item.id) && !caught.includes(moved.item.id)) { const nextCombo = combo + 1; setCombo(nextCombo); setBest((value) => Math.max(value, nextCombo)); setCorrect((value) => value + 1); setScore((value) => value + 100 * Math.max(1, nextCombo) * (double ? 2 : 1)); setCaught((value) => [...value, moved.item.id]); arcadeSound("correct", sound); }
          else if (shield) { setShield(false); arcadeSound("power", sound); } else { setCombo(0); arcadeSound("wrong", sound); }
          return;
        }
        if (moved.y < 105) next.push(moved);
      });
      return next;
    }), 90);
    return () => window.clearInterval(tick);
  }, [training, slow, round, tray, target, caught, combo, double, shield, sound]);
  useEffect(() => {
    if (training || !target.length || !target.every((id) => caught.includes(id))) return;
    const timer = window.setTimeout(() => { if (round === rounds.length - 1) onComplete({ stars: correct >= 6 ? 3 : correct >= 4 ? 2 : 1, score, correct, attempts, bestCombo: best }); else { setRound((value) => value + 1); setCaught([]); setFalling([]); } }, 700);
    return () => window.clearTimeout(timer);
  }, [caught, target, round, training, onComplete, score, correct, attempts, best]);

  if (training) return <section className="grid min-h-[600px] place-items-center text-center"><div><p className="text-sm font-black uppercase tracking-widest text-yellow-300">Quick tray training</p><h2 className="mt-3 font-heading text-4xl font-black">Listen. Spot. Catch.</h2><div className="mt-8 flex flex-wrap justify-center gap-4">{restaurantItems.slice(0, 6).map((item) => <button key={item.id} onClick={() => speakArcade(item.name, sound)} className="rounded-2xl bg-white p-4 text-slate-900 shadow-xl"><span className="block text-5xl">{item.emoji}</span><span className="mt-2 block font-black uppercase">{item.name}</span><span className="text-xs text-blue-600">🔊 Listen</span></button>)}</div><button onClick={() => setTraining(false)} className="mt-8 rounded-xl bg-yellow-400 px-8 py-4 font-black text-slate-950">READY FOR ORDERS</button></div></section>;
  return <section className="mx-auto max-w-5xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-yellow-300">Round {round + 1}/4 {round === 1 ? "· Audio only" : round === 3 ? "· Speed mode" : ""}</p><h2 className="font-heading text-2xl font-black">Catch: {round === 1 ? "Listen carefully" : target.join(" + ").toUpperCase()}</h2></div><button onClick={announce} className="rounded-xl bg-white/10 px-4 py-2 font-black">🔊 Replay</button><div className="font-black">Score {score} · 🔥 x{combo}</div></div><div onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); setTray(Math.max(7, Math.min(93, (event.clientX - box.left) / box.width * 100))); }} className="relative mt-4 h-[540px] overflow-hidden rounded-[2rem] border-4 border-amber-200 bg-[linear-gradient(#2563eb_0_18%,#f8fafc_18%_82%,#f59e0b_82%)] touch-none"><div className="absolute left-0 right-0 top-[18%] flex justify-around text-4xl opacity-50">💡　🍽️　💡　🍽️　💡</div>{falling.map((fall) => <div key={fall.key} className="absolute -translate-x-1/2 text-center" style={{ left: `${fall.x}%`, top: `${fall.y}%` }}><span className="block text-5xl drop-shadow-lg">{fall.power ? fall.power === "double" ? "⭐" : fall.power === "slow" ? "🕐" : "🛡️" : fall.item.emoji}</span>{round === 0 ? <span className="rounded bg-white px-1 text-xs font-black uppercase text-slate-900">{fall.item.name}</span> : null}</div>)}<div className="absolute bottom-3 -translate-x-1/2 transition-[left] duration-75" style={{ left: `${tray}%` }}><div className="text-center text-5xl">🧑‍🍳</div><div className={`h-5 w-28 rounded-[50%] border-4 ${shield ? "border-cyan-300 bg-cyan-100" : "border-slate-300 bg-slate-100"}`} /></div><div className="absolute bottom-3 left-3 rounded-xl bg-slate-900/80 px-3 py-2 text-xs font-black">{double ? "⭐ DOUBLE SCORE" : slow ? "🕐 SLOW TIME" : shield ? "🛡️ SHIELD" : "← MOVE TRAY →"}</div><div className="absolute right-3 top-3 rounded-xl bg-slate-900/80 px-3 py-2 text-sm font-black">{target.map((id) => <span key={id} className="ml-2">{id.toUpperCase()} {caught.includes(id) ? "✓" : "□"}</span>)}</div></div></section>;
}
