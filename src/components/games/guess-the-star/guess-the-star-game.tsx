"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Expand,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { arcadeSound, speakArcade } from "../lead-arcade/audio";
import {
  categories,
  categoryPool,
  stars,
  type GameCategory,
  type StarProfile,
} from "./star-data";

type Level = "Foundation" | "Confident" | "Fluent";
type Result = {
  stars: number;
  score: number;
  label: string;
  practiced?: boolean;
};
const stageNames = [
  "Face Reveal",
  "Spotlight Rush",
  "Three Clues, One Star",
  "Star Magazine Studio",
  "Favorite Person Spotlight",
  "Million Star Finale",
];
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const pick = <T,>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

function Portrait({
  star,
  hidden = false,
  className = "",
}: {
  star: StarProfile;
  hidden?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (hidden || failed)
    return (
      <div
        className={`grid place-items-center bg-[radial-gradient(circle,#4c1d95,#111827)] text-7xl ${className}`}
        aria-label="Mystery public figure"
      >
        ?
      </div>
    );
  return (
    <img
      src={star.image}
      alt="Licensed public figure portrait"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

function occupationWithArticle(occupation: string) {
  return `${/^[aeiou]/i.test(occupation) ? "an" : "a"} ${occupation}`;
}

export function GuessTheStarGame() {
  const [name, setName] = useState("");
  const [input, setInput] = useState("");
  const [level, setLevel] = useState<Level>("Foundation");
  const [category, setCategory] = useState<GameCategory>("Mixed Stars");
  const [stage, setStage] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [sound, setSound] = useState(true);
  const [help, setHelp] = useState(false);
  const [credits, setCredits] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("lead-guess-star-progress");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.name) setInput(data.name);
      } catch {}
    }
  }, []);
  const totalStars = results.reduce((sum, result) => sum + result.stars, 0);
  function finish(result: Result) {
    const next = [...results, result];
    setResults(next);
    localStorage.setItem(
      "lead-guess-star-progress",
      JSON.stringify({ name, level, category, results: next }),
    );
    arcadeSound("complete", sound);
    setStage((value) => value + 1);
  }
  async function fullscreen() {
    if (!document.fullscreenElement)
      await document.getElementById("guess-star-shell")?.requestFullscreen();
    else await document.exitFullscreen();
  }
  function restart() {
    setStage(0);
    setResults([]);
  }
  if (!name)
    return (
      <Opening
        input={input}
        setInput={setInput}
        level={level}
        setLevel={setLevel}
        category={category}
        setCategory={setCategory}
        sound={sound}
        setSound={setSound}
        onStart={() => {
          const clean = input.trim().replace(/\s+/g, " ").slice(0, 28);
          if (clean) setName(clean);
        }}
        onHelp={() => setHelp(true)}
        onCredits={() => setCredits(true)}
        help={help}
        credits={credits}
        close={() => {
          setHelp(false);
          setCredits(false);
        }}
      />
    );
  const common = { level, category, sound, onComplete: finish };
  return (
    <main
      id="guess-star-shell"
      className="relative min-h-[760px] overflow-hidden rounded-[2rem] bg-[#10072f] text-white shadow-2xl"
    >
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-black/25 px-4 py-3 backdrop-blur sm:px-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[.24em] text-yellow-300">
            LEAD · Guess the Star!
          </p>
          <p className="font-black">
            {name} · {level}
          </p>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-2 text-center">
          <span className="text-xs font-black uppercase text-violet-200">
            Scoreboard
          </span>
          <p className="font-black text-yellow-300">
            ★ {totalStars}/18 · {results.reduce((s, r) => s + r.score, 0)} pts
          </p>
        </div>
        <div className="flex gap-2">
          <IconButton label="Pause" onClick={() => setPaused(true)}>
            <Pause />
          </IconButton>
          <IconButton label="Sound" onClick={() => setSound((v) => !v)}>
            {sound ? <Volume2 /> : <VolumeX />}
          </IconButton>
          <IconButton label="Fullscreen" onClick={fullscreen}>
            <Expand />
          </IconButton>
        </div>
      </header>
      <div className="relative z-10 p-4 sm:p-7">
        {stage < 6 && (
          <div className="mx-auto mb-5 max-w-5xl">
            <div className="flex justify-between text-xs font-black uppercase tracking-wider text-violet-200">
              <span>Round {stage + 1} of 6</span>
              <span>{stageNames[stage]}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-yellow-300 transition-all"
                style={{ width: `${(stage / 6) * 100}%` }}
              />
            </div>
          </div>
        )}
        {stage === 0 && <FaceReveal {...common} />}{" "}
        {stage === 1 && <SpotlightRush {...common} />}{" "}
        {stage === 2 && <ThreeClues {...common} />}{" "}
        {stage === 3 && <MagazineStudio name={name} {...common} />}{" "}
        {stage === 4 && <FavoritePersonSpotlight name={name} {...common} />} {" "}
        {stage === 5 && <Finale name={name} {...common} />} {" "}
        {stage >= 6 && (
          <FinalResult
            name={name}
            results={results}
            onReplay={restart}
            onChange={() => {
              setName("");
              restart();
            }}
          />
        )}
      </div>
      {paused && (
        <Modal title="SHOW PAUSED" close={() => setPaused(false)}>
          <p className="text-center text-lg font-bold">
            Take a breath. The spotlight will wait for you.
          </p>
          <button
            className="game-primary mt-6 w-full"
            onClick={() => setPaused(false)}
          >
            <Play className="h-5 w-5" /> Resume show
          </button>
        </Modal>
      )}
      <style jsx global>{`
        .game-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 1rem;
          background: #fde047;
          color: #172554;
          padding: 0.9rem 1.2rem;
          font-weight: 900;
          box-shadow: 0 7px 0 #ca8a04;
        }
        .game-primary:active {
          transform: translateY(4px);
          box-shadow: 0 3px 0 #ca8a04;
        }
        .game-choice {
          border: 2px solid rgba(255, 255, 255, 0.18);
          border-radius: 1rem;
          background: rgba(255, 255, 255, 0.09);
          padding: 0.85rem;
          font-weight: 800;
          transition: 0.2s;
        }
        .game-choice:hover,
        .game-choice:focus-visible {
          border-color: #fde047;
          background: rgba(253, 224, 71, 0.14);
          outline: none;
        }
        .studio-card {
          border: 1px solid rgba(255, 255, 255, 0.17);
          border-radius: 1.5rem;
          background: rgba(255, 255, 255, 0.09);
          backdrop-filter: blur(12px);
        }
        @keyframes spotlightFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}

function Opening({
  input,
  setInput,
  level,
  setLevel,
  category,
  setCategory,
  sound,
  setSound,
  onStart,
  onHelp,
  onCredits,
  help,
  credits,
  close,
}: {
  input: string;
  setInput: (v: string) => void;
  level: Level;
  setLevel: (v: Level) => void;
  category: GameCategory;
  setCategory: (v: GameCategory) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  onStart: () => void;
  onHelp: () => void;
  onCredits: () => void;
  help: boolean;
  credits: boolean;
  close: () => void;
}) {
  return (
    <section className="relative min-h-[790px] overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,#7c3aed,#2e1065_48%,#09051c)] p-5 text-white shadow-2xl sm:p-10">
      <div className="absolute -left-20 top-0 h-[650px] w-52 origin-top rotate-[18deg] bg-gradient-to-b from-cyan-300/35 to-transparent blur-xl" />
      <div className="absolute -right-20 top-0 h-[650px] w-52 origin-top -rotate-[18deg] bg-gradient-to-b from-yellow-200/35 to-transparent blur-xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.08fr_.92fr]">
        <div className="text-center lg:text-left">
          <div className="inline-flex rounded-full border border-yellow-300/40 bg-yellow-300/10 px-4 py-2 text-xs font-black uppercase tracking-[.25em] text-yellow-300">
            LEAD Television Studio · Lesson 31
          </div>
          <p className="mt-7 text-6xl">🌟 🎤 🌟</p>
          <h1 className="mt-3 font-heading text-6xl font-black leading-[.84] sm:text-8xl">
            GUESS
            <br />
            <span className="text-yellow-300">THE STAR!</span>
          </h1>
          <p className="mt-6 text-xl font-black text-violet-100">
            Guess the Famous Face. Discover Their Story.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-violet-200 lg:mx-0">
            Six original game-show rounds build recognition, description,
            vocabulary, and confident speaking.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
            <button onClick={onHelp} className="game-choice">
              <HelpCircle className="mr-2 inline h-5 w-5" />
              How to Play
            </button>
            <button onClick={onCredits} className="game-choice">
              ⓘ Portrait credits
            </button>
            <button onClick={() => setSound(!sound)} className="game-choice">
              {sound ? "🔊 Sound on" : "🔇 Sound off"}
            </button>
          </div>
        </div>
        <div className="studio-card border-yellow-300/30 p-5 shadow-[0_0_60px_rgba(168,85,247,.32)] sm:p-7">
          <div className="mx-auto -mt-12 grid h-20 w-20 place-items-center rounded-full border-4 border-yellow-300 bg-violet-700 text-5xl shadow-xl">
            🦉
          </div>
          <p className="mt-3 text-center text-sm font-black uppercase tracking-widest text-yellow-300">
            Contestant check-in
          </p>
          <label className="mt-5 block font-black">Your name</label>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() && onStart()}
            maxLength={28}
            placeholder="Type your name"
            className="mt-2 h-14 w-full rounded-xl border-2 border-violet-300/30 bg-white px-4 font-bold text-slate-900 outline-none focus:border-yellow-300"
          />
          <label className="mt-4 block font-black">English level</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["Foundation", "Confident", "Fluent"] as Level[]).map((v) => (
              <button
                key={v}
                onClick={() => setLevel(v)}
                className={`rounded-xl px-2 py-3 text-xs font-black ${level === v ? "bg-yellow-300 text-slate-950" : "bg-white/10"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <label className="mt-4 block font-black">Star category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as GameCategory)}
            className="mt-2 h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-900"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-violet-200">
            If a category has too few approved portraits, the show adds mixed
            stars.
          </p>
          <button
            disabled={!input.trim()}
            onClick={onStart}
            className="game-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-5 w-5" /> ENTER THE STUDIO
          </button>
        </div>
      </div>
      {(help || credits) && (
        <Modal
          title={help ? "HOW TO PLAY" : "PORTRAIT CREDITS & FAIR USE"}
          close={close}
        >
          {help ? (
            <div className="space-y-3 font-semibold">
              <p>
                Reveal faces, catch moving spotlights, solve clues, create a
                magazine cover, and win the finale.
              </p>
              <p>
                Every stage earns up to 3 stars. Speaking practice is
                student-confirmed—not automatically graded.
              </p>
              <p>
                Tap controls work on phones, tablets, and computers. You can
                pause anytime.
              </p>
            </div>
          ) : (
            <Credits />
          )}
        </Modal>
      )}
    </section>
  );
}

function StageTitle({
  number,
  title,
  subtitle,
}: {
  number: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto mb-6 max-w-4xl text-center">
      <p className="text-xs font-black uppercase tracking-[.3em] text-cyan-300">
        Round {number}
      </p>
      <h2 className="mt-2 font-heading text-4xl font-black sm:text-5xl">
        {title}
      </h2>
      <p className="mt-2 font-bold text-violet-200">{subtitle}</p>
    </div>
  );
}
type StageProps = {
  level: Level;
  category: GameCategory;
  sound: boolean;
  onComplete: (r: Result) => void;
};

function FaceReveal({ level, category, sound, onComplete }: StageProps) {
  const pool = categoryPool(category);
  const targets = useMemo(
    () => shuffle(pool).slice(0, Math.min(3, pool.length)),
    [],
  );
  const [targetIndex, setTargetIndex] = useState(0);
  const [revealed, setRevealed] = useState<number[]>(() =>
    shuffle([...Array(16).keys()]).slice(
      0,
      level === "Foundation" ? 5 : level === "Confident" ? 3 : 1,
    ),
  );
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState(false);
  const target = targets[targetIndex] || stars[0];
  const choices = useMemo(
    () =>
      shuffle([
        target,
        ...shuffle(stars.filter((s) => s.id !== target.id)).slice(
          0,
          level === "Foundation" ? 2 : 3,
        ),
      ]),
    [target],
  );
  function guess(star: StarProfile) {
    if (star.id !== target.id) {
      setWrong((v) => v + 1);
      arcadeSound("wrong", sound);
      return;
    }
    arcadeSound("correct", sound);
    setFeedback(true);
  }
  function next() {
    if (targetIndex + 1 >= targets.length) {
      const efficiency = Math.max(0, 16 - revealed.length);
      onComplete({
        stars: wrong === 0 && efficiency >= 7 ? 3 : wrong <= 2 ? 2 : 1,
        score: Math.max(120, 600 - wrong * 60 - revealed.length * 8),
        label: "Face Reveal",
      });
      return;
    }
    setTargetIndex((v) => v + 1);
    setRevealed(
      shuffle([...Array(16).keys()]).slice(
        0,
        level === "Foundation" ? 5 : level === "Confident" ? 3 : 1,
      ),
    );
    setFeedback(false);
  }
  return (
    <>
      <StageTitle
        number={1}
        title="FACE REVEAL"
        subtitle="Who's behind the picture? Reveal fewer tiles to earn a bigger bonus."
      />
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_.85fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] border-4 border-yellow-300 bg-slate-900 shadow-[0_0_50px_rgba(253,224,71,.25)]">
          <Portrait star={target} className="h-full w-full" />
          {[...Array(16)].map((_, i) => (
            <button
              key={i}
              aria-label={`Reveal tile ${i + 1}`}
              onClick={() =>
                !revealed.includes(i) && setRevealed((v) => [...v, i])
              }
              className={`absolute h-1/4 w-1/4 border border-violet-300/30 bg-gradient-to-br from-violet-600 to-blue-800 text-2xl font-black transition duration-500 ${revealed.includes(i) ? "pointer-events-none scale-0 rotate-90 opacity-0" : ""}`}
              style={{
                left: `${(i % 4) * 25}%`,
                top: `${Math.floor(i / 4) * 25}%`,
              }}
            >
              ★
            </button>
          ))}
        </div>
        <div className="studio-card p-5">
          <p className="text-xs font-black uppercase tracking-widest text-yellow-300">
            Star {targetIndex + 1} / {targets.length}
          </p>
          <p className="mt-3 text-xl font-black">Make your guess!</p>
          <div className="mt-4 grid gap-3">
            {choices.map((s) => (
              <button
                key={s.id}
                onClick={() => guess(s)}
                className="game-choice text-left"
              >
                {s.name}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              speakArcade(target.clues[level === "Foundation" ? 0 : 1], sound)
            }
            className="mt-4 w-full rounded-xl bg-cyan-400/15 px-4 py-3 font-black text-cyan-200"
          >
            🔊 Hear a hint
          </button>
          <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm font-bold text-violet-100">
            Backup clue: {target.pronoun} is from {target.country} and works as {occupationWithArticle(target.occupation)}.
          </p>
          <p className="mt-3 text-sm font-bold text-violet-200">
            Tiles revealed: {revealed.length}/16 · Wrong guesses: {wrong}
          </p>
        </div>
      </div>
      {feedback && (
        <Modal title="STAR REVEALED!" close={next}>
          <div className="flex gap-4">
            <Portrait star={target} className="h-28 w-24 rounded-xl" />
            <div>
              <h3 className="text-2xl font-black text-yellow-300">
                {target.name}
              </h3>
              <p className="mt-2 font-semibold">{target.description}</p>
              <p className="mt-2 text-cyan-200">
                <b>{target.pronoun} is {occupationWithArticle(target.occupation)}.</b>
              </p>
            </div>
          </div>
          <button className="game-primary mt-6 w-full" onClick={next}>
            {targetIndex + 1 >= targets.length ? "Finish round" : "Next star"}
            <ChevronRight />
          </button>
        </Modal>
      )}
    </>
  );
}

function SpotlightRush({ level, sound, onComplete }: StageProps) {
  const missions = useMemo(() => shuffle(stars).slice(0, 5), []);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [relaxed, setRelaxed] = useState(false);
  const target = missions[index];
  const choices = useMemo(
    () =>
      shuffle([
        target,
        ...shuffle(stars.filter((s) => s.id !== target.id)).slice(
          0,
          level === "Foundation" ? 2 : 3,
        ),
      ]),
    [target],
  );
  function hit(s: StarProfile) {
    if (s.id === target.id) {
      arcadeSound("correct", sound);
      setCorrect((v) => v + 1);
      setCombo((v) => v + 1);
      if (index === 4)
        onComplete({
          stars: correct >= 4 ? 3 : correct >= 2 ? 2 : 1,
          score: (correct + 1) * 180 + combo * 25,
          label: "Spotlight Rush",
        });
      else setIndex((v) => v + 1);
    } else {
      arcadeSound("wrong", sound);
      setCombo(0);
    }
  }
  return (
    <>
      <StageTitle
        number={2}
        title="SPOTLIGHT RUSH"
        subtitle="Catch the star who matches the English clue!"
      />
      <div className="mx-auto max-w-6xl">
        <div className="studio-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs font-black uppercase text-cyan-300">
              Mission {index + 1}/5 · Combo ×{Math.max(1, combo)}
            </p>
            <p className="mt-1 text-xl font-black">
              {level === "Foundation"
              ? `${target.pronoun} is ${occupationWithArticle(target.occupation)}.`
                : level === "Confident"
                  ? `${target.pronoun} is from ${target.country} and works as ${occupationWithArticle(target.occupation)}.`
                  : target.clues[2]}
            </p>
          </div>
          <button
            onClick={() => setRelaxed((v) => !v)}
            className="game-choice text-sm"
          >
            {relaxed ? "🧘 Relaxed" : "⚡ Arcade speed"}
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {choices.map((s, i) => (
            <button
              key={s.id}
              onClick={() => hit(s)}
              className={`group overflow-hidden rounded-[1.5rem] border-4 border-violet-400/40 bg-violet-900 shadow-xl transition hover:border-yellow-300 ${!relaxed ? "animate-[spotlightFloat_3s_ease-in-out_infinite]" : ""}`}
              style={{ animationDelay: `${i * 180}ms` }}
            >
              <Portrait star={s} className="h-48 w-full sm:h-64" />
              <span className="block bg-black/50 p-3 font-black group-hover:text-yellow-300">
                {s.name}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center font-bold text-violet-200">
          Correct: {correct} · A wrong tap resets the combo, but never ends the
          show.
        </p>
      </div>
    </>
  );
}

function ThreeClues({ level, sound, onComplete }: StageProps) {
  const target = useMemo(() => pick(stars), []);
  const [shown, setShown] = useState(1);
  const [wrong, setWrong] = useState(0);
  const [solved, setSolved] = useState(false);
  const choices = useMemo(
    () =>
      shuffle([
        target,
        ...shuffle(stars.filter((s) => s.id !== target.id)).slice(0, 3),
      ]),
    [target],
  );
  function guess(s: StarProfile) {
    if (s.id === target.id) {
      setSolved(true);
      arcadeSound("correct", sound);
    } else {
      setWrong((v) => v + 1);
      setShown((v) => Math.min(3, v + 1));
      arcadeSound("wrong", sound);
    }
  }
  function done() {
    onComplete({
      stars: shown === 1 && wrong === 0 ? 3 : shown === 2 ? 2 : 1,
      score: 500 - shown * 70 - wrong * 25,
      label: "Three Clues",
    });
  }
  return (
    <>
      <StageTitle
        number={3}
        title="THREE CLUES, ONE STAR"
        subtitle="Open as few mystery boxes as possible."
      />
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-5 md:grid-cols-[.65fr_1.35fr]">
          <div className="overflow-hidden rounded-[2rem] border-4 border-cyan-300 bg-violet-950">
            <Portrait star={target} hidden={!solved} className="h-80 w-full" />
            <p className="p-4 text-center text-2xl font-black">
              {solved ? target.name : "MYSTERY STAR"}
            </p>
          </div>
          <div>
            <div className="space-y-3">
              {target.clues.map((clue, i) => (
                <button
                  key={clue}
                  disabled={i >= shown}
                  onClick={() => setShown((v) => Math.max(v, i + 1))}
                  className={`w-full rounded-2xl border-2 p-5 text-left font-black transition ${i < shown ? "border-yellow-300/60 bg-yellow-300/10" : "border-white/10 bg-white/5 text-violet-400"}`}
                >
                  <span className="mr-3 text-yellow-300">
                    {i < shown ? "✓" : "?"}
                  </span>
                  {i < shown ? clue : `Mystery clue ${i + 1}`}
                </button>
              ))}
            </div>
            {!solved && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {choices.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => guess(s)}
                    className="game-choice"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
            {shown < 3 && !solved && (
              <button
                className="mt-4 w-full rounded-xl bg-cyan-400/15 p-3 font-black text-cyan-200"
                onClick={() => setShown((v) => v + 1)}
              >
                Open another clue
              </button>
            )}
          </div>
        </div>
        {solved && (
          <div className="studio-card mt-5 p-5 text-center">
            <p className="text-lg font-bold">Complete the English challenge:</p>
            <p className="mt-2 text-2xl font-black text-yellow-300">
              {level === "Foundation"
                ? `${target.pronoun} is a ${target.occupation}.`
                : level === "Confident"
                  ? `${target.pronoun} is a ${target.occupation} who ${target.achievement}.`
                  : `I admire ${target.pronoun.toLowerCase() === "he" ? "him" : "her"} because ${target.pronoun.toLowerCase()} ${target.achievement}.`}
            </p>
            <button className="game-primary mt-5" onClick={done}>
              <Check /> I read the sentence
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function MagazineStudio({
  name,
  level,
  sound,
  onComplete,
}: { name: string } & StageProps) {
  const [selected, setSelected] = useState<StarProfile | undefined>(stars[0]);
  const [own, setOwn] = useState(false);
  const [headline, setHeadline] = useState("MY INSPIRING STAR");
  const [adjective, setAdjective] = useState("talented");
  const [reason, setReason] = useState("their achievements inspire me");
  const [placed, setPlaced] = useState<string[]>([]);
  const sentenceTarget = useMemo(() => level === "Foundation"
    ? ["I", "admire", "this", "person", "because", "they", "inspire", "me."]
    : level === "Confident"
      ? ["My", "favorite", "person", "inspires", "me", "through", "hard", "work."]
      : ["I", "admire", "this", "person", "because", "their", "achievements", "encourage", "my", "goals."], [level]);
  const sentenceTiles = useMemo(() => shuffle(sentenceTarget), [sentenceTarget]);
  const [sentenceProgress, setSentenceProgress] = useState<string[]>([]);
  const [sentenceMistakes, setSentenceMistakes] = useState(0);
  const [practice, setPractice] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!practice) return;
    const timer = setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [practice]);
  const subject = own ? "My role model" : selected?.name || "My star";
  const pronoun = own ? "This person" : selected?.pronoun || "This person";
  const description =
    level === "Foundation"
      ? `${subject} is ${adjective}. I like this person because ${reason}.`
      : level === "Confident"
        ? `I admire ${subject} because this person is ${adjective} and ${reason}.`
        : `The person I admire is ${subject}. ${pronoun} is ${adjective}; ${reason}, which encourages me to work toward my own goals.`;
  const sentenceComplete = sentenceProgress.length === sentenceTarget.length;
  const coverReady = sentenceComplete && placed.length >= 3 && practice;
  function chooseSentenceWord(word: string) {
    if (sentenceComplete || sentenceProgress.includes(word)) return;
    if (word === sentenceTarget[sentenceProgress.length]) {
      setSentenceProgress((current) => [...current, word]);
      arcadeSound("correct", sound);
    } else {
      setSentenceMistakes((value) => value + 1);
      arcadeSound("wrong", sound);
    }
  }
  function finish() {
    if (!coverReady) return;
    onComplete({
      stars: sentenceMistakes === 0 && placed.length === 4 ? 3 : sentenceMistakes <= 2 ? 2 : 1,
      score: 420 + placed.length * 80 + Math.max(0, 120 - sentenceMistakes * 20),
      label: "Magazine Studio",
      practiced: practice,
    });
  }
  return (
    <>
      <StageTitle
        number={4}
        title="STAR MAGAZINE STUDIO"
        subtitle="Design a cover, create a meaningful description, then present it aloud."
      />
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <div className="studio-card p-5">
          <label className="font-black">Choose your favorite person</label>
          <select
            value={own ? "own" : selected?.id}
            onChange={(e) => {
              setOwn(e.target.value === "own");
              setSelected(stars.find((s) => s.id === e.target.value));
            }}
            className="mt-2 h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-900"
          >
            <option value="own">My Own Role Model</option>
            {stars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="mt-4 block font-black">Cover headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value.slice(0, 32))}
            className="mt-2 h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-900"
          />
          <label className="mt-4 block font-black">Describing word</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {["talented", "determined", "creative", "hard-working"].map((v) => (
              <button
                key={v}
                onClick={() => setAdjective(v)}
                className={`game-choice text-sm ${adjective === v ? "border-yellow-300 text-yellow-300" : ""}`}
              >
                {v}
              </button>
            ))}
          </div>
          <label className="mt-4 block font-black">My reason</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-900"
          >
            <option>their achievements inspire me</option>
            <option>they encourage me to keep learning</option>
            <option>their work shows strong determination</option>
          </select>
          <div className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-cyan-100">Sentence Builder Challenge</p>
                <p className="text-xs font-bold text-cyan-200">Tap the word tiles in the correct order.</p>
              </div>
              <button onClick={() => { setSentenceProgress([]); setSentenceMistakes(0); }} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black">Reset</button>
            </div>
            <div className="mt-3 min-h-14 rounded-xl border-2 border-dashed border-cyan-200/30 bg-slate-950/25 p-3 font-black leading-8">
              {sentenceProgress.length ? sentenceProgress.join(" ") : "Build your sentence here..."}
              {sentenceComplete && <span className="ml-2 text-emerald-300">✓</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sentenceTiles.map((word) => (
                <button key={word} disabled={sentenceProgress.includes(word)} onClick={() => chooseSentenceWord(word)} className="rounded-xl bg-white px-3 py-2 text-sm font-black text-violet-900 shadow disabled:opacity-25">{word}</button>
              ))}
            </div>
            <p className={`mt-2 text-xs font-bold ${sentenceMistakes ? "text-orange-200" : "text-cyan-200"}`}>{sentenceComplete ? "Excellent! Your cover sentence is complete." : sentenceMistakes ? `Not that word yet—look at the sentence order. Attempts: ${sentenceMistakes}` : "Start with the word that begins the sentence."}</p>
          </div>
          <p className="mt-5 text-sm font-black text-cyan-200">
            Tap or drag at least 3 cover stickers:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["EXCLUSIVE", "ROLE MODEL", "BIG DREAMS", "LEAD REPORTER"].map(
              (v) => (
                <button
                  key={v}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", v)}
                  onClick={() =>
                    setPlaced((p) =>
                      p.includes(v) ? p.filter((x) => x !== v) : [...p, v],
                    )
                  }
                  className={`cursor-grab rounded-full px-3 py-2 text-xs font-black ${placed.includes(v) ? "bg-yellow-300 text-slate-900" : "bg-white/10"}`}
                >
                  {v}
                </button>
              ),
            )}
          </div>
        </div>
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const value = event.dataTransfer.getData("text/plain");
            if (value) setPlaced((current) => current.includes(value) ? current : [...current, value]);
          }}
          className="relative min-h-[650px] overflow-hidden rounded-[2rem] border-8 border-white bg-gradient-to-br from-cyan-400 via-blue-600 to-violet-800 p-5 shadow-2xl"
        >
          <p className="text-center text-xs font-black tracking-[.35em]">
            LEAD STAR MAGAZINE
          </p>
          <h3 className="mt-3 text-center font-heading text-4xl font-black text-yellow-300">
            {headline}
          </h3>
          <div className="relative mx-auto mt-4 h-72 max-w-sm overflow-hidden rounded-t-[7rem] border-4 border-white/60">
            {own ? (
              <div className="grid h-full place-items-center bg-violet-950 text-8xl">
                👤
              </div>
            ) : (
              selected && <Portrait star={selected} className="h-full w-full" />
            )}
          </div>
          <div className="relative -mt-8 rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
            <h4 className="text-center text-3xl font-black">{subject}</h4>
            <p className="mt-3 text-center font-bold">{description}</p>
          </div>
          {placed.map((v, i) => (
            <span
              key={v}
              className="absolute rotate-[-6deg] rounded bg-yellow-300 px-3 py-2 text-xs font-black text-slate-900 shadow"
              style={{
                top: 140 + i * 76,
                left: i % 2 ? "auto" : 12,
                right: i % 2 ? 12 : "auto",
              }}
            >
              {v}
            </span>
          ))}
          <p className="mt-4 text-center text-xs font-black">
            Designed by {name}
          </p>
        </div>
      </div>
      <div className="studio-card mx-auto mt-6 max-w-4xl p-5 text-center">
        <h3 className="text-2xl font-black text-yellow-300">
          Introduce your favorite person!
        </h3>
        <p className="mt-3 text-lg font-bold">{description}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            className="game-choice"
            onClick={() => speakArcade(description, sound)}
          >
            🔊 Hear model
          </button>
          <button
            className="game-choice"
            onClick={() => setPractice((v) => !v)}
          >
            {practice
              ? `⏱ Practice timer ${seconds}s`
              : `🎤 Start speaking timer`}
          </button>
        </div>
        <p className="mt-3 text-sm text-violet-200">
          Speaking is self-practice. The game does not claim to assess
          pronunciation.
        </p>
        <div className="mx-auto mt-4 grid max-w-2xl gap-2 text-left text-sm font-black sm:grid-cols-3">
          <p className={sentenceComplete ? "text-emerald-300" : "text-violet-300"}>{sentenceComplete ? "✓" : "○"} Build the sentence</p>
          <p className={placed.length >= 3 ? "text-emerald-300" : "text-violet-300"}>{placed.length >= 3 ? "✓" : "○"} Add 3 stickers</p>
          <p className={practice ? "text-emerald-300" : "text-violet-300"}>{practice ? "✓" : "○"} Practice speaking</p>
        </div>
        <button disabled={!coverReady} className="game-primary mt-5 disabled:cursor-not-allowed disabled:opacity-40" onClick={finish}>
          <Trophy /> Finish my cover
        </button>
      </div>
    </>
  );
}

function FavoritePersonSpotlight({
  name,
  level,
  sound,
  onComplete,
}: { name: string } & StageProps) {
  const passages: Record<Level, string> = {
    Foundation:
      "A favorite person is someone we respect and enjoy learning from. This person does not need to be famous. A parent, teacher, friend, athlete, or artist can be a favorite person. Good qualities include kindness, honesty, courage, patience, creativity, and hard work. A favorite person inspires us by showing us how to improve, help others, or follow our dreams. We should admire what a person does, not only how famous they are.",
    Confident:
      "A favorite person is someone we respect for their qualities, choices, and actions. The person does not need to be a celebrity. A parent may inspire us through patience, a teacher through dedication, or an athlete through determination. Kindness, honesty, courage, creativity, responsibility, and hard work are meaningful qualities. Nobody is perfect, so admiration does not mean copying everything a person does. It means recognizing the positive example that helps us learn, improve, help others, or continue toward our goals.",
    Fluent:
      "Choosing a favorite person involves more than recognizing fame or success. We often admire someone whose values, decisions, and achievements have a positive influence on us. That person might demonstrate integrity, resilience, empathy, curiosity, creativity, or dedication. A meaningful role model does not need to be perfect; thoughtful admiration recognizes both human limitations and the actions worth learning from. The strongest reason for calling someone a favorite person is usually the positive example they provide—one that encourages us to grow, contribute to others, and pursue worthwhile goals.",
  };
  const questions = [
    {
      prompt: "Must a favorite person be famous?",
      options: ["Yes, always", "No, anyone can inspire us", "Only athletes can"],
      answer: "No, anyone can inspire us",
    },
    {
      prompt: "Which is a positive quality from the passage?",
      options: ["Patience", "Popularity", "Expensive clothes"],
      answer: "Patience",
    },
    {
      prompt: "How can a favorite person inspire us?",
      options: [
        "By setting a positive example",
        "By being perfect",
        "By appearing on television",
      ],
      answer: "By setting a positive example",
    },
    {
      prompt: "What should thoughtful admiration focus on?",
      options: [
        "Positive qualities and actions",
        "Fame only",
        "Copying everything",
      ],
      answer: "Positive qualities and actions",
    },
  ];
  const [readAloud, setReadAloud] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [qualities, setQualities] = useState<string[]>([]);
  const [favoriteName, setFavoriteName] = useState("");
  const [relationship, setRelationship] = useState("someone in my family");
  const [explanation, setExplanation] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!speaking) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [speaking]);
  const correct = questions.filter((question, index) => answers[index] === question.answer).length;
  const minimum = level === "Foundation" ? 25 : level === "Confident" ? 45 : 70;
  const ready = readAloud && Object.keys(answers).length === questions.length && favoriteName.trim().length >= 2 && explanation.trim().length >= minimum;
  const keySentence = "A favorite person inspires us through their qualities, actions, and the positive example they set.";
  function finish() {
    const starsEarned = correct === 4 && speaking && qualities.length >= 2 ? 3 : correct >= 3 ? 2 : 1;
    onComplete({
      stars: starsEarned,
      score: correct * 120 + qualities.length * 25 + (speaking ? 100 : 0),
      label: "Favorite Person Spotlight",
      practiced: speaking,
    });
  }
  return (
    <>
      <StageTitle
        number={5}
        title="FAVORITE PERSON SPOTLIGHT"
        subtitle="Read, understand, and explain what makes someone special to you."
      />
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="studio-card overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-400/20 to-violet-500/20 p-5 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[.24em] text-cyan-300">LEAD Reading Spotlight · {level}</p>
            <h3 className="mt-2 text-2xl font-black text-yellow-300">What makes someone a favorite person?</h3>
            <p className="mt-4 text-lg font-semibold leading-8 text-violet-50">{passages[level]}</p>
          </div>
          <div className="border-t border-white/10 p-5 sm:p-7">
            <p className="text-sm font-black uppercase tracking-wider text-violet-200">Read this key sentence aloud</p>
            <p className="mt-3 rounded-2xl border-2 border-yellow-300/40 bg-yellow-300/10 p-5 text-xl font-black leading-8 text-yellow-100">“{keySentence}”</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="game-choice" onClick={() => speakArcade(keySentence, sound)}>🔊 Hear the sentence</button>
              <button className={`game-choice ${readAloud ? "border-emerald-300 bg-emerald-400/15 text-emerald-200" : ""}`} onClick={() => setReadAloud(true)}>{readAloud ? "✓ I read it aloud" : "🎤 I read it aloud"}</button>
            </div>
          </div>
        </section>

        <section className="studio-card p-5 sm:p-7">
          <h3 className="text-2xl font-black text-yellow-300">Reading Challenge</h3>
          <p className="mt-2 font-semibold text-violet-200">Answer from the paragraph—not from celebrity trivia.</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {questions.map((question, questionIndex) => (
              <div key={question.prompt} className="rounded-2xl bg-white/5 p-4">
                <p className="font-black"><span className="mr-2 text-cyan-300">{questionIndex + 1}.</span>{question.prompt}</p>
                <div className="mt-3 grid gap-2">
                  {question.options.map((option) => {
                    const selected = answers[questionIndex] === option;
                    return <button key={option} onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: option }))} className={`game-choice text-left text-sm ${selected ? option === question.answer ? "border-emerald-300 bg-emerald-400/15 text-emerald-100" : "border-orange-300 bg-orange-400/15" : ""}`}>{selected ? option === question.answer ? "✓ " : "Try again · " : ""}{option}</button>;
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center font-black text-cyan-200">Comprehension score: {correct}/{questions.length}</p>
        </section>

        <section className="studio-card p-5 sm:p-7">
          <h3 className="text-2xl font-black text-yellow-300">My Favorite Person</h3>
          <p className="mt-2 font-semibold text-violet-200">Now connect the reading to your own life, {name}.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="font-black">Their name<input value={favoriteName} onChange={(event) => setFavoriteName(event.target.value.slice(0, 40))} placeholder="Who is your favorite person?" className="mt-2 h-12 w-full rounded-xl bg-white px-3 font-semibold text-slate-900" /></label>
            <label className="font-black">This person is<select value={relationship} onChange={(event) => setRelationship(event.target.value)} className="mt-2 h-12 w-full rounded-xl bg-white px-3 font-semibold text-slate-900"><option>someone in my family</option><option>my teacher</option><option>my friend</option><option>an athlete</option><option>an artist or entertainer</option><option>a community leader</option></select></label>
          </div>
          <p className="mt-5 font-black">Choose qualities that truly describe this person</p>
          <div className="mt-3 flex flex-wrap gap-2">{["kind", "honest", "patient", "courageous", "creative", "hard-working", "responsible", "determined"].map((quality) => <button key={quality} onClick={() => setQualities((current) => current.includes(quality) ? current.filter((value) => value !== quality) : [...current, quality])} className={`game-choice text-sm ${qualities.includes(quality) ? "border-yellow-300 bg-yellow-300/15 text-yellow-200" : ""}`}>{qualities.includes(quality) ? "✓ " : ""}{quality}</button>)}</div>
          <div className="mt-5 rounded-2xl bg-cyan-400/10 p-4 font-bold text-cyan-100">Sentence starter: My favorite person is {favoriteName || "..."}. This person is {qualities.slice(0, 2).join(" and ") || "..."}. I admire this person because...</div>
          <label className="mt-5 block font-black">Explain why this person is your favorite<textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder={level === "Foundation" ? "I admire this person because..." : "Describe their qualities, actions, and how they inspire you..."} className="mt-2 min-h-32 w-full rounded-xl bg-white p-4 font-semibold text-slate-900" /></label>
          <p className="mt-2 text-right text-xs font-bold text-violet-300">{explanation.trim().length}/{minimum} minimum characters</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4"><div><p className="font-black">Speak about your favorite person</p><p className="text-sm text-violet-200">Use your notes and speak in your own words. This is self-practice, not automatic pronunciation scoring.</p></div><button className={`game-choice ${speaking ? "border-emerald-300 text-emerald-200" : ""}`} onClick={() => setSpeaking((value) => !value)}>{speaking ? `⏱ Speaking · ${seconds}s` : "🎤 Start speaking timer"}</button></div>
          <button disabled={!ready} onClick={finish} className="game-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-40"><Star className="h-5 w-5" /> Complete Favorite Person Spotlight</button>
        </section>
      </div>
    </>
  );
}

function Finale({
  name,
  level,
  sound,
  onComplete,
}: { name: string } & StageProps) {
  const [mission, setMission] = useState(0);
  const [score, setScore] = useState(0);
  const [finalStar, setFinalStar] = useState(stars[0]);
  const [typed, setTyped] = useState("");
  const [target] = useState(() => pick(stars));
  const [flash, setFlash] = useState(true);
  useEffect(() => {
    if (mission === 0) {
      const t = setTimeout(
        () => setFlash(false),
        level === "Foundation" ? 2500 : 1500,
      );
      return () => clearTimeout(t);
    }
  }, [mission, level]);
  const next = (correct = true) => {
    if (correct) {
      setScore((v) => v + 1);
      arcadeSound("correct", sound);
    } else arcadeSound("wrong", sound);
    setMission((v) => v + 1);
  };
  const options = shuffle([
    target,
    ...shuffle(stars.filter((s) => s.id !== target.id)).slice(0, 2),
  ]);
  if (mission >= 5)
    return (
      <div className="mx-auto max-w-4xl py-16 text-center">
        <div className="text-8xl animate-bounce">🏆</div>
        <h2 className="mt-5 text-5xl font-black text-yellow-300">
          THE TIME IS YOURS, {name.toUpperCase()}!
        </h2>
        <p className="mt-4 text-xl font-bold">
          You completed all five Million Star missions.
        </p>
        <button
          className="game-primary mt-7"
          onClick={() =>
            onComplete({
              stars: score >= 4 ? 3 : score >= 2 ? 2 : 1,
              score: score * 220 + 300,
              label: "Million Star Finale",
              practiced: Boolean(typed),
            })
          }
        >
          Reveal my final result
        </button>
      </div>
    );
  return (
    <>
      <StageTitle
        number={6}
        title="MILLION STAR FINALE"
        subtitle={`Mission ${mission + 1}/5 · Win the LEAD Star Champion trophy!`}
      />
      <div className="mx-auto max-w-5xl studio-card p-5 sm:p-8">
        {mission === 0 && (
          <div className="text-center">
            <h3 className="text-2xl font-black">FLASH FACE</h3>
            <div className="mx-auto mt-4 h-72 max-w-sm overflow-hidden rounded-3xl border-4 border-yellow-300">
              <Portrait
                star={target}
                hidden={!flash}
                className="h-full w-full"
              />
            </div>
            <p className="mt-4 font-bold">Who flashed on screen?</p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {options.map((s) => (
                <button
                  className="game-choice"
                  key={s.id}
                  onClick={() => next(s.id === target.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {mission === 1 && (
          <Mission
            title="WHO DID THIS?"
            prompt={`Who ${target.achievement}?`}
            options={options.map((s) => s.name)}
            answer={target.name}
            next={next}
          />
        )}{" "}
        {mission === 2 && (
          <Mission
            title="COMPLETE THE DESCRIPTION"
            prompt={`${target.pronoun} is a...`}
            options={[target.occupation, "calendar", "celebration"]}
            answer={target.occupation}
            next={next}
          />
        )}{" "}
        {mission === 3 && (
          <div className="text-center">
            <h3 className="text-3xl font-black text-yellow-300">
              WHY DO YOU ADMIRE THEM?
            </h3>
            <p className="mt-4 text-lg font-bold">
              {target.name} {target.achievement}.
            </p>
            <p className="mt-2 text-violet-200">
              Choose your personal reason. Every thoughtful choice is valid.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                "It inspires me to work hard.",
                "It shows the value of learning.",
                "It encourages me to follow my goals.",
              ].map((v) => (
                <button
                  key={v}
                  className="game-choice"
                  onClick={() => next(true)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
        {mission === 4 && (
          <div>
            <h3 className="text-center text-3xl font-black text-yellow-300">
              FINAL SPOTLIGHT
            </h3>
            <label className="mt-5 block font-black">
              Choose an inspiring person
            </label>
            <select
              value={finalStar.id}
              onChange={(e) =>
                setFinalStar(
                  stars.find((s) => s.id === e.target.value) || stars[0],
                )
              }
              className="mt-2 h-12 w-full rounded-xl bg-white px-3 font-bold text-slate-900"
            >
              {stars.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-4 rounded-xl bg-cyan-400/10 p-4 font-bold text-cyan-100">
              {level === "Foundation"
                ? `My favorite person is ${finalStar.name}. ${finalStar.pronoun} is a ${finalStar.occupation}. I like this person because...`
                : `The person I admire is ${finalStar.name}. What makes this person special is... Their achievements influence me because...`}
            </p>
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Finish your own description here..."
              className="mt-4 min-h-28 w-full rounded-xl bg-white p-4 font-semibold text-slate-900"
            />
            <button
              className="game-primary mt-4 w-full"
              onClick={() => next(typed.trim().length >= 8)}
              disabled={typed.trim().length < 8}
            >
              Step into the spotlight
            </button>
          </div>
        )}
      </div>
    </>
  );
}
function Mission({
  title,
  prompt,
  options,
  answer,
  next,
}: {
  title: string;
  prompt: string;
  options: string[];
  answer: string;
  next: (c: boolean) => void;
}) {
  return (
    <div className="text-center">
      <h3 className="text-3xl font-black text-yellow-300">{title}</h3>
      <p className="mt-5 text-xl font-bold">{prompt}</p>
      <div className="mx-auto mt-5 grid max-w-2xl gap-3">
        {options.map((v) => (
          <button
            key={v}
            className="game-choice"
            onClick={() => next(v === answer)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function FinalResult({
  name,
  results,
  onReplay,
  onChange,
}: {
  name: string;
  results: Result[];
  onReplay: () => void;
  onChange: () => void;
}) {
  const total = results.reduce((s, r) => s + r.stars, 0);
  return (
    <div className="mx-auto max-w-4xl py-12 text-center">
      <div className="text-8xl">🏆</div>
      <p className="mt-5 text-xs font-black uppercase tracking-[.3em] text-cyan-300">
        LEAD · Learn English Daily
      </p>
      <h2 className="mt-3 text-5xl font-black text-yellow-300">
        STAR CHAMPION
      </h2>
      <p className="mt-3 text-2xl font-black">Awarded to {name}</p>
      <p className="mt-6 text-6xl font-black">{total}/18 ★</p>
      <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-6">
        {results.map((r, i) => (
          <div key={r.label} className="studio-card p-3">
            <span className="text-xs font-black">R{i + 1}</span>
            <p className="text-yellow-300">{"★".repeat(r.stars)}</p>
          </div>
        ))}
      </div>
      <p className="mt-7 font-bold text-violet-200">
        Vocabulary learned: athlete · achievement · inspiring · determined ·
        role model
      </p>
      <p className="mt-2 text-sm">
        Speaking practice:{" "}
        {results.some((r) => r.practiced)
          ? "Completed (self-reported)"
          : "Not confirmed"}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button className="game-primary" onClick={onReplay}>
          <RotateCcw /> Play again
        </button>
        <button className="game-choice" onClick={onChange}>
          Change contestant
        </button>
      </div>
      <details className="studio-card mt-8 p-5 text-left">
        <summary className="cursor-pointer font-black">
          Portrait credits & content note
        </summary>
        <Credits />
      </details>
    </div>
  );
}

function Credits() {
  return (
    <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto pr-2 text-sm">
      <p className="font-semibold">
        Portraits are used for an educational identification activity under the
        listed licenses. Cropping may occur in responsive frames. No person
        shown endorses LEAD.
      </p>
      {stars.map((s) => (
        <div key={s.id} className="rounded-xl bg-white/10 p-3">
          <b>{s.name}</b> · {s.credit.creator} ·{" "}
          <a
            className="text-cyan-300 underline"
            href={s.credit.licenseUrl}
            target="_blank"
            rel="noreferrer"
          >
            {s.credit.license}
          </a>
          <br />
          <a
            className="text-violet-200 underline"
            href={s.credit.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            Image source
          </a>{" "}
          ·{" "}
          <a
            className="text-violet-200 underline"
            href={s.factSource}
            target="_blank"
            rel="noreferrer"
          >
            Fact source
          </a>
        </div>
      ))}
    </div>
  );
}
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20 [&>svg]:h-5 [&>svg]:w-5"
    >
      {children}
    </button>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4 backdrop-blur">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-2xl rounded-[2rem] border border-white/20 bg-[#24104f] p-6 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-yellow-300">{title}</h2>
          <button
            onClick={close}
            aria-label="Close"
            className="rounded-full bg-white/10 p-2"
          >
            <X />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
