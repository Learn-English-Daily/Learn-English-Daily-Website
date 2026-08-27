"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, MapPinned, RotateCcw, Star, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type PlaceId = "home" | "park" | "market" | "hospital" | "school" | "library" | "bank" | "restaurant" | "bus" | "supermarket";
type Place = { id: PlaceId; name: string; emoji: string; color: string; x: number; y: number };
type LevelProps = { award: (stars: number) => void; finish: () => void };

const places: Place[] = [
  { id: "home", name: "Home", emoji: "🏠", color: "bg-orange-100 border-orange-300", x: 8, y: 72 },
  { id: "school", name: "School", emoji: "🏫", color: "bg-yellow-100 border-yellow-300", x: 8, y: 8 },
  { id: "park", name: "Park", emoji: "🌳", color: "bg-emerald-100 border-emerald-300", x: 31, y: 8 },
  { id: "library", name: "Library", emoji: "📚", color: "bg-violet-100 border-violet-300", x: 56, y: 8 },
  { id: "hospital", name: "Hospital", emoji: "🏥", color: "bg-rose-100 border-rose-300", x: 80, y: 8 },
  { id: "market", name: "Market", emoji: "🛒", color: "bg-amber-100 border-amber-300", x: 31, y: 72 },
  { id: "bank", name: "Bank", emoji: "🏦", color: "bg-sky-100 border-sky-300", x: 56, y: 72 },
  { id: "restaurant", name: "Restaurant", emoji: "🍽️", color: "bg-red-100 border-red-300", x: 80, y: 72 },
  { id: "bus", name: "Bus Station", emoji: "🚌", color: "bg-cyan-100 border-cyan-300", x: 8, y: 40 },
  { id: "supermarket", name: "Supermarket", emoji: "🛍️", color: "bg-fuchsia-100 border-fuchsia-300", x: 80, y: 40 }
];
const corePlaces: PlaceId[] = ["market", "park", "hospital"];
const levelNames = ["Explore", "Morning Mission", "Park Day", "Help a Friend", "City Delivery", "Build a Route", "Give Directions", "City Roleplay", "Sentence Builder", "A Day in My City"];
const levelIcons = ["🗺️", "🛒", "🌳", "🏥", "🚲", "🚶", "🧭", "🎭", "🧩", "🏆"];

function sentenceFor(id: PlaceId) {
  const place = places.find((item) => item.id === id);
  return `I go to the ${place?.name.toLowerCase()}.`;
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.78;
  window.speechSynthesis.speak(utterance);
}

export function PublicPlacesAdventure() {
  const reduceMotion = useReducedMotion();
  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(0);
  const [stars, setStars] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [celebrating, setCelebrating] = useState(false);
  const [discovered, setDiscovered] = useState<PlaceId[]>([]);
  const results = level >= levelNames.length;

  function award(value: number) { setStars((current) => current + value); }
  function discover(id: PlaceId) { setDiscovered((current) => current.includes(id) ? current : [...current, id]); }
  function finish() {
    if (celebrating) return;
    setCelebrating(true);
    setCompleted((current) => [...current, level]);
    window.setTimeout(() => { setLevel((current) => current + 1); setCelebrating(false); }, 950);
  }
  function reset() { setStarted(false); setLevel(0); setStars(0); setCompleted([]); setDiscovered([]); setCelebrating(false); }

  if (!started) return (
    <Card className="relative overflow-hidden border-0 bg-[linear-gradient(145deg,#075985,#2563eb)] p-6 text-white shadow-soft sm:p-10">
      <div className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-yellow-300/20" />
      <motion.div animate={reduceMotion ? {} : { y: [0, -8, 0] }} transition={{ duration: 2.4, repeat: Infinity }} className="relative flex items-center gap-4">
        <Image src="/images/brand-icon-cropped.png" alt="Wisey the Owl" width={92} height={92} className="rounded-2xl bg-white/95 p-2" />
        <span className="text-7xl">🗺️</span>
      </motion.div>
      <p className="relative mt-6 font-bold uppercase tracking-[0.18em] text-yellow-300">LEAD · Speak English with Confidence</p>
      <h2 className="relative mt-3 font-heading text-4xl font-extrabold sm:text-5xl">Welcome to My City Adventure!</h2>
      <p className="relative mt-4 max-w-2xl text-lg leading-8 text-blue-50">Wisey says: Good morning! We have things to do today. Let&apos;s explore the city, meet people, and use English along the way.</p>
      <Button onClick={() => setStarted(true)} className="relative mt-7 bg-yellow-400 text-slate-950 hover:bg-yellow-300">Start Exploring <MapPinned className="h-4 w-4" /></Button>
    </Card>
  );

  if (results) return <Results stars={stars} discovered={discovered} reset={reset} />;

  return (
    <div className="grid gap-5">
      <Progress level={level} stars={stars} completed={completed} />
      <Card className="relative overflow-hidden p-4 sm:p-7">
        <AnimatePresence>{celebrating ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 grid place-items-center bg-white/95 p-5 text-center backdrop-blur"><motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }}><div className="text-7xl">⭐</div><h2 className="mt-3 font-heading text-3xl font-extrabold text-lead-navy">Mission complete!</h2><p className="mt-2 font-semibold text-lead-gray">A new part of the city is opening.</p></motion.div></motion.div> : null}</AnimatePresence>
        {level === 0 && <ExploreLevel award={award} finish={finish} discover={discover} />}
        {level === 1 && <MorningMission award={award} finish={finish} discover={discover} />}
        {level === 2 && <ParkDay award={award} finish={finish} discover={discover} />}
        {level === 3 && <HospitalMission award={award} finish={finish} discover={discover} />}
        {level === 4 && <DeliveryGame award={award} finish={finish} discover={discover} />}
        {level === 5 && <RoutePlanner award={award} finish={finish} />}
        {level === 6 && <DirectionGame award={award} finish={finish} />}
        {level === 7 && <RoleplayScene award={award} finish={finish} />}
        {level === 8 && <SentenceBuilder award={award} finish={finish} />}
        {level === 9 && <FinalDay award={award} finish={finish} discover={discover} />}
      </Card>
    </div>
  );
}

function Progress({ level, stars, completed }: { level: number; stars: number; completed: number[] }) {
  return <Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Mission {level + 1} of 10</p><h2 className="font-heading text-xl font-extrabold text-lead-navy">{levelNames[level]}</h2></div><span className="rounded-full bg-yellow-50 px-4 py-2 font-bold text-yellow-800">⭐ {stars}</span></div><div className="mt-4 flex gap-1">{levelIcons.map((icon, index) => <div key={icon} className={`grid h-8 flex-1 place-items-center rounded-md text-sm ${completed.includes(index) ? "bg-emerald-500 text-white" : index === level ? "bg-yellow-300 ring-2 ring-yellow-100" : "bg-slate-100 grayscale"}`}>{completed.includes(index) ? "✓" : icon}</div>)}</div></Card>;
}

function Guide({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mb-5 flex items-start gap-3 rounded-2xl bg-sky-50 p-4"><Image src="/images/brand-icon-cropped.png" alt="Wisey" width={46} height={46} className="rounded-xl bg-white p-1" /><div><h3 className="font-heading text-lg font-extrabold text-lead-navy">{title}</h3><div className="mt-1 text-sm leading-6 text-lead-gray">{children}</div></div></div>;
}

function CityMap({ onVisit, active, discovered = [], targets = [], character = "🚶", compact = false }: { onVisit?: (id: PlaceId) => void; active?: PlaceId; discovered?: PlaceId[]; targets?: PlaceId[]; character?: string; compact?: boolean }) {
  return <div className={`relative mx-auto w-full overflow-hidden rounded-3xl border-4 border-sky-100 bg-[#dff3d8] shadow-inner ${compact ? "aspect-[16/10] max-w-3xl" : "aspect-[16/11] max-w-5xl"}`}>
    <div className="absolute left-0 right-0 top-[31%] h-[13%] bg-slate-300"><div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-white" /></div>
    <div className="absolute bottom-[23%] left-0 right-0 h-[13%] bg-slate-300"><div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-white" /></div>
    <div className="absolute bottom-0 left-[22%] top-0 w-[9%] bg-slate-300"><div className="absolute bottom-0 left-1/2 top-0 border-l-2 border-dashed border-white" /></div>
    <div className="absolute bottom-0 left-[70%] top-0 w-[9%] bg-slate-300"><div className="absolute bottom-0 left-1/2 top-0 border-l-2 border-dashed border-white" /></div>
    <motion.span animate={{ x: [0, 120, 250, 120, 0] }} transition={{ repeat: Infinity, duration: 10 }} className="absolute left-[28%] top-[35%] z-10 text-xl sm:text-3xl">🚗</motion.span>
    <motion.span animate={{ x: [0, -100, -220, -100, 0] }} transition={{ repeat: Infinity, duration: 13 }} className="absolute bottom-[25%] right-[10%] z-10 text-xl sm:text-3xl">🚌</motion.span>
    {places.map((place) => <motion.button key={place.id} type="button" onClick={() => onVisit?.(place.id)} whileTap={{ scale: 0.92 }} animate={active === place.id ? { scale: [1, 1.12, 1] } : {}} style={{ left: `${place.x}%`, top: `${place.y}%` }} className={`absolute z-20 w-[13%] min-w-12 -translate-y-1/2 rounded-xl border-2 p-1 text-center shadow-sm transition sm:p-2 ${place.color} ${targets.includes(place.id) ? "ring-4 ring-yellow-300" : ""}`} aria-label={`Visit ${place.name}`}><span className="block text-xl sm:text-3xl">{place.emoji}</span><span className="hidden text-[9px] font-black uppercase text-lead-navy sm:block">{place.name}</span>{discovered.includes(place.id) ? <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] text-white">✓</span> : null}</motion.button>)}
    {active ? <motion.div key={active} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} style={{ left: `${(places.find((place) => place.id === active)?.x || 8) + 5}%`, top: `${(places.find((place) => place.id === active)?.y || 72) - 9}%` }} className="absolute z-30 text-2xl sm:text-4xl">{character}</motion.div> : null}
    <div className="absolute bottom-1 left-1 rounded-lg bg-white/90 px-2 py-1 text-[9px] font-bold text-sky-800 sm:text-xs">Tap a building to travel</div>
  </div>;
}

function PlaceArrival({ id }: { id: PlaceId }) {
  const place = places.find((item) => item.id === id)!;
  return <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><div><p className="font-heading text-xl font-extrabold text-lead-navy">{place.emoji} {place.name}</p><p className="mt-1 font-semibold text-lead-blue">{sentenceFor(id)}</p></div><Button size="sm" variant="secondary" onClick={() => speak(`${place.name}. ${sentenceFor(id)}`)}><Volume2 className="h-4 w-4" />Listen</Button></motion.div>;
}

function ExploreLevel({ award, finish, discover }: LevelProps & { discover: (id: PlaceId) => void }) {
  const [found, setFound] = useState<PlaceId[]>([]); const [active, setActive] = useState<PlaceId>();
  function visit(id: PlaceId) { setActive(id); if (!found.includes(id)) { setFound((current) => [...current, id]); discover(id); award(1); speak(`${places.find((place) => place.id === id)?.name}. ${sentenceFor(id)}`); } }
  const publicPlaces = places.filter((place) => place.id !== "home");
  const ready = publicPlaces.every((place) => found.includes(place.id));
  return <><Guide title="Explore the city">Travel freely and discover all nine public places. Market, park, and hospital are today&apos;s most important stops.</Guide><CityMap onVisit={visit} active={active} discovered={found} targets={corePlaces} />{active ? <PlaceArrival id={active} /> : null}<div className="mt-4 flex justify-end"><Button disabled={!ready} onClick={finish}>{ready ? "City explored!" : `${found.filter((id) => id !== "home").length} / 9 places discovered`}<ArrowRight className="h-4 w-4" /></Button></div></>;
}

function MorningMission({ award, finish, discover }: LevelProps & { discover: (id: PlaceId) => void }) {
  const [arrived, setArrived] = useState(false); const [selected, setSelected] = useState(""); const [basket, setBasket] = useState<string[]>([]);
  function visit(id: PlaceId) { if (id === "market") { setArrived(true); discover(id); award(1); speak("Welcome to the market!"); } }
  function add(item: string) { if (item !== "apples") { setSelected(""); return; } setBasket(["apples"]); award(2); speak("I go to the market. I need apples."); window.setTimeout(finish, 850); }
  return <><Guide title="Morning mission">You need to buy some apples. Start at home and travel to the correct place.</Guide>{!arrived ? <CityMap onVisit={visit} active="home" targets={["market"]} compact /> : <div className="rounded-3xl bg-amber-50 p-5 text-center"><h3 className="font-heading text-2xl font-extrabold text-lead-navy">Welcome to the market!</h3><div onClick={() => selected && add(selected)} className="mx-auto mt-5 grid min-h-28 max-w-md place-items-center rounded-2xl border-4 border-dashed border-amber-300 bg-white text-5xl">🧺<span className="text-xs font-bold text-amber-800">Tap an item, then tap the basket</span>{basket.includes("apples") ? <span>🍎</span> : null}</div><div className="mt-5 flex justify-center gap-4">{[["apples","🍎","Apples"],["bananas","🍌","Bananas"],["milk","🥛","Milk"]].map(([id,emoji,label]) => <motion.button drag dragSnapToOrigin onDragEnd={(_, info) => info.offset.y < -40 && add(id)} key={id} onClick={() => setSelected(id)} className={`touch-none rounded-2xl border-2 bg-white p-4 shadow-sm ${selected === id ? "border-lead-blue ring-4 ring-blue-100" : "border-slate-200"}`}><span className="text-5xl">{emoji}</span><span className="mt-1 block text-xs font-bold">{label}</span></motion.button>)}</div></div>}</>;
}

function ParkDay({ award, finish, discover }: LevelProps & { discover: (id: PlaceId) => void }) {
  const [arrived, setArrived] = useState(false); const [played, setPlayed] = useState<string[]>([]);
  function visit(id: PlaceId) { if (id === "park") { setArrived(true); discover(id); award(1); } }
  function play(id: string, sentence: string) { if (played.includes(id)) return; const next = [...played, id]; setPlayed(next); award(1); speak(sentence); if (next.length === 3) window.setTimeout(finish, 700); }
  return <><Guide title="Park day">Your friend is waiting at the park. Find the park, then enjoy three activities together.</Guide>{!arrived ? <CityMap onVisit={visit} active="home" targets={["park"]} compact /> : <div className="rounded-3xl bg-emerald-50 p-5"><div className="text-center text-6xl">🧒 🌳 🧒</div><p className="mt-2 text-center font-bold text-emerald-800">I go to the park. I play with my friend.</p><div className="mt-5 grid grid-cols-3 gap-3">{[["ball","⚽","Play football","I play football in the park."],["bench","🪑","Sit down","I sit on the bench."],["slide","🛝","Play on slide","I play in the park."]].map(([id,emoji,label,sentence]) => <motion.button whileTap={{ scale: .92 }} key={id} onClick={() => play(id,sentence)} className={`rounded-2xl border-2 p-4 text-center ${played.includes(id) ? "border-emerald-400 bg-emerald-100" : "border-white bg-white"}`}><span className="text-5xl">{emoji}</span><span className="mt-2 block text-xs font-bold text-lead-navy">{played.includes(id) ? "Done ✓" : label}</span></motion.button>)}</div></div>}</>;
}

function HospitalMission({ award, finish, discover }: LevelProps & { discover: (id: PlaceId) => void }) {
  const [arrived, setArrived] = useState(false); const [selected, setSelected] = useState(""); const [helped, setHelped] = useState<string[]>([]);
  const tools = [["stethoscope","🩺","Listen"],["bandage","🩹","Bandage"],["medicine","💊","Medicine"]];
  function visit(id: PlaceId) { if (id === "hospital") { setArrived(true); discover(id); award(1); speak("I go to the hospital. Can you help me?"); } }
  function useTool(id: string) { if (!selected || selected !== id || helped.includes(id)) return; const next=[...helped,id];setHelped(next);setSelected("");award(1);speak(`${tools.find((tool)=>tool[0]===id)?.[2]}. Great helping!`);if(next.length===3)window.setTimeout(finish,700); }
  return <><Guide title="Help a friend">Oh no! Your friend is not feeling well. Find the hospital and help the friendly doctor.</Guide>{!arrived ? <CityMap onVisit={visit} active="home" targets={["hospital"]} compact /> : <div className="grid gap-5 rounded-3xl bg-rose-50 p-5 md:grid-cols-[1fr_1.3fr]"><div className="text-center"><div className="text-7xl">👩‍⚕️</div><p className="mt-2 font-bold text-lead-navy">Choose a tool</p><div className="mt-3 flex justify-center gap-2">{tools.map(([id,emoji,label])=><button key={id} onClick={()=>setSelected(id)} className={`rounded-xl border-2 bg-white p-3 ${selected===id?"border-lead-blue ring-4 ring-blue-100":"border-slate-200"}`}><span className="text-3xl">{emoji}</span><span className="block text-[10px] font-bold">{label}</span></button>)}</div></div><div className="grid gap-2">{tools.map(([id,emoji,label])=><button key={id} onClick={()=>useTool(id)} className={`rounded-2xl border-2 border-dashed p-4 text-left font-bold ${helped.includes(id)?"border-emerald-400 bg-emerald-50 text-emerald-700":"border-rose-200 bg-white text-lead-navy"}`}>{helped.includes(id)?"✓ Helped":`${emoji} ${label} area`}</button>)}</div></div>}</>;
}

function DeliveryGame({ award, finish, discover }: LevelProps & { discover: (id: PlaceId) => void }) {
  const deliveries = [{ id:"books",emoji:"📚",place:"library" as PlaceId },{ id:"food",emoji:"🍎",place:"market" as PlaceId },{ id:"letter",emoji:"💌",place:"bank" as PlaceId }];
  const [selected,setSelected]=useState("");const [done,setDone]=useState<string[]>([]);const [message,setMessage]=useState("Choose a package, then tap its destination on the map.");
  function deliver(place:PlaceId){if(!selected)return;const item=deliveries.find((entry)=>entry.id===selected)!;if(item.place!==place){setMessage("Almost! Check the picture on the package and try another building.");return;}const next=[...done,item.id];setDone(next);discover(place);award(2);speak(`You went to the ${places.find((entry)=>entry.id===place)?.name}.`);setMessage(`Delivered! ${sentenceFor(place)}`);setSelected("");if(next.length===3)window.setTimeout(finish,850);}
  return <><Guide title="City delivery">{message}</Guide><div className="mb-4 flex justify-center gap-3">{deliveries.map((item)=><motion.button drag dragSnapToOrigin key={item.id} disabled={done.includes(item.id)} onClick={()=>setSelected(item.id)} className={`touch-none rounded-2xl border-2 bg-white p-3 text-center shadow-sm disabled:opacity-30 ${selected===item.id?"border-lead-blue ring-4 ring-blue-100":"border-slate-200"}`}><span className="text-4xl">📦{item.emoji}</span><span className="block text-xs font-bold">To {places.find((place)=>place.id===item.place)?.name}</span></motion.button>)}</div><CityMap onVisit={deliver} targets={deliveries.filter((item)=>!done.includes(item.id)).map((item)=>item.place)} discovered={deliveries.filter((item)=>done.includes(item.id)).map((item)=>item.place)} compact /></>;
}

function RoutePlanner({ award, finish }: LevelProps) {
  const required:PlaceId[]=["market","park","library"];const [route,setRoute]=useState<PlaceId[]>([]);const [travelling,setTravelling]=useState(false);const [active,setActive]=useState<PlaceId>("home");
  function add(id:PlaceId){if(!required.includes(id)||route.includes(id)||travelling)return;setRoute((current)=>[...current,id]);}
  function travel(){if(route.length!==3)return;setTravelling(true);route.forEach((id,index)=>window.setTimeout(()=>{setActive(id);speak(sentenceFor(id));if(index===2){award(2);window.setTimeout(finish,900);}},(index+1)*1100));}
  return <><Guide title="Plan your afternoon">Build a route from Home. Tap Market, Park, and Library in the order you want to visit them.</Guide><div className="mb-4 flex min-h-14 flex-wrap items-center justify-center gap-2 rounded-2xl bg-blue-50 p-3"><span className="rounded-xl bg-white px-3 py-2 font-bold">🏠 Home</span>{route.map((id)=><span key={id} className="font-bold text-lead-navy">→ <span className="rounded-xl bg-white px-3 py-2">{places.find((place)=>place.id===id)?.emoji} {places.find((place)=>place.id===id)?.name}</span></span>)}</div><CityMap onVisit={add} active={active} targets={required.filter((id)=>!route.includes(id))} compact /><div className="mt-4 flex flex-wrap justify-center gap-3"><Button variant="secondary" disabled={travelling} onClick={()=>setRoute([])}><RotateCcw className="h-4 w-4" />Reset route</Button><Button disabled={route.length!==3||travelling} onClick={travel}>Let&apos;s go! <ArrowRight className="h-4 w-4" /></Button></div></>;
}

const directionWalls=new Set(["1,1","2,1","3,3","1,4"]);
function DirectionGame({ award, finish }: LevelProps) {
  const width=5,height=5;const [position,setPosition]=useState({x:0,y:4});const target={x:4,y:0};const [message,setMessage]=useState("Help Wisey reach the park. Use the direction buttons.");
  function move(dx:number,dy:number,label:string){const next={x:position.x+dx,y:position.y+dy};const key=`${next.x},${next.y}`;speak(label);if(next.x<0||next.x>=width||next.y<0||next.y>=height||directionWalls.has(key)){setMessage("That street is blocked. Let's try another route.");return;}setPosition(next);setMessage(label);if(next.x===target.x&&next.y===target.y){award(2);speak("You found the park! The park is next to the library.");window.setTimeout(finish,900);}}
  useEffect(()=>{function keys(event:KeyboardEvent){const map:Record<string,[number,number,string]>={ArrowUp:[0,-1,"Go straight."],ArrowDown:[0,1,"Go back."],ArrowLeft:[-1,0,"Turn left."],ArrowRight:[1,0,"Turn right."]};if(map[event.key]){event.preventDefault();move(...map[event.key]);}}window.addEventListener("keydown",keys);return()=>window.removeEventListener("keydown",keys);});
  return <><Guide title="Give directions">{message}</Guide><div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-2xl bg-slate-200 p-2">{Array.from({length:25},(_,index)=>{const x=index%5,y=Math.floor(index/5),key=`${x},${y}`;return <div key={key} className={`grid aspect-square place-items-center rounded-lg text-2xl ${directionWalls.has(key)?"bg-slate-500":"bg-white"}`}>{directionWalls.has(key)?"🏢":position.x===x&&position.y===y?"🦉":target.x===x&&target.y===y?"🌳":""}</div>;})}</div><div className="mx-auto mt-4 grid w-fit grid-cols-3 gap-2"><span/><DirectionButton label="Go straight" onClick={()=>move(0,-1,"Go straight.")}><ArrowUp/></DirectionButton><span/><DirectionButton label="Turn left" onClick={()=>move(-1,0,"Turn left.")}><ArrowLeft/></DirectionButton><DirectionButton label="Go back" onClick={()=>move(0,1,"Go back.")}><ArrowDown/></DirectionButton><DirectionButton label="Turn right" onClick={()=>move(1,0,"Turn right.")}><ArrowRight/></DirectionButton></div></>;
}
function DirectionButton({label,onClick,children}:{label:string;onClick:()=>void;children:React.ReactNode}){return <button onClick={onClick} className="grid min-h-14 min-w-20 place-items-center rounded-xl bg-lead-blue p-2 text-xs font-bold text-white">{children}<span>{label}</span></button>;}

function RoleplayScene({ award, finish }: LevelProps) {
  const scenes=[{place:"Market",emoji:"🧑‍🌾",npc:"Hello! What do you need?",options:["I need apples.","I play football."],answer:"I need apples.",reply:"Here you are!"},{place:"Park",emoji:"🧒",npc:"Where are you going?",options:["I'm going to the park.","I need medicine."],answer:"I'm going to the park.",reply:"Let's play!"},{place:"Hospital",emoji:"👩‍⚕️",npc:"Can I help you?",options:["I need to go to the hospital.","I need to go to the bank."],answer:"I need to go to the hospital.",reply:"Yes, I can help you."}];
  const [round,setRound]=useState(0);const [reply,setReply]=useState("");const current=scenes[round];
  function talk(line:string){if(line!==current.answer){setReply("That sentence belongs in another place. Try the sentence for this conversation.");return;}speak(line);setReply(current.reply);award(1);window.setTimeout(()=>{if(round===scenes.length-1)finish();else{setRound((value)=>value+1);setReply("");}},900);}
  return <><Guide title={`Roleplay at the ${current.place}`}>Talk to the character and choose what you want to say in this real-life moment.</Guide><div className="mx-auto max-w-2xl rounded-3xl bg-violet-50 p-5"><div className="flex items-start gap-4"><span className="text-6xl">{current.emoji}</span><div className="rounded-2xl rounded-tl-none bg-white p-4 font-bold text-lead-navy shadow-sm">{current.npc}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-2">{current.options.map((line)=><button key={line} onClick={()=>talk(line)} className="rounded-2xl border-2 border-violet-200 bg-white p-4 text-left font-bold text-lead-navy transition hover:border-violet-500">💬 {line}</button>)}</div>{reply?<motion.p initial={{opacity:0}} animate={{opacity:1}} className="mt-4 rounded-2xl bg-emerald-100 p-4 font-bold text-emerald-800">{reply}</motion.p>:null}</div></>;
}

function SentenceBuilder({ award, finish }: LevelProps) {
  const targets:PlaceId[]=["park","market","hospital","library","supermarket","restaurant"];const [round,setRound]=useState(0);const target=sentenceFor(targets[round]).split(" ");const [pool,setPool]=useState(()=>shuffle(target));const [answer,setAnswer]=useState<string[]>([]);const [message,setMessage]=useState("Tap the words in the correct order.");
  function add(word:string,index:number){setAnswer((current)=>[...current,word]);setPool((current)=>current.filter((_,position)=>position!==index));}
  function check(){if(answer.join(" ")!==target.join(" ")){setMessage("Almost! Reset the words and build the sentence again.");return;}speak(answer.join(" "));award(1);const next=round+1;if(next===targets.length){finish();return;}setRound(next);setAnswer([]);setPool(shuffle(sentenceFor(targets[next]).split(" ")));setMessage("Great sentence! The character travelled there.");}
  return <><Guide title="Build a travel sentence">{message}</Guide><div className="text-center text-7xl">{places.find((place)=>place.id===targets[round])?.emoji}</div><div className="mt-4 flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-blue-200 bg-blue-50 p-3">{answer.map((word,index)=><span key={`${word}-${index}`} className="rounded-xl bg-lead-blue px-4 py-3 font-bold text-white">{word}</span>)}</div><div className="mt-5 flex flex-wrap justify-center gap-3">{pool.map((word,index)=><button key={`${word}-${index}`} onClick={()=>add(word,index)} className="rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-bold text-lead-navy shadow-sm">{word}</button>)}</div><div className="mt-5 flex justify-center gap-3"><Button variant="secondary" onClick={()=>{setPool(shuffle(target));setAnswer([]);}}><RotateCcw className="h-4 w-4"/>Reset</Button><Button disabled={pool.length>0} onClick={check}><Check className="h-4 w-4"/>Check sentence</Button></div></>;
}

function FinalDay({ award, finish, discover }: LevelProps & { discover:(id:PlaceId)=>void }) {
  const missions=[{place:"market" as PlaceId,label:"Buy fruit",icon:"🍎"},{place:"park" as PlaceId,label:"Meet a friend",icon:"⚽"},{place:"restaurant" as PlaceId,label:"Eat dinner",icon:"🍽️"}];const [step,setStep]=useState(0);const [done,setDone]=useState<PlaceId[]>([]);const current=missions[step];
  function visit(id:PlaceId){if(id!==current.place)return;const next=[...done,id];setDone(next);discover(id);award(3);speak(sentenceFor(id));if(step===missions.length-1)window.setTimeout(finish,900);else setStep((value)=>value+1);}
  return <><Guide title="A day in my city">Complete your day in order: morning at the market, afternoon at the park, and evening at the restaurant.</Guide><div className="mb-4 grid gap-2 sm:grid-cols-3">{missions.map((mission,index)=><div key={mission.place} className={`rounded-2xl border-2 p-3 text-center ${done.includes(mission.place)?"border-emerald-400 bg-emerald-50":"border-slate-200 bg-white"}`}><span className="text-3xl">{mission.icon}</span><p className="mt-1 text-xs font-bold">{index===0?"Morning":index===1?"Afternoon":"Evening"}: {mission.label}</p></div>)}</div><CityMap onVisit={visit} active={done.at(-1)||"home"} targets={[current.place]} discovered={done} compact /><p className="mt-4 text-center font-bold text-lead-blue">Next: {current.icon} {current.label} at the {places.find((place)=>place.id===current.place)?.name}</p></>;
}

function Results({stars,discovered,reset}:{stars:number;discovered:PlaceId[];reset:()=>void}) {
  const unique=new Set(discovered.filter((id)=>id!=="home"));return <Card className="overflow-hidden border-yellow-200 bg-[linear-gradient(145deg,#eff6ff,#ffffff,#fef3c7)] p-6 text-center shadow-soft sm:p-10"><motion.div initial={{scale:0}} animate={{scale:1}} className="text-8xl">🏆</motion.div><p className="mt-5 font-bold uppercase tracking-[0.18em] text-sky-700">City Adventure Complete!</p><h2 className="mt-2 font-heading text-4xl font-extrabold text-lead-navy">You are a City Explorer!</h2><p className="mt-3 text-lg text-lead-gray">You explored, travelled, helped people, and spoke English around the city.</p><div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-3"><Result label="Places visited" value={`${unique.size} / 9`} /><Result label="Missions" value="10 / 10" /><Result label="Stars earned" value={`${stars} ⭐`} /></div><div className="mx-auto mt-6 max-w-xl rounded-2xl bg-white p-5 text-left shadow-sm"><p className="font-heading font-extrabold text-lead-navy">English used</p><p className="mt-2 text-sm leading-7 text-lead-gray">✓ I go to the market.<br/>✓ I go to the park.<br/>✓ I go to the hospital.<br/>✓ Go straight. Turn left. Turn right.</p></div><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={reset}><RotateCcw className="h-4 w-4"/>Play Again</Button><Button asChild variant="secondary"><a href="/games">Back to LEAD Games</a></Button></div></Card>;
}
function Result({label,value}:{label:string;value:string}){return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 font-heading text-xl font-extrabold text-lead-navy">{value}</p></div>;}
function shuffle<T>(values:T[]){const result=[...values];for(let index=result.length-1;index>0;index-=1){const swap=Math.floor(Math.random()*(index+1));[result[index],result[swap]]=[result[swap],result[index]];}return result;}
