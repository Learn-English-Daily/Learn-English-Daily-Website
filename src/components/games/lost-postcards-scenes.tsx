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

const decorations = ["🌳", "🌷", "🪑", "💧", "📚", "☕", "🦋", "🪁"];
export const checklist = ["Task completed", "Descriptive vocabulary", "Sentence patterns", "Fluency and confidence"];

export function DreamBuilder({ level, paused, hints, finish, review, onReview }: StageProps & { review: boolean[]; onReview: (value: boolean[]) => void }) {
  const [setting, setSetting] = useState(0);
  const [weather, setWeather] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [starters, setStarters] = useState(level === 0);
  const [ready, setReady] = useState(false);
  const [spoken, setSpoken] = useState(false);
  return <div className="space-y-4">
    <p>Pick a setting. Add at least two details to make it yours, then give your teacher a tour.</p>
    <div className="flex flex-wrap gap-2">{places.map((place, index) => <button key={place.name} className={tile} aria-pressed={setting === index} disabled={paused} onClick={() => setSetting(index)}>{place.icon} {place.name}</button>)}</div>
    <div className={`relative grid min-h-48 place-items-center overflow-hidden rounded-2xl border border-blue-200 ${weather ? "bg-gradient-to-b from-orange-200 via-rose-100 to-emerald-200" : "bg-gradient-to-b from-sky-300 via-blue-50 to-emerald-200"}`}>
      <span className="absolute right-4 top-3 text-3xl">{weather ? "🌅" : "☀️"}</span><span className="text-7xl">{places[setting].icon}</span>
      <div className="flex flex-wrap justify-center gap-3 text-3xl">{items.map((item, index) => <button key={index} aria-label={`Remove decoration ${index + 1}`} className="focus-ring rounded" disabled={paused} onClick={() => setItems(items.filter((_, i) => i !== index))}>{item}</button>)}</div>
    </div>
    <div className="flex flex-wrap gap-2">{decorations.map((item, index) => <button key={item} className={tile} aria-label={`Add ${["tree", "flowers", "bench", "pond", "books", "coffee", "butterfly", "kite"][index]}`} disabled={paused || items.length >= 8} onClick={() => setItems([...items, item])}>{item}</button>)}<button className={tile} disabled={paused} onClick={() => setWeather(!weather)}>{weather ? "Switch to morning" : "Switch to sunset"}</button></div>
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
  const [visible, setVisible] = useState(1);
  const [timer, setTimer] = useState(false);
  const [seconds, setSeconds] = useState(45);
  const [misses, setMisses] = useState(0);
  const [solved, setSolved] = useState(false);
  const [message, setMessage] = useState("");
  const [assembled, setAssembled] = useState<string[]>([]);
  const chunks = ["I like this place", "because", "it is special to me."];
  useEffect(() => {
    if (!timer || paused || solved || !seconds) return;
    const tick = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(tick);
  }, [paused, seconds, solved, timer]);
  return <div className="space-y-4">
    {!solved ? <>
      <div className="flex flex-wrap items-center gap-3"><button className={tile} aria-pressed={timer} onClick={() => { setTimer(!timer); setSeconds(45); }}>{timer ? "Switch to untimed" : "Try a 45-second countdown"}</button>
      {timer && <p>{seconds ? `${seconds}s for the bonus` : "Bonus time ended. Keep exploring!"}</p>}</div>
      <ol className="space-y-2">{clues.slice(0, hints ? 3 : visible).map((clue) => <li key={clue} className="rounded-xl bg-blue-50 p-3">{clue}</li>)}</ol>
      <div className="flex flex-wrap gap-2"><button className={tile} disabled={paused || !sound} onClick={() => speakArcade(clues.slice(0, hints ? 3 : visible).join(" "), sound)}>Listen to clues</button><button className={tile} disabled={paused || visible >= 3 || hints} onClick={() => setVisible(visible + 1)}>Reveal next clue</button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{places.map((item, index) => <button key={item.name} disabled={paused} className="focus-ring rounded-[45%] border-4 border-yellow-300 bg-gradient-to-b from-blue-200 to-violet-100 py-4 font-bold text-lead-navy shadow hover:border-lead-blue" onClick={() => {
        if (index === answer) { setSolved(true); setMessage(""); arcadeSound("complete", sound); }
        else { setMisses(misses + 1); setVisible(Math.min(3, visible + 1)); setMessage("That portal didn’t match. Look at the next clue."); }
      }}><span className="block text-3xl">{item.icon}</span>{item.name}</button>)}</div>
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
