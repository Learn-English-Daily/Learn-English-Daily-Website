"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Ear, Mic, MicOff, RotateCcw, Shuffle, Sparkles, Trophy, Volume2 } from "lucide-react";
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
  resultIndex: number;
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

type Challenge = {
  phrase: string;
  focus: string;
  tip: string;
  difficulty: "Warmup" | "Clear Sounds" | "Fluent Speaker";
};

const challenges: Challenge[] = [
  {
    phrase: "She sells fresh seashells by the seashore",
    focus: "S and SH sounds",
    tip: "Smile slightly for S, then round your lips for SH.",
    difficulty: "Clear Sounds"
  },
  {
    phrase: "I thought the third thing was worth it",
    focus: "TH sound",
    tip: "Place your tongue lightly between your teeth for TH.",
    difficulty: "Fluent Speaker"
  },
  {
    phrase: "Practice makes progress every single day",
    focus: "Clear endings",
    tip: "Finish the last sound of each word, especially S and T.",
    difficulty: "Warmup"
  },
  {
    phrase: "World leaders learn through listening",
    focus: "L and R sounds",
    tip: "For L, touch behind your teeth. For R, keep the tongue back.",
    difficulty: "Clear Sounds"
  },
  {
    phrase: "Confidence grows when I speak clearly",
    focus: "Sentence rhythm",
    tip: "Stress confidence, grows, speak, and clearly.",
    difficulty: "Warmup"
  },
  {
    phrase: "The brave speaker explained every idea with clarity",
    focus: "Fluency and clarity",
    tip: "Say the full sentence smoothly, not word by word.",
    difficulty: "Fluent Speaker"
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

function shuffleChallengeIndex(currentIndex: number) {
  if (challenges.length <= 1) return currentIndex;
  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * challenges.length);
  }
  return nextIndex;
}

function getBadge(score: number) {
  if (score >= 90) return "Pronunciation Champion";
  if (score >= 75) return "Clear Speaker";
  if (score >= 55) return "Rising Voice";
  return "Sound Explorer";
}

export function PronunciationChallengeGame() {
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [completed, setCompleted] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [message, setMessage] = useState("Listen to the phrase, then press Start Speaking.");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const challenge = challenges[challengeIndex];
  const averageScore = attempts ? Math.round(totalScore / attempts) : 0;
  const progress = Math.round((completed / 5) * 100);
  const badge = getBadge(Math.max(bestScore, averageScore));
  const phraseWords = useMemo(() => challenge.phrase.split(/\s+/), [challenge.phrase]);

  function speakPhrase(slow = false) {
    if (!("speechSynthesis" in window)) {
      setMessage("Text-to-speech is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(challenge.phrase);
    utterance.lang = "en-US";
    utterance.rate = slow ? 0.68 : 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
    setMessage(slow ? "Listen slowly, then repeat." : "Listen carefully, then repeat.");
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  function gradeTranscript(transcript: string) {
    const score = similarityScore(challenge.phrase, transcript);
    setAttempts((value) => value + 1);
    setTotalScore((value) => value + score);
    setBestScore((value) => Math.max(value, score));

    if (score >= 82) {
      setCompleted((value) => Math.min(5, value + 1));
      setMessage(`Great pronunciation: ${score}%. Move to the next phrase.`);
      setRound((value) => Math.min(5, value + 1));
      setChallengeIndex((value) => shuffleChallengeIndex(value));
      setLiveTranscript("");
      return;
    }

    if (score >= 62) {
      setMessage(`Almost there: ${score}%. Listen once more and try to make each sound clearer.`);
      return;
    }

    setMessage(`Try again: ${score}%. Use the tip, then repeat slowly.`);
  }

  function startListening() {
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
      setLiveTranscript(transcript.trim());

      const latestResult = event.results[event.results.length - 1];
      if (latestResult?.isFinal) {
        gradeTranscript(transcript.trim());
        stopListening();
      }
    };

    recognition.onerror = () => {
      setMessage("Microphone had an issue. Please allow microphone access and try again.");
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setMessage("Listening. Say the full phrase clearly.");
  }

  function shuffleChallenge() {
    stopListening();
    setChallengeIndex((value) => shuffleChallengeIndex(value));
    setLiveTranscript("");
    setMessage("New phrase loaded. Listen first, then speak.");
  }

  function teacherPass() {
    stopListening();
    setAttempts((value) => value + 1);
    setTotalScore((value) => value + 85);
    setBestScore((value) => Math.max(value, 85));
    setCompleted((value) => Math.min(5, value + 1));
    setRound((value) => Math.min(5, value + 1));
    setChallengeIndex((value) => shuffleChallengeIndex(value));
    setLiveTranscript("");
    setMessage("Teacher passed the pronunciation round.");
  }

  function resetGame() {
    stopListening();
    setChallengeIndex(0);
    setRound(1);
    setCompleted(0);
    setAttempts(0);
    setBestScore(0);
    setTotalScore(0);
    setLiveTranscript("");
    setMessage("Game reset. Listen to the phrase, then press Start Speaking.");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-lead-yellow/30 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-lg bg-lead-blue px-4 py-2 text-sm font-bold text-white">
            <Ear className="h-4 w-4" />
            Pronunciation Trainer
          </p>
          <h2 className="mt-5 font-heading text-3xl font-extrabold text-lead-navy">Listen, repeat, improve</h2>
          <p className="mt-3 leading-7 text-lead-gray">
            Complete five pronunciation rounds. The browser listens to the student and compares the spoken phrase with the target phrase.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat label="Round" value={`${Math.min(round, 5)}/5`} />
            <Stat label="Best Score" value={`${bestScore}%`} />
            <Stat label="Average" value={`${averageScore}%`} />
            <Stat label="Badge" value={badge} small />
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-lead-blue to-lead-yellow transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">{progress}% completed</p>
        </div>
      </Card>

      <Card className="overflow-hidden p-6">
        {completed >= 5 ? (
          <div className="grid min-h-[460px] place-items-center text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 motion-safe:animate-bounce">
                <Trophy className="h-10 w-10" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">Challenge Complete</p>
              <h2 className="mt-3 font-heading text-4xl font-extrabold text-lead-navy">Excellent speaking work.</h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-lead-gray">
                Final average: <span className="font-bold text-lead-navy">{averageScore}%</span>. Badge earned: <span className="font-bold text-lead-navy">{badge}</span>.
              </p>
              <Button type="button" className="mt-7" onClick={resetGame}>
                Play Again
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">{challenge.difficulty}</p>
                <h2 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{challenge.focus}</h2>
              </div>
              <span className="w-fit rounded-lg bg-yellow-50 px-3 py-2 text-xs font-bold uppercase text-yellow-800">
                Target score: 82%
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-lead-blue">Say this phrase</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {phraseWords.map((word, index) => (
                  <span key={`${word}-${index}`} className="rounded-xl bg-white px-3 py-2 font-heading text-xl font-extrabold text-lead-navy shadow-sm">
                    {word}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-yellow-900">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                {challenge.tip}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => speakPhrase(false)}>
                <Volume2 className="h-4 w-4" />
                Listen
              </Button>
              <Button type="button" variant="secondary" onClick={() => speakPhrase(true)}>
                <Volume2 className="h-4 w-4" />
                Slow Listen
              </Button>
              <Button type="button" variant={isListening ? "secondary" : "yellow"} onClick={isListening ? stopListening : startListening}>
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isListening ? "Stop" : "Start Speaking"}
              </Button>
              <Button type="button" variant="ghost" onClick={shuffleChallenge}>
                <Shuffle className="h-4 w-4" />
                Shuffle Phrase
              </Button>
            </div>

            <div className="mt-6 rounded-2xl bg-lead-navy p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100">Live transcript</p>
              <p className="mt-3 min-h-[34px] text-lg leading-8">{liveTranscript || "Waiting for microphone input..."}</p>
            </div>

            <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-sm font-semibold leading-6 text-lead-gray">{message}</p>
              <Button type="button" variant="secondary" onClick={teacherPass}>
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
