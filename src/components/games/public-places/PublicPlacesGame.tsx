"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Map, RotateCcw, Volume2 } from "lucide-react";
import { GameCanvas, type GameCanvasHandle } from "@/components/games/public-places/GameCanvas";
import type { Direction, GameSnapshot, MissionId } from "@/components/games/public-places/game-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const missionData: Array<{ id: MissionId; label: string; idLabel: string }> = [
  { id: "supermarket", label: "Buy 2 apples and milk", idLabel: "Beli 2 apel dan susu" },
  { id: "library", label: "Return the book and find an animal book", idLabel: "Kembalikan buku dan cari buku hewan" },
  { id: "park", label: "Meet your friend and play ball", idLabel: "Temui teman dan bermain bola" },
  { id: "hospital", label: "Take medicine to the doctor", idLabel: "Bawa obat kepada dokter" }
];
const initialSnapshot: GameSnapshot = {
  scene: "home", inventory: { apples: 0, milk: 0, libraryBook: 1, animalBook: 0, medicine: 0, ball: 0 }, money: 20,
  completed: [], visited: [], finalRouteActive: false, finalRouteIndex: 0, won: false,
  speaker: "Wisey", message: "Good morning! Let's explore the town today. Use the arrow keys or WASD to move.", learningPhrase: "", nearbyLabel: ""
};

export function PublicPlacesGame() {
  const gameRef = useRef<GameCanvasHandle>(null);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [missionsOpen, setMissionsOpen] = useState(true);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [language, setLanguage] = useState<"en" | "id">("en");

  function move(direction: Direction, pressed: boolean) { gameRef.current?.setDirection(direction, pressed); }
  function say(text: string) { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); const voice = new SpeechSynthesisUtterance(text); voice.lang = "en-US"; voice.rate = .78; window.speechSynthesis.speak(voice); }

  if (snapshot.won) return <Victory snapshot={snapshot} replay={() => window.location.reload()} />;

  return <div className="grid gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lead-navy p-3 text-white">
      <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-300">LEAD City Adventure</p><p className="font-heading text-lg font-extrabold">{sceneName(snapshot.scene)} · {dayPeriod(snapshot.completed.length)}</p></div>
      <div className="flex items-center gap-2"><span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">Money: ${snapshot.money}</span><button onClick={() => setLanguage((value) => value === "en" ? "id" : "en")} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-lead-navy">{language === "en" ? "🇮🇩 Bahasa" : "🇬🇧 English"}</button></div>
    </div>

    <div className="relative overflow-hidden rounded-3xl border-4 border-slate-800 bg-slate-950 shadow-soft">
      <GameCanvas ref={gameRef} onSnapshot={setSnapshot} />
      <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] gap-2">
        <button onClick={() => setMissionsOpen((value) => !value)} className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-950/85 px-3 py-2 text-xs font-bold text-white backdrop-blur"><Map className="h-4 w-4" />Missions {missionsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
        <button onClick={() => setInventoryOpen((value) => !value)} className="pointer-events-auto rounded-xl bg-slate-950/85 px-3 py-2 text-xs font-bold text-white backdrop-blur">Backpack {inventoryOpen ? "▲" : "▼"}</button>
      </div>
      {missionsOpen ? <MissionOverlay snapshot={snapshot} language={language} /> : null}
      {inventoryOpen ? <InventoryOverlay snapshot={snapshot} /> : null}
      <div className="absolute bottom-3 left-1/2 w-[min(92%,620px)] -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-950/90 p-3 text-white shadow-xl backdrop-blur">
        <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lead-blue text-xs font-black">{snapshot.speaker.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-yellow-300">{snapshot.speaker}</p><p className="mt-1 text-sm leading-5">{translatedMessage(snapshot.message, language)}</p>{snapshot.learningPhrase ? <button onClick={() => say(snapshot.learningPhrase)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-blue-100"><Volume2 className="h-3 w-3" />{snapshot.learningPhrase}</button> : null}</div></div>
      </div>
      {snapshot.nearbyLabel ? <button onClick={() => gameRef.current?.interact()} className="absolute bottom-28 left-1/2 -translate-x-1/2 animate-pulse rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 shadow-xl"><span className="hidden sm:inline">[SPACE] </span>{snapshot.nearbyLabel}</button> : null}
    </div>

    <div className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <p className="hidden text-sm font-semibold text-lead-gray sm:block">Keyboard: Arrow keys / WASD · SPACE to interact</p>
      <TouchControls move={move} />
      <Button onPointerDown={() => gameRef.current?.interact()} className="h-14 touch-none select-none bg-yellow-400 text-slate-950 hover:bg-yellow-300 sm:justify-self-end">INTERACT <span className="hidden sm:inline">(SPACE)</span></Button>
    </div>
  </div>;
}

function TouchControls({ move }: { move: (direction: Direction, pressed: boolean) => void }) {
  function handlers(direction: Direction) { return { onPointerDown: (event: React.PointerEvent) => { event.currentTarget.setPointerCapture(event.pointerId); move(direction, true); }, onPointerUp: () => move(direction, false), onPointerCancel: () => move(direction, false), onPointerLeave: () => move(direction, false) }; }
  const control = "grid h-12 w-14 touch-none select-none place-items-center rounded-xl bg-lead-blue text-xl font-black text-white shadow-sm active:bg-blue-800";
  return <div className="mx-auto grid w-fit grid-cols-3 gap-1"><span /><button className={control} {...handlers("up")}>↑</button><span /><button className={control} {...handlers("left")}>←</button><button className={control} {...handlers("down")}>↓</button><button className={control} {...handlers("right")}>→</button></div>;
}

function MissionOverlay({ snapshot, language }: { snapshot: GameSnapshot; language: "en" | "id" }) {
  const finalStops = ["Supermarket", "Park", "Library", "Home"];
  return <div className="absolute left-3 top-14 w-[min(290px,calc(100%-1.5rem))] rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-wider text-lead-blue">{language === "en" ? "Today's missions" : "Misi hari ini"}</p><div className="mt-2 grid gap-1.5">{missionData.map((mission) => <p key={mission.id} className={`text-xs font-bold ${snapshot.completed.includes(mission.id) ? "text-emerald-700" : "text-lead-navy"}`}>{snapshot.completed.includes(mission.id) ? "✓" : "□"} {language === "en" ? mission.label : mission.idLabel}</p>)}</div>{snapshot.finalRouteActive ? <div className="mt-3 border-t border-slate-200 pt-2"><p className="text-[10px] font-black uppercase text-amber-700">Final route</p><p className="mt-1 text-xs font-bold text-lead-navy">{finalStops.map((stop, index) => `${index < snapshot.finalRouteIndex ? "✓" : index === snapshot.finalRouteIndex ? "→" : "□"} ${stop}`).join("  ")}</p></div> : null}</div>;
}

function InventoryOverlay({ snapshot }: { snapshot: GameSnapshot }) {
  const items = [["Apple", snapshot.inventory.apples], ["Milk", snapshot.inventory.milk], ["Library book", snapshot.inventory.libraryBook], ["Animal book", snapshot.inventory.animalBook], ["Medicine", snapshot.inventory.medicine], ["Ball", snapshot.inventory.ball]].filter(([, count]) => Number(count) > 0);
  return <div className="absolute left-32 top-14 w-52 rounded-2xl bg-white/95 p-3 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-wider text-lead-blue">Backpack</p><div className="mt-2 grid gap-1">{items.length ? items.map(([label, count]) => <p key={String(label)} className="text-xs font-bold text-lead-navy">{label} ×{count}</p>) : <p className="text-xs text-lead-gray">Empty</p>}</div></div>;
}

function Victory({ snapshot, replay }: { snapshot: GameSnapshot; replay: () => void }) {
  return <Card className="overflow-hidden border-yellow-200 bg-[linear-gradient(145deg,#eff6ff,#ffffff,#fef3c7)] p-6 text-center shadow-soft sm:p-10"><div className="text-8xl">🏆</div><p className="mt-5 font-bold uppercase tracking-[0.18em] text-sky-700">City Adventure Complete!</p><h2 className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">City Explorer</h2><p className="mt-3 text-lg text-lead-gray">You walked through town, entered buildings, helped people, and completed a real day in the city.</p><div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-3"><Result label="Places visited" value={`${snapshot.visited.length} / 4`} /><Result label="Missions" value={`${snapshot.completed.length} / 4`} /><Result label="Money left" value={`$${snapshot.money}`} /></div><div className="mx-auto mt-6 max-w-xl rounded-2xl bg-white p-5 text-left shadow-sm"><p className="font-heading font-extrabold text-lead-navy">English practiced</p><p className="mt-2 text-sm leading-7 text-lead-gray">“I go to the supermarket.”<br />“I go to the park.”<br />“I go to the library.”<br />“I go to the hospital.”</p></div><Button onClick={replay} className="mt-7"><RotateCcw className="h-4 w-4" />Play Again</Button></Card>;
}
function Result({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-heading text-xl font-extrabold text-lead-navy">{value}</p></div>; }
function sceneName(scene: GameSnapshot["scene"]) { return scene === "city" ? "LEAD Town" : scene.charAt(0).toUpperCase() + scene.slice(1); }
function dayPeriod(done: number) { return done < 2 ? "Morning ☀" : done < 4 ? "Afternoon" : "Evening"; }
function translatedMessage(message: string, language: "en" | "id") {
  if (language === "en") return message;
  const translations: Record<string, string> = {
    "Good morning! Let's explore the town today. Use the arrow keys or WASD to move.": "Selamat pagi! Mari menjelajahi kota hari ini. Gunakan tombol panah atau WASD untuk bergerak.",
    "You are back in town. Check today's missions and choose your route.": "Kamu kembali di kota. Periksa misi hari ini dan pilih rute.",
    "Move closer to a person, object, or entrance. Look for the interaction prompt.": "Bergeraklah lebih dekat ke orang, benda, atau pintu masuk. Cari petunjuk interaksi."
  };
  return translations[message] || message;
}
