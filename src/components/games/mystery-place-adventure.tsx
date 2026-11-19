"use client";

import { useEffect, useRef, useState } from "react";

const places = [
  { name: "Beach", icon: "🏖️", sky: "from-cyan-400 to-amber-100", floor: "bg-amber-700", props: ["🐚", "🌊", "🪁"], words: ["breezy", "colorful", "peaceful"], sounds: "waves rolling onto the sand", activity: "fly a kite" },
  { name: "Park", icon: "🌳", sky: "from-sky-400 to-emerald-100", floor: "bg-emerald-800", props: ["🌳", "🛝", "🌷"], words: ["shady", "lively", "spacious"], sounds: "birds singing", activity: "play with my friends" },
  { name: "Night Market", icon: "🏮", sky: "from-indigo-950 to-fuchsia-700", floor: "bg-violet-950", props: ["🏮", "🍢", "🎶"], words: ["bustling", "bright", "delicious"], sounds: "music and people chatting", activity: "try a new snack" },
];
type Place = (typeof places)[number];
const button = "focus-ring rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-100 disabled:opacity-50";
const track = [
  { at: 650, word: 0 }, { at: 1100 }, { at: 1650, word: 1 }, { at: 2130 },
  { at: 2700, word: 2 }, { at: 3130 }, { at: 3710, word: 0 }, { at: 4130 },
  { at: 4650, word: 1 }, { at: 5050 }, { at: 5610, word: 2 },
];
const finish = 6150;

function WordRunner({ place, onFinish }: { place: Place; onFinish: (words: string[]) => void }) {
  const world = useRef({ distance: 0, height: 0, velocity: 0, bumps: 0, picked: new Set<number>(), passed: new Set<number>() });
  const [frame, setFrame] = useState({ distance: 0, height: 0, bumps: 0, picked: [] as number[] });
  const [running, setRunning] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const complete = frame.distance >= finish;

  function jump() {
    const state = world.current;
    if (state.height === 0) state.velocity = 360;
  }

  useEffect(() => {
    if (!running) return;
    function onKey(event: KeyboardEvent) {
      if (event.repeat || ![" ", "ArrowUp"].includes(event.key)) return;
      if (event.key === " " && (event.target as HTMLElement | null)?.closest("button")) return;
      event.preventDefault();
      jump();
    }
    let previous = 0;
    let animation = 0;
    function tick(now: number) {
      const dt = previous ? Math.min((now - previous) / 1000, 0.035) : 0;
      previous = now;
      const state = world.current;
      state.distance = Math.min(finish, state.distance + dt * 225);
      state.height = Math.max(0, state.height + state.velocity * dt);
      state.velocity = state.height > 0 ? state.velocity - 850 * dt : state.velocity > 0 && !dt ? state.velocity : 0;
      for (const [index, item] of track.entries()) {
        const gap = item.at - state.distance;
        if (item.word !== undefined) {
          if (Math.abs(gap) < 40 && state.height > 24 && !state.picked.has(index)) {
            state.picked.add(index);
            setAnnouncement(`Collected ${place.words[item.word]}!`);
          }
        } else if (Math.abs(gap) < 23 && !state.passed.has(index)) {
          state.passed.add(index);
          if (state.height < 22) {
            state.bumps++;
            setAnnouncement("Bump! Keep going. Jump just before the crate.");
          }
        }
      }
      setFrame({ distance: state.distance, height: state.height, bumps: state.bumps, picked: [...state.picked] });
      if (state.distance < finish) animation = requestAnimationFrame(tick);
      else setRunning(false);
    }
    window.addEventListener("keydown", onKey);
    animation = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener("keydown", onKey);
    };
  }, [place, running]);

  const words = [...new Set(frame.picked.map((index) => place.words[track[index].word!]))];
  return <div className="space-y-4">
    <h2 className="text-2xl font-black">Word Runner · {place.name}</h2>
    <p>Jump over crates and through floating words. Use ↑, Space, or the Jump button. Say each new word aloud when you collect it.</p>
    <div className={`relative h-64 overflow-hidden rounded-2xl bg-gradient-to-b ${place.sky}`}>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-12 flex justify-around text-5xl opacity-60">{place.props.map((icon) => <span key={icon}>{icon}</span>)}</div>
      <div aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-12 border-t-4 border-white/50 ${place.floor}`} />
      <div className="absolute left-[17%] z-10 -translate-x-1/2 text-4xl" style={{ bottom: 48 + frame.height }} aria-hidden="true">🏃</div>
      {track.map((item, index) => {
        const left = 17 + (item.at - frame.distance) / 7;
        if (left < -15 || left > 110 || frame.picked.includes(index)) return null;
        return <div key={item.at} className="absolute z-10 -translate-x-1/2 whitespace-nowrap" style={{ left: `${left}%`, bottom: item.word === undefined ? 48 : 95 }}>
          {item.word === undefined ? <span className="text-3xl" aria-label="Crate">📦</span> : <span className="rounded-full bg-slate-950 px-3 py-1 font-bold text-cyan-200">{place.words[item.word]}</span>}
        </div>;
      })}
      <div className="absolute left-3 top-3 rounded-lg bg-slate-950 px-3 py-2 font-bold">Words {words.length}/3 · Bumps {frame.bumps}</div>
    </div>
    <p role="status" className="min-h-6 text-cyan-200">{announcement}</p>
    {complete ? <button className={button} onClick={() => onFinish(words)}>Open the field notebook</button> : running ? <button className={button} onClick={jump}>Jump</button> : <button className={button} onClick={() => setRunning(true)}>Start running</button>}
  </div>;
}

export function MysteryPlace() {
  const [name, setName] = useState("");
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<"start" | "run" | "scene" | "speak" | "done">("start");
  const [words, setWords] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [tier, setTier] = useState(0);
  const place = places[index];

  return <section className="space-y-5 py-6">
    <p className="font-bold text-cyan-300">LEAD · Meeting 30 · My Favorite Place</p>
    <h1 className="font-heading text-4xl font-black sm:text-6xl">Mystery Place</h1>
    {stage === "start" ? <form className="space-y-4 rounded-2xl bg-slate-900 p-5" onSubmit={(event) => { event.preventDefault(); if (name.trim()) setStage("run"); }}>
      <label className="block font-bold">Explorer name<input required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className="focus-ring ml-3 rounded-lg border border-slate-500 bg-slate-950 p-2" /></label>
      <fieldset className="space-y-2"><legend className="font-bold">Choose a place to explore</legend><div className="flex flex-wrap gap-2">{places.map((item, i) => <button key={item.name} type="button" aria-pressed={index === i} className={`rounded-lg border px-4 py-3 font-bold ${index === i ? "border-cyan-300 bg-cyan-950" : "border-slate-500"}`} onClick={() => setIndex(i)}>{item.icon} {item.name}</button>)}</div></fieldset>
      <button className={button} disabled={!name.trim()}>Start adventure</button>
    </form> : <p className="font-bold text-cyan-200">{name.trim()}{stage === "speak" ? "" : ` · ${place.icon} ${place.name}`}</p>}
    {stage === "run" && <WordRunner place={place} onFinish={(collected) => { setWords(collected); setStage("scene"); }} />}
    {stage === "scene" && <div className="space-y-4">
      <h2 className="text-2xl font-black">Photo Safari</h2>
      <p>Photograph two details. Tell your partner what you can see and what it might sound like.</p>
      <div className={`grid grid-cols-3 gap-2 rounded-2xl bg-gradient-to-b p-5 sm:p-10 ${place.sky}`}>
        {place.props.map((icon, i) => <button key={icon} aria-label={`Photograph ${["left", "middle", "right"][i]} detail ${icon}`} aria-pressed={photos.includes(icon)} onClick={() => setPhotos((items) => items.includes(icon) ? items.filter((item) => item !== icon) : [...items, icon].slice(-2))} className={`focus-ring rounded-2xl border-4 py-6 text-4xl sm:text-6xl ${photos.includes(icon) ? "border-amber-300 bg-slate-950/50" : "border-transparent bg-slate-950/20"}`}>{icon}</button>)}
      </div>
      <p>Photo reel: {photos.join(" ") || "Choose two details"} · Sound clue: {place.sounds}</p>
      <button className={button} disabled={photos.length !== 2} onClick={() => setStage("speak")}>Take the speaking challenge</button>
    </div>}
    {stage === "speak" && <div className="space-y-4 rounded-2xl bg-slate-900 p-5">
      <h2 className="text-2xl font-black">Mystery Tour Guide</h2>
      <p>Describe the place without naming it. Can your partner guess it? Then describe a real place you love.</p>
      <div className="flex flex-wrap gap-2">{["Foundation", "Confident", "Fluent"].map((label, i) => <button key={label} aria-pressed={tier === i} className={`rounded-lg border px-4 py-2 font-bold ${tier === i ? "border-cyan-300 bg-cyan-950" : "border-slate-500"}`} onClick={() => setTier(i)}>{label}</button>)}</div>
      <p className="text-lg">{[
        "Name two things you can see and use one describing word. Try: ‘There is… It is…’",
        `Describe what you see and hear, then explain why you like the place. Try: ‘I like it because I can ${place.activity}.’`,
        "Give your partner a short tour using sight and sound. Share a memory and explain why this place matters to you. Invite one follow-up question.",
      ][tier]}</p>
      <p>Photos: {photos.join(" ")} · Vocabulary: {[...new Set([...words, ...place.words])].join(", ")}</p>
      <button className={button} onClick={() => setStage("done")}>I finished speaking</button>
    </div>}
    {stage === "done" && <div className="space-y-4 rounded-2xl bg-slate-900 p-5">
      <h2 className="text-2xl font-black">Tour complete, {name.trim()}!</h2>
      <p>Try another location for new vocabulary and a different speaking prompt.</p>
      <button className={button} onClick={() => { setPhotos([]); setWords([]); setStage("start"); }}>Explore another place</button>
    </div>}
  </section>;
}
