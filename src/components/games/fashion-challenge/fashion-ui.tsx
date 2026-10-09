"use client";

import { Maximize2, Minimize2, RotateCcw, UserRound, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArcadeStageResult } from "../lead-arcade/types";
import { stageNames } from "./game-data";

export function FashionShell({ name, stage, stars, sound, fullscreen, onSound, onFullscreen, onChangeStudent, children }: { name: string; stage: number; stars: number; sound: boolean; fullscreen: boolean; onSound: () => void; onFullscreen: () => void; onChangeStudent: () => void; children: React.ReactNode }) {
  return <div id="fashion-challenge-shell" className="relative overflow-hidden rounded-[2rem] border border-fuchsia-200 bg-[#160d2b] text-white shadow-2xl fullscreen:rounded-none">
    <header className="relative z-40 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#24123d]/95 px-4 py-3 sm:px-6">
      <div><p className="text-xs font-black uppercase tracking-[.2em] text-yellow-300">LEAD · Fashion Challenge</p><p className="text-sm font-bold text-fuchsia-100">{name} · {stage < 5 ? `Section ${stage + 1}/5` : "Fashion Champion"}</p></div>
      <div className="flex items-center gap-2"><span className="rounded-full bg-yellow-300 px-3 py-1.5 text-sm font-black text-slate-950">⭐ {stars}/15</span><Icon label={sound ? "Mute" : "Sound on"} onClick={onSound}>{sound ? <Volume2 /> : <VolumeX />}</Icon><Icon label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={onFullscreen}>{fullscreen ? <Minimize2 /> : <Maximize2 />}</Icon><Icon label="Change student" onClick={onChangeStudent}><UserRound /></Icon></div>
    </header>
    <div className="relative z-30 grid grid-cols-5 border-b border-white/10 bg-white/5">{stageNames.map((title, index) => <div key={title} className={`px-1 py-2 text-center text-[10px] font-black uppercase sm:text-xs ${index <= stage ? "text-yellow-300" : "text-slate-500"}`}><span className={`mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full ${index < stage ? "bg-emerald-500" : index === stage ? "bg-yellow-300 text-slate-950" : "bg-slate-700"}`}>{index < stage ? "✓" : index + 1}</span><span className="hidden sm:inline">{title}</span></div>)}</div>
    <main className="relative min-h-[650px] overflow-hidden p-4 sm:p-6">{children}</main>
  </div>;
}

function Icon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-label={label} onClick={onClick} className="focus-ring grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20 [&_svg]:h-4 [&_svg]:w-4">{children}</button>; }

export function StageIntro({ number, emoji, title, purpose, controls, onStart }: { number: number; emoji: string; title: string; purpose: string; controls: string; onStart: () => void }) {
  return <section className="mx-auto grid min-h-[590px] max-w-4xl place-items-center text-center"><div><div className="text-8xl" aria-hidden="true">{emoji}</div><p className="mt-5 text-sm font-black uppercase tracking-[.28em] text-yellow-300">Section {number}</p><h2 className="mt-3 font-heading text-5xl font-black sm:text-7xl">{title}</h2><p className="mx-auto mt-4 max-w-2xl text-lg font-bold leading-8 text-fuchsia-100">{purpose}</p><div className="mx-auto mt-6 max-w-xl rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-bold">How to play: {controls}</div><Button onClick={onStart} className="mt-7 h-14 bg-yellow-300 px-10 font-black text-slate-950 hover:bg-yellow-200">START SECTION</Button></div></section>;
}

export function StageComplete({ result, title, onContinue }: { result: ArcadeStageResult; title: string; onContinue: () => void }) {
  const accuracy = Math.round(result.correct / Math.max(1, result.attempts) * 100);
  return <section className="absolute inset-0 z-50 grid place-items-center bg-[#160d2b]/95 p-5"><div className="w-full max-w-lg rounded-[2rem] border-4 border-yellow-300 bg-white p-7 text-center text-slate-900 shadow-2xl"><div className="text-5xl">{[0, 1, 2].map((star) => <span key={star} className={star < result.stars ? "" : "grayscale opacity-20"}>⭐</span>)}</div><p className="mt-4 text-xs font-black uppercase tracking-widest text-fuchsia-700">Section complete</p><h2 className="mt-2 font-heading text-4xl font-black">{title}</h2><div className="mt-5 grid grid-cols-3 gap-3"><Stat label="Score" value={String(result.score)} /><Stat label="Accuracy" value={`${accuracy}%`} /><Stat label="Combo" value={`x${result.bestCombo}`} /></div><Button onClick={onContinue} className="mt-6 w-full">NEXT SECTION</Button></div></section>;
}

export function FashionResults({ name, results, onReplay, onChange }: { name: string; results: ArcadeStageResult[]; onReplay: () => void; onChange: () => void }) {
  const stars = results.reduce((sum, item) => sum + item.stars, 0); const score = results.reduce((sum, item) => sum + item.score, 0); const correct = results.reduce((sum, item) => sum + item.correct, 0); const attempts = results.reduce((sum, item) => sum + item.attempts, 0); const words = [...new Set(results.flatMap((item) => item.practiced || []))];
  return <section className="mx-auto max-w-4xl py-8 text-center"><div className="text-7xl">🏆✨</div><p className="mt-4 text-sm font-black uppercase tracking-[.25em] text-yellow-300">LEAD Fashion Champion</p><h2 className="mt-3 font-heading text-5xl font-black sm:text-7xl">Amazing, {name}!</h2><p className="mt-3 text-fuchsia-100">You described outfits and explained preferences with confidence.</p><div className="mt-7 grid gap-3 sm:grid-cols-5">{stageNames.map((stage, index) => <div key={stage} className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] font-black uppercase text-fuchsia-200">{stage}</p><p className="mt-2">{"⭐".repeat(results[index]?.stars || 0)}</p></div>)}</div><div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3"><Stat dark label="Stars" value={`${stars}/15`} /><Stat dark label="Score" value={String(score)} /><Stat dark label="Accuracy" value={`${Math.round(correct / Math.max(1, attempts) * 100)}%`} /></div>{words.length ? <p className="mx-auto mt-5 max-w-2xl rounded-2xl bg-white/10 p-4 font-bold text-fuchsia-100">Words mastered: {words.join(" · ")}</p> : null}<div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={onReplay}><RotateCcw className="h-4 w-4" />PLAY AGAIN</Button><Button variant="secondary" onClick={onChange}><UserRound className="h-4 w-4" />CHANGE STUDENT</Button></div></section>;
}

function Stat({ label, value, dark = false }: { label: string; value: string; dark?: boolean }) { return <div className={`rounded-xl p-3 ${dark ? "bg-white/10" : "bg-slate-100"}`}><p className={`text-[10px] font-black uppercase ${dark ? "text-fuchsia-200" : "text-slate-500"}`}>{label}</p><p className="mt-1 font-heading text-xl font-black">{value}</p></div>; }
