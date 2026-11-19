"use client";

import { useMemo, useState } from "react";
import { arcadeSound, speakArcade } from "./lead-arcade/audio";
import { playButton, type StageProps } from "./lost-postcards-arcade";

type Mystery = {
  name: string;
  icon: string;
  scene: string;
  environment: "indoor" | "outdoor";
  objects: string[];
  adjectives: string[];
  activities: string[];
  hints: string[];
};

const mysteries: Mystery[] = [
  { name: "Moonlight Library", icon: "🌙📚", scene: "from-indigo-300 to-blue-950", environment: "indoor", objects: ["books", "lamps", "windows"], adjectives: ["quiet", "peaceful", "magical"], activities: ["read", "study"], hints: ["Soft lamps glow after sunset.", "Rows of stories wait on tall shelves.", "Visitors whisper while they explore new worlds."] },
  { name: "Rainbow Garden", icon: "🌈🌷", scene: "from-sky-300 to-emerald-400", environment: "outdoor", objects: ["flowers", "butterflies", "fountain"], adjectives: ["colorful", "peaceful", "fragrant"], activities: ["walk", "take photos"], hints: ["Many colors grow close to the path.", "Tiny wings move between fragrant plants.", "Water sparkles at the center of this place."] },
  { name: "Whispering Beach", icon: "🌊🐚", scene: "from-cyan-300 to-blue-700", environment: "outdoor", objects: ["sand", "shells", "waves"], adjectives: ["breezy", "relaxing", "wide"], activities: ["swim", "build sandcastles"], hints: ["The ground feels soft beneath bare feet.", "A salty breeze carries a steady sound.", "Small treasures wash onto the shore."] },
  { name: "Skyline Café", icon: "☕🏙️", scene: "from-orange-300 to-fuchsia-700", environment: "indoor", objects: ["tables", "cakes", "city view"], adjectives: ["cozy", "busy", "warm"], activities: ["chat", "eat"], hints: ["Warm lights shine above small tables.", "The air smells sweet and delicious.", "Tall buildings can be seen through the windows."] },
  { name: "Cloudtop Camp", icon: "⛺⛰️", scene: "from-blue-300 to-violet-800", environment: "outdoor", objects: ["tent", "campfire", "mountains"], adjectives: ["cool", "adventurous", "quiet"], activities: ["hike", "camp"], hints: ["The air becomes cooler high above the town.", "A warm fire glows beside a temporary home.", "Visitors follow rocky trails during the day."] },
  { name: "Starlight Playground", icon: "⭐🛝", scene: "from-purple-300 to-indigo-900", environment: "outdoor", objects: ["slide", "swings", "climbing wall"], adjectives: ["lively", "exciting", "bright"], activities: ["play", "climb"], hints: ["Laughter and movement fill the open space.", "Some visitors fly forward and backward without leaving the ground.", "A twisting path leads quickly from high to low."] },
];

type Question = {
  id: string;
  foundation: string;
  confident: string[];
  fluent: string;
  answer: (place: Mystery) => string;
};

const questions: Question[] = [
  { id: "outside", foundation: "Is it outdoors?", confident: ["Is", "it", "an", "outdoor", "place", "?"], fluent: "Is this place mainly indoors or outdoors?", answer: (place) => place.environment === "outdoor" ? "Yes, it is outdoors." : "No, it is indoors." },
  { id: "water", foundation: "Is there water?", confident: ["Is", "there", "any", "water", "?"], fluent: "Does water form an important part of the scenery?", answer: (place) => place.objects.some((item) => ["waves", "fountain"].includes(item)) ? "Yes, water is part of the scenery." : "No, water is not an important feature." },
  { id: "books", foundation: "Are there books?", confident: ["Are", "there", "books", "to", "read", "?"], fluent: "Could visitors discover written stories here?", answer: (place) => place.objects.includes("books") ? "Yes, there are many books." : "No, this is not a place for books." },
  { id: "food", foundation: "Is there food?", confident: ["Can", "visitors", "eat", "food", "there", "?"], fluent: "Would people visit this place for something delicious?", answer: (place) => place.activities.includes("eat") ? "Yes, visitors can enjoy food here." : "No, food is not the main reason to visit." },
  { id: "play", foundation: "Can children play there?", confident: ["Can", "children", "play", "and", "climb", "there", "?"], fluent: "Does the place encourage energetic movement and play?", answer: (place) => place.activities.some((item) => ["play", "climb"].includes(item)) ? "Yes, it is made for active play." : "No, energetic play is not its main activity." },
  { id: "quiet", foundation: "Is it quiet?", confident: ["Is", "the", "place", "usually", "quiet", "?"], fluent: "Would its atmosphere help someone feel calm and reflective?", answer: (place) => place.adjectives.some((item) => ["quiet", "peaceful", "relaxing"].includes(item)) ? "Yes, its atmosphere can feel calm." : "No, it is usually more lively or busy." },
  { id: "view", foundation: "Are there tall buildings?", confident: ["Are", "tall", "buildings", "visible", "nearby", "?"], fluent: "Can visitors admire an urban skyline from this place?", answer: (place) => place.objects.includes("city view") ? "Yes, the city skyline is easy to see." : "No, an urban skyline is not part of the view." },
  { id: "mountain", foundation: "Are there mountains?", confident: ["Are", "there", "mountains", "and", "rocky", "trails", "?"], fluent: "Does the landscape invite visitors to explore at a high altitude?", answer: (place) => place.objects.includes("mountains") ? "Yes, mountains and trails surround it." : "No, it is not high in the mountains." },
];

const chip = "focus-ring rounded-xl border-2 border-blue-200 bg-white px-3 py-2 font-bold text-lead-navy shadow-sm hover:border-lead-blue disabled:opacity-45";

function pickMystery(previous = -1) {
  const offset = Math.floor(Math.random() * (mysteries.length - 1)) + 1;
  return (previous + offset + mysteries.length) % mysteries.length;
}

export function MysteryDetectiveMode({ level, paused, sound, hints: helpEnabled, finish }: StageProps) {
  const [mysteryIndex, setMysteryIndex] = useState(() => pickMystery());
  const mystery = mysteries[mysteryIndex];
  const limit = [6, 5, 5][level];
  const [asked, setAsked] = useState<string[]>([]);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState(0);
  const [finalGuessUsed, setFinalGuessUsed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const [built, setBuilt] = useState<string[]>([]);
  const [guessOpen, setGuessOpen] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [spoken, setSpoken] = useState(false);
  const [message, setMessage] = useState("Open your notebook and begin the investigation.");
  const remaining = Math.max(0, limit - asked.length - wrongGuesses);
  const available = questions.filter((question) => !asked.includes(question.id));
  const currentQuestion = available[selectedQuestion % Math.max(1, available.length)];
  const shuffledTiles = useMemo(() => currentQuestion ? [...currentQuestion.confident].sort((a, b) => (a.charCodeAt(0) * 7 + a.length) % 11 - (b.charCodeAt(0) * 7 + b.length) % 11) : [], [currentQuestion]);

  function ask(question: Question) {
    if (paused || solved || remaining <= 0 || asked.includes(question.id)) return;
    const prompt = level === 0 ? question.foundation : level === 1 ? question.confident.join(" ").replace(" ?", "?") : question.fluent;
    const answer = question.answer(mystery);
    setAsked((items) => [...items, question.id]);
    setAnswers((items) => [...items, { question: prompt, answer }]);
    setBuilt([]);
    setSelectedQuestion(0);
    setMessage("A new part of the mystery picture has appeared!");
    arcadeSound("correct", sound);
  }

  function guess(name: string) {
    if (paused || solved || (remaining <= 0 && finalGuessUsed)) return;
    if (name === mystery.name) {
      setSolved(true);
      setGuessOpen(false);
      setMessage(`Case solved: ${mystery.name}!`);
      arcadeSound("complete", sound);
    } else {
      setWrongGuesses((value) => value + 1);
      if (remaining <= 0) {
        setFinalGuessUsed(true);
        setMessage("That final guess did not fit the notebook. Start a new mystery and investigate with different questions.");
      } else setMessage("That location does not match every clue. One question has been used — check your notebook.");
      arcadeSound("wrong", sound);
    }
  }

  function replay() {
    setMysteryIndex((value) => pickMystery(value));
    setAsked([]);
    setAnswers([]);
    setWrongGuesses(0);
    setFinalGuessUsed(false);
    setSolved(false);
    setSelectedQuestion(0);
    setBuilt([]);
    setGuessOpen(false);
    setFinalText("");
    setSpoken(false);
    setMessage("A different mystery has been selected.");
  }

  const revealCount = Math.min(3, asked.length);
  const fluentReady = level < 2 || finalText.trim().split(/\s+/).filter(Boolean).length >= 18;
  const simpleReady = finalText.trim().toLowerCase().startsWith("i like this place because") && finalText.trim().split(/\s+/).filter(Boolean).length >= 7;
  const challengeReady = level === 2 ? fluentReady : simpleReady;

  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(17rem,.8fr)]">
      <section className="overflow-hidden rounded-3xl border-2 border-indigo-200 bg-indigo-950 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4"><p className="font-black">🕵️ Mystery Map</p><p className="rounded-full bg-white/15 px-3 py-1 font-bold">⭐ {Math.max(1, 3 - wrongGuesses)} · {remaining} questions left</p></div>
        <div className={`relative grid min-h-64 place-items-center bg-gradient-to-br ${mystery.scene} p-5`}>
          <div className={`grid h-36 w-48 place-items-center rounded-[45%_55%_40%_60%] bg-slate-950/80 text-7xl shadow-2xl transition ${solved ? "scale-105 bg-white/90" : "blur-[1px]"}`} aria-label={solved ? mystery.name : "Hidden mystery location"}>{solved ? mystery.icon : "❔"}</div>
          {!solved && <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">{mystery.hints.map((hint, index) => <div key={hint} className={`min-h-16 rounded-xl border border-white/40 p-2 text-sm font-semibold backdrop-blur transition-all ${index < revealCount || helpEnabled ? "translate-y-0 bg-white/90 text-lead-navy opacity-100" : "translate-y-2 bg-indigo-950/70 text-white/50 opacity-70"}`}>{index < revealCount || helpEnabled ? <>🔎 {hint}</> : "🔒 Collect another clue"}</div>)}</div>}
        </div>
        <div className="h-3 bg-indigo-900"><div className="h-full bg-yellow-400 transition-all" style={{ width: `${Math.min(100, (asked.length / limit) * 100)}%` }} /></div>
      </section>

      <aside className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-3"><span className="text-5xl">🕵🏽</span><div><p className="font-black">Detective LEA</p><p className="text-sm">Every answer comes from the secret location.</p></div></div>
        <h3 className="mt-4 font-black">Clue notebook</h3>
        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">{answers.length ? answers.map((item, index) => <div key={`${item.question}-${index}`} className="rounded-xl bg-white p-3 shadow-sm"><p className="text-sm font-bold text-lead-blue">{item.question}</p><p>{item.answer}</p><button className="mt-1 text-sm font-bold text-blue-700 disabled:opacity-40" disabled={!sound} onClick={() => speakArcade(`${item.question} ${item.answer}`, sound)}>Listen</button></div>) : <p className="rounded-xl bg-white p-3">Your collected answers will appear here.</p>}</div>
      </aside>
    </div>

    {!solved && remaining > 0 && <section className="rounded-2xl border border-blue-200 bg-white p-4">
      <h3 className="font-heading text-xl font-black">Ask question {asked.length + 1}</h3>
      {level === 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{available.slice(0, 6).map((question) => <button key={question.id} className={chip} disabled={paused} onClick={() => ask(question)}>{question.foundation}</button>)}</div>}
      {level === 1 && currentQuestion && <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-2">{available.map((question, index) => <button key={question.id} className={`${chip} ${currentQuestion.id === question.id ? "border-lead-blue bg-blue-50" : ""}`} disabled={paused} onClick={() => { setSelectedQuestion(index); setBuilt([]); }}>Clue topic: {question.id}</button>)}</div>
        <p className="min-h-12 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-3 font-bold">{built.join(" ") || "Build your question here…"}</p>
        <div className="flex flex-wrap gap-2">{shuffledTiles.map((word, index) => <button key={`${word}-${index}`} className={chip} disabled={paused || built.filter((item) => item === word).length >= shuffledTiles.filter((item) => item === word).length} onClick={() => setBuilt((items) => [...items, word])}>{word}</button>)}</div>
        <div className="flex gap-2"><button className={chip} disabled={paused || !built.length} onClick={() => setBuilt([])}>Clear</button><button className={playButton} disabled={paused || built.join(" ") !== currentQuestion.confident.join(" ")} onClick={() => ask(currentQuestion)}>Ask detective question</button></div>
      </div>}
      {level === 2 && <div className="mt-3 grid gap-2">{available.slice(0, 5).map((question) => <button key={question.id} className={`${chip} text-left`} disabled={paused} onClick={() => ask(question)}>🗣️ {question.fluent}</button>)}</div>}
      <div className="mt-4 flex flex-wrap gap-2"><button className={playButton} disabled={paused || asked.length < 1} onClick={() => setGuessOpen(!guessOpen)}>{guessOpen ? "Close location map" : "Guess the location"}</button>{sound && <button className={chip} disabled={paused || !currentQuestion} onClick={() => currentQuestion && speakArcade(level === 0 ? currentQuestion.foundation : level === 1 ? currentQuestion.confident.join(" ") : currentQuestion.fluent, sound)}>Say question aloud</button>}</div>
      {guessOpen && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{mysteries.map((place) => <button key={place.name} className={chip} disabled={paused} onClick={() => guess(place.name)}><span className="block text-3xl">🗺️</span>{place.name}</button>)}</div>}
    </section>}

    {!solved && remaining === 0 && <section className="space-y-3 rounded-2xl bg-amber-100 p-4"><p className="font-black">{finalGuessUsed ? "Case paused — that final guess did not match." : "Your question cards are finished, but the case is still open."}</p><p>{finalGuessUsed ? "Start a different mystery and use your questions strategically." : "Study the notebook and make one final guess, or start a different mystery."}</p>{!finalGuessUsed && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{mysteries.map((place) => <button key={place.name} className={chip} onClick={() => guess(place.name)}>{place.name}</button>)}</div>}<button className={chip} onClick={replay}>New mystery</button></section>}

    {solved && <section className="space-y-3 rounded-3xl border-2 border-yellow-400 bg-yellow-50 p-5">
      <h3 className="font-heading text-2xl font-black">🎉 Case solved: {mystery.name}</h3>
      <p className="rounded-xl bg-white p-3 font-bold text-lead-blue">Final step · Complete one language challenge to finish this stage. You only need to solve one mystery.</p>
      <p>{mystery.hints.join(" ")}</p>
      <label className="grid gap-2 font-bold">{level === 2 ? "Write a detailed description (at least 18 words). Explain the atmosphere and why this place could be meaningful." : "Complete the final challenge: I like this place because…"}<textarea className="focus-ring min-h-28 rounded-xl border border-blue-200 bg-white p-3 font-normal" value={finalText} onChange={(event) => setFinalText(event.target.value)} placeholder="I like this place because…" /></label>
      {level < 2 && !finalText.trim().toLowerCase().startsWith("i like this place because") && <button className={chip} disabled={paused} onClick={() => setFinalText("I like this place because ")}>Use sentence starter</button>}
      {level < 2 && <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={spoken} onChange={(event) => setSpoken(event.target.checked)} /> I also said my sentence aloud (optional).</label>}
      <p className={`text-sm font-bold ${challengeReady ? "text-emerald-700" : "text-amber-800"}`}>{level === 2 ? `${finalText.trim().split(/\s+/).filter(Boolean).length}/18 words ${challengeReady ? "· Ready to finish!" : "· Keep writing."}` : challengeReady ? "Sentence ready · You can finish the stage." : "Write at least seven words beginning with “I like this place because…”"}</p>
      <div className="flex flex-wrap gap-2"><button className={playButton} disabled={paused} onClick={() => {
        if (!challengeReady) {
          setMessage(level === 2 ? "Write at least 18 words before finishing." : "Finish a seven-word sentence beginning with “I like this place because…”");
          return;
        }
        finish(Math.max(1, 3 - Number(wrongGuesses > 0) - Number(remaining === 0)));
      }}>Finish stage · Submit sentence</button><button className={chip} disabled={paused} onClick={replay}>Optional: solve another mystery</button></div>
    </section>}
    <p role="status" className="font-bold text-blue-800">{message}</p>
  </div>;
}

