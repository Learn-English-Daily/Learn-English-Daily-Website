"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Mic, RotateCcw, Star, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type HobbyId = "draw" | "swim" | "football" | "read" | "dance" | "cycle";
type Hobby = { id: HobbyId; label: string; emoji: string; color: string; reason: string };

const hobbies: Hobby[] = [
  { id: "draw", label: "draw", emoji: "🎨", color: "#f97316", reason: "creative" },
  { id: "swim", label: "swim", emoji: "🏊", color: "#0891b2", reason: "healthy" },
  { id: "football", label: "football", emoji: "⚽", color: "#16a34a", reason: "fun" },
  { id: "read", label: "read", emoji: "📚", color: "#7c3aed", reason: "interesting" },
  { id: "dance", label: "dance", emoji: "💃", color: "#db2777", reason: "exciting" },
  { id: "cycle", label: "cycle", emoji: "🚲", color: "#2563eb", reason: "relaxing" }
];

const parkStops = [
  { hobby: hobbies[0], x: 22, y: 26, label: "ART GARDEN" },
  { hobby: hobbies[1], x: 76, y: 27, label: "SWIMMING POOL" },
  { hobby: hobbies[2], x: 70, y: 72, label: "FOOTBALL FIELD" }
] as const;

const classmates = [
  { name: "Maya", hobby: hobbies[0], reason: "creative", shirt: "#f97316", x: 20, y: 60 },
  { name: "Leo", hobby: hobbies[2], reason: "fun", shirt: "#16a34a", x: 50, y: 32 },
  { name: "Aisha", hobby: hobbies[1], reason: "healthy", shirt: "#0891b2", x: 80, y: 62 }
] as const;

const levelNames = ["Hobby Park", "Word Power", "Because Builder", "Survey Game", "My Hobby Talk"];

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

export function HobbiesLevelUpGame() {
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
    else {
      setNameInput("");
      setStudentName("");
      setLevel(0);
    }
  }

  if (!studentName || level === 0) {
    return <StartScreen name={nameInput} setName={setNameInput} onStart={start} />;
  }

  return (
    <GameFrame name={studentName} level={level} stars={stars} onChangeStudent={() => reset(false)}>
      {level === 1 ? <HobbyPark name={studentName} onComplete={() => advance(3)} /> : null}
      {level === 2 ? <WordPower onComplete={() => advance(6)} /> : null}
      {level === 3 ? <BecauseBuilder onComplete={() => advance(6)} /> : null}
      {level === 4 ? <SurveyGame name={studentName} onComplete={() => advance(6)} /> : null}
      {level === 5 ? <MyHobbyTalk name={studentName} onComplete={() => advance(5)} /> : null}
      {level === 6 ? <Results name={studentName} stars={stars} onReplay={() => reset(true)} onChangeStudent={() => reset(false)} /> : null}
    </GameFrame>
  );
}

function StartScreen({ name, setName, onStart }: { name: string; setName: (value: string) => void; onStart: () => void }) {
  const valid = Boolean(name.trim()) && name.trim().length <= 24;
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#172554,#2563eb_52%,#0ea5e9)] p-6 text-white shadow-2xl sm:p-10">
      <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-yellow-300/25 blur-3xl" />
      <div className="absolute -bottom-20 left-1/4 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-yellow-300">LEAD presents</p>
          <h2 className="mt-4 font-heading text-5xl font-black leading-none sm:text-6xl">Hobbies<br /><span className="text-yellow-300">Level Up!</span></h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-blue-100">Explore Hobby Park, collect words, give reasons, and interview your new friends.</p>
          <div className="mt-6 flex gap-3 text-4xl" aria-hidden="true"><span>🎨</span><span>🏊</span><span>⚽</span></div>
        </div>
        <div className="rounded-3xl border border-white/25 bg-white p-6 text-lead-navy shadow-2xl">
          <LeadKid name={displayName(name) || "You"} pose="celebrate" />
          <label htmlFor="hobby-player-name" className="mt-5 block text-lg font-black">What&apos;s your name?</label>
          <input id="hobby-player-name" value={name} maxLength={24} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Type your name here..." className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" />
          <Button onClick={onStart} disabled={!valid} className="mt-4 h-14 w-full text-base">ENTER HOBBY PARK</Button>
        </div>
      </div>
    </section>
  );
}

function GameFrame({ name, level, stars, onChangeStudent, children }: { name: string; level: number; stars: number; onChangeStudent: () => void; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-lead-navy px-4 py-3 text-white sm:px-6">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">LEAD / Hobbies Level Up</p><p className="font-bold">{name}&apos;s hobby adventure</p></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{level > 5 ? "Adventure complete" : `Level ${level}/5`} · ⭐ {stars}</span><button onClick={onChangeStudent} className="focus-ring rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><UserRound className="mr-1 inline h-3.5 w-3.5" />Change Student</button></div>
      </header>
      <div className="h-2 bg-slate-100"><div className="h-full bg-gradient-to-r from-lead-blue via-cyan-400 to-yellow-400 transition-all" style={{ width: `${Math.min(100, (level / 5) * 100)}%` }} /></div>
      <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-lead-gray sm:px-6">{level <= 5 ? `${level}. ${levelNames[level - 1]}` : "Hobby Champion"}</div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function HobbyPark({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [position, setPosition] = useState({ x: 48, y: 82 });
  const [visited, setVisited] = useState<HobbyId[]>([]);
  const [message, setMessage] = useState(`Welcome, ${name}! Walk to each hobby zone and press TRY HOBBY.`);
  const move = useCallback((dx: number, dy: number) => setPosition((current) => ({ x: Math.max(7, Math.min(93, current.x + dx)), y: Math.max(12, Math.min(86, current.y + dy)) })), []);
  const interact = useCallback(() => {
    const stop = parkStops.find((item) => Math.hypot(position.x - item.x, position.y - item.y) < 15);
    if (!stop) { setMessage("Move closer to a hobby zone, then try again."); return; }
    const sentence = stop.hobby.id === "football" ? "I like football because it is fun." : `I like to ${stop.hobby.label}.`;
    speak(sentence);
    setMessage(`${stop.hobby.emoji} ${sentence}`);
    setVisited((current) => current.includes(stop.hobby.id) ? current : [...current, stop.hobby.id]);
  }, [position]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(key)) event.preventDefault();
      if (key === "arrowup" || key === "w") move(0, -5);
      if (key === "arrowdown" || key === "s") move(0, 5);
      if (key === "arrowleft" || key === "a") move(-5, 0);
      if (key === "arrowright" || key === "d") move(5, 0);
      if (key === " ") interact();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [interact, move]);
  return (
    <section>
      <Guide>{message}</Guide>
      <div className="relative mt-4 aspect-[16/9] min-h-[390px] overflow-hidden rounded-3xl border-4 border-lead-navy bg-[#bbf7d0]">
        <div className="absolute inset-x-0 top-[47%] h-14 bg-[#fde68a]" /><div className="absolute inset-y-0 left-[46%] w-14 bg-[#fde68a]" />
        {parkStops.map((stop) => <div key={stop.hobby.id} className={`absolute grid h-28 w-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border-4 bg-white/95 shadow-lg ${visited.includes(stop.hobby.id) ? "border-emerald-500" : "border-white"}`} style={{ left: `${stop.x}%`, top: `${stop.y}%` }}><span className="text-5xl">{stop.hobby.emoji}</span><span className="text-[10px] font-black text-lead-navy">{visited.includes(stop.hobby.id) ? "✓ " : ""}{stop.label}</span></div>)}
        <div className="absolute transition-all duration-100" style={{ left: `${position.x}%`, top: `${position.y}%`, transform: "translate(-50%,-50%)" }}><LeadKid name={name} pose="walk" compact /></div>
        <div className="absolute right-3 top-3 rounded-xl bg-lead-navy/90 px-3 py-2 text-xs font-bold text-white">Badges {visited.length}/3</div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3"><DPad onMove={move} /><Button variant="secondary" className="h-14" onClick={interact}>TRY HOBBY / SPACE</Button></div>
      {visited.length === 3 ? <Button onClick={onComplete} className="mt-5 w-full">All Hobby Badges Collected <Check className="h-4 w-4" /></Button> : null}
    </section>
  );
}

function WordPower({ onComplete }: { onComplete: () => void }) {
  const rounds = hobbies.slice(0, 3);
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState("Look at the picture and choose the hobby word.");
  const current = rounds[round];
  const options = useMemo(() => [current, ...hobbies.filter((item) => item.id !== current.id).slice(round, round + 2)].sort((a, b) => a.id.localeCompare(b.id)), [current, round]);
  function choose(hobby: Hobby) {
    if (hobby.id !== current.id) { setMessage("Good try! Look at the picture one more time."); return; }
    speak(current.label);
    if (round === rounds.length - 1) onComplete();
    else { setRound((value) => value + 1); setMessage("Excellent! Here is the next hobby."); }
  }
  return <section className="mx-auto max-w-3xl"><Guide>{message}</Guide><div className="mt-6 rounded-3xl bg-[linear-gradient(145deg,#eff6ff,#fff7d6)] p-8 text-center"><div className="text-8xl" aria-label={current.label}>{current.emoji}</div><p className="mt-3 text-sm font-black uppercase tracking-widest text-lead-blue">Word {round + 1}/3</p><div className="mt-6 grid gap-3 sm:grid-cols-3">{options.map((hobby) => <button key={hobby.id} onClick={() => choose(hobby)} className="focus-ring rounded-2xl border-2 border-blue-100 bg-white px-5 py-4 font-heading text-xl font-black capitalize text-lead-navy shadow-sm transition hover:-translate-y-1 hover:border-lead-blue">{hobby.label}</button>)}</div></div></section>;
}

function BecauseBuilder({ onComplete }: { onComplete: () => void }) {
  const rounds = hobbies.slice(0, 3);
  const [round, setRound] = useState(0);
  const [message, setMessage] = useState("Complete the sentence with the best reason.");
  const current = rounds[round];
  const reasons = ["fun", "healthy", "creative", "boring"];
  function choose(reason: string) {
    if (reason !== current.reason) { setMessage("That reason can work in real life, but find the lesson answer for this round."); return; }
    const sentence = current.id === "football" ? "I like football because it is fun." : `I like to ${current.label} because it is ${reason}.`;
    speak(sentence);
    setMessage(sentence);
    window.setTimeout(() => {
      if (round === rounds.length - 1) onComplete();
      else { setRound((value) => value + 1); setMessage("Great reason! Build the next sentence."); }
    }, 650);
  }
  return <section className="mx-auto max-w-4xl"><Guide>{message}</Guide><div className="mt-6 grid items-center gap-6 rounded-3xl border-2 border-blue-100 bg-blue-50 p-6 md:grid-cols-[180px_1fr]"><div className="text-center text-8xl">{current.emoji}</div><div><p className="font-heading text-2xl font-black text-lead-navy">I like {current.id === "football" ? "football" : `to ${current.label}`} because it is <span className="text-lead-blue">_____</span>.</p><div className="mt-5 grid grid-cols-2 gap-3">{reasons.map((reason) => <button key={reason} onClick={() => choose(reason)} className="focus-ring rounded-xl border-2 border-white bg-white px-4 py-3 font-bold capitalize text-lead-navy shadow-sm hover:border-yellow-400">{reason}</button>)}</div></div></div></section>;
}

function SurveyGame({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [surveyed, setSurveyed] = useState<string[]>([]);
  const [active, setActive] = useState<(typeof classmates)[number] | null>(null);
  const [message, setMessage] = useState(`${name}, ask each classmate: “What hobby do you like?”`);
  function ask(friend: (typeof classmates)[number]) {
    setActive(friend);
    const answer = `I like to ${friend.hobby.label} because it is ${friend.reason}.`;
    setMessage(`${friend.name}: ${answer}`);
    speak(`What hobby do you like? ${answer}`);
    setSurveyed((current) => current.includes(friend.name) ? current : [...current, friend.name]);
  }
  return <section><Guide>{message}</Guide><div className="relative mt-4 min-h-[390px] overflow-hidden rounded-3xl border-4 border-lead-navy bg-[linear-gradient(#bae6fd_0_45%,#fef3c7_45%)]"><div className="absolute left-8 top-8 rounded-2xl border-8 border-amber-700 bg-white px-8 py-4 text-center"><p className="font-black text-lead-blue">HOBBY CLUB</p><p className="text-xs font-bold text-lead-gray">Ask · Listen · Record</p></div>{classmates.map((friend) => <button key={friend.name} onClick={() => ask(friend)} className={`focus-ring absolute -translate-x-1/2 -translate-y-1/2 rounded-3xl p-3 transition hover:scale-105 ${active?.name === friend.name ? "bg-yellow-200 ring-4 ring-yellow-400" : "bg-white/70"}`} style={{ left: `${friend.x}%`, top: `${friend.y}%` }}><LeadKid name={friend.name} pose="talk" shirt={friend.shirt} compact /><span className="mt-2 block text-xs font-black text-lead-navy">{surveyed.includes(friend.name) ? `✓ ${friend.hobby.emoji} ${friend.hobby.label}` : "ASK ME"}</span></button>)}</div><div className="mt-4 overflow-hidden rounded-2xl border border-slate-200"><div className="grid grid-cols-3 bg-lead-navy px-4 py-2 text-xs font-black uppercase text-white"><span>Classmate</span><span>Hobby</span><span>Reason</span></div>{classmates.map((friend) => <div key={friend.name} className="grid grid-cols-3 border-t border-slate-100 px-4 py-3 text-sm"><span className="font-bold text-lead-navy">{friend.name}</span><span className="capitalize">{surveyed.includes(friend.name) ? friend.hobby.label : "—"}</span><span className="capitalize">{surveyed.includes(friend.name) ? friend.reason : "—"}</span></div>)}</div>{surveyed.length === classmates.length ? <Button onClick={onComplete} className="mt-5 w-full">Survey Complete <Check className="h-4 w-4" /></Button> : null}</section>;
}

function MyHobbyTalk({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [hobbyId, setHobbyId] = useState<HobbyId>("football");
  const [reason, setReason] = useState("fun");
  const [practised, setPractised] = useState(false);
  const hobby = hobbies.find((item) => item.id === hobbyId)!;
  const sentence = hobby.id === "football" ? `My name is ${name}. I like football because it is ${reason}.` : `My name is ${name}. I like to ${hobby.label} because it is ${reason}.`;
  return <section className="mx-auto max-w-4xl"><Guide>Choose your real hobby and reason. Listen, then say your complete answer aloud.</Guide><div className="mt-6 grid gap-6 rounded-3xl bg-[linear-gradient(145deg,#eff6ff,#ffffff,#fff7d6)] p-6 lg:grid-cols-[1fr_0.8fr]"><div><p className="text-sm font-black uppercase tracking-widest text-lead-blue">My hobby</p><div className="mt-3 grid grid-cols-3 gap-2">{hobbies.map((item) => <button key={item.id} onClick={() => { setHobbyId(item.id); setReason(item.reason); setPractised(false); }} className={`focus-ring rounded-2xl border-2 p-3 text-center ${hobbyId === item.id ? "border-lead-blue bg-blue-50" : "border-white bg-white"}`}><span className="block text-3xl">{item.emoji}</span><span className="mt-1 block text-xs font-black capitalize text-lead-navy">{item.label}</span></button>)}</div><label className="mt-5 block text-sm font-black uppercase tracking-widest text-lead-blue">Why do you like it?</label><select value={reason} onChange={(event) => { setReason(event.target.value); setPractised(false); }} className="focus-ring mt-3 h-12 w-full rounded-xl border-2 border-blue-100 bg-white px-3 font-bold text-lead-navy"><option value="fun">It is fun</option><option value="healthy">It is healthy</option><option value="creative">It is creative</option><option value="interesting">It is interesting</option><option value="exciting">It is exciting</option><option value="relaxing">It is relaxing</option></select></div><div className="flex flex-col items-center justify-center rounded-3xl bg-lead-navy p-6 text-center text-white"><span className="text-7xl">{hobby.emoji}</span><p className="mt-5 text-xl font-black leading-8">“{sentence}”</p><Button variant="secondary" className="mt-5 w-full" onClick={() => speak(sentence)}><Volume2 className="h-4 w-4" />Listen</Button><Button className={`mt-3 w-full ${practised ? "bg-emerald-600" : ""}`} onClick={() => setPractised(true)}><Mic className="h-4 w-4" />{practised ? "Great speaking!" : "I said it aloud"}</Button></div></div>{practised ? <Button onClick={onComplete} className="mt-5 w-full">Finish Hobbies Level Up</Button> : null}</section>;
}

function Results({ name, stars, onReplay, onChangeStudent }: { name: string; stars: number; onReplay: () => void; onChangeStudent: () => void }) {
  return <section className="mx-auto max-w-3xl py-8 text-center"><div className="mx-auto w-fit rounded-full bg-yellow-100 p-5"><LeadKid name={name} pose="celebrate" /></div><p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-lead-blue">Hobbies Level Up Complete</p><h2 className="mt-3 font-heading text-4xl font-black text-lead-navy">Fantastic speaking, {name}!</h2><p className="mt-3 text-lg text-lead-gray">You explored hobbies, gave reasons, surveyed classmates, and shared your own answer.</p><div className="mx-auto mt-6 max-w-md rounded-3xl bg-lead-navy px-8 py-5 text-white"><p className="text-sm font-black text-yellow-300">HOBBY COMMUNICATION CHAMPION</p><p className="mt-2 text-3xl font-black">{stars} stars</p><div className="mt-3 flex justify-center gap-1">{[1, 2, 3, 4, 5].map((item) => <Star key={item} className="h-7 w-7 fill-yellow-400 text-yellow-400" />)}</div></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={onReplay}><RotateCcw className="h-4 w-4" />Play Again</Button><Button variant="secondary" onClick={onChangeStudent}><UserRound className="h-4 w-4" />Change Student</Button></div><p className="mt-8 font-black text-lead-blue">LEAD · Learn English Daily</p><p className="text-sm font-bold text-lead-gray">Speak English with Confidence</p></section>;
}

function Guide({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lead-blue text-sm font-black text-white">W</span><p className="pt-1 text-sm font-semibold leading-6 text-lead-navy">{children}</p></div>;
}

function LeadKid({ name, pose, shirt = "#2563eb", compact = false }: { name: string; pose: "walk" | "talk" | "celebrate"; shirt?: string; compact?: boolean }) {
  return <div className={`relative mx-auto ${compact ? "w-16" : "w-28"}`}><svg viewBox="0 0 120 180" className={`w-full ${pose === "walk" ? "animate-bounce" : ""}`} role="img" aria-label={`${name}, ${pose}`}><circle cx="60" cy="35" r="25" fill="#f2c9a5" /><path d="M34 32Q38 3 64 8Q89 10 87 38Q70 24 34 32" fill="#172554" /><circle cx="51" cy="37" r="3" /><circle cx="70" cy="37" r="3" /><path d={pose === "talk" ? "M53 48Q60 61 68 48" : "M52 49Q60 56 69 49"} fill="none" stroke="#9f503b" strokeWidth="3" /><rect x="31" y="61" width="58" height="68" rx="18" fill={shirt} /><text x="60" y="96" textAnchor="middle" fill="white" fontSize="16" fontWeight="900">LEAD</text><path d="M36 126L30 168M83 126L89 168" stroke="#0f172a" strokeWidth="15" strokeLinecap="round" /><path d={pose === "celebrate" ? "M33 77L12 34" : "M31 76L12 119"} stroke="#f2c9a5" strokeWidth="12" strokeLinecap="round" /><path d={pose === "celebrate" ? "M87 77L108 34" : pose === "talk" ? "M87 77L112 72" : "M88 76L108 119"} stroke="#f2c9a5" strokeWidth="12" strokeLinecap="round" /></svg><span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lead-navy px-2 py-0.5 text-[10px] font-black text-white">{name}</span></div>;
}

function DPad({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const keyClass = "focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white";
  return <div className="grid grid-cols-3 gap-1"><span /><button aria-label="Move up" onClick={() => onMove(0, -5)} className={keyClass}><ArrowUp className="h-5 w-5" /></button><span /><button aria-label="Move left" onClick={() => onMove(-5, 0)} className={keyClass}><ArrowLeft className="h-5 w-5" /></button><button aria-label="Move down" onClick={() => onMove(0, 5)} className={keyClass}><ArrowDown className="h-5 w-5" /></button><button aria-label="Move right" onClick={() => onMove(5, 0)} className={keyClass}><ArrowRight className="h-5 w-5" /></button></div>;
}
