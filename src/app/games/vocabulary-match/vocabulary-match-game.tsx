"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Lightbulb, RotateCcw, Shuffle, Sparkles, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type VocabularyPair = {
  word: string;
  meaning: string;
  example: string;
  category: string;
};

type CardItem = {
  id: string;
  pairIndex: number;
  text: string;
};

const vocabularyBank: VocabularyPair[] = [
  {
    word: "Confident",
    meaning: "Feeling sure about your ability",
    example: "A confident speaker looks at the audience.",
    category: "Speaking"
  },
  {
    word: "Fluent",
    meaning: "Able to speak smoothly and naturally",
    example: "She became fluent after practicing every day.",
    category: "Speaking"
  },
  {
    word: "Clarify",
    meaning: "To make something easier to understand",
    example: "Can you clarify your main idea?",
    category: "Communication"
  },
  {
    word: "Persuade",
    meaning: "To convince someone to agree or act",
    example: "He tried to persuade his friend to join class.",
    category: "Debate"
  },
  {
    word: "Improve",
    meaning: "To become better",
    example: "Practice helps students improve their English.",
    category: "Progress"
  },
  {
    word: "Opportunity",
    meaning: "A good chance to do something",
    example: "English creates more opportunities.",
    category: "Daily English"
  },
  {
    word: "Responsibility",
    meaning: "A duty or something you should take care of",
    example: "Leadership begins with responsibility.",
    category: "Leadership"
  },
  {
    word: "Express",
    meaning: "To show or say your thoughts clearly",
    example: "Students learn to express their opinions.",
    category: "Communication"
  },
  {
    word: "Accurate",
    meaning: "Correct and without mistakes",
    example: "Use accurate grammar in formal writing.",
    category: "Grammar"
  },
  {
    word: "Participate",
    meaning: "To take part in an activity",
    example: "Everyone should participate in the discussion.",
    category: "Classroom"
  },
  {
    word: "Achievement",
    meaning: "Something successful that you have done",
    example: "Finishing your speech is a big achievement.",
    category: "Motivation"
  },
  {
    word: "Encourage",
    meaning: "To give support or confidence",
    example: "Teachers encourage students to speak bravely.",
    category: "Classroom"
  }
];

function shuffleArray<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildRound(size = 6) {
  const selectedPairs = shuffleArray(vocabularyBank).slice(0, size);
  const words = selectedPairs.map((pair, index) => ({
    id: `word-${index}-${pair.word}`,
    pairIndex: index,
    text: pair.word
  }));
  const meanings = selectedPairs.map((pair, index) => ({
    id: `meaning-${index}-${pair.word}`,
    pairIndex: index,
    text: pair.meaning
  }));

  return {
    pairs: selectedPairs,
    words: shuffleArray(words),
    meanings: shuffleArray(meanings)
  };
}

function getBadge(score: number) {
  if (score >= 900) return "Vocabulary Champion";
  if (score >= 650) return "Word Master";
  if (score >= 350) return "Meaning Matcher";
  return "Word Explorer";
}

export function VocabularyMatchGame() {
  const [roundData, setRoundData] = useState(() => buildRound());
  const [selectedWord, setSelectedWord] = useState<CardItem | null>(null);
  const [selectedMeaning, setSelectedMeaning] = useState<CardItem | null>(null);
  const [matchedPairIndexes, setMatchedPairIndexes] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(75);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState("Press Start Round, then match each word with its meaning.");
  const [showExamples, setShowExamples] = useState(false);
  const completed = matchedPairIndexes.length;
  const total = roundData.pairs.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;
  const accuracy = completed + mistakes ? Math.round((completed / (completed + mistakes)) * 100) : 100;
  const badge = getBadge(score);
  const visibleExamples = useMemo(
    () => roundData.pairs.filter((_, index) => matchedPairIndexes.includes(index)),
    [matchedPairIndexes, roundData.pairs]
  );

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0 || completed === total) return;
    const timeout = window.setTimeout(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [completed, isRunning, secondsLeft, total]);

  useEffect(() => {
    if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      setMessage("Time is up. Review the examples, then try a new round.");
    }
  }, [isRunning, secondsLeft]);

  useEffect(() => {
    if (!selectedWord || !selectedMeaning) return;

    if (selectedWord.pairIndex === selectedMeaning.pairIndex) {
      const speedBonus = Math.max(5, Math.round(secondsLeft / 5));
      const streakBonus = streak * 5;
      setMatchedPairIndexes((indexes) => [...indexes, selectedWord.pairIndex]);
      setScore((value) => value + 100 + speedBonus + streakBonus);
      setStreak((value) => value + 1);
      setMessage(`Correct: ${selectedWord.text}. ${roundData.pairs[selectedWord.pairIndex].example}`);
    } else {
      setMistakes((value) => value + 1);
      setStreak(0);
      setScore((value) => Math.max(0, value - 30));
      setMessage("Not a match yet. Try another meaning.");
    }

    window.setTimeout(() => {
      setSelectedWord(null);
      setSelectedMeaning(null);
    }, 450);
  }, [roundData.pairs, secondsLeft, selectedMeaning, selectedWord, streak]);

  useEffect(() => {
    if (completed === total && total > 0) {
      setIsRunning(false);
      setMessage("Round complete. Excellent vocabulary work.");
    }
  }, [completed, total]);

  function startRound() {
    setIsRunning(true);
    setMessage("Round started. Match the cards before time runs out.");
  }

  function resetRound(newWords = false) {
    setRoundData(newWords ? buildRound() : roundData);
    setSelectedWord(null);
    setSelectedMeaning(null);
    setMatchedPairIndexes([]);
    setMistakes(0);
    setScore(0);
    setStreak(0);
    setSecondsLeft(75);
    setIsRunning(false);
    setMessage(newWords ? "New word set loaded. Press Start Round." : "Round reset. Press Start Round.");
    setShowExamples(false);
  }

  function selectWord(card: CardItem) {
    if (!isRunning || matchedPairIndexes.includes(card.pairIndex)) return;
    setSelectedWord(card);
  }

  function selectMeaning(card: CardItem) {
    if (!isRunning || matchedPairIndexes.includes(card.pairIndex)) return;
    setSelectedMeaning(card);
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-200/50 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
            <Sparkles className="h-4 w-4" />
            Vocabulary Trainer
          </p>
          <h2 className="mt-5 font-heading text-3xl font-extrabold text-lead-navy">Match words with meanings</h2>
          <p className="mt-3 leading-7 text-lead-gray">
            Students race against the timer to connect vocabulary words with the correct meanings, then review example sentences.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat label="Progress" value={`${completed}/${total}`} />
            <Stat label="Timer" value={`${secondsLeft}s`} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Badge" value={badge} small />
          </div>

          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lead-yellow transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={startRound} disabled={isRunning || completed === total}>
              <Clock className="h-4 w-4" />
              Start Round
            </Button>
            <Button type="button" variant="secondary" onClick={() => resetRound(true)}>
              <Shuffle className="h-4 w-4" />
              Shuffle Words
            </Button>
            <Button type="button" variant="ghost" onClick={() => resetRound(false)}>
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-6">
        {completed === total ? (
          <div className="grid min-h-[460px] place-items-center text-center">
            <div>
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 motion-safe:animate-bounce">
                <Trophy className="h-10 w-10" />
              </div>
              <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Round Complete</p>
              <h2 className="mt-3 font-heading text-4xl font-extrabold text-lead-navy">Vocabulary unlocked.</h2>
              <p className="mx-auto mt-4 max-w-xl leading-7 text-lead-gray">
                Score: <span className="font-bold text-lead-navy">{score}</span>. Accuracy: <span className="font-bold text-lead-navy">{accuracy}%</span>. Badge: <span className="font-bold text-lead-navy">{badge}</span>.
              </p>
              <Button type="button" className="mt-7" onClick={() => resetRound(true)}>
                Play New Round
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-lead-blue">Round Board</p>
                <h2 className="mt-2 font-heading text-3xl font-extrabold text-lead-navy">Choose one word, then one meaning</h2>
              </div>
              <span className="w-fit rounded-lg bg-yellow-50 px-3 py-2 text-xs font-bold uppercase text-yellow-800">
                Score {score} / Streak {streak}
              </span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-heading text-xl font-bold text-lead-navy">Words</h3>
                <div className="mt-3 grid gap-3">
                  {roundData.words.map((card) => (
                    <MatchCard
                      key={card.id}
                      card={card}
                      selected={selectedWord?.id === card.id}
                      matched={matchedPairIndexes.includes(card.pairIndex)}
                      onClick={() => selectWord(card)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-heading text-xl font-bold text-lead-navy">Meanings</h3>
                <div className="mt-3 grid gap-3">
                  {roundData.meanings.map((card) => (
                    <MatchCard
                      key={card.id}
                      card={card}
                      selected={selectedMeaning?.id === card.id}
                      matched={matchedPairIndexes.includes(card.pairIndex)}
                      onClick={() => selectMeaning(card)}
                      long
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-lead-gray">
                {selectedWord && selectedMeaning && selectedWord.pairIndex === selectedMeaning.pairIndex ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : selectedWord && selectedMeaning ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                ) : (
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-yellow-700" />
                )}
                {message}
              </p>
              <Button type="button" variant="secondary" onClick={() => setShowExamples((value) => !value)}>
                {showExamples ? "Hide Examples" : "Show Examples"}
              </Button>
            </div>

            {showExamples ? (
              <div className="mt-5 grid gap-3">
                {(visibleExamples.length ? visibleExamples : roundData.pairs).map((pair) => (
                  <div key={pair.word} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-700">{pair.category}</p>
                    <p className="mt-2 font-heading text-lg font-extrabold text-lead-navy">{pair.word}</p>
                    <p className="mt-1 text-sm leading-6 text-lead-gray">{pair.example}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </section>
  );
}

function MatchCard({
  card,
  selected,
  matched,
  onClick,
  long = false
}: {
  card: CardItem;
  selected: boolean;
  matched: boolean;
  onClick: () => void;
  long?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={matched}
      onClick={onClick}
      className={`focus-ring rounded-2xl border p-4 text-left font-bold transition hover:-translate-y-0.5 hover:shadow-soft disabled:pointer-events-none ${
        matched
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 opacity-75"
          : selected
            ? "border-lead-blue bg-blue-50 text-lead-blue ring-4 ring-blue-100"
            : "border-slate-200 bg-white text-lead-navy hover:border-lead-blue"
      }`}
    >
      <span className={long ? "text-sm leading-6" : "font-heading text-lg"}>{card.text}</span>
      {matched ? <span className="mt-2 block text-xs font-extrabold uppercase">Matched</span> : null}
    </button>
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
