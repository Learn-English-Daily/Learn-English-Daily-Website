"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arcadeSound } from "../lead-arcade/audio";
import type { ArcadeStageResult } from "../lead-arcade/types";
import { ClosetHunt, OutfitStudio, RunwayRecall, StyleDetective, WordTailor } from "./challenges";
import { FashionResults, FashionShell, StageComplete, StageIntro } from "./fashion-ui";
import { stageNames } from "./game-data";

const intros = [
  { emoji: "🛍️👕", title: "CLOSET HUNT", purpose: "Listen to a color and clothing clue, then search the closet before the stylist moves on.", controls: "Listen, inspect, and tap the correct item" },
  { emoji: "🔤🧵", title: "WORD TAILOR", purpose: "Use Scrabble-style letter tiles to stitch five clothing words together in the correct order.", controls: "Tap tiles, undo mistakes, and check the finished word" },
  { emoji: "🕵️‍♀️👗", title: "STYLE DETECTIVE", purpose: "Study each model and identify the one complete English sentence that matches every detail.", controls: "Inspect colors and clothes, then choose the evidence" },
  { emoji: "🎨🧥", title: "OUTFIT STUDIO", purpose: "Design useful outfits for two real situations and explain each preference with because.", controls: "Choose exactly 3 items and a reason" },
  { emoji: "✨🎭", title: "RUNWAY RECALL", purpose: "Memorize fast-moving runway looks, then rebuild the full I'm wearing sentence from memory.", controls: "Watch for 3 seconds, remember, and answer" }
];

function cleanName(value: string) { return value.trim().replace(/\s+/g, " ").slice(0, 24).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }

export function FashionChallengeGame() {
  const [input, setInput] = useState(""); const [name, setName] = useState(""); const [stage, setStage] = useState(0); const [started, setStarted] = useState(false); const [sound, setSound] = useState(true); const [fullscreen, setFullscreen] = useState(false); const [results, setResults] = useState<ArcadeStageResult[]>([]); const [pending, setPending] = useState<ArcadeStageResult | null>(null);
  function reset(keepName: boolean) { window.speechSynthesis?.cancel(); setStage(0); setStarted(false); setResults([]); setPending(null); if (!keepName) { setName(""); setInput(""); } }
  function complete(value: ArcadeStageResult) { setPending(value); arcadeSound("complete", sound); }
  function next() { if (!pending) return; setResults((value) => [...value, pending]); setPending(null); setStage((value) => value + 1); setStarted(false); }
  async function toggleFullscreen() { const shell = document.getElementById("fashion-challenge-shell"); if (!document.fullscreenElement) await shell?.requestFullscreen(); else await document.exitFullscreen(); setFullscreen(Boolean(document.fullscreenElement)); }
  if (!name) return <Start value={input} onChange={setInput} onStart={() => { const value = cleanName(input); if (value) setName(value); }} sound={sound} onSound={() => setSound((value) => !value)} />;
  const stars = results.reduce((sum, value) => sum + value.stars, 0) + (pending?.stars || 0); const intro = intros[stage];
  return <FashionShell name={name} stage={stage} stars={stars} sound={sound} fullscreen={fullscreen} onSound={() => setSound((value) => !value)} onFullscreen={toggleFullscreen} onChangeStudent={() => reset(false)}>{stage >= 5 ? <FashionResults name={name} results={results} onReplay={() => reset(true)} onChange={() => reset(false)} /> : !started ? <StageIntro number={stage + 1} {...intro} onStart={() => setStarted(true)} /> : <>{stage === 0 ? <ClosetHunt sound={sound} onComplete={complete} /> : null}{stage === 1 ? <WordTailor sound={sound} onComplete={complete} /> : null}{stage === 2 ? <StyleDetective sound={sound} onComplete={complete} /> : null}{stage === 3 ? <OutfitStudio sound={sound} onComplete={complete} /> : null}{stage === 4 ? <RunwayRecall sound={sound} onComplete={complete} /> : null}{pending ? <StageComplete result={pending} title={stageNames[stage]} onContinue={next} /> : null}</>}</FashionShell>;
}

function Start({ value, onChange, onStart, sound, onSound }: { value: string; onChange: (value: string) => void; onStart: () => void; sound: boolean; onSound: () => void }) { const valid = Boolean(value.trim()); return <section className="relative min-h-[720px] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_20%_15%,#c026d3,#3b0764_48%,#0f172a)] p-6 text-white shadow-2xl sm:p-10"><div className="absolute inset-0 opacity-20 [background-image:linear-gradient(45deg,#fff_1px,transparent_1px),linear-gradient(-45deg,#fff_1px,transparent_1px)] [background-size:36px_36px]" /><div className="relative mx-auto grid min-h-[640px] max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-sm font-black uppercase tracking-[.28em] text-yellow-300">LEAD · Learn English Daily presents</p><h1 className="mt-5 font-heading text-6xl font-black leading-[.88] sm:text-8xl">FASHION<br /><span className="text-yellow-300">CHALLENGE</span></h1><p className="mt-5 text-2xl font-black text-fuchsia-100">Dress. Describe. Remember. Rule the Runway!</p><p className="mt-4 max-w-xl text-lg font-bold">Five different games. One English fashion champion.</p><div className="mt-8 text-6xl">👕 👗 🧥 👖 👟</div></div><div className="rounded-[2rem] border border-white/20 bg-white p-6 text-slate-900 shadow-2xl"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-fuchsia-100 text-6xl">🦉</div><label htmlFor="fashion-student" className="mt-5 block font-heading text-xl font-black">What&apos;s your name?</label><input id="fashion-student" autoFocus maxLength={24} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Enter your name" className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-fuchsia-100 px-4 text-lg font-bold" /><Button onClick={onStart} disabled={!valid} className="mt-4 h-14 w-full bg-yellow-300 font-black text-slate-950 hover:bg-yellow-200"><Play className="h-5 w-5" />START FASHION CHALLENGE</Button><button onClick={onSound} className="focus-ring mt-3 w-full rounded-xl px-4 py-3 text-sm font-black text-fuchsia-700">{sound ? "🔊 SOUND ON" : "🔇 SOUND OFF"}</button><p className="mt-4 text-center text-xs font-bold text-slate-500">Speak English with Confidence</p></div></div></section>; }
