"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Mic, RotateCcw, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { answerFor, hobbies, interviewQuestions, introductionFor, npcProfiles, type NpcProfile, type ProfileField } from "@/components/games/profile-quest/game-data";

type StudentProfile = { age: number; hobby: string; school: string };
type GameState = {
  studentName: string;
  profile: StudentProfile;
  level: number;
  target: NpcProfile;
  discovered: ProfileField[];
  stars: number;
};

const levelNames = ["Build Your Profile", "Enter the School", "Interview Mission", "Memory Challenge", "Introduce Your Friend", "Mystery Guest", "Speaking Challenge"];
const defaultProfile: StudentProfile = { age: 10, hobby: "Drawing", school: "" };

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 24).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.84;
  window.speechSynthesis.speak(utterance);
}

function studentIntroduction(name: string, profile: StudentProfile) {
  return `My name is ${name}. I am ${profile.age} years old. My hobby is ${profile.hobby.toLowerCase()}. I study at ${profile.school}.`;
}

export function ProfileQuestGame() {
  const [nameInput, setNameInput] = useState("");
  const [state, setState] = useState<GameState | null>(null);

  function start() {
    const studentName = cleanName(nameInput);
    if (!studentName) return;
    setState({ studentName, profile: defaultProfile, level: 1, target: npcProfiles[0], discovered: [], stars: 0 });
  }

  function advance(stars = 1, changes: Partial<GameState> = {}) {
    setState((current) => current ? { ...current, ...changes, level: Math.min(7, current.level + 1), stars: current.stars + stars } : current);
  }

  function replay(keepStudent: boolean) {
    window.speechSynthesis?.cancel();
    if (!keepStudent) { setState(null); setNameInput(""); return; }
    setState((current) => current ? { studentName: current.studentName, profile: defaultProfile, level: 1, target: npcProfiles[0], discovered: [], stars: 0 } : current);
  }

  if (!state) return <StartScreen name={nameInput} setName={setNameInput} onStart={start} />;

  return (
    <GameShell state={state} onChangeStudent={() => replay(false)}>
      {state.level === 1 ? <ProfileBuilder name={state.studentName} onComplete={(profile) => advance(2, { profile })} /> : null}
      {state.level === 2 ? <SchoolWorld name={state.studentName} onMeet={(target) => advance(2, { target, discovered: [] })} /> : null}
      {state.level === 3 ? <InterviewMission name={state.studentName} profile={state.target} onComplete={(discovered) => advance(3, { discovered })} /> : null}
      {state.level === 4 ? <MemoryChallenge name={state.studentName} profile={state.target} onComplete={() => advance(3)} /> : null}
      {state.level === 5 ? <IntroductionBuilder name={state.studentName} profile={state.target} onComplete={() => advance(3, { target: npcProfiles[3], discovered: [] })} /> : null}
      {state.level === 6 ? <MysteryInterview name={state.studentName} profile={state.target} onComplete={(discovered) => advance(4, { discovered })} /> : null}
      {state.level === 7 ? <SpeakingFinal state={state} onReplay={() => replay(true)} onChangeStudent={() => replay(false)} /> : null}
    </GameShell>
  );
}

function StartScreen({ name, setName, onStart }: { name: string; setName: (value: string) => void; onStart: () => void }) {
  const valid = Boolean(name.trim()) && name.trim().length <= 24;
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_80%_10%,rgba(250,204,21,.3),transparent_24%),linear-gradient(145deg,#0f172a,#1d4ed8_58%,#2563eb)] p-6 text-white shadow-2xl sm:p-10">
      <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div><p className="text-sm font-black uppercase tracking-[.22em] text-yellow-300">LEAD presents</p><h2 className="mt-4 font-heading text-5xl font-black leading-none sm:text-7xl">Profile<br />Quest</h2><p className="mt-4 text-2xl font-extrabold text-blue-100">Meet the Character</p><p className="mt-3 font-bold text-yellow-300">Speak English with Confidence</p><div className="mt-7 flex items-end gap-2"><Character name={cleanName(name) || "You"} shirt="#2563eb" hair="#172554" skin="#e7b98e" pose="celebrate" /><Owl /></div></div>
        <div className="rounded-3xl border border-white/20 bg-white p-6 text-lead-navy shadow-2xl sm:p-8"><p className="text-xs font-black uppercase tracking-[.2em] text-lead-blue">Your adventure starts here</p><label className="mt-4 block font-heading text-2xl font-black">What&apos;s your name?</label><input autoFocus maxLength={24} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Type your name here..." className="focus-ring mt-4 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" /><Button disabled={!valid} onClick={onStart} className="mt-4 h-14 w-full text-base">START QUEST <ArrowRight className="h-5 w-5" /></Button><p className="mt-4 text-center text-sm font-semibold text-slate-500">Create, explore, interview, remember, introduce.</p></div>
      </div>
    </section>
  );
}

function GameShell({ state, onChangeStudent, children }: { state: GameState; onChangeStudent: () => void; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl"><header className="flex flex-wrap items-center justify-between gap-3 bg-lead-navy px-4 py-3 text-white sm:px-6"><div><p className="text-xs font-black uppercase tracking-[.18em] text-yellow-300">LEAD / Profile Quest</p><p className="font-bold">{state.studentName}&apos;s social mission</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">Mission {state.level}/7 · {state.stars} stars</span><button onClick={onChangeStudent} className="focus-ring rounded-lg bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><UserRound className="mr-1 inline h-4 w-4" />Change Student</button></div></header><div className="h-2 bg-slate-100"><div className="h-full bg-gradient-to-r from-blue-600 to-yellow-400 transition-all duration-500" style={{ width: `${state.level / 7 * 100}%` }} /></div><div className="border-b border-slate-100 px-4 py-3 text-sm font-black text-lead-blue sm:px-6">{state.level}. {levelNames[state.level - 1]}</div><div className="p-4 sm:p-6">{children}</div></div>;
}

function ProfileBuilder({ name, onComplete }: { name: string; onComplete: (profile: StudentProfile) => void }) {
  const [age, setAge] = useState(10); const [hobby, setHobby] = useState("Drawing"); const [custom, setCustom] = useState(""); const [school, setSchool] = useState(""); const chosenHobby = custom.trim() || hobby; const ready = school.trim().length >= 2;
  return <section className="grid gap-6 lg:grid-cols-[1fr_.8fr]"><div><Guide>Hi, {name}! Let&apos;s build your profile before we enter the school.</Guide><div className="mt-5 rounded-3xl bg-slate-50 p-5"><label className="font-black text-lead-navy">How old are you? <span className="text-lead-blue">{age}</span></label><input aria-label="Age" type="range" min={7} max={18} value={age} onChange={(event) => setAge(Number(event.target.value))} className="mt-3 w-full accent-blue-600" /><p className="mt-6 font-black text-lead-navy">Choose your hobby</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{hobbies.map((item) => <button key={item} onClick={() => { setHobby(item); setCustom(""); }} className={`focus-ring min-h-12 rounded-xl border-2 px-2 text-sm font-bold ${hobby === item && !custom ? "border-blue-600 bg-blue-50 text-blue-700" : "border-white bg-white text-slate-700"}`}>{item}</button>)}</div><input value={custom} onChange={(event) => setCustom(event.target.value.slice(0, 30))} placeholder="Or type another hobby" className="focus-ring mt-3 h-12 w-full rounded-xl border border-slate-200 px-4" /><label className="mt-6 block font-black text-lead-navy">I study at...</label><input value={school} maxLength={60} onChange={(event) => setSchool(event.target.value)} placeholder="Your school name" className="focus-ring mt-3 h-12 w-full rounded-xl border border-slate-200 px-4" /></div></div><div className="rounded-3xl bg-[linear-gradient(145deg,#dbeafe,#fff)] p-6 text-center"><p className="text-xs font-black uppercase tracking-widest text-blue-600">My Profile</p><Character name={name} shirt="#2563eb" hair="#172554" skin="#e7b98e" pose="point" /><div className="mt-4 rounded-2xl bg-white p-4 text-left font-semibold leading-7 text-slate-700"><p>My name is <strong>{name}</strong>.</p><p>I am <strong>{age}</strong> years old.</p><p>My hobby is <strong>{chosenHobby.toLowerCase()}</strong>.</p><p>I study at <strong>{school || "..."}</strong>.</p></div><AudioButton text={studentIntroduction(name, { age, hobby: chosenHobby, school })} /><Button disabled={!ready || !chosenHobby} onClick={() => onComplete({ age, hobby: chosenHobby, school: school.trim() })} className="mt-4 w-full">Enter the School</Button></div></section>;
}

function SchoolWorld({ name, onMeet }: { name: string; onMeet: (profile: NpcProfile) => void }) {
  const [position, setPosition] = useState({ x: 12, y: 82 }); const [message, setMessage] = useState(`${name}, explore the school and walk close to someone.`);
  const move = useCallback((dx: number, dy: number) => setPosition((current) => ({ x: Math.max(6, Math.min(92, current.x + dx)), y: Math.max(12, Math.min(88, current.y + dy)) })), []);
  const nearby = useMemo(() => npcProfiles.slice(0, 3).find((npc) => Math.hypot(position.x - npc.position.x, position.y - npc.position.y) < 13), [position]);
  const interact = useCallback(() => { if (nearby) onMeet(nearby); else setMessage("Move closer to Alex, Emma, or Leo, then press SPACE or tap MEET."); }, [nearby, onMeet]);
  useEffect(() => { const down = (event: KeyboardEvent) => { const key = event.key.toLowerCase(); if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"," "].includes(key)) event.preventDefault(); if (key === "arrowup" || key === "w") move(0,-4); if (key === "arrowdown" || key === "s") move(0,4); if (key === "arrowleft" || key === "a") move(-4,0); if (key === "arrowright" || key === "d") move(4,0); if (key === " ") interact(); }; window.addEventListener("keydown", down); return () => window.removeEventListener("keydown", down); }, [interact, move]);
  return <section><Guide>{nearby ? `${nearby.name} is nearby. Press SPACE or tap MEET.` : message}</Guide><div className="relative mt-4 min-h-[430px] overflow-hidden rounded-3xl border-4 border-lead-navy bg-[#dcfce7]"><SchoolMap />{npcProfiles.slice(0,3).map((npc) => <div key={npc.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${npc.position.x}%`, top: `${npc.position.y}%` }}><Character name={npc.name} {...npc.colors} compact pose="idle" /></div>)}<div className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-100" style={{ left: `${position.x}%`, top: `${position.y}%` }}><Character name={name} shirt="#2563eb" hair="#172554" skin="#e7b98e" compact pose="walk" /></div></div><div className="mt-4 flex flex-wrap items-center justify-center gap-3"><DPad onMove={move} /><Button onClick={interact} className="h-14">{nearby ? `MEET ${nearby.name.toUpperCase()}` : "MEET / SPACE"}</Button><p className="w-full text-center text-xs font-bold text-slate-500">Desktop: Arrow keys or WASD · Mobile: touch controls</p></div></section>;
}

function InterviewMission({ name, profile, onComplete }: { name: string; profile: NpcProfile; onComplete: (fields: ProfileField[]) => void }) {
  const [asked, setAsked] = useState<ProfileField[]>([]); const [dialogue, setDialogue] = useState(`Hi, ${name}! My name is ${profile.name}.`); const complete = asked.length === 4;
  function ask(field: ProfileField, question: string) { if (asked.includes(field)) { setDialogue("You already wrote that clue in your notebook."); return; } const answer = answerFor(profile, field); setAsked((current) => [...current, field]); setDialogue(answer); speak(`${question} ${answer}`); }
  return <section><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="rounded-3xl bg-blue-50 p-5"><Guide>Ask {profile.name} four questions. Each answer unlocks a notebook clue.</Guide><div className="mt-5 flex items-center justify-center gap-5"><Character name={name} shirt="#2563eb" hair="#172554" skin="#e7b98e" pose="talk" /><div className="max-w-sm rounded-2xl rounded-bl-none bg-white p-4 font-bold text-lead-navy shadow-soft">{dialogue}</div><Character name={profile.name} {...profile.colors} pose="talk" /></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{interviewQuestions.map((item) => <button key={item.field} disabled={asked.includes(item.field)} onClick={() => ask(item.field, item.question)} className="focus-ring min-h-16 rounded-2xl border-2 border-blue-100 bg-white p-3 text-left font-bold text-lead-navy transition hover:border-blue-500 disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700">{asked.includes(item.field) ? <Check className="mr-2 inline h-4 w-4" /> : null}{item.question}</button>)}</div></div><Notebook profile={profile} fields={asked} /></div>{complete ? <div className="mt-5 text-center"><Button onClick={() => onComplete(asked)}>Interview Complete</Button></div> : null}</section>;
}

function MemoryChallenge({ name, profile, onComplete }: { name: string; profile: NpcProfile; onComplete: () => void }) {
  const options: Record<ProfileField, Array<string | number>> = {
    name: [...new Set(["Leo", profile.name, "Emma", "Maya", "Alex"])].slice(0, 4),
    age: [...new Set([9, 11, profile.age, 12, 10])].slice(0, 4),
    hobby: [...new Set(["Reading", "Swimming", profile.hobby, "Drawing", "Football"])].slice(0, 4),
    school: [...new Set(["Sunshine School", "Blue Sky School", profile.school, "Bright Future School", "Green School"])].slice(0, 4)
  };
  const [answers, setAnswers] = useState<Partial<Record<ProfileField,string>>>({}); const [checked, setChecked] = useState(false); const correct = answers.name === profile.name && answers.age === String(profile.age) && answers.hobby === profile.hobby && answers.school === profile.school;
  function check() { setChecked(true); if (correct) speak(`Excellent, ${name}! You remembered ${profile.name}.`); }
  return <section className="mx-auto max-w-4xl"><Guide>{name}, can you remember {profile.name}? The notebook is closed. Rebuild the profile from memory.</Guide><div className="mt-5 grid gap-4 sm:grid-cols-2">{interviewQuestions.map(({field}) => <fieldset key={field} className="rounded-2xl border-2 border-slate-100 p-4"><legend className="px-2 font-black capitalize text-lead-navy">{field}</legend><div className="grid grid-cols-2 gap-2">{options[field].map((option) => <button key={option} onClick={() => { setAnswers((current) => ({...current,[field]:String(option)})); setChecked(false); }} className={`focus-ring min-h-12 rounded-xl border-2 px-2 text-sm font-bold ${answers[field] === String(option) ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-100 bg-white"}`}>{option}</button>)}</div></fieldset>)}</div>{checked && !correct ? <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-center font-bold text-amber-800">Not quite. Think back to the interview and try again.</p> : null}<div className="mt-5 text-center">{checked && correct ? <Button onClick={onComplete}>Memory Mission Complete <Check className="h-4 w-4" /></Button> : <Button disabled={Object.keys(answers).length < 4} onClick={check}>Check My Memory</Button>}</div></section>;
}

function IntroductionBuilder({ name, profile, onComplete }: { name: string; profile: NpcProfile; onComplete: () => void }) {
  const correct = introductionFor(profile); const [order, setOrder] = useState([correct[2], correct[0], correct[3], correct[1]]); const [checked, setChecked] = useState(false); const solved = order.every((sentence,index) => sentence === correct[index]);
  function shift(index: number, offset: number) { const target = index + offset; if (target < 0 || target >= order.length) return; setOrder((current) => { const next = [...current]; [next[index],next[target]] = [next[target],next[index]]; return next; }); setChecked(false); }
  return <section className="mx-auto max-w-4xl"><Guide>Now, {name}, introduce {profile.name} to the class. Put the sentences in a clear order.</Guide><div className="mt-5 grid gap-3">{order.map((sentence,index) => <div key={sentence} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 font-black text-white">{index+1}</span><p className="flex-1 font-bold text-lead-navy">{sentence}</p><div className="flex gap-1"><button aria-label="Move sentence up" onClick={() => shift(index,-1)} className="focus-ring grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><ArrowUp className="h-4 w-4" /></button><button aria-label="Move sentence down" onClick={() => shift(index,1)} className="focus-ring grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><ArrowDown className="h-4 w-4" /></button></div></div>)}</div>{checked && !solved ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center font-bold text-amber-800">Start by saying who your friend is.</p> : null}<div className="mt-5 flex flex-wrap justify-center gap-3"><AudioButton text={correct.join(" ")} />{checked && solved ? <Button onClick={onComplete}>Meet the Mystery Guest</Button> : <Button onClick={() => setChecked(true)}>Check Introduction</Button>}</div></section>;
}

function MysteryInterview({ name, profile, onComplete }: { name: string; profile: NpcProfile; onComplete: (fields: ProfileField[]) => void }) {
  const missionOrder: ProfileField[] = ["age","school","hobby","name"]; const [found,setFound] = useState<ProfileField[]>([]); const [message,setMessage] = useState("I am the Mystery Guest. Ask me something!"); const needed = missionOrder[found.length]; const prompts: Record<ProfileField,string> = { name:"Ask something to learn their name.", age:"Ask something to learn their age.", hobby:"Ask something to learn their hobby.", school:"Ask something to learn their school." };
  function ask(field: ProfileField) { if (field !== needed) { setMessage("That is a useful question, but it does not find the clue you need now."); return; } const answer = answerFor(profile,field); const next = [...found,field]; setFound(next); setMessage(answer); speak(answer); }
  return <section><Guide>{found.length < 4 ? prompts[needed] : `Excellent interview, ${name}! You found every mystery clue.`}</Guide><div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]"><div className="rounded-3xl bg-[linear-gradient(145deg,#ede9fe,#dbeafe)] p-5"><div className="flex items-center justify-center gap-5"><Character name="?" {...profile.colors} pose="think" /><div className="max-w-sm rounded-2xl bg-white p-4 font-bold text-lead-navy shadow-soft">{message}</div></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{interviewQuestions.map((question) => <button key={question.field} disabled={found.includes(question.field)} onClick={() => ask(question.field)} className="focus-ring min-h-14 rounded-xl border-2 border-white bg-white p-3 text-left font-bold text-lead-navy hover:border-blue-500 disabled:bg-emerald-50 disabled:text-emerald-700">{question.question}</button>)}</div></div><Notebook profile={profile} fields={found} maskName /></div>{found.length === 4 ? <div className="mt-5 text-center"><Button onClick={() => onComplete(found)}>Prepare My Presentation</Button></div> : null}</section>;
}

function SpeakingFinal({ state, onReplay, onChangeStudent }: { state: GameState; onReplay: () => void; onChangeStudent: () => void }) {
  const sentences = introductionFor(state.target); const [practicing,setPracticing] = useState(false);
  function practice() { setPracticing(true); speak(sentences.join(" ")); window.setTimeout(() => setPracticing(false), 4500); }
  return <section className="relative overflow-hidden rounded-3xl bg-[linear-gradient(#dbeafe_0_58%,#d4a574_58%)] px-4 py-8 text-center sm:px-8"><div className="absolute left-4 top-4 rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-blue-700">LEAD CLASSROOM</div><p className="text-sm font-black uppercase tracking-[.2em] text-blue-700">Final speaking challenge</p><h2 className="mt-3 font-heading text-4xl font-black text-lead-navy">Speaking Mission Complete!</h2><p className="mt-2 text-lg font-bold text-slate-700">Fantastic work, {state.studentName}!</p><div className="mx-auto mt-6 flex max-w-3xl items-end justify-center gap-4"><div className="hidden sm:block"><Audience /></div><div className="rounded-3xl bg-white p-5 shadow-xl"><Character name={state.target.name} {...state.target.colors} pose="idle" /><div className="mt-3 text-left font-bold leading-7 text-lead-navy">{sentences.map((sentence) => <p key={sentence}>{sentence}</p>)}</div></div><Character name={state.studentName} shirt="#2563eb" hair="#172554" skin="#e7b98e" pose={practicing ? "talk" : "point"} /></div><div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-2 text-left text-sm font-bold text-slate-700 sm:grid-cols-4">{["Built your profile","Interviewed a friend","Remembered 4 clues","Presented in English"].map((item) => <p key={item} className="rounded-xl bg-white/80 p-3"><Check className="mr-1 inline h-4 w-4 text-emerald-600" />{item}</p>)}</div><div className="mt-6 flex flex-wrap justify-center gap-3"><Button onClick={() => speak(sentences.join(" "))} variant="secondary"><Volume2 className="h-4 w-4" />Listen Again</Button><Button onClick={practice}><Mic className="h-4 w-4" />Practice Speaking</Button><Button onClick={onReplay} variant="secondary"><RotateCcw className="h-4 w-4" />Play Again</Button><Button onClick={onChangeStudent} variant="secondary"><UserRound className="h-4 w-4" />Change Student</Button></div><p className="mt-8 font-black text-blue-700">LEAD · Learn English Daily</p><p className="text-sm font-bold text-slate-600">Speak English with Confidence</p></section>;
}

function Notebook({ profile, fields, maskName = false }: { profile: NpcProfile; fields: ProfileField[]; maskName?: boolean }) { const show = (field:ProfileField,value:string|number) => fields.includes(field) ? value : "Not discovered"; return <aside className="rounded-3xl border-2 border-amber-200 bg-[#fffbeb] p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-amber-700">Interview Notes</p><h3 className="mt-2 font-heading text-2xl font-black text-lead-navy">{maskName && !fields.includes("name") ? "Mystery Guest" : profile.name}</h3><div className="mt-5 grid gap-3">{(["name","age","hobby","school"] as ProfileField[]).map((field) => { const value = field === "name" ? profile.name : field === "age" ? profile.age : field === "hobby" ? profile.hobby : profile.school; return <div key={field} className={`rounded-xl p-3 ${fields.includes(field) ? "bg-emerald-50" : "bg-white/80"}`}><p className="text-[10px] font-black uppercase text-slate-500">{field}</p><p className="mt-1 font-bold text-lead-navy">{show(field,value)} {fields.includes(field) ? <Check className="inline h-4 w-4 text-emerald-600" /> : null}</p></div>; })}</div></aside>; }

function Guide({ children }: { children: React.ReactNode }) { return <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4"><Owl compact /><p className="font-semibold leading-6 text-lead-navy">{children}</p></div>; }
function AudioButton({ text }: { text: string }) { return <button onClick={() => speak(text)} className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"><Volume2 className="h-4 w-4" />Listen</button>; }
function DPad({ onMove }: { onMove: (dx:number,dy:number) => void }) { return <div className="grid grid-cols-3 gap-1"><span /><button aria-label="Move up" onClick={() => onMove(0,-5)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowUp /></button><span /><button aria-label="Move left" onClick={() => onMove(-5,0)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowLeft /></button><button aria-label="Move down" onClick={() => onMove(0,5)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowDown /></button><button aria-label="Move right" onClick={() => onMove(5,0)} className="focus-ring grid h-11 w-11 place-items-center rounded-lg bg-lead-navy text-white"><ArrowRight /></button></div>; }

function SchoolMap() { return <div className="absolute inset-0"><div className="absolute inset-x-0 top-0 h-[36%] bg-sky-200" /><div className="absolute left-[4%] top-[8%] h-[28%] w-[28%] rounded-t-2xl border-4 border-blue-800 bg-blue-100"><span className="absolute inset-x-0 top-2 text-center text-xs font-black text-blue-900">LIBRARY</span><div className="absolute bottom-0 left-[42%] h-14 w-10 bg-amber-700" /></div><div className="absolute right-[5%] top-[8%] h-[28%] w-[30%] rounded-t-2xl border-4 border-rose-800 bg-rose-100"><span className="absolute inset-x-0 top-2 text-center text-xs font-black text-rose-900">CLASSROOM</span><div className="absolute bottom-0 left-[42%] h-14 w-10 bg-amber-700" /></div><div className="absolute inset-x-0 bottom-0 h-[64%] bg-emerald-200" /><div className="absolute inset-y-[35%] left-[38%] w-[24%] bg-stone-200" /><div className="absolute bottom-[8%] left-[6%] rounded-xl bg-green-700 px-4 py-2 text-xs font-black text-white">PLAYGROUND</div><div className="absolute bottom-[5%] right-[5%] h-24 w-32 rounded-xl border-8 border-white bg-orange-300" /><div className="absolute left-[39%] top-[38%] rounded-lg bg-white/80 px-3 py-1 text-xs font-black text-slate-700">HALLWAY</div></div>; }

function Character({ name, shirt, hair, skin, pose, compact = false }: { name:string; shirt:string; hair:string; skin:string; pose:string; compact?:boolean }) { const talk = pose === "talk"; const celebrate = pose === "celebrate"; return <div className={`relative mx-auto ${compact ? "w-14" : "w-24"}`}><svg viewBox="0 0 120 180" className={`w-full ${pose === "walk" ? "animate-[bounce_1s_infinite]" : ""}`} role="img" aria-label={`${name}, ${pose}`}><circle cx="60" cy="35" r="25" fill={skin}/><path d="M34 33Q36 5 63 7Q88 9 87 38Q68 23 34 33" fill={hair}/><circle cx="51" cy="37" r="3" fill="#172554"/><circle cx="70" cy="37" r="3" fill="#172554"/><path d={talk ? "M52 48Q60 59 69 48" : "M52 49Q60 55 69 49"} fill="none" stroke="#9f503b" strokeWidth="3"/><rect x="31" y="61" width="58" height="68" rx="18" fill={shirt}/><text x="60" y="95" textAnchor="middle" fill="white" fontSize="14" fontWeight="900">LEAD</text><path d="M38 126L31 168M82 126L89 168" stroke="#0f172a" strokeWidth="15" strokeLinecap="round"/><path d={celebrate ? "M36 76L15 35" : "M36 76L15 117"} stroke={skin} strokeWidth="12" strokeLinecap="round"/><path d={celebrate ? "M85 76L105 35" : pose === "point" ? "M85 76L112 82" : "M85 76L105 117"} stroke={skin} strokeWidth="12" strokeLinecap="round"/></svg><span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lead-navy px-2 py-0.5 text-[10px] font-black text-white">{name}</span></div>; }
function Owl({ compact = false }: { compact?:boolean }) { return <svg viewBox="0 0 90 90" className={compact ? "h-12 w-12 shrink-0" : "h-24 w-24"} role="img" aria-label="Wisey the LEAD owl"><path d="M18 28L8 8l25 12M72 28L82 8 57 20" fill="#2563eb"/><ellipse cx="45" cy="50" rx="32" ry="34" fill="#2563eb"/><circle cx="32" cy="42" r="14" fill="white"/><circle cx="58" cy="42" r="14" fill="white"/><circle cx="32" cy="43" r="5" fill="#0f172a"/><circle cx="58" cy="43" r="5" fill="#0f172a"/><path d="M39 54l6 8 6-8z" fill="#facc15"/><path d="M27 69q18 12 36 0" fill="none" stroke="#facc15" strokeWidth="4"/><text x="45" y="79" textAnchor="middle" fill="white" fontSize="9" fontWeight="900">WISEY</text></svg>; }
function Audience() { return <svg viewBox="0 0 180 120" className="w-44" aria-label="Classroom audience"><rect y="75" width="180" height="45" rx="12" fill="#92400e"/>{[30,75,120,155].map((x,index) => <g key={x}><circle cx={x} cy={42 + index%2*8} r="16" fill={index%2 ? "#d99b72" : "#f1c7a5"}/><path d={`M${x-17} ${40+index%2*8}q3-20 18-18q16 2 16 20`} fill={index%2 ? "#1e293b" : "#713f12"}/><rect x={x-18} y={58+index%2*8} width="36" height="35" rx="10" fill={["#16a34a","#db2777","#7c3aed","#0891b2"][index]}/></g>)}</svg>; }
