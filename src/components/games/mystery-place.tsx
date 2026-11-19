"use client";

import { useEffect, useState } from "react";

const cases = [
  { answer: "Library", icon: "📚", clues: ["There is a quiet reading corner.", "There are tall shelves full of books.", "I like it because I can borrow stories."], blanks: ["There ___ a quiet reading corner.", "There ___ tall shelves full of books.", "I like it ___ I can borrow stories."] },
  { answer: "Beach", icon: "🏖️", clues: ["There are colorful shells in the sand.", "There is a bright blue sea.", "I like it because I can build sandcastles."], blanks: ["There ___ colorful shells in the sand.", "There ___ a bright blue sea.", "I like it ___ I can build sandcastles."] },
  { answer: "Night market", icon: "🏮", clues: ["There is a busy food stall.", "There are bright lanterns above the street.", "I like it because I can try tasty snacks."], blanks: ["There ___ a busy food stall.", "There ___ bright lanterns above the street.", "I like it ___ I can try tasty snacks."] },
];
const map = [
  ".......",
  ".#.#.#.",
  "..A....",
  ".##.##.",
  "....B..",
  ".#.#.#.",
  "..C...E",
];
const patrols = [[0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1], [28, 29, 30, 31, 32, 33, 34, 33, 32, 31, 30, 29], [6, 13, 20, 27, 34, 41, 48, 41, 34, 27, 20, 13]];
const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowRight: [1, 0] };
const controlLabels = ["Up", "Left", "Down", "Right"];
const button = "focus-ring rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 hover:bg-cyan-100 disabled:opacity-50";

export function MysteryPlace() {
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(0);
  const [position, setPosition] = useState(7);
  const [turn, setTurn] = useState(0);
  const [hits, setHits] = useState(0);
  const [collected, setCollected] = useState<number[]>([]);
  const [clue, setClue] = useState<number | null>(null);
  const [stage, setStage] = useState<"hunt" | "guess" | "speak" | "done">("hunt");
  const [message, setMessage] = useState("");
  const [tier, setTier] = useState(0);
  const [spoken, setSpoken] = useState(false);
  const current = cases[level];
  const patrol = patrols[level];
  const hazard = patrol[turn % patrol.length];
  const nextHazard = patrol[(turn + 1) % patrol.length];

  function move(key: string) {
    if (!started || stage !== "hunt" || clue !== null) return;
    const [dx, dy] = moves[key];
    const x = position % 7 + dx;
    const y = Math.floor(position / 7) + dy;
    const tile = map[y]?.[x];
    if (!tile || tile === "#") return;
    const target = y * 7 + x;
    setTurn(turn + 1);
    if (target === hazard || target === nextHazard) {
      setHits(hits + 1);
      setPosition(7);
      setMessage("The guard spotted you! You’re back at base. Your clues are safe.");
      return;
    }
    setPosition(target);
    setMessage("");
    const index = "ABC".indexOf(tile);
    if (index !== -1 && !collected.includes(index)) setClue(index);
    if (tile === "E") {
      if (collected.length === 3) setStage("guess");
      else setMessage("Collect all three clues before opening the exit.");
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!started || stage !== "hunt" || clue !== null || !Object.hasOwn(moves, event.key)) return;
      if ((event.target as HTMLElement | null)?.matches("input, textarea, select")) return;
      event.preventDefault();
      move(event.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function openCase(index: number) {
    setLevel(index);
    setPosition(7);
    setTurn(0);
    setCollected([]);
    setClue(null);
    setMessage("");
    setSpoken(false);
    setStage("hunt");
  }

  return <section className="py-6">
    <p className="font-bold text-cyan-300">LEAD · Meeting 30 · My Favorite Place</p>
    <h1 className="mb-5 font-heading text-4xl font-extrabold sm:text-6xl">Mystery Place</h1>
    {!started ? <form className="max-w-md space-y-4 rounded-2xl bg-slate-900 p-6" onSubmit={(event) => { event.preventDefault(); if (name.trim()) { setName(name.trim()); setStarted(true); } }}>
      <p>Outsmart the patrol, recover three English clues, and reveal the mystery place.</p>
      <label className="block font-bold">Detective name<input required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-slate-500 bg-slate-950 p-3" /></label>
      <button className={button} disabled={!name.trim()}>Start the hunt</button>
    </form> : <>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 font-bold text-cyan-200"><span>Detective {name}</span><span>Case {level + 1} / {cases.length}</span><span>Spotted {hits} times</span></div>
      <div className="grid gap-5 md:grid-cols-[1.15fr_1fr]">
        <div>
          <div aria-label="Clue hunt board" className="grid grid-cols-7 gap-1 rounded-2xl border border-indigo-400 bg-indigo-950 p-2">
            {map.flatMap((row, y) => [...row].map((tile, x) => {
              const index = y * 7 + x;
              const clueIndex = "ABC".indexOf(tile);
              const symbol = index === position ? "🕵️" : index === hazard ? "🤖" : tile === "E" ? "🚪" : clueIndex >= 0 && !collected.includes(clueIndex) ? "🔎" : "";
              return <div key={index} className={`grid aspect-square place-items-center rounded-md text-lg sm:text-3xl ${tile === "#" ? "bg-indigo-700" : index === nextHazard ? "bg-amber-800 ring-1 ring-amber-300" : "bg-slate-800"}`}>{symbol}</div>;
            }))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Movement controls">
            {Object.keys(moves).map((key, index) => <button key={key} type="button" className={button} disabled={clue !== null || stage !== "hunt"} onClick={() => move(key)}>{controlLabels[index]}</button>)}
          </div>
          <p className="mt-3 text-slate-300">Use the arrow keys or movement buttons. The amber tile shows the guard’s next step.</p>
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-xl font-bold">Clue notebook · {collected.length}/3</h2>
          {collected.map((index) => <p key={index} className="rounded-lg bg-slate-800 p-3">{current.clues[index]}</p>)}
          {clue !== null && <div className="space-y-3"><h3 className="font-bold">{current.blanks[clue]}</h3><div className="flex flex-wrap gap-2">
            {(clue === 2 ? ["but", "because", "or"] : ["is", "are"]).map((word) => <button key={word} className={button} onClick={() => {
              const correct = current.clues[clue].split(" ")[clue === 2 ? 3 : 1];
              if (word !== correct) {
                setMessage(clue === 2 ? "Choose the word that introduces a reason." : "Use ‘is’ for one thing and ‘are’ for more than one.");
                return;
              }
              setCollected([...collected, clue]); setClue(null); setMessage("Clue recovered!");
            }}>{word}</button>)}
          </div></div>}
          {stage === "hunt" && clue === null && <p>{collected.length === 3 ? "Head to the exit to solve the case." : "Find a magnifying glass and complete its sentence."}</p>}
          {stage === "guess" && <><h3 className="font-bold">Which place fits all the clues?</h3><div className="flex flex-wrap gap-2">{cases.map((item) => <button key={item.answer} className={button} onClick={() => {
            if (item.answer === current.answer) { setStage("speak"); setMessage(""); }
            else setMessage("Read all three clues again. Which place fits every clue?");
          }}>{item.icon} {item.answer}</button>)}</div></>}
          {stage === "speak" && <><h3 className="text-xl font-bold">{current.icon} Case solved! Your turn to speak.</h3>
            <div className="flex flex-wrap gap-2">{["Foundation", "Confident", "Fluent"].map((label, index) => <button key={label} aria-pressed={tier === index} onClick={() => { setTier(index); setSpoken(false); }} className={`rounded-lg px-3 py-2 font-bold ${tier === index ? "bg-cyan-300 text-slate-950" : "bg-slate-800"}`}>{label}</button>)}</div>
            <p>{["Say your favorite place and describe one thing you can see there. Try: ‘My favorite place is… There is a quiet…’", "Describe two things at your favorite place and explain why you like it. Try: ‘There are… I like it because…’", "Describe what your favorite place looks and sounds like. Share a memory there and explain why the place matters to you."][tier]}</p>
            <label className="flex items-start gap-2"><input className="mt-1 h-5 w-5" type="checkbox" checked={spoken} onChange={(event) => setSpoken(event.target.checked)} />I said my answer aloud.</label>
            <button className={button} disabled={!spoken} onClick={() => level < cases.length - 1 ? openCase(level + 1) : setStage("done")}>{level < cases.length - 1 ? "Next case" : "Finish mission"}</button>
          </>}
          {stage === "done" && <><h3 className="text-xl font-bold">All three cases solved, {name}!</h3><p>Try again and see if you can finish with fewer patrol encounters.</p><button className={button} onClick={() => { setHits(0); openCase(0); }}>Play again</button></>}
          <p role="status" className="text-amber-200">{message}</p>
        </div>
      </div>
    </>}
  </section>;
}
