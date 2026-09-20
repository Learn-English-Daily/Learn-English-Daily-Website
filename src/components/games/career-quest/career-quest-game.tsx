"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BriefcaseBusiness, Check, CirclePause, Lightbulb, Map, Mic, Play, RotateCcw, Star, UserRound, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { careerReasons, detectiveCases, helpCases, professionById, professions, type Profession, type ProfessionId } from "@/components/games/career-quest/game-data";

type Phase = "city" | "mission" | "detective" | "help" | "choice" | "speaking" | "results";
type Point = { x: number; y: number };

const startPoint = { x: 50, y: 50 };

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 24).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = "en-US";
  voice.rate = 0.82;
  window.speechSynthesis.speak(voice);
}

export function CareerQuestGame() {
  const [nameInput, setNameInput] = useState("");
  const [studentName, setStudentName] = useState("");
  const [phase, setPhase] = useState<Phase>("city");
  const [position, setPosition] = useState<Point>(startPoint);
  const [discovered, setDiscovered] = useState<ProfessionId[]>([]);
  const [completed, setCompleted] = useState<ProfessionId[]>([]);
  const [activeProfession, setActiveProfession] = useState<ProfessionId | null>(null);
  const [caseIndex, setCaseIndex] = useState(0);
  const [helpIndex, setHelpIndex] = useState(0);
  const [career, setCareer] = useState<ProfessionId>("doctor");
  const [reason, setReason] = useState(careerReasons[0]);
  const [stars, setStars] = useState(0);
  const [paused, setPaused] = useState(false);
  const [missionRun, setMissionRun] = useState(0);
  const [notice, setNotice] = useState("Explore Career City. Walk near a professional and press SPACE.");

  function start() {
    const name = cleanName(nameInput);
    if (!name) return;
    setStudentName(name);
    resetProgress();
  }

  function resetProgress() {
    setPhase("city"); setPosition(startPoint); setDiscovered([]); setCompleted([]); setActiveProfession(null);
    setCaseIndex(0); setHelpIndex(0); setCareer("doctor"); setReason(careerReasons[0]); setStars(0); setPaused(false);
    setNotice("Welcome to Career City! Walk near a professional and press SPACE.");
  }

  function changeStudent() {
    window.speechSynthesis?.cancel();
    setStudentName(""); setNameInput(""); resetProgress();
  }

  if (!studentName) return <StartScreen value={nameInput} onChange={setNameInput} onStart={start} />;

  const active = activeProfession ? professionById(activeProfession) : null;
  const missionLabel = phase === "city" ? (completed.length === 8 ? "Enter Career Detective" : "Discover and master every job") : phase === "detective" ? `Detective Case ${caseIndex + 1}/3` : phase === "help" ? `Who Can Help? ${helpIndex + 1}/4` : phase === "choice" ? "Choose your career" : phase === "speaking" ? "Speaking challenge" : phase === "results" ? "Quest complete" : active?.mission || "Job mission";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl">
      <GameHUD name={studentName} discovered={discovered.length} completed={completed.length} stars={stars} mission={missionLabel} onPause={() => setPaused(true)} />
      {phase === "city" ? <CityStage name={studentName} position={position} setPosition={setPosition} discovered={discovered} completed={completed} notice={notice} setNotice={setNotice} onDiscover={(job) => { if (!discovered.includes(job.id)) { setDiscovered((items) => [...items, job.id]); setStars((value) => value + 1); setNotice(`${job.name} discovered! ${job.description} Press SPACE again to try the job.`); speak(`${job.name}. ${job.description}`); } else if (!completed.includes(job.id)) { setActiveProfession(job.id); setPhase("mission"); } else setNotice(`${job.name} mastered. ${job.description}`); }} onContinue={() => { setPosition(startPoint); setCaseIndex(0); setPhase("detective"); }} /> : null}
      {phase === "mission" && active ? <JobMission key={`${active.id}-${missionRun}`} profession={active} name={studentName} onExit={() => { setPhase("city"); setPosition(active.position); }} onComplete={() => { setCompleted((items) => items.includes(active.id) ? items : [...items, active.id]); setStars((value) => value + 5); setNotice(`${active.name.toUpperCase()} MASTERED! ${active.description}`); speak(`Great job, ${studentName}! ${active.description}`); setPhase("city"); setPosition(active.position); }} /> : null}
      {phase === "detective" ? <NavigationChallenge name={studentName} position={position} setPosition={setPosition} title="Career Detective" instruction="Investigate the clues, then travel to the correct professional." detail={detectiveCases[caseIndex].clues.join("  ·  ")} answer={detectiveCases[caseIndex].answer} hint="Use the workplace signs and the clues together." onCorrect={() => { setStars((value) => value + 3); if (caseIndex === detectiveCases.length - 1) { setHelpIndex(0); setPosition(startPoint); setPhase("help"); } else { setCaseIndex((value) => value + 1); setPosition(startPoint); } }} /> : null}
      {phase === "help" ? <NavigationChallenge name={studentName} position={position} setPosition={setPosition} title="Who Can Help?" instruction={helpCases[helpIndex].situation} detail="Find the right professional in Career City." answer={helpCases[helpIndex].answer} hint={helpCases[helpIndex].hint} onCorrect={() => { setStars((value) => value + 3); if (helpIndex === helpCases.length - 1) setPhase("choice"); else { setHelpIndex((value) => value + 1); setPosition(startPoint); } }} /> : null}
      {phase === "choice" ? <CareerChoice name={studentName} career={career} reason={reason} onCareer={setCareer} onReason={setReason} onComplete={() => setPhase("speaking")} /> : null}
      {phase === "speaking" ? <SpeakingChallenge name={studentName} profession={professionById(career)} reason={reason} onComplete={() => { setStars((value) => value + 5); setPhase("results"); }} /> : null}
      {phase === "results" ? <Results name={studentName} profession={professionById(career)} reason={reason} stars={stars} onReplay={resetProgress} onChangeStudent={changeStudent} /> : null}
      {paused ? <PauseMenu phase={phase} onResume={() => setPaused(false)} onRestart={() => { setPaused(false); if (phase === "mission") setMissionRun((value) => value + 1); else setPosition(startPoint); }} onChangeStudent={changeStudent} /> : null}
    </div>
  );
}

function StartScreen({ value, onChange, onStart }: { value: string; onChange: (value: string) => void; onStart: () => void }) {
  const valid = Boolean(value.trim());
  return <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_15%_10%,rgba(250,204,21,.32),transparent_25%),linear-gradient(145deg,#0f172a,#1d4ed8_58%,#38bdf8)] p-6 text-white shadow-2xl sm:p-10"><div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_.85fr]"><div><p className="text-sm font-black uppercase tracking-[.24em] text-yellow-300">LEAD · Learn English Daily</p><h2 className="mt-4 font-heading text-5xl font-black leading-[.95] sm:text-7xl">Career<br />Quest</h2><p className="mt-4 text-2xl font-extrabold text-blue-100">What Will You Be?</p><p className="mt-3 font-black text-yellow-300">Speak English with Confidence</p><div className="mt-8 flex items-end gap-5"><Player name="You" /><Owl /><div className="hidden rounded-2xl rounded-bl-none bg-white p-4 font-bold text-lead-navy sm:block">Welcome to Career City!</div></div></div><div className="rounded-3xl border border-white/20 bg-white p-6 text-lead-navy shadow-2xl sm:p-8"><p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">Welcome to Career Quest!</p><label className="mt-4 block font-heading text-2xl font-black">What&apos;s your name?</label><input autoFocus maxLength={24} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Enter your name" className="focus-ring mt-4 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" /><Button disabled={!valid} onClick={onStart} className="mt-4 h-14 w-full text-base">START CAREER QUEST <Play className="h-5 w-5" /></Button><p className="mt-4 text-center text-sm font-semibold text-slate-500">Your name stays only in this game session.</p></div></div></section>;
}

function GameHUD({ name, discovered, completed, stars, mission, onPause }: { name: string; discovered: number; completed: number; stars: number; mission: string; onPause: () => void }) {
  return <header className="relative z-40 flex flex-wrap items-center justify-between gap-3 bg-lead-navy px-4 py-3 text-white sm:px-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-yellow-300">LEAD · Career Quest</p><p className="font-bold">{name}&apos;s Career Quest</p></div><div className="flex flex-wrap items-center gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-2">Jobs {discovered}/8</span><span className="rounded-full bg-white/10 px-3 py-2">Badges {completed}/8</span><span className="rounded-full bg-yellow-400 px-3 py-2 text-slate-900"><Star className="mr-1 inline h-4 w-4 fill-current" />{stars}</span><button onClick={onPause} className="focus-ring rounded-lg bg-white/10 p-2 hover:bg-white/20" aria-label="Pause game"><CirclePause className="h-5 w-5" /></button></div><p className="w-full border-t border-white/10 pt-2 text-xs font-semibold text-blue-100"><strong className="text-white">Mission:</strong> {mission}</p></header>;
}

function CityStage({ name, position, setPosition, discovered, completed, notice, setNotice, onDiscover, onContinue }: { name: string; position: Point; setPosition: React.Dispatch<React.SetStateAction<Point>>; discovered: ProfessionId[]; completed: ProfessionId[]; notice: string; setNotice: (text: string) => void; onDiscover: (job: Profession) => void; onContinue: () => void }) {
  const nearby = useMemo(() => professions.find((job) => distance(position, job.position) < 9), [position]);
  const interact = useCallback(() => nearby ? onDiscover(nearby) : setNotice("Move closer to a professional. Look for the person beside each building."), [nearby, onDiscover, setNotice]);
  useMovement(setPosition, interact);
  return <section className="bg-slate-100 p-3 sm:p-5"><Guide text={nearby ? `${nearby.name} is nearby. Press SPACE or tap ${discovered.includes(nearby.id) ? completed.includes(nearby.id) ? "REVIEW" : "START JOB" : "TALK"}.` : notice} /><CareerWorld name={name} position={position} discovered={discovered} completed={completed} /><Controls onMove={(dx, dy) => movePlayer(setPosition, dx, dy)} onInteract={interact} label={nearby ? discovered.includes(nearby.id) ? completed.includes(nearby.id) ? "REVIEW" : "START JOB" : "TALK" : "INTERACT"} />{completed.length === 8 ? <div className="mt-4 rounded-2xl bg-[linear-gradient(90deg,#1d4ed8,#4f46e5)] p-4 text-center text-white"><p className="font-black">All eight jobs mastered. Career Detective is ready!</p><Button onClick={onContinue} className="mt-3 bg-yellow-400 text-slate-900 hover:bg-yellow-300">START CAREER DETECTIVE</Button></div> : null}</section>;
}

function CareerWorld({ name, position, discovered = [], completed = [] }: { name: string; position: Point; discovered?: ProfessionId[]; completed?: ProfessionId[] }) {
  return <div className="relative mt-3 aspect-[16/10] min-h-[430px] overflow-hidden rounded-3xl border-4 border-slate-700 bg-[#bbf7d0]"><div className="absolute left-[47%] top-0 h-full w-[9%] bg-slate-600"><RoadMarks vertical /></div><div className="absolute left-0 top-[44%] h-[12%] w-full bg-slate-600"><RoadMarks /></div><div className="absolute inset-x-0 top-[42%] h-[2%] bg-slate-300" /><div className="absolute inset-x-0 top-[56%] h-[2%] bg-slate-300" />{professions.map((job) => <div key={job.id}><Building job={job} /><div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{ left: `${job.position.x}%`, top: `${job.position.y + (job.position.y < 50 ? 10 : -10)}%` }}><Professional job={job} /><span className={`absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full text-xs font-black text-white ${completed.includes(job.id) ? "bg-emerald-500" : discovered.includes(job.id) ? "bg-blue-500" : "bg-slate-500"}`}>{completed.includes(job.id) ? "✓" : discovered.includes(job.id) ? "!" : "?"}</span></div></div>)}<div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-100" style={{ left: `${position.x}%`, top: `${position.y}%` }}><Player name={name} compact /></div><div className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-black text-slate-700"><Map className="mr-1 inline h-3 w-3" />Career City</div></div>;
}

function JobMission({ profession, name, onExit, onComplete }: { profession: Profession; name: string; onExit: () => void; onComplete: () => void }) {
  const [position, setPosition] = useState<Point>({ x: 50, y: 84 });
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState(`Find: ${profession.steps[0].item}`);
  const target = profession.steps[step];
  const interact = useCallback(() => { if (distance(position, target) >= 12) { setFeedback(`Move closer to ${target.item}.`); return; } const next = step + 1; speak(target.action); if (next === profession.steps.length) { setFeedback("JOB MASTERED!"); window.setTimeout(onComplete, 700); } else { setStep(next); setFeedback(`Great! Now: ${profession.steps[next].action}`); } }, [onComplete, position, profession.steps, step, target]);
  useMovement(setPosition, interact);
  return <section className="p-3 sm:p-5"><Guide text={`${profession.mission} ${feedback}`} /><div className="mt-3 grid gap-4 lg:grid-cols-[1fr_260px]"><div className="relative min-h-[440px] overflow-hidden rounded-3xl border-4" style={{ borderColor: profession.color, background: `linear-gradient(145deg,${profession.light},#ffffff)` }}><div className="absolute inset-x-0 top-0 flex h-16 items-center justify-between px-5 text-white" style={{ background: profession.color }}><strong>{profession.workplace}</strong><button onClick={onExit} className="focus-ring rounded-lg bg-white/20 p-2" aria-label="Leave mission"><X className="h-4 w-4" /></button></div>{profession.steps.map((item, index) => <button key={`${item.action}-${index}`} onClick={() => { if (index === step) setPosition({ x: item.x, y: item.y }); }} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 px-3 py-2 text-xs font-black shadow-md transition ${index < step ? "border-emerald-400 bg-emerald-100 text-emerald-800" : index === step ? "animate-pulse border-yellow-400 bg-white text-slate-900" : "border-slate-200 bg-slate-100 text-slate-400"}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>{index < step ? "✓ " : ""}{item.item}</button>)}<div className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-100" style={{ left: `${position.x}%`, top: `${position.y}%` }}><Player name={name} compact /></div></div><aside className="rounded-3xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-widest" style={{ color: profession.color }}>{profession.name} Mission</p><h3 className="mt-2 font-heading text-xl font-black text-lead-navy">{profession.description}</h3><div className="mt-4 grid gap-2">{profession.steps.map((item, index) => <p key={`${item.action}-list`} className={`rounded-xl p-2 text-sm font-bold ${index < step ? "bg-emerald-100 text-emerald-800" : index === step ? "bg-yellow-100 text-amber-900" : "bg-white text-slate-500"}`}>{index < step ? <Check className="mr-1 inline h-4 w-4" /> : `${index + 1}. `}{item.action}</p>)}</div><p className="mt-4 text-xs font-black uppercase text-slate-500">Vocabulary</p><div className="mt-2 flex flex-wrap gap-1">{profession.vocabulary.map((word) => <span key={word} className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-700">{word}</span>)}</div></aside></div><Controls onMove={(dx, dy) => movePlayer(setPosition, dx, dy)} onInteract={interact} label={distance(position, target) < 12 ? target.action.toUpperCase() : "INTERACT"} /></section>;
}

function NavigationChallenge({ name, position, setPosition, title, instruction, detail, answer, hint, onCorrect }: { name: string; position: Point; setPosition: React.Dispatch<React.SetStateAction<Point>>; title: string; instruction: string; detail: string; answer: ProfessionId; hint: string; onCorrect: () => void }) {
  const [message, setMessage] = useState(instruction);
  const [showHint, setShowHint] = useState(false);
  const nearby = useMemo(() => professions.find((job) => distance(position, job.position) < 9), [position]);
  const interact = useCallback(() => { if (!nearby) { setMessage("Move close to a professional first."); return; } if (nearby.id !== answer) { setMessage(`${nearby.name} is not the professional for this situation. Keep exploring.`); return; } setMessage(`Correct! ${nearby.description}`); speak(`Correct! ${nearby.description}`); window.setTimeout(onCorrect, 650); }, [answer, nearby, onCorrect]);
  useMovement(setPosition, interact);
  return <section className="bg-slate-100 p-3 sm:p-5"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Guide text={message} /><button onClick={() => setShowHint((value) => !value)} className="focus-ring rounded-2xl bg-yellow-100 px-4 py-3 text-sm font-black text-amber-900"><Lightbulb className="mr-1 inline h-4 w-4" />Hint</button></div><div className="mt-3 rounded-2xl bg-white p-3 text-center shadow-sm"><p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">{title}</p><p className="mt-1 font-heading text-xl font-black text-lead-navy">{detail}</p>{showHint ? <p className="mt-2 font-bold text-amber-700">{hint}</p> : null}</div><CareerWorld name={name} position={position} /><Controls onMove={(dx, dy) => movePlayer(setPosition, dx, dy)} onInteract={interact} label={nearby ? `ASK ${nearby.name.toUpperCase()}` : "INVESTIGATE"} /></section>;
}

function CareerChoice({ name, career, reason, onCareer, onReason, onComplete }: { name: string; career: ProfessionId; reason: string; onCareer: (id: ProfessionId) => void; onReason: (reason: string) => void; onComplete: () => void }) {
  const job = professionById(career); const sentence = `I want to be a ${job.name.toLowerCase()} because ${reason.slice(2, -1).toLowerCase()}.`;
  return <section className="p-5 sm:p-8"><Guide text={`${name}, which job do you like? Choose a career you discovered.`} /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{professions.map((item) => <button key={item.id} onClick={() => onCareer(item.id)} className={`focus-ring rounded-2xl border-2 p-4 text-left transition ${career === item.id ? "border-blue-600 bg-blue-50" : "border-slate-100"}`}><Professional job={item} /><strong className="mt-2 block text-sm text-lead-navy">{item.name}</strong><span className="text-xs text-slate-500">{item.workplace}</span></button>)}</div><h3 className="mt-7 font-heading text-xl font-black text-lead-navy">Why do you like this job?</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{careerReasons.map((item) => <button key={item} onClick={() => onReason(item)} className={`focus-ring rounded-xl border-2 p-3 text-left text-sm font-bold ${reason === item ? "border-yellow-400 bg-yellow-50 text-amber-900" : "border-slate-100"}`}>{item}</button>)}</div><div className="mt-6 rounded-2xl bg-lead-navy p-5 text-center text-xl font-black text-white">“{sentence}”</div><div className="mt-4 flex justify-center gap-3"><Button variant="secondary" onClick={() => speak(sentence)}><Volume2 className="h-4 w-4" />Listen</Button><Button onClick={onComplete}>Speaking Challenge <ArrowRight className="h-4 w-4" /></Button></div></section>;
}

function SpeakingChallenge({ name, profession, reason, onComplete }: { name: string; profession: Profession; reason: string; onComplete: () => void }) {
  const [level, setLevel] = useState(0); const [practicing, setPracticing] = useState(false); const reasonText = reason.slice(2, -1).toLowerCase();
  const sentences = [`I want to be a ${profession.name.toLowerCase()}.`, `I want to be a ${profession.name.toLowerCase()} because ${reasonText}.`, `I want to be a ${profession.name.toLowerCase()} because ${profession.id === "doctor" ? "I like helping sick people" : profession.id === "veterinarian" ? "I like helping sick animals" : reasonText}.`];
  function practice() { setPracticing(true); speak(sentences[level]); window.setTimeout(() => setPracticing(false), 2600); }
  return <section className="min-h-[560px] bg-[linear-gradient(160deg,#dbeafe,#fff_50%,#fef3c7)] p-6 text-center sm:p-10"><p className="text-xs font-black uppercase tracking-[.22em] text-blue-600">Career Speaking Challenge</p><h2 className="mt-3 font-heading text-3xl font-black text-lead-navy">What do you want to be?</h2><div className="mx-auto mt-6 flex max-w-3xl items-end justify-center gap-5"><Owl /><div className="max-w-lg rounded-3xl rounded-bl-none bg-white p-6 text-left shadow-xl"><p className="text-xs font-black uppercase text-blue-600">Level {level + 1} of 3</p><p className="mt-3 text-2xl font-black leading-9 text-lead-navy">{sentences[level]}</p><p className="mt-3 text-sm font-semibold text-slate-500">Listen, then say the complete sentence aloud.</p></div><Player name={name} /></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => speak(sentences[level])}><Volume2 className="h-4 w-4" />Listen</Button><Button onClick={practice}><Mic className="h-4 w-4" />{practicing ? "Speaking..." : "Practice Speaking"}</Button><Button onClick={() => level === 2 ? onComplete() : setLevel((value) => value + 1)}>{level === 2 ? "Complete Quest" : "Next Level"}<ArrowRight className="h-4 w-4" /></Button></div><div className="mx-auto mt-8 flex max-w-sm gap-2">{sentences.map((_, index) => <span key={index} className={`h-2 flex-1 rounded-full ${index <= level ? "bg-blue-600" : "bg-slate-200"}`} />)}</div></section>;
}

function Results({ name, profession, reason, stars, onReplay, onChangeStudent }: { name: string; profession: Profession; reason: string; stars: number; onReplay: () => void; onChangeStudent: () => void }) {
  return <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,#dbeafe,#fff_45%,#fef3c7)] p-6 text-center sm:p-12"><div className="mx-auto max-w-2xl rounded-[2rem] border-4 border-yellow-300 bg-white p-6 shadow-2xl sm:p-10"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-yellow-400 text-slate-900"><BriefcaseBusiness className="h-10 w-10" /></div><p className="mt-5 text-xs font-black uppercase tracking-[.22em] text-blue-600">LEAD · Learn English Daily</p><h2 className="mt-2 font-heading text-4xl font-black text-lead-navy">Career Quest Complete!</h2><p className="mt-2 text-lg font-bold text-blue-700">Great job, {name}! Speak English with Confidence!</p><div className="mt-6 grid gap-2 text-left sm:grid-cols-2">{[["Student", name], ["Jobs Discovered", "8 / 8"], ["Missions Completed", "8 / 8"], ["Career Stars", String(stars)], ["Career Choice", profession.name], ["Reason", reason]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className="font-bold text-lead-navy">{value}</p></div>)}</div><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={onReplay}><RotateCcw className="h-4 w-4" />Play Again</Button><Button variant="secondary" onClick={onChangeStudent}><UserRound className="h-4 w-4" />Change Student</Button></div></div></section>;
}

function PauseMenu({ phase, onResume, onRestart, onChangeStudent }: { phase: Phase; onResume: () => void; onRestart: () => void; onChangeStudent: () => void }) {
  return <div className="absolute inset-0 z-50 grid place-items-center bg-slate-950/70 p-4"><div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-widest text-blue-600">Game Paused</p><h2 className="mt-2 font-heading text-3xl font-black text-lead-navy">Career Quest</h2><div className="mt-5 grid gap-3"><Button onClick={onResume}><Play className="h-4 w-4" />Resume</Button><Button variant="secondary" onClick={onRestart}><RotateCcw className="h-4 w-4" />{phase === "mission" ? "Restart Mission" : "Return to City Center"}</Button><Button variant="secondary" onClick={onChangeStudent}><UserRound className="h-4 w-4" />Change Student</Button><Button variant="secondary" onClick={() => window.location.assign("/games")}><X className="h-4 w-4" />Exit Game</Button></div></div></div>;
}

function useMovement(setPosition: React.Dispatch<React.SetStateAction<Point>>, interact: () => void) {
  useEffect(() => { const keydown = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(key)) event.preventDefault(); if (key === "arrowup" || key === "w") movePlayer(setPosition, 0, -3); if (key === "arrowdown" || key === "s") movePlayer(setPosition, 0, 3); if (key === "arrowleft" || key === "a") movePlayer(setPosition, -3, 0); if (key === "arrowright" || key === "d") movePlayer(setPosition, 3, 0); if (key === " ") interact(); }; window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown); }, [interact, setPosition]);
}

function movePlayer(setPosition: React.Dispatch<React.SetStateAction<Point>>, dx: number, dy: number) { setPosition((point) => ({ x: Math.max(5, Math.min(95, point.x + dx)), y: Math.max(8, Math.min(92, point.y + dy)) })); }
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }

function Controls({ onMove, onInteract, label }: { onMove: (dx: number, dy: number) => void; onInteract: () => void; label: string }) {
  return <div className="mt-4 flex flex-wrap items-center justify-center gap-4"><div className="grid grid-cols-3 gap-1"><span /><Control label="Up" onClick={() => onMove(0, -4)}><ArrowUp /></Control><span /><Control label="Left" onClick={() => onMove(-4, 0)}><ArrowLeft /></Control><Control label="Down" onClick={() => onMove(0, 4)}><ArrowDown /></Control><Control label="Right" onClick={() => onMove(4, 0)}><ArrowRight /></Control></div><Button onClick={onInteract} className="h-14 max-w-[240px] whitespace-normal">{label}</Button><p className="w-full text-center text-xs font-bold text-slate-500">WASD / Arrow Keys to move · SPACE to interact · Touch controls on tablets</p></div>;
}
function Control({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button aria-label={label} onClick={onClick} className="focus-ring grid h-11 w-11 place-items-center rounded-xl bg-lead-navy text-white active:scale-95">{children}</button>; }
function Guide({ text }: { text: string }) { return <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm"><Owl compact /><p className="flex-1 font-bold text-lead-navy">{text}</p></div>; }

function Building({ job }: { job: Profession }) { const top = job.position.y < 50; return <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${job.position.x}%`, top: `${job.position.y}%` }}><div className="relative h-16 w-24 rounded-t-xl border-2 border-slate-700 shadow-lg sm:h-20 sm:w-28" style={{ background: job.light }}><div className="absolute -top-3 left-2 right-2 h-4 rounded-t-lg" style={{ background: job.color }} /><div className="absolute bottom-0 left-1/2 h-8 w-6 -translate-x-1/2 rounded-t-md bg-slate-700" /><div className="absolute left-2 top-5 h-4 w-4 bg-sky-200" /><div className="absolute right-2 top-5 h-4 w-4 bg-sky-200" /></div><p className={`absolute left-1/2 w-32 -translate-x-1/2 text-center text-[9px] font-black uppercase text-slate-800 ${top ? "-top-7" : "-bottom-7"}`}>{job.workplace}</p></div>; }
function RoadMarks({ vertical = false }: { vertical?: boolean }) { return <div className={`absolute flex ${vertical ? "left-1/2 top-0 h-full -translate-x-1/2 flex-col" : "left-0 top-1/2 w-full -translate-y-1/2"} items-center justify-around`}>{Array.from({ length: 10 }).map((_, index) => <span key={index} className={`${vertical ? "h-6 w-1" : "h-1 w-8"} bg-yellow-300`} />)}</div>; }

function Player({ name, compact = false }: { name: string; compact?: boolean }) { return <div className="relative flex flex-col items-center"><span className="mb-1 whitespace-nowrap rounded bg-slate-900/80 px-2 py-0.5 text-[9px] font-black text-white">{name}</span><svg aria-label={`${name}, the player`} width={compact ? 34 : 72} height={compact ? 48 : 98} viewBox="0 0 72 98" role="img"><circle cx="36" cy="19" r="15" fill="#e7b98e" /><path d="M21 18C22 3 51 2 52 20c-9-7-20-9-31-2" fill="#172554" /><rect x="18" y="35" width="36" height="36" rx="12" fill="#2563eb" /><text x="36" y="58" textAnchor="middle" fill="white" fontSize="13" fontWeight="900">L</text><path d="M25 69v24M47 69v24" stroke="#0f172a" strokeWidth="9" strokeLinecap="round" /><path d="M18 42 7 63M54 42l11 21" stroke="#e7b98e" strokeWidth="8" strokeLinecap="round" /><circle cx="31" cy="19" r="1.5" /><circle cx="42" cy="19" r="1.5" /><path d="m31 26 5 2 5-2" fill="none" stroke="#7c2d12" strokeWidth="1.5" /></svg></div>; }
function Professional({ job }: { job: Profession }) { return <div className="flex flex-col items-center"><svg aria-label={job.name} width="38" height="48" viewBox="0 0 48 64" role="img"><circle cx="24" cy="13" r="10" fill="#dca47d" /><path d="M14 12C15 2 34 2 34 13c-7-4-13-5-20-1" fill="#334155" /><rect x="10" y="25" width="28" height="27" rx="8" fill={job.color} /><path d="M17 51v11M31 51v11" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" /><circle cx="24" cy="37" r="5" fill="white" opacity=".9" /><path d="M21 37h6M24 34v6" stroke={job.color} strokeWidth="1.5" /></svg><span className="max-w-20 text-center text-[9px] font-black text-slate-900">{job.name}</span></div>; }
function Owl({ compact = false }: { compact?: boolean }) { return <svg aria-label="Wisey the Owl" width={compact ? 42 : 82} height={compact ? 42 : 82} viewBox="0 0 82 82" role="img" className="shrink-0"><path d="M17 25 11 8l20 10M65 25 71 8 51 18" fill="#facc15" stroke="#0f172a" strokeWidth="3" /><ellipse cx="41" cy="45" rx="29" ry="30" fill="#facc15" stroke="#0f172a" strokeWidth="3" /><circle cx="30" cy="39" r="11" fill="white" /><circle cx="52" cy="39" r="11" fill="white" /><circle cx="31" cy="40" r="4" fill="#0f172a" /><circle cx="51" cy="40" r="4" fill="#0f172a" /><path d="m41 43-6 7h12z" fill="#ea580c" /><path d="M29 59q12 9 24 0" fill="none" stroke="#0f172a" strokeWidth="3" /></svg>; }
