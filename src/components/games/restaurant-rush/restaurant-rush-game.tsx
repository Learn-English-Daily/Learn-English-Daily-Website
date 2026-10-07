"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arcadeSound } from "../lead-arcade/audio";
import type { ArcadeStageResult } from "../lead-arcade/types";
import { DinnerRush } from "./dinner-rush";
import { OrderBuilder } from "./order-builder";
import { OrderCatch } from "./order-catch";
import { RestaurantRolePlay } from "./restaurant-role-play";
import { RestaurantShell, Results, StageComplete, StageIntro } from "./restaurant-ui";
import { WaiterRush } from "./waiter-rush";

const intros = [
  { emoji: "🍔🍕🍟", purpose: "Listen fast, move your tray, catch the requested food, and dodge tricky distractors.", controls: "Mouse/touch moves the tray · ← → or A D" },
  { emoji: "🏃🍽️", purpose: "Listen to disappearing orders, collect the right dishes, and race them to the correct tables.", controls: "Tap food to collect · tap a table to serve" },
  { emoji: "🧩⚙️", purpose: "Catch moving words in the right order and build natural, polite restaurant requests.", controls: "Mouse or touch · Undo is available" },
  { emoji: "🎤🧑‍🍳", purpose: "Choose your own order, speak as a customer, then reverse roles and become the waiter.", controls: "Listen · choose · speak aloud · continue" },
  { emoji: "🔥🏆", purpose: "Handle a real-time dinner rush: listen, remember, collect, serve, and survive the boss order.", controls: "Mouse/touch · audio replay costs 25 points" }
];

function cleanName(value: string) { return value.trim().replace(/\s+/g, " ").slice(0, 24).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }

export function RestaurantRushGame() {
  const [nameInput, setNameInput] = useState(""); const [name, setName] = useState(""); const [stage, setStage] = useState(0); const [started, setStarted] = useState(false); const [sound, setSound] = useState(true); const [fullscreen, setFullscreen] = useState(false); const [results, setResults] = useState<ArcadeStageResult[]>([]); const [pending, setPending] = useState<ArcadeStageResult | null>(null);
  function reset(keepName: boolean) { window.speechSynthesis?.cancel(); setStage(0); setStarted(false); setResults([]); setPending(null); if (!keepName) { setName(""); setNameInput(""); } }
  function complete(result: ArcadeStageResult) { setPending(result); arcadeSound("complete", sound); }
  function next() { if (!pending) return; setResults((value) => [...value, pending]); setPending(null); setStage((value) => value + 1); setStarted(false); }
  async function toggleFullscreen() { const shell = document.getElementById("restaurant-rush-shell"); if (!document.fullscreenElement) await shell?.requestFullscreen(); else await document.exitFullscreen(); setFullscreen(Boolean(document.fullscreenElement)); }
  if (!name) return <StartScreen value={nameInput} onChange={setNameInput} onStart={() => { const value = cleanName(nameInput); if (value) setName(value); }} sound={sound} onSound={() => setSound((value) => !value)} />;
  const stars = results.reduce((sum, result) => sum + result.stars, 0) + (pending?.stars || 0);
  return <RestaurantShell name={name} stage={stage} stars={stars} sound={sound} fullscreen={fullscreen} onSound={() => setSound((value) => !value)} onFullscreen={toggleFullscreen} onChangeStudent={() => reset(false)}>{stage >= 5 ? <Results name={name} results={results} onReplay={() => reset(true)} onChange={() => reset(false)} /> : !started ? <StageIntro stage={stage} {...intros[stage]} onStart={() => setStarted(true)} /> : <>{stage === 0 ? <OrderCatch sound={sound} onComplete={complete} /> : null}{stage === 1 ? <WaiterRush sound={sound} onComplete={complete} /> : null}{stage === 2 ? <OrderBuilder sound={sound} onComplete={complete} /> : null}{stage === 3 ? <RestaurantRolePlay sound={sound} onComplete={complete} /> : null}{stage === 4 ? <DinnerRush sound={sound} onComplete={complete} /> : null}{pending ? <StageComplete result={pending} stage={stage} onContinue={next} /> : null}</>}</RestaurantShell>;
}

function StartScreen({ value, onChange, onStart, sound, onSound }: { value: string; onChange: (value: string) => void; onStart: () => void; sound: boolean; onSound: () => void }) {
  const valid = Boolean(value.trim());
  return <section className="relative min-h-[720px] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_20%_15%,#2563eb,#0f172a_55%,#020617)] p-6 text-white shadow-2xl sm:p-10"><div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:30px_30px]" /><div className="absolute bottom-0 left-0 right-0 h-36 bg-[linear-gradient(#7c2d12,#451a03)]" /><div className="relative mx-auto grid min-h-[640px] max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-sm font-black uppercase tracking-[.28em] text-yellow-300">LEAD · Learn English Daily presents</p><h1 className="mt-5 font-heading text-6xl font-black leading-[.88] sm:text-8xl">RESTAURANT<br /><span className="text-yellow-300">RUSH</span></h1><p className="mt-5 text-2xl font-black text-blue-100">Order. Serve. Speak. Become a Restaurant Star!</p><p className="mt-4 max-w-xl text-lg font-bold">Tonight is the biggest dinner rush of the year. Can you handle five wild shifts?</p><div className="mt-8 text-6xl">🍔 🍕 🧃 🍟 🍨</div></div><div className="rounded-[2rem] border border-white/20 bg-white p-6 text-slate-900 shadow-2xl"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-yellow-100 text-6xl">🧑‍🍳</div><label htmlFor="restaurant-student" className="mt-5 block font-heading text-xl font-black">What&apos;s your name?</label><input id="restaurant-student" autoFocus maxLength={24} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Enter your name" className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" /><Button onClick={onStart} disabled={!valid} className="mt-4 h-14 w-full bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300"><Play className="h-5 w-5" /> START SHIFT</Button><button onClick={onSound} className="focus-ring mt-3 w-full rounded-xl px-4 py-3 text-sm font-black text-blue-700">{sound ? "🔊 SOUND ON" : "🔇 SOUND OFF"}</button><p className="mt-4 text-center text-xs font-bold text-slate-500">Speak English with Confidence</p></div></div></section>;
}
