"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { arcadeSound } from "./lead-arcade/audio";
import { PlaceRush, SkyIslands, playButton } from "./lost-postcards-arcade";
import { Detective, DreamBuilder, MysteryPortal, checklist } from "./lost-postcards-scenes";
import { levels, rush, stages } from "./lost-postcards-content";

const controls = "focus-ring inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 font-bold text-lead-navy hover:bg-blue-50";
const phases = ["Discover", "Play", "Build", "Speak", "Master"];

export function MysteryPlace() {
  const shell = useRef<HTMLElement>(null);
  const [name, setName] = useState("");
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(-1);
  const [revision, setRevision] = useState(0);
  const [sound, setSound] = useState(true);
  const [paused, setPaused] = useState(false);
  const [hints, setHints] = useState(false);
  const [practice, setPractice] = useState(false);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [review, setReview] = useState<boolean[]>([false, false, false, false]);
  const [notice, setNotice] = useState("");
  const [stamped, setStamped] = useState(false);
  const total = scores.reduce((sum, value) => sum + value, 0);

  function open(index: number) {
    setActive(index);
    setRevision((value) => value + 1);
    setPaused(false);
    setStamped(false);
  }

  function finish(stars: number) {
    setScores((previous) => previous.map((score, index) => index === active ? Math.max(score, stars) : score));
    setStamped(true);
    arcadeSound("complete", sound);
    if (active === 4 && (practice || scores.slice(0, 4).every(Boolean))) setActive(5);
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.current?.requestFullscreen) await shell.current.requestFullscreen();
      else setNotice("Fullscreen is unavailable in this browser.");
    } catch {
      setNotice("Fullscreen couldn’t open. You can keep playing here.");
    }
  }

  const stageProps = { level, paused, sound, hints, finish };
  return <section ref={shell} className="min-h-full overflow-auto rounded-[2rem] border border-blue-200 bg-gradient-to-br from-white via-sky-50 to-yellow-100 p-4 text-lead-navy shadow-soft sm:p-7">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Image src="/images/brand-icon-cropped.png" width={56} height={56} alt="LEAD logo" className="rounded-xl object-contain" />
        <div><p className="font-black text-lead-blue">LEAD · Learn English Daily</p><p className="text-sm font-semibold">Speak English with Confidence</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={controls} aria-pressed={sound} onClick={() => { if (sound) window.speechSynthesis?.cancel(); setSound(!sound); }}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />} Sound {sound ? "on" : "off"}</button>
        <button className={controls} onClick={() => void fullscreen()}><Maximize size={18} /> Fullscreen</button>
      </div>
    </header>
    {notice && <p role="status" className="mt-2">{notice}</p>}
    <div className="my-5 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-100 via-white to-yellow-200 p-5 sm:p-7">
      <p className="font-bold text-lead-blue">Lesson 30 · My Favorite Place</p>
      <h1 className="mt-1 font-heading text-3xl font-black sm:text-5xl">Mystery Place: The Lost Postcards</h1>
      <p className="mt-2 text-lg font-bold">Explore. Discover. Describe.</p>
    </div>
    {active < 0 ? <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (name.trim()) open(0); }}>
      <p className="text-lg">Five magical postcards have lost their destinations! Explore beautiful places, follow the clues, and restore the lost postcards.</p>
      <div className="flex flex-wrap gap-3">
        <label className="grid gap-1 font-bold">Student name<input value={name} maxLength={40} required onChange={(event) => setName(event.target.value)} className="focus-ring rounded-xl border border-blue-200 bg-white px-4 py-3" /></label>
        <label className="grid gap-1 font-bold">Course level<select className="focus-ring rounded-xl border border-blue-200 bg-white px-4 py-3" value={level} onChange={(event) => setLevel(Number(event.target.value))}>{levels.map((label, index) => <option value={index} key={label}>{label}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={practice} onChange={(event) => setPractice(event.target.checked)} /> Teacher practice mode · choose any stage</label>
      <details className="rounded-xl bg-white p-3"><summary className="cursor-pointer font-bold">How to play</summary><p className="mt-2">Steer with arrows or A/D, jump with Space or Up, and swipe or use the touch buttons. Collect five fragments and earn up to 15 stars. Pause, replay a stage, or turn on hints when needed.</p></details>
      <button className={playButton} disabled={!name.trim()}>Start Adventure</button>
      <p>0 of 5 postcards restored · 0 / 15 stars</p>
    </form> : <>
      <div className="mb-4 flex flex-wrap justify-between gap-2 font-bold"><span>{name.trim()} · {levels[level]}</span><span>{scores.filter(Boolean).length}/5 fragments · ⭐ {total}/15 stars</span></div>
      <nav aria-label="Adventure stages" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stages.map((title, index) => <button key={title} className={`${controls} flex-col items-start disabled:opacity-45 ${active === index ? "ring-2 ring-lead-blue" : ""}`} aria-current={active === index ? "step" : undefined} disabled={!practice && index > 0 && !scores[index - 1]} onClick={() => open(index)}><span className="text-sm text-lead-blue">{phases[index]} {scores[index] ? `· ${scores[index]}★` : ""}</span>{title}</button>)}
      </nav>
      {active < 5 && <div className="rounded-2xl border border-blue-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-2xl font-black">{stages[active]}</h2><div className="flex flex-wrap gap-2">
          <button className={controls} onClick={() => { if (!paused) window.speechSynthesis?.cancel(); setPaused(!paused); }}>{paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Resume" : "Pause"}</button>
          <button className={controls} aria-pressed={hints} onClick={() => setHints(!hints)}>Hints {hints ? "on" : "off"}</button>
          <button className={controls} onClick={() => open(active)}>Retry stage</button>
        </div></div>
        {paused && <p role="status" className="mb-3 rounded-lg bg-yellow-100 p-2 font-bold">Paused</p>}
        {stamped ? <div className="space-y-3 rounded-2xl bg-yellow-100 p-5"><p className="text-xl font-black">💌 Fragment restored · {scores[active]} / 3 stars</p><button className={playButton} onClick={() => open(active + 1)}>{active === 4 ? "See results" : "Next stage"}</button></div> : <div key={revision}>
          {active === 0 && <PlaceRush {...stageProps} />}
          {active === 1 && <Detective {...stageProps} />}
          {active === 2 && <SkyIslands {...stageProps} />}
          {active === 3 && <DreamBuilder {...stageProps} review={review} onReview={setReview} />}
          {active === 4 && <MysteryPortal {...stageProps} />}
        </div>}
      </div>}
      {active === 5 && <div className="space-y-4 rounded-3xl border-2 border-yellow-400 bg-gradient-to-br from-white to-yellow-100 p-5">
        <h2 className="font-heading text-3xl font-black">💌 {scores.every(Boolean) ? "The postcards are restored!" : "Practice adventure complete!"}</h2>
        <p>{name.trim()} · {levels[level]} · {total}/15 stars</p>
        <ul>{stages.map((stage, index) => <li key={stage}>{stage} · {scores[index]}/3 stars</li>)}</ul>
        <p><strong>Vocabulary to review:</strong> {rush.map((task) => task.word).join(", ")}.</p>
        <p><strong>Sentence patterns:</strong> There is… · There are… · I like… because…</p>
        <p><strong>Teacher speaking checklist:</strong> {checklist.filter((_, i) => review[i]).join(", ") || "No teacher feedback recorded."}</p>
        <button className={playButton} onClick={() => { setScores([0, 0, 0, 0, 0]); setReview([false, false, false, false]); open(-1); }}>Replay adventure</button>
      </div>}
    </>}
  </section>;
}
