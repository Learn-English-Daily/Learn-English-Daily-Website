"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion, type PanInfo } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Backpack, BookOpen, Check, GraduationCap, Lightbulb, RotateCcw, Search, Sparkles, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aliStory, correctWords, emmaStory, mixedWords, storyChoices, type ReadingStory } from "@/components/games/reading-detective/reading-stories";

const levelNames = ["Mixed-up Words", "Build the Story", "Explore the Story", "Find the Evidence", "Clue Mission", "New Case", "Complete a Story"];

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 24).replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function speak(text: string, onStart?: () => void, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = "en-US";
  voice.rate = 0.82;
  voice.onstart = () => onStart?.();
  voice.onend = () => onEnd?.();
  window.speechSynthesis.speak(voice);
}

export function ReadingDetectiveGame() {
  const [studentName, setStudentName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [level, setLevel] = useState(0);
  const [stars, setStars] = useState(0);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function start() {
    const name = cleanName(nameInput);
    if (!name) return;
    setStudentName(name);
    setNameInput(name);
    setLevel(1);
  }

  function advance(earned: number) {
    setStars((value) => value + earned);
    setLevel((value) => Math.min(8, value + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset(keepStudent: boolean) {
    window.speechSynthesis?.cancel();
    setStars(0);
    if (keepStudent) setLevel(1);
    else {
      setStudentName("");
      setNameInput("");
      setLevel(0);
    }
  }

  if (!studentName || level === 0) {
    return <GameStartScreen name={nameInput} setName={setNameInput} onStart={start} />;
  }

  return (
    <GameShell name={studentName} level={level} stars={stars} onChangeStudent={() => reset(false)}>
      {level === 1 ? <MixedWordsLevel name={studentName} onComplete={() => advance(2)} /> : null}
      {level === 2 ? <StoryBuilder story={aliStory} onComplete={() => advance(3)} /> : null}
      {level === 3 ? <ReadingScene name={studentName} onComplete={() => advance(3)} /> : null}
      {level === 4 ? <ClueHunt story={aliStory} name={studentName} onComplete={() => advance(3)} /> : null}
      {level === 5 ? <ComprehensionMission name={studentName} onComplete={() => advance(3)} /> : null}
      {level === 6 ? <ReadingChallenge name={studentName} onComplete={() => advance(4)} /> : null}
      {level === 7 ? <StoryCompletion name={studentName} onComplete={() => advance(4)} /> : null}
      {level === 8 ? <GameResults name={studentName} stars={stars} onReplay={() => reset(true)} onChangeStudent={() => reset(false)} /> : null}
    </GameShell>
  );
}

function GameStartScreen({ name, setName, onStart }: { name: string; setName: (value: string) => void; onStart: () => void }) {
  const valid = name.trim().length > 0 && name.trim().length <= 24;
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_80%_10%,#3b82f6_0%,transparent_28%),linear-gradient(145deg,#0f172a,#1d4ed8)] p-5 text-white shadow-2xl sm:p-10">
      <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-yellow-300/20 blur-2xl" />
      <div className="relative mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="font-black uppercase tracking-[.2em] text-yellow-300">LEAD presents</p>
          <h2 className="mt-4 font-heading text-5xl font-black leading-none sm:text-7xl">Reading<br />Detective</h2>
          <p className="mt-4 font-heading text-2xl font-bold text-blue-100">Find the Story!</p>
          <div className="mt-7 flex items-center gap-4"><Wisey compact /><p className="max-w-sm text-lg leading-7 text-blue-100">Find words, rebuild stories, and uncover every clue.</p></div>
          <p className="mt-6 font-bold text-yellow-300">Speak English with Confidence</p>
        </div>
        <div className="rounded-3xl border border-white/20 bg-white p-5 text-lead-navy shadow-xl sm:p-7">
          <PlayerCharacter name={cleanName(name) || "Detective"} action="reading" />
          <label htmlFor="detective-name" className="mt-4 block text-lg font-black">What&apos;s your name?</label>
          <input id="detective-name" value={name} maxLength={24} autoFocus onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && valid && onStart()} placeholder="Type your name here..." className="focus-ring mt-3 h-14 w-full rounded-xl border-2 border-blue-100 px-4 text-lg font-bold" />
          {!valid && name.length > 0 ? <p className="mt-2 text-sm font-bold text-rose-600">Please enter 24 characters or fewer.</p> : null}
          <Button onClick={onStart} disabled={!valid} className="mt-4 h-14 w-full bg-yellow-400 text-base text-slate-950 hover:bg-yellow-300">LET&apos;S READ! <BookOpen className="h-5 w-5" /></Button>
        </div>
      </div>
    </section>
  );
}

function GameShell({ name, level, stars, onChangeStudent, children }: { name: string; level: number; stars: number; onChangeStudent: () => void; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-xl">
    <header className="bg-lead-navy px-4 py-4 text-white sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-lead-blue font-black text-yellow-300">L</span><div><p className="text-xs font-black uppercase tracking-[.18em] text-yellow-300">LEAD / Reading Detective</p><p className="font-bold">Detective {name}</p></div></div><div className="flex items-center gap-2"><span className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">{stars} stars</span><button onClick={onChangeStudent} className="focus-ring rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"><UserRound className="mr-1 inline h-4 w-4" />Change Student</button></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-yellow-300 transition-all duration-500" style={{ width: `${Math.min(100, (level / 7) * 100)}%` }} /></div></header>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-sm font-bold text-lead-gray sm:px-6"><span>{level <= 7 ? `Case ${level}/7: ${levelNames[level - 1]}` : "Reading Mission Complete"}</span><span>{level <= 7 ? `${Math.round((level / 7) * 100)}% investigated` : "All clues found"}</span></div>
    <main className="min-h-[620px] bg-[linear-gradient(135deg,#f8fafc,#eff6ff_58%,#fefce8)] p-4 sm:p-6">{children}</main>
  </div>;
}

function MixedWordsLevel({ name, onComplete }: { name: string; onComplete: () => void }) {
  return <SortableMission title={`${name}, the first sentence is mixed up!`} instruction="Drag the word tiles into the correct order. You can also select a tile and use its arrow controls." initial={mixedWords} correct={correctWords} render={(word) => word} success={`Great job, ${name}! This is Ali. He is ten.`} onComplete={onComplete} />;
}

function StoryBuilder({ story, onComplete }: { story: ReadingStory; onComplete: () => void }) {
  const initial = story.mixedSentenceOrder.map((index) => story.sentences[index]);
  return <SortableMission title="Build the secret story" instruction="The pages fell out of order. Arrange the sentences so the story makes sense." initial={initial} correct={story.sentences} render={(sentence) => sentence} success="The story is back together! Read it from beginning to end." onComplete={onComplete} showStory />;
}

function SortableMission({ title, instruction, initial, correct, render, success, onComplete, showStory = false }: { title: string; instruction: string; initial: string[]; correct: string[]; render: (value: string) => React.ReactNode; success: string; onComplete: () => void; showStory?: boolean }) {
  const [items, setItems] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState(instruction);
  const [solved, setSolved] = useState(false);
  function move(from: number, to: number) { if (to < 0 || to >= items.length || from === to) return; setItems((current) => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }); setSelected(to); }
  function finishPointerDrag(from: number, info: PanInfo) {
    const target = document.elementsFromPoint(info.point.x, info.point.y).find((element) => element instanceof HTMLElement && element.dataset.sortIndex);
    const to = target instanceof HTMLElement ? Number(target.dataset.sortIndex) : Number.NaN;
    if (!Number.isNaN(to)) move(from, to);
  }
  function choose(index: number) { if (selected === null) setSelected(index); else { move(selected, index); setSelected(null); } }
  function check() { const isCorrect = items.every((item, index) => item === correct[index]); setSolved(isCorrect); setMessage(isCorrect ? success : "Not quite yet. Read the pieces aloud and look for the beginning."); if (isCorrect) speak(correct.join(" ")); }
  return <section className="mx-auto max-w-4xl"><Guide>{message}</Guide><h2 className="mt-6 font-heading text-3xl font-black text-lead-navy">{title}</h2><p className="mt-2 text-lead-gray">{instruction}</p><div className={`mt-6 ${showStory ? "grid gap-3" : "flex min-h-28 flex-wrap content-start gap-3"}`} aria-label="Sortable story pieces">{items.map((item, index) => <motion.div key={`${item}-${index}`} data-sort-index={index} drag={solved ? false : showStory ? "y" : true} dragSnapToOrigin dragElastic={0.12} whileDrag={{ scale: 1.05, zIndex: 30 }} onDragEnd={(_, info) => finishPointerDrag(index, info)} className={`group flex touch-none items-center gap-2 rounded-2xl border-2 p-3 shadow-sm transition ${solved ? "border-emerald-300 bg-emerald-50" : selected === index ? "border-yellow-400 bg-yellow-50 ring-4 ring-yellow-100" : "border-blue-100 bg-white hover:border-blue-300"}`}><button disabled={solved} onClick={() => choose(index)} className="focus-ring min-h-11 flex-1 cursor-grab text-left font-bold text-lead-navy active:cursor-grabbing"><span className="mr-3 inline-grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-xs text-lead-blue">{index + 1}</span>{render(item)}</button><div className="flex shrink-0"><button disabled={solved || index === 0} onClick={() => move(index, index - 1)} aria-label={`Move ${item} earlier`} className="focus-ring rounded-lg p-2 hover:bg-blue-50">{showStory ? <ArrowUp className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}</button><button disabled={solved || index === items.length - 1} onClick={() => move(index, index + 1)} aria-label={`Move ${item} later`} className="focus-ring rounded-lg p-2 hover:bg-blue-50">{showStory ? <ArrowDown className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}</button></div></motion.div>)}</div><div className="mt-6 flex flex-wrap gap-3"><Button onClick={check} disabled={solved}><Check className="h-4 w-4" />Check My Story</Button>{solved ? <><AudioButton text={correct.join(" ")} /><Button onClick={onComplete}>Next Case <ArrowRight className="h-4 w-4" /></Button></> : null}</div></section>;
}

function ReadingScene({ name, onComplete }: { name: string; onComplete: () => void }) {
  const discoveries = [
    { id: "ali", label: "Ali", sentence: "This is Ali. He is ten.", icon: <PlayerCharacter name="Ali" compact action="idle" /> },
    { id: "school", label: "School", sentence: "Ali likes school.", icon: <GraduationCap className="h-14 w-14 text-blue-700" /> },
    { id: "bag", label: "Blue bag", sentence: "Ali has a blue bag.", icon: <Backpack className="h-14 w-14 text-blue-600" /> },
    { id: "books", label: "Books", sentence: "Ali reads books every day.", icon: <BookOpen className="h-14 w-14 text-amber-700" /> }
  ];
  const [found, setFound] = useState<string[]>([]);
  const [message, setMessage] = useState(`${name}, explore the picture. Every object hides part of the story.`);
  function discover(id: string, sentence: string) { setFound((current) => current.includes(id) ? current : [...current, id]); setMessage(sentence); speak(sentence); }
  return <section><Guide>{message}</Guide><div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="relative min-h-[430px] overflow-hidden rounded-3xl border-4 border-white bg-[linear-gradient(#bae6fd_0_55%,#86efac_55%)] shadow-lg"><div className="absolute left-[8%] top-[12%] h-40 w-44 rounded-t-[3rem] bg-blue-200"><div className="absolute inset-x-0 bottom-0 h-24 bg-blue-600" /><div className="absolute bottom-0 left-[38%] h-16 w-12 bg-white" /><span className="absolute left-4 top-4 font-black text-blue-900">SCHOOL</span></div><div className="relative z-10 grid h-full min-h-[430px] grid-cols-2 content-end gap-4 p-5 sm:grid-cols-4">{discoveries.map((item) => <button key={item.id} onClick={() => discover(item.id, item.sentence)} className={`focus-ring flex min-h-32 flex-col items-center justify-center rounded-2xl border-4 bg-white/95 p-3 shadow-lg transition hover:-translate-y-2 ${found.includes(item.id) ? "border-yellow-400" : "border-white"}`}>{item.icon}<span className="mt-2 text-sm font-black text-lead-navy">{found.includes(item.id) ? item.label : "Investigate"}</span></button>)}</div></div><div className="rounded-3xl bg-white p-5 shadow-lg"><p className="text-xs font-black uppercase tracking-widest text-lead-blue">Detective&apos;s notebook</p><StoryParagraph story={aliStory} /><p className="mt-5 font-bold text-lead-navy">Clues discovered: {found.length}/4</p><div className="mt-2 flex gap-2">{discoveries.map((item) => <span key={item.id} className={`h-3 flex-1 rounded-full ${found.includes(item.id) ? "bg-yellow-400" : "bg-slate-200"}`} />)}</div>{found.length === discoveries.length ? <Button onClick={onComplete} className="mt-6 w-full">Scene Investigated <Search className="h-4 w-4" /></Button> : null}</div></div></section>;
}

function ClueHunt({ story, name, onComplete }: { story: ReadingStory; name: string; onComplete: () => void }) {
  const [step, setStep] = useState(0); const [wrong, setWrong] = useState<number | null>(null);
  const clue = story.evidence[step];
  function inspect(index: number) { if (index !== clue.sentenceIndex) { setWrong(index); return; } setWrong(null); speak(clue.answer); if (step === story.evidence.length - 1) onComplete(); else setStep((value) => value + 1); }
  return <section className="mx-auto max-w-4xl"><Guide>{name}, find the answer inside the story. Click the sentence that proves it.</Guide><div className="mt-6 rounded-3xl bg-lead-navy p-5 text-white"><p className="text-xs font-black uppercase tracking-widest text-yellow-300">Evidence {step + 1}/3</p><h2 className="mt-2 text-2xl font-black">{clue.prompt}</h2></div><div className="mt-5 grid gap-3">{story.sentences.map((sentence, index) => <button key={sentence} onClick={() => inspect(index)} className={`focus-ring min-h-16 rounded-2xl border-2 p-4 text-left text-lg font-bold transition ${wrong === index ? "border-rose-300 bg-rose-50 text-rose-700" : "border-blue-100 bg-white text-lead-navy hover:border-yellow-400 hover:bg-yellow-50"}`}>{sentence}</button>)}</div>{wrong !== null ? <p className="mt-4 font-bold text-rose-700">That sentence is true, but it does not answer this clue. Look again.</p> : null}</section>;
}

function ComprehensionMission({ name, onComplete }: { name: string; onComplete: () => void }) {
  const targets = [0, 1, 4]; const labels = ["Name", "Age", "Important detail"]; const answers = ["Ali", "10 years old", "Reads every day"];
  const [step, setStep] = useState(0); const [unlocked, setUnlocked] = useState<number[]>([]); const [message, setMessage] = useState(`${name}, unlock three clue files by finding the matching sentence.`);
  function inspect(index: number) { if (index !== targets[step]) { setMessage("That is useful evidence, but another sentence unlocks this clue."); return; } const next = [...unlocked, step]; setUnlocked(next); setMessage(`${name} found clue ${step + 1}: ${answers[step]}!`); speak(answers[step]); if (step < 2) setStep(step + 1); }
  return <section><Guide>{message}</Guide><div className="mt-5 grid gap-3 sm:grid-cols-3">{labels.map((label, index) => <div key={label} className={`rounded-2xl border-2 p-4 ${unlocked.includes(index) ? "border-yellow-400 bg-yellow-50" : index === step ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white opacity-70"}`}><Search className="h-7 w-7 text-lead-blue" /><p className="mt-2 text-xs font-black uppercase tracking-wider text-lead-gray">Clue {index + 1}</p><p className="font-black text-lead-navy">{label}</p><p className="mt-2 text-sm font-bold text-emerald-700">{unlocked.includes(index) ? answers[index] : "Locked"}</p></div>)}</div><div className="mt-6 grid gap-5 lg:grid-cols-[.7fr_1.3fr]"><PlayerCharacter name={name} action={unlocked.length === 3 ? "celebrate" : "thinking"} /><div className="grid gap-3">{aliStory.sentences.map((sentence, index) => <button key={sentence} onClick={() => unlocked.length < 3 && inspect(index)} disabled={unlocked.length === 3} className="focus-ring rounded-2xl border-2 border-blue-100 bg-white p-4 text-left text-lg font-bold text-lead-navy hover:border-yellow-400 disabled:opacity-60">{sentence}</button>)}</div></div>{unlocked.length === 3 ? <Button onClick={onComplete} className="mt-6 w-full">All Clues Unlocked <Sparkles className="h-4 w-4" /></Button> : null}</section>;
}

function ReadingChallenge({ name, onComplete }: { name: string; onComplete: () => void }) {
  const initial = useMemo(() => emmaStory.mixedSentenceOrder.map((index) => emmaStory.sentences[index]), []);
  const [order, setOrder] = useState(initial); const [phase, setPhase] = useState<"arrange" | "read" | "evidence">("arrange"); const [step, setStep] = useState(0); const [message, setMessage] = useState(`${name}, a new case has arrived. Put Emma's story in order.`);
  function move(from: number, to: number) { if (to < 0 || to >= order.length) return; setOrder((current) => { const next = [...current]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }); }
  function checkOrder() { if (order.every((item, index) => item === emmaStory.sentences[index])) { setPhase("read"); setMessage("Excellent. Read or listen to Emma's complete story."); } else setMessage("The case is not solved yet. Which sentence introduces Emma?"); }
  function inspect(index: number) { const clue = emmaStory.evidence[step]; if (index !== clue.sentenceIndex) { setMessage("Look back at the question and find stronger evidence."); return; } speak(clue.answer); if (step === 2) onComplete(); else { setStep(step + 1); setMessage("Evidence found! Now investigate the next question."); } }
  return <section><Guide>{message}</Guide>{phase === "arrange" ? <><div className="mt-5 grid gap-3">{order.map((sentence, index) => <div key={sentence} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => move(Number(event.dataTransfer.getData("text/plain")), index)} className="flex items-center gap-2 rounded-2xl border-2 border-blue-100 bg-white p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 font-black text-lead-blue">{index + 1}</span><span className="flex-1 text-lg font-bold text-lead-navy">{sentence}</span><button onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${sentence} up`} className="focus-ring p-2"><ArrowUp className="h-4 w-4" /></button><button onClick={() => move(index, index + 1)} disabled={index === order.length - 1} aria-label={`Move ${sentence} down`} className="focus-ring p-2"><ArrowDown className="h-4 w-4" /></button></div>)}</div><Button onClick={checkOrder} className="mt-5">Check Emma&apos;s Story</Button></> : <><div className="mt-5 rounded-3xl border border-blue-100 bg-white p-5 sm:p-7"><StoryParagraph story={emmaStory} /><AudioButton text={emmaStory.sentences.join(" ")} /></div>{phase === "read" ? <Button onClick={() => { setPhase("evidence"); setMessage("Find each answer in Emma's story."); }} className="mt-5">Start Evidence Hunt</Button> : <div className="mt-5"><h2 className="text-2xl font-black text-lead-navy">{emmaStory.evidence[step].prompt}</h2><div className="mt-3 grid gap-2">{emmaStory.sentences.map((sentence, index) => <button key={sentence} onClick={() => inspect(index)} className="focus-ring rounded-2xl border-2 border-blue-100 bg-white p-4 text-left font-bold text-lead-navy hover:border-yellow-400">{sentence}</button>)}</div></div>}</>}</section>;
}

function StoryCompletion({ name, onComplete }: { name: string; onComplete: () => void }) {
  const [choices, setChoices] = useState({ name: "", age: "", likes: "", item: "" });
  const complete = Object.values(choices).every(Boolean);
  const story = complete ? `This is ${choices.name}. ${choices.name} is ${choices.age} years old. ${choices.name} likes ${choices.likes}. ${choices.name} has a ${choices.item}.` : "";
  const fields = [
    { key: "name", label: "Character name", values: storyChoices.name }, { key: "age", label: "Age", values: storyChoices.age },
    { key: "likes", label: "Likes", values: storyChoices.likes }, { key: "item", label: "Special item", values: storyChoices.item }
  ] as const;
  return <section><Guide>{name}, create the final story. Choose one word card from each evidence box.</Guide><div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <fieldset key={field.key} className="rounded-2xl border-2 border-blue-100 bg-white p-4"><legend className="px-2 font-black text-lead-navy">{field.label}</legend><div className="grid gap-2">{field.values.map((value) => <button key={value} onClick={() => setChoices((current) => ({ ...current, [field.key]: value }))} className={`focus-ring min-h-12 rounded-xl border-2 px-3 text-left font-bold ${choices[field.key] === value ? "border-yellow-400 bg-yellow-50 text-lead-navy" : "border-slate-200 hover:border-blue-300"}`}>{value}</button>)}</div></fieldset>)}</div><div className="flex flex-col rounded-3xl bg-lead-navy p-5 text-white shadow-xl"><div className="rounded-2xl bg-[linear-gradient(#bae6fd_0_58%,#bbf7d0_58%)] p-4"><PlayerCharacter name={choices.name || "Your character"} action="reading" /></div><p className="mt-5 text-xs font-black uppercase tracking-widest text-yellow-300">Your completed story</p><p className="mt-3 text-xl font-bold leading-9">{complete ? story : "Choose all four story clues to reveal your paragraph."}</p>{complete ? <><AudioButton text={story} light /><Button onClick={onComplete} className="mt-auto bg-yellow-400 text-slate-950 hover:bg-yellow-300">Complete Mission <Check className="h-4 w-4" /></Button></> : null}</div></div></section>;
}

function GameResults({ name, stars, onReplay, onChangeStudent }: { name: string; stars: number; onReplay: () => void; onChangeStudent: () => void }) {
  return <section className="mx-auto max-w-4xl py-5 text-center"><div className="mx-auto max-w-sm"><PlayerCharacter name={name} action="celebrate" /></div><p className="mt-4 font-black uppercase tracking-[.2em] text-lead-blue">Reading Mission Complete!</p><h2 className="mt-3 font-heading text-4xl font-black text-lead-navy sm:text-6xl">Fantastic work, {name}!</h2><p className="mt-4 text-lg text-lead-gray">You rebuilt two stories, explored their meaning, and found every clue.</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><Result label="Words arranged" /><Result label="Stories completed" /><Result label={`${stars} stars earned`} /></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={() => speak(aliStory.sentences.join(" "))}><Volume2 className="h-4 w-4" />Listen Again</Button><Button onClick={onReplay}><RotateCcw className="h-4 w-4" />Play Again</Button><Button variant="secondary" onClick={onChangeStudent}><UserRound className="h-4 w-4" />Change Student</Button></div><div className="mt-10 border-t border-blue-100 pt-6"><p className="font-heading text-2xl font-black text-lead-blue">LEAD</p><p className="font-bold text-lead-navy">Learn English Daily</p><p className="mt-1 text-sm text-lead-gray">Speak English with Confidence</p></div></section>;
}

function StoryParagraph({ story }: { story: ReadingStory }) {
  const [speaking, setSpeaking] = useState<number | null>(null);
  return <div className="mt-4 space-y-2 text-xl font-bold leading-9 text-lead-navy">{story.sentences.map((sentence, index) => <button key={sentence} onClick={() => speak(sentence, () => setSpeaking(index), () => setSpeaking(null))} className={`focus-ring block w-full rounded-xl px-3 py-1 text-left transition ${speaking === index ? "bg-yellow-200" : "hover:bg-blue-50"}`}>{sentence}<Volume2 className="ml-2 inline h-4 w-4 text-lead-blue" /></button>)}</div>;
}

function Guide({ children }: { children: React.ReactNode }) { return <div className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><Wisey compact /><div><p className="text-xs font-black uppercase tracking-widest text-lead-blue">Wisey says</p><p className="mt-1 font-bold leading-6 text-lead-navy">{children}</p></div></div>; }
function Wisey({ compact = false }: { compact?: boolean }) { return <div className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-50 ${compact ? "h-14 w-14" : "h-20 w-20"}`}><Image src="/images/brand-icon-cropped.png" alt="Wisey the LEAD owl guide" width={compact ? 48 : 72} height={compact ? 48 : 72} className="object-contain" /></div>; }
function AudioButton({ text, light = false }: { text: string; light?: boolean }) { return <button onClick={() => speak(text)} className={`focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${light ? "bg-white/10 text-white hover:bg-white/20" : "bg-blue-50 text-lead-blue hover:bg-blue-100"}`}><Volume2 className="h-4 w-4" />Listen</button>; }
function Result({ label }: { label: string }) { return <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-5"><Check className="mx-auto h-7 w-7 text-emerald-600" /><p className="mt-2 font-black text-lead-navy">{label}</p></div>; }

function PlayerCharacter({ name, action, compact = false }: { name: string; action: "idle" | "reading" | "thinking" | "celebrate"; compact?: boolean }) {
  return <div className={`text-center ${action === "celebrate" ? "animate-[bounce_1.4s_ease-in-out_infinite]" : ""}`}><svg viewBox="0 0 150 190" role="img" aria-label={`${name}, the reading detective`} className={`mx-auto ${compact ? "h-24 w-20" : "h-44 w-36"}`}><circle cx="75" cy="43" r="28" fill="#a16207" /><path d="M48 40c2-29 50-38 58-4-18-10-39-10-58 4Z" fill="#0f172a" /><circle cx="65" cy="43" r="3" fill="#0f172a" /><circle cx="86" cy="43" r="3" fill="#0f172a" /><path d="M66 56c7 6 14 6 20 0" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" /><path d="M50 72h50l8 65H42l8-65Z" fill="#2563eb" /><rect x="61" y="86" width="28" height="20" rx="5" fill="white" /><text x="75" y="101" textAnchor="middle" fontSize="12" fontWeight="900" fill="#2563eb">LEAD</text><path d={action === "celebrate" ? "M48 80 20 49M101 80l28-31" : action === "reading" ? "M48 83 58 120M101 83 91 120" : action === "thinking" ? "M48 82 35 115M101 82 98 45" : "M48 82 35 123M101 82l14 41"} fill="none" stroke="#a16207" strokeWidth="12" strokeLinecap="round" />{action === "reading" ? <><path d="M48 113q27-12 54 0v35q-27-12-54 0Z" fill="#facc15" stroke="#0f172a" strokeWidth="3" /><path d="M75 109v35" stroke="#0f172a" strokeWidth="2" /></> : null}<path d="M57 135 52 176M92 135l6 41" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" /><path d="M42 178h25M87 178h25" stroke="#f8fafc" strokeWidth="13" strokeLinecap="round" /></svg><span className="inline-block max-w-full truncate rounded-full bg-white px-3 py-1 text-xs font-black text-lead-navy shadow-sm">{name}</span></div>;
}
