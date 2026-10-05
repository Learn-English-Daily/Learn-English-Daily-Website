"use client";

import { useEffect, useState } from "react";

const blossoms = [
  { flower: "🌸", left: "4%", delay: "0s", size: "2.4rem" },
  { flower: "🌼", left: "13%", delay: ".45s", size: "2rem" },
  { flower: "🌷", left: "23%", delay: ".15s", size: "2.8rem" },
  { flower: "🌺", left: "34%", delay: ".8s", size: "2.2rem" },
  { flower: "🌻", left: "47%", delay: ".25s", size: "3rem" },
  { flower: "🌸", left: "59%", delay: ".65s", size: "2.5rem" },
  { flower: "🌷", left: "70%", delay: ".05s", size: "2.2rem" },
  { flower: "🌼", left: "81%", delay: ".55s", size: "2.7rem" },
  { flower: "🌺", left: "91%", delay: ".3s", size: "2.3rem" }
];

export function FlowerCelebration({ teacherId, attendanceCount, journalCount }: { teacherId: string; attendanceCount: number; journalCount: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const storageKey = `lead-teacher-clear-queues:${teacherId}`;
    const previous = window.sessionStorage.getItem(storageKey);
    const previousCounts = previous ? previous.split(":").map(Number) : null;
    const allClear = attendanceCount === 0 && journalCount === 0;
    const wasWaiting = previousCounts ? previousCounts[0] > 0 || previousCounts[1] > 0 : true;

    window.sessionStorage.setItem(storageKey, `${attendanceCount}:${journalCount}`);
    if (!allClear || !wasWaiting) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [attendanceCount, journalCount, teacherId]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-live="polite" role="status">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,249,195,.5),transparent_58%)] animate-[flower-fade_5s_ease-in-out_forwards]" />
      {blossoms.map((blossom, index) => (
        <span
          key={`${blossom.flower}-${index}`}
          className="absolute bottom-[-5rem] animate-[flower-rise_4.2s_ease-out_forwards] drop-shadow-lg"
          style={{ left: blossom.left, animationDelay: blossom.delay, fontSize: blossom.size }}
          aria-hidden="true"
        >
          {blossom.flower}
        </span>
      ))}
      <div className="absolute left-1/2 top-1/2 w-[min(90vw,30rem)] -translate-x-1/2 -translate-y-1/2 animate-[flower-card_5s_ease-in-out_forwards] rounded-[2rem] border-4 border-white bg-white/95 px-7 py-8 text-center shadow-2xl">
        <div className="text-5xl" aria-hidden="true">🌸 🌼 🌷</div>
        <p className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Everything is blooming!</p>
        <p className="mt-2 text-base font-bold leading-6 text-emerald-700">All attendance and journals are complete. Beautiful work, Teacher!</p>
      </div>
      <style jsx>{`
        @keyframes flower-rise {
          0% { transform: translateY(0) rotate(-12deg) scale(.35); opacity: 0; }
          18% { opacity: 1; }
          72% { opacity: 1; }
          100% { transform: translateY(-105vh) rotate(22deg) scale(1.15); opacity: 0; }
        }
        @keyframes flower-card {
          0%, 100% { transform: translate(-50%, -50%) scale(.72); opacity: 0; }
          12%, 82% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes flower-fade {
          0%, 100% { opacity: 0; }
          12%, 82% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          span { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
