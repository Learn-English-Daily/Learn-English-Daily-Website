"use client";

import { useEffect, useMemo, useState } from "react";
import { arcadeSound, speakArcade } from "../lead-arcade/audio";
import { daysInMonth, formatGameDate, months, nextWeekdayInMonth, ordinal, weekdayFor, weekdays } from "./calendar-data";
import type { CalendarStageProps } from "./calendar-types";

const primary = "focus-ring rounded-xl bg-blue-700 px-4 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-600 disabled:opacity-40";
const secondary = "focus-ring rounded-xl border-2 border-blue-200 bg-white px-3 py-2 font-black text-slate-900 shadow-sm hover:border-blue-500 disabled:opacity-40";

type PlannerEvent = { id: number; day: number; type: string; icon: string };
const eventTypes = [
  { type: "Birthday", icon: "🎂" },
  { type: "English Class", icon: "📘" },
  { type: "School Event", icon: "🎉" },
  { type: "Appointment", icon: "🩺" }
];

export function EventPlanner({ level, sound, activeDate, onComplete }: CalendarStageProps) {
  const year = activeDate.getFullYear();
  const month = activeDate.getMonth();
  const activeDay = Math.min(activeDate.getDate(), daysInMonth(year, month));
  const friday = nextWeekdayInMonth(year, month, 5, activeDay);
  const tuesday = nextWeekdayInMonth(year, month, 2, activeDay);
  const thursday = nextWeekdayInMonth(year, month, 4, tuesday);
  const missions = [
    { type: "Birthday", day: 12, text: `Plan a birthday on ${months[month]} ${ordinal(12)}.` },
    { type: "English Class", day: friday, text: `Schedule English class on ${weekdayFor(year, month, friday)}, ${months[month]} ${ordinal(friday)}.` },
    { type: "School Event", day: Math.min(20, daysInMonth(year, month)), text: `Add the school event on ${months[month]} ${ordinal(Math.min(20, daysInMonth(year, month)))}.` },
    { type: "Appointment", day: tuesday, text: `Add an appointment on ${weekdayFor(year, month, tuesday)}, then move it to ${weekdayFor(year, month, thursday)}.` }
  ];
  const required = level === 0 ? 3 : 4;
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [editorDay, setEditorDay] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [moved, setMoved] = useState(false);
  const [practice, setPractice] = useState(false);
  const [timer, setTimer] = useState(30);
  const [timerRunning, setTimerRunning] = useState(false);
  const [message, setMessage] = useState("Select a date to open the event editor.");
  const firstWeekday = new Date(year, month, 1, 12).getDay();
  const totalDays = daysInMonth(year, month);
  const cells = Array.from({ length: firstWeekday + totalDays }, (_, index) => index < firstWeekday ? 0 : index - firstWeekday + 1);
  while (cells.length % 7) cells.push(0);

  useEffect(() => {
    if (!timerRunning || timer <= 0) return;
    const tick = window.setTimeout(() => setTimer((value) => value - 1), 1000);
    return () => window.clearTimeout(tick);
  }, [timer, timerRunning]);

  function add(type: string, icon: string) {
    if (!editorDay) return;
    const mission = missions.find((item) => item.type === type);
    if (!mission || editorDay !== mission.day) {
      setMessage(`${type} belongs on ${mission ? `${months[month]} ${ordinal(mission.day)}` : "another date"}. Check the mission card.`);
      arcadeSound("wrong", sound); return;
    }
    setEvents((items) => [...items.filter((item) => item.type !== type), { id: Date.now(), day: editorDay, type, icon }]);
    setMessage(`${type} added correctly!`); setEditorDay(null); arcadeSound("correct", sound);
  }

  function moveSelected() {
    if (!selectedId || !editorDay) return;
    const selected = events.find((item) => item.id === selectedId);
    if (selected?.type !== "Appointment" || editorDay !== thursday) {
      setMessage(`Move the appointment to ${weekdayFor(year, month, thursday)}, ${months[month]} ${ordinal(thursday)}.`); arcadeSound("wrong", sound); return;
    }
    setEvents((items) => items.map((item) => item.id === selectedId ? { ...item, day: thursday } : item));
    setMoved(true); setSelectedId(null); setEditorDay(null); setMessage("Appointment rescheduled successfully!"); arcadeSound("power", sound);
  }

  const scheduledTypes = new Set(events.map((event) => event.type));
  const calendarDone = missions.slice(0, required).every((mission) => scheduledTypes.has(mission.type)) && (level === 0 || moved);
  const prompt = level === 0 ? `My birthday is on ${months[month]} 12th. English class is on ${weekdayFor(year, month, friday)}.` : level === 1 ? `My English class is on ${months[month]} ${ordinal(friday)}. The appointment moved from ${weekdayFor(year, month, tuesday)} to ${weekdayFor(year, month, thursday)}.` : `Describe which events are upcoming, explain the schedule change, and use on, in, before, or after correctly.`;

  return <section className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
      <div className="overflow-hidden rounded-3xl border-4 border-blue-200 bg-white shadow-xl">
        <div className="flex items-center justify-between bg-blue-800 p-4 text-white"><div><p className="text-xs font-black uppercase tracking-widest">My Event Planner</p><h3 className="text-2xl font-black">{months[month]} {year}</h3></div><div className="rounded-xl bg-yellow-300 px-3 py-2 font-black text-slate-950">Active date: {ordinal(activeDay)}</div></div>
        <div className="grid grid-cols-7 bg-blue-50 text-center text-xs font-black uppercase text-blue-800">{weekdays.map((day) => <div key={day} className="p-2">{day.slice(0, 3)}</div>)}</div>
        <div className="grid grid-cols-7">{cells.map((day, index) => <button key={index} disabled={!day} onClick={() => setEditorDay(day || null)} className={`focus-ring min-h-24 border border-slate-100 p-1 text-left align-top transition hover:bg-yellow-50 ${day === activeDay ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : "bg-white"}`}><span className="text-sm font-black text-slate-700">{day || ""}</span>{events.filter((event) => event.day === day).map((event) => <span key={event.id} onClick={(click) => { click.stopPropagation(); setSelectedId(event.id); setMessage(`Selected ${event.type}. Now choose its new date.`); }} className={`mt-1 block truncate rounded-md px-1 py-1 text-[10px] font-black ${selectedId === event.id ? "bg-yellow-300 ring-2 ring-blue-600" : "bg-blue-100 text-blue-900"}`}>{event.icon} {event.type}</span>)}</button>)}</div>
      </div>
      <aside className="space-y-3 rounded-3xl bg-blue-950 p-4 text-white">
        <h3 className="font-heading text-xl font-black text-yellow-300">Mission Board</h3>
        {missions.slice(0, required).map((mission, index) => { const done = scheduledTypes.has(mission.type) && (mission.type !== "Appointment" || moved); return <div key={mission.type} className={`rounded-xl p-3 text-sm font-bold ${done ? "bg-emerald-500 text-white" : "bg-white/10"}`}><span>{done ? "✓" : index + 1} · </span>{mission.text}{mission.type === "Appointment" && scheduledTypes.has("Appointment") && !moved ? <span className="mt-1 block text-yellow-300">Tap the appointment, then tap its Thursday destination.</span> : null}</div>; })}
        <p className="text-sm text-blue-100">Grammar radar: <strong>on</strong> Monday · <strong>on</strong> May 12th · <strong>in</strong> October</p>
      </aside>
    </div>
    {editorDay && <div className="rounded-2xl border-2 border-yellow-300 bg-yellow-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black">{weekdayFor(year, month, editorDay)}, {months[month]} {ordinal(editorDay)}</p><button className={secondary} onClick={() => setEditorDay(null)}>Close editor</button></div>{selectedId ? <button className={`${primary} mt-3`} onClick={moveSelected}>Move selected event here</button> : <div className="mt-3 grid grid-cols-2 gap-2">{eventTypes.slice(0, required).map((event) => <button key={event.type} className={secondary} onClick={() => add(event.type, event.icon)}>{event.icon} Add {event.type}</button>)}</div>}</div>}
    {calendarDone && <div className="space-y-3 rounded-3xl border-4 border-yellow-300 bg-white p-5"><p className="text-xs font-black uppercase tracking-widest text-blue-700">Speaking studio · Self-reported practice</p><h3 className="font-heading text-2xl font-black">Tell Wisey about your calendar</h3><p className="rounded-xl bg-blue-50 p-3 font-bold">{prompt}</p><div className="flex flex-wrap gap-2"><button className={secondary} onClick={() => speakArcade(prompt, sound)}>🔊 Repeat prompt</button><button className={secondary} onClick={() => { setTimer(30); setTimerRunning((value) => !value); }}>{timerRunning ? `Practising… ${timer}s` : "Start 30-second timer"}</button></div><label className="flex items-start gap-2 font-bold"><input type="checkbox" checked={practice} onChange={(event) => setPractice(event.target.checked)} className="mt-1" /> I completed the speaking practice. This confirmation is self-reported; pronunciation was not automatically assessed.</label><button className={primary} disabled={!practice} onClick={() => onComplete({ stars: events.length >= required && moved === (level > 0) ? 3 : 2, score: 900 + events.length * 100, correct: required, attempts: required, bestCombo: required, practiced: [prompt] })}>Finish event planner</button></div>}
    <p role="status" className="font-bold text-blue-800">{message}</p>
  </section>;
}

export function CalendarChaos({ level, sound, activeDate, onComplete }: CalendarStageProps) {
  const [round, setRound] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [dial, setDial] = useState(activeDate.getMonth());
  const [built, setBuilt] = useState<string[]>([]);
  const [message, setMessage] = useState("The clock tower is unstable. Repair each mechanism!");
  const tomorrow = weekdays[(activeDate.getDay() + 1) % 7];
  const targetMonth = (activeDate.getMonth() + (level === 2 ? 11 : 1)) % 12;
  const ordinalTarget = [21, 22, 23][level];
  const sentence = level === 0 ? ["It's", "on", "Monday."] : level === 1 ? ["The", "event", "is", "next", "Friday."] : ["The", "appointment", "moved", "from", "Tuesday", "to", "Thursday."];
  const scrambled = useMemo(() => [...sentence].sort((a, b) => (a.length * 7 + a.charCodeAt(0)) - (b.length * 7 + b.charCodeAt(0))), [sentence.join("|")]);
  const bossStart = Math.min(24, daysInMonth(activeDate.getFullYear(), activeDate.getMonth()) - 6);
  const missing = bossStart + 3;
  const bossDays = Array.from({ length: 7 }, (_, index) => bossStart + index);

  function fail(text: string) { setAttempts((value) => value + 1); setEnergy((value) => Math.max(0, value - 1)); setMessage(text); arcadeSound("wrong", sound); }
  function win(text: string) {
    setAttempts((value) => value + 1); setCorrect((value) => value + 1); setEnergy(3); setMessage(text); arcadeSound("power", sound);
    window.setTimeout(() => {
      if (round === 4) onComplete({ stars: correct + 1 >= 5 ? 3 : correct + 1 >= 3 ? 2 : 1, score: (correct + 1) * 350 + energy * 50, correct: correct + 1, attempts: attempts + 1, bestCombo: correct + 1 });
      else { setRound((value) => value + 1); setBuilt([]); }
    }, 700);
  }

  function chooseSentence(word: string) {
    if (word !== sentence[built.length]) { setBuilt([]); fail("The sentence gears slipped. Rebuild from the beginning."); return; }
    const next = [...built, word]; setBuilt(next); arcadeSound("correct", sound);
    if (next.length === sentence.length) win("Schedule sentence repaired!");
  }

  return <section className="space-y-4">
    <div className="overflow-hidden rounded-3xl border-4 border-yellow-300 bg-gradient-to-br from-indigo-950 via-blue-900 to-purple-900 p-5 text-white shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.2em] text-yellow-300">Calendar Chaos · Repair {round + 1}/5</p><h3 className="mt-1 font-heading text-3xl font-black">Clock Tower Control Room</h3></div><p className="rounded-full bg-white/10 px-4 py-2 text-xl">{"💛".repeat(energy)}{"🖤".repeat(3 - energy)}</p></div>
      <div className="relative mt-5 min-h-[25rem] overflow-hidden rounded-3xl border border-white/20 bg-[radial-gradient(circle_at_center,#1d4ed8_0,#172554_60%)] p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 animate-spin rounded-full border-[18px] border-dashed border-yellow-300/40 [animation-duration:8s]" /><div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 animate-spin rounded-full border-[14px] border-dotted border-cyan-300/30 [animation-duration:5s]" />
        {round === 0 && <div className="relative z-10 text-center"><p className="text-xl font-black">Today is {weekdays[activeDate.getDay()]}. Catch tomorrow&apos;s weekday!</p><div className="mt-14 flex flex-wrap justify-center gap-4">{[weekdays[(activeDate.getDay() + 6) % 7], tomorrow, weekdays[(activeDate.getDay() + 2) % 7]].map((day, index) => <button key={day} onClick={() => day === tomorrow ? win("Weekday gear restored!") : fail("That day does not come tomorrow. Try another orbit!")} className="animate-bounce rounded-full border-4 border-white bg-cyan-300 px-6 py-8 font-black text-blue-950 shadow-xl" style={{ animationDelay: `${index * 160}ms` }}>{day}</button>)}</div></div>}
        {round === 1 && <div className="relative z-10 text-center"><p className="text-xl font-black">Rotate to the month {level === 2 ? "before" : "after"} {months[activeDate.getMonth()]}.</p><div className="mx-auto mt-8 grid h-52 w-52 place-items-center rounded-full border-[18px] border-dashed border-yellow-300 bg-blue-950 shadow-2xl"><span className="text-2xl font-black">{months[dial]}</span></div><div className="mt-5 flex justify-center gap-3"><button className={secondary} onClick={() => setDial((value) => (value + 11) % 12)}>Rotate back</button><button className={primary} onClick={() => dial === targetMonth ? win("Month wheel aligned!") : fail("The month wheel is not aligned yet.")}>Lock month</button><button className={secondary} onClick={() => setDial((value) => (value + 1) % 12)}>Rotate forward</button></div></div>}
        {round === 2 && <div className="relative z-10 text-center"><p className="text-xl font-black">Forge the correct ordinal for {ordinalTarget}.</p><div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">{[`${ordinalTarget}th`, `${ordinalTarget}st`, `${ordinalTarget}nd`, `${ordinalTarget}rd`].filter((value, index, list) => list.indexOf(value) === index).map((value) => <button key={value} onClick={() => value === ordinal(ordinalTarget) ? win("Ordinal crystal charged!") : fail("That suffix does not fit this number.")} className="rounded-2xl border-4 border-white bg-fuchsia-300 p-6 text-3xl font-black text-purple-950 shadow-xl hover:scale-110">{value}</button>)}</div></div>}
        {round === 3 && <div className="relative z-10"><p className="text-center text-xl font-black">Feed the schedule blocks into the clock in order.</p><div className="mt-5 min-h-20 rounded-2xl border-2 border-dashed border-cyan-300 bg-white/10 p-4 text-center text-xl font-black">{built.join(" ") || "The sentence appears here…"}</div><div className="mt-8 flex flex-wrap justify-center gap-3">{scrambled.map((word, index) => <button key={`${word}-${index}`} disabled={built.filter((item) => item === word).length >= sentence.filter((item) => item === word).length} onClick={() => chooseSentence(word)} className="rounded-xl border-b-8 border-amber-800 bg-yellow-300 px-5 py-4 font-black text-slate-950 disabled:opacity-20">{word}</button>)}</div></div>}
        {round === 4 && <div className="relative z-10 text-center"><p className="text-xl font-black">FINAL BOSS · Restore the missing date and unlock the Time Crystal!</p><p className="mt-2 text-cyan-100">{months[activeDate.getMonth()]} {activeDate.getFullYear()} · every date advances by one day</p><div className="mt-8 grid grid-cols-7 gap-2">{bossDays.map((day) => <div key={day} className={`grid aspect-square place-items-center rounded-xl border-4 text-lg font-black sm:text-2xl ${day === missing ? "animate-pulse border-yellow-300 bg-purple-950" : "border-white bg-white text-blue-950"}`}>{day === missing ? "?" : ordinal(day)}</div>)}</div><div className="mt-8 flex justify-center gap-3">{[missing - 1, missing, missing + 2].map((day) => <button key={day} onClick={() => day === missing ? win("Time Crystal restored — Calendar Quest complete!") : fail("That date breaks the calendar sequence.")} className="rounded-full border-4 border-white bg-yellow-300 px-7 py-5 text-2xl font-black text-slate-950 shadow-xl hover:scale-110">{ordinal(day)}</button>)}</div></div>}
      </div>
    </div>
    <p role="status" className="font-bold text-blue-800">{message}</p>
  </section>;
}

