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

export const checklist = ["Task completed", "Descriptive vocabulary", "Sentence patterns", "Fluency and confidence"];

const deliveryCollectibles = [
  { at: 8, icon: "🌳", word: "peaceful" },
  { at: 19, icon: "🦋", word: "colorful" },
  { at: 25, icon: "🪁", word: "breezy" },
];
const deliveryBlocks = [3, 10, 17, 22, 29];
const deliveryPuddles = [6, 14, 23, 31];

export function PostcardDelivery({ level, paused, sound, hints, finish, review, onReview }: StageProps & { review: boolean[]; onReview: (value: boolean[]) => void }) {
  const [position, setPosition] = useState(0);
  const [collected, setCollected] = useState<number[]>([]);
  const [bumps, setBumps] = useState(0);
  const [delivered, setDelivered] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [message, setMessage] = useState("Collect three picture stamps, then deliver the postcard.");
  const destination = places[[6, 0, 5][level]];

  function move(dx: number, dy: number) {
    if (paused || delivered) return;
    const x = position % 7 + dx;
    const y = Math.floor(position / 7) + dy;
    if (x < 0 || x > 6 || y < 0 || y > 4) return;
    const next = y * 7 + x;
    if (deliveryBlocks.includes(next)) {
      setBumps((value) => value + 1);
      setMessage("Road closed! Find another route.");
      arcadeSound("wrong", sound);
      return;
    }
    setPosition(next);
    const collectible = deliveryCollectibles.findIndex((item) => item.at === next);
    if (collectible >= 0 && !collected.includes(collectible)) {
      setCollected((value) => [...value, collectible]);
      setMessage(`${deliveryCollectibles[collectible].word} stamp collected!`);
      arcadeSound("correct", sound);
    } else if (deliveryPuddles.includes(next)) {
      setBumps((value) => value + 1);
      setMessage("Splash! You kept the postcard safe, but lost a bonus point.");
      arcadeSound("wrong", sound);
    } else if (next === 34) {
      if (collected.length < 3) setMessage("The postcard needs all three word stamps. Explore the other roads!");
      else {
        setDelivered(true);
        setMessage("Delivery complete! Now tell the story inside your postcard.");
        arcadeSound("complete", sound);
      }
    } else setMessage("Keep riding — look for the glowing picture stamps.");
  }

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.target as HTMLElement | null)?.closest("input,select,textarea")) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      move(Number(event.key === "ArrowRight") - Number(event.key === "ArrowLeft"), Number(event.key === "ArrowDown") - Number(event.key === "ArrowUp"));
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  return <div className="space-y-4">
    {!delivered ? <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-bold">Deliver to {destination.icon} {destination.name} · Stamps {collected.length}/3</p>
        <p className="rounded-full bg-amber-100 px-3 py-1 font-bold">Careful rides: {Math.max(0, 3 - bumps)}/3</p>
      </div>
      <p>Ride with the arrow keys or controls. Collect every picture stamp, dodge puddles and roadworks, then reach the red mailbox.</p>
      <div className="grid max-w-2xl grid-cols-7 gap-1 rounded-2xl border-4 border-sky-200 bg-emerald-100 p-2 shadow-inner">
        {Array.from({ length: 35 }, (_, index) => {
          const collectible = deliveryCollectibles.findIndex((item) => item.at === index);
          const isCollected = collected.includes(collectible);
          const highlighted = hints && collectible >= 0 && !isCollected;
          return <div key={index} className={`relative grid aspect-square place-items-center rounded-lg border border-white/70 text-xl sm:text-3xl ${deliveryBlocks.includes(index) ? "bg-orange-200" : deliveryPuddles.includes(index) ? "bg-sky-300" : "bg-amber-50"} ${highlighted ? "animate-pulse ring-4 ring-yellow-400" : ""}`}>
            <span aria-hidden="true">{index === position ? "🚲" : deliveryBlocks.includes(index) ? "🚧" : deliveryPuddles.includes(index) ? "💦" : index === 34 ? "📮" : collectible >= 0 && !isCollected ? deliveryCollectibles[collectible].icon : index % 6 === 0 ? "🌼" : ""}</span>
            {index === 34 && <span className="absolute bottom-0 text-[9px] font-black uppercase sm:text-xs">Finish</span>}
          </div>;
        })}
      </div>
      <div className="grid w-fit grid-cols-3 gap-2">
        <span /><button className={tile} disabled={paused} onClick={() => move(0, -1)}>Up</button><span />
        <button className={tile} disabled={paused} onClick={() => move(-1, 0)}>Left</button><button className={tile} disabled={paused} onClick={() => move(0, 1)}>Down</button><button className={tile} disabled={paused} onClick={() => move(1, 0)}>Right</button>
      </div>
      <div className="flex flex-wrap gap-2">{deliveryCollectibles.map((item, index) => <span key={item.word} className={`rounded-xl px-3 py-2 font-bold ${collected.includes(index) ? "bg-yellow-200" : "bg-slate-100 text-slate-400"}`}>{collected.includes(index) ? `${item.icon} ${item.word}` : "❔ mystery stamp"}</span>)}</div>
    </> : <>
      <div className="rounded-2xl bg-gradient-to-r from-sky-100 to-yellow-100 p-5">
        <p className="text-xl font-black">📬 Postcard delivered to {destination.name}!</p>
        <p className="mt-2">Use your three collected words to describe this place: <strong>{deliveryCollectibles.map((item) => item.word).join(" · ")}</strong></p>
      </div>
      <p className="font-bold">{speaking[level][0]} {speaking[level][1]}</p>
      {hints && <p className="rounded-xl bg-blue-50 p-3">Starter: {speaking[level][2]}</p>}
      <label className="flex items-center gap-2"><input type="checkbox" checked={spoken} onChange={(event) => setSpoken(event.target.checked)} /> I described the destination aloud using the stamps.</label>
      <fieldset className="rounded-xl bg-blue-50 p-4"><legend className="font-bold">Teacher postcard check</legend>{checklist.map((label, index) => <label key={label} className="flex gap-2 py-1"><input type="checkbox" checked={review[index]} onChange={(event) => onReview(review.map((value, item) => index === item ? event.target.checked : value))} />{label}</label>)}</fieldset>
      <button className={playButton} disabled={paused || !spoken} onClick={() => {
        const checks = review.filter(Boolean).length;
        finish(checks >= 4 && bumps === 0 ? 3 : checks >= 2 && bumps <= 2 ? 2 : 1);
      }}>Stamp delivered postcard</button>
    </>}
    <p role="status" className="font-bold text-blue-800">{message}</p>
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
