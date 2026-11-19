"use client";

import { useEffect, useRef, useState } from "react";

const rounds = [
  { prompt: "Collect the adjective for a place with very little noise.", options: ["crowded", "quiet", "bright"], answer: 1 },
  { prompt: "Collect the adjective for a place full of people.", options: ["crowded", "peaceful", "empty"], answer: 0 },
  { prompt: "Collect the adjective for a place with lots of light.", options: ["dark", "quiet", "bright"], answer: 2 },
  { prompt: "There ___ a tall tree.", options: ["are", "is", "because"], answer: 1 },
  { prompt: "There ___ two benches.", options: ["is", "because", "are"], answer: 2 },
  { prompt: "There ___ a colorful mural.", options: ["is", "are", "because"], answer: 0 },
];
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const wins = (board: string[], mark: string) => lines.some((line) => line.every((i) => board[i] === mark));
const reasons = [
  ["I like the park because", "I can play with my friends.", "there is two swings."],
  ["I like the library because", "it is quiet and I can read.", "because quiet."],
  ["I like the beach because", "I enjoy building sandcastles.", "there are a big wave."],
];
const action = "focus-ring rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950";

export function PlaceArcade({ onFinish }: { onFinish: () => void }) {
  const [mode, setMode] = useState(0);
  const [round, setRound] = useState(0);
  const [lane, setLane] = useState(1);
  const laneAtGate = useRef(lane);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [board, setBoard] = useState(Array<string>(9).fill(""));
  const [cell, setCell] = useState<number | null>(null);
  const [reason, setReason] = useState(0);
  const [feedback, setFeedback] = useState("");
  const challenge = rounds[round];
  const finished = wins(board, "X") || wins(board, "O") || board.every(Boolean);

  useEffect(() => { laneAtGate.current = lane; }, [lane]);

  useEffect(() => {
    if (!running || mode >= 2) return;
    const timer = window.setTimeout(() => {
      if (distance < 7) {
        setDistance(distance + 1);
        if (mode === 1 && distance % 2 === 1) {
          setLane((value) => Math.min(2, value + 1));
        }
        return;
      }
      const correct = laneAtGate.current === challenge.answer;
      setScore((value) => value + Number(correct));
      setFeedback(correct ? "Clue collected!" : `The correct clue was “${challenge.options[challenge.answer]}.”`);
      setRunning(false);
      setDistance(0);
      setRound(round + 1);
    }, mode === 0 ? 650 : 750);
    return () => window.clearTimeout(timer);
  }, [challenge, distance, mode, round, running]);

  useEffect(() => {
    if (!running || mode >= 2) return;
    function steer(event: KeyboardEvent) {
      const keys = mode === 0 ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown", " "];
      if (!keys.includes(event.key) || (event.key === " " && (event.target as HTMLElement | null)?.closest("button"))) return;
      event.preventDefault();
      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === " " ? -1 : 1;
      setLane((value) => Math.max(0, Math.min(2, value + direction)));
    }
    window.addEventListener("keydown", steer);
    return () => window.removeEventListener("keydown", steer);
  }, [mode, running]);

  function playTurn(correct: boolean) {
    if (cell === null) return;
    const next = [...board];
    if (correct) next[cell] = "X";
    if (!wins(next, "X")) {
      const empty = next.flatMap((mark, index) => mark ? [] : [index]);
      const tactical = (mark: string) => empty.find((index) => wins(next.map((value, i) => i === index ? mark : value), mark));
      const reply = tactical("O") ?? tactical("X") ?? [4, 0, 2, 6, 8, 1, 3, 5, 7].find((index) => !next[index]);
      if (reply !== undefined) next[reply] = "O";
    }
    setBoard(next);
    setCell(null);
    setReason(reason + 1);
    setFeedback(correct ? "You earned your square." : "Choose a complete reason after ‘because.’ The computer takes this turn.");
  }

  return <section className="mt-5 space-y-4 rounded-2xl border border-indigo-400 bg-slate-900 p-5">
    <h2 className="font-heading text-3xl font-bold">{["Word Runner", "Lantern Flight", "Reason Tic-Tac-Toe"][mode]}</h2>
    {mode < 2 ? <>
      <p>{mode === 0 ? "Switch lanes to run through the correct adjective." : "Your kite gradually sinks. Tap Climb or use the up arrow to stay lined up with the correct grammar gate."}</p>
      {round < (mode + 1) * 3 ? <>
        <p className="font-bold text-cyan-200">{challenge.prompt}</p>
        <div className={`relative overflow-hidden rounded-xl bg-indigo-950 p-3 ${mode === 0 ? "grid grid-cols-3 gap-2" : "space-y-2"}`}>
          {challenge.options.map((word, index) => <div key={word} className={`relative flex min-h-20 flex-col items-center justify-between gap-2 rounded-lg border p-2 text-center ${lane === index ? "border-cyan-300 bg-cyan-950" : "border-indigo-500 bg-slate-800"}`}>
            <strong>{word}</strong><span aria-hidden="true">{lane === index ? (mode === 0 ? "🏃" : "🪁") : "·"}</span>
          </div>)}
          <div aria-hidden="true" className="mt-2 h-2 w-full rounded bg-slate-700 col-span-full"><div className="h-full rounded bg-amber-300 transition-all" style={{ width: `${distance / 7 * 100}%` }} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!running ? <button className={action} onClick={() => { setLane(1); setRunning(true); setFeedback(""); }}>{mode === 0 ? "Start running" : "Launch kite"}</button> : <>
            <button className={action} onClick={() => setLane((value) => Math.max(0, value - 1))}>{mode === 0 ? "Move left" : "Climb"}</button>
            <button className={action} onClick={() => setLane((value) => Math.min(2, value + 1))}>{mode === 0 ? "Move right" : "Dive"}</button>
          </>}
        </div>
      </> : <button className={action} onClick={() => { setMode(mode + 1); setFeedback(""); }}>Next challenge</button>}
      <p>Arcade clues collected: {score} / 6</p>
    </> : <>
      <p>Pick a square and complete the sentence to claim it. Get three Xs in a row before the computer gets three Os.</p>
      <div className="grid max-w-xs grid-cols-3 gap-2">
        {board.map((mark, index) => <button key={index} aria-label={`Square ${index + 1}${mark ? `, ${mark}` : ""}`} aria-pressed={cell === index} disabled={Boolean(mark) || finished} onClick={() => setCell(index)} className={`focus-ring aspect-square rounded-xl border-2 text-3xl font-black ${cell === index ? "border-amber-300 bg-indigo-700" : "border-indigo-500 bg-indigo-950"}`}>{mark}</button>)}
      </div>
      {cell !== null && <div className="space-y-2"><p className="font-bold">{reasons[reason % reasons.length][0]}…</p>
        {(reason % 2 ? [2, 1] : [1, 2]).map((index) => <button className={`${action} mr-2`} key={index} onClick={() => playTurn(index === 1)}>{reasons[reason % reasons.length][index]}</button>)}
      </div>}
      {finished && <><p className="font-bold">{wins(board, "X") ? "You won!" : wins(board, "O") ? "The computer won this round." : "It’s a draw!"}</p><button className={action} onClick={onFinish}>Finish mission</button></>}
    </>}
    <p role="status" className="text-amber-200">{feedback}</p>
  </section>;
}
