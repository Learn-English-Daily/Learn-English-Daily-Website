"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, HelpCircle, RotateCcw, Shuffle, Sparkles, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SentenceChallenge = {
  sentence: string;
  category: string;
  hint: string;
  difficulty: "Warmup" | "Grammar Builder" | "Fluent Speaker";
};

const sentenceBank: SentenceChallenge[] = [
  {
    sentence: "Practice every day to improve your fluency.",
    category: "Motivation",
    hint: "Start with the action, then explain the purpose.",
    difficulty: "Warmup"
  },
  {
    sentence: "Confidence grows when you speak without fear.",
    category: "Public speaking",
    hint: "The subject is confidence, and the time word is when.",
    difficulty: "Warmup"
  },
  {
    sentence: "Strong communication skills create better opportunities.",
    category: "LEAD communication",
    hint: "Start with strong communication skills.",
    difficulty: "Grammar Builder"
  },
  {
    sentence: "Learning English opens doors around the world.",
    category: "Motivation",
    hint: "The phrase around the world belongs at the end.",
    difficulty: "Warmup"
  },
  {
    sentence: "Successful speakers focus on clarity and confidence.",
    category: "Public speaking",
    hint: "The sentence describes what successful speakers focus on.",
    difficulty: "Grammar Builder"
  },
  {
    sentence: "A clear argument can change how people think.",
    category: "Debate",
    hint: "Start with a clear argument, then show the result.",
    difficulty: "Fluent Speaker"
  },
  {
    sentence: "Students learn faster when feedback is specific.",
    category: "Grammar",
    hint: "The when clause explains the condition.",
    difficulty: "Grammar Builder"
  },
  {
    sentence: "Polite questions help conversations continue naturally.",
    category: "Daily conversation",
    hint: "Start with polite questions and end with naturally.",
    difficulty: "Fluent Speaker"
  },
  {
    sentence: "Clear pronunciation makes your message easier to understand.",
    category: "Pronunciation",
    hint: "The subject is clear pronunciation.",
    difficulty: "Fluent Speaker"
  },
  {
    sentence: "Great learners ask questions when they need support.",
    category: "Classroom English",
    hint: "Start with great learners.",
    difficulty: "Grammar Builder"
  }
];

type WordCard = {
  id: string;
  word: string;
  originalIndex: number;
};

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function normalizeWord(value: string) {
  return value.replace(/[^\w']/g, "").toLowerCase();
}

function splitSentence(sentence: string) {
  return sentence.split(/\s+/).filter(Boolean);
}

function buildCards(sentence: string) {
  return shuffleArray(
    splitSentence(sentence).map((word, index) => ({
      id: `${index}-${word}`,
      word,
      originalIndex: index
    }))
  );
}

function pickNextChallenge(currentIndex: number) {
  if (sentenceBank.length <= 1) return currentIndex;
  let nextIndex = currentIndex;
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * sentenceBank.length);
  }
  return nextIndex;
}

function getBadge(score: number) {
  if (score >= 900) return "Sentence Champion";
  if (score >= 650) return "Grammar Builder";
  if (score >= 350) return "Clear Communicator";
  return "Sentence Explorer";
}

export function SentenceBuilderGame() {
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [wordPool, setWordPool] = useState<WordCard[]>(() => buildCards(sentenceBank[0].sentence));
  const [answerCards, setAnswerCards] = useState<WordCard[]>([]);
  const [completed, setCompleted] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [message, setMessage] = useState("Click the shuffled words in the correct order.");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const challenge = sentenceBank[challengeIndex];
  const progress = Math.round((completed / 5) * 100);
  const accuracy = completed + mistakes ? Math.round((completed / (completed + mistakes)) * 100) : 100;
  const badge = getBadge(score);
  const currentAnswer = useMemo(() => answerCards.map((card) => card.word).join(" "), [answerCards]);

  function loadChallenge(index: number) {
    const nextChallenge = sentenceBank[index];
    setChallengeIndex(index);
    setWordPool(buildCards(nextChallenge.sentence));
    setAnswerCards([]);
    setShowHint(false);
    setStatus("idle");
    setMessage("New sentence loaded. Build it in the correct order.");
  }

  function chooseWord(card: WordCard) {
    setWordPool((cards) => cards.filter((item) => item.id !== card.id));
    setAnswerCards((cards) => [...cards, card]);
    setStatus("idle");
  }

  function removeWord(card: WordCard) {
    setAnswerCards((cards) => cards.filter((item) => item.id !== card.id));
    setWordPool((cards) => [...cards, card]);
    setStatus("idle");
  }

  function resetCurrent() {
    setWordPool(buildCards(challenge.sentence));
    setAnswerCards([]);
    setStatus("idle");
    setMessage("Sentence reset. Try the order again.");
  }

  function shuffleChallenge() {
    loadChallenge(pickNextChallenge(challengeIndex));
  }

  function checkAnswer() {
    const expected = splitSentence(challenge.sentence).map(normalizeWord);
    const actual = answerCards.map((card) => normalizeWord(card.word));

    if (actual.length === expected.length && actual.every((word, index) => word === expected[index])) {
      const nextCompleted = Math.min(5, completed + 1);
      setCompleted(nextCompleted);
      setScore((value) => value + 150 + streak * 25 + Math.max(0, wordPool.length === 0 ? 50 : 0));
      setStreak((value) => value + 1);
      setStatus("success");
      setMessage("Correct sentence. Beautifully built.");
      if (nextCompleted < 5) {
        window.setTimeout(() => loadChallenge(pickNextChallenge(challengeIndex)), 900);
      }
      return;
    }

    setMistakes((value) => value + 1);
    setStreak(0);
    setScore((value) => Math.max(0, value - 35));
    setStatus("error");
    setMessage("Not quite. Check the subject, verb, and ending phrase.");
  }

  function teacherPass() {
    const nextCompleted = Math.min(5, completed + 1);
    setCompleted(nextCompleted);
    setScore((value) => value + 120);
    setStreak((value) => value + 1);
    setStatus("success");
    setMessage("Teacher passed this sentence.");
    if (nextCompleted < 5) {
      window.setTimeout(() => loadChallenge(pickNextChallenge(challengeIndex)), 700);
    }
  }

  function resetGame() {
    setCompleted(0);
    setMistakes(0);
    setScore(0);
    setStreak(0);
    loadChallenge(0);
    setMessage("Game reset. Click the shuffled words in the correct order.");
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-violet-200/60 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white">
            <Sparkles className="h-4 w-4" />
            Sentence Trainer
          </p>
          <h2 className="mt-5 font-heading text-3xl font-extrabold text-lead-navy">Build clear English sentences</h2>
          <p className="mt-3 leading-7 text-lead-gray">
            Students arrange shuffled word cards into a correct sentence. It trains grammar, word order, fluency, and confidence.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat label="Progress" value={`${completed}/5`} />
            <Stat label="Score" value={String(score)} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Badge" value={badge} small />
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-lead-yellow transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={shuffleChallenge}>
              <Shuffle className="h-4 w-4" />
              Shuffle Sentence
            </Button>
            <Button type="button" variant="ghost" onClick={resetCurrent}>
              <RotateCcw className="h-4 w-4" />
              Reset Sentence
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-6">
        {completed >= 5 ? (
          <div className="grid min-h-[460px] place-items-center text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 motion-safe:animate-bounce">
                <Trophy className="h-10 w-10" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Challenge Complete</p>
              <h2 className="mt-3 font-heading text-4xl font-extrabold text-lead-navy">Sentences unlocked.</h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-lead-gray">
                Final score: <span className="font-bold text-lead-navy">{score}</span>. Accuracy: <span className="font-bold text-lead-navy">{accuracy}%</span>. Badge: <span className="font-bold text-lead-navy">{badge}</span>.
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
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">{challenge.difficulty}</p>
                <h2 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">{challenge.category}</h2>
              </div>
              <span className="w-fit rounded-lg bg-yellow-50 px-3 py-2 text-xs font-bold uppercase text-yellow-800">
                Streak {streak}
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Answer area</p>
              <div className="flex min-h-[58px] flex-wrap gap-2">
                {answerCards.length ? (
                  answerCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => removeWord(card)}
                      className="focus-ring inline-flex items-center gap-2 rounded-xl bg-lead-blue px-4 py-2 font-bold text-white shadow-sm transition hover:-translate-y-0.5"
                    >
                      {card.word}
                      <X className="h-3 w-3" />
                    </button>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-lead-gray">Click words below to build your sentence.</p>
                )}
              </div>
              {currentAnswer ? <p className="mt-4 text-sm font-semibold leading-6 text-lead-gray">{currentAnswer}</p> : null}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-lead-gray">Shuffled words</p>
              <div className="flex flex-wrap gap-2">
                {wordPool.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => chooseWord(card)}
                    className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-lead-navy shadow-sm transition hover:-translate-y-0.5 hover:border-lead-blue hover:text-lead-blue"
                  >
                    {card.word}
                  </button>
                ))}
              </div>
            </div>

            {showHint ? (
              <div className="mt-5 rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-yellow-900">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {challenge.hint}
                </p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={checkAnswer}>
                Check Answer
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowHint((value) => !value)}>
                Hint
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button type="button" variant="secondary" onClick={teacherPass}>
                Teacher Pass
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>

            <div className={`mt-6 rounded-2xl p-4 ${
              status === "success"
                ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                : status === "error"
                  ? "border border-rose-100 bg-rose-50 text-rose-700"
                  : "bg-slate-50 text-lead-gray"
            }`}>
              <p className="text-sm font-bold leading-6">{message}</p>
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
