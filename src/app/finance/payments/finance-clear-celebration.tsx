"use client";

import { useEffect, useState } from "react";

const confetti = [
  { symbol: "🪙", left: "5%", delay: "0s", size: "2.3rem" },
  { symbol: "✨", left: "14%", delay: ".45s", size: "2rem" },
  { symbol: "✓", left: "24%", delay: ".15s", size: "2.6rem" },
  { symbol: "🎉", left: "35%", delay: ".8s", size: "2.2rem" },
  { symbol: "🪙", left: "47%", delay: ".25s", size: "2.8rem" },
  { symbol: "✓", left: "59%", delay: ".65s", size: "2.5rem" },
  { symbol: "✨", left: "70%", delay: ".05s", size: "2.1rem" },
  { symbol: "🎉", left: "81%", delay: ".55s", size: "2.6rem" },
  { symbol: "🪙", left: "91%", delay: ".3s", size: "2.3rem" }
];

export function FinanceClearCelebration({
  employeeId,
  unpaidCount,
  receiptPendingCount
}: {
  employeeId: string;
  unpaidCount: number;
  receiptPendingCount: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const storageKey = `lead-finance-clear-queues:${employeeId}`;
    const previous = window.sessionStorage.getItem(storageKey);
    const previousCounts = previous ? previous.split(":").map(Number) : null;
    const allClear = unpaidCount === 0 && receiptPendingCount === 0;
    const hadPendingWork = previousCounts ? previousCounts[0] > 0 || previousCounts[1] > 0 : true;

    window.sessionStorage.setItem(storageKey, `${unpaidCount}:${receiptPendingCount}`);
    if (!allClear || !hadPendingWork) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 5000);
    return () => window.clearTimeout(timer);
  }, [employeeId, receiptPendingCount, unpaidCount]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-live="polite" role="status">
      <div className="absolute inset-0 animate-[finance-glow_5s_ease-in-out_forwards] bg-[radial-gradient(circle_at_center,rgba(254,240,138,.58),transparent_60%)]" />
      {confetti.map((piece, index) => (
        <span
          key={`${piece.symbol}-${index}`}
          className="absolute top-[-5rem] animate-[finance-confetti_4.2s_ease-in_forwards] font-black text-emerald-600 drop-shadow-lg"
          style={{ left: piece.left, animationDelay: piece.delay, fontSize: piece.size }}
          aria-hidden="true"
        >
          {piece.symbol}
        </span>
      ))}
      <div className="absolute left-1/2 top-1/2 w-[min(90vw,30rem)] -translate-x-1/2 -translate-y-1/2 animate-[finance-card_5s_ease-in-out_forwards] rounded-[2rem] border-4 border-yellow-300 bg-white/95 px-7 py-8 text-center shadow-2xl">
        <div className="text-5xl" aria-hidden="true">🪙 ✅ 🎉</div>
        <p className="mt-4 font-heading text-3xl font-extrabold text-lead-navy">Books balanced!</p>
        <p className="mt-2 text-base font-bold leading-6 text-emerald-700">No unpaid dues and no receipts pending. Finance is all clear—excellent work!</p>
      </div>
      <style jsx>{`
        @keyframes finance-confetti {
          0% { transform: translateY(0) rotate(-14deg) scale(.35); opacity: 0; }
          18% { opacity: 1; }
          75% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(190deg) scale(1.1); opacity: 0; }
        }
        @keyframes finance-card {
          0%, 100% { transform: translate(-50%, -50%) scale(.72); opacity: 0; }
          12%, 82% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes finance-glow {
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
