"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, Flame, Mic, MicOff, RotateCcw, Shuffle, Trophy, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type Twister = {
  text: string;
  focus: string;
  level: "Warmup" | "Tricky" | "Battle";
  tip: string;
};

const twisters: Twister[] = [
  {
    text: "Bright blue birds bring big books",
    focus: "B sound",
    level: "Warmup",
    tip: "Pop the B sound clearly, but do not rush the ending."
  },
  {
    text: "She sees seven shiny seashells",
    focus: "S and SH sounds",
    level: "Tricky",
    tip: "Separate S from SH. Smile for S, round your lips for SH."
  },
  {
    text: "Three thin thinkers thought thoroughly",
    focus: "TH sound",
    level: "Battle",
    tip: "Put your tongue lightly between your teeth for TH."
  },
  {
    text: "Red roses really rarely arrive early",
    focus: "R sound",
    level: "Tricky",
    tip: "Keep the tongue back for R and slow down the first try."
  },
  {
    text: "Clear clever classmates create confident conversations",
    focus: "C and CL sounds",
    level: "Battle",
    tip: "Start each word strongly and keep the rhythm steady."
  },
  {
    text: "Five fluent friends finished fast",
    focus: "F sound",
    level: "Warmup",
    tip: "Touch your top teeth to your bottom lip for F."
  },
  {
    text: "Polite people practice public speaking proudly",
    focus: "P sound",
    level: "Tricky",
    tip: "Make P crisp, then keep the sentence smooth."
  },
  {
    text: "Little learners listen and learn lively lessons",
    focus: "L sound",
    level: "Battle",
    tip: "Touch behind your teeth for L, especially at the start."
  }
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, row) => [row]);
  for (let column = 1; column <= b.length; column += 1) matrix[0][column] = column;

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      matrix[row][column] =
        a[row - 1] === b[column - 1]
          ? matrix[row - 1][column - 1]
          : Math.min(matrix[row - 1][column - 1] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column] + 1);
    }
  }

  return matrix[a.length][b.length];
}

function similarityScore(target: string, spoken: string) {
  const normalizedTarget = normalize(target);
  const normalizedSpoken = normalize(spoken);
  if (!normalizedTarget || !normalizedSpoken) return 0;

  const distance = levenshtein(normalizedTarget, normalizedSpoken);
  const longest = Math.max(normalizedTarget.length, normalizedSpoken.length);
  return Math.max(0, Math.round((1 - distance / longest) * 100));
}

function nextIndex(currentIndex: number) {
  if (twisters.length <= 1) return currentIndex;
  let index = currentIndex;
  while (index === currentIndex) {
    index = Math.floor(Math.random() * twisters.length);
  }
  return index;
}

function badgeFor(score: number) {
  if (score >= 900) return "Tongue Twister Champion";
  if (score >= 650) return "Rhythm Master";
  if (score >= 350) return "Clear Speaker";
  return "Brave Speaker";
}

export function TongueTwisterBattleGame() {
  const [twisterIndex, setTwisterIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [bestScore, setBestScore] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("Listen first, then start the battle and say the tongue twister clearly.");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const currentTwister = twisters[twisterIndex];
  const progress = Math.round((completed / 5) * 100);
  const accuracy = completed + mistakes ? Math.round((completed / (completed + mistakes)) * 100) : 100;
  const badge = badgeFor(score);
  const words = useMemo(() => currentTwister.text.split(/\s+/), [currentTwister.text]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;
    const timeout = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      stopListening();
      setIsRunning(false);
      setMistakes((value) => value + 1);
      setMessage("Time is up. Try again with a steady rhythm.");
    }
  }, [isRunning, secondsLeft]);

  function speakTwister(slow = false) {
    if (!("speechSynthesis" in window)) {
      setMessage("Text-to-speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentTwister.text);
    utterance.lang = "en-US";
    utterance.rate = slow ? 0.62 : 0.88;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    setMessage(slow ? "Listen slowly, then repeat with control." : "Listen to the rhythm, then battle.");
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setIsRunning(false);
  }

  function loadNextTwister() {
    setTwisterIndex((value) => nextIndex(value));
    setSecondsLeft(20);
    setIsRunning(false);
    setLiveTranscript("");
    setMessage("New tongue twister loaded. Listen, then start.");
  }

  function completeRound(transcript: string, manualPass = false) {
    const pronunciation = manualPass ? 85 : similarityScore(currentTwister.text, transcript);
    const speedBonus = Math.max(0, secondsLeft * 4);
    const roundScore = pronunciation + speedBonus;
    setBestScore((value) => Math.max(value, pronunciation));

    if (manualPass || pronunciation >= 78) {
      const nextCompleted = Math.min(5, completed + 1);
      setCompleted(nextCompleted);
      setRound((value) => Math.min(5, value + 1));
      setScore((value) => value + roundScore);
      setMessage(manualPass ? "Teacher passed the battle round." : `Battle won: ${pronunciation}% clarity with ${speedBonus} speed bonus.`);
      setIsRunning(false);
      stopListening();
      if (nextCompleted < 5) {
        window.setTimeout(loadNextTwister, 800);
      }
      return;
    }

    setMistakes((value) => value + 1);
    setScore((value) => Math.max(0, value + Math.round(pronunciation / 2) - 25));
    setMessage(`Almost: ${pronunciation}%. Slow down, use the tip, and try again.`);
    setIsRunning(false);
    stopListening();
  }

  function startBattle() {
    const SpeechRecognition = (window as WindowWithSpeech).SpeechRecognition || (window as WindowWithSpeech).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += ` ${event.results[index][0].transcript}`;
      }
      const cleanTranscript = transcript.trim();
      setLiveTranscript(cleanTranscript);
      const latest = event.results[event.results.length - 1];
      if (latest?.isFinal) {
        completeRound(cleanTranscript);
      }
    };
    recognition.onerror = () => {
      setMessage("Microphone had an issue. Please allow microphone access and try again.");
      setIsListening(false);
      setIsRunning(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setSecondsLeft(20);
    setIsRunning(true);
    setIsListening(true);
    setLiveTranscript("");
    setMessage("Battle started. Say the full twister before time runs out.");
  }

  function resetGame() {
    stopListening();
    setTwisterIndex(0);
    setRound(1);
    setCompleted(0);
    setSecondsLeft(20);
    setIsRunning(false);
    setLiveTranscript("");
    setBestScore(0);
    setScore(0);
    setMistakes(0);
    setMessage("Game reset. Listen first, then start the battle.");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-rose-200/60 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white">
            <Flame className="h-4 w-4" />
            Speaking Battle
          </p>
          <h2 className="mt-5 font-heading text-3xl font-extrabold text-lead-navy">Tongue Twister Battle</h2>
          <p className="mt-3 leading-7 text-lead-gray">
            Students race the timer while keeping pronunciation clear. It trains rhythm, speed, mouth control, and confidence.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat label="Round" value={`${Math.min(round, 5)}/5`} />
            <Stat label="Timer" value={`${secondsLeft}s`} />
            <Stat label="Best Clarity" value={`${bestScore}%`} />
            <Stat label="Badge" value={badge} small />
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-lead-yellow transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Accuracy {accuracy}% / Score {score}</p>
        </div>
      </Card>

      <Card className="overflow-hidden p-6">
        {completed >= 5 ? (
          <div className="grid min-h-[460px] place-items-center text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 motion-safe:animate-bounce">
                <Trophy className="h-10 w-10" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-rose-700">Battle Complete</p>
              <h2 className="mt-3 font-heading text-4xl font-extrabold text-lead-navy">You won the tongue twister battle.</h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-lead-gray">
                Final score: <span className="font-bold text-lead-navy">{score}</span>. Badge: <span className="font-bold text-lead-navy">{badge}</span>.
              </p>
              <Button type="button" className="mt-7" onClick={resetGame}>
                Play Again
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">{currentTwister.level}</p>
                <h2 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{currentTwister.focus}</h2>
              </div>
              <span className="w-fit rounded-lg bg-yellow-50 px-3 py-2 text-xs font-bold uppercase text-yellow-800">
                Target clarity: 78%
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">Say this tongue twister</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {words.map((word, index) => (
                  <span key={`${word}-${index}`} className="rounded-xl bg-white px-3 py-2 font-heading text-xl font-extrabold text-lead-navy shadow-sm">
                    {word}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
              <p className="text-sm font-semibold leading-6 text-yellow-900">{currentTwister.tip}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => speakTwister(false)} disabled={isRunning}>
                <Volume2 className="h-4 w-4" />
                Listen
              </Button>
              <Button type="button" variant="secondary" onClick={() => speakTwister(true)} disabled={isRunning}>
                <Volume2 className="h-4 w-4" />
                Slow Listen
              </Button>
              <Button type="button" variant={isRunning ? "secondary" : "yellow"} onClick={isRunning ? stopListening : startBattle}>
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isRunning ? "Stop Battle" : "Start Battle"}
              </Button>
              <Button type="button" variant="ghost" onClick={loadNextTwister} disabled={isRunning}>
                <Shuffle className="h-4 w-4" />
                Shuffle Twister
              </Button>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-lead-navy p-5 text-white sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/10">
                <div className="text-center">
                  <Clock className="mx-auto h-5 w-5 text-blue-100" />
                  <p className="mt-1 font-heading text-2xl font-extrabold">{secondsLeft}s</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100">Live transcript</p>
                <p className="mt-2 min-h-[34px] text-lg leading-8">{liveTranscript || "Waiting for microphone input..."}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-sm font-semibold leading-6 text-lead-gray">{message}</p>
              <Button type="button" variant="secondary" onClick={() => completeRound(liveTranscript || currentTwister.text, true)} disabled={isRunning}>
                <CheckCircle2 className="h-4 w-4" />
                Teacher Pass
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className={`mt-2 font-heading font-extrabold text-lead-navy ${small ? "text-xl" : "text-3xl"}`}>{value}</p>
    </div>
  );
}
