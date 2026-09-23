"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw, Star, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type MealId = "breakfast" | "lunch" | "dinner";
type FoodId = "cereal" | "eggs" | "rice" | "sandwich" | "soup" | "noodles";
type Food = { id: FoodId; label: string; emoji: string; meal: MealId };

const meals = [
  { id: "breakfast" as const, label: "Breakfast", emoji: "🌅", x: 20, y: 26, color: "bg-amber-100" },
  { id: "lunch" as const, label: "Lunch", emoji: "☀️", x: 80, y: 26, color: "bg-sky-100" },
  { id: "dinner" as const, label: "Dinner", emoji: "🌙", x: 55, y: 72, color: "bg-indigo-100" }
];

const foods: Food[] = [
  { id: "cereal", label: "cereal", emoji: "🥣", meal: "breakfast" },
  { id: "eggs", label: "eggs", emoji: "🍳", meal: "breakfast" },
  { id: "rice", label: "rice", emoji: "🍚", meal: "lunch" },
  { id: "sandwich", label: "a sandwich", emoji: "🥪", meal: "lunch" },
  { id: "soup", label: "soup", emoji: "🍲", meal: "dinner" },
  { id: "noodles", label: "noodles", emoji: "🍜", meal: "dinner" }
];

const classmates = [
  { name: "Maya", breakfast: "cereal", lunch: "rice", dinner: "soup", shirt: "#f97316" },
  { name: "Leo", breakfast: "eggs", lunch: "a sandwich", dinner: "noodles", shirt: "#16a34a" },
  { name: "Aisha", breakfast: "cereal", lunch: "a sandwich", dinner: "soup", shirt: "#7c3aed" }
] as const;

const recallQuestions = [
  { prompt: "What does Maya eat for lunch?", answer: "rice", options: ["rice", "soup", "eggs"] },
  { prompt: "Who eats noodles for dinner?", answer: "Leo", options: ["Maya", "Leo", "Aisha"] },
  { prompt: "What does Aisha eat for breakfast?", answer: "cereal", options: ["cereal", "rice", "a sandwich"] },
  { prompt: "Who eats soup for dinner?", answer: "Maya and Aisha", options: ["Leo", "Maya and Aisha", "Maya only"] }
];

const levelNames = ["Meal Town", "Sort the Food", "Meal Sentences", "Meal Chart", "Recall Challenge"];

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

function displayName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 24).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export function MealTimeGame() {
  const [nameInput, setNameInput] = useState("");
  const [studentName, setStudentName] = useState("");
  const [level, setLevel] = useState(0);
  const [stars, setStars] = useState(0);

  function start() {
    const name = displayName(nameInput);
    if (!name) return;
    setStudentName(name);
    setLevel(1);
  }

  function advance(earned: number) {
    setStars((current) => current + earned);
    setLevel((current) => Math.min(6, current + 1));
  }

  function reset(keepName: boolean) {
    window.speechSynthesis?.cancel();
    setStars(0);
    if (keepName) setLevel(1);
    else { setNameInput(""); setStudentName(""); setLevel(0); }
  }

  if (!studentName || level === 0) return <StartScreen name={nameInput} setName={setNameInput} onStart={start} />;

  return <GameFrame name={studentName} level={level} stars={stars} onChangeStudent={() => reset(false)}>
    {level === 1 ? <MealTown name={studentName} onComplete={() => advance(3)} /> : null}
    {level === 2 ? <FoodSort onComplete={() => advance(6)} /> : null}
    {level === 3 ? <SentenceMission onComplete={() => advance(6)} /> : null}
    {level === 4 ? <MealChart name={studentName} onComplete={() => advance(6)} /> : null}
    {level === 5 ? <RecallChallenge onComplete={() => advance(8)} /> : null}
    {level === 6 ? <Results name={studentName} stars={stars} onReplay={() => reset(true)} onChangeStudent={() => reset(false)} /> : null}
  </GameFrame>;
}

function StartScreen({ name, setName, onStart }: { name: string; setName: (value: string) => void; onStart: () => void }) {
  const valid = Boolean(name.trim()) && name.trim().length <= 24;
  return <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#172554,#2563eb_50%,#f59e0b)] p-6 text-white shadow-2xl sm:p-10">
    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-200/30 blur-3xl" />
    <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div><p className="text-sm font-black uppercase tracking-[0.22em] text-yellow-300">LEAD presents</p><h2 className="mt-4 font-heading text-5xl font-black leading-none sm:text-6xl">Meal Time<br /><span className="text-yellow-300">Adventure!</span></h2><p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">Visit Meal Town, sort tasty foods, talk about meals, and test your memory.</p><div className="mt-6 flex gap-3 text-4xl" aria-hidden="true"><span>🥣</span><span>🍚</span><span>🍲</span></div></div>
      <div className="rounded-3xl border border-white/25 bg-white p-6 text-lead-navy shadow-2xl"><LeadChef name={displayName(name) || "You"} pose="celebrate" /><label htmlFor="meal-player-name" className="mt-5 block text-lg font-black">What&apos;s your name?</label><input id="meal-player-name" value={name} maxLength={24} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Type your name here..." className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" /><Button onClick={onStart} disabled={!valid} className="mt-4 h-14 w-full text-base">START MY FOOD QUEST</Button></div>
    </div>
  </section>;
}

function GameFrame({ name, level, stars, onChangeStudent, children }: { name: string; level: number; stars: number; onChangeStudent: () => void; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl"><header className="flex flex-wrap items-center justify-between gap-3 bg-lead-navy px-4 py-3 text-white sm:px-6"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">LEAD / Meal Time</p><p className="font-bold">Chef {name}&apos;s adventure</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{level > 5 ? "Quest complete" : `Level ${level}/5`} · ⭐ {stars}</span><button onClick={onChangeStudent} className="focus-ring rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><UserRound className="mr-1 inline h-3.5 w-3.5" />Change Student</button></div></header><div className="h-2 bg-slate-100"><div className="h-full bg-gradient-to-r from-lead-blue via-orange-400 to-yellow-400 transition-all" style={{ width: `${Math.min(100, (level / 5) * 100)}%` }} /></div><div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-lead-gray">{level <= 5 ? `${level}. ${levelNames[level - 1]}` : "Meal Master"}</div><div className="p-4 sm:p-6">{children}</div></div>;
}

function MealTown({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [position, setPosition] = useState({ x: 48, y: 86 });
  const [visited, setVisited] = useState<MealId[]>([]);
  const [message, setMessage] = useState(`${name}, visit breakfast, lunch, and dinner stations. Press SERVE when you arrive.`);
  const move = useCallback((dx: number, dy: number) => setPosition((current) => ({ x: Math.max(7, Math.min(93, current.x + dx)), y: Math.max(12, Math.min(88, current.y + dy)) })), []);
  const serve = useCallback(() => {
    const station = meals.find((meal) => Math.hypot(position.x - meal.x, position.y - meal.y) < 16);
    if (!station) { setMessage("Move closer to a meal station, then press SERVE."); return; }
    const example = station.id === "breakfast" ? "I eat cereal for breakfast." : station.id === "lunch" ? "I eat rice for lunch." : "I eat soup for dinner.";
    setVisited((current) => current.includes(station.id) ? current : [...current, station.id]);
    setMessage(`${station.emoji} ${example}`); speak(example);
  }, [position]);
  useEffect(() => { const down = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"," "].includes(key)) event.preventDefault(); if (key === "arrowup" || key === "w") move(0,-5); if (key === "arrowdown" || key === "s") move(0,5); if (key === "arrowleft" || key === "a") move(-5,0); if (key === "arrowright" || key === "d") move(5,0); if (key === " ") serve(); }; window.addEventListener("keydown", down); return () => window.removeEventListener("keydown", down); }, [move, serve]);
  return <section><Guide>{message}</Guide><div className="relative mt-4 aspect-[16/9] min-h-[390px] overflow-hidden rounded-3xl border-4 border-lead-navy bg-[#bbf7d0]"><div className="absolute inset-x-0 top-[48%] h-14 bg-[#fed7aa]" /><div className="absolute inset-y-0 left-[46%] w-14 bg-[#fed7aa]" />{meals.map((meal) => <div key={meal.id} className={`absolute grid h-28 w-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border-4 shadow-lg ${meal.color} ${visited.includes(meal.id) ? "border-emerald-500" : "border-white"}`} style={{ left: `${meal.x}%`, top: `${meal.y}%` }}><span className="text-5xl">{meal.emoji}</span><span className="text-xs font-black text-lead-navy">{visited.includes(meal.id) ? "✓ " : ""}{meal.label.toUpperCase()}</span></div>)}<div className="absolute transition-all duration-100" style={{ left: `${position.x}%`, top: `${position.y}%`, transform: "translate(-50%,-50%)" }}><LeadChef name={name} pose="walk" compact /></div><div className="absolute right-3 top-3 rounded-xl bg-lead-navy/90 px-3 py-2 text-xs font-bold text-white">Meal badges {visited.length}/3</div></div><div className="mt-4 flex flex-wrap items-center justify-center gap-3"><DPad onMove={move} /><Button variant="secondary" className="h-14" onClick={serve}>SERVE / SPACE</Button></div>{visited.length === 3 ? <Button onClick={onComplete} className="mt-5 w-full">Meal Town Complete <Check className="h-4 w-4" /></Button> : null}</section>;
}

function FoodSort({ onComplete }: { onComplete: () => void }) {
  const [placed, setPlaced] = useState<FoodId[]>([]);
  const [selected, setSelected] = useState<FoodId | null>(null);
  const [message, setMessage] = useState("Choose a food, then put it on the correct meal table.");
  function place(meal: MealId) { if (!selected) return; const food = foods.find((item) => item.id === selected)!; if (food.meal !== meal) { setMessage(`Try again. Do we usually eat ${food.label} for ${meal}?`); return; } const sentence = `I eat ${food.label} for ${meal}.`; setPlaced((current) => [...current, food.id]); setSelected(null); setMessage(sentence); speak(sentence); }
  return <section><Guide>{message}</Guide><div className="mt-5 flex flex-wrap justify-center gap-3">{foods.filter((food) => !placed.includes(food.id)).map((food) => <button key={food.id} onClick={() => setSelected(food.id)} className={`focus-ring rounded-2xl border-2 bg-white p-3 shadow-sm ${selected === food.id ? "border-lead-blue ring-4 ring-blue-100" : "border-slate-100"}`}><span className="block text-4xl">{food.emoji}</span><span className="mt-1 block text-xs font-black capitalize text-lead-navy">{food.label}</span></button>)}</div><div className="mt-6 grid gap-4 md:grid-cols-3">{meals.map((meal) => <button key={meal.id} onClick={() => place(meal.id)} className={`focus-ring min-h-40 rounded-3xl border-4 border-dashed border-white p-4 shadow-inner ${meal.color}`}><span className="text-4xl">{meal.emoji}</span><span className="mt-2 block font-heading text-xl font-black text-lead-navy">{meal.label}</span><span className="mt-3 block min-h-8 text-2xl">{foods.filter((food) => food.meal === meal.id && placed.includes(food.id)).map((food) => food.emoji).join(" ")}</span></button>)}</div>{placed.length === foods.length ? <Button onClick={onComplete} className="mt-5 w-full">All Foods Sorted</Button> : null}</section>;
}

function SentenceMission({ onComplete }: { onComplete: () => void }) {
  const rounds = [foods[0], foods[2], foods[4]];
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState("Choose the correct meal to complete the sentence.");
  const food = rounds[round];
  function choose(meal: MealId) { if (meal !== food.meal) { setMessage("Almost! Think about the time of day."); return; } const sentence = `I eat ${food.label} for ${meal}.`; setMessage(sentence); speak(sentence); if (round === rounds.length - 1) window.setTimeout(onComplete, 650); else window.setTimeout(() => { setRound((value) => value + 1); setMessage("Great sentence! Here is the next one."); }, 650); }
  return <section className="mx-auto max-w-3xl"><Guide>{message}</Guide><div className="mt-6 rounded-3xl bg-[linear-gradient(145deg,#eff6ff,#fff7d6)] p-8 text-center"><span className="text-8xl">{food.emoji}</span><p className="mt-5 font-heading text-3xl font-black text-lead-navy">I eat {food.label} for <span className="text-lead-blue">_____</span>.</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{meals.map((meal) => <button key={meal.id} onClick={() => choose(meal.id)} className="focus-ring rounded-2xl border-2 border-blue-100 bg-white px-4 py-4 font-heading text-lg font-black text-lead-navy shadow-sm hover:border-lead-blue">{meal.emoji} {meal.label}</button>)}</div></div></section>;
}

function MealChart({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [asked, setAsked] = useState<string[]>([]);
  const [message, setMessage] = useState(`${name}, ask each classmate: “What do you eat for breakfast, lunch, and dinner?”`);
  function ask(friend: (typeof classmates)[number]) { setAsked((current) => current.includes(friend.name) ? current : [...current, friend.name]); const answer = `I eat ${friend.breakfast} for breakfast, ${friend.lunch} for lunch, and ${friend.dinner} for dinner.`; setMessage(`${friend.name}: ${answer}`); speak(answer); }
  return <section><Guide>{message}</Guide><div className="mt-5 grid gap-4 sm:grid-cols-3">{classmates.map((friend) => <button key={friend.name} onClick={() => ask(friend)} className={`focus-ring rounded-3xl border-2 p-4 transition hover:-translate-y-1 ${asked.includes(friend.name) ? "border-emerald-300 bg-emerald-50" : "border-blue-100 bg-white"}`}><LeadChef name={friend.name} pose="talk" compact shirt={friend.shirt} /><span className="mt-4 block text-xs font-black text-lead-blue">{asked.includes(friend.name) ? "✓ CHART COMPLETE" : "ASK ABOUT MEALS"}</span></button>)}</div><div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200"><div className="grid min-w-[620px] grid-cols-4 bg-lead-navy px-4 py-3 text-xs font-black uppercase text-white"><span>Classmate</span><span>Breakfast</span><span>Lunch</span><span>Dinner</span></div>{classmates.map((friend) => <div key={friend.name} className="grid min-w-[620px] grid-cols-4 border-t border-slate-100 px-4 py-3 text-sm"><span className="font-bold text-lead-navy">{friend.name}</span><span className="capitalize">{asked.includes(friend.name) ? friend.breakfast : "?"}</span><span className="capitalize">{asked.includes(friend.name) ? friend.lunch : "?"}</span><span className="capitalize">{asked.includes(friend.name) ? friend.dinner : "?"}</span></div>)}</div>{asked.length === classmates.length ? <Button onClick={onComplete} className="mt-5 w-full">Remember the Chart <Check className="h-4 w-4" /></Button> : null}</section>;
}

function RecallChallenge({ onComplete }: { onComplete: () => void }) {
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState("Use your memory. The Meal Chart is hidden now!");
  const question = recallQuestions[round];
  function answer(value: string) { if (value !== question.answer) { setMessage("Not quite—picture the Meal Chart and try again."); return; } speak(`Correct! ${question.answer}.`); if (round === recallQuestions.length - 1) onComplete(); else { setRound((current) => current + 1); setMessage("Correct! Get ready for the next memory question."); } }
  return <section className="mx-auto max-w-3xl"><Guide>{message}</Guide><div className="mt-6 rounded-3xl bg-lead-navy p-7 text-center text-white"><p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-300">Recall {round + 1}/{recallQuestions.length}</p><div className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full bg-white/10 text-5xl">🧠</div><h2 className="mt-5 font-heading text-3xl font-black">{question.prompt}</h2><div className="mt-6 grid gap-3 sm:grid-cols-3">{question.options.map((option) => <button key={option} onClick={() => answer(option)} className="focus-ring rounded-2xl bg-white px-4 py-4 font-bold text-lead-navy shadow-sm transition hover:-translate-y-1 hover:bg-yellow-50">{option}</button>)}</div></div></section>;
}

function Results({ name, stars, onReplay, onChangeStudent }: { name: string; stars: number; onReplay: () => void; onChangeStudent: () => void }) {
  return <section className="mx-auto max-w-3xl py-8 text-center"><div className="mx-auto w-fit rounded-full bg-yellow-100 p-5"><LeadChef name={name} pose="celebrate" /></div><p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-lead-blue">Meal Time Complete</p><h2 className="mt-3 font-heading text-4xl font-black text-lead-navy">Amazing memory, Chef {name}!</h2><p className="mt-3 text-lg text-lead-gray">You explored meals, sorted foods, made sentences, completed a chart, and remembered every answer.</p><div className="mx-auto mt-6 max-w-md rounded-3xl bg-lead-navy px-8 py-5 text-white"><p className="text-sm font-black text-yellow-300">MEAL TIME MEMORY MASTER</p><p className="mt-2 text-3xl font-black">{stars} stars</p><div className="mt-3 flex justify-center gap-1">{[1,2,3,4,5].map((item) => <Star key={item} className="h-7 w-7 fill-yellow-400 text-yellow-400" />)}</div></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={onReplay}><RotateCcw className="h-4 w-4" />Play Again</Button><Button variant="secondary" onClick={onChangeStudent}><UserRound className="h-4 w-4" />Change Student</Button></div><p className="mt-8 font-black text-lead-blue">LEAD · Learn English Daily</p><p className="text-sm font-bold text-lead-gray">Speak English with Confidence</p></section>;
}

function Guide({ children }: { children: React.ReactNode }) { return <div className="flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lead-blue text-sm font-black text-white">W</span><p className="pt-1 text-sm font-semibold leading-6 text-lead-navy">{children}</p><button onClick={() => speak(typeof children === "string" ? children : "Listen and complete the meal mission.")} aria-label="Listen to instruction" className="focus-ring ml-auto rounded-lg p-2 text-lead-blue hover:bg-yellow-100"><Volume2 className="h-4 w-4" /></button></div>; }

function LeadChef({ name, pose, shirt = "#2563eb", compact = false }: { name: string; pose: "walk" | "talk" | "celebrate"; shirt?: string; compact?: boolean }) { return <div className={`relative mx-auto ${compact ? "w-16" : "w-28"}`}><svg viewBox="0 0 120 190" className={`w-full ${pose === "walk" ? "animate-bounce" : ""}`} role="img" aria-label={`${name}, ${pose}`}><path d="M35 21Q35 3 50 7Q60-2 69 8Q87 3 87 23Z" fill="white" stroke="#cbd5e1" strokeWidth="3" /><circle cx="60" cy="43" r="25" fill="#f2c9a5" /><path d="M35 40Q39 20 64 23Q85 25 85 45Q69 33 35 40" fill="#172554" /><circle cx="51" cy="45" r="3" /><circle cx="70" cy="45" r="3" /><path d={pose === "talk" ? "M53 56Q60 67 68 56" : "M52 57Q60 64 69 57"} fill="none" stroke="#9f503b" strokeWidth="3" /><rect x="31" y="69" width="58" height="68" rx="18" fill={shirt} /><text x="60" y="104" textAnchor="middle" fill="white" fontSize="16" fontWeight="900">LEAD</text><path d="M36 134L30 176M83 134L89 176" stroke="#0f172a" strokeWidth="15" strokeLinecap="round" /><path d={pose === "celebrate" ? "M33 84L12 42" : "M31 84L12 127"} stroke="#f2c9a5" strokeWidth="12" strokeLinecap="round" /><path d={pose === "celebrate" ? "M87 84L108 42" : pose === "talk" ? "M87 84L112 79" : "M88 84L108 127"} stroke="#f2c9a5" strokeWidth="12" strokeLinecap="round" /></svg><span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lead-navy px-2 py-0.5 text-[10px] font-black text-white">{name}</span></div>; }

function DPad({ onMove }: { onMove: (dx: number, dy: number) => void }) { const style = "focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"; return <div className="grid grid-cols-3 gap-1"><span /><button aria-label="Move up" onClick={() => onMove(0,-5)} className={style}><ArrowUp className="h-5 w-5" /></button><span /><button aria-label="Move left" onClick={() => onMove(-5,0)} className={style}><ArrowLeft className="h-5 w-5" /></button><button aria-label="Move down" onClick={() => onMove(0,5)} className={style}><ArrowDown className="h-5 w-5" /></button><button aria-label="Move right" onClick={() => onMove(5,0)} className={style}><ArrowRight className="h-5 w-5" /></button></div>; }
