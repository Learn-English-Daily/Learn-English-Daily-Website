"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, RotateCcw, UserRound, Volume2 } from "lucide-react";
import { InteractiveClock, type ClockTime } from "@/components/games/telling-time/interactive-clock";
import { Button } from "@/components/ui/button";

type ActivityId = "wake" | "breakfast" | "school" | "lunch" | "study" | "play" | "read" | "bed";
type Activity = { id: ActivityId; label: string; short: string; time: string; color: string; art: string };

const activities: Activity[] = [
  { id: "wake", label: "Wake up", short: "Wake up", time: "6:00", color: "bg-amber-100", art: "sunrise" },
  { id: "breakfast", label: "Have breakfast", short: "Breakfast", time: "7:00", color: "bg-orange-100", art: "breakfast" },
  { id: "school", label: "Go to school", short: "School", time: "8:00", color: "bg-blue-100", art: "school" },
  { id: "lunch", label: "Have lunch", short: "Lunch", time: "12:00", color: "bg-lime-100", art: "lunch" },
  { id: "study", label: "Study", short: "Study", time: "3:00", color: "bg-violet-100", art: "study" },
  { id: "play", label: "Play", short: "Play", time: "5:00", color: "bg-emerald-100", art: "play" },
  { id: "read", label: "Read", short: "Read", time: "8:00", color: "bg-cyan-100", art: "read" },
  { id: "bed", label: "Go to bed", short: "Bedtime", time: "9:00", color: "bg-indigo-100", art: "bed" }
];

const clockMissions = [
  { activity: "Study", target: { hour: 3, minute: 0 }, sentence: "I study at three o'clock." },
  { activity: "Play", target: { hour: 5, minute: 30 }, sentence: "I play at five thirty." },
  { activity: "Read", target: { hour: 8, minute: 30 }, sentence: "I read at eight thirty." }
];

const initialOrder: ActivityId[] = ["bed", "study", "wake", "play", "breakfast", "lunch", "school", "read"];
const levelNames = ["Wake Up", "Build the Day", "Morning Adventure", "Fix the Day", "Clock Challenge", "My Routine", "Complete"];

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

function sentenceFor(activity: Activity, time = activity.time) {
  const [hourValue, minuteValue] = time.split(":").map(Number);
  const hour = hourValue > 12 ? hourValue - 12 : hourValue || 12;
  const spoken = minuteValue === 0 ? `${hour} o'clock` : minuteValue === 30 ? `${hour} thirty` : `${hour} ${String(minuteValue).padStart(2, "0")}`;
  if (activity.id === "wake") return `I wake up at ${spoken}.`;
  if (activity.id === "breakfast") return `I have breakfast at ${spoken}.`;
  if (activity.id === "school") return `I go to school at ${spoken}.`;
  if (activity.id === "lunch") return `I have lunch at ${spoken}.`;
  if (activity.id === "bed") return `I go to bed at ${spoken}.`;
  return `I ${activity.label.toLowerCase()} at ${spoken}.`;
}

export function DailyRoutineGame() {
  const [studentName, setStudentName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [level, setLevel] = useState(0);
  const [stars, setStars] = useState(0);

  function start() {
    const name = displayName(nameInput);
    if (!name) return;
    setStudentName(name);
    setLevel(1);
  }

  function advance(earned = 2) {
    setStars((value) => value + earned);
    setLevel((value) => Math.min(7, value + 1));
  }

  function reset(keepName: boolean) {
    window.speechSynthesis?.cancel();
    setStars(0);
    if (keepName) setLevel(1);
    else { setStudentName(""); setNameInput(""); setLevel(0); }
  }

  if (!studentName || level === 0) return <StartScreen name={nameInput} setName={setNameInput} onStart={start} />;

  return <Wrapper name={studentName} level={level} stars={stars} onChangeStudent={() => reset(false)}>
    {level === 1 ? <WakeUpLevel name={studentName} onComplete={() => advance(1)} /> : null}
    {level === 2 ? <TimelineLevel onComplete={() => advance(3)} /> : null}
    {level === 3 ? <HomeAdventure name={studentName} onComplete={() => advance(3)} /> : null}
    {level === 4 ? <FixDayLevel onComplete={() => advance(3)} /> : null}
    {level === 5 ? <ClockLevel onComplete={() => advance(3)} /> : null}
    {level === 6 ? <CreateRoutine name={studentName} onComplete={() => advance(5)} /> : null}
    {level === 7 ? <Results name={studentName} stars={stars} onReplay={() => reset(true)} onChangeStudent={() => reset(false)} /> : null}
  </Wrapper>;
}

function StartScreen({ name, setName, onStart }: { name: string; setName: (value: string) => void; onStart: () => void }) {
  const valid = Boolean(name.trim()) && name.trim().length <= 24;
  return <div className="relative overflow-hidden rounded-3xl bg-[linear-gradient(145deg,#1d4ed8,#2563eb_45%,#0f172a)] p-6 text-white shadow-2xl sm:p-10">
    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-300/20 blur-2xl" />
    <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1fr_0.8fr]">
      <div><p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">LEAD presents</p><h1 className="mt-4 font-heading text-4xl font-black sm:text-6xl">Daily Routine<br />Level Up</h1><p className="mt-4 text-lg text-blue-100">Explore, build, speak, and write your own day.</p><p className="mt-3 font-bold text-yellow-300">Speak English with Confidence</p></div>
      <div className="rounded-3xl border border-white/20 bg-white/95 p-6 text-lead-navy shadow-xl"><PlayerCharacter name={displayName(name) || "You"} action="celebrate" /><label className="mt-5 block text-lg font-black">What&apos;s your name?</label><input value={name} maxLength={24} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Type your name here..." autoFocus className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" /><Button onClick={onStart} disabled={!valid} className="mt-4 h-14 w-full text-base">LET&apos;S PLAY!</Button></div>
    </div>
  </div>;
}

function Wrapper({ name, level, stars, onChangeStudent, children }: { name: string; level: number; stars: number; onChangeStudent: () => void; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl">
    <header className="flex flex-wrap items-center justify-between gap-3 bg-lead-navy px-4 py-3 text-white sm:px-6"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">LEAD / Daily Routine</p><p className="font-bold">{name}&apos;s adventure</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{level > 6 ? "Adventure complete" : `Level ${level}/6`} · {stars} stars</span><button onClick={onChangeStudent} className="focus-ring rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><UserRound className="mr-1 inline h-3.5 w-3.5" />Change Student</button></div></header>
    <div className="h-2 bg-slate-100"><div className="h-full bg-gradient-to-r from-lead-blue to-yellow-400 transition-all" style={{ width: `${Math.min(100, (level / 6) * 100)}%` }} /></div>
    <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-lead-gray sm:px-6">{level <= 6 ? `${level}. ${levelNames[level - 1]}` : "Adventure Complete"}</div>
    <div className="p-4 sm:p-6">{children}</div>
  </div>;
}

function WakeUpLevel({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [awake, setAwake] = useState(false);
  return <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><div className="relative min-h-[430px] overflow-hidden rounded-3xl bg-[linear-gradient(#bae6fd_0_38%,#fef3c7_38%)]"><div className="absolute left-8 top-8 h-28 w-32 rounded-2xl border-8 border-white bg-sky-200"><span className="absolute inset-x-0 top-1/2 h-2 bg-white" /><span className="absolute inset-y-0 left-1/2 w-2 bg-white" /></div><div className="absolute bottom-10 left-[12%] h-36 w-[62%] rounded-2xl bg-indigo-200 shadow-xl"><div className="absolute -top-12 left-3 h-16 w-36 rounded-2xl bg-white" /><div className="absolute right-5 top-8"><PlayerCharacter name={name} action={awake ? "wake" : "sleep"} /></div></div><button onClick={() => { setAwake(true); speak("I wake up at six o'clock."); }} className={`focus-ring absolute bottom-20 right-8 grid h-24 w-24 place-items-center rounded-2xl border-4 border-white bg-lead-navy text-white shadow-xl transition ${awake ? "scale-110 bg-emerald-600" : "animate-pulse hover:scale-105"}`}><span className="text-xl font-black">6:00</span><span className="text-[10px] font-bold">ALARM</span></button></div><div className="flex flex-col justify-center rounded-3xl bg-blue-50 p-6"><Guide>Good morning, {name}! Tap the alarm clock to start your day.</Guide>{awake ? <div className="mt-5 rounded-2xl bg-white p-5 shadow-soft"><p className="text-2xl font-black text-lead-navy">I wake up at 6 o&apos;clock.</p><AudioButton text="I wake up at six o'clock." /><Button onClick={onComplete} className="mt-5 w-full">Start My Day <ArrowRight className="h-4 w-4" /></Button></div> : null}</div></section>;
}

function TimelineLevel({ onComplete }: { onComplete: () => void }) {
  const [placements, setPlacements] = useState<Record<string, ActivityId>>({});
  const [selected, setSelected] = useState<ActivityId | null>(null);
  const [message, setMessage] = useState("Drag an activity to its time, or select it and tap a time.");
  const placed = new Set(Object.values(placements));
  function place(slotId: ActivityId, id: ActivityId) {
    const activity = activities.find((item) => item.id === id)!;
    if (activity.id !== slotId) { setMessage(`Almost! Think about when we ${activity.label.toLowerCase()}.`); return; }
    setPlacements((current) => ({ ...current, [slotId]: id })); setSelected(null); setMessage(`Nice! ${sentenceFor(activity)}`); speak(sentenceFor(activity));
  }
  return <section><Guide>{message}</Guide><div className="mt-5 flex flex-wrap gap-3">{activities.filter((item) => !placed.has(item.id)).map((item) => <ActivityCard key={item.id} activity={item} selected={selected === item.id} onClick={() => setSelected(item.id)} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} />)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{activities.map((expected) => { const item = activities.find((activity) => activity.id === placements[expected.id]); return <button key={expected.id} onClick={() => selected && place(expected.id, selected)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => place(expected.id, event.dataTransfer.getData("text/plain") as ActivityId)} className={`focus-ring min-h-28 rounded-2xl border-2 border-dashed p-3 text-left ${item ? "border-emerald-300 bg-emerald-50" : "border-blue-200 bg-slate-50"}`}><span className="text-xl font-black text-lead-blue">{expected.time}</span>{item ? <span className="mt-2 block font-bold text-lead-navy"><RoutineArt kind={item.art} />{item.label}</span> : <span className="mt-2 block text-sm text-lead-gray">Drop activity here</span>}</button>; })}</div>{Object.keys(placements).length === activities.length ? <Button onClick={onComplete} className="mt-6 w-full sm:w-auto">Timeline Complete <Check className="h-4 w-4" /></Button> : null}</section>;
}

function HomeAdventure({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [position, setPosition] = useState({ x: 15, y: 45 });
  const [tasks, setTasks] = useState<string[]>([]);
  const [message, setMessage] = useState("Walk to the kitchen table. Use arrows or WASD, then press SPACE.");
  const move = useCallback((dx: number, dy: number) => setPosition((p) => ({ x: Math.max(5, Math.min(92, p.x + dx)), y: Math.max(14, Math.min(82, p.y + dy)) })), []);
  const interact = useCallback(() => {
    if (Math.hypot(position.x - 52, position.y - 62) < 15 && !tasks.includes("breakfast")) { setTasks(["breakfast"]); setMessage("I have breakfast at 7 o'clock. Now go to the front door."); speak("I have breakfast at seven o'clock."); return; }
    if (Math.hypot(position.x - 89, position.y - 45) < 14 && tasks.includes("breakfast")) { setTasks(["breakfast", "school"]); setMessage(`Great, ${name}! I go to school at 8 o'clock.`); speak("I go to school at eight o'clock."); return; }
    setMessage(tasks.includes("breakfast") ? "Move closer to the blue front door." : "Move closer to the kitchen table.");
  }, [name, position, tasks]);
  useEffect(() => { const down = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"," "].includes(key)) event.preventDefault(); if (key === "arrowup" || key === "w") move(0,-4); if (key === "arrowdown" || key === "s") move(0,4); if (key === "arrowleft" || key === "a") move(-4,0); if (key === "arrowright" || key === "d") move(4,0); if (key === " ") interact(); }; window.addEventListener("keydown", down); return () => window.removeEventListener("keydown", down); }, [interact, move]);
  return <section><Guide>{message}</Guide><div className="relative mt-4 aspect-[16/9] min-h-[360px] overflow-hidden rounded-3xl border-4 border-lead-navy bg-[#fef3c7]"><div className="absolute inset-y-0 left-[34%] w-2 bg-lead-navy/20" /><div className="absolute inset-y-0 left-[70%] w-2 bg-lead-navy/20" /><Room label="BEDROOM" className="left-3 top-3" /><Room label="KITCHEN" className="left-[40%] top-3" /><Room label="HALL" className="right-3 top-3" /><div className="absolute bottom-[18%] left-[45%] h-20 w-24 rounded-full border-8 border-amber-700 bg-orange-100 text-center text-xs font-black leading-[64px]">TABLE</div><div className="absolute right-0 top-[28%] h-36 w-10 rounded-l-xl bg-lead-blue"><span className="absolute -left-24 top-14 text-xs font-black text-lead-blue">FRONT DOOR</span></div><div className="absolute transition-all duration-100" style={{ left: `${position.x}%`, top: `${position.y}%`, transform: "translate(-50%,-50%)" }}><PlayerCharacter name={name} action="walk" compact /></div></div><div className="mt-4 flex items-center justify-center gap-2"><DPad onMove={move} /><Button onClick={interact} variant="secondary" className="h-14">INTERACT / SPACE</Button></div>{tasks.includes("school") ? <Button onClick={onComplete} className="mt-5 w-full">Morning Mission Complete</Button> : null}</section>;
}

function FixDayLevel({ onComplete }: { onComplete: () => void }) {
  const [order, setOrder] = useState(initialOrder);
  const [message, setMessage] = useState("The day is mixed up. Move the activities into a sensible order.");
  const correct = order.every((id, index) => id === activities[index].id);
  function moveItem(index: number, offset: number) { const target = index + offset; if (target < 0 || target >= order.length) return; setOrder((current) => { const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  return <section className="mx-auto max-w-3xl"><Guide>{message}</Guide><div className="mt-5 grid gap-2">{order.map((id,index) => { const activity = activities.find((item) => item.id === id)!; return <div key={id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const from = Number(event.dataTransfer.getData("text/plain")); if (Number.isNaN(from)) return; setOrder((current) => { const next = [...current]; const [item] = next.splice(from,1); next.splice(index,0,item); return next; }); }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 font-black text-lead-blue">{index+1}</span><RoutineArt kind={activity.art} /><span className="flex-1 font-bold text-lead-navy">{activity.label}</span><button onClick={() => moveItem(index,-1)} aria-label={`Move ${activity.label} up`} className="focus-ring rounded-lg p-2 hover:bg-slate-100"><ArrowUp className="h-4 w-4" /></button><button onClick={() => moveItem(index,1)} aria-label={`Move ${activity.label} down`} className="focus-ring rounded-lg p-2 hover:bg-slate-100"><ArrowDown className="h-4 w-4" /></button></div>; })}</div><Button onClick={() => correct ? onComplete() : setMessage("Almost! Begin with waking up and finish with going to bed.")} className="mt-5 w-full">Check My Day</Button></section>;
}

function ClockLevel({ onComplete }: { onComplete: () => void }) {
  const [mission, setMission] = useState(0); const [time,setTime] = useState<ClockTime>({hour:12,minute:0}); const [message,setMessage] = useState("Move both clock hands to set the requested time."); const current = clockMissions[mission];
  function check() { if (time.hour === current.target.hour && time.minute === current.target.minute) { speak(current.sentence); if (mission === clockMissions.length-1) onComplete(); else { setMission((value)=>value+1); setTime({hour:12,minute:0}); setMessage("Excellent! Here is your next clock mission."); } } else setMessage("Almost! Check both the hour hand and minute hand."); }
  return <section className="grid items-center gap-6 lg:grid-cols-2"><div><Guide>{message}</Guide><div className="mt-5 rounded-3xl bg-lead-navy p-6 text-white"><p className="text-sm font-bold uppercase tracking-widest text-yellow-300">Clock mission {mission+1}/3</p><h2 className="mt-3 text-3xl font-black">{current.activity} at {current.target.hour}:{String(current.target.minute).padStart(2,"0")}</h2><p className="mt-3 text-blue-100">Set the analog clock, then check your answer.</p></div><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={()=>setTime((value)=>({ ...value,hour:value.hour===1?12:value.hour-1}))}>Hour -</Button><Button variant="secondary" onClick={()=>setTime((value)=>({ ...value,hour:value.hour===12?1:value.hour+1}))}>Hour +</Button><Button variant="secondary" onClick={()=>setTime((value)=>({ ...value,minute:value.minute===0?30:0}))}>Toggle :00 / :30</Button><Button onClick={check}>Check Time</Button></div></div><div><InteractiveClock {...time} onChange={setTime} /><p className="mt-3 text-center font-heading text-4xl font-black text-lead-navy">{time.hour}:{String(time.minute).padStart(2,"0")}</p></div></section>;
}

function CreateRoutine({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [times,setTimes] = useState<Record<ActivityId,string>>(()=>Object.fromEntries(activities.map((item)=>[item.id,item.time])) as Record<ActivityId,string>); const [writing,setWriting] = useState<Record<ActivityId,string>>(()=>Object.fromEntries(activities.map((item)=>[item.id,sentenceFor(item)])) as Record<ActivityId,string>); const [ready,setReady] = useState(false);
  const ordered = useMemo(()=>[...activities].sort((a,b)=>toMinutes(times[a.id])-toMinutes(times[b.id])),[times]);
  function prepareWriting(){ const next=Object.fromEntries(activities.map((item)=>[item.id,sentenceFor(item,times[item.id])])) as Record<ActivityId,string>; setWriting(next); setReady(true); }
  function listen(){ speak(ordered.map((item)=>writing[item.id]).join(" ")); }
  return <section><Guide>{name}, choose the real times for your activities. This is your routine, so there are no wrong answers.</Guide><div className="mt-5 grid gap-3 sm:grid-cols-2">{activities.map((item)=><label key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"><RoutineArt kind={item.art}/><span className="flex-1 font-bold text-lead-navy">{item.label}</span><input type="time" step={1800} value={times[item.id]} onChange={(event)=>setTimes((current)=>({...current,[item.id]:event.target.value}))} className="focus-ring rounded-lg border border-blue-100 px-3 py-2 font-bold text-lead-blue" /></label>)}</div><Button onClick={prepareWriting} className="mt-5 w-full">Build {name}&apos;s Routine</Button>{ready?<div className="mt-6 rounded-3xl bg-blue-50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-lead-blue">Write About Your Day</p><h2 className="mt-1 font-heading text-2xl font-black text-lead-navy">{name}&apos;s Daily Routine</h2></div><AudioButton text={ordered.map((item)=>writing[item.id]).join(" ")} label="Listen to My Routine" /></div><div className="mt-5 grid gap-3">{ordered.map((item)=><label key={item.id} className="grid gap-2 rounded-xl bg-white p-3"><span className="text-xs font-black uppercase text-lead-gray">{times[item.id]} · {item.label}</span><input value={writing[item.id]} onChange={(event)=>setWriting((current)=>({...current,[item.id]:event.target.value}))} className="focus-ring rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label>)}</div><div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={listen}><Volume2 className="h-4 w-4"/>Listen</Button><Button onClick={onComplete}>Finish My Routine</Button></div></div>:null}</section>;
}

function Results({ name, stars, onReplay, onChangeStudent }: { name:string; stars:number; onReplay:()=>void; onChangeStudent:()=>void }) { return <section className="mx-auto max-w-3xl py-8 text-center"><div className="mx-auto w-fit rounded-full bg-yellow-100 p-5"><PlayerCharacter name={name} action="celebrate" /></div><p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-lead-blue">Daily Routine Complete</p><h2 className="mt-3 font-heading text-4xl font-black text-lead-navy">Amazing work, {name}!</h2><p className="mt-3 text-lg text-lead-gray">You explored, organized, spoke, and wrote about your day.</p><div className="mx-auto mt-6 w-fit rounded-2xl bg-lead-navy px-8 py-4 text-white"><p className="text-sm font-bold text-yellow-300">TIME & ROUTINE CHAMPION</p><p className="mt-1 text-3xl font-black">{stars} stars</p></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={onReplay}><RotateCcw className="h-4 w-4"/>Play Again</Button><Button variant="secondary" onClick={onChangeStudent}><UserRound className="h-4 w-4"/>Change Student</Button></div><p className="mt-8 font-black text-lead-blue">LEAD · Learn English Daily</p><p className="text-sm font-bold text-lead-gray">Speak English with Confidence</p></section>; }

function PlayerCharacter({ name, action, compact=false }: { name:string; action:string; compact?:boolean }) { return <div className={`relative mx-auto ${compact?"w-16":"w-28"}`}><svg viewBox="0 0 120 180" className={`w-full ${action==="walk"?"animate-bounce":""}`} aria-label={`${name}, ${action}`}><circle cx="60" cy="35" r="25" fill="#f2c9a5"/><path d="M34 32Q38 3 64 8Q89 10 87 38Q70 24 34 32" fill="#172554"/><circle cx="51" cy="37" r="3"/><circle cx="70" cy="37" r="3"/><path d="M52 49Q60 56 69 49" fill="none" stroke="#9f503b" strokeWidth="3"/><rect x="31" y="61" width="58" height="68" rx="18" fill="#2563eb"/><text x="60" y="96" textAnchor="middle" fill="white" fontSize="16" fontWeight="900">LEAD</text><path d="M36 126L30 168" stroke="#0f172a" strokeWidth="15" strokeLinecap="round"/><path d="M83 126L89 168" stroke="#0f172a" strokeWidth="15" strokeLinecap="round"/><path d="M31 76L12 119" stroke="#f2c9a5" strokeWidth="12" strokeLinecap="round"/><path d="M88 76L108 119" stroke="#f2c9a5" strokeWidth="12" strokeLinecap="round"/></svg><span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lead-navy px-2 py-0.5 text-[10px] font-black text-white">{name}</span></div>; }
function RoutineArt({kind}:{kind:string}) { const colors:Record<string,string>={sunrise:"#f59e0b",breakfast:"#f97316",school:"#2563eb",lunch:"#84cc16",study:"#7c3aed",play:"#10b981",read:"#0891b2",bed:"#4f46e5"}; return <span className="mr-2 inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{backgroundColor:`${colors[kind]}22`}}><svg viewBox="0 0 40 40" className="h-7 w-7"><circle cx="20" cy="20" r="13" fill={colors[kind]||"#2563eb"}/><path d="M12 20h16M20 12v16" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg></span>; }
function ActivityCard({activity,selected,onClick,onDragStart}:{activity:Activity;selected:boolean;onClick:()=>void;onDragStart:(event:React.DragEvent<HTMLButtonElement>)=>void}) { return <button draggable onDragStart={onDragStart} onClick={onClick} className={`focus-ring flex items-center rounded-2xl border-2 p-3 text-left shadow-sm transition ${selected?"border-lead-blue bg-blue-50":"border-white bg-white hover:border-blue-200"}`}><RoutineArt kind={activity.art}/><span className="font-bold text-lead-navy">{activity.label}</span></button>; }
function Guide({children}:{children:React.ReactNode}) { return <div className="flex items-start gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-lead-blue text-sm font-black text-white">W</span><p className="pt-1 text-sm font-semibold leading-6 text-lead-navy">{children}</p></div>; }
function AudioButton({text,label="Listen"}:{text:string;label?:string}) { return <button onClick={()=>speak(text)} className="focus-ring mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-lead-blue hover:bg-blue-100"><Volume2 className="h-4 w-4"/>{label}</button>; }
function Room({label,className}:{label:string;className:string}) { return <span className={`absolute rounded-lg bg-white/80 px-3 py-1 text-xs font-black text-lead-navy ${className}`}>{label}</span>; }
function DPad({onMove}:{onMove:(dx:number,dy:number)=>void}) { return <div className="grid grid-cols-3 gap-1"><span/><button onClick={()=>onMove(0,-5)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowUp className="h-5 w-5"/></button><span/><button onClick={()=>onMove(-5,0)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowLeft className="h-5 w-5"/></button><button onClick={()=>onMove(0,5)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowDown className="h-5 w-5"/></button><button onClick={()=>onMove(5,0)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowRight className="h-5 w-5"/></button></div>; }
function toMinutes(value:string){ const [hour,minute]=value.split(":").map(Number); return hour*60+minute; }
