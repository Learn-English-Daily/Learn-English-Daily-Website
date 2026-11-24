"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Maximize, Pause, Play, RotateCcw, UserRound, Volume2, VolumeX } from "lucide-react";
import { arcadeSound } from "../lead-arcade/audio";
import type { ArcadeStageResult } from "../lead-arcade/types";
import { CalendarSlice, DateFactory, TimeRunner } from "./calendar-stages-one";
import { CalendarChaos, EventPlanner } from "./calendar-stages-two";
import { formatGameDate, levels, months, ordinalWord, weekdays } from "./calendar-data";

const stageNames = ["Calendar Slice", "Time Runner", "Date Factory", "My Event Planner", "Calendar Chaos"];
const phases = ["DISCOVER", "PLAY", "BUILD", "SPEAK", "MASTER"];
const intros = [
  ["🥷📅", "Slice days, months, and ordinals", "Swipe across the correct flying cards. Build combos without losing the game for a mistake."],
  ["🏃🏽⏰", "Race through the answer gates", "Listen or read the mission, steer with arrows, A/D, or a mobile swipe, and enter the correct lane."],
  ["🏭🗓️", "Pack perfect date sentences", "Catch word crates from a moving belt and assemble each sentence before it reaches packing."],
  ["🗓️🎂", "Plan a real calendar month", "Add birthdays, classes, school events, and appointments. Move the appointment and complete speaking practice."],
  ["🦉💎", "Defeat Calendar Chaos", "Repair five clock mechanisms and reconstruct the missing calendar to unlock the Time Crystal."]
];
const primary = "focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-40";
const secondary = "focus-ring inline-flex items-center justify-center gap-2 rounded-xl border-2 border-blue-200 bg-white px-4 py-3 font-black text-slate-900 shadow-sm hover:border-blue-500";
const saveKey = "lead-calendar-quest-v1";

type SavedGame = { name: string; level: number; stage: number; results: ArcadeStageResult[] };

export function CalendarQuestGame() {
  const [activeDate, setActiveDate] = useState<Date | null>(null);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState(0);
  const [stage, setStage] = useState(0);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(true);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<ArcadeStageResult[]>([]);
  const [pending, setPending] = useState<ArcadeStageResult | null>(null);
  const [saved, setSaved] = useState<SavedGame | null>(null);

  useEffect(() => {
    setActiveDate(new Date());
    try {
      const raw = window.localStorage.getItem(saveKey);
      if (raw) setSaved(JSON.parse(raw) as SavedGame);
    } catch { /* Local progress is optional. */ }
  }, []);

  useEffect(() => {
    if (!name || stage >= 5) return;
    try { window.localStorage.setItem(saveKey, JSON.stringify({ name, level, stage, results })); } catch { /* Local progress is optional. */ }
  }, [level, name, results, stage]);

  function complete(result: ArcadeStageResult) { setPending(result); arcadeSound("complete", sound); }
  function next() {
    if (!pending) return;
    setResults((items) => [...items, pending]); setPending(null); setStage((value) => value + 1); setStarted(false); setPaused(false);
  }
  function reset(keepStudent: boolean) {
    window.speechSynthesis?.cancel(); setStage(0); setStarted(false); setPaused(false); setResults([]); setPending(null); setSaved(null);
    try { window.localStorage.removeItem(saveKey); } catch { /* Optional storage. */ }
    if (!keepStudent) { setName(""); setInput(""); }
  }
  async function fullscreen() {
    const shell = document.getElementById("calendar-quest-shell");
    if (document.fullscreenElement) await document.exitFullscreen(); else await shell?.requestFullscreen();
  }

  if (!activeDate) return <div className="grid min-h-[32rem] place-items-center rounded-3xl bg-blue-950 text-xl font-black text-white">Loading the magical calendar…</div>;

  if (!name) return <section id="calendar-quest-shell" className="relative overflow-hidden rounded-[2rem] border-4 border-blue-200 bg-gradient-to-br from-sky-100 via-white to-yellow-100 p-5 text-slate-950 shadow-2xl sm:p-8">
    <div className="absolute -right-20 -top-20 h-64 w-64 animate-spin rounded-full border-[22px] border-dashed border-blue-300/40 [animation-duration:18s]" />
    <header className="relative flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Image src="/images/brand-icon-cropped.png" alt="LEAD logo" width={58} height={58} className="rounded-xl"/><div><p className="font-black text-blue-700">LEAD · Learn English Daily</p><p className="text-sm font-bold">Speak English with Confidence</p></div></div><div className="flex gap-2"><button className={secondary} onClick={() => setSound((value) => !value)}>{sound ? <Volume2 className="h-4 w-4"/> : <VolumeX className="h-4 w-4"/>} Sound</button><button className={secondary} onClick={() => void fullscreen()}><Maximize className="h-4 w-4"/> Fullscreen</button></div></header>
    <div className="relative mt-8 grid gap-7 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
      <div><p className="text-xs font-black uppercase tracking-[.22em] text-blue-700">Lesson 17 · Day and Date</p><h1 className="mt-3 font-heading text-4xl font-black leading-tight text-blue-950 sm:text-6xl">Calendar Quest:<br/><span className="text-blue-600">Race Against Time!</span></h1><p className="mt-3 text-xl font-black text-amber-600">Every day is an adventure!</p><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">Oops! The magical calendar is broken! Days and dates are flying everywhere. Help Wisey restore the calendar before time runs out!</p><div className="mt-5 rounded-2xl border border-blue-200 bg-white p-4"><p className="text-xs font-black uppercase text-blue-700">Active game date</p><p className="mt-1 text-xl font-black">{weekdays[activeDate.getDay()]}, {formatGameDate(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate())}</p><p className="text-sm text-slate-600">Day: {weekdays[activeDate.getDay()]} · Month: {months[activeDate.getMonth()]} · Ordinal: {ordinalWord(activeDate.getDate())}</p></div></div>
      <div className="relative min-h-[23rem] rounded-[3rem] border-4 border-white bg-gradient-to-b from-blue-500 to-blue-800 p-6 shadow-2xl"><div className="absolute left-8 top-8 animate-bounce text-8xl">🗓️</div><div className="absolute right-8 top-16 animate-pulse text-8xl">⏰</div><div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-8xl">🦉</div><div className="absolute inset-x-8 top-44 rounded-2xl bg-white/95 p-4 text-center font-black text-blue-950 shadow-xl">“Ready, Calendar Hero?”</div></div>
    </div>
    <form className="relative mt-7 grid gap-4 rounded-3xl border-2 border-blue-100 bg-white p-5 lg:grid-cols-[1fr_1fr_auto] lg:items-end" onSubmit={(event) => { event.preventDefault(); const clean = input.trim().replace(/\s+/g, " ").slice(0, 40); if (clean) { setName(clean); setStarted(false); } }}><label className="grid gap-2 font-black">Student name<input required maxLength={40} value={input} onChange={(event) => setInput(event.target.value)} className="focus-ring rounded-xl border-2 border-blue-200 px-4 py-3" placeholder="Enter your name"/></label><label className="grid gap-2 font-black">English level<select value={level} onChange={(event) => setLevel(Number(event.target.value))} className="focus-ring rounded-xl border-2 border-blue-200 bg-white px-4 py-3">{levels.map((item, index) => <option key={item} value={index}>{item}</option>)}</select></label><button className={primary}>Play Calendar Quest</button></form>
    {saved && <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-4"><p className="font-bold">Saved adventure: {saved.name} · {levels[saved.level]} · Stage {Math.min(5, saved.stage + 1)}</p><button className={secondary} onClick={() => { setName(saved.name); setInput(saved.name); setLevel(saved.level); setStage(saved.stage); setResults(saved.results || []); }}>Resume saved game</button></div>}
    <details className="relative mt-4 rounded-2xl bg-blue-50 p-4"><summary className="cursor-pointer font-black text-blue-800">How to Play</summary><p className="mt-2 leading-7">Complete five different arcade stages. Swipe and tap, steer with keyboard or touch, build sentences on a moving belt, plan real calendar events, and defeat the clock tower. Earn up to 15 stars. Mistakes give feedback and never abruptly end the adventure.</p></details>
  </section>;

  const totalStars = results.reduce((sum, item) => sum + item.stars, 0) + (pending?.stars || 0);
  const stageProps = { level, sound, activeDate, onComplete: complete };
  return <section id="calendar-quest-shell" className="min-h-[42rem] overflow-auto rounded-[2rem] border-4 border-blue-200 bg-gradient-to-br from-sky-100 via-white to-yellow-100 p-4 text-slate-950 shadow-2xl sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Image src="/images/brand-icon-cropped.png" alt="LEAD logo" width={46} height={46} className="rounded-lg"/><div><p className="font-black text-blue-800">Calendar Quest</p><p className="text-sm font-bold">{name} · {levels[level]}</p></div></div><div className="flex flex-wrap gap-2"><span className="rounded-xl bg-yellow-300 px-4 py-3 font-black">⭐ {totalStars}/15</span><button className={secondary} onClick={() => setSound((value) => !value)}>{sound ? <Volume2 className="h-4 w-4"/> : <VolumeX className="h-4 w-4"/>}</button><button className={secondary} onClick={() => void fullscreen()}><Maximize className="h-4 w-4"/></button>{stage < 5 && <button className={secondary} onClick={() => setPaused((value) => !value)}>{paused ? <Play className="h-4 w-4"/> : <Pause className="h-4 w-4"/>}</button>}</div></header>
    <nav className="mt-5 grid grid-cols-5 gap-1 sm:gap-2">{stageNames.map((title, index) => <div key={title} className={`rounded-xl border p-2 text-center ${index < stage ? "border-emerald-300 bg-emerald-50" : index === stage ? "border-blue-500 bg-blue-100 ring-2 ring-blue-300" : "border-slate-200 bg-white/60 opacity-60"}`}><p className="text-[9px] font-black uppercase text-blue-700 sm:text-xs">{phases[index]}</p><p className="hidden text-xs font-bold sm:block">{title}</p><p>{results[index] ? "⭐".repeat(results[index].stars) : index < stage ? "✓" : "○"}</p></div>)}</nav>
    {stage >= 5 ? <section className="mt-6 rounded-[2.5rem] border-4 border-yellow-300 bg-gradient-to-br from-blue-950 to-indigo-900 p-7 text-center text-white"><div className="text-8xl">🏆🗓️💎</div><p className="mt-4 text-sm font-black uppercase tracking-[.25em] text-yellow-300">LEAD Calendar Hero Certificate</p><h2 className="mt-3 font-heading text-4xl font-black sm:text-6xl">Time restored, {name}!</h2><p className="mt-3 text-blue-100">You mastered days, months, ordinals, dates, schedules, and calendar expressions.</p><div className="mt-6 grid grid-cols-5 gap-2">{stageNames.map((title, index) => <div key={title} className="rounded-xl bg-white/10 p-3"><p className="text-[10px] font-black uppercase text-cyan-200">{phases[index]}</p><p className="mt-2">{"⭐".repeat(results[index]?.stars || 0)}</p></div>)}</div><p className="mt-7 font-heading text-4xl font-black text-yellow-300">{results.reduce((sum, item) => sum + item.stars, 0)}/15 stars</p><p className="mt-2 font-bold">{levels[level]} · Completed {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(activeDate)}</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button className={primary} onClick={() => reset(true)}><RotateCcw className="h-4 w-4"/> Play again</button><button className={secondary} onClick={() => reset(false)}><UserRound className="h-4 w-4"/> Change student</button></div></section> : <div className="relative mt-6">
      {!started ? <section className="grid min-h-[32rem] place-items-center rounded-3xl border-4 border-blue-200 bg-gradient-to-br from-blue-800 to-indigo-950 p-6 text-center text-white"><div className="max-w-2xl"><div className="text-8xl">{intros[stage][0]}</div><p className="mt-5 text-xs font-black uppercase tracking-[.25em] text-yellow-300">Stage {stage + 1} · {phases[stage]}</p><h2 className="mt-2 font-heading text-4xl font-black sm:text-5xl">{intros[stage][1]}</h2><p className="mt-4 text-lg leading-8 text-blue-100">{intros[stage][2]}</p><button className={`${primary} mt-7`} onClick={() => { setStarted(true); setPaused(false); }}>Start {stageNames[stage]}</button></div></section> : paused ? <div className="grid min-h-[32rem] place-items-center rounded-3xl bg-blue-950 text-center text-white"><div><Pause className="mx-auto h-14 w-14"/><h2 className="mt-3 text-3xl font-black">Game paused</h2><button className={`${primary} mt-5`} onClick={() => setPaused(false)}>Resume stage</button></div></div> : <>{stage === 0 && <CalendarSlice {...stageProps}/>} {stage === 1 && <TimeRunner {...stageProps}/>} {stage === 2 && <DateFactory {...stageProps}/>} {stage === 3 && <EventPlanner {...stageProps}/>} {stage === 4 && <CalendarChaos {...stageProps}/>}</>}
      {pending && <div className="absolute inset-0 z-50 grid min-h-[32rem] place-items-center rounded-3xl bg-blue-950/95 p-5"><div className="w-full max-w-lg rounded-3xl border-4 border-yellow-300 bg-white p-7 text-center text-slate-950"><div className="text-5xl">{[0,1,2].map((value) => <span key={value} className={value < pending.stars ? "" : "grayscale opacity-20"}>⭐</span>)}</div><p className="mt-4 text-xs font-black uppercase tracking-widest text-blue-700">Stage restored</p><h2 className="mt-2 font-heading text-3xl font-black">{stageNames[stage]} complete!</h2><p className="mt-3 font-bold text-slate-600">Score {pending.score} · {pending.correct}/{pending.attempts} successful actions</p><button className={`${primary} mt-6 w-full`} onClick={next}>{stage === 4 ? "Open Calendar Hero certificate" : "Continue adventure"}</button></div></div>}
    </div>}
  </section>;
}

