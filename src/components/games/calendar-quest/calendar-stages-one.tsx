"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { arcadeSound, speakArcade } from "../lead-arcade/audio";
import { factoryRounds, runnerMissions, sliceMissions } from "./calendar-data";
import type { CalendarStageProps } from "./calendar-types";

const primary = "focus-ring rounded-xl bg-blue-700 px-4 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-40";
const secondary = "focus-ring rounded-xl border-2 border-blue-200 bg-white px-4 py-3 font-black text-slate-900 shadow-sm hover:border-blue-500 disabled:opacity-40";

function result(correct: number, attempts: number, combo: number, bonus = 0) {
  const ratio = correct / Math.max(1, attempts);
  return { stars: ratio >= .82 ? 3 : ratio >= .55 ? 2 : 1, score: correct * 180 + combo * 60 + bonus, correct, attempts, bestCombo: combo };
}

export function CalendarSlice({ level, sound, onComplete }: CalendarStageProps) {
  const missions = sliceMissions[level];
  const [round, setRound] = useState(0);
  const [sliced, setSliced] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("Hold and swipe across a flying card — or tap it.");
  const dragging = useRef(false);
  const mission = missions[round];
  const targets = mission.answer.split("|");

  function slice(value: string) {
    if (sliced.includes(value)) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (!targets.includes(value)) {
      setCombo(0);
      setMessage(`${value} does not match this clue. Keep slicing!`);
      arcadeSound("wrong", sound);
      return;
    }
    const nextSliced = [...sliced, value];
    const nextCorrect = correct + 1;
    const nextCombo = combo + 1;
    setSliced(nextSliced);
    setCorrect(nextCorrect);
    setCombo(nextCombo);
    setBest((valueBest) => Math.max(valueBest, nextCombo));
    setMessage(`Slice! ${value} is correct. Combo ×${nextCombo}`);
    arcadeSound("correct", sound);
    if (targets.every((target) => nextSliced.includes(target))) {
      window.setTimeout(() => {
        if (round === missions.length - 1) onComplete(result(nextCorrect, nextAttempts, Math.max(best, nextCombo), nextCombo * 25));
        else { setRound((valueRound) => valueRound + 1); setSliced([]); setMessage("New calendar wave incoming!"); }
      }, 650);
    }
  }

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-yellow-300 p-4 text-slate-950"><div><p className="text-xs font-black uppercase tracking-widest">Calendar Slice · Wave {round + 1}/{missions.length}</p><h3 className="mt-1 text-xl font-black sm:text-2xl">{mission.prompt}</h3></div><p className="rounded-full bg-white/80 px-3 py-2 font-black">Combo ×{combo}</p></div>
    <div className="relative h-[23rem] touch-none overflow-hidden rounded-3xl border-4 border-blue-200 bg-gradient-to-b from-sky-300 via-blue-100 to-yellow-100 shadow-inner" onPointerDown={() => { dragging.current = true; }} onPointerUp={() => { dragging.current = false; }} onPointerLeave={() => { dragging.current = false; }}>
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#1d4ed8 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      {mission.choices.map((choice, index) => {
        const cut = sliced.includes(choice);
        return <button key={`${round}-${choice}`} disabled={cut} onPointerEnter={() => { if (dragging.current) slice(choice); }} onClick={() => slice(choice)} className={`focus-ring absolute grid h-24 w-32 place-items-center rounded-[2rem] border-4 border-white bg-white/95 p-2 text-center text-lg font-black text-blue-900 shadow-xl transition duration-300 hover:scale-110 active:scale-75 ${cut ? "scale-150 rotate-12 opacity-0" : "animate-bounce"}`} style={{ left: `${[8, 56, 18, 62][index]}%`, top: `${[14, 8, 58, 56][index]}%`, animationDelay: `${index * 170}ms`, animationDuration: `${1.7 + index * .18}s` }}><span className="text-2xl">{choice.match(/^\d/) ? "📅" : choice.endsWith("day") ? "☀️" : "🗓️"}</span>{choice}</button>;
      })}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-950/80 px-4 py-2 text-sm font-bold text-white">Swipe trail ✨ · Tap fallback enabled</div>
    </div>
    <p role="status" className="min-h-6 font-bold text-blue-800">{message}</p>
  </section>;
}

export function TimeRunner({ level, sound, onComplete }: CalendarStageProps) {
  const missions = runnerMissions[level];
  const [round, setRound] = useState(0);
  const [lane, setLane] = useState(1);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [slow, setSlow] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [message, setMessage] = useState("Choose a lane before the answer gates arrive.");
  const touchX = useRef(0);
  const mission = missions[round];

  function steer(direction: number) { setLane((value) => Math.max(0, Math.min(2, value + direction))); }
  function evaluate() {
    const nextAttempts = attempts + 1;
    const okay = mission.choices[lane] === mission.answer;
    const nextCorrect = correct + Number(okay);
    const nextCombo = okay ? combo + 1 : 0;
    setAttempts(nextAttempts); setCorrect(nextCorrect); setCombo(nextCombo); setBest((value) => Math.max(value, nextCombo));
    setRunning(false); setProgress(0);
    setMessage(okay ? `Perfect lane! ${mission.answer}` : `The correct gate was ${mission.answer}. Replay the clue and keep racing.`);
    arcadeSound(okay ? "correct" : "wrong", sound);
    window.setTimeout(() => {
      if (round === missions.length - 1) onComplete(result(nextCorrect, nextAttempts, Math.max(best, nextCombo), slow ? 0 : 100));
      else { setRound((value) => value + 1); setLane(1); setMessage("Next mission loaded. Listen, choose, then run!"); }
    }, 900);
  }

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (!["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key)) return;
      event.preventDefault();
      steer(event.key === "ArrowLeft" || event.key === "a" ? -1 : 1);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setProgress((value) => Math.min(100, value + (slow ? 1.2 : 2))), 80);
    return () => window.clearInterval(timer);
  }, [running, slow]);
  useEffect(() => { if (running && progress >= 100) evaluate(); });

  return <section className="space-y-4">
    <div className="rounded-2xl bg-blue-950 p-4 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-yellow-300">Time Runner · Gate {round + 1}/{missions.length}</p><h3 className="mt-1 text-xl font-black">{mission.prompt}</h3></div><div className="flex gap-2"><button className={secondary} onClick={() => speakArcade(mission.prompt, sound)}>🔊 Play audio</button><button className={secondary} onClick={() => setSlow((value) => !value)}>{slow ? "Normal speed" : "Slower mode"}</button></div></div><details className="mt-3"><summary className="cursor-pointer font-bold text-sky-200">Transcript</summary><p className="mt-2">{mission.prompt}</p></details></div>
    <div className="relative h-[25rem] touch-none overflow-hidden rounded-3xl bg-gradient-to-b from-sky-400 via-purple-200 to-blue-900" onPointerDown={(event) => { touchX.current = event.clientX; }} onPointerUp={(event) => { const distance = event.clientX - touchX.current; if (Math.abs(distance) > 24) steer(distance > 0 ? 1 : -1); }}>
      <div className="absolute inset-x-[8%] bottom-0 top-0 bg-slate-700 [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]" />
      <div className="absolute inset-0 opacity-60" style={{ background: "repeating-linear-gradient(0deg, transparent 0 45px, #fff 46px 49px)", clipPath: "polygon(45% 0,55% 0,96% 100%,4% 100%)", backgroundPositionY: progress * 2 }} />
      <div className="absolute inset-x-0 flex justify-around transition-all" style={{ top: `${12 + progress * .55}%`, transform: `scale(${.55 + progress / 220})` }}>{mission.choices.map((choice, index) => <div key={choice} className={`w-[30%] rounded-2xl border-4 p-3 text-center font-black shadow-xl ${index === lane ? "border-yellow-300 bg-yellow-200 text-slate-950" : "border-white bg-white/90 text-blue-950"}`}>{choice}</div>)}</div>
      <div className="absolute bottom-5 text-5xl transition-[left] duration-150" style={{ left: `${[16, 50, 84][lane]}%`, transform: "translateX(-50%)" }}>🏃🏽</div>
      <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-2 font-black text-blue-900">{Math.round(progress)}% · ×{combo || 1}</div>
    </div>
    <div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => steer(-1)}>Left</button><button className={primary} disabled={running} onClick={() => { setRunning(true); setMessage("Run! You can still change lanes."); }}>{running ? "Running…" : "Start gate run"}</button><button className={secondary} onClick={() => steer(1)}>Right</button><button className={secondary} onClick={() => { setRunning(false); setProgress(0); setLane(1); }}>Restart gate</button></div>
    <p role="status" className="font-bold text-blue-800">{message}</p>
  </section>;
}

export function DateFactory({ level, sound, onComplete }: CalendarStageProps) {
  const rounds = level === 0 ? factoryRounds.slice(0, 3) : level === 1 ? factoryRounds.slice(1, 5) : factoryRounds.slice(2, 6);
  const [round, setRound] = useState(0);
  const [built, setBuilt] = useState<string[]>([]);
  const [belt, setBelt] = useState(0);
  const [running, setRunning] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [message, setMessage] = useState("Tap the word crates in sentence order before they reach packing.");
  const task = rounds[round];
  const tiles = useMemo(() => [...task.words, ...task.distractors].map((word, index) => ({ word, id: `${word}-${index}` })).sort((a, b) => a.id.localeCompare(b.id) * (round % 2 ? -1 : 1)), [round, task]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setBelt((value) => Math.min(100, value + 1)), level === 0 ? 180 : level === 1 ? 140 : 110);
    return () => window.clearInterval(timer);
  }, [level, running]);
  useEffect(() => {
    if (belt < 100 || !running) return;
    setAttempts((value) => value + 1); setBuilt([]); setBelt(0); setMessage("The crate reached packing unfinished — the belt restarted."); arcadeSound("wrong", sound);
  }, [belt, running, sound]);

  function choose(word: string) {
    if (!running) return;
    const expected = task.words[built.length];
    if (word.replace(/[.!?]/g, "").toLowerCase() !== expected?.replace(/[.!?]/g, "").toLowerCase()) {
      setAttempts((value) => value + 1); setBuilt([]); setMessage("That block does not come next. The sentence returned to the loading bay."); arcadeSound("wrong", sound); return;
    }
    const next = [...built, word]; setBuilt(next); arcadeSound("correct", sound);
    if (next.length === task.words.length) {
      const nextCorrect = correct + 1; const nextAttempts = attempts + 1;
      setCorrect(nextCorrect); setAttempts(nextAttempts); setRunning(false); setMessage("Packed perfectly!"); speakArcade(task.words.join(" "), sound);
      window.setTimeout(() => {
        if (round === rounds.length - 1) onComplete(result(nextCorrect, nextAttempts, nextCorrect, Math.round(100 - belt)));
        else { setRound((value) => value + 1); setBuilt([]); setBelt(0); setRunning(true); setMessage("New sentence order entering the factory!"); }
      }, 900);
    }
  }

  return <section className="space-y-4">
    <div className="rounded-2xl bg-orange-100 p-4"><p className="text-xs font-black uppercase tracking-widest text-orange-700">Date Factory · Order {round + 1}/{rounds.length}</p><h3 className="mt-1 text-2xl font-black text-slate-950">{task.prompt}</h3></div>
    <div className="overflow-hidden rounded-3xl border-4 border-slate-700 bg-slate-900 p-4 text-white">
      <div className="flex items-center justify-between"><p className="font-black text-yellow-300">LOADING BAY</p><p className="font-black">PACKING {Math.round(belt)}%</p></div>
      <div className="relative mt-3 h-44 overflow-hidden rounded-2xl bg-slate-700"><div className="absolute inset-x-0 bottom-5 h-10 bg-[repeating-linear-gradient(90deg,#475569_0_28px,#94a3b8_29px_34px)]" style={{ backgroundPositionX: belt * 4 }} />{tiles.map((tile, index) => <button key={`${round}-${tile.id}`} onClick={() => choose(tile.word)} className="focus-ring absolute top-10 rounded-xl border-b-8 border-amber-800 bg-yellow-300 px-4 py-3 font-black text-slate-950 shadow-lg transition hover:-translate-y-2" style={{ left: `${(index * 19 + belt * .55) % 104 - 8}%` }}>{tile.word}</button>)}</div>
      <div className="mt-4 min-h-16 rounded-xl border-2 border-dashed border-sky-300 bg-slate-800 p-3 text-xl font-black"><span className="text-sky-300">Sentence:</span> {built.join(" ") || "…"}</div>
    </div>
    <div className="flex gap-2"><button className={secondary} onClick={() => { setBuilt([]); setAttempts((value) => value + 1); }}>Clear sentence</button><button className={secondary} onClick={() => setRunning((value) => !value)}>{running ? "Pause belt" : "Resume belt"}</button></div>
    <p role="status" className="font-bold text-blue-800">{message}</p>
  </section>;
}

