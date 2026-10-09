"use client";

const palette: Record<string, string> = { blue: "#2563eb", red: "#ef4444", green: "#22c55e", white: "#f8fafc", yellow: "#facc15", purple: "#a855f7" };
export type Garment = { word: string; color: string };

export function ClothingArt({ garment, className = "h-24 w-24" }: { garment: Garment; className?: string }) {
  const fill = palette[garment.color] || "#94a3b8"; const stroke = garment.color === "white" ? "#64748b" : "#fff";
  return <svg viewBox="0 0 120 120" role="img" aria-label={`${garment.color} ${garment.word}`} className={className}><g fill={fill} stroke={stroke} strokeWidth="4" strokeLinejoin="round">
    {garment.word === "shirt" ? <path d="M38 22 51 16h18l13 6 22 17-14 18-10-7v52H40V50l-10 7-14-18 22-17Z" /> : null}
    {garment.word === "dress" ? <><path d="M47 16h26l5 30 25 56H17l25-56 5-30Z" /><path d="M47 17c2 12 24 12 26 0" fill="none" /></> : null}
    {garment.word === "jacket" ? <><path d="M38 20 51 15h18l13 5 17 20-13 14-8-8v57H42V46l-8 8-13-14 17-20Z" /><path d="M60 20v83M47 54h9M64 54h9" fill="none" /></> : null}
    {garment.word === "jeans" ? <path d="M35 15h50l-4 88H62l-2-49-2 49H39l-4-88Z" /> : null}
    {garment.word === "shoes" ? <><path d="M13 65c19 0 20-25 32-25 8 18 12 24 20 30v19H13V65Z" /><path d="M61 70c17-3 18-25 30-25 6 16 9 20 17 26v18H61V70Z" /></> : null}
    {garment.word === "hat" ? <><path d="M35 68c0-33 10-48 28-48s28 15 28 48H35Z" /><path d="M14 68h92c0 16-92 16-92 0Z" /></> : null}
    {garment.word === "scarf" ? <><path d="M36 16h48v42H36V16Z" /><path d="M43 58h20v46H43V58Zm27 0h14v35H70V58Z" /></> : null}
    {garment.word === "socks" ? <><path d="M27 18h26v50c0 17-13 30-31 30H12V76h15V18Z" /><path d="M68 18h26v50c0 17-13 30-31 30H53V76h15V18Z" /></> : null}
  </g></svg>;
}

export function OutfitVisual({ garments, person = "student" }: { garments: Garment[]; person?: "girl" | "boy" | "student" }) {
  return <div className="flex flex-wrap items-center justify-center gap-3" role="img" aria-label={`${person} wearing ${garments.map((item) => `${item.color} ${item.word}`).join(", ")}`}><div className="mr-2 text-6xl" aria-hidden="true">{person === "girl" ? "👧" : person === "boy" ? "👦" : "🧑"}</div>{garments.map((garment) => <div key={`${garment.color}-${garment.word}`} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-md"><ClothingArt garment={garment} className="h-20 w-20 sm:h-24 sm:w-24" /></div>)}</div>;
}
