"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Footprints, RotateCcw, Star, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Direction = "up" | "down" | "left" | "right";
type ActionVerb = "walk" | "run" | "jump" | "sit" | "stand" | "read" | "eat" | "drink" | "sleep" | "swim" | "play" | "dance" | "climb" | "open";
type ActiveAction = ActionVerb | "idle";
type Point = { x: number; y: number };
type Rect = Point & { width: number; height: number };

type Snapshot = {
  level: number;
  completed: string[];
  verbs: ActionVerb[];
  stars: number;
  message: string;
  phrase: string;
  nearbyLabel: string;
  location: string;
  running: boolean;
  won: boolean;
};

type GameHandle = {
  interact: () => void;
  setDirection: (direction: Direction, pressed: boolean) => void;
  setRunning: (pressed: boolean) => void;
  reset: () => void;
};

type Interaction = {
  id: string;
  x: number;
  y: number;
  label: string;
  radius?: number;
};

type GameState = Snapshot & {
  player: Point & { direction: Direction; moving: boolean; frame: number; action: ActiveAction; actionUntil: number };
  started: boolean;
  finalIndex: number;
  moveSeconds: number;
};

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 600;
const WORLD_WIDTH = 2240;
const WORLD_HEIGHT = 1400;
const PLAYER_RADIUS = 15;

const levelNames = ["Playground", "Home", "Library", "Action Park", "Swimming Pool", "Final Action Challenge"];
const levelMissions = [
  ["Play with the ball", "Sit and stand at the bench", "Climb the slide"],
  ["Wake up and stand", "Eat the apple", "Drink water", "Open the door"],
  ["Pick up a book", "Sit and read the book"],
  ["Run to the tree", "Jump over the log", "Climb the hill", "Dance on the stage"],
  ["Swim across the pool", "Run to the finish flag"],
  ["Run", "Jump", "Climb", "Sit", "Stand", "Read", "Dance", "Swim", "Run to finish"]
];

const interactions: Interaction[] = [
  { id: "play-ball", x: 250, y: 310, label: "Play with the ball" },
  { id: "bench", x: 420, y: 230, label: "Sit on the bench" },
  { id: "slide", x: 490, y: 420, label: "Climb the slide" },
  { id: "bed", x: 735, y: 215, label: "Wake up and stand" },
  { id: "apple", x: 880, y: 280, label: "Eat the apple" },
  { id: "water", x: 970, y: 280, label: "Drink water" },
  { id: "home-door", x: 845, y: 505, label: "Open the door" },
  { id: "book", x: 1255, y: 250, label: "Pick up the book" },
  { id: "library-chair", x: 1450, y: 385, label: "Sit and read" },
  { id: "run-tree", x: 1640, y: 825, label: "Run to the marked tree", radius: 68 },
  { id: "jump-log", x: 1795, y: 875, label: "Jump over the log" },
  { id: "hill", x: 1950, y: 770, label: "Climb the hill" },
  { id: "dance", x: 2110, y: 925, label: "Dance on the stage" },
  { id: "pool", x: 1130, y: 1030, label: "Swim across the pool", radius: 75 },
  { id: "pool-finish", x: 1480, y: 1190, label: "Run to the finish flag", radius: 70 },
  { id: "final-start", x: 150, y: 930, label: "Start the final action course" },
  { id: "final-run", x: 285, y: 1030, label: "Run to checkpoint 1" },
  { id: "final-jump", x: 405, y: 1030, label: "Jump the hurdle" },
  { id: "final-climb", x: 520, y: 985, label: "Climb the wall" },
  { id: "final-sit", x: 630, y: 1040, label: "Sit on the bench" },
  { id: "final-stand", x: 630, y: 1040, label: "Stand up" },
  { id: "final-read", x: 735, y: 990, label: "Read the sign" },
  { id: "final-dance", x: 720, y: 1170, label: "Dance on the spot" },
  { id: "final-swim", x: 520, y: 1210, label: "Swim the short lane" },
  { id: "final-finish", x: 250, y: 1220, label: "Run to the ACTION HERO finish" }
];

const collisions: Rect[] = [
  { x: 80, y: 90, width: 30, height: 420 },
  { x: 540, y: 90, width: 30, height: 420 },
  { x: 80, y: 90, width: 490, height: 25 },
  { x: 80, y: 485, width: 330, height: 25 },
  { x: 500, y: 485, width: 70, height: 25 },
  { x: 650, y: 100, width: 390, height: 24 },
  { x: 650, y: 100, width: 24, height: 430 },
  { x: 1016, y: 100, width: 24, height: 430 },
  { x: 650, y: 506, width: 145, height: 24 },
  { x: 895, y: 506, width: 145, height: 24 },
  { x: 1160, y: 95, width: 390, height: 24 },
  { x: 1160, y: 95, width: 24, height: 435 },
  { x: 1526, y: 95, width: 24, height: 435 },
  { x: 1160, y: 506, width: 150, height: 24 },
  { x: 1410, y: 506, width: 140, height: 24 },
  { x: 1195, y: 150, width: 48, height: 250 },
  { x: 1320, y: 150, width: 48, height: 250 },
  { x: 900, y: 875, width: 70, height: 300 },
  { x: 1370, y: 875, width: 70, height: 300 },
  { x: 900, y: 875, width: 540, height: 28 },
  { x: 900, y: 1147, width: 190, height: 28 },
  { x: 1260, y: 1147, width: 180, height: 28 },
  { x: 1770, y: 852, width: 55, height: 20 },
  { x: 1910, y: 710, width: 120, height: 45 }
];

function initialState(): GameState {
  return {
    started: false,
    level: 0,
    completed: [],
    verbs: [],
    stars: 0,
    message: "Hi Bill! Are you ready for an action adventure?",
    phrase: "Speak English with Confidence",
    nearbyLabel: "",
    location: "Playground",
    running: false,
    won: false,
    finalIndex: 0,
    moveSeconds: 0,
    player: { x: 180, y: 420, direction: "down", moving: false, frame: 0, action: "idle", actionUntil: 0 }
  };
}

export function ActionHeroGame() {
  const gameRef = useRef<GameHandle>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialState());
  const [started, setStarted] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(true);
  const [bookOpen, setBookOpen] = useState(false);
  const [runHeld, setRunHeld] = useState(false);

  function move(direction: Direction, pressed: boolean) {
    gameRef.current?.setDirection(direction, pressed);
  }

  function toggleRun(pressed: boolean) {
    setRunHeld(pressed);
    gameRef.current?.setRunning(pressed);
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  function begin() {
    setStarted(true);
    window.setTimeout(() => gameRef.current?.interact(), 50);
  }

  if (snapshot.won) {
    return (
      <div className="overflow-hidden rounded-3xl border border-yellow-200 bg-[linear-gradient(145deg,#eff6ff,#ffffff,#fff7d6)] p-6 text-center shadow-soft sm:p-10">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-yellow-400 text-4xl font-black text-lead-navy shadow-lg">AH</div>
        <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-lead-blue">LEAD Fun Learning</p>
        <h2 className="mt-3 font-heading text-4xl font-extrabold text-lead-navy sm:text-5xl">Action Adventure Complete!</h2>
        <p className="mt-3 text-lg text-lead-gray">Bill completed every mission and became an Action Hero.</p>
        <div className="mx-auto mt-7 flex max-w-3xl flex-wrap justify-center gap-2">
          {snapshot.verbs.map((verb) => <span key={verb} className="rounded-full bg-white px-4 py-2 text-sm font-bold uppercase text-lead-blue shadow-sm">{verb}</span>)}
        </div>
        <div className="mt-7 flex justify-center gap-2">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-9 w-9 ${star <= Math.min(5, Math.ceil(snapshot.stars / 8)) ? "fill-yellow-400 text-yellow-500" : "text-slate-300"}`} />)}</div>
        <p className="mt-6 font-heading text-2xl font-extrabold text-lead-navy">ACTION HERO</p>
        <p className="mt-1 font-bold text-lead-blue">LEAD - Speak English with Confidence</p>
        <Button onClick={() => window.location.reload()} className="mt-7"><RotateCcw className="h-4 w-4" />Play Again</Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lead-navy p-3 text-white">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-lead-blue text-xs font-black ring-2 ring-yellow-300">LEAD</div>
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow-300">Action Hero</p><p className="font-heading text-lg font-extrabold">Level {snapshot.level + 1}: {levelNames[snapshot.level]}</p></div>
        </div>
        <div className="flex items-center gap-2"><span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">Stars {snapshot.stars}</span><span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">{snapshot.location}</span></div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border-4 border-slate-800 bg-slate-950 shadow-soft">
        <ActionCanvas ref={gameRef} onSnapshot={setSnapshot} />
        {!started ? (
          <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/80 p-5 backdrop-blur-sm">
            <div className="max-w-2xl text-center text-white">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-lead-blue text-sm font-black ring-4 ring-yellow-300">LEAD</div>
              <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">Learn English Daily</p>
              <h2 className="mt-3 font-heading text-4xl font-extrabold sm:text-6xl">Action Hero</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-blue-100">Control Bill, explore one connected world, and learn action verbs by actually performing every action.</p>
              <Button onClick={begin} className="mt-7 bg-yellow-400 text-slate-950 hover:bg-yellow-300">Start Action Adventure</Button>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-300">Arrow keys / WASD to move - Shift to run - Space to interact</p>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] gap-2">
          <button onClick={() => setMissionsOpen((value) => !value)} className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-slate-950/85 px-3 py-2 text-xs font-bold text-white backdrop-blur"><Footprints className="h-4 w-4" />Mission {missionsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</button>
          <button onClick={() => setBookOpen((value) => !value)} className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-slate-950/85 px-3 py-2 text-xs font-bold text-white backdrop-blur"><BookOpen className="h-4 w-4" />Action Book</button>
        </div>

        {missionsOpen && started ? <MissionPanel snapshot={snapshot} /> : null}
        {bookOpen && started ? <ActionBook verbs={snapshot.verbs} /> : null}

        {started ? (
          <div className="absolute bottom-3 left-1/2 z-20 w-[min(92%,650px)] -translate-x-1/2 rounded-2xl border border-white/20 bg-slate-950/90 p-3 text-white shadow-xl backdrop-blur">
            <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lead-blue text-xs font-black">W</div><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-yellow-300">Wisey</p><p className="mt-1 text-sm leading-5">{snapshot.message}</p>{snapshot.phrase ? <button onClick={() => speak(snapshot.phrase)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-bold text-blue-100"><Volume2 className="h-3 w-3" />{snapshot.phrase}</button> : null}</div></div>
          </div>
        ) : null}

        {started && snapshot.nearbyLabel ? <button onClick={() => gameRef.current?.interact()} className="absolute bottom-28 left-1/2 z-20 -translate-x-1/2 animate-pulse rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-slate-950 shadow-xl"><span className="hidden sm:inline">[SPACE] </span>{snapshot.nearbyLabel}</button> : null}
      </div>

      <div className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <p className="hidden text-sm font-semibold text-lead-gray sm:block">Move: Arrow keys / WASD - Run: Shift - Action: Space</p>
        <TouchControls move={move} interact={() => gameRef.current?.interact()} running={runHeld} setRunning={toggleRun} />
        <p className="text-center text-xs font-bold text-lead-blue sm:text-right">LEAD - Speak English with Confidence</p>
      </div>
    </div>
  );
}

const ActionCanvas = forwardRef<GameHandle, { onSnapshot: (snapshot: Snapshot) => void }>(function ActionCanvas({ onSnapshot }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(initialState());
  const keysRef = useRef(new Set<string>());
  const nearbyRef = useRef<Interaction | null>(null);
  const lastSnapshotRef = useRef(0);

  function emit() {
    const state = stateRef.current;
    onSnapshot({ level: state.level, completed: [...state.completed], verbs: [...state.verbs], stars: state.stars, message: state.message, phrase: state.phrase, nearbyLabel: nearbyRef.current?.label || "", location: state.location, running: state.running, won: state.won });
  }

  function say(message: string, phrase = "") {
    const state = stateRef.current;
    state.message = message;
    state.phrase = phrase;
    emit();
  }

  function learn(verb: ActionVerb, message: string, duration = 900) {
    const state = stateRef.current;
    if (!state.verbs.includes(verb)) state.verbs.push(verb);
    state.player.action = verb;
    state.player.actionUntil = performance.now() + duration;
    state.stars += 1;
    say(message, `I can ${verb}.`);
  }

  function mark(id: string) {
    const state = stateRef.current;
    if (!state.completed.includes(id)) state.completed.push(id);
  }

  function levelComplete(nextLevel: number, message: string) {
    const state = stateRef.current;
    state.stars += 3;
    state.level = nextLevel;
    say(message, nextLevel < 5 ? `I can ${nextLevel === 1 ? "play" : nextLevel === 2 ? "get ready" : nextLevel === 3 ? "read" : "move"}.` : "I am an Action Hero.");
  }

  function handleInteraction(item: Interaction) {
    const state = stateRef.current;
    if (!state.started) {
      state.started = true;
      say("Run, jump, read, eat, swim, and explore. Start by finding the ball in the playground.");
      return;
    }

    if (item.id === "play-ball" && state.level === 0) { learn("play", "PLAY - Bill kicks the ball. I can play."); mark(item.id); return; }
    if (item.id === "bench" && state.level === 0) {
      if (!state.completed.includes("sit")) { learn("sit", "SIT - Bill sits on the bench.", 1200); mark("sit"); }
      else if (!state.completed.includes("stand")) { learn("stand", "STAND - Bill stands up."); mark("stand"); }
      else say("Bill already sat and stood. Find the slide.");
      if (state.completed.includes("play-ball") && state.completed.includes("slide") && state.completed.includes("stand")) levelComplete(1, "Playground cleared! Walk east to Bill's home.");
      return;
    }
    if (item.id === "slide" && state.level === 0) {
      learn("climb", "CLIMB - Bill climbs the slide and slides down.", 1500); mark(item.id);
      if (state.completed.includes("play-ball") && state.completed.includes("stand")) levelComplete(1, "Playground cleared! Walk east to Bill's home.");
      return;
    }

    if (["bed", "apple", "water", "home-door"].includes(item.id) && state.level !== 1) { say(state.level < 1 ? "Finish the playground mission first." : "This home mission is already complete."); return; }
    if (item.id === "bed") { learn("sleep", "SLEEP - Bill wakes up, then stands.", 1100); mark("bed"); window.setTimeout(() => learn("stand", "STAND - Bill is ready for the day."), 700); return; }
    if (item.id === "apple") { learn("eat", "EAT - Bill eats an apple.", 1100); mark(item.id); return; }
    if (item.id === "water") { learn("drink", "DRINK - Bill drinks water.", 1100); mark(item.id); return; }
    if (item.id === "home-door") {
      if (!["bed", "apple", "water"].every((id) => state.completed.includes(id))) { say("Wake up, eat the apple, and drink water before leaving."); return; }
      learn("open", "OPEN - Bill opens the door."); mark(item.id); levelComplete(2, "Home mission complete! Walk east to the library."); return;
    }

    if (["book", "library-chair"].includes(item.id) && state.level !== 2) { say(state.level < 2 ? "Complete the home mission first." : "The library mission is complete."); return; }
    if (item.id === "book") { mark("book"); state.stars += 1; say("Bill picked up a book. Now find the reading chair.", "I read a book."); return; }
    if (item.id === "library-chair") {
      if (!state.completed.includes("book")) { say("Find and pick up the book first."); return; }
      learn("sit", "SIT - Bill sits in the reading chair.", 800);
      window.setTimeout(() => learn("read", "READ - Bill opens the book. I can read.", 1500), 650);
      mark(item.id); levelComplete(3, "Library cleared! Follow the path southeast to Action Park."); return;
    }

    if (["run-tree", "jump-log", "hill", "dance"].includes(item.id) && state.level !== 3) { say(state.level < 3 ? "Complete the library mission first." : "Action Park is complete."); return; }
    if (item.id === "run-tree") {
      if (!state.running) { say("Hold SHIFT or the RUN button while moving to this tree.", "I can run fast."); return; }
      learn("run", "RUN - Bill runs fast to the tree."); mark(item.id); return;
    }
    if (item.id === "jump-log") {
      if (!state.completed.includes("run-tree")) { say("Run to the marked tree first."); return; }
      learn("jump", "JUMP - Bill jumps over the log.", 900); state.player.x += state.player.direction === "left" ? -55 : 55; mark(item.id); return;
    }
    if (item.id === "hill") {
      if (!state.completed.includes("jump-log")) { say("Jump over the log first."); return; }
      learn("climb", "CLIMB - Bill climbs the hill.", 1400); mark(item.id); return;
    }
    if (item.id === "dance") {
      if (!state.completed.includes("hill")) { say("Climb the hill before going to the dance stage."); return; }
      learn("dance", "DANCE - Bill performs his Action Hero dance!", 1800); mark(item.id); levelComplete(4, "Action Park cleared! Head west to the swimming pool."); return;
    }

    if (["pool", "pool-finish"].includes(item.id) && state.level !== 4) { say(state.level < 4 ? "Complete Action Park first." : "The pool mission is complete."); return; }
    if (item.id === "pool") { learn("swim", "SWIM - Bill swims across the pool.", 2400); mark(item.id); return; }
    if (item.id === "pool-finish") {
      if (!state.completed.includes("pool")) { say("Swim across the pool first."); return; }
      if (!state.running) { say("Hold SHIFT or RUN, then race to the finish flag.", "I can run fast."); return; }
      learn("run", "RUN - Bill races through the pool finish."); mark(item.id); levelComplete(5, "All areas cleared! Go southwest to the final Action Course."); return;
    }

    if (item.id === "final-start" && state.level === 5) { state.finalIndex = 1; mark(item.id); say("Final course started! Run to checkpoint 1.", "I am ready."); return; }
    const finalOrder = ["final-run", "final-jump", "final-climb", "final-sit", "final-stand", "final-read", "final-dance", "final-swim", "final-finish"];
    const finalPosition = finalOrder.indexOf(item.id);
    if (finalPosition >= 0 && state.level === 5) {
      if (state.finalIndex !== finalPosition + 1) { say(`Follow the course in order. Next: ${levelMissions[5][Math.max(0, state.finalIndex - 1)]}.`); return; }
      if ((item.id === "final-run" || item.id === "final-finish") && !state.running) { say("This checkpoint requires RUN. Hold SHIFT or RUN while moving."); return; }
      const verb: ActionVerb = item.id.replace("final-", "") as ActionVerb;
      learn(verb, `${verb.toUpperCase()} - Final checkpoint cleared!`, verb === "dance" || verb === "swim" ? 1500 : 900);
      mark(item.id); state.finalIndex += 1;
      if (item.id === "final-jump") state.player.x += 48;
      if (item.id === "final-finish") { state.stars += 5; state.won = true; say("Fantastic job, Bill! You are a LEAD Action Hero.", "I am an Action Hero."); }
      return;
    }

    say("This area is not active yet. Follow Wisey's current mission.");
  }

  function interact() {
    const item = nearbyRef.current;
    if (item) handleInteraction(item);
    else if (!stateRef.current.started) handleInteraction({ id: "start", x: 0, y: 0, label: "Start" });
    else say("Move closer to an object or checkpoint, then press SPACE.");
  }

  function reset() {
    stateRef.current = initialState();
    keysRef.current.clear();
    nearbyRef.current = null;
    emit();
  }

  useImperativeHandle(ref, () => ({
    interact,
    reset,
    setDirection(direction, pressed) {
      const key = direction === "up" ? "arrowup" : direction === "down" ? "arrowdown" : direction === "left" ? "arrowleft" : "arrowright";
      if (pressed) keysRef.current.add(key); else keysRef.current.delete(key);
    },
    setRunning(pressed) {
      if (pressed) keysRef.current.add("shift"); else keysRef.current.delete("shift");
    }
  }));

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", "Shift", " "].includes(event.key)) event.preventDefault();
      if (event.key === " ") { if (!event.repeat) interact(); return; }
      keysRef.current.add(event.key.toLowerCase());
    }
    function keyUp(event: KeyboardEvent) { keysRef.current.delete(event.key.toLowerCase()); }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    let animationFrame = 0;
    let last = performance.now();
    function loop(now: number) {
      const delta = Math.min(0.035, (now - last) / 1000);
      last = now;
      update(delta, now);
      draw(context!);
      if (now - lastSnapshotRef.current > 160) { lastSnapshotRef.current = now; emit(); }
      animationFrame = requestAnimationFrame(loop);
    }
    animationFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  function update(delta: number, now: number) {
    const state = stateRef.current;
    if (!state.started || state.won) return;
    if (state.player.actionUntil && now >= state.player.actionUntil) { state.player.action = "idle"; state.player.actionUntil = 0; }
    const activeSwimming = state.player.action === "swim" && state.player.actionUntil > now;
    const actionLocksMovement = state.player.actionUntil > now && !["walk", "run", "swim"].includes(state.player.action);
    const keys = keysRef.current;
    let dx = 0;
    let dy = 0;
    if (!actionLocksMovement) {
      if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
      if (keys.has("arrowright") || keys.has("d")) dx += 1;
      if (keys.has("arrowup") || keys.has("w")) dy -= 1;
      if (keys.has("arrowdown") || keys.has("s")) dy += 1;
    }
    if (activeSwimming) { dx = 1; dy = 0; }
    if (dx && dy) { dx *= 0.707; dy *= 0.707; }
    const running = keys.has("shift");
    state.running = running;
    state.player.moving = Boolean(dx || dy);
    if (dx < 0) state.player.direction = "left"; else if (dx > 0) state.player.direction = "right"; else if (dy < 0) state.player.direction = "up"; else if (dy > 0) state.player.direction = "down";
    if (state.player.moving) {
      state.player.frame += delta * (running ? 15 : 9);
      state.moveSeconds += delta;
      if (state.moveSeconds > 1.5 && !state.verbs.includes("walk")) { state.verbs.push("walk"); state.stars += 1; state.phrase = "I can walk."; }
      if (!activeSwimming) state.player.action = running ? "run" : "walk";
    } else if (!state.player.actionUntil) state.player.action = "idle";
    const speed = activeSwimming ? 105 : running ? 305 : 190;
    moveAxis("x", dx * speed * delta);
    moveAxis("y", dy * speed * delta);
    state.location = locationAt(state.player.x, state.player.y);
    nearbyRef.current = nearestInteraction(state);
  }

  function moveAxis(axis: "x" | "y", amount: number) {
    if (!amount) return;
    const player = stateRef.current.player;
    const next = { x: player.x, y: player.y };
    next[axis] += amount;
    next.x = clamp(next.x, PLAYER_RADIUS, WORLD_WIDTH - PLAYER_RADIUS);
    next.y = clamp(next.y, PLAYER_RADIUS, WORLD_HEIGHT - PLAYER_RADIUS);
    const box = { x: next.x - 12, y: next.y - 17, width: 24, height: 34 };
    if (!collisions.some((wall) => overlaps(box, wall))) player[axis] = next[axis];
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const state = stateRef.current;
    const camera = { x: clamp(state.player.x - VIEW_WIDTH / 2, 0, WORLD_WIDTH - VIEW_WIDTH), y: clamp(state.player.y - VIEW_HEIGHT / 2, 0, WORLD_HEIGHT - VIEW_HEIGHT) };
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    drawWorld(ctx, state);
    drawBill(ctx, state.player, performance.now());
    ctx.restore();
    drawMiniMap(ctx, state);
  }

  return <canvas ref={canvasRef} width={VIEW_WIDTH} height={VIEW_HEIGHT} className="block aspect-[16/10] w-full bg-slate-900 outline-none" tabIndex={0} aria-label="Action Hero interactive game world" />;
});

function nearestInteraction(state: GameState) {
  let nearest: Interaction | null = null;
  let distance = Infinity;
  for (const item of interactions) {
    if (!interactionVisible(item.id, state)) continue;
    const value = Math.hypot(state.player.x - item.x, state.player.y - item.y);
    if (value <= (item.radius || 58) && value < distance) { nearest = item; distance = value; }
  }
  return nearest;
}

function interactionVisible(id: string, state: GameState) {
  if (state.completed.includes(id) && !["bench"].includes(id)) return false;
  if (id.startsWith("final-")) {
    if (state.level !== 5) return false;
    if (id === "final-start") return state.finalIndex === 0;
    const order = ["final-run", "final-jump", "final-climb", "final-sit", "final-stand", "final-read", "final-dance", "final-swim", "final-finish"];
    return order.indexOf(id) + 1 === state.finalIndex;
  }
  const expectedLevel = ["play-ball", "bench", "slide"].includes(id)
    ? 0
    : ["bed", "apple", "water", "home-door"].includes(id)
      ? 1
      : ["book", "library-chair"].includes(id)
        ? 2
        : ["run-tree", "jump-log", "hill", "dance"].includes(id)
          ? 3
          : ["pool", "pool-finish"].includes(id)
            ? 4
            : -1;
  if (expectedLevel >= 0 && state.level !== expectedLevel) return false;
  return true;
}

function locationAt(x: number, y: number) {
  if (x < 600 && y < 620) return "Playground";
  if (x >= 620 && x < 1100 && y < 620) return "Home";
  if (x >= 1100 && x < 1600 && y < 620) return "Library";
  if (x >= 1500 && y >= 570) return "Action Park";
  if (x >= 850 && x < 1500 && y >= 780) return "Swimming Pool";
  if (x < 850 && y >= 780) return "Final Course";
  return "LEAD Trail";
}

function drawWorld(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.fillStyle = "#86c86b";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.fillStyle = "#d6d3d1";
  ctx.fillRect(570, 530, 1670, 125);
  ctx.fillRect(1035, 0, 125, 900);
  ctx.fillRect(720, 655, 125, 745);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(570, 555, 1670, 76);
  ctx.fillRect(1060, 0, 76, 900);
  ctx.fillRect(745, 655, 76, 745);
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 4;
  ctx.setLineDash([24, 20]);
  ctx.beginPath(); ctx.moveTo(580, 593); ctx.lineTo(2240, 593); ctx.moveTo(1098, 0); ctx.lineTo(1098, 900); ctx.moveTo(783, 660); ctx.lineTo(783, 1400); ctx.stroke();
  ctx.setLineDash([]);

  drawPlayground(ctx);
  drawHome(ctx);
  drawLibrary(ctx);
  drawActionPark(ctx);
  drawPool(ctx);
  drawFinalCourse(ctx, state.level === 5);
  drawTrailSigns(ctx);
  drawInteractionObjects(ctx, state);
}

function drawPlayground(ctx: CanvasRenderingContext2D) {
  areaLabel(ctx, 105, 145, "PLAYGROUND", "#2563eb");
  ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 8; ctx.strokeRect(80, 90, 490, 420);
  drawTree(ctx, 150, 185); drawTree(ctx, 510, 155); drawTree(ctx, 130, 445);
  drawBench(ctx, 380, 200); drawSlide(ctx, 450, 360); drawBall(ctx, 250, 310);
  drawNpc(ctx, 315, 420, "#16a34a", "Friend");
}

function drawHome(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#fef3c7"; ctx.fillRect(674, 124, 342, 382);
  ctx.strokeStyle = "#92400e"; ctx.lineWidth = 10; ctx.strokeRect(650, 100, 390, 430);
  areaLabel(ctx, 700, 155, "BILL'S HOME", "#ea580c");
  drawFurniture(ctx, 700, 180, 100, 70, "BED", "#60a5fa");
  drawFurniture(ctx, 830, 225, 180, 95, "KITCHEN", "#f59e0b");
  drawFurniture(ctx, 700, 360, 130, 75, "SOFA", "#fb7185");
  drawApple(ctx, 880, 280); drawBottle(ctx, 970, 280);
  ctx.fillStyle = "#334155"; ctx.fillRect(820, 475, 50, 55); ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(858, 504, 3, 0, Math.PI * 2); ctx.fill();
}

function drawLibrary(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#ede9fe"; ctx.fillRect(1184, 119, 342, 387);
  ctx.strokeStyle = "#6d28d9"; ctx.lineWidth = 10; ctx.strokeRect(1160, 95, 390, 435);
  areaLabel(ctx, 1200, 150, "LEAD LIBRARY", "#6d28d9");
  drawBookshelf(ctx, 1195, 170, 48, 230); drawBookshelf(ctx, 1320, 170, 48, 230);
  drawFurniture(ctx, 1395, 350, 105, 65, "READ", "#92400e");
  drawBook(ctx, 1255, 250); drawNpc(ctx, 1460, 210, "#7c3aed", "Librarian");
}

function drawActionPark(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#bbf7d0"; ctx.fillRect(1530, 690, 675, 430);
  areaLabel(ctx, 1560, 725, "ACTION PARK", "#0f766e");
  ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 6; ctx.setLineDash([18, 12]); ctx.strokeRect(1570, 785, 500, 120); ctx.setLineDash([]);
  drawTree(ctx, 1640, 825); drawTree(ctx, 2170, 760); drawTree(ctx, 2050, 1070);
  ctx.fillStyle = "#78350f"; rounded(ctx, 1770, 852, 55, 20, 8); ctx.fill();
  ctx.fillStyle = "#a16207"; ctx.beginPath(); ctx.moveTo(1885, 805); ctx.lineTo(1970, 690); ctx.lineTo(2050, 805); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1d4ed8"; rounded(ctx, 2050, 865, 150, 120, 18); ctx.fill();
  ctx.fillStyle = "#facc15"; ctx.font = "900 20px sans-serif"; ctx.textAlign = "center"; ctx.fillText("DANCE", 2125, 935);
}

function drawPool(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#e0f2fe"; ctx.fillRect(900, 875, 540, 300);
  ctx.strokeStyle = "#f8fafc"; ctx.lineWidth = 14; ctx.strokeRect(900, 875, 540, 300);
  ctx.fillStyle = "#38bdf8"; ctx.fillRect(970, 915, 400, 215);
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3; for (let y = 950; y < 1120; y += 45) { ctx.beginPath(); ctx.moveTo(980, y); ctx.bezierCurveTo(1080, y - 14, 1180, y + 14, 1360, y); ctx.stroke(); }
  areaLabel(ctx, 930, 850, "SWIMMING POOL", "#0369a1");
  drawNpc(ctx, 940, 1220, "#0284c7", "Coach");
  drawFinishFlag(ctx, 1480, 1190);
}

function drawFinalCourse(ctx: CanvasRenderingContext2D, unlocked: boolean) {
  ctx.save(); if (!unlocked) ctx.globalAlpha = 0.42;
  ctx.fillStyle = "#dbeafe"; rounded(ctx, 70, 850, 730, 500, 24); ctx.fill();
  areaLabel(ctx, 105, 890, unlocked ? "FINAL ACTION COURSE" : "FINAL COURSE - LOCKED", unlocked ? "#2563eb" : "#64748b");
  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 6; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(150, 930); ctx.lineTo(285, 1030); ctx.lineTo(405, 1030); ctx.lineTo(520, 985); ctx.lineTo(630, 1040); ctx.lineTo(735, 990); ctx.lineTo(720, 1170); ctx.lineTo(520, 1210); ctx.lineTo(250, 1220); ctx.stroke(); ctx.setLineDash([]);
  checkpoint(ctx, 150, 930, "START"); checkpoint(ctx, 285, 1030, "RUN"); checkpoint(ctx, 405, 1030, "JUMP"); checkpoint(ctx, 520, 985, "CLIMB"); checkpoint(ctx, 630, 1040, "SIT"); checkpoint(ctx, 735, 990, "READ"); checkpoint(ctx, 720, 1170, "DANCE"); checkpoint(ctx, 520, 1210, "SWIM");
  drawFinishFlag(ctx, 250, 1220);
  ctx.restore();
}

function drawTrailSigns(ctx: CanvasRenderingContext2D) {
  sign(ctx, 610, 585, "HOME / LIBRARY"); sign(ctx, 1085, 585, "ACTION PARK"); sign(ctx, 775, 750, "POOL / FINAL");
}

function drawInteractionObjects(ctx: CanvasRenderingContext2D, state: GameState) {
  const nearest = interactions.find((item) => item.id === state.nearbyLabel);
  void nearest;
  for (const item of interactions) {
    if (!interactionVisible(item.id, state)) continue;
    if (item.id.startsWith("final-")) continue;
    ctx.strokeStyle = "rgba(250,204,21,.75)"; ctx.lineWidth = 3; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.arc(item.x, item.y, 25, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }
}

function drawBill(ctx: CanvasRenderingContext2D, player: GameState["player"], now: number) {
  ctx.save();
  const action = player.action;
  const phase = Math.sin(player.frame * Math.PI);
  const jump = action === "jump" ? Math.abs(Math.sin(((player.actionUntil - now) / 900) * Math.PI)) * 30 : 0;
  const bounce = action === "dance" ? Math.sin(now / 90) * 5 : action === "run" ? Math.sin(player.frame * Math.PI * 2) * 2 : 0;
  ctx.translate(player.x, player.y - jump + bounce);
  const facing = player.direction === "left" ? -1 : 1;
  ctx.scale(facing, 1);
  const sit = action === "sit" || action === "read";
  const swim = action === "swim";
  const climb = action === "climb";
  const dance = action === "dance";
  const stride = player.moving ? phase * (action === "run" ? 10 : 6) : 0;

  ctx.lineCap = "round";
  ctx.strokeStyle = "#172554"; ctx.lineWidth = 7;
  ctx.beginPath();
  if (swim) { ctx.moveTo(-4, 12); ctx.lineTo(-20, 17); ctx.moveTo(5, 12); ctx.lineTo(22, 18); }
  else if (sit) { ctx.moveTo(-6, 13); ctx.lineTo(-16, 20); ctx.lineTo(-2, 21); ctx.moveTo(6, 13); ctx.lineTo(16, 20); ctx.lineTo(28, 20); }
  else { ctx.moveTo(-6, 13); ctx.lineTo(-7 + stride, 30); ctx.moveTo(6, 13); ctx.lineTo(7 - stride, 30); }
  ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.fillRect(-13 + stride, 27, 16, 6); ctx.fillRect(2 - stride, 27, 16, 6);

  ctx.fillStyle = "#2563eb"; rounded(ctx, -15, -14, 30, 31, 7); ctx.fill();
  ctx.fillStyle = "white"; ctx.font = "900 7px sans-serif"; ctx.textAlign = "center"; ctx.fillText("LEAD", 0, 5);

  ctx.strokeStyle = "#e6aa78"; ctx.lineWidth = 7; ctx.beginPath();
  const armLift = climb || dance ? -18 : swim ? -5 : 2;
  ctx.moveTo(-12, -7); ctx.lineTo(-21 - (dance ? 5 : 0), armLift + stride / 2);
  ctx.moveTo(12, -7); ctx.lineTo(21 + (dance ? 5 : 0), armLift - stride / 2); ctx.stroke();

  ctx.fillStyle = "#e8b181"; ctx.beginPath(); ctx.arc(0, -27, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.arc(0, -32, 14, Math.PI, Math.PI * 2); ctx.fill(); ctx.fillRect(-14, -33, 28, 5);
  if (player.direction !== "up") { ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(-4, -27, 1.5, 0, Math.PI * 2); ctx.arc(4, -27, 1.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, -23, 4, 0.1, Math.PI - 0.1); ctx.stroke(); }

  if (action === "read") { ctx.fillStyle = "#16a34a"; ctx.fillRect(-22, -2, 44, 25); ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 23); ctx.stroke(); }
  if (action === "eat") drawApple(ctx, 22, -7);
  if (action === "drink") drawBottle(ctx, 22, -6);
  if (swim) { ctx.fillStyle = "rgba(56,189,248,.65)"; ctx.fillRect(-36, 8, 72, 23); }
  ctx.restore();
}

function drawMiniMap(ctx: CanvasRenderingContext2D, state: GameState) {
  const x = VIEW_WIDTH - 166; const y = 16; const w = 150; const h = 96;
  ctx.fillStyle = "rgba(15,23,42,.88)"; rounded(ctx, x, y, w, h, 12); ctx.fill();
  ctx.fillStyle = "#facc15"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "left"; ctx.fillText("LEAD WORLD MAP", x + 10, y + 16);
  const dots = [
    { x: x + 22, y: y + 38, label: "P", world: { x: 300, y: 300 } },
    { x: x + 66, y: y + 38, label: "H", world: { x: 850, y: 300 } },
    { x: x + 112, y: y + 38, label: "L", world: { x: 1350, y: 300 } },
    { x: x + 112, y: y + 75, label: "A", world: { x: 1900, y: 850 } },
    { x: x + 66, y: y + 75, label: "S", world: { x: 1150, y: 1030 } },
    { x: x + 22, y: y + 75, label: "F", world: { x: 400, y: 1100 } }
  ];
  for (const dot of dots) { ctx.fillStyle = "#2563eb"; ctx.beginPath(); ctx.arc(dot.x, dot.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "white"; ctx.font = "900 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(dot.label, dot.x, dot.y + 3); }
  const px = x + 12 + (state.player.x / WORLD_WIDTH) * 126; const py = y + 25 + (state.player.y / WORLD_HEIGHT) * 60;
  ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
}

function MissionPanel({ snapshot }: { snapshot: Snapshot }) {
  const tasks = levelMissions[snapshot.level];
  const keys = snapshot.level === 0
    ? ["play-ball", "stand", "slide"]
    : snapshot.level === 1
      ? ["bed", "apple", "water", "home-door"]
      : snapshot.level === 2
        ? ["book", "library-chair"]
        : snapshot.level === 3
          ? ["run-tree", "jump-log", "hill", "dance"]
          : snapshot.level === 4
            ? ["pool", "pool-finish"]
            : ["final-run", "final-jump", "final-climb", "final-sit", "final-stand", "final-read", "final-dance", "final-swim", "final-finish"];
  return <div className="absolute left-3 top-16 z-10 w-[min(290px,calc(100%-1.5rem))] rounded-2xl border border-blue-300/30 bg-slate-950/90 p-4 text-white shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">LEAD Mission</p><p className="mt-1 font-heading text-lg font-extrabold">{levelNames[snapshot.level]}</p><div className="mt-3 grid gap-2">{tasks.map((task, index) => { const done = snapshot.completed.includes(keys[index]); return <div key={task} className={`flex items-center gap-2 text-xs font-semibold ${done ? "text-emerald-300" : "text-slate-200"}`}><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-500 text-white" : "bg-white/10"}`}>{done ? "OK" : index + 1}</span>{task}</div>; })}</div></div>;
}

function ActionBook({ verbs }: { verbs: ActionVerb[] }) {
  const core: ActionVerb[] = ["walk", "run", "jump", "sit", "stand", "read", "eat", "drink", "sleep", "swim", "play", "dance", "climb", "open"];
  return <div className="absolute right-3 top-32 z-20 w-[min(250px,calc(100%-1.5rem))] rounded-2xl border border-yellow-300/40 bg-white/95 p-4 shadow-xl backdrop-blur"><p className="text-xs font-black uppercase tracking-[0.16em] text-lead-blue">Action Book</p><div className="mt-3 grid grid-cols-2 gap-2">{core.map((verb) => <span key={verb} className={`rounded-lg px-2 py-2 text-center text-xs font-bold uppercase ${verbs.includes(verb) ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{verbs.includes(verb) ? "✓ " : ""}{verb}</span>)}</div></div>;
}

function TouchControls({ move, interact, running, setRunning }: { move: (direction: Direction, pressed: boolean) => void; interact: () => void; running: boolean; setRunning: (pressed: boolean) => void }) {
  const control = (direction: Direction, label: string) => <button aria-label={direction} onPointerDown={(event) => { event.preventDefault(); move(direction, true); }} onPointerUp={() => move(direction, false)} onPointerCancel={() => move(direction, false)} onPointerLeave={() => move(direction, false)} className="grid h-12 w-12 touch-none select-none place-items-center rounded-xl bg-slate-100 text-lg font-black text-lead-navy active:bg-blue-200">{label}</button>;
  return <div className="flex items-center justify-center gap-3"><div className="grid grid-cols-3 gap-1"><span />{control("up", "UP")}<span />{control("left", "L")}{control("down", "DN")}{control("right", "R")}</div><div className="grid gap-2"><button onPointerDown={() => setRunning(true)} onPointerUp={() => setRunning(false)} onPointerCancel={() => setRunning(false)} className={`h-11 rounded-xl px-4 text-xs font-black ${running ? "bg-yellow-400 text-slate-950" : "bg-blue-100 text-lead-blue"}`}>RUN</button><button onClick={interact} className="h-12 rounded-xl bg-lead-blue px-4 text-xs font-black text-white">ACTION</button></div></div>;
}

function overlaps(a: Rect, b: Rect) { return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); }
function areaLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) { ctx.fillStyle = color; ctx.font = "900 22px sans-serif"; ctx.textAlign = "left"; ctx.fillText(text, x, y); }
function checkpoint(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) { ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = "#0f172a"; ctx.font = "900 8px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 3); }
function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#78350f"; ctx.fillRect(x - 8, y, 16, 46); ctx.fillStyle = "#15803d"; ctx.beginPath(); ctx.arc(x, y - 10, 34, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x - 16, y - 20, 19, 0, Math.PI * 2); ctx.arc(x + 18, y - 18, 21, 0, Math.PI * 2); ctx.fill(); }
function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#92400e"; ctx.fillRect(x, y, 90, 14); ctx.fillRect(x, y + 22, 90, 12); ctx.fillRect(x + 10, y + 34, 8, 24); ctx.fillRect(x + 70, y + 34, 8, 24); }
function drawSlide(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 35, y + 65, x + 95, y + 78); ctx.stroke(); ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 78); ctx.stroke(); }
function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#f8fafc"; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
function drawFurniture(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string, color: string) { ctx.fillStyle = color; rounded(ctx, x, y, width, height, 10); ctx.fill(); ctx.fillStyle = "white"; ctx.font = "900 11px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + width / 2, y + height / 2 + 3); }
function drawApple(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#166534"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 4, y - 20); ctx.stroke(); }
function drawBottle(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#e0f2fe"; rounded(ctx, x - 8, y - 17, 16, 34, 4); ctx.fill(); ctx.fillStyle = "#2563eb"; ctx.fillRect(x - 8, y - 5, 16, 10); ctx.fillRect(x - 4, y - 22, 8, 6); }
function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) { ctx.fillStyle = "#78350f"; ctx.fillRect(x, y, width, height); for (let row = 28; row < height; row += 48) { ctx.fillStyle = row % 96 ? "#60a5fa" : "#f43f5e"; for (let book = 6; book < width - 8; book += 11) ctx.fillRect(x + book, y + row - 22, 8, 22); ctx.fillStyle = "#f59e0b"; ctx.fillRect(x + 4, y + row, width - 8, 5); } }
function drawBook(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.fillStyle = "#16a34a"; rounded(ctx, x - 22, y - 15, 44, 30, 4); ctx.fill(); ctx.fillStyle = "white"; ctx.font = "900 7px sans-serif"; ctx.textAlign = "center"; ctx.fillText("ACTIONS", x, y + 3); }
function drawNpc(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) { ctx.fillStyle = color; rounded(ctx, x - 13, y - 7, 26, 31, 7); ctx.fill(); ctx.fillStyle = "#e8b181"; ctx.beginPath(); ctx.arc(x, y - 19, 12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#172554"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-7 + x, 23 + y); ctx.lineTo(-9 + x, 34 + y); ctx.moveTo(7 + x, 23 + y); ctx.lineTo(9 + x, 34 + y); ctx.stroke(); ctx.fillStyle = "#0f172a"; ctx.font = "900 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x, y + 49); }
function drawFinishFlag(ctx: CanvasRenderingContext2D, x: number, y: number) { ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y - 55); ctx.lineTo(x, y + 20); ctx.stroke(); ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.moveTo(x, y - 55); ctx.lineTo(x + 50, y - 38); ctx.lineTo(x, y - 20); ctx.closePath(); ctx.fill(); }
function sign(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) { ctx.fillStyle = "#78350f"; ctx.fillRect(x - 4, y, 8, 35); ctx.fillStyle = "#f8fafc"; rounded(ctx, x - 55, y - 24, 110, 30, 5); ctx.fill(); ctx.fillStyle = "#0f172a"; ctx.font = "900 9px sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x, y - 5); }
