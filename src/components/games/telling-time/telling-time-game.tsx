"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, RotateCcw, Star, Volume2 } from "lucide-react";
import { InteractiveClock, type ClockTime } from "./interactive-clock";

type Mission = ClockTime & { label: string; action: string; scene: "morning" | "afternoon" | "evening" | "night" };

const levels = ["Learn", "O'Clock", "Thirty", "Morning", "Afternoon", "Evening", "Copy", "Match", "Planner", "Busy Day"];
const hours = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const setTimes: Mission[][] = [
  [],
  [[5,0,"Set the clock to five o'clock","Practice time","morning"],[8,0,"Set the clock to eight o'clock","Practice time","morning"],[10,0,"Set the clock to ten o'clock","Practice time","morning"],[3,0,"Set the clock to three o'clock","Practice time","afternoon"],[6,0,"Set the clock to six o'clock","Practice time","evening"]],
  [[2,30,"Set the clock to two thirty","Half-hour training","afternoon"],[4,30,"Set the clock to four thirty","Half-hour training","afternoon"],[6,30,"Set the clock to six thirty","Half-hour training","evening"],[8,30,"Set the clock to eight thirty","Half-hour training","night"]],
  [[7,0,"Wake up at seven o'clock","Bill wakes up","morning"],[7,30,"Eat breakfast at seven thirty","Bill eats breakfast","morning"],[8,0,"Go to school at eight o'clock","Bill goes to school","morning"]],
  [[1,30,"Have lunch at one thirty","Bill has lunch","afternoon"],[3,0,"Play soccer at three o'clock","Bill plays soccer","afternoon"],[4,30,"Read at four thirty","Bill reads a book","afternoon"]],
  [[6,30,"Eat dinner at six thirty","Bill eats dinner","evening"],[7,0,"Enjoy free time at seven o'clock","Bill enjoys free time","evening"],[8,30,"Go to bed at eight thirty","Bill goes to bed","night"]],
  [[3,30,"Copy the time on the example clock","Match the clock","afternoon"],[9,0,"Copy the time on the example clock","Match the clock","morning"],[6,30,"Copy the time on the example clock","Match the clock","evening"]],
  [], [],
  [[7,30,"Bill eats breakfast at seven thirty.","Breakfast","morning"],[8,0,"Bill goes to school at eight o'clock.","School","morning"],[1,30,"Bill has lunch at one thirty.","Lunch","afternoon"],[3,30,"Bill plays at three thirty.","Play","afternoon"],[4,30,"Bill reads at four thirty.","Reading","afternoon"],[6,30,"Bill eats dinner at six thirty.","Dinner","evening"],[8,30,"Bill goes to bed at eight thirty.","Bedtime","night"]]
].map(group => group.map(([hour, minute, label, action, scene]) => ({ hour: hour as number, minute: minute as number, label: label as string, action: action as string, scene: scene as Mission["scene"] })));

const matches = [{ hour: 4, minute: 0 }, { hour: 6, minute: 30 }, { hour: 9, minute: 0 }, { hour: 2, minute: 30 }];
const planner = [
  { activity: "Breakfast", time: "7:00", icon: "🥣" }, { activity: "School", time: "8:00", icon: "🎒" },
  { activity: "Lunch", time: "1:30", icon: "🍎" }, { activity: "Play", time: "3:00", icon: "⚽" },
  { activity: "Reading", time: "4:30", icon: "📚" }, { activity: "Dinner", time: "6:30", icon: "🍽️" },
  { activity: "Bedtime", time: "8:30", icon: "🛏️" }
];

function timeText({ hour, minute }: ClockTime) { return `It is ${hours[hour % 12]}${minute === 0 ? " o'clock" : minute === 30 ? " thirty" : ` ${String(minute).padStart(2, "0")}`}.`; }
function digital({ hour, minute }: ClockTime) { return `${hour}:${String(minute).padStart(2, "0")}`; }

function Bill({ action, scene }: { action: string; scene: Mission["scene"] }) {
  return <div className="relative mx-auto h-52 w-44" aria-label={`Bill: ${action}`}>
    <div className={`absolute inset-x-4 bottom-0 h-8 rounded-[50%] blur-sm ${scene === "night" ? "bg-indigo-950/30" : "bg-slate-400/20"}`} />
    <div className="absolute left-[58px] top-2 h-20 w-20 rounded-full border-4 border-amber-700 bg-amber-300 shadow-lg"><div className="absolute left-3 top-8 h-3 w-3 rounded-full bg-slate-900"/><div className="absolute right-3 top-8 h-3 w-3 rounded-full bg-slate-900"/><div className="absolute left-7 top-12 h-3 w-6 rounded-b-full border-b-2 border-slate-800"/><div className="absolute -left-2 top-0 h-7 w-24 rounded-t-full bg-slate-900"/></div>
    <div className="absolute left-12 top-[76px] grid h-24 w-24 place-items-center rounded-[28px_28px_16px_16px] bg-blue-600 text-center font-black text-white shadow-lg"><span className="rounded bg-white px-2 py-1 text-sm text-blue-700">LEAD</span></div>
    <div className="absolute bottom-1 left-14 h-12 w-7 rounded-b-xl bg-slate-800"/><div className="absolute bottom-1 right-10 h-12 w-7 rounded-b-xl bg-slate-800"/>
    <div className="absolute bottom-0 left-9 h-4 w-12 rounded-full bg-white"/><div className="absolute bottom-0 right-4 h-4 w-12 rounded-full bg-white"/>
    <div className="absolute -right-5 top-24 max-w-28 rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-lg">{action}</div>
  </div>;
}

export function TellingTimeGame() {
  const [level, setLevel] = useState(0);
  const [step, setStep] = useState(0);
  const [clock, setClock] = useState<ClockTime>({ hour: 3, minute: 0 });
  const [feedback, setFeedback] = useState("Drag either clock hand and explore.");
  const [stars, setStars] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const mission = setTimes[level]?.[step];
  const scene = mission?.scene || (level < 4 ? "morning" : level < 6 ? "afternoon" : "evening");
  const progress = ((level + (step / Math.max(setTimes[level]?.length || 1, 1))) / levels.length) * 100;
  const shuffledPlannerTimes = useMemo(() => ["3:00","7:00","6:30","1:30","8:30","4:30","8:00"], []);

  function speak(text = timeText(clock)) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "en-US"; utterance.rate = 0.85; window.speechSynthesis.speak(utterance);
  }

  function advance() {
    const group = setTimes[level] || [];
    if (step + 1 < group.length) { setStep(step + 1); setClock({ hour: 12, minute: 0 }); setFeedback("Next activity: move the hands."); return; }
    if (level === 9) { setFinished(true); setStars(stars + 5); return; }
    setLevel(level + 1); setStep(0); setClock({ hour: 12, minute: 0 }); setFeedback("New mission ready!");
  }

  function checkClock() {
    if (!mission) return;
    if (clock.hour === mission.hour && clock.minute === mission.minute) {
      setFeedback(`Awesome! ${timeText(mission)}`); setStars(stars + 1); speak(timeText(mission)); setTimeout(advance, 900);
    } else if (clock.minute !== mission.minute) setFeedback("Almost! Look carefully at the long minute hand.");
    else setFeedback("Close! Move the short hour hand.");
  }

  function completeSpecial(nextLevel: number) { setStars(stars + 2); setFeedback("Great job! Mission complete."); setTimeout(() => { setLevel(nextLevel); setStep(0); setClock({hour:12,minute:0}); }, 700); }

  if (finished) return <div className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top,#3b82f6,#0f172a_68%)] p-7 text-center text-white shadow-2xl sm:p-12"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-yellow-400 text-6xl shadow-[0_0_50px_#facc15]">🏆</div><p className="mt-7 font-bold uppercase tracking-[0.2em] text-yellow-300">LEAD · Learn English Daily</p><h2 className="mt-3 font-heading text-4xl font-black sm:text-6xl">TIME MASTER</h2><p className="mt-4 text-xl">You helped Bill complete his whole day!</p><p className="mt-4 text-yellow-300">{stars} stars earned</p><button onClick={() => {setLevel(0);setStep(0);setClock({hour:3,minute:0});setStars(0);setFinished(false);setFeedback("Drag either clock hand and explore.");}} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-bold text-blue-700"><RotateCcw className="h-5 w-5"/>Play Again</button><p className="mt-8 text-sm text-blue-100">Speak English with Confidence</p></div>;

  return <div className="overflow-hidden rounded-[32px] border border-blue-100 bg-white shadow-xl">
    <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-5 py-4 text-white sm:px-7"><div><p className="text-xs font-black tracking-[0.18em] text-yellow-300">LEAD · FUN LEARNING</p><h2 className="text-xl font-black">Telling Time</h2></div><div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"><Star className="mr-1 inline h-4 w-4 fill-yellow-300 text-yellow-300"/>{stars}</span><span className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold">{level + 1}/{levels.length}</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-yellow-400 transition-all" style={{width:`${progress}%`}}/></div></header>
    <div className={`relative grid min-h-[690px] gap-5 p-4 sm:p-7 lg:grid-cols-[minmax(260px,0.75fr)_minmax(400px,1.25fr)] ${scene === "morning" ? "bg-[linear-gradient(#dbeafe,#fef3c7)]" : scene === "afternoon" ? "bg-[linear-gradient(#bae6fd,#dcfce7)]" : scene === "evening" ? "bg-[linear-gradient(#fed7aa,#ddd6fe)]" : "bg-[linear-gradient(#312e81,#0f172a)]"}`}>
      <aside className="relative z-10 flex flex-col rounded-3xl bg-white/90 p-5 shadow-lg backdrop-blur"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">{levels[level]}</p><h3 className="mt-2 font-heading text-2xl font-black text-slate-900">{level === 0 ? "Meet the clock" : level === 7 ? "Match the times" : level === 8 ? "Plan Bill's day" : mission?.label}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{level === 0 ? "The short hand shows the hour. The long blue hand shows the minutes. Move both hands freely." : level === 7 ? "Drag a digital time onto its matching clock. On touch screens, tap a time and then tap a clock." : level === 8 ? "Put every time beside the correct activity. Drag it, or tap the time and then the activity." : "Help Bill by setting the analog clock."}</p><Bill action={mission?.action || (level === 0 ? "Let's learn!" : "You can do it!")} scene={scene}/><div className="mt-auto rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-slate-800">Wisey says</p><p className="mt-1 text-sm text-slate-600">{feedback}</p></div></aside>
      <main className="relative z-10 rounded-3xl bg-white/95 p-4 shadow-lg sm:p-6">
        {level === 7 ? <Matching selected={selectedTime} setSelected={setSelectedTime} matched={matched} onWrong={()=>setFeedback("Almost! Compare the short and long hands again.")} onMatch={(key,value) => { const next={...matched,[key]:value}; setMatched(next); setSelectedTime(null); setFeedback("That clock matches!"); if(Object.keys(next).length===matches.length) completeSpecial(8); }} /> : level === 8 ? <Planner selected={selectedTime} setSelected={setSelectedTime} plan={plan} times={shuffledPlannerTimes} onPlace={(activity,value) => {const expected=planner.find(item=>item.activity===activity)?.time;if(value!==expected){setFeedback("Almost! Think about when Bill does that activity.");return;}const next={...plan,[activity]:value};setPlan(next);setSelectedTime(null);if(Object.keys(next).length===planner.length)completeSpecial(9);}}/> : <>
          {level === 6 && mission && <div className="mb-4 rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50 p-3 text-center"><p className="mb-2 font-bold text-slate-700">Example clock</p><InteractiveClock {...mission} interactive={false} compact showControls={false}/></div>}
          <InteractiveClock {...clock} onChange={(value)=>{setClock(value);setFeedback("Keep moving the hands, then check your time.");}}/>
          <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-center text-white"><p className="font-heading text-4xl font-black tabular-nums">{digital(clock)}</p><p className="mt-1 text-lg text-blue-100">“{timeText(clock)}”</p><button type="button" onClick={()=>speak()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"><Volume2 className="h-4 w-4"/>Listen & say it</button></div>
          {level === 0 ? <button type="button" onClick={()=>{setLevel(1);setClock({hour:12,minute:0});setFeedback("Set your first time!");}} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-bold text-white">Start Bill's Day <ArrowRight className="h-5 w-5"/></button> : <button type="button" onClick={checkClock} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white shadow-lg hover:bg-blue-700"><Check className="h-5 w-5"/>Check Time</button>}
        </>}
      </main>
    </div>
  </div>;
}

function Matching({selected,setSelected,matched,onMatch,onWrong}:{selected:string|null;setSelected:(v:string|null)=>void;matched:Record<string,string>;onMatch:(key:string,value:string)=>void;onWrong:()=>void}) {
  const times=["6:30","2:30","4:00","9:00"];
  function tryMatch(key:string,value:string){const target=matches[Number(key)];if(!target||digital(target)!==value){onWrong();return;}onMatch(key,value);}
  return <div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{times.filter(time=>!Object.values(matched).includes(time)).map(time=><button draggable key={time} onDragStart={e=>e.dataTransfer.setData("text/plain",time)} onClick={()=>setSelected(time)} className={`rounded-2xl border-2 px-3 py-4 text-xl font-black ${selected===time?"border-yellow-400 bg-yellow-50":"border-blue-100 bg-blue-50"}`}>{time}</button>)}</div><div className="mt-5 grid grid-cols-2 gap-4">{matches.map((item,index)=>{const key=String(index);return <button key={key} onClick={()=>selected&&tryMatch(key,selected)} onDragOver={e=>e.preventDefault()} onDrop={e=>tryMatch(key,e.dataTransfer.getData("text/plain"))} className={`rounded-2xl border-2 border-dashed p-3 ${matched[key]?"border-emerald-400 bg-emerald-50":"border-slate-200 bg-white"}`}><InteractiveClock {...item} interactive={false} compact showControls={false}/><div className="mt-2 min-h-10 rounded-xl bg-slate-100 p-2 font-black">{matched[key]||"Drop time here"}</div></button>})}</div></div>;
}

function Planner({selected,setSelected,plan,times,onPlace}:{selected:string|null;setSelected:(v:string|null)=>void;plan:Record<string,string>;times:string[];onPlace:(activity:string,value:string)=>void}) {
  return <div><div className="flex flex-wrap gap-2">{times.filter(time=>!Object.values(plan).includes(time)).map(time=><button draggable key={time} onDragStart={e=>e.dataTransfer.setData("text/plain",time)} onClick={()=>setSelected(time)} className={`rounded-xl border-2 px-4 py-3 text-lg font-black ${selected===time?"border-yellow-400 bg-yellow-50":"border-blue-100 bg-blue-50"}`}>{time}</button>)}</div><div className="mt-5 grid gap-3">{planner.map(item=><button key={item.activity} onClick={()=>selected&&onPlace(item.activity,selected)} onDragOver={e=>e.preventDefault()} onDrop={e=>onPlace(item.activity,e.dataTransfer.getData("text/plain"))} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm"><span className="text-3xl">{item.icon}</span><strong className="flex-1 text-slate-800">{item.activity}</strong><span className={`min-w-24 rounded-xl p-3 text-center font-black ${plan[item.activity]?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-400"}`}>{plan[item.activity]||"Drop time"}</span></button>)}</div></div>;
}
