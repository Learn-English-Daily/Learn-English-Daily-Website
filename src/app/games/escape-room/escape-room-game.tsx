"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  HelpCircle,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RoomKind = "choice" | "teacher-pass" | "sentence";

type ChoiceChallenge = {
  prompt: string;
  helper: string;
  options: string[];
  answer: string;
};

type TeacherChallenge = {
  prompt: string;
  helper: string;
};

type SentenceChallenge = {
  sentence: string;
  category: string;
  hint: string;
};

type EscapeRoom = {
  id: number;
  title: string;
  digit: string;
  kind: RoomKind;
  accent: string;
  teacherAction?: string;
  timeLimit?: number;
  choiceBank?: ChoiceChallenge[];
  teacherBank?: TeacherChallenge[];
  sentenceBank?: SentenceChallenge[];
};

const rooms: EscapeRoom[] = [
  {
    id: 1,
    title: "Vocabulary Vault",
    digit: "7",
    kind: "choice",
    accent: "from-blue-500 to-cyan-400",
    choiceBank: [
      {
        prompt: "Choose the best synonym for confident.",
        helper: "A synonym has a similar meaning.",
        options: ["sure", "tired", "late", "quiet"],
        answer: "sure"
      },
      {
        prompt: "Choose the best synonym for improve.",
        helper: "Look for the word that means to make something better.",
        options: ["upgrade", "forget", "delay", "whisper"],
        answer: "upgrade"
      },
      {
        prompt: "Choose the best synonym for opportunity.",
        helper: "This word means a good chance to do something.",
        options: ["chance", "mistake", "problem", "noise"],
        answer: "chance"
      },
      {
        prompt: "Choose the best synonym for clear.",
        helper: "Think about communication that is easy to understand.",
        options: ["obvious", "hidden", "silent", "heavy"],
        answer: "obvious"
      }
    ]
  },
  {
    id: 2,
    title: "Grammar Gate",
    digit: "3",
    kind: "choice",
    accent: "from-indigo-500 to-blue-400",
    choiceBank: [
      {
        prompt: "Complete the sentence: She ___ English every day.",
        helper: "Think about present simple with she/he/it.",
        options: ["speaks", "speak", "spoken", "speaking"],
        answer: "speaks"
      },
      {
        prompt: "Choose the correct sentence.",
        helper: "Watch the auxiliary verb and the base verb.",
        options: ["He does not like excuses.", "He do not likes excuses.", "He does not likes excuses.", "He not like excuses."],
        answer: "He does not like excuses."
      },
      {
        prompt: "Complete the sentence: If I practice daily, I ___ more fluent.",
        helper: "Use the future result for a real possibility.",
        options: ["will become", "became", "becoming", "becomes"],
        answer: "will become"
      },
      {
        prompt: "Choose the best connector: I was nervous, ___ I continued speaking.",
        helper: "The second idea contrasts with the first.",
        options: ["but", "because", "so that", "unless"],
        answer: "but"
      }
    ]
  },
  {
    id: 3,
    title: "Speaking Chamber",
    digit: "9",
    kind: "teacher-pass",
    teacherAction: "Pass Speaking Challenge",
    timeLimit: 30,
    accent: "from-yellow-400 to-orange-400",
    teacherBank: [
      {
        prompt: "Speak for 30 seconds about a skill you want to master.",
        helper: "Teacher listens for clear voice, full sentences, and confidence."
      },
      {
        prompt: "Describe a time you solved a difficult problem.",
        helper: "Use past tense and include what happened, what you did, and what you learned."
      },
      {
        prompt: "Explain your favorite hobby and why it matters to you.",
        helper: "Try to speak naturally without stopping after every sentence."
      },
      {
        prompt: "Give a short introduction as if you are meeting a new teacher.",
        helper: "Include your name, interests, goal, and one confident closing sentence."
      }
    ]
  },
  {
    id: 4,
    title: "Sentence Unlock",
    digit: "1",
    kind: "sentence",
    accent: "from-emerald-500 to-teal-400",
    sentenceBank: [
      {
        sentence: "Practice every day to improve your fluency.",
        category: "Motivation",
        hint: "Start with the action, then explain the purpose."
      },
      {
        sentence: "Confidence grows when you speak without fear.",
        category: "Public speaking",
        hint: "The subject is confidence, and the time word is when."
      },
      {
        sentence: "Strong communication skills create better opportunities.",
        category: "LEAD communication",
        hint: "Start with the adjective strong and end with opportunities."
      },
      {
        sentence: "Learning English opens doors around the world.",
        category: "Motivation",
        hint: "The phrase around the world belongs at the end."
      },
      {
        sentence: "Successful speakers focus on clarity and confidence.",
        category: "Public speaking",
        hint: "The sentence compares what successful speakers focus on."
      },
      {
        sentence: "A clear argument can change how people think.",
        category: "Debate",
        hint: "Start with a clear argument, then show the result."
      },
      {
        sentence: "Students learn faster when feedback is specific.",
        category: "Grammar",
        hint: "The when clause explains the condition."
      },
      {
        sentence: "Polite questions help conversations continue naturally.",
        category: "Daily conversation",
        hint: "Start with polite questions and end with naturally."
      }
    ]
  },
  {
    id: 5,
    title: "Persuasion Portal",
    digit: "5",
    kind: "teacher-pass",
    teacherAction: "Pass Debate Challenge",
    timeLimit: 30,
    accent: "from-violet-500 to-fuchsia-400",
    teacherBank: [
      {
        prompt: "Convince your teacher: Students should practice English every day.",
        helper: "Give a reason, an example, and a confident closing sentence."
      },
      {
        prompt: "Persuade your teacher that public speaking should be taught in every school.",
        helper: "Use one strong reason and one real-life example."
      },
      {
        prompt: "Argue that confidence is more important than perfect grammar when speaking.",
        helper: "Compare both sides, then choose your position clearly."
      },
      {
        prompt: "Convince a friend to join an English speaking class.",
        helper: "Mention the problem, the benefit, and a friendly call to action."
      }
    ]
  }
];

const finalPassword = rooms.map((room) => room.digit).join("");
const recentLimit = 3;

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function normalizeWord(word: string) {
  return word.replace(/[^\w']/g, "").toLowerCase();
}

function splitSentence(sentence: string) {
  return sentence.split(/\s+/).filter(Boolean);
}

function playTone(type: "success" | "error") {
  if (typeof window === "undefined") return;
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type === "success" ? "triangle" : "sawtooth";
  oscillator.frequency.value = type === "success" ? 720 : 180;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.28);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.3);
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getBankLength(room: EscapeRoom) {
  return room.choiceBank?.length || room.teacherBank?.length || room.sentenceBank?.length || 1;
}

function getChallenge<T>(bank: T[] | undefined, index: number) {
  if (!bank?.length) throw new Error("Missing challenge bank");
  return bank[index % bank.length];
}

export function EscapeRoomGame() {
  const [started, setStarted] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [completedRoomIds, setCompletedRoomIds] = useState<number[]>([]);
  const [digits, setDigits] = useState<string[]>([]);
  const [challengeIndexes, setChallengeIndexes] = useState(() => rooms.map(() => 0));
  const [recentChallengeIndexes, setRecentChallengeIndexes] = useState<Record<number, number[]>>({});
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [choiceOptions, setChoiceOptions] = useState<string[]>([]);
  const [sentencePool, setSentencePool] = useState<string[]>([]);
  const [sentenceAnswer, setSentenceAnswer] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [passwordAttempt, setPasswordAttempt] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [roomStartedAt, setRoomStartedAt] = useState(Date.now());
  const [challengeSeconds, setChallengeSeconds] = useState(0);
  const [challengeRunning, setChallengeRunning] = useState(false);

  const currentRoom = rooms[currentRoomIndex];
  const currentChallengeIndex = challengeIndexes[currentRoomIndex] || 0;
  const choiceChallenge = currentRoom.kind === "choice" ? getChallenge(currentRoom.choiceBank, currentChallengeIndex) : null;
  const teacherChallenge = currentRoom.kind === "teacher-pass" ? getChallenge(currentRoom.teacherBank, currentChallengeIndex) : null;
  const sentenceChallenge = currentRoom.kind === "sentence" ? getChallenge(currentRoom.sentenceBank, currentChallengeIndex) : null;
  const prompt = choiceChallenge?.prompt || teacherChallenge?.prompt || sentenceChallenge?.category || "";
  const helper = choiceChallenge?.helper || teacherChallenge?.helper || "Click the shuffled word cards in the correct order.";
  const progress = Math.round((completedRoomIds.length / rooms.length) * 100);
  const accuracy = useMemo(() => {
    const attempts = completedRoomIds.length + mistakes;
    if (!attempts) return 100;
    return Math.max(0, Math.round((completedRoomIds.length / attempts) * 100));
  }, [completedRoomIds.length, mistakes]);

  useEffect(() => {
    if (!started || escaped) return;
    const interval = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(interval);
  }, [started, escaped]);

  useEffect(() => {
    if (!challengeRunning || challengeSeconds <= 0) return;
    const timeout = window.setTimeout(() => {
      setChallengeSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [challengeRunning, challengeSeconds]);

  useEffect(() => {
    if (challengeSeconds === 0) setChallengeRunning(false);
  }, [challengeSeconds]);

  useEffect(() => {
    if (currentRoom.kind !== "sentence" || !sentenceChallenge) return;
    loadSentenceCards(sentenceChallenge.sentence);
  }, [currentRoom.kind, sentenceChallenge]);

  useEffect(() => {
    if (!choiceChallenge) return;
    setChoiceOptions(shuffleArray(choiceChallenge.options));
  }, [choiceChallenge]);

  function rememberChallenge(roomIndex: number, challengeIndex: number) {
    const roomId = rooms[roomIndex].id;
    setRecentChallengeIndexes((current) => ({
      ...current,
      [roomId]: [challengeIndex, ...(current[roomId] || []).filter((item) => item !== challengeIndex)].slice(0, recentLimit)
    }));
  }

  function pickChallengeIndex(roomIndex: number, forceDifferent = false) {
    const room = rooms[roomIndex];
    const bankLength = getBankLength(room);
    const recent = recentChallengeIndexes[room.id] || [];
    const current = challengeIndexes[roomIndex] || 0;
    const available = Array.from({ length: bankLength }, (_, index) => index).filter((index) => {
      if (forceDifferent && index === current && bankLength > 1) return false;
      return !recent.includes(index);
    });
    const fallback = Array.from({ length: bankLength }, (_, index) => index).filter((index) => !forceDifferent || index !== current || bankLength === 1);
    const candidates = available.length ? available : fallback.length ? fallback : [current];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function loadChallenge(roomIndex: number, forceDifferent = false) {
    const nextIndex = pickChallengeIndex(roomIndex, forceDifferent);
    setChallengeIndexes((indexes) => indexes.map((value, index) => (index === roomIndex ? nextIndex : value)));
    rememberChallenge(roomIndex, nextIndex);
    setSelectedAnswer("");
    setChoiceOptions([]);
    setSentenceAnswer([]);
    setShowHint(false);
    setStatus("idle");
    setChallengeSeconds(rooms[roomIndex].timeLimit || 0);
    setChallengeRunning(false);
    setRoomStartedAt(Date.now());
  }

  function loadSentenceCards(sentence: string) {
    const words = splitSentence(sentence);
    setSentencePool(shuffleArray(words.map((word, index) => `${index}:${word}`)));
    setSentenceAnswer([]);
  }

  function startGame() {
    const initialIndexes = rooms.map((room, roomIndex) => {
      const nextIndex = Math.floor(Math.random() * getBankLength(room));
      rememberChallenge(roomIndex, nextIndex);
      return nextIndex;
    });
    setStarted(true);
    setEscaped(false);
    setCurrentRoomIndex(0);
    setCompletedRoomIds([]);
    setDigits([]);
    setChallengeIndexes(initialIndexes);
    setSelectedAnswer("");
    setChoiceOptions(choiceChallenge ? shuffleArray(choiceChallenge.options) : []);
    setSentenceAnswer([]);
    setShowHint(false);
    setPasswordAttempt("");
    setStatus("idle");
    setScore(0);
    setMistakes(0);
    setElapsedSeconds(0);
    setRoomStartedAt(Date.now());
    setChallengeSeconds(rooms[0].timeLimit || 0);
    setChallengeRunning(false);
  }

  function resetCurrentRoom() {
    setSelectedAnswer("");
    setSentenceAnswer([]);
    setShowHint(false);
    setStatus("idle");
    setChallengeSeconds(currentRoom.timeLimit || 0);
    setChallengeRunning(false);
    setRoomStartedAt(Date.now());
    if (currentRoom.kind === "sentence" && sentenceChallenge) {
      loadSentenceCards(sentenceChallenge.sentence);
    }
  }

  function addRoomScore(manualPass = false) {
    const secondsUsed = Math.max(1, Math.round((Date.now() - roomStartedAt) / 1000));
    const speedBonus = Math.max(20, 120 - secondsUsed * 2);
    const roomPoints = 100 + speedBonus + (manualPass ? 25 : 50);
    setScore((value) => value + roomPoints);
  }

  function completeRoom(manualPass = false) {
    if (completedRoomIds.includes(currentRoom.id)) return;
    playTone("success");
    addRoomScore(manualPass);
    setStatus("success");
    setCompletedRoomIds((ids) => [...ids, currentRoom.id]);
    setDigits((currentDigits) => [...currentDigits, currentRoom.digit]);
    setChallengeRunning(false);

    window.setTimeout(() => {
      if (currentRoomIndex < rooms.length - 1) {
        const nextRoomIndex = currentRoomIndex + 1;
        setCurrentRoomIndex(nextRoomIndex);
        loadChallenge(nextRoomIndex);
      }
    }, 900);
  }

  function chooseAnswer(answer: string) {
    setSelectedAnswer(answer);
    if (answer === choiceChallenge?.answer) {
      completeRoom(false);
      return;
    }

    playTone("error");
    setStatus("error");
    setMistakes((value) => value + 1);
    setScore((value) => Math.max(0, value - 15));
  }

  function startChallengeTimer() {
    setChallengeSeconds(currentRoom.timeLimit || 30);
    setChallengeRunning(true);
  }

  function chooseSentenceWord(card: string) {
    setSentencePool((cards) => cards.filter((item) => item !== card));
    setSentenceAnswer((cards) => [...cards, card]);
    setStatus("idle");
  }

  function removeSentenceWord(card: string) {
    setSentenceAnswer((cards) => cards.filter((item) => item !== card));
    setSentencePool((cards) => [...cards, card]);
    setStatus("idle");
  }

  function checkSentenceAnswer() {
    if (!sentenceChallenge) return;
    const expected = splitSentence(sentenceChallenge.sentence).map(normalizeWord);
    const actual = sentenceAnswer.map((card) => normalizeWord(card.split(":").slice(1).join(":")));

    if (actual.length === expected.length && actual.every((word, index) => word === expected[index])) {
      completeRoom(false);
      return;
    }

    playTone("error");
    setStatus("error");
    setMistakes((value) => value + 1);
    setScore((value) => Math.max(0, value - 15));
  }

  function shuffleCurrentChallenge() {
    if (completedRoomIds.includes(currentRoom.id)) return;
    loadChallenge(currentRoomIndex, true);
  }

  function submitPassword() {
    if (passwordAttempt.trim() === finalPassword) {
      playTone("success");
      setEscaped(true);
      setScore((value) => value + Math.max(100, 500 - elapsedSeconds));
      return;
    }

    playTone("error");
    setMistakes((value) => value + 1);
    setScore((value) => Math.max(0, value - 25));
    setStatus("error");
  }

  if (!started) {
    return (
      <Card className="relative overflow-hidden border-white bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_55%,#fff7d6_100%)] p-6 shadow-soft sm:p-8">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-lead-yellow/40 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg bg-lead-blue px-4 py-2 text-sm font-bold text-white">
              <LockKeyhole className="h-4 w-4" />
              LEAD Escape Room
            </p>
            <h2 className="mt-5 font-heading text-4xl font-extrabold tracking-tight text-lead-navy sm:text-5xl">
              Escape Room English
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-lead-gray">
              Complete five English rooms, collect password digits, and escape with confidence. Each room can be shuffled for a fresh challenge.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={startGame}>
                Start Escape Room
                <KeyRound className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => playTone("success")}>
                Test Sound
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            {rooms.map((room, index) => (
              <div
                key={room.id}
                className="motion-safe:animate-[float_4s_ease-in-out_infinite] rounded-2xl border border-white bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${room.accent} font-heading text-lg font-extrabold text-white`}>
                    {room.id}
                  </span>
                  <div>
                    <p className="font-heading font-bold text-lead-navy">{room.title}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Room {room.id}/5</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (escaped) {
    return (
      <Card className="overflow-hidden border-white bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffffff_42%,#eff6ff_100%)] p-8 text-center shadow-soft">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 motion-safe:animate-bounce">
          <Trophy className="h-10 w-10" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">Final Door Opened</p>
        <h2 className="mt-3 font-heading text-4xl font-extrabold text-lead-navy">Congratulations! You escaped.</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-7 text-lead-gray">
          Final score: <span className="font-bold text-lead-navy">{score}</span>. Accuracy: <span className="font-bold text-lead-navy">{accuracy}%</span>.
        </p>
        <Button className="mt-7" onClick={startGame}>
          Play Again
          <RotateCcw className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">
                Room {Math.min(currentRoomIndex + 1, rooms.length)}/5
              </p>
              <p className="text-sm font-bold text-lead-gray">{progress}% unlocked</p>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-lead-blue to-lead-yellow transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <StatCard label="Timer" value={formatClock(elapsedSeconds)} />
            <StatCard label="Score" value={score.toString()} />
            <StatCard label="Accuracy" value={`${accuracy}%`} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card className={`relative overflow-hidden p-6 shadow-soft ${status === "success" ? "ring-2 ring-emerald-300" : ""} ${status === "error" ? "ring-2 ring-rose-300" : ""}`}>
          <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${currentRoom.accent}`} />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">Current room</p>
              <h2 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{currentRoom.title}</h2>
              <p className="mt-4 text-xl font-bold leading-8 text-lead-navy">{prompt}</p>
              <p className="mt-3 leading-7 text-lead-gray">{helper}</p>
            </div>
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-lead-navy text-center text-white shadow-soft">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-blue-100">Digit</span>
              <span className="font-heading text-3xl font-extrabold">?</span>
            </div>
          </div>

          {currentRoom.kind === "choice" && choiceChallenge ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {(choiceOptions.length ? choiceOptions : choiceChallenge.options).map((option) => {
                const isSelected = selectedAnswer === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => chooseAnswer(option)}
                    className={`focus-ring rounded-2xl border p-4 text-left font-heading text-lg font-bold transition hover:-translate-y-0.5 hover:shadow-soft ${
                      isSelected && status === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700 motion-safe:animate-[word-shake_0.35s_ease-in-out]"
                        : "border-slate-200 bg-white text-lead-navy"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : null}

          {currentRoom.kind === "teacher-pass" ? (
            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-bold text-lead-navy">Speaking timer</p>
                  <p className="mt-1 text-sm leading-6 text-lead-gray">Start the timer, listen to the student, then the teacher can pass the room.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-heading text-2xl font-extrabold text-lead-navy">
                  <Clock className="h-5 w-5 text-lead-blue" />
                  {challengeSeconds || currentRoom.timeLimit || 30}s
                </span>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button type="button" variant="secondary" onClick={startChallengeTimer}>
                  Start 30s Timer
                  <Clock className="h-4 w-4" />
                </Button>
                <Button type="button" onClick={() => completeRoom(true)}>
                  {currentRoom.teacherAction || "Teacher Pass"}
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
              {challengeSeconds === 0 && !challengeRunning ? (
                <p className="mt-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
                  Time is up. Teacher can pass if the student completed the challenge clearly.
                </p>
              ) : null}
            </div>
          ) : null}

          {currentRoom.kind === "sentence" && sentenceChallenge ? (
            <div className="mt-7 grid gap-5">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-emerald-700">Room 4 / 5</p>
                <p className="mt-2 font-heading text-xl font-extrabold text-lead-navy">Build the sentence in the correct order.</p>
                {showHint ? <p className="mt-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-emerald-700">Hint: {sentenceChallenge.hint}</p> : null}
              </div>

              <div className="min-h-[92px] rounded-2xl border-2 border-dashed border-lead-blue/30 bg-blue-50/60 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">Answer area</p>
                <div className="flex min-h-10 flex-wrap gap-2">
                  {sentenceAnswer.length ? (
                    sentenceAnswer.map((card) => (
                      <button
                        key={card}
                        type="button"
                        onClick={() => removeSentenceWord(card)}
                        className="focus-ring inline-flex items-center gap-2 rounded-xl bg-lead-blue px-4 py-2 font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                      >
                        {card.split(":").slice(1).join(":")}
                        <X className="h-3 w-3" />
                      </button>
                    ))
                  ) : (
                    <p className="text-sm font-semibold text-lead-gray">Click words below to build your answer.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-lead-gray">Shuffled word cards</p>
                <div className="flex flex-wrap gap-2">
                  {sentencePool.map((card) => (
                    <button
                      key={card}
                      type="button"
                      onClick={() => chooseSentenceWord(card)}
                      className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-lead-navy shadow-sm transition hover:-translate-y-0.5 hover:border-lead-blue hover:text-lead-blue"
                    >
                      {card.split(":").slice(1).join(":")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="button" onClick={checkSentenceAnswer}>
                  Check Answer
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="secondary" onClick={resetCurrentRoom}>
                  Reset
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowHint((value) => !value)}>
                  Hint
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {status === "success" ? (
            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700">
              <p className="flex items-center gap-2 font-bold">
                <Sparkles className="h-5 w-5" />
                {currentRoom.kind === "sentence" ? "Sentence Unlocked! Room 4 cleared." : `Room unlocked. Password digit earned: ${currentRoom.digit}`}
              </p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-rose-700">
              <p className="font-bold">Try again. Check the clue and answer carefully.</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={shuffleCurrentChallenge}>
              Shuffle Challenge
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" onClick={resetCurrentRoom}>
              Retry Room
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 content-start">
          <Card className="p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">Password Digits</p>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {rooms.map((room, index) => (
                <div key={room.id} className="grid h-14 place-items-center rounded-xl border border-slate-200 bg-white font-heading text-2xl font-extrabold text-lead-navy">
                  {digits[index] || "?"}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-lead-gray">Complete each room to reveal one digit. Use all five digits to escape.</p>
          </Card>

          {completedRoomIds.length === rooms.length ? (
            <Card className="border-lead-yellow bg-yellow-50 p-5">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-yellow-800">Final Door</p>
              <label className="mt-4 grid gap-2 text-sm font-bold text-lead-navy">
                Enter final password
                <input
                  value={passwordAttempt}
                  onChange={(event) => setPasswordAttempt(event.target.value)}
                  inputMode="numeric"
                  className="focus-ring h-12 rounded-xl border border-yellow-200 bg-white px-4 font-heading text-xl font-bold tracking-[0.2em] text-lead-navy"
                  placeholder="00000"
                />
              </label>
              <Button className="mt-4 w-full" onClick={submitPassword}>
                Escape
                <KeyRound className="h-4 w-4" />
              </Button>
            </Card>
          ) : (
            <Card className="p-5">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">Room Locks</p>
              <div className="mt-4 grid gap-2">
                {rooms.map((room) => {
                  const complete = completedRoomIds.includes(room.id);
                  const current = room.id === currentRoom.id;
                  return (
                    <div key={room.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold ${current ? "bg-blue-50 text-lead-blue" : "bg-slate-50 text-lead-gray"}`}>
                      <span>Room {room.id}</span>
                      <span>{complete ? "Unlocked" : current ? "Playing" : "Locked"}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className="font-heading text-lg font-extrabold text-lead-navy">{value}</p>
    </div>
  );
}
