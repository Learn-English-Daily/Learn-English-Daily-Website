"use client";

import { useRef, useState, type PointerEvent } from "react";
import { Minus, Plus } from "lucide-react";

type Hand = "hour" | "minute";

export type ClockTime = { hour: number; minute: number };

type Props = ClockTime & {
  onChange?: (time: ClockTime) => void;
  interactive?: boolean;
  compact?: boolean;
  showControls?: boolean;
};

const normalizeHour = (hour: number) => ((hour - 1 + 12) % 12) + 1;

export function InteractiveClock({ hour, minute, onChange, interactive = true, compact = false, showControls = true }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<Hand | null>(null);
  const minuteAngle = minute * 6;
  const hourAngle = (hour % 12) * 30 + minute * 0.5;

  function updateFromPointer(event: PointerEvent<SVGElement>, hand: Hand) {
    const svg = svgRef.current;
    if (!svg || !onChange) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 360 - 180;
    const y = ((event.clientY - rect.top) / rect.height) * 360 - 180;
    const degrees = (Math.atan2(y, x) * 180) / Math.PI + 90;
    const angle = (degrees + 360) % 360;
    if (hand === "minute") {
      const nextMinute = (Math.round(angle / 30) * 5) % 60;
      onChange({ hour, minute: nextMinute });
    } else {
      const nextHour = normalizeHour(Math.round((angle - minute * 0.5) / 30) || 12);
      onChange({ hour: nextHour, minute });
    }
  }

  function startDrag(event: PointerEvent<SVGElement>, hand: Hand) {
    if (!interactive) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(hand);
    updateFromPointer(event, hand);
  }

  function adjustHour(delta: number) {
    onChange?.({ hour: normalizeHour(hour + delta), minute });
  }

  function adjustMinute(delta: number) {
    let next = minute + delta;
    let nextHour = hour;
    if (next >= 60) { next -= 60; nextHour = normalizeHour(hour + 1); }
    if (next < 0) { next += 60; nextHour = normalizeHour(hour - 1); }
    onChange?.({ hour: nextHour, minute: next });
  }

  return (
    <div className="mx-auto w-full max-w-[430px] select-none">
      <svg ref={svgRef} viewBox="0 0 360 360" className={`mx-auto block w-full touch-none drop-shadow-xl ${compact ? "max-w-[190px]" : "max-w-[430px]"}`} aria-label={`Analog clock showing ${hour}:${String(minute).padStart(2, "0")}`}>
        <defs>
          <radialGradient id="clockFace" cx="40%" cy="32%"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#eff6ff" /></radialGradient>
        </defs>
        <circle cx="180" cy="180" r="170" fill="#0f172a" />
        <circle cx="180" cy="180" r="158" fill="url(#clockFace)" stroke="#facc15" strokeWidth="5" />
        {Array.from({ length: 60 }, (_, index) => {
          const angle = index * 6;
          const major = index % 5 === 0;
          return <line key={index} x1="180" y1={major ? 29 : 34} x2="180" y2={major ? 43 : 40} stroke={major ? "#2563eb" : "#94a3b8"} strokeWidth={major ? 4 : 2} transform={`rotate(${angle} 180 180)`} />;
        })}
        {Array.from({ length: 12 }, (_, index) => {
          const number = index + 1;
          const angle = (number * 30 - 90) * Math.PI / 180;
          return <text key={number} x={180 + Math.cos(angle) * 123} y={187 + Math.sin(angle) * 123} textAnchor="middle" className="fill-slate-900 text-[25px] font-black">{number}</text>;
        })}
        <g transform={`rotate(${hourAngle} 180 180)`} onPointerDown={(event) => startDrag(event, "hour")} onPointerMove={(event) => dragging === "hour" && updateFromPointer(event, "hour")} onPointerUp={() => setDragging(null)} className={interactive ? "cursor-grab" : ""}>
          <line x1="180" y1="190" x2="180" y2="102" stroke="transparent" strokeWidth="28" />
          <line x1="180" y1="190" x2="180" y2="102" stroke="#0f172a" strokeWidth="13" strokeLinecap="round" />
        </g>
        <g transform={`rotate(${minuteAngle} 180 180)`} onPointerDown={(event) => startDrag(event, "minute")} onPointerMove={(event) => dragging === "minute" && updateFromPointer(event, "minute")} onPointerUp={() => setDragging(null)} className={interactive ? "cursor-grab" : ""}>
          <line x1="180" y1="196" x2="180" y2="64" stroke="transparent" strokeWidth="28" />
          <line x1="180" y1="196" x2="180" y2="64" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
          <circle cx="180" cy="64" r="8" fill="#2563eb" />
        </g>
        <circle cx="180" cy="180" r="13" fill="#facc15" stroke="#0f172a" strokeWidth="5" />
      </svg>
      {interactive && showControls && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-100 p-2 text-center"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Short hand · hour</p><div className="flex items-center justify-center gap-2"><button type="button" onClick={() => adjustHour(-1)} className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm" aria-label="Previous hour"><Minus className="h-4 w-4" /></button><strong className="w-8 text-xl">{hour}</strong><button type="button" onClick={() => adjustHour(1)} className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm" aria-label="Next hour"><Plus className="h-4 w-4" /></button></div></div>
          <div className="rounded-2xl bg-blue-50 p-2 text-center"><p className="mb-1 text-xs font-bold uppercase tracking-wide text-blue-600">Long hand · minute</p><div className="flex items-center justify-center gap-2"><button type="button" onClick={() => adjustMinute(-5)} className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm" aria-label="Move back five minutes"><Minus className="h-4 w-4" /></button><strong className="w-8 text-xl">{String(minute).padStart(2, "0")}</strong><button type="button" onClick={() => adjustMinute(5)} className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm" aria-label="Move forward five minutes"><Plus className="h-4 w-4" /></button></div></div>
        </div>
      )}
    </div>
  );
}
