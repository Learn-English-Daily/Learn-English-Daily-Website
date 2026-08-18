"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Star, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Vehicle = { name: string; emoji: string; zone: "Land" | "Air" | "Water" };
type Dialogue = { passenger: string; choices: string[]; answer: string; reply: string };

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
const rideChoices = [{ name: "Taxi", emoji: "🚕", color: "bg-yellow-50 border-yellow-300" }, { name: "Car", emoji: "🚗", color: "bg-blue-50 border-blue-300" }, { name: "Van", emoji: "🚐", color: "bg-emerald-50 border-emerald-300" }];
const passengerTalk: Dialogue[] = [
  { passenger: "Hello! Are you available?", choices: ["Yes, please get in.", "The road is blue.", "I am an airport."], answer: "Yes, please get in.", reply: "Thank you!" },
  { passenger: "Can you take me to the airport, please?", choices: ["Of course. Let's go!", "The airport takes me.", "I go water."], answer: "Of course. Let's go!", reply: "Great. My flight leaves soon." },
  { passenger: "How much is the ride?", choices: ["It is 35 thousand rupiah.", "It is 35 minutes money.", "I ride a price."], answer: "It is 35 thousand rupiah.", reply: "Okay, thank you." }
];
const dropOffTalk: Dialogue[] = [
  { passenger: "Here is 50 thousand rupiah. How much is my change?", choices: ["15 thousand", "25 thousand", "85 thousand"], answer: "15 thousand", reply: "Correct! 50 minus 35 is 15." },
  { passenger: "Where should you drop me off?", choices: ["🏫 School", "✈️ Airport", "🏥 Hospital"], answer: "✈️ Airport", reply: "Yes, this is the airport!" },
  { passenger: "Thank you for the ride!", choices: ["You're welcome. Have a good flight!", "Ride the thank you.", "How airport are you?"], answer: "You're welcome. Have a good flight!", reply: "What a friendly driver!" }
];
const stageNames = ["Meet the Vehicles", "Where Does It Go?", "Choose Your Vehicle", "Pick Up a Passenger", "Drive and Drop Off"];

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
  const [ride, setRide] = useState(rideChoices[0]);
  const [driveDistance, setDriveDistance] = useState(0);
  const [lane, setLane] = useState(1);
  const finished = stage === 5;
  const stageLengths = [identify.length, sortVehicles.length, 1, passengerTalk.length + 1, dropOffTalk.length + 1];
  const stageStarts = [0, 3, 7, 8, 12];
  const totalChallenges = 16;
  const progress = Math.round((((stageStarts[stage] ?? totalChallenges) + round) / totalChallenges) * 100);
  const stars = Math.max(1, Math.min(5, Math.ceil((score / 170) * 5)));

  function reward(message: string, points = 10) { setAnswered(true); setScore((value) => value + points); setCorrect((value) => value + 1); setAttempts((value) => value + 1); setFeedback(message); }
  function tryAnswer(value: string, answer: string, reply: string, points = 10) {
    if (answered) return;
    if (value === answer) reward(`Awesome! ${reply}`, points);
    else { setAttempts((current) => current + 1); setFeedback("Good try! Choose the reply that sounds natural in this situation."); }
  }
  function chooseRide(selected: typeof rideChoices[number]) { setRide(selected); reward(`Excellent choice! Your ${selected.name.toLowerCase()} is ready.`); }
  function moveVehicle(direction: "left" | "right" | "up" | "down") {
    if (answered) return;
    if (direction === "up") { setLane((value) => Math.max(0, value - 1)); return; }
    if (direction === "down") { setLane((value) => Math.min(2, value + 1)); return; }
    if (direction === "left") { setDriveDistance((value) => Math.max(0, value - 10)); return; }
    const nextDistance = Math.min(100, driveDistance + 25);
    setDriveDistance(nextDistance);
    if (nextDistance === 100) reward(stage === 3 ? "Passenger found! Stop and say hello." : "Airport reached! Time to finish the trip.");
    else setFeedback("Keep driving! Follow the road and watch the traffic lights.");
  }
  function next() {
    if (round + 1 < stageLengths[stage]) setRound((value) => value + 1);
    else { setStage((value) => value + 1); setRound(0); }
    setAnswered(false);
    if (stage === 3 && round === stageLengths[3] - 1) { setDriveDistance(0); setLane(1); }
    setFeedback("A new part of the adventure is ready!");
  }
  function reset() { setStarted(false); setStage(0); setRound(0); setScore(0); setCorrect(0); setAttempts(0); setAnswered(false); setRide(rideChoices[0]); setDriveDistance(0); setLane(1); setFeedback("Choose an answer to continue your journey."); }

  useEffect(() => {
    if (!started || (stage !== 3 && stage !== 4) || round !== 0 || answered) return;
    function handleKeyDown(event: KeyboardEvent) {
      const directions: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      moveVehicle(direction);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!started) return <Card className="relative overflow-hidden border-0 bg-[linear-gradient(145deg,#0f172a,#1d4ed8)] p-6 text-white shadow-soft sm:p-10"><motion.div animate={reduceMotion ? {} : { x: [0, 28, 0] }} transition={{ duration: 4, repeat: Infinity }} className="text-7xl">🚌</motion.div><div className="mt-6 max-w-2xl"><p className="font-bold uppercase tracking-[0.18em] text-yellow-300">LEAD · Speak English with Confidence</p><h2 className="mt-3 font-heading text-4xl font-extrabold sm:text-5xl">Ready for a Transportation Adventure?</h2><p className="mt-4 text-lg leading-8 text-blue-100">Hi! I&apos;m Wisey 🦉. Learn the vehicles, choose your ride, pick up a passenger, and drive them safely to the airport.</p><Button onClick={() => setStarted(true)} className="mt-7 bg-yellow-400 text-slate-950 hover:bg-yellow-300">Start Adventure <ArrowRight className="h-4 w-4" /></Button></div></Card>;

  if (finished) return <Card className="overflow-hidden border-yellow-200 bg-[linear-gradient(145deg,#fff7d6,#ffffff,#dbeafe)] p-6 text-center shadow-soft sm:p-10"><motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: reduceMotion ? 0 : [0, -8, 8, 0] }} className="text-8xl">🏆</motion.div><p className="mt-5 font-bold uppercase tracking-[0.18em] text-lead-blue">Passenger delivered safely</p><h2 className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">You completed the Transportation Adventure!</h2><p className="mt-3 text-lg text-lead-gray">Wisey says: You are a Transportation Explorer and a friendly English-speaking driver!</p><div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4"><Result label="Vehicle" value={`${ride.emoji} ${ride.name}`} /><Result label="Total score" value={`${score} points`} /><Result label="Accuracy" value={`${attempts ? Math.round((correct / attempts) * 100) : 100}%`} /><Result label="English mission" value={correct >= 13 ? "Excellent" : "Completed"} /></div><div className="mt-6 flex justify-center gap-1">{[1,2,3,4,5].map((number) => <Star key={number} className={`h-9 w-9 ${number <= stars ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`} />)}</div><Button onClick={reset} className="mt-7"><RotateCcw className="h-4 w-4" />Play Again</Button></Card>;

  return <div className="grid gap-5"><Card className="p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">Stage {stage + 1} of 5</p><h2 className="font-heading text-xl font-extrabold text-lead-navy">{stageNames[stage]}</h2></div><div className="flex gap-2"><Stat icon="⭐" text={`${score} pts`} /><Stat icon={ride.emoji} text={stage >= 2 ? ride.name : "Explorer"} /></div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb,#facc15)]" animate={{ width: `${progress}%` }} /></div><div className="mt-3 flex justify-between text-xs font-semibold text-slate-500"><span>🏠 Start</span><span>🚘 Garage</span><span>🧍 Passenger</span><span>🚦 City</span><span>✈️ Airport</span></div></Card>
    <AnimatePresence mode="wait"><motion.div key={stage >= 3 ? "driving-mission" : `${stage}-${round}`} initial={reduceMotion ? {} : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><Card className="overflow-hidden p-5 sm:p-8"><div className="mb-6 flex items-start gap-3 rounded-2xl bg-blue-50 p-4"><span className="text-3xl">🦉</span><div><p className="font-bold text-lead-navy">Wisey says</p><p className="mt-1 text-sm leading-6 text-lead-gray">{feedback}</p></div></div>
      {stage === 0 && <IdentifyRound item={identify[round]} answered={answered} onChoose={(value) => tryAnswer(value, identify[round].vehicle.name, `It's a ${identify[round].vehicle.name.toLowerCase()}!`)} />}
      {stage === 1 && <SortRound vehicle={sortVehicles[round]} answered={answered} onChoose={(zone) => tryAnswer(zone, sortVehicles[round].zone, `A ${sortVehicles[round].name.toLowerCase()} travels on ${sortVehicles[round].zone.toLowerCase()}.`)} />}
      {stage === 2 && <RideGarage selected={answered ? ride.name : ""} onChoose={chooseRide} />}
      {(stage === 3 || stage === 4) && <MissionScene ride={ride} distance={driveDistance} lane={lane} destination={stage === 3 ? "Passenger" : "Airport"} dialogue={round === 0 ? null : stage === 3 ? passengerTalk[round - 1] : dropOffTalk[round - 1]} answered={answered} onMove={moveVehicle} onChoose={(value) => { const dialogue = stage === 3 ? passengerTalk[round - 1] : dropOffTalk[round - 1]; tryAnswer(value, dialogue.answer, dialogue.reply, stage === 4 && round === 3 ? 20 : 15); }} />}
      {answered && <div className="mt-6 flex justify-end"><Button onClick={next}>{stage === 4 && round === 3 ? "Finish Mission" : "Continue Adventure"}<ArrowRight className="h-4 w-4" /></Button></div>}
    </Card></motion.div></AnimatePresence></div>;
}

function IdentifyRound({ item, answered, onChoose }: { item: typeof identify[number]; answered: boolean; onChoose: (value: string) => void }) { return <div className="text-center"><motion.div animate={answered ? { scale: [1, 1.15, 1] } : { y: [0, -5, 0] }} transition={{ repeat: answered ? 0 : Infinity, duration: 2 }} className="text-8xl">{item.vehicle.emoji}</motion.div><h3 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">What is this?</h3><button onClick={() => speak(item.vehicle.name)} className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold text-lead-blue hover:bg-blue-50"><Volume2 className="h-4 w-4" />Hear the word</button><ChoiceButtons choices={item.choices} disabled={answered} onChoose={onChoose} /></div>; }
function SortRound({ vehicle, answered, onChoose }: { vehicle: Vehicle; answered: boolean; onChoose: (value: string) => void }) { return <div className="text-center"><div className="text-8xl">{vehicle.emoji}</div><h3 className="mt-4 font-heading text-2xl font-extrabold text-lead-navy">Where does the {vehicle.name.toLowerCase()} travel?</h3><div className="mt-6 grid gap-3 sm:grid-cols-3">{[["Land","🚗"],["Air","✈️"],["Water","🚢"]].map(([zone, icon]) => <button key={zone} disabled={answered} onClick={() => onChoose(zone)} className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-xl font-extrabold text-lead-navy transition hover:-translate-y-1 hover:border-blue-400 disabled:opacity-60"><span className="mb-2 block text-4xl">{icon}</span>{zone}</button>)}</div></div>; }
function RideGarage({ selected, onChoose }: { selected: string; onChoose: (ride: typeof rideChoices[number]) => void }) { return <div><p className="text-center text-sm font-bold uppercase tracking-wider text-lead-blue">Your city driving mission</p><h3 className="mt-2 text-center font-heading text-3xl font-extrabold text-lead-navy">Choose a vehicle to drive</h3><p className="mt-2 text-center text-lead-gray">There is no wrong choice. Pick your favorite.</p><div className="mt-7 grid gap-4 sm:grid-cols-3">{rideChoices.map((ride) => <button key={ride.name} onClick={() => onChoose(ride)} disabled={Boolean(selected)} className={`rounded-3xl border-2 p-6 transition hover:-translate-y-2 hover:shadow-soft ${ride.color} ${selected === ride.name ? "ring-4 ring-lead-blue/20" : ""}`}><motion.span whileHover={{ x: 8 }} className="block text-7xl">{ride.emoji}</motion.span><span className="mt-3 block font-heading text-xl font-extrabold text-lead-navy">{ride.name}</span></button>)}</div></div>; }
function MissionScene({ ride, distance, lane, destination, dialogue, answered, onMove, onChoose }: { ride: typeof rideChoices[number]; distance: number; lane: number; destination: string; dialogue: Dialogue | null; answered: boolean; onMove: (direction: "left" | "right" | "up" | "down") => void; onChoose: (value: string) => void }) {
  return <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold uppercase tracking-wider text-lead-blue">Live driving mission</p><h3 className="mt-1 font-heading text-2xl font-extrabold text-lead-navy">Drive with arrow keys or touch controls</h3></div><span className="rounded-full bg-yellow-50 px-4 py-2 font-bold text-yellow-800">{distance}% to {destination}</span></div>
    <div className="relative mt-6 min-h-[430px] overflow-hidden rounded-3xl bg-[linear-gradient(#bae6fd_0_25%,#86efac_25%_35%,#475569_35%_100%)] shadow-inner" tabIndex={0} aria-label="Driving game frame">
      <span className="absolute left-5 top-5 text-5xl">🏙️</span><span className="absolute right-5 top-4 rounded-2xl bg-white/90 p-3 text-center text-3xl shadow">{destination === "Passenger" ? "🧍" : "✈️"}<small className="block text-xs font-bold text-lead-navy">{destination}</small></span>
      {[48, 66, 84].map((top) => <div key={top} className="absolute left-0 right-0 border-t-4 border-dashed border-yellow-300/90" style={{ top: `${top}%` }} />)}
      <motion.div className="absolute z-10 text-6xl drop-shadow-lg" animate={{ left: `calc(${Math.min(distance, 90)}% - 20px)`, top: `${42 + lane * 18}%` }} transition={{ type: "spring", stiffness: 100, damping: 15 }}>{ride.emoji}</motion.div>
      {dialogue && <div className="absolute inset-x-3 top-16 z-20 mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur sm:inset-x-8 sm:p-6"><div className="flex items-start gap-3"><span className="text-4xl">🧍</span><div className="flex-1"><div className="flex items-start gap-2"><p className="flex-1 rounded-2xl rounded-tl-sm bg-slate-100 p-3 font-semibold text-lead-navy">{dialogue.passenger}</p><button onClick={() => speak(dialogue.passenger)} aria-label="Hear passenger" className="rounded-full bg-blue-50 p-3 text-lead-blue"><Volume2 className="h-5 w-5" /></button></div><p className="mt-3 text-xs font-bold uppercase tracking-wider text-lead-blue">Choose your driver reply</p></div></div><ChoiceButtons choices={dialogue.choices} disabled={answered} onChoose={onChoose} compact /></div>}
    </div>
    {!dialogue && <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><button onClick={() => onMove("left")} disabled={answered} className="grid h-14 place-items-center rounded-2xl bg-slate-100 text-lead-navy hover:bg-slate-200" aria-label="Drive left"><ArrowLeft /></button><div className="grid grid-cols-2 gap-2"><button onClick={() => onMove("up")} disabled={answered} className="grid h-12 w-14 place-items-center rounded-xl bg-blue-100 text-lead-blue" aria-label="Move up"><ArrowUp /></button><button onClick={() => onMove("down")} disabled={answered} className="grid h-12 w-14 place-items-center rounded-xl bg-blue-100 text-lead-blue" aria-label="Move down"><ArrowDown /></button></div><button onClick={() => onMove("right")} disabled={answered} className="grid h-14 place-items-center rounded-2xl bg-lead-blue text-white hover:bg-blue-700" aria-label="Drive right"><ArrowRight /></button></div>}
  </div>;
}
function ChoiceButtons({ choices, disabled, onChoose, compact = false }: { choices: string[]; disabled: boolean; onChoose: (value: string) => void; compact?: boolean }) { return <div className={`mx-auto grid max-w-3xl gap-2 ${compact ? "mt-3" : "mt-6"}`}>{choices.map((choice) => <button key={choice} disabled={disabled} onClick={() => onChoose(choice)} className={`${compact ? "min-h-10 px-4 py-2 text-sm" : "min-h-14 px-5 py-3"} rounded-2xl border-2 border-blue-100 bg-blue-50 text-left font-bold text-lead-navy transition hover:translate-x-1 hover:border-lead-blue hover:bg-blue-100 disabled:opacity-60`}>💬 {choice}</button>)}</div>; }
function Stat({ icon, text }: { icon: string; text: string }) { return <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-lead-navy">{icon} {text}</span>; }
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-heading text-xl font-extrabold text-lead-navy">{value}</p></div>; }
