"use client";

import { useMemo, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw, Sparkles, Trophy, Wand2 } from "lucide-react";
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

type WordState = {
  id: number;
  original: string;
  normalized: string;
  status: "pending" | "correct" | "missed";
};

const starterSpeech = "Leadership begins with responsibility, courage, and service.";

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9']/gi, "")
    .trim();
}

function buildWords(text: string): WordState[] {
  return text
    .split(/\s+/)
    .map((word, index) => ({
      id: index,
      original: word,
      normalized: normalizeWord(word),
      status: "pending" as const
    }))
    .filter((word) => word.normalized);
}

function levenshtein(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);
  for (let index = 1; index <= b.length; index += 1) matrix[0][index] = index;

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

function getBadge(score: number) {
  if (score >= 90) return "Stage Champion";
  if (score >= 70) return "Confident Speaker";
  if (score >= 40) return "Rising Speaker";
  return "Beginner Speaker";
}

export function SpeechCompetitionGame() {
  const [speechText, setSpeechText] = useState(starterSpeech);
  const [words, setWords] = useState<WordState[]>(() => buildWords(starterSpeech));
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastSpoken, setLastSpoken] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [message, setMessage] = useState("Paste a speech, load it, then start practice.");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const processedRef = useRef(0);

  const completed = words.filter((word) => word.status === "correct").length;
  const total = words.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const accuracy = completed + mistakes ? Math.max(0, Math.round((completed / (completed + mistakes)) * 100)) : 100;
  const pronunciationScore = Math.max(0, Math.min(100, accuracy + Math.round(bonusPoints / 2)));
  const fluencyScore = Math.max(0, Math.min(100, progress - mistakes * 2 + bonusPoints));
  const finalScore = Math.max(0, Math.min(100, Math.round(progress * 0.55 + accuracy * 0.35 + bonusPoints * 0.1)));
  const badge = getBadge(finalScore);

  const pendingWords = useMemo(() => words.filter((word) => word.status === "pending"), [words]);

  function loadSpeech() {
    const nextWords = buildWords(speechText);
    setWords(nextWords);
    setMistakes(0);
    setBonusPoints(0);
    setLiveTranscript("");
    setLastSpoken("");
    processedRef.current = 0;
    setMessage(nextWords.length ? "Speech loaded. Press Start Practice when the student is ready." : "Please paste at least one word.");
  }

  function clearSpeech() {
    stopListening();
    setSpeechText("");
    setWords([]);
    setMistakes(0);
    setBonusPoints(0);
    setLiveTranscript("");
    setLastSpoken("");
    processedRef.current = 0;
    setMessage("Speech cleared.");
  }

  function resetPractice() {
    stopListening();
    setWords((current) => current.map((word) => ({ ...word, status: "pending" })));
    setMistakes(0);
    setBonusPoints(0);
    setLiveTranscript("");
    setLastSpoken("");
    processedRef.current = 0;
    setMessage("Practice reset. Start again when ready.");
  }

  function markCurrentMistake() {
    setWords((current) => {
      const nextIndex = current.findIndex((word) => word.status === "pending");
      if (nextIndex < 0) return current;
      return current.map((word, index) => (index === nextIndex ? { ...word, status: "missed" } : word));
    });
    setMistakes((value) => value + 1);
    setMessage("Teacher marked a pronunciation mistake.");
    window.setTimeout(() => {
      setWords((current) => current.map((word) => (word.status === "missed" ? { ...word, status: "pending" } : word)));
    }, 900);
  }

  function addBonus() {
    setBonusPoints((value) => value + 5);
    setMessage("Teacher bonus added: +5 confidence points.");
  }

  function applySpokenWords(spokenWords: string[]) {
    if (!spokenWords.length) return;

    setWords((currentWords) => {
      let cursor = currentWords.findIndex((word) => word.status === "pending");
      let changed = false;
      const nextWords = [...currentWords];

      for (const spoken of spokenWords) {
        if (cursor < 0) break;
        const target = nextWords[cursor];
        setLastSpoken(spoken);

        if (spoken === target.normalized) {
          nextWords[cursor] = { ...target, status: "correct" };
          changed = true;
          cursor = nextWords.findIndex((word, index) => index > cursor && word.status === "pending");
          continue;
        }

        if (levenshtein(spoken, target.normalized) <= 2 && Math.min(spoken.length, target.normalized.length) >= 4) {
          nextWords[cursor] = { ...target, status: "missed" };
          changed = true;
          setMistakes((value) => value + 1);
          window.setTimeout(() => {
            setWords((wordsAfterShake) => wordsAfterShake.map((word) => (word.id === target.id && word.status === "missed" ? { ...word, status: "pending" } : word)));
          }, 700);
        }
      }

      if (changed) setMessage("Great. Keep going.");
      return nextWords;
    });
  }

  function startListening() {
    if (!words.length) {
      setMessage("Load a speech first.");
      return;
    }

    const SpeechRecognition = (window as WindowWithSpeech).SpeechRecognition || (window as WindowWithSpeech).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    processedRef.current = 0;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += ` ${event.results[index][0].transcript}`;
      }
      const normalizedWords = transcript.split(/\s+/).map(normalizeWord).filter(Boolean);
      const newWords = normalizedWords.slice(processedRef.current);
      processedRef.current = normalizedWords.length;
      setLiveTranscript(transcript.trim());
      applySpokenWords(newWords);
    };

    recognition.onerror = () => {
      setMessage("Microphone recognition had an issue. Please check browser permission and try again.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setMessage("Listening. Speak clearly and follow the speech in order.");
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-lead-blue text-white">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-lead-navy">Teacher Speech Input</h2>
            <p className="text-sm text-lead-gray">Paste a paragraph or full speech.</p>
          </div>
        </div>

        <textarea
          value={speechText}
          onChange={(event) => setSpeechText(event.target.value)}
          rows={10}
          className="focus-ring mt-5 w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-lead-navy"
          placeholder="Paste the speech here..."
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={loadSpeech}>Load Speech</Button>
          <Button type="button" variant="secondary" onClick={clearSpeech}>Clear</Button>
          <Button type="button" variant={isListening ? "secondary" : "yellow"} onClick={isListening ? stopListening : startListening}>
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? "Stop Listening" : "Start Practice"}
          </Button>
          <Button type="button" variant="ghost" onClick={resetPractice}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-lead-gray">
          <p className="font-bold text-lead-navy">Teacher Mode</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={markCurrentMistake}>Mark Pronunciation Mistake</Button>
            <Button type="button" size="sm" variant="secondary" onClick={addBonus}>Give Bonus +5</Button>
          </div>
          <p className="mt-3">{message}</p>
        </div>
      </Card>

      <div className="grid gap-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Progress" value={`${progress}%`} />
          <Stat label="Words" value={`${completed}/${total}`} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Score" value={`${finalScore}/100`} />
        </section>

        <Card className="overflow-hidden p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-lead-navy">Practice Stage</h2>
              <p className="text-sm text-lead-gray">Correct words fade away as the student speaks.</p>
            </div>
            <span className="w-fit rounded-lg bg-yellow-50 px-3 py-2 text-sm font-bold text-yellow-800">
              Badge: {badge}
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-lead-blue transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6 min-h-[220px] rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap gap-2 text-lg leading-10">
              {words.map((word) => (
                <span
                  key={word.id}
                  className={`inline-flex rounded-lg px-3 py-1 font-bold transition-all duration-500 ${
                    word.status === "correct"
                      ? "scale-75 bg-emerald-50 text-emerald-600 opacity-0"
                      : word.status === "missed"
                        ? "bg-rose-50 text-rose-700 motion-safe:animate-[word-shake_0.2s_ease-in-out_3]"
                        : "bg-blue-50 text-lead-blue"
                  }`}
                >
                  {word.original}
                </span>
              ))}
              {!words.length ? <p className="text-sm text-lead-gray">Load a speech to begin.</p> : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-lg bg-lead-navy p-4 text-white sm:grid-cols-3">
            <MiniScore label="Pronunciation" value={`${pronunciationScore}%`} />
            <MiniScore label="Fluency" value={`${fluencyScore}%`} />
            <MiniScore label="Remaining" value={String(pendingWords.length)} />
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">Live transcript</p>
            <p className="mt-2 min-h-[28px] text-sm leading-7 text-lead-navy">{liveTranscript || "Waiting for microphone input..."}</p>
            {lastSpoken ? <p className="mt-1 text-xs font-semibold text-lead-blue">Last heard: {lastSpoken}</p> : null}
          </div>
        </Card>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-lead-gray">{label}</p>
      <p className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{value}</p>
    </Card>
  );
}

function MiniScore({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-100">{label}</p>
      <p className="mt-1 font-heading text-2xl font-extrabold">{value}</p>
    </div>
  );
}
