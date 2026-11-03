"use client";

import { useState } from "react";
import { Maximize2, Minimize2, Play, RotateCcw, UserRound, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arcadeSound } from "../lead-arcade/audio";
import type { ArcadeStageResult } from "../lead-arcade/types";
import { MemoryDirector, PastBingo, PastBowling, StoryTrain, VerbNinja } from "./challenges";
import { stageNames } from "./game-data";

const intros = [
  { emoji: "🎳⚡", title: "PAST-TENSE BOWLING", purpose: "Control your aim and knock down the pin carrying the correct past form.", controls: "Watch the moving red marker and press BOWL or Space at exactly the right moment. Wrong pins cost a heart." },
  { emoji: "🥷🔊", title: "FUTURE-TO-PAST NINJA", purpose: "Listen to a complete future sentence, transform its meaning, and slice the matching complete past sentence.", controls: "The speaker describes tomorrow. Listen carefully, then choose what happened yesterday before the timer ends." },
  { emoji: "🎯🏆", title: "PAST TENSE BINGO", purpose: "Listen to activity clues and mark the matching past-tense actions until you complete a line.", controls: "Press Call activity, listen carefully, then mark the matching square. Wrong squares cost a heart." },
  { emoji: "🚂📖", title: "STORY TRAIN", purpose: "Repair three scrambled trains by connecting past events from first to finally.", controls: "Tap the event cars in story order. A wrong car sends the train back to the station." },
  { emoji: "🎬🧠", title: "MEMORY DIRECTOR", purpose: "Direct your own past-activity movie, then survive an expanding Simon-style memory sequence.", controls: "Choose four scenes, watch the director's sequence, and replay it from memory." }
];

export function PastActivitiesGame() {
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [stage, setStage] = useState(0);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [results, setResults] = useState<ArcadeStageResult[]>([]);
  const [pending, setPending] = useState<ArcadeStageResult | null>(null);

  function reset(keepName: boolean) {
    window.speechSynthesis?.cancel();
    setStage(0); setStarted(false); setResults([]); setPending(null);
    if (!keepName) { setName(""); setInput(""); }
  }
  function complete(result: ArcadeStageResult) { setPending(result); arcadeSound("complete", sound); }
  function next() { if (!pending) return; setResults((value) => [...value, pending]); setPending(null); setStage((value) => value + 1); setStarted(false); }
  async function toggleFullscreen() {
    const shell = document.getElementById("past-activities-shell");
    if (!document.fullscreenElement) await shell?.requestFullscreen(); else await document.exitFullscreen();
    setFullscreen(Boolean(document.fullscreenElement));
  }

  if (!name) return <Start value={input} onChange={setInput} onStart={() => input.trim() && setName(input.trim().slice(0, 24))} sound={sound} onSound={() => setSound((value) => !value)} />;
  const stars = results.reduce((sum, result) => sum + result.stars, 0) + (pending?.stars || 0);
  return <div id="past-activities-shell" className="overflow-hidden rounded-[2rem] border border-violet-200 bg-[#15143b] text-white shadow-2xl fullscreen:rounded-none">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#312e81]/95 px-4 py-3 sm:px-6"><div><p className="text-xs font-black uppercase tracking-[.2em] text-yellow-300">LEAD · Past Activities Arcade</p><p className="text-sm font-bold text-violet-100">{name} · {stage < 5 ? `Game ${stage + 1}/5` : "Past-tense champion"}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-yellow-300 px-3 py-1.5 text-sm font-black text-slate-950">⭐ {stars}/15</span><Icon label="Sound" onClick={() => setSound((value) => !value)}>{sound ? <Volume2 /> : <VolumeX />}</Icon><Icon label="Fullscreen" onClick={toggleFullscreen}>{fullscreen ? <Minimize2 /> : <Maximize2 />}</Icon><Icon label="Change student" onClick={() => reset(false)}><UserRound /></Icon></div></header>
    <div className="grid grid-cols-5 border-b border-white/10 bg-white/5">{stageNames.map((title, index) => <div key={title} className={`px-1 py-2 text-center text-[10px] font-black uppercase sm:text-xs ${index <= stage ? "text-yellow-300" : "text-slate-500"}`}><span className={`mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full ${index < stage ? "bg-emerald-500" : index === stage ? "bg-yellow-300 text-slate-950" : "bg-slate-700"}`}>{index < stage ? "✓" : index + 1}</span><span className="hidden sm:inline">{title}</span></div>)}</div>
    <main className="relative min-h-[650px] overflow-hidden p-4 sm:p-6">{stage >= 5 ? <Results name={name} results={results} onReplay={() => reset(true)} onChange={() => reset(false)} /> : !started ? <Intro number={stage + 1} {...intros[stage]} onStart={() => setStarted(true)} /> : <>{stage === 0 ? <PastBowling sound={sound} onComplete={complete} /> : null}{stage === 1 ? <VerbNinja sound={sound} onComplete={complete} /> : null}{stage === 2 ? <PastBingo sound={sound} onComplete={complete} /> : null}{stage === 3 ? <StoryTrain sound={sound} onComplete={complete} /> : null}{stage === 4 ? <MemoryDirector name={name} sound={sound} onComplete={complete} /> : null}{pending ? <Complete result={pending} title={stageNames[stage]} onContinue={next} /> : null}</>}</main>
  </div>;
}

function Start({ value, onChange, onStart, sound, onSound }: { value: string; onChange: (value: string) => void; onStart: () => void; sound: boolean; onSound: () => void }) {
  return <section className="relative min-h-[720px] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_20%_15%,#7c3aed,#312e81_48%,#111827)] p-6 text-white shadow-2xl sm:p-10"><div className="absolute right-[7%] top-[7%] text-9xl opacity-25">🕰️</div><div className="relative mx-auto grid min-h-[640px] max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-sm font-black uppercase tracking-[.28em] text-yellow-300">LEAD · Learn English Daily presents</p><h1 className="mt-5 font-heading text-6xl font-black leading-[.88] sm:text-8xl">PAST ACTIVITIES<br /><span className="text-yellow-300">ARCADE</span></h1><p className="mt-5 text-2xl font-black text-violet-100">Move. Slice. Bingo. Build. Remember!</p><p className="mt-4 max-w-xl text-lg font-bold">Five different challenges for regular and irregular Simple Past verbs.</p><div className="mt-8 text-6xl">🗺️ 🥷 🎯 🚂 🎬</div></div><div className="rounded-[2rem] border border-white/20 bg-white p-6 text-slate-900 shadow-2xl"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-violet-100 text-6xl">🦉</div><label htmlFor="past-student" className="mt-5 block font-heading text-xl font-black">Time traveler, what&apos;s your name?</label><input id="past-student" autoFocus maxLength={24} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && value.trim() && onStart()} placeholder="Enter your name" className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-violet-100 px-4 text-lg font-bold" /><Button onClick={onStart} disabled={!value.trim()} className="mt-4 h-14 w-full bg-yellow-300 font-black text-slate-950 hover:bg-yellow-200"><Play className="h-5 w-5" />START TIME MACHINE</Button><button onClick={onSound} className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-black text-violet-700">{sound ? "🔊 SOUND ON" : "🔇 SOUND OFF"}</button></div></div></section>;
}
function Icon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button aria-label={label} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20 [&_svg]:h-4 [&_svg]:w-4">{children}</button>; }
function Intro({ number, emoji, title, purpose, controls, onStart }: { number: number; emoji: string; title: string; purpose: string; controls: string; onStart: () => void }) { return <section className="mx-auto grid min-h-[590px] max-w-4xl place-items-center text-center"><div><div className="text-8xl">{emoji}</div><p className="mt-5 text-sm font-black uppercase tracking-[.28em] text-yellow-300">Game {number}</p><h2 className="mt-3 font-heading text-5xl font-black sm:text-7xl">{title}</h2><p className="mx-auto mt-4 max-w-2xl text-lg font-bold leading-8 text-violet-100">{purpose}</p><div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-bold">How to play: {controls}</div><Button onClick={onStart} className="mt-7 h-14 bg-yellow-300 px-10 font-black text-slate-950 hover:bg-yellow-200">START GAME</Button></div></section>; }
function Complete({ result, title, onContinue }: { result: ArcadeStageResult; title: string; onContinue: () => void }) { return <section className="absolute inset-0 z-50 grid place-items-center bg-[#15143b]/95 p-5"><div className="w-full max-w-lg rounded-[2rem] border-4 border-yellow-300 bg-white p-7 text-center text-slate-900"><div className="text-5xl">{[0, 1, 2].map((star) => <span key={star} className={star < result.stars ? "" : "grayscale opacity-20"}>⭐</span>)}</div><p className="mt-4 text-xs font-black uppercase tracking-widest text-violet-700">Game complete</p><h2 className="mt-2 font-heading text-4xl font-black">{title}</h2><p className="mt-4 font-bold text-slate-600">Score {result.score} · Combo x{result.bestCombo}</p><Button onClick={onContinue} className="mt-6 w-full">NEXT GAME</Button></div></section>; }
function Results({ name, results, onReplay, onChange }: { name: string; results: ArcadeStageResult[]; onReplay: () => void; onChange: () => void }) { const stars = results.reduce((sum, result) => sum + result.stars, 0); const score = results.reduce((sum, result) => sum + result.score, 0); return <section className="mx-auto max-w-4xl py-8 text-center"><div className="text-7xl">🏆🕰️✨</div><p className="mt-4 text-sm font-black uppercase tracking-[.25em] text-yellow-300">LEAD Past-tense Champion</p><h2 className="mt-3 font-heading text-5xl font-black sm:text-7xl">Brilliant journey, {name}!</h2><p className="mt-3 text-violet-100">You moved, sliced, listened, sequenced, and remembered complete past events.</p><div className="mt-7 grid gap-3 sm:grid-cols-5">{stageNames.map((title, index) => <div key={title} className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] font-black uppercase text-violet-200">{title}</p><p className="mt-2">{"⭐".repeat(results[index]?.stars || 0)}</p></div>)}</div><p className="mt-7 font-heading text-3xl font-black">{stars}/15 stars · {score} points</p><div className="mt-7 flex justify-center gap-3"><Button onClick={onReplay}><RotateCcw className="h-4 w-4" />PLAY AGAIN</Button><Button variant="secondary" onClick={onChange}><UserRound className="h-4 w-4" />CHANGE STUDENT</Button></div></section>; }

