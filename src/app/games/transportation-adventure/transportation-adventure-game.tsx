"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Map, RotateCcw, Shuffle, Star, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Vehicle = { name: string; emoji: string; zone: "Land" | "Air" | "Water" };
type ChoiceChallenge = { prompt: string; choices: string[]; answer: string; explanation: string };

const vehicles: Vehicle[] = [
  { name: "Bus", emoji: "🚌", zone: "Land" }, { name: "Train", emoji: "🚆", zone: "Land" },
  { name: "Bicycle", emoji: "🚲", zone: "Land" }, { name: "Taxi", emoji: "🚕", zone: "Land" },
  { name: "Airplane", emoji: "✈️", zone: "Air" }, { name: "Helicopter", emoji: "🚁", zone: "Air" },
  { name: "Boat", emoji: "⛵", zone: "Water" }, { name: "Ship", emoji: "🚢", zone: "Water" },
  { name: "Ferry", emoji: "⛴️", zone: "Water" }
];

const identify = [
  { vehicle: vehicles[0], choices: ["Bus", "Train", "Boat"] },
  { vehicle: vehicles[4], choices: ["Helicopter", "Airplane", "Ferry"] },
  { vehicle: vehicles[2], choices: ["Taxi", "Bicycle", "Motorcycle"] }
];
const sortVehicles = [vehicles[5], vehicles[7], vehicles[3], vehicles[8]];
const rides: ChoiceChallenge[] = [
  { prompt: "You want to travel to another city by rail. What should you take?", choices: ["Car", "Train", "Bicycle"], answer: "Train", explanation: "A train travels on railway tracks between cities." },
  { prompt: "You need to cross the sea with many passengers and cars.", choices: ["Ferry", "Taxi", "Helicopter"], answer: "Ferry", explanation: "A ferry carries people and vehicles across water." },
  { prompt: "You are late and need a private ride across town.", choices: ["Ship", "Taxi", "Airplane"], answer: "Taxi", explanation: "A taxi is a private road vehicle for short trips." }
];
const sentenceRounds = [
  { words: ["I", "go", "to", "school", "by", "bus."], prompt: "How do you go to school?" },
  { words: ["I", "travel", "by", "train."], prompt: "How do you travel to another city?" }
];
const journey: ChoiceChallenge[] = [
  { prompt: "Home → Bus Station: Which sentence is correct?", choices: ["I take a bus.", "I fly a bus.", "I sail a bus."], answer: "I take a bus.", explanation: "We say: I take a bus." },
  { prompt: "Train Station: I travel on rails and stop at stations. What am I?", choices: ["Train", "Boat", "Bicycle"], answer: "Train", explanation: "A train travels on rails." },
  { prompt: "Airport → Destination: Complete: I fly by ___.", choices: ["ferry", "airplane", "taxi"], answer: "airplane", explanation: "We can say: I fly by airplane." }
];
const stageNames = ["Meet the Vehicles", "Where Does It Go?", "Choose Your Ride", "Sentence Challenge", "Final Journey"];

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/[.?!]/g, ""));
  utterance.lang = "en-US"; utterance.rate = 0.82; window.speechSynthesis.speak(utterance);
}

export function TransportationAdventureGame() {
  const reduceMotion = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState(0);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState("Choose an answer to continue your journey.");
  const [answered, setAnswered] = useState(false);
  const [built, setBuilt] = useState<string[]>([]);
  const [wordPool, setWordPool] = useState(() => shuffle(sentenceRounds[0].words));
  const finished = stage === 5;
  const totalChallenges = identify.length + sortVehicles.length + rides.length + sentenceRounds.length + journey.length;
  const completed = stage === 0 ? round : stage === 1 ? 3 + round : stage === 2 ? 7 + round : stage === 3 ? 10 + round : stage === 4 ? 12 + round : totalChallenges;
  const progress = Math.round((completed / totalChallenges) * 100);
  const stars = Math.max(1, Math.min(5, Math.ceil((score / 150) * 5)));
  const currentSentence = sentenceRounds[Math.min(round, sentenceRounds.length - 1)];
  const normalizedBuilt = useMemo(() => built.join(" ").replace(/[.?!]/g, "").toLowerCase(), [built]);

  function reward(message: string, points = 10) {
    setAnswered(true); setScore((value) => value + points); setCorrect((value) => value + 1);
    setAttempts((value) => value + 1); setFeedback(`Awesome! ${message}`);
  }
  function tryAnswer(value: string, answer: string, explanation: string, points = 10) {
    if (answered) return;
    if (value === answer) reward(explanation, points);
    else { setAttempts((v) => v + 1); setFeedback("Almost! Think about the clue and try again."); }
  }
  function next() {
    const lengths = [identify.length, sortVehicles.length, rides.length, sentenceRounds.length, journey.length];
    if (round + 1 < lengths[stage]) {
      const nextRound = round + 1; setRound(nextRound); setAnswered(false); setFeedback("Choose an answer to continue your journey.");
      if (stage === 3) { setBuilt([]); setWordPool(shuffle(sentenceRounds[nextRound].words)); }
    } else { setStage((value) => value + 1); setRound(0); setAnswered(false); setFeedback("A new place is unlocked. Let's explore!"); setBuilt([]); setWordPool(shuffle(sentenceRounds[0].words)); }
  }
  function reset() { setStarted(false); setStage(0); setRound(0); setScore(0); setCorrect(0); setAttempts(0); setAnswered(false); setBuilt([]); setWordPool(shuffle(sentenceRounds[0].words)); setFeedback("Choose an answer to continue your journey."); }
  function chooseWord(word: string, index: number) { setBuilt((v) => [...v, word]); setWordPool((v) => v.filter((_, i) => i !== index)); }
  function resetWords() { setBuilt([]); setWordPool(shuffle(currentSentence.words)); setAnswered(false); }
  function checkSentence() {
    const expected = currentSentence.words.join(" ").replace(/[.?!]/g, "").toLowerCase();
    if (normalizedBuilt === expected) reward("That sentence is perfect!", 15);
    else { setAttempts((v) => v + 1); setFeedback("Good try! Check the word order and try again."); }
  }

  if (!started) return (
    <Card className="relative overflow-hidden border-0 bg-[linear-gradient(145deg,#0f172a,#1d4ed8)] p-6 text-white shadow-soft sm:p-10">
      <motion.div animate={reduceMotion ? {} : { x: [0, 28, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-7xl" aria-hidden>🚌</motion.div>
      <div className="mt-6 max-w-2xl"><p className="font-bold uppercase tracking-[0.18em] text-yellow-300">LEAD · Speak English with Confidence</p>
        <h2 className="mt-3 font-heading text-4xl font-extrabold sm:text-5xl">Ready for a Transportation Adventure?</h2>
        <p className="mt-4 text-lg leading-8 text-blue-100">Hi! I&apos;m Wisey 🦉. We will travel through five places, solve English challenges, and earn the Transportation Explorer badge.</p>
        <Button onClick={() => setStarted(true)} className="mt-7 bg-yellow-400 text-slate-950 hover:bg-yellow-300">Start Adventure <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </Card>
  );

  if (finished) return (
    <Card className="overflow-hidden border-yellow-200 bg-[linear-gradient(145deg,#fff7d6,#ffffff,#dbeafe)] p-6 text-center shadow-soft sm:p-10">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: reduceMotion ? 0 : [0, -8, 8, 0] }} className="text-8xl">🏆</motion.div>
      <p className="mt-5 font-bold uppercase tracking-[0.18em] text-lead-blue">Journey complete</p>
      <h2 className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">Congratulations! You completed the Transportation Adventure!</h2>
      <p className="mt-3 text-lg text-lead-gray">Wisey says: You are a Transportation Explorer!</p>
      <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Result label="Total score" value={`${score} points`} /><Result label="Correct answers" value={`${correct} / ${totalChallenges}`} /><Result label="Accuracy" value={`${attempts ? Math.round((correct / attempts) * 100) : 100}%`} /><Result label="Vocabulary mastery" value={correct >= 12 ? "Excellent" : correct >= 9 ? "Good" : "Growing"} />
      </div>
      <div className="mt-6 flex justify-center gap-1" aria-label={`${stars} out of 5 stars`}>{[1,2,3,4,5].map((n) => <Star key={n} className={`h-9 w-9 ${n <= stars ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`} />)}</div>
      <Button onClick={reset} className="mt-7"><RotateCcw className="h-4 w-4" />Play Again</Button>
    </Card>
  );

  return <div className="grid gap-5">
    <Card className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">Stage {stage + 1} of 5</p><h2 className="font-heading text-xl font-extrabold text-lead-navy">{stageNames[stage]}</h2></div><div className="flex gap-2"><Stat icon="⭐" text={`${score} pts`} /><Stat icon="✅" text={`${correct} correct`} /></div></div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb,#facc15)]" animate={{ width: `${progress}%` }} /></div>
      <div className="mt-3 flex justify-between text-xs font-semibold text-slate-500"><span>🏠 Home</span><span>🚌 Bus</span><span>🚆 Train</span><span>✈️ Airport</span><span>🏖️ Finish</span></div>
    </Card>
    <AnimatePresence mode="wait"><motion.div key={`${stage}-${round}`} initial={reduceMotion ? {} : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <Card className="p-5 sm:p-8">
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-blue-50 p-4"><span className="text-3xl">🦉</span><div><p className="font-bold text-lead-navy">Wisey says</p><p className="mt-1 text-sm leading-6 text-lead-gray">{feedback}</p></div></div>
        {stage === 0 && <IdentifyRound item={identify[round]} answered={answered} onChoose={(value) => tryAnswer(value, identify[round].vehicle.name, `It's a ${identify[round].vehicle.name.toLowerCase()}!`)} />}
        {stage === 1 && <SortRound vehicle={sortVehicles[round]} answered={answered} onChoose={(zone) => tryAnswer(zone, sortVehicles[round].zone, `A ${sortVehicles[round].name.toLowerCase()} travels on ${sortVehicles[round].zone.toLowerCase()}.`)} />}
        {stage === 2 && <ChoiceRound challenge={rides[round]} answered={answered} onChoose={(value) => tryAnswer(value, rides[round].answer, rides[round].explanation)} />}
        {stage === 3 && <SentenceRound challenge={currentSentence} pool={wordPool} built={built} answered={answered} chooseWord={chooseWord} reset={resetWords} check={checkSentence} />}
        {stage === 4 && <ChoiceRound challenge={journey[round]} answered={answered} onChoose={(value) => tryAnswer(value, journey[round].answer, journey[round].explanation, round === journey.length - 1 ? 20 : 10)} />}
        {answered && <div className="mt-6 flex justify-end"><Button onClick={next}>Continue Journey <ArrowRight className="h-4 w-4" /></Button></div>}
      </Card>
    </motion.div></AnimatePresence>
  </div>;
}

function IdentifyRound({ item, answered, onChoose }: { item: typeof identify[number]; answered: boolean; onChoose: (v: string) => void }) {
  return <div className="text-center"><motion.div animate={answered ? { scale: [1, 1.15, 1] } : { y: [0, -5, 0] }} transition={{ repeat: answered ? 0 : Infinity, duration: 2 }} className="text-8xl" aria-label={item.vehicle.name}>{item.vehicle.emoji}</motion.div><h3 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">What is this?</h3><button onClick={() => speak(item.vehicle.name)} className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-lead-blue hover:bg-blue-50"><Volume2 className="h-4 w-4" />Hear the word</button><ChoiceButtons choices={item.choices} disabled={answered} onChoose={onChoose} /></div>;
}
function SortRound({ vehicle, answered, onChoose }: { vehicle: Vehicle; answered: boolean; onChoose: (v: string) => void }) {
  return <div className="text-center"><div className="text-8xl">{vehicle.emoji}</div><h3 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">Where does the {vehicle.name.toLowerCase()} travel?</h3><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Land","🚗"],["Air","✈️"],["Water","🚢"]].map(([zone, icon]) => <button key={zone} disabled={answered} onClick={() => onChoose(zone)} className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-xl font-extrabold text-lead-navy transition hover:-translate-y-1 hover:border-blue-400 disabled:opacity-60"><span className="mb-2 block text-4xl">{icon}</span>{zone}</button>)}</div></div>;
}
function ChoiceRound({ challenge, answered, onChoose }: { challenge: ChoiceChallenge; answered: boolean; onChoose: (v: string) => void }) { return <div><div className="mx-auto max-w-2xl text-center"><Map className="mx-auto h-10 w-10 text-lead-blue" /><h3 className="mt-3 font-heading text-2xl font-extrabold leading-9 text-lead-navy">{challenge.prompt}</h3></div><ChoiceButtons choices={challenge.choices} disabled={answered} onChoose={onChoose} /></div>; }
function ChoiceButtons({ choices, disabled, onChoose }: { choices: string[]; disabled: boolean; onChoose: (v: string) => void }) { return <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">{choices.map((choice) => <button key={choice} disabled={disabled} onClick={() => onChoose(choice)} className="min-h-14 rounded-2xl border-2 border-blue-100 bg-blue-50 px-4 py-3 font-bold text-lead-navy transition hover:-translate-y-1 hover:border-lead-blue hover:bg-blue-100 disabled:opacity-60">{choice}</button>)}</div>; }
function SentenceRound({ challenge, pool, built, answered, chooseWord, reset, check }: { challenge: typeof sentenceRounds[number]; pool: string[]; built: string[]; answered: boolean; chooseWord: (w: string, i: number) => void; reset: () => void; check: () => void }) { return <div><p className="text-center text-sm font-bold uppercase tracking-wider text-lead-blue">Sentence Builder · +15 points</p><h3 className="mt-2 text-center font-heading text-2xl font-extrabold text-lead-navy">{challenge.prompt}</h3><div className="mt-5 min-h-20 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-4"><div className="flex flex-wrap gap-2">{built.length ? built.map((word, i) => <span key={`${word}-${i}`} className="rounded-xl bg-lead-blue px-4 py-3 font-bold text-white">{word}</span>) : <span className="m-auto text-sm text-slate-500">Tap words below in the correct order</span>}</div></div><div className="mt-4 flex flex-wrap justify-center gap-2">{pool.map((word, i) => <button key={`${word}-${i}`} onClick={() => chooseWord(word, i)} disabled={answered} className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-lead-navy shadow-sm hover:border-lead-blue">{word}</button>)}</div><div className="mt-5 flex flex-wrap justify-center gap-3"><Button variant="secondary" onClick={reset}><Shuffle className="h-4 w-4" />Reset words</Button><Button onClick={check} disabled={answered || pool.length > 0}><Check className="h-4 w-4" />Check sentence</Button><Button variant="secondary" onClick={() => speak(challenge.words.join(" "))}><Volume2 className="h-4 w-4" />Listen</Button></div></div>; }
function Stat({ icon, text }: { icon: string; text: string }) { return <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-lead-navy">{icon} {text}</span>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-heading text-xl font-extrabold text-lead-navy">{value}</p></div>; }
