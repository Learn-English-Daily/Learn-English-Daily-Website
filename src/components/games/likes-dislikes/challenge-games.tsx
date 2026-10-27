"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arcadeSound, speakArcade } from "../lead-arcade/audio";
import type { ArcadeStageProps } from "../lead-arcade/types";
import type { PreferenceProfile } from "./game-data";

const things = [
  { name: "pizza", icon: "🍕" },
  { name: "football", icon: "⚽" },
  { name: "reading", icon: "📚" },
  { name: "rainy days", icon: "🌧️" },
  { name: "cats", icon: "🐱" },
  { name: "dancing", icon: "💃" },
  { name: "spicy food", icon: "🌶️" },
  { name: "video games", icon: "🎮" },
];

const iconFor = (name: string) => things.find((thing) => thing.name === name)?.icon ?? "⭐";

function finish(correct: number, attempts: number, combo: number, onComplete: ArcadeStageProps["onComplete"], bonus = 0) {
  onComplete({
    correct,
    attempts,
    bestCombo: combo,
    score: correct * 150 + combo * 25 + bonus,
    stars: correct / Math.max(1, attempts) >= 0.8 ? 3 : correct / Math.max(1, attempts) >= 0.55 ? 2 : 1,
  });
}

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-black uppercase tracking-[.24em] text-yellow-300">Likes &amp; Dislikes</p>
      <h2 className="mt-2 font-heading text-4xl font-black">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function PreferenceFall({ sound, onComplete, onProfile }: { sound: boolean; onComplete: ArcadeStageProps["onComplete"]; onProfile: (profile: PreferenceProfile) => void }) {
  const [index, setIndex] = useState(0);
  const [lane, setLane] = useState(1);
  const [fall, setFall] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState<string[]>([]);
  const [disliked, setDisliked] = useState<string[]>([]);
  const item = things[index];
  const itemLane = (index * 2 + 1) % 3;

  const resolve = useCallback((like: boolean) => {
    if (paused) return;
    setPaused(true);
    const nextLikes = like ? [...liked, item.name] : liked;
    const nextDislikes = like ? disliked : [...disliked, item.name];
    setLiked(nextLikes);
    setDisliked(nextDislikes);
    arcadeSound(like ? "correct" : "power", sound);
    speakArcade(`${like ? "I like" : "I don't like"} ${item.name}.`, sound);
    window.setTimeout(() => {
      if (index === things.length - 1) {
        onProfile({ liked: nextLikes, disliked: nextDislikes, preferred: [] });
        finish(8, 8, 8, onComplete, 300);
      } else {
        setIndex((value) => value + 1);
        setFall(0);
        setPaused(false);
      }
    }, 850);
  }, [disliked, index, item.name, liked, onComplete, onProfile, paused, sound]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => fall >= 4 ? resolve(false) : setFall((value) => value + 1), 620);
    return () => window.clearTimeout(timer);
  }, [fall, paused, resolve]);

  const jump = useCallback(() => {
    if (paused) return;
    if (lane === itemLane && fall >= 2) resolve(true);
    else arcadeSound("wrong", sound);
  }, [fall, itemLane, lane, paused, resolve, sound]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setLane((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setLane((value) => Math.min(2, value + 1));
      if (event.key === " " || event.key === "ArrowUp") { event.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [jump]);

  return (
    <Frame title="Favorite Fall Jump">
      <div className="rounded-[2.5rem] border-8 border-cyan-300 bg-gradient-to-b from-indigo-800 via-blue-800 to-slate-950 p-5 text-center shadow-2xl">
        <div className="flex items-center justify-between gap-3 font-black"><span>Catch = I LIKE ❤️</span><span className="rounded-full bg-white/10 px-4 py-2">ITEM {index + 1}/8</span><span>Let fall = I DON&apos;T LIKE</span></div>
        <div className="relative mt-5 h-[430px] overflow-hidden rounded-3xl border-4 border-white/30 bg-[linear-gradient(#1e3a8a_0_68%,#16a34a_68%_76%,#713f12_76%)]">
          {[1, 2].map((line) => <div key={line} className="absolute inset-y-0 border-l-4 border-dashed border-white/20" style={{ left: `${line * 33.333}%` }} />)}
          <div className="absolute z-10 text-7xl transition-all duration-500" style={{ left: `calc(${itemLane * 33.333}% + 11%)`, top: `${5 + fall * 14}%` }}>{item.icon}</div>
          <div className="absolute bottom-5 z-20 -translate-x-1/2 text-7xl transition-all" style={{ left: `${lane * 33.333 + 16.666}%` }}>🧒</div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/70 px-4 py-1 font-black">{paused ? `🔊 ${item.name}` : fall >= 2 ? "JUMP NOW!" : "MOVE UNDER THE ITEM"}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Button onClick={() => setLane((value) => Math.max(0, value - 1))} className="h-14"><ArrowLeft /> MOVE</Button>
          <Button onClick={jump} className="h-14 bg-yellow-300 text-slate-950"><ArrowUp /> JUMP</Button>
          <Button onClick={() => setLane((value) => Math.min(2, value + 1))} className="h-14">MOVE <ArrowRight /></Button>
        </div>
        <p className="mt-3 text-sm font-bold text-blue-100">Keyboard: ← → to run, Space/↑ to jump. Missing an item records “I don&apos;t like …”</p>
      </div>
    </Frame>
  );
}

const MAZE_WIDTH = 9;
const MAZE_SIZE = 63;
const SNAKE_START = 54;
const MAZE_EXIT = 8;
const KEY_CELL = 40;
const mazeWalls = new Set([10, 11, 12, 14, 15, 16, 28, 29, 30, 32, 33, 34, 46, 47, 48, 50, 51, 52]);
const prizeCells = [0, 26, 58, 62];
const dangerCells = [4, 18, 38, 56];

export function PreferenceMaze({ profile, sound, onComplete }: ArcadeStageProps & { profile: PreferenceProfile }) {
  const likes = profile.liked.length ? profile.liked : ["reading"];
  const dislikes = profile.disliked.length ? profile.disliked : ["spicy food"];
  const prizes = useMemo(() => prizeCells.map((cell, index) => ({ cell, name: likes[index % likes.length] })), [likes]);
  const dangers = useMemo(() => dangerCells.map((cell, index) => ({ cell, name: dislikes[index % dislikes.length] })), [dislikes]);
  const [snake, setSnake] = useState<number[]>([SNAKE_START]);
  const [collected, setCollected] = useState<number[]>([]);
  const [hitDangers, setHitDangers] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  const [moves, setMoves] = useState(0);
  const [hasKey, setHasKey] = useState(false);
  const [message, setMessage] = useState("Collect every LIKE, find the key, then reach the exit!");
  const position = snake[0];

  const move = useCallback((dx: number, dy: number) => {
    const row = Math.floor(position / MAZE_WIDTH);
    const column = position % MAZE_WIDTH;
    const nextRow = row + dy;
    const nextColumn = column + dx;
    if (nextRow < 0 || nextRow > 6 || nextColumn < 0 || nextColumn >= MAZE_WIDTH) return arcadeSound("wrong", sound);
    const next = nextRow * MAZE_WIDTH + nextColumn;
    if (mazeWalls.has(next)) {
      setMessage("Wall! Find another route.");
      return arcadeSound("wrong", sound);
    }
    setMoves((value) => value + 1);
    const prize = prizes.find((entry) => entry.cell === next && !collected.includes(entry.cell));
    const danger = dangers.find((entry) => entry.cell === next && !hitDangers.includes(entry.cell));
    const movingBody = prize ? snake : snake.slice(0, -1);
    if (movingBody.includes(next)) {
      setMessage("You bumped into your own tail!");
      setLives((value) => Math.max(0, value - 1));
      setSnake([SNAKE_START]);
      return arcadeSound("wrong", sound);
    }
    if (danger) {
      arcadeSound("wrong", sound);
      speakArcade(`I don't like ${danger.name}.`, sound);
      setMessage(`Ouch! I don't like ${danger.name}. Back to the start!`);
      setHitDangers((value) => [...value, danger.cell]);
      setLives((value) => Math.max(0, value - 1));
      setSnake([SNAKE_START]);
      return;
    }
    setSnake([next, ...movingBody]);
    if (prize) {
      const nextCollected = [...collected, next];
      setCollected(nextCollected);
      arcadeSound("correct", sound);
      speakArcade(`I like ${prize.name}.`, sound);
      setMessage(`Yum! I like ${prize.name}. Your snake grew!`);
    } else if (next === KEY_CELL && !hasKey) {
      setHasKey(true);
      setMessage("Golden key found! Now collect any remaining likes.");
      arcadeSound("power", sound);
    } else if (next === MAZE_EXIT) {
      if (collected.length === prizes.length && hasKey) {
        setMessage("Exit unlocked—maze complete!");
        arcadeSound("complete", sound);
        window.setTimeout(() => finish(prizes.length, prizes.length + (3 - lives), snake.length, onComplete, Math.max(0, 700 - moves * 5)), 600);
      } else {
        setMessage(`Exit locked: ${prizes.length - collected.length} likes remaining${hasKey ? "" : " and the key is missing"}.`);
        arcadeSound("wrong", sound);
      }
    }
  }, [collected, dangers, hasKey, hitDangers, lives, moves, onComplete, position, prizes, snake, sound]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (directions[event.key]) { event.preventDefault(); move(...directions[event.key]); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [move]);

  return (
    <Frame title="Preference Snake Maze">
      <div className="grid gap-5 rounded-3xl bg-slate-950 p-5 lg:grid-cols-[1fr_230px]">
        <div>
          <div className="mb-3 flex flex-wrap justify-between gap-2 font-black text-yellow-300"><span>LIKES {collected.length}/{prizes.length} · KEY {hasKey ? "🔑" : "❌"}</span><span>{"❤️".repeat(lives)}{"🖤".repeat(3 - lives)}</span></div>
          <div className="mx-auto grid max-w-[720px] grid-cols-9 gap-1 rounded-3xl border-8 border-blue-700 bg-blue-950 p-2">
            {Array.from({ length: MAZE_SIZE }, (_, cell) => {
              const prize = prizes.find((entry) => entry.cell === cell);
              const danger = dangers.find((entry) => entry.cell === cell);
              const bodyIndex = snake.indexOf(cell);
              return <div key={cell} className={`grid aspect-square min-w-0 place-items-center rounded-md text-xl sm:text-3xl ${mazeWalls.has(cell) ? "bg-blue-600 shadow-[inset_0_0_0_2px_#60a5fa]" : "bg-slate-900"}`}>{bodyIndex === 0 ? "🐍" : bodyIndex > 0 ? "🟢" : prize && !collected.includes(cell) ? iconFor(prize.name) : danger && !hitDangers.includes(cell) ? `💢${iconFor(danger.name)}` : cell === KEY_CELL && !hasKey ? "🔑" : cell === MAZE_EXIT ? (collected.length === prizes.length && hasKey ? "🚪" : "🔒") : <span className="text-xs text-blue-400">•</span>}</div>;
            })}
          </div>
          <p className="mt-3 text-center font-black text-yellow-200">{message}</p>
          <p className="mt-1 text-center text-xs font-bold text-blue-200">🐍 Snake · 🟢 Tail · 💢 Dislike hazard · 🔑 Key · 🔒 Exit · Blue blocks are walls</p>
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-white/10 p-4 text-center">
          <p className="font-black">SNAKE LENGTH {snake.length}</p>
          <div className="mx-auto mt-4 grid w-40 grid-cols-3 gap-2">
            <span /><Button onClick={() => move(0, -1)}><ArrowUp /></Button><span />
            <Button onClick={() => move(-1, 0)}><ArrowLeft /></Button><Button disabled className="opacity-100">🟡</Button><Button onClick={() => move(1, 0)}><ArrowRight /></Button>
            <span /><Button onClick={() => move(0, 1)}><ArrowDown /></Button><span />
          </div>
          <p className="mt-4 text-xs font-bold text-blue-200">Collect all four likes to grow. Avoid dislikes and your own tail, find the key, then escape.</p>
        </div>
      </div>
    </Frame>
  );
}

const likeReasons: Record<string, string> = {
  pizza: "because it is delicious",
  football: "because it is exciting",
  reading: "because it helps me relax",
  "rainy days": "because they feel peaceful",
  cats: "because they are cute",
  dancing: "because it is fun",
  "spicy food": "because it is tasty",
  "video games": "because they are exciting",
};

export function CraneTower({ profile, sound, onComplete }: ArcadeStageProps & { profile: PreferenceProfile }) {
  const likedItem = profile.liked[0] || "reading";
  const dislikedItem = profile.disliked[0] || "spicy food";
  const sentences = useMemo(() => [
    ["I like", likedItem, "very much", likeReasons[likedItem] || "because it is enjoyable"],
    ["I don't like", dislikedItem, "because", "it is not for me"],
  ], [dislikedItem, likedItem]);
  const [round, setRound] = useState(0);
  const target = sentences[round];
  const pool = useMemo(() => [target[2], target[0], target[3], target[1]], [target]);
  const [crane, setCrane] = useState(0);
  const [stack, setStack] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [wobble, setWobble] = useState(false);

  const drop = useCallback(() => {
    const word = pool[crane];
    if (stack.includes(word)) return arcadeSound("wrong", sound);
    setAttempts((value) => value + 1);
    if (word !== target[stack.length]) {
      setWobble(true);
      arcadeSound("wrong", sound);
      window.setTimeout(() => { setStack([]); setWobble(false); }, 650);
      return;
    }
    const next = [...stack, word];
    setStack(next);
    arcadeSound("correct", sound);
    if (next.length === target.length) {
      speakArcade(`${next.join(" ")}.`, sound);
      window.setTimeout(() => {
        if (round === sentences.length - 1) finish(8, attempts + 1, 8, onComplete, 400);
        else {
          setRound((value) => value + 1);
          setStack([]);
          setCrane(0);
        }
      }, 850);
    }
  }, [attempts, crane, onComplete, pool, round, sentences.length, sound, stack, target]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setCrane((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setCrane((value) => Math.min(3, value + 1));
      if (event.key === " " || event.key === "ArrowDown") { event.preventDefault(); drop(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [drop]);

  return (
    <Frame title="Reason Crane Tower">
      <div className="rounded-3xl bg-gradient-to-b from-sky-300 to-emerald-300 p-5 text-slate-950">
        <div className="flex justify-between font-black"><span>🏗️ {round === 0 ? "Build a LIKE sentence" : "Now build a DON'T LIKE sentence"}</span><span>SENTENCE {round + 1}/2 · {stack.length}/4 BLOCKS</span></div>
        <div className="relative mt-4 h-[450px] overflow-hidden rounded-3xl border-4 border-white bg-sky-200">
          <div className="absolute inset-x-0 top-8 h-4 bg-slate-700" />
          <div className="absolute top-8 z-20 w-1/4 text-center transition-all duration-300" style={{ left: `${crane * 25}%` }}><div className="mx-auto h-36 w-1 bg-slate-700" /><span className="text-5xl">🪝</span></div>
          <div className={`absolute inset-x-8 bottom-12 flex flex-col-reverse items-center gap-2 ${wobble ? "animate-bounce rotate-6" : ""}`}>
            {stack.map((word, index) => <div key={word} className={`grid h-14 place-items-center rounded-xl border-4 border-white px-5 text-lg font-black shadow-xl ${index % 2 ? "bg-fuchsia-500" : "bg-blue-500"}`} style={{ width: `${92 - index * 10}%` }}>{word}</div>)}
          </div>
          <div className="absolute inset-x-0 bottom-0 grid grid-cols-4 gap-2 border-t-8 border-amber-900 bg-amber-700 p-2">
            {pool.map((word) => <div key={word} className={`grid min-h-16 place-items-center rounded-lg px-2 text-center text-sm font-black ${stack.includes(word) ? "bg-slate-400 opacity-30" : "bg-yellow-300"}`}>{word}</div>)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3"><Button onClick={() => setCrane((value) => Math.max(0, value - 1))}><ArrowLeft /> CRANE</Button><Button onClick={drop} className="bg-yellow-300 text-slate-950"><ArrowDown /> DROP</Button><Button onClick={() => setCrane((value) => Math.min(3, value + 1))}>CRANE <ArrowRight /></Button></div>
        <p className="mt-3 text-center text-sm font-bold">Wrong block? The whole tower tumbles. Keyboard: ← → and Space/↓.</p>
      </div>
    </Frame>
  );
}

const rather = [
  { a: "play football", ai: "⚽", b: "play video games", bi: "🎮" },
  { a: "eat pizza", ai: "🍕", b: "eat ice cream", bi: "🍦" },
  { a: "read a book", ai: "📚", b: "watch a movie", bi: "🎬" },
];

export function RatherTugArena({ sound, onComplete, onPreferred }: { sound: boolean; onComplete: ArcadeStageProps["onComplete"]; onPreferred: (value: string[]) => void }) {
  const [round, setRound] = useState(0);
  const [choice, setChoice] = useState<"a" | "b" | null>(null);
  const [power, setPower] = useState(0);
  const [expected, setExpected] = useState<"left" | "right">("left");
  const [picks, setPicks] = useState<string[]>([]);
  const task = rather[round];

  const choose = (side: "a" | "b") => {
    setChoice(side);
    setPower(0);
    setExpected("left");
    speakArcade(`I prefer to ${task[side]}.`, sound);
  };

  const pull = useCallback((hand: "left" | "right") => {
    if (!choice) return;
    if (hand !== expected) {
      setPower((value) => Math.max(0, value - 1));
      arcadeSound("wrong", sound);
      return;
    }
    const nextPower = power + 1;
    setPower(nextPower);
    setExpected(hand === "left" ? "right" : "left");
    arcadeSound("power", sound);
    if (nextPower === 10) {
      const nextPicks = [...picks, task[choice]];
      setPicks(nextPicks);
      speakArcade(`I prefer to ${task[choice]}.`, sound);
      window.setTimeout(() => {
        if (round === rather.length - 1) {
          onPreferred(nextPicks);
          finish(3, 3, 10, onComplete, 400);
        } else {
          setRound((value) => value + 1);
          setChoice(null);
          setPower(0);
          setExpected("left");
        }
      }, 650);
    }
  }, [choice, expected, onComplete, onPreferred, picks, power, round, sound, task]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") pull("left");
      if (event.key === "ArrowRight") pull("right");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [pull]);

  return (
    <Frame title="Would You Rather? Tug Arena">
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-rose-700 p-6 text-center">
        <p className="text-sm font-black uppercase text-yellow-200">Arena {round + 1}/3 · Choose, then alternate hands!</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(["a", "b"] as const).map((side) => <button key={side} disabled={Boolean(choice)} onClick={() => choose(side)} className={`rounded-3xl border-8 p-6 transition ${choice === side ? "scale-105 border-yellow-300 bg-blue-700" : "border-white/40 bg-white/10 disabled:opacity-50"}`}><span className="text-7xl">{side === "a" ? task.ai : task.bi}</span><b className="mt-2 block text-xl">{task[side]}</b></button>)}
        </div>
        <div className="relative mx-auto mt-8 h-32 max-w-3xl overflow-hidden rounded-3xl bg-emerald-700">
          <div className="absolute inset-x-8 top-1/2 h-3 -translate-y-1/2 bg-amber-200" />
          <div className="absolute left-4 top-8 text-6xl">🧒</div><div className="absolute right-4 top-8 -scale-x-100 text-6xl">🦉</div>
          <div className="absolute top-[41px] z-10 text-5xl transition-all duration-200" style={{ left: `calc(${12 + power * 7}% - 24px)` }}>🎀</div>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-black">POWER {power}/10</div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4"><Button disabled={!choice} onClick={() => pull("left")} className={`h-16 text-lg ${expected === "left" && choice ? "animate-pulse bg-yellow-300 text-slate-950" : ""}`}><ArrowLeft /> LEFT HAND</Button><Button disabled={!choice} onClick={() => pull("right")} className={`h-16 text-lg ${expected === "right" && choice ? "animate-pulse bg-yellow-300 text-slate-950" : ""}`}>RIGHT HAND <ArrowRight /></Button></div>
        <p className="mt-3 font-black">{choice ? `Alternate LEFT, RIGHT to defend: “I prefer to ${task[choice]}.”` : "Choose the activity you really prefer."}</p>
      </div>
    </Frame>
  );
}
