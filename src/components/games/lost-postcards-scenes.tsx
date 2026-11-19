"use client";

import { useEffect, useState } from "react";
import { arcadeSound, speakArcade } from "./lead-arcade/audio";
import { places, speaking } from "./lost-postcards-content";
import { playButton, type StageProps } from "./lost-postcards-arcade";

const tile = "focus-ring rounded-xl border border-blue-200 bg-white px-3 py-2 font-bold text-lead-navy hover:bg-blue-50 disabled:opacity-50";

export function Detective({ level, paused, sound, hints, finish }: StageProps) {
  const [caseIndex, setCase] = useState(0);
  const [found, setFound] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [message, setMessage] = useState("");
  const missions = [0, 2, 5, 6].slice(0, 2 + level);
  const answer = missions[caseIndex];
  const place = places[answer];
  const decoy = (answer + 1) % places.length;
  const scenery = [place.objects[0], places[decoy].objects[0], place.objects[1], places[decoy].objects[1], place.objects[2]];
  const [solved, setSolved] = useState(false);
  const clue = place.clues[level === 2 ? 2 : 0];
  return <div className="space-y-4">
    <p className="font-bold">Case {caseIndex + 1} of {missions.length} · {clue}</p>
    <button className={tile} disabled={!sound || paused} onClick={() => speakArcade(clue, sound)}>Read clue aloud</button>
    <div className="relative h-60 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-200 via-amber-50 to-emerald-200">
      <div className="absolute inset-x-0 bottom-0 h-24 rounded-t-[55%] bg-emerald-300/80" />
      {scenery.map((icon, i) => <button key={i} aria-label={`Inspect object ${i + 1}: ${icon}`} aria-pressed={found.includes(i)} disabled={paused || solved} className={`focus-ring absolute -translate-x-1/2 rounded-full p-2 text-3xl transition hover:scale-110 sm:text-5xl ${found.includes(i) ? "bg-yellow-200 ring-4 ring-yellow-400" : hints && i % 2 === 0 ? "ring-2 ring-white" : ""}`}
        style={{ left: `${13 + i * 18}%`, top: `${[48, 19, 61, 30, 48][i]}%` }} onClick={() => {
          if (i % 2) { setMessage("That object belongs to another postcard. Keep looking."); return; }
          if (!found.includes(i)) { setFound([...found, i]); arcadeSound("correct", sound); }
          setMessage("Evidence added to your notebook.");
        }}>{icon}</button>)}
    </div>
    <p>Evidence {found.length}/3 · Say what helped you identify the place.</p>
    <div className="flex flex-wrap gap-3">{found.map((i) => <span key={i} className="rounded-lg bg-yellow-100 px-3 py-2">{scenery[i]} {place.clues[i / 2]}</span>)}</div>
    {found.length >= (level === 0 ? 2 : 3) && !solved && <div className="flex gap-3">{[decoy, answer, (answer + 4) % 8].sort((a,b) => a-b).map((id) => <button key={id} className={tile} disabled={paused} onClick={() => {
      if (id === answer) { setSolved(true); setMessage("Mystery solved!"); arcadeSound("complete", sound); }
      else { setErrors(errors + 1); setMessage("Try matching all the evidence to one place."); }
    }}>{places[id].icon} {places[id].name}</button>)}</div>}
    <p role="status">{message}</p>
    {solved && <button className={playButton} disabled={paused} onClick={() => {
      if (caseIndex + 1 === missions.length) finish(errors === 0 ? 3 : errors <= 2 ? 2 : 1);
      else { setCase(caseIndex + 1); setFound([]); setSolved(false); setMessage(""); }
    }}>{caseIndex + 1 === missions.length ? "Stamp postcard" : "Next case"}</button>}
  </div>;
}

const decorations = [["🌳", "Tree"], ["🌷", "Flowers"], ["🪑", "Bench"], ["💧", "Pond"], ["📚", "Books"], ["☕", "Coffee"], ["🦋", "Butterfly"], ["🪁", "Kite"]];
export const checklist = ["Task completed", "Descriptive vocabulary", "Sentence patterns", "Fluency and confidence"];

export function DreamBuilder({ level, paused, hints, finish, review, onReview }: StageProps & { review: boolean[]; onReview: (value: boolean[]) => void }) {
  const [setting, setSetting] = useState(0);
  const [weather, setWeather] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [starters, setStarters] = useState(level === 0);
  const [ready, setReady] = useState(false);
  const [spoken, setSpoken] = useState(false);
  return <div className="space-y-4">
    <p>Choose a setting and add at least two details. Tap an item in your scene to remove it, then give your teacher a tour.</p>
    <div className="grid items-start gap-4 md:grid-cols-[1fr_17rem]">
      <div className={`relative grid min-h-64 place-items-center overflow-hidden rounded-2xl border border-blue-200 ${weather ? "bg-gradient-to-b from-orange-300 via-rose-100 to-emerald-300" : "bg-gradient-to-b from-sky-300 via-cyan-50 to-emerald-300"}`}>
        <div className="absolute inset-x-0 bottom-0 h-20 rounded-t-[45%] bg-emerald-400/60" />
        <span className="absolute right-4 top-3 text-3xl">{weather ? "🌅" : "☀️"}</span>
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 font-bold">{places[setting].name}</span>
        <span className="self-center text-7xl drop-shadow-lg">{places[setting].icon}</span>
        <div className="z-10 grid w-full grid-cols-4 gap-1 self-end p-3 text-3xl">{items.map((item, index) => <button key={index} aria-label={`Remove ${decorations.find(([icon]) => icon === item)?.[1]}`} className="focus-ring rounded-lg py-1 transition hover:bg-white/60" disabled={paused} onClick={() => setItems(items.filter((_, i) => i !== index))}>{item}</button>)}</div>
      </div>
      <aside className="space-y-3 rounded-2xl bg-blue-50 p-3">
        <label className="grid gap-1 font-bold">Setting<select className={tile} disabled={paused} value={setting} onChange={(event) => setSetting(Number(event.target.value))}>{places.map((place, index) => <option key={place.name} value={index}>{place.icon} {place.name}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2">{decorations.map(([item, label]) => <button key={item} className={tile} aria-label={`Add ${label.toLowerCase()}`} disabled={paused || items.length >= 8} onClick={() => setItems([...items, item])}>{item} {label}</button>)}</div>
        <div className="flex flex-wrap gap-2"><button className={tile} disabled={paused} onClick={() => setWeather(!weather)}>{weather ? "Morning" : "Sunset"}</button><button className={tile} disabled={paused || !items.length} onClick={() => setItems(items.slice(0, -1))}>Undo</button></div>
        <p aria-live="polite">{items.length}/8 details added</p>
      </aside>
    </div>
    {!ready ? <button className={playButton} disabled={paused || items.length < 2} onClick={() => setReady(true)}>Start my tour</button> : <>
      <p className="font-bold">{speaking[level][0]} {speaking[level][1]}</p>
      {!hints && <button className={tile} onClick={() => setStarters(!starters)}>{starters ? "Hide" : "Show"} sentence starters</button>}
      {(starters || hints) && <p>{speaking[level][2]}</p>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={spoken} onChange={(e) => setSpoken(e.target.checked)} /> I gave my tour aloud.</label>
      <fieldset className="rounded-xl bg-blue-50 p-4"><legend className="font-bold">Teacher feedback · optional</legend>{checklist.map((label, i) => <label key={label} className="flex gap-2 py-1"><input type="checkbox" checked={review[i]} onChange={(e) => onReview(review.map((value, j) => i === j ? e.target.checked : value))} />{label}</label>)}<p className="mt-2">Follow-up: What would you show a visitor first?</p></fieldset>
      <button className={playButton} disabled={paused || !spoken} onClick={() => finish(review.filter(Boolean).length >= 4 ? 3 : review.filter(Boolean).length >= 2 ? 2 : 1)}>Stamp postcard</button>
    </>}
  </div>;
}

export function MysteryPortal({ level, paused, sound, hints, finish }: StageProps) {
  const [answer] = useState(() => [1, 3, 4][Math.floor(Math.random() * 3)]);
  const place = places[answer];
  const clues = level === 2 ? [...place.clues].reverse() : place.clues;
  const [collected, setCollected] = useState<number[]>([]);
  const [position, setPosition] = useState(12);
  const [turn, setTurn] = useState(0);
  const [timer, setTimer] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState("");
  const [assembled, setAssembled] = useState<string[]>([]);
  const chunks = ["I like this place", "because", "it is special to me."];
  const field = ["p", ".", "p", ".", "p", ".", "c", ".", "c", ".", "p", ".", ".", ".", "p", ".", "#", "c", "#", ".", "p", ".", "p", ".", "p"];
  const relics = [6, 8, 17];
  function move(dx: number, dy: number) {
    if (paused || solved) return;
    const x = position % 5 + dx, y = Math.floor(position / 5) + dy;
    if (x < 0 || x > 4 || y < 0 || y > 4 || field[y * 5 + x] === "#") return;
    const next = y * 5 + x;
    const nextTurn = turn + 1;
    setTurn(nextTurn);
    if ([11, 12, 13, 12][nextTurn % 4] === next) {
      setMisses(misses + 1);
      setMessage("The guardian blocked that tile. Your clues are safe.");
      return;
    }
    setPosition(next);
    const clue = relics.indexOf(next);
    if (clue >= 0 && !collected.includes(clue)) {
      setCollected([...collected, clue]);
      arcadeSound("correct", sound);
    }
    if (field[next] === "p") {
      if (collected.length < 3) { setMessage("Gather three clue lanterns before entering a portal."); return; }
      const id = field.slice(0, next).filter((value) => value === "p").length;
      if (id === answer) { setSolved(true); setMessage(""); arcadeSound("complete", sound); }
      else { setMisses(misses + 1); setMessage("That destination doesn’t fit. Compare the clues again."); }
    } else setMessage("");
  }
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (paused || solved || (event.target as HTMLElement | null)?.closest("input,select,textarea")) return;
      const key = event.key;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) return;
      event.preventDefault();
      move(Number(key === "ArrowRight") - Number(key === "ArrowLeft"), Number(key === "ArrowDown") - Number(key === "ArrowUp"));
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });
  useEffect(() => {
    if (!timer || paused || solved || !seconds) return;
    const tick = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(tick);
  }, [paused, seconds, solved, timer]);
  return <div className="space-y-4">
    {!solved ? <>
      <div className="flex flex-wrap items-center gap-3"><button className={tile} aria-pressed={timer} onClick={() => { setTimer(!timer); setSeconds(45); }}>{timer ? "Switch to untimed" : "Try a 45-second countdown"}</button>
      {timer && <p>{seconds ? `${seconds}s for the bonus` : "Bonus time ended. Keep exploring!"}</p>}</div>
      <p>Move with the arrow keys or the buttons. Collect the three lanterns, dodge the guardian’s highlighted next tile, then step into the matching portal.</p>
      <div className="grid max-w-lg grid-cols-5 gap-1 rounded-2xl bg-sky-200 p-2">
        {field.map((value, index) => {
          const portal = value === "p" ? places[field.slice(0, index).filter((entry) => entry === "p").length] : undefined;
          const guard = [11, 12, 13, 12][turn % 4] === index;
          const danger = [11, 12, 13, 12][(turn + 1) % 4] === index;
          return <div key={index} className={`grid aspect-square place-content-center rounded-lg text-center ${danger ? "bg-amber-200 ring-2 ring-amber-500" : portal ? "bg-violet-100" : value === "#" ? "bg-blue-400" : "bg-white"}`}><span className="text-xl sm:text-3xl">{index === position ? "🧑‍🚀" : guard ? "🤖" : portal?.icon ?? (relics.includes(index) && !collected.includes(relics.indexOf(index)) ? "🏮" : "")}</span>{portal && <span className="text-[10px] font-bold sm:text-sm">{portal.name}</span>}</div>;
        })}
      </div>
      <div className="flex flex-wrap gap-2">{([["Up", 0, -1], ["Left", -1, 0], ["Down", 0, 1], ["Right", 1, 0]] as const).map(([label, dx, dy]) => <button className={tile} disabled={paused} key={label} onClick={() => move(dx, dy)}>{label}</button>)}</div>
      <p className="font-bold">Clue lanterns {collected.length}/3</p>
      <ol className="space-y-2">{(hints ? clues : collected.map((index) => clues[index])).map((clue) => <li key={clue} className="rounded-xl bg-blue-50 p-3">{clue}</li>)}</ol>
      <button className={tile} disabled={paused || !sound || (!hints && !collected.length)} onClick={() => speakArcade((hints ? clues : collected.map((index) => clues[index])).join(" "), sound)}>Listen to clues</button>
    </> : <>
      <p className="text-xl font-bold">{place.icon} Destination restored · {place.name}</p>
      <p>Put the reason together, then say your own version aloud.</p>
      <div className="flex flex-wrap gap-2">{[chunks[2], chunks[0], chunks[1]].filter((chunk) => !assembled.includes(chunk)).map((chunk) => <button key={chunk} className={tile} disabled={paused} onClick={() => {
        if (chunk === chunks[assembled.length]) { setAssembled([...assembled, chunk]); setMessage(""); }
        else setMessage("Start with what you like, then add the reason.");
      }}>{chunk}</button>)}</div>
      <p className="font-bold">{assembled.join(" ")}</p>
      {assembled.length === 3 && <><p>{speaking[level][0]} {speaking[level][1]}</p><button className={playButton} disabled={paused} onClick={() => finish(misses === 0 && (!timer || seconds > 0) ? 3 : misses <= 2 ? 2 : 1)}>I spoke aloud · Stamp final postcard</button></>}
    </>}
    <p role="status">{message}</p>
  </div>;
}
