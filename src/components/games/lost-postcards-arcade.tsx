"use client";

import { useEffect, useRef, useState } from "react";
import { arcadeSound } from "./lead-arcade/audio";
import { places, rush, sentences } from "./lost-postcards-content";

export type StageProps = { level: number; paused: boolean; sound: boolean; hints: boolean; finish: (stars: number) => void };
export const playButton = "focus-ring rounded-xl bg-lead-blue px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50";

export function PlaceRush({ level, paused, sound, finish }: StageProps) {
  const [started, setStarted] = useState(false);
  const [view, setView] = useState({ distance: 0, lane: 1, height: 0, score: 0, combo: 0, correct: 0, message: "" });
  const state = useRef({ ...view, velocity: 0, obstacle: false, gate: false });
  const touch = useRef({ x: 0, y: 0 });
  const count = 3 + level;
  const segment = 1250;
  const end = count * segment;
  const step = Math.min(count - 1, Math.floor(view.distance / segment));
  const task = rush[step];
  const offset = view.distance % segment;
  const done = view.distance >= end;

  function steer(direction: number) {
    if (!started || paused || done) return;
    state.current.lane = Math.max(0, Math.min(2, state.current.lane + direction));
  }
  function jump() {
    if (started && !paused && !done && state.current.height === 0) state.current.velocity = 385;
  }

  useEffect(() => {
    if (!started || paused || done) return;
    let last = 0;
    let frame = 0;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !["ArrowLeft", "ArrowRight", "ArrowUp", "a", "d", " "].includes(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input,select,textarea") || (event.key === " " && target?.closest("button"))) return;
      event.preventDefault();
      if (event.key === "ArrowLeft" || event.key === "a") steer(-1);
      else if (event.key === "ArrowRight" || event.key === "d") steer(1);
      else jump();
    };
    function animate(time: number) {
      const dt = last ? Math.min((time - last) / 1000, 0.035) : 0;
      last = time;
      const world = state.current;
      const previous = Math.floor(world.distance / segment);
      world.distance = Math.min(end, world.distance + dt * (155 + level * 38 + previous * 12));
      world.height = Math.max(0, world.height + world.velocity * dt);
      if (dt) world.velocity = world.height > 0 ? world.velocity - dt * 980 : 0;
      const round = Math.floor(world.distance / segment);
      if (round !== previous) { world.obstacle = false; world.gate = false; }
      const local = world.distance % segment;
      if (local >= 600 && !world.obstacle) {
        world.obstacle = true;
        if (world.lane === round % 3 && world.height < 28) {
          world.combo = 0;
          world.message = "Crate bumped. The next postcard is still ahead!";
        }
      }
      if (local >= 1080 && !world.gate && round < count) {
        world.gate = true;
        const mission = rush[round];
        const correct = mission.ids[world.lane] === mission.answer;
        world.combo = correct ? world.combo + 1 : 0;
        world.correct += Number(correct);
        world.score += correct ? 100 * world.combo : 0;
        world.message = correct ? `${places[mission.answer].name}! Say “${mission.word}” aloud.` : `Look for the ${places[mission.answer].name.toLowerCase()} next time.`;
        arcadeSound(correct ? "correct" : "wrong", sound);
      }
      setView({ ...world });
      if (world.distance < end) frame = requestAnimationFrame(animate);
    }
    window.addEventListener("keydown", onKey);
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", onKey); };
    // Movement reads the current world from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, done, end, level, paused, sound, started]);

  const depth = Math.max(0, Math.min(1, (offset - 100) / 980));
  return <div className="space-y-3">
    <p className="text-lg font-bold">{level === 0 ? `Find a ${task.word} place!` : task.clue}</p>
    <div className="relative h-72 touch-none overflow-hidden rounded-2xl bg-gradient-to-b from-sky-300 via-cyan-100 to-green-300"
      onPointerDown={(event) => { touch.current = { x: event.clientX, y: event.clientY }; }}
      onPointerUp={(event) => {
        const x = event.clientX - touch.current.x;
        const y = event.clientY - touch.current.y;
        if (Math.abs(x) > 24 && Math.abs(x) > Math.abs(y)) steer(Math.sign(x));
        else if (y < -24 || Math.hypot(x, y) < 15) jump();
      }}>
      <div className="absolute inset-x-0 top-4 flex justify-around text-4xl" aria-hidden="true">☁️ <span>☀️</span> ☁️</div>
      <div className="absolute inset-x-0 bottom-0 h-[78%] bg-amber-200 [clip-path:polygon(44%_0,56%_0,100%_100%,0_100%)]" />
      <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg, transparent 0 31px, #ffffff50 32px 35px)", backgroundPositionY: view.distance / 6, clipPath: "polygon(44% 22%,56% 22%,100% 100%,0 100%)" }} />
      <div className="absolute left-2 top-24 text-5xl" aria-hidden="true">🌴</div><div className="absolute right-2 top-28 text-5xl" aria-hidden="true">🌻</div>
      {!done && offset < 1080 && task.ids.map((id, lane) => <div key={id} className="absolute -translate-x-1/2 rounded-xl border-2 border-white bg-white/95 px-2 py-1 text-center shadow-lg" style={{ left: `${50 + (lane - 1) * (10 + depth * 21)}%`, top: `${22 + depth * 53}%`, scale: 0.65 + depth * 0.35 }}><div className="text-3xl">{places[id].icon}</div>{level < 2 && <div className="whitespace-nowrap text-sm font-bold">{places[id].name}</div>}</div>)}
      {!done && offset < 650 && <div aria-hidden="true" className="absolute -translate-x-1/2 text-3xl" style={{ left: `${50 + (step % 3 - 1) * (10 + Math.min(offset / 600, 1) * 21)}%`, top: `${30 + Math.min(offset / 600, 1) * 48}%` }}>📦</div>}
      <div aria-hidden="true" className="absolute -translate-x-1/2 text-4xl transition-[left] duration-100" style={{ left: `${50 + (view.lane - 1) * 31}%`, bottom: 12 + view.height }}>🏃</div>
      <div className="absolute right-2 top-2 rounded-lg bg-white px-2 py-1 font-bold">{view.score} pts · ×{view.combo || 1}</div>
    </div>
    <p role="status" className="min-h-6 font-semibold">{view.message}</p>
    {done ? <button className={playButton} onClick={() => finish(1 + Number(view.correct >= Math.ceil(count / 2)) + Number(view.correct === count))}>Stamp postcard</button> : !started ? <button className={playButton} onClick={() => setStarted(true)}>Start run</button> : <div className="flex flex-wrap gap-2"><button className={playButton} onClick={() => steer(-1)}>Left</button><button className={playButton} onClick={jump}>Jump</button><button className={playButton} onClick={() => steer(1)}>Right</button></div>}
  </div>;
}

export function SkyIslands({ level, paused, sound, hints, finish }: StageProps) {
  const words = sentences[level];
  const [step, setStep] = useState(0);
  const [misses, setMisses] = useState(0);
  const [message, setMessage] = useState("");
  const [position, setPosition] = useState(50);
  const [leaping, setLeaping] = useState(false);
  const motion = useRef(50);
  const lock = useRef(false);
  const target = words[step];
  const wrong = target === "is" ? "are" : target === "are" ? "is" : target === "because" ? "but" : target === "There" ? "This" : ["above", "noisy", "boats"].find((word) => word !== target)!;
  const choices = step % 2 ? [wrong, target] : [target, wrong];
  useEffect(() => {
    if (paused || !target) return;
    let frame = 0;
    let start = 0;
    function loop(now: number) {
      if (!start) start = now;
      if (!lock.current) {
        motion.current = 50 + 37 * Math.sin((now - start) / (580 - level * 65));
        setPosition(motion.current);
      }
      frame = requestAnimationFrame(loop);
    }
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [level, paused, target]);

  useEffect(() => {
    if (!leaping || paused) return;
    const timer = setTimeout(() => {
      const landing = motion.current < 50 ? 0 : 1;
      const safe = Math.abs(motion.current - (landing ? 74 : 26)) < (level === 0 ? 24 : 18);
      const correct = safe && choices[landing] === target;
      if (correct) setStep((value) => value + 1);
      else setMisses((value) => value + 1);
      setMessage(correct ? "Word collected!" : "Back at the checkpoint. Line up with the next word and leap again.");
      arcadeSound(correct ? "correct" : "wrong", sound);
      lock.current = false;
      setLeaping(false);
    }, 330);
    return () => clearTimeout(timer);
    // Landing uses the words shown when the jump began.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaping, paused, level, sound, step]);

  return <div className="space-y-4">
    <p>Time your jump from the moving cloud to the island holding the next word. Read your finished sentence aloud.</p>
    <p className="rounded-xl bg-blue-50 p-3 font-bold">{hints || level === 0 ? words.join(" ") : words.map((word, i) => i <= step ? word : "___").join(" ")}</p>
    <div className="relative h-52 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-300 to-indigo-100">
      {target && choices.map((word, i) => <div key={word} className="absolute top-8 -translate-x-1/2 rounded-b-[40%] border-t-8 border-green-400 bg-amber-200 px-6 py-4 font-bold shadow-lg" style={{ left: i ? "74%" : "26%" }}>{word}</div>)}
      <div className="absolute -translate-x-1/2 text-center transition-[bottom] duration-300" style={{ left: `${position}%`, bottom: leaping ? 110 : 16 }}><div className="text-3xl">🧑‍🚀</div><div className="rounded-full bg-white px-4">☁️</div></div>
    </div>
    <p className="font-bold text-lead-blue">{words.slice(0, step).join(" ") || "Your sentence starts here."}</p>
    <p role="status">{message}</p>
    {target ? <button className={playButton} disabled={paused || leaping} onClick={() => { lock.current = true; setLeaping(true); }}>Leap</button> : <button className={playButton} onClick={() => finish(misses === 0 ? 3 : misses <= 3 ? 2 : 1)}>Stamp postcard</button>}
  </div>;
}
