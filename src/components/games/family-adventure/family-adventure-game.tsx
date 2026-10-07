"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArcadeShell, FinalResults, StageComplete, StageIntro } from "./arcade-ui";
import { FamilyEscape } from "./family-escape";
import { FamilyRush } from "./family-rush";
import { FamilySlice } from "./family-slice";
import { FamilyTV } from "./family-tv";
import { SentenceFlight } from "./sentence-flight";
import { arcadeTone } from "./game-audio";
import { stageNames } from "./game-data";
import type { StageResult } from "./types";

const intros = [
  { title: "FAMILY SLICE", purpose: "Listen fast and slice the correct family portraits. Avoid the sneaky distractors!", controls: "Mouse click or touch", emoji: "⚡👨‍👩‍👧‍👦" },
  { title: "FAMILY RUSH", purpose: "Race through three lanes, dodge toys, and choose the family member that matches each clue.", controls: "← → / A D to move · ↑ / SPACE to jump", emoji: "🏃⭐" },
  { title: "SENTENCE FLIGHT", purpose: "Keep Wisey's LEAD plane airborne and fly through the words in the correct order.", controls: "SPACE or tap sky to rise · click word gates", emoji: "🦉✈️" },
  { title: "FAMILY TV", purpose: "Step into the studio, listen to the host, and introduce the game family with confidence.", controls: "Listen · think · speak aloud", emoji: "🎤📺" },
  { title: "FAMILY ESCAPE", purpose: "The family photos escaped! Survive the fastest run and recover the magical album.", controls: "← → / A D to move · ↑ / SPACE to jump", emoji: "📕💨" }
];

function cleanName(value: string) { return value.trim().replace(/\s+/g, " ").slice(0, 24).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase()); }

export function FamilyAdventureGame() {
  const [nameInput, setNameInput] = useState(""); const [name, setName] = useState(""); const [stage, setStage] = useState(0); const [started, setStarted] = useState(false); const [sound, setSound] = useState(true); const [fullscreen, setFullscreen] = useState(false); const [results, setResults] = useState<StageResult[]>([]); const [pendingResult, setPendingResult] = useState<StageResult | null>(null);
  function begin() { const value = cleanName(nameInput); if (value) { setName(value); setStarted(false); } }
  function complete(result: StageResult) { setPendingResult(result); arcadeTone("complete", sound); }
  function continueAdventure() { if (!pendingResult) return; setResults((current) => [...current, pendingResult]); setPendingResult(null); setStage((value) => value + 1); setStarted(false); }
  function reset(keepName: boolean) { window.speechSynthesis?.cancel(); setStage(0); setStarted(false); setResults([]); setPendingResult(null); if (!keepName) { setName(""); setNameInput(""); } }
  async function toggleFullscreen() { const shell = document.getElementById("family-adventure-shell"); if (!document.fullscreenElement) await shell?.requestFullscreen(); else await document.exitFullscreen(); setFullscreen(Boolean(document.fullscreenElement)); }
  if (!name) return <StartScreen value={nameInput} onChange={setNameInput} onStart={begin} sound={sound} onSound={() => setSound((value) => !value)} />;
  const totalStars = results.reduce((sum, result) => sum + result.stars, 0) + (pendingResult?.stars || 0);
  return <ArcadeShell name={name} stage={stage} stars={totalStars} sound={sound} fullscreen={fullscreen} onSound={() => setSound((value) => !value)} onFullscreen={toggleFullscreen} onChangeStudent={() => reset(false)}>{stage >= 5 ? <FinalResults name={name} results={results} onReplay={() => reset(true)} onChange={() => reset(false)} /> : !started ? <StageIntro number={stage + 1} {...intros[stage]} onStart={() => setStarted(true)} /> : <>{stage === 0 ? <FamilySlice sound={sound} onComplete={complete} /> : null}{stage === 1 ? <FamilyRush sound={sound} onComplete={complete} /> : null}{stage === 2 ? <SentenceFlight sound={sound} onComplete={complete} /> : null}{stage === 3 ? <FamilyTV sound={sound} studentName={name} onComplete={complete} /> : null}{stage === 4 ? <FamilyEscape sound={sound} onComplete={complete} /> : null}{pendingResult ? <StageComplete title={stageNames[stage]} result={pendingResult} onContinue={continueAdventure} /> : null}</>}</ArcadeShell>;
}

function StartScreen({ value, onChange, onStart, sound, onSound }: { value: string; onChange: (value: string) => void; onStart: () => void; sound: boolean; onSound: () => void }) { const valid = Boolean(value.trim()); return <section className="relative min-h-[690px] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_20%_20%,#2563eb,#0f172a_58%,#020617)] p-6 text-white shadow-2xl sm:p-10"><div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:30px_30px]" /><div className="relative mx-auto grid min-h-[610px] max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-sm font-black uppercase tracking-[.28em] text-yellow-300">LEAD · Learn English Daily presents</p><h1 className="mt-5 font-heading text-6xl font-black leading-[.88] sm:text-8xl">FAMILY<br /><span className="text-yellow-300">ADVENTURE</span></h1><p className="mt-5 text-2xl font-black text-blue-100">Meet the Family. Beat the Challenges. Speak English!</p><p className="mt-3 font-bold text-yellow-300">5 Challenges. One Family Champion.</p><div className="mt-8 flex gap-3 text-5xl" aria-hidden="true">👵 👨 👩 👧 👦 👴</div></div><div className="rounded-[2rem] border border-white/20 bg-white p-6 text-slate-900 shadow-2xl"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-blue-100 text-6xl">🦉</div><label htmlFor="family-student-name" className="mt-5 block font-heading text-xl font-black">What&apos;s your name?</label><input id="family-student-name" autoFocus maxLength={24} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Enter your name" className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" /><Button onClick={onStart} disabled={!valid} className="mt-4 h-14 w-full bg-yellow-400 font-black text-slate-950 hover:bg-yellow-300"><Play className="h-5 w-5" />START ADVENTURE</Button><button onClick={onSound} className="focus-ring mt-3 w-full rounded-xl px-4 py-3 text-sm font-black text-blue-700">{sound ? "🔊 SOUND ON" : "🔇 SOUND OFF"}</button><p className="mt-4 text-center text-xs font-bold text-slate-500">Speak English with Confidence</p></div></div></section>; }
