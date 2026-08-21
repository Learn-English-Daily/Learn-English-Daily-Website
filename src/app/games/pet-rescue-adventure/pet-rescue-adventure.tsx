"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, type PanInfo, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Star, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Pet = { id: string; name: string; emoji: string };
type Item = { id: string; name: string; emoji: string };
type DropPoint = { x: number; y: number };

const pets: Pet[] = [
  { id: "dog", name: "Dog", emoji: "🐶" }, { id: "cat", name: "Cat", emoji: "🐱" },
  { id: "rabbit", name: "Rabbit", emoji: "🐰" }, { id: "turtle", name: "Turtle", emoji: "🐢" },
  { id: "fish", name: "Fish", emoji: "🐠" }, { id: "hamster", name: "Hamster", emoji: "🐹" },
  { id: "bird", name: "Bird", emoji: "🐦" }, { id: "mouse", name: "Mouse", emoji: "🐭" }
];
const items: Item[] = [
  { id: "food", name: "Food", emoji: "🍖" }, { id: "water", name: "Water", emoji: "💧" },
  { id: "ball", name: "Ball", emoji: "🎾" }, { id: "toy", name: "Toy", emoji: "🧸" },
  { id: "brush", name: "Brush", emoji: "🧹" }, { id: "bed", name: "Bed", emoji: "🛏️" }
];
const shopTasks = [
  { pet: pets[0], need: "is hungry", item: "food" }, { pet: pets[0], need: "needs a drink", item: "water" },
  { pet: pets[1], need: "wants to play", item: "ball" }, { pet: pets[2], need: "is sleepy", item: "bed" }
];
const careSteps = [
  { id: "brush", name: "Brush", emoji: "🪥", instruction: "Brush the muddy fur" },
  { id: "soap", name: "Soap", emoji: "🧼", instruction: "Wash with soap" },
  { id: "water", name: "Water", emoji: "💧", instruction: "Rinse with water" },
  { id: "towel", name: "Towel", emoji: "🧻", instruction: "Dry the dog" }
];
const sentences = [
  ["I", "feed", "my", "dog."], ["I", "play", "with", "my", "cat."], ["I", "give", "my", "rabbit", "water."]
];
const rescueObjectives = [
  { pet: pets[0], item: items[0], petPosition: "5,0", itemPosition: "1,1" },
  { pet: pets[1], item: items[4], petPosition: "5,3", itemPosition: "2,4" },
  { pet: pets[2], item: items[1], petPosition: "0,0", itemPosition: "3,2" }
];
const rescueObstacles = new Set(["1,3", "2,3", "3,3", "4,1", "4,2"]);
const levelNames = ["Pet Matching", "Pet Memory", "Pet Care Shop", "Grooming Challenge", "Build a Sentence", "Final Rescue Maze"];

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text.replace(/[.!?]/g, ""));
  voice.lang = "en-US"; voice.rate = 0.82; window.speechSynthesis.speak(voice);
}

function findDropTarget(point: DropPoint) {
  const clientPoints = [
    point,
    { x: point.x - window.scrollX, y: point.y - window.scrollY }
  ];

  return [...document.querySelectorAll<HTMLElement>("[data-pet-drop]")].find((element) => {
    const box = element.getBoundingClientRect();
    const margin = 18;
    return clientPoints.some((clientPoint) =>
      clientPoint.x >= box.left - margin &&
      clientPoint.x <= box.right + margin &&
      clientPoint.y >= box.top - margin &&
      clientPoint.y <= box.bottom + margin
    );
  })?.dataset.petDrop || "";
}

function DragToken({ id, emoji, label, selected, disabled, onSelect, onDrop }: { id: string; emoji: string; label: string; selected?: boolean; disabled?: boolean; onSelect?: () => void; onDrop: (target: string) => void }) {
  return <motion.button type="button" drag={!disabled} dragSnapToOrigin whileDrag={{ scale: 1.14, rotate: 4, zIndex: 40 }} whileHover={{ y: -4 }} onClick={onSelect} onDragEnd={(_, info: PanInfo) => onDrop(findDropTarget(info.point))} disabled={disabled} className={`touch-none select-none rounded-2xl border-2 bg-white p-3 text-center shadow-sm transition ${selected ? "border-lead-blue ring-4 ring-blue-100" : "border-slate-200"} disabled:opacity-30`}><span className="block text-5xl">{emoji}</span><span className="mt-1 block text-xs font-bold text-lead-navy">{label}</span></motion.button>;
}

export function PetRescueAdventure() {
  const reduceMotion = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const results = level === 6;
  const stars = Math.max(1, Math.min(5, Math.ceil((score / 305) * 5)));

  function award(points: number) { setScore((value) => value + points); }
  function finishLevel() {
    if (celebrating) return;
    setCelebrating(true); setCompleted((levels) => [...levels, level]);
    window.setTimeout(() => { setLevel((value) => value + 1); setCelebrating(false); }, 1200);
  }
  function reset() { setStarted(false); setLevel(0); setScore(0); setCompleted([]); setCelebrating(false); }

  if (!started) return <Card className="relative overflow-hidden border-0 bg-[linear-gradient(145deg,#064e3b,#16a34a)] p-6 text-white shadow-soft sm:p-10"><motion.div animate={reduceMotion ? {} : { y: [0, -8, 0], rotate: [0, -4, 4, 0] }} transition={{ duration: 2.5, repeat: Infinity }} className="text-8xl">🐶</motion.div><p className="mt-6 font-bold uppercase tracking-[0.18em] text-yellow-300">LEAD · Speak English with Confidence</p><h2 className="mt-3 font-heading text-4xl font-extrabold sm:text-5xl">Welcome to the Pet Rescue Center!</h2><p className="mt-4 max-w-2xl text-lg leading-8 text-emerald-50">Wisey 🦉 says: Some cute pets need your help. Match, remember, feed, groom, and care for them to earn the Pet Care Hero badge.</p><Button onClick={() => setStarted(true)} className="mt-7 bg-yellow-400 text-slate-950 hover:bg-yellow-300">Start Rescuing <ArrowRight className="h-4 w-4" /></Button></Card>;

  if (results) return <Card className="overflow-hidden border-yellow-200 bg-[linear-gradient(145deg,#ecfdf5,#ffffff,#fef3c7)] p-6 text-center shadow-soft sm:p-10"><motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: reduceMotion ? 0 : [0, -7, 7, 0] }} className="text-8xl">🏆</motion.div><p className="mt-5 font-bold uppercase tracking-[0.18em] text-emerald-700">Pet Rescue Complete</p><h2 className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">You are a Pet Care Hero!</h2><p className="mt-3 text-lg text-lead-gray">Eight pets learned and every rescue area completed.</p><div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4"><Result label="Pets learned" value="8 / 8" /><Result label="Total score" value={`${score} stars`} /><Result label="Pet care" value="Excellent" /><Result label="Sentence building" value="Complete" /></div><div className="mt-6 flex justify-center gap-1">{[1,2,3,4,5].map((number) => <Star key={number} className={`h-9 w-9 ${number <= stars ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`} />)}</div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={reset}><RotateCcw className="h-4 w-4" />Play Again</Button><Button asChild variant="secondary"><a href="/games">Back to Learning Games</a></Button></div></Card>;

  return <div className="grid gap-5"><Progress level={level} score={score} completed={completed} /><Card className="relative overflow-hidden p-5 sm:p-8">{celebrating && <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 grid place-items-center bg-white/90 text-center backdrop-blur"><div><div className="text-7xl">⭐</div><p className="mt-3 font-heading text-3xl font-extrabold text-emerald-700">Level Complete!</p><p className="mt-2 font-bold text-lead-gray">The next rescue area is unlocking...</p></div></motion.div>}{level === 0 && <MatchLevel award={award} complete={finishLevel} />}{level === 1 && <MemoryLevel award={award} complete={finishLevel} />}{level === 2 && <ShopLevel award={award} complete={finishLevel} />}{level === 3 && <CareLevel award={award} complete={finishLevel} />}{level === 4 && <SentenceLevel award={award} complete={finishLevel} />}{level === 5 && <FinalRescue award={award} complete={finishLevel} />}</Card></div>;
}

function Progress({ level, score, completed }: { level: number; score: number; completed: number[] }) { return <Card className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Level {Math.min(level + 1, 6)} of 6</p><h2 className="font-heading text-xl font-extrabold text-lead-navy">{levelNames[level]}</h2></div><span className="rounded-full bg-yellow-50 px-4 py-2 font-bold text-yellow-800">⭐ {score}</span></div><div className="mt-4 flex items-center justify-between gap-1">{["🐶","🐱","🐰","🐢","🐠","🏆"].map((icon, index) => <div key={icon} className="flex flex-1 items-center"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl ${completed.includes(index) ? "bg-emerald-500 text-white" : index === level ? "bg-yellow-300 ring-4 ring-yellow-100" : "bg-slate-100 grayscale"}`}>{completed.includes(index) ? "✓" : icon}</span>{index < 5 && <span className={`h-2 flex-1 ${completed.includes(index) ? "bg-emerald-400" : "bg-slate-100"}`} />}</div>)}</div></Card>; }

function MatchLevel({ award, complete }: GameProps) {
  const matchPets = pets.slice(0, 5); const namePets = useMemo(() => shuffle(pets.slice(0, 5)), []); const [matched, setMatched] = useState<string[]>([]); const [selected, setSelected] = useState(""); const [message, setMessage] = useState("Drag each pet to its English name. On touch screens, tap the pet and then its name.");
  function drop(petId: string, target: string) { if (!target) return; if (petId !== target) { setMessage("Almost! Try another name."); return; } const next = [...matched, petId]; setMatched(next); setSelected(""); award(10); speak(matchPets.find((pet) => pet.id === petId)?.name || ""); setMessage("Awesome! That pet found its name."); if (next.length === matchPets.length) complete(); }
  return <GameShell guide="Match the pets" message={message}><div className="grid gap-7 lg:grid-cols-2"><div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-3">{matchPets.map((pet) => <DragToken key={pet.id} {...pet} label="Drag me" selected={selected === pet.id} disabled={matched.includes(pet.id)} onSelect={() => setSelected(pet.id)} onDrop={(target) => drop(pet.id, target)} />)}</div><div className="grid gap-3">{namePets.map((pet) => <button key={pet.id} data-pet-drop={pet.id} onClick={() => selected && drop(selected, pet.id)} className={`min-h-16 rounded-2xl border-2 border-dashed px-5 text-left font-heading text-lg font-extrabold ${matched.includes(pet.id) ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-blue-200 bg-blue-50 text-lead-navy"}`}>{matched.includes(pet.id) ? `${pet.emoji} ${pet.name} ✓` : pet.name}</button>)}</div></div></GameShell>;
}

type GameProps = { award: (points: number) => void; complete: () => void };
type MemoryCard = { id: string; pair: string; content: string; word: boolean };
function MemoryLevel({ award, complete }: GameProps) {
  const cards = useMemo(() => shuffle(pets.slice(0, 4).flatMap((pet) => [{ id: `${pet.id}-pet`, pair: pet.id, content: pet.emoji, word: false }, { id: `${pet.id}-word`, pair: pet.id, content: pet.name, word: true }] as MemoryCard[])), []);
  const [open, setOpen] = useState<string[]>([]); const [matched, setMatched] = useState<string[]>([]); const [locked, setLocked] = useState(false);
  function flip(card: MemoryCard) { if (locked || open.includes(card.id) || matched.includes(card.pair)) return; const next = [...open, card.id]; setOpen(next); if (next.length === 2) { const pair = next.map((id) => cards.find((item) => item.id === id)!); setLocked(true); window.setTimeout(() => { if (pair[0].pair === pair[1].pair) { const newMatched = [...matched, pair[0].pair]; setMatched(newMatched); award(10); speak(pets.find((pet) => pet.id === pair[0].pair)?.name || ""); if (newMatched.length === 4) complete(); } setOpen([]); setLocked(false); }, 650); } }
  return <GameShell guide="Remember the cards" message="Flip two cards. Match each pet with its English word."><div className="mx-auto grid max-w-2xl grid-cols-4 gap-3">{cards.map((card) => { const visible = open.includes(card.id) || matched.includes(card.pair); return <motion.button key={card.id} onClick={() => flip(card)} animate={{ rotateY: visible ? 0 : 180 }} className={`aspect-square rounded-2xl border-2 p-2 text-center shadow-sm ${matched.includes(card.pair) ? "border-emerald-400 bg-emerald-50" : "border-blue-100 bg-white"}`}><span className={`grid h-full place-items-center font-heading font-extrabold text-lead-navy ${card.word ? "text-sm sm:text-xl" : "text-4xl sm:text-6xl"}`}>{visible ? card.content : "🐾"}</span></motion.button>; })}</div></GameShell>;
}

function ShopLevel({ award, complete }: GameProps) {
  const [task, setTask] = useState(0); const [selected, setSelected] = useState(""); const [feedback, setFeedback] = useState(""); const [locked, setLocked] = useState(false); const current = shopTasks[task];
  const instruction = feedback || `Help! The ${current.pet.name.toLowerCase()} ${current.need}. Drag the useful item into the basket.`;
  function deliver(itemId: string, target: string) { if (locked) return; if (target !== "basket") { setFeedback("Move the item farther into the basket and release it."); return; } if (itemId !== current.item) { setFeedback("That item does not solve this pet's need. Try another object!"); return; } setLocked(true); award(10); setFeedback("Awesome! The pet got exactly what it needed."); const next = task + 1; if (next === shopTasks.length) complete(); else window.setTimeout(() => { setTask(next); setFeedback(""); setLocked(false); }, 450); setSelected(""); }
  return <GameShell guide="Pet Care Shop" message={instruction}><div className="text-center"><motion.div key={current.pet.id + task} animate={{ scale: [1, 1.08, 1] }} className="text-8xl">{current.pet.emoji}</motion.div><div data-pet-drop="basket" onClick={() => selected && deliver(selected, "basket")} className="mx-auto mt-4 grid min-h-32 max-w-md place-items-center rounded-3xl border-4 border-dashed border-yellow-300 bg-yellow-50 text-5xl shadow-inner">🧺 <span className="text-sm font-bold text-yellow-800">Drop the item in this basket</span></div><div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">{items.map((item) => <DragToken key={item.id} {...item} label={item.name} selected={selected === item.id} disabled={locked} onSelect={() => setSelected(item.id)} onDrop={(target) => deliver(item.id, target)} />)}</div></div></GameShell>;
}

function CareLevel({ award, complete }: GameProps) {
  const [step, setStep] = useState(0); const [selected, setSelected] = useState(""); const current = careSteps[step];
  function care(itemId: string, target: string) { if (target !== "pet") return; if (itemId !== current.id) return; award(10); const next = step + 1; if (next === careSteps.length) complete(); else setStep(next); setSelected(""); }
  return <GameShell guide="Grooming Challenge" message={current.instruction}><div className="grid items-center gap-6 lg:grid-cols-[1fr_280px]"><div data-pet-drop="pet" onClick={() => selected && care(selected, "pet")} className={`relative grid min-h-72 place-items-center overflow-hidden rounded-3xl border-4 border-dashed ${step === 0 ? "border-amber-300 bg-amber-100" : "border-cyan-200 bg-cyan-50"}`}><motion.span key={step} animate={{ rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 1.8 }} className="text-9xl">🐶</motion.span><div className="absolute bottom-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-lead-navy">Care completed: {step} / 4</div></div><div className="grid grid-cols-2 gap-3">{careSteps.map((item, index) => <DragToken key={item.id} {...item} label={item.name} selected={selected === item.id} disabled={index < step} onSelect={() => setSelected(item.id)} onDrop={(target) => care(item.id, target)} />)}</div></div></GameShell>;
}

function SentenceLevel({ award, complete }: GameProps) {
  const [round, setRound] = useState(0); const [pool, setPool] = useState(() => shuffle(sentences[0])); const [answer, setAnswer] = useState<string[]>([]); const [selected, setSelected] = useState(""); const target = sentences[round];
  function addWord(word: string, targetId: string) { if (targetId !== "sentence") return; setPool((words) => { const index = words.indexOf(word); return words.filter((_, position) => position !== index); }); setAnswer((words) => [...words, word]); setSelected(""); }
  function resetWords() { setPool(shuffle(target)); setAnswer([]); }
  useEffect(() => { if (pool.length || !answer.length) return; const correct = answer.join(" ") === target.join(" "); if (correct) { award(15); speak(target.join(" ")); const next = round + 1; if (next === sentences.length) complete(); else window.setTimeout(() => { setRound(next); setPool(shuffle(sentences[next])); setAnswer([]); }, 700); } else window.setTimeout(resetWords, 700); }, [pool.length, answer, target, round]);
  return <GameShell guide="Build the sentence" message="Drag or tap the words into the answer area in the correct order."><div data-pet-drop="sentence" onClick={() => selected && addWord(selected, "sentence")} className="flex min-h-28 flex-wrap items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-blue-200 bg-blue-50 p-4">{answer.length ? answer.map((word, index) => <button key={`${word}-${index}`} onClick={() => resetWords()} className="rounded-xl bg-lead-blue px-4 py-3 font-bold text-white">{word}</button>) : <span className="text-sm font-bold text-blue-500">Drop words here</span>}</div><div className="mt-6 flex flex-wrap justify-center gap-3">{pool.map((word, index) => <DragToken key={`${word}-${index}`} id={word} emoji="🔤" label={word} selected={selected === word} onSelect={() => setSelected(word)} onDrop={(drop) => addWord(word, drop)} />)}</div><div className="mt-6 flex items-center justify-center gap-3"><Button variant="secondary" onClick={resetWords}><RotateCcw className="h-4 w-4" />Reset words</Button><Button variant="secondary" onClick={() => speak(target.join(" "))}><Volume2 className="h-4 w-4" />Listen</Button></div></GameShell>;
}

function FinalRescue({ award, complete }: GameProps) {
  const width = 6; const height = 5;
  const [position, setPosition] = useState({ x: 0, y: 4 });
  const [inventory, setInventory] = useState<string[]>([]);
  const [collected, setCollected] = useState<string[]>([]);
  const [rescued, setRescued] = useState<string[]>([]);
  const [message, setMessage] = useState("Explore the maze. Collect the correct care items, then reach each pet.");
  const [locked, setLocked] = useState(false);

  function move(dx: number, dy: number) {
    if (locked) return;
    const next = { x: position.x + dx, y: position.y + dy };
    const key = `${next.x},${next.y}`;
    if (next.x < 0 || next.x >= width || next.y < 0 || next.y >= height) { setMessage("The rescue center ends there. Try another direction!"); return; }
    if (rescueObstacles.has(key)) { setMessage("That path is blocked. Find another way around!"); return; }
    setPosition(next);

    const foundItem = rescueObjectives.find((objective) => objective.itemPosition === key && !collected.includes(objective.item.id));
    if (foundItem) {
      setInventory((current) => [...current, foundItem.item.id]); setCollected((current) => [...current, foundItem.item.id]); award(10);
      setMessage(`${foundItem.item.emoji} ${foundItem.item.name} added to your rescue bag!`);
      return;
    }

    const foundPet = rescueObjectives.find((objective) => objective.petPosition === key && !rescued.includes(objective.pet.id));
    if (!foundPet) return;
    if (!inventory.includes(foundPet.item.id)) { setMessage(`${foundPet.pet.emoji} The ${foundPet.pet.name.toLowerCase()} needs ${foundPet.item.name.toLowerCase()}. Find it first!`); return; }

    const nextRescued = [...rescued, foundPet.pet.id];
    setRescued(nextRescued); setInventory((current) => current.filter((item) => item !== foundPet.item.id)); award(20);
    setMessage(`${foundPet.pet.emoji} ${foundPet.pet.name} rescued with ${foundPet.item.name.toLowerCase()}!`);
    if (nextRescued.length === rescueObjectives.length) { setLocked(true); window.setTimeout(complete, 700); }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = moves[event.key];
      if (!direction) return;
      event.preventDefault(); move(...direction);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return <GameShell guide="Final Rescue Maze" message={message}><div className="grid items-start gap-4 lg:grid-cols-[190px_380px] lg:justify-center"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Rescue missions</p><div className="mt-2 grid gap-1.5">{rescueObjectives.map((objective) => <div key={objective.pet.id} className={`rounded-xl border-2 p-2 text-xs font-bold ${rescued.includes(objective.pet.id) ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-lead-navy"}`}>{rescued.includes(objective.pet.id) ? "✓ Rescued" : `${objective.item.emoji} → ${objective.pet.emoji}`}<span className="ml-1 font-medium">Give {objective.item.name.toLowerCase()} to the {objective.pet.name.toLowerCase()}</span></div>)}</div><div className="mt-2 rounded-xl bg-blue-50 p-2"><p className="text-[10px] font-bold uppercase text-blue-700">Rescue bag</p><p className="mt-1 min-h-6 text-lg">{inventory.length ? inventory.map((id) => items.find((item) => item.id === id)?.emoji).join(" ") : "Empty"}</p></div></div>
    <div className="mx-auto w-full max-w-[380px]"><div className="grid grid-cols-6 gap-1 rounded-2xl border-4 border-emerald-100 bg-emerald-50 p-2 shadow-inner">{Array.from({ length: width * height }, (_, index) => { const x = index % width; const y = Math.floor(index / width); const key = `${x},${y}`; const objectivePet = rescueObjectives.find((objective) => objective.petPosition === key); const objectiveItem = rescueObjectives.find((objective) => objective.itemPosition === key); const isPlayer = position.x === x && position.y === y; const isObstacle = rescueObstacles.has(key); const petRescued = objectivePet && rescued.includes(objectivePet.pet.id); const itemCollected = objectiveItem && collected.includes(objectiveItem.item.id); return <div key={key} className={`relative grid aspect-square place-items-center rounded-lg text-2xl sm:text-3xl ${isObstacle ? "bg-slate-400" : "bg-white shadow-sm"}`}>{isObstacle ? "🌳" : isPlayer ? <motion.span layoutId="rescue-helper" className="z-10">🦉</motion.span> : objectivePet && !petRescued ? objectivePet.pet.emoji : objectiveItem && !itemCollected ? <span className="grid place-items-center leading-none"><span>{objectiveItem.item.emoji}</span><small className="mt-0.5 text-[7px] font-black uppercase tracking-tight text-lead-navy sm:text-[9px]">{objectiveItem.item.name}</small></span> : petRescued ? "✨" : ""}</div>; })}</div>
      <div className="mx-auto mt-2 grid w-fit grid-cols-3 gap-1.5"><span /><button onClick={() => move(0, -1)} className="grid h-9 w-11 place-items-center rounded-lg bg-blue-100 text-lead-blue" aria-label="Move up"><ArrowUp className="h-4 w-4" /></button><span /><button onClick={() => move(-1, 0)} className="grid h-9 w-11 place-items-center rounded-lg bg-blue-100 text-lead-blue" aria-label="Move left"><ArrowLeft className="h-4 w-4" /></button><button onClick={() => move(0, 1)} className="grid h-9 w-11 place-items-center rounded-lg bg-blue-100 text-lead-blue" aria-label="Move down"><ArrowDown className="h-4 w-4" /></button><button onClick={() => move(1, 0)} className="grid h-9 w-11 place-items-center rounded-lg bg-lead-blue text-white" aria-label="Move right"><ArrowRight className="h-4 w-4" /></button></div><p className="mt-1 text-center text-[10px] font-semibold text-lead-gray">Keyboard arrows or touch controls</p>
    </div></div></GameShell>;
}

function GameShell({ guide, message, children }: { guide: string; message: string; children: React.ReactNode }) { return <div><div className="mb-7 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4"><span className="text-3xl">🦉</span><div><p className="font-heading text-lg font-extrabold text-lead-navy">{guide}</p><p className="mt-1 text-sm leading-6 text-lead-gray">{message}</p></div></div>{children}</div>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-heading text-xl font-extrabold text-lead-navy">{value}</p></div>; }
function shuffle<T>(values: T[]) { const result = [...values]; for (let index = result.length - 1; index > 0; index -= 1) { const swap = Math.floor(Math.random() * (index + 1)); [result[index], result[swap]] = [result[swap], result[index]]; } return result; }
