"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Clock3, RotateCcw, Star, Volume2 } from "lucide-react";
import { InteractiveClock, type ClockTime } from "./interactive-clock";

type Mission = ClockTime & { label: string; action: string; scene: "morning" | "afternoon" | "evening" | "night" };

const levels = ["Explore", "Clock Hands", "O'Clock", "Thirty", "Morning", "Afternoon", "Evening", "My Day", "Copy", "Match", "Planner", "Time Order", "Listen", "Time Clues", "Busy Day"];
const hours = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const setTimes: Mission[][] = [
  [],
  [],
  [[5,0,"Set the clock to five o'clock","Practice time","morning"],[8,0,"Set the clock to eight o'clock","Practice time","morning"],[10,0,"Set the clock to ten o'clock","Practice time","morning"],[3,0,"Set the clock to three o'clock","Practice time","afternoon"],[6,0,"Set the clock to six o'clock","Practice time","evening"]],
  [[2,30,"Set the clock to two thirty","Half-hour training","afternoon"],[4,30,"Set the clock to four thirty","Half-hour training","afternoon"],[6,30,"Set the clock to six thirty","Half-hour training","evening"],[8,30,"Set the clock to eight thirty","Half-hour training","night"]],
  [[7,0,"Wake up at seven o'clock","Bill wakes up","morning"],[7,30,"Eat breakfast at seven thirty","Bill eats breakfast","morning"],[8,0,"Go to school at eight o'clock","Bill goes to school","morning"]],
  [[1,30,"Have lunch at one thirty","Bill has lunch","afternoon"],[3,0,"Play soccer at three o'clock","Bill plays soccer","afternoon"],[4,30,"Read at four thirty","Bill reads a book","afternoon"]],
  [[6,30,"Eat dinner at six thirty","Bill eats dinner","evening"],[7,0,"Enjoy free time at seven o'clock","Bill enjoys free time","evening"],[8,30,"Go to bed at eight thirty","Bill goes to bed","night"]],
  [],
  [[3,30,"Copy the time on the example clock","Match the clock","afternoon"],[9,0,"Copy the time on the example clock","Match the clock","morning"],[6,30,"Copy the time on the example clock","Match the clock","evening"]],
  [], [], [],
  [[7,30,"Listen carefully, then set the clock.","Listen and set","morning"],[4,0,"Listen carefully, then set the clock.","Listen and set","afternoon"],[8,30,"Listen carefully, then set the clock.","Listen and set","night"]],
  [[8,0,"School begins after breakfast. Set the clock to eight o'clock.","Solve the school clue","morning"],[1,30,"Lunch is thirty minutes after one. Set the time.","Solve the lunch clue","afternoon"],[7,0,"Free time begins when the hour hand points to seven and the minute hand points to twelve.","Solve the hand clue","evening"]],
  [[7,30,"Bill eats breakfast at seven thirty.","Breakfast","morning"],[8,0,"Bill goes to school at eight o'clock.","School","morning"],[1,30,"Bill has lunch at one thirty.","Lunch","afternoon"],[3,30,"Bill plays at three thirty.","Play","afternoon"],[4,30,"Bill reads at four thirty.","Reading","afternoon"],[6,30,"Bill eats dinner at six thirty.","Dinner","evening"],[8,30,"Bill goes to bed at eight thirty.","Bedtime","night"]]
].map(group => group.map(([hour, minute, label, action, scene]) => ({ hour: hour as number, minute: minute as number, label: label as string, action: action as string, scene: scene as Mission["scene"] })));

const matches = [{ hour: 4, minute: 0 }, { hour: 6, minute: 30 }, { hour: 9, minute: 0 }, { hour: 2, minute: 30 }];
const planner = [
  { activity: "Breakfast", time: "7:00", icon: "🥣" }, { activity: "School", time: "8:00", icon: "🎒" },
  { activity: "Lunch", time: "1:30", icon: "🍎" }, { activity: "Play", time: "3:00", icon: "⚽" },
  { activity: "Reading", time: "4:30", icon: "📚" }, { activity: "Dinner", time: "6:30", icon: "🍽️" },
  { activity: "Bedtime", time: "8:30", icon: "🛏️" }
];

const personalQuestions = [
  { question: "When do you wake up?", subject: "I wake up at", action: "Your wake-up time", scene: "morning" },
  { question: "When do you eat breakfast?", subject: "I eat breakfast at", action: "Your breakfast time", scene: "morning" },
  { question: "When do you start school?", subject: "I start school at", action: "Your school time", scene: "morning" },
  { question: "When do you play or relax?", subject: "I play or relax at", action: "Your free time", scene: "afternoon" },
  { question: "When do you go to bed?", subject: "I go to bed at", action: "Your bedtime", scene: "night" }
] as const;

const orderedDay = ["Wake up", "Eat breakfast", "Go to school", "Play", "Go to bed"];

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
  const [personalAnswers, setPersonalAnswers] = useState<string[]>([]);
  const [dayOrder, setDayOrder] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const mission = setTimes[level]?.[step];
  const personalQuestion = level === 7 ? personalQuestions[step] : undefined;
  const scene = mission?.scene || personalQuestion?.scene || (level < 5 ? "morning" : level < 7 ? "afternoon" : "evening");
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
    if (level === 14) { setFinished(true); setStars(stars + 5); return; }
    setLevel(level + 1); setStep(0); setClock({ hour: 12, minute: 0 }); setFeedback("New mission ready!");
  }

  function checkClock() {
    if (!mission) return;
    if (clock.hour === mission.hour && clock.minute === mission.minute) {
      setFeedback(`Awesome! ${timeText(mission)}`); setStars(stars + 1); speak(timeText(mission)); setTimeout(advance, 900);
    } else if (clock.minute !== mission.minute) setFeedback("Almost! Look carefully at the long minute hand.");
    else setFeedback("Close! Move the short hour hand.");
  }

  function savePersonalTime() {
    if (!personalQuestion) return;
    const answer = `${personalQuestion.subject} ${timeText(clock).replace("It is ", "").toLowerCase()}`;
    const next = [...personalAnswers, answer];
    setPersonalAnswers(next);
    setStars(stars + 1);
    speak(answer);
    if (step + 1 < personalQuestions.length) {
      setStep(step + 1);
      setClock({ hour: 12, minute: 0 });
      setFeedback("Nice! Now answer the next question about you.");
    } else {
      setFeedback("Your personal day is complete!");
      setTimeout(() => { setLevel(8); setStep(0); setClock({ hour: 12, minute: 0 }); }, 900);
    }
  }

  function completeSpecial(nextLevel: number) { setStars(stars + 2); setFeedback("Great job! Mission complete."); setTimeout(() => { setLevel(nextLevel); setStep(0); setClock({hour:12,minute:0}); }, 700); }

  if (finished) return <div className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top,#3b82f6,#0f172a_68%)] p-7 text-center text-white shadow-2xl sm:p-12"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-yellow-400 text-6xl shadow-[0_0_50px_#facc15]">🏆</div><p className="mt-7 font-bold uppercase tracking-[0.2em] text-yellow-300">LEAD · Learn English Daily</p><h2 className="mt-3 font-heading text-4xl font-black sm:text-6xl">TIME MASTER</h2><p className="mt-4 text-xl">You helped Bill complete his whole day!</p><p className="mt-4 text-yellow-300">{stars} stars earned · 15 levels complete</p>{personalAnswers.length > 0 && <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-white/10 p-4 text-left"><p className="mb-2 font-bold text-yellow-300">My day</p>{personalAnswers.map(answer=><p key={answer} className="text-sm leading-7">✓ {answer}</p>)}</div>}<button onClick={() => {setLevel(0);setStep(0);setClock({hour:3,minute:0});setStars(0);setFinished(false);setPersonalAnswers([]);setDayOrder([]);setMatched({});setPlan({});setFeedback("Drag either clock hand and explore.");}} className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-4 font-bold text-blue-700"><RotateCcw className="h-5 w-5"/>Play Again</button><p className="mt-8 text-sm text-blue-100">Speak English with Confidence</p></div>;

  return <div className="overflow-hidden rounded-[32px] border border-blue-100 bg-white shadow-xl">
    <header className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-5 py-4 text-white sm:px-7"><div><p className="text-xs font-black tracking-[0.18em] text-yellow-300">LEAD · FUN LEARNING</p><h2 className="text-xl font-black">Telling Time</h2></div><div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"><Star className="mr-1 inline h-4 w-4 fill-yellow-300 text-yellow-300"/>{stars}</span><span className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold">{level + 1}/{levels.length}</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-yellow-400 transition-all" style={{width:`${progress}%`}}/></div></header>
    <div className={`relative grid min-h-[690px] gap-5 p-4 sm:p-7 lg:grid-cols-[minmax(260px,0.75fr)_minmax(400px,1.25fr)] ${scene === "morning" ? "bg-[linear-gradient(#dbeafe,#fef3c7)]" : scene === "afternoon" ? "bg-[linear-gradient(#bae6fd,#dcfce7)]" : scene === "evening" ? "bg-[linear-gradient(#fed7aa,#ddd6fe)]" : "bg-[linear-gradient(#312e81,#0f172a)]"}`}>
      <aside className="relative z-10 flex flex-col rounded-3xl bg-white/90 p-5 shadow-lg backdrop-blur"><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Level {level + 1} · {levels[level]}</p><h3 className="mt-2 font-heading text-2xl font-black text-slate-900">{level === 0 ? "Meet the clock" : level === 1 ? "Master the hands" : level === 7 ? personalQuestion?.question : level === 9 ? "Match the times" : level === 10 ? "Plan Bill's day" : level === 11 ? "Put the day in order" : mission?.label}</h3><p className="mt-3 text-sm leading-6 text-slate-600">{level === 0 ? "Move both hands freely and watch the digital time change." : level === 1 ? "The short hand shows the hour. The long blue hand shows minutes. Place the long hand on 12, then on 6." : level === 7 ? "There is no wrong routine. Set the clock to your real answer, then save it." : level === 9 ? "Drag a digital time onto its matching clock. On touch screens, tap a time and then tap a clock." : level === 10 ? "Put every time beside the correct activity. Drag it, or tap the time and then the activity." : level === 11 ? "Tap the activities from first in the morning to last at night." : level === 12 ? "Press Listen, remember the time, and set it on the clock." : "Use the clock to complete the challenge."}</p><Bill action={personalQuestion?.action || mission?.action || (level < 2 ? "Let's learn!" : "You can do it!")} scene={scene}/><div className="mt-auto rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="font-bold text-slate-800">Wisey says</p><p className="mt-1 text-sm text-slate-600">{feedback}</p></div></aside>
      <main className="relative z-10 rounded-3xl bg-white/95 p-4 shadow-lg sm:p-6">
        {level === 9 ? <Matching selected={selectedTime} setSelected={setSelectedTime} matched={matched} onWrong={()=>setFeedback("Almost! Compare the short and long hands again.")} onMatch={(key,value) => { const next={...matched,[key]:value}; setMatched(next); setSelectedTime(null); setFeedback("That clock matches!"); if(Object.keys(next).length===matches.length) completeSpecial(10); }} /> : level === 10 ? <Planner selected={selectedTime} setSelected={setSelectedTime} plan={plan} times={shuffledPlannerTimes} onPlace={(activity,value) => {const expected=planner.find(item=>item.activity===activity)?.time;if(value!==expected){setFeedback("Almost! Think about when Bill does that activity.");return;}const next={...plan,[activity]:value};setPlan(next);setSelectedTime(null);if(Object.keys(next).length===planner.length)completeSpecial(11);}}/> : level === 11 ? <TimeOrder chosen={dayOrder} onChoose={(activity)=>{const expected=orderedDay[dayOrder.length];if(activity!==expected){setFeedback("Think about what Bill does earlier in the day.");return;}const next=[...dayOrder,activity];setDayOrder(next);setFeedback("Good order!");if(next.length===orderedDay.length)completeSpecial(12);}}/> : <>
          {level === 8 && mission && <div className="mb-4 rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50 p-3 text-center"><p className="mb-2 font-bold text-slate-700">Example clock</p><InteractiveClock {...mission} interactive={false} compact showControls={false}/></div>}
          {level === 12 && mission && <button type="button" onClick={()=>speak(timeText(mission))} className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 font-bold text-white"><Volume2 className="h-5 w-5"/>Listen to the secret time</button>}
          <InteractiveClock {...clock} onChange={(value)=>{setClock(value);setFeedback("Keep moving the hands, then check your time.");}}/>
          <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-center text-white"><p className="font-heading text-4xl font-black tabular-nums">{digital(clock)}</p><p className="mt-1 text-lg text-blue-100">“{timeText(clock)}”</p><button type="button" onClick={()=>speak()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold"><Volume2 className="h-4 w-4"/>Listen & say it</button></div>
          {level === 0 ? <button type="button" onClick={()=>{setLevel(1);setFeedback("Move the long blue hand to 6, then continue.");}} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-bold text-white">Learn the Clock Hands <ArrowRight className="h-5 w-5"/></button> : level === 1 ? <button type="button" onClick={()=>{setLevel(2);setClock({hour:12,minute:0});setStars(stars+2);setFeedback("Now set exact times!");}} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-bold text-white">I understand the hands <ArrowRight className="h-5 w-5"/></button> : level === 7 ? <button type="button" onClick={savePersonalTime} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-lg font-bold text-white shadow-lg"><Check className="h-5 w-5"/>Save My Time</button> : <button type="button" onClick={checkClock} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-lg font-bold text-white shadow-lg hover:bg-blue-700"><Check className="h-5 w-5"/>Check Time</button>}
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

function TimeOrder({ chosen, onChoose }: { chosen: string[]; onChoose: (activity: string) => void }) {
  const choices = ["Go to bed", "Go to school", "Wake up", "Play", "Eat breakfast"];
  return <div className="flex min-h-[560px] flex-col justify-center"><div className="rounded-3xl bg-slate-950 p-5 text-white"><p className="text-sm font-bold uppercase tracking-[0.15em] text-yellow-300">Bill&apos;s timeline</p><div className="mt-4 flex min-h-20 flex-wrap items-center gap-2">{chosen.length === 0 ? <span className="text-slate-400">Choose the first activity...</span> : chosen.map((activity,index)=><span key={activity} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 font-bold"><span className="text-yellow-300">{index+1}</span>{activity}</span>)}</div></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{choices.filter(activity=>!chosen.includes(activity)).map(activity=><button type="button" key={activity} onClick={()=>onChoose(activity)} className="min-h-24 rounded-2xl border-2 border-blue-100 bg-blue-50 p-4 text-lg font-black text-slate-800 shadow-sm transition hover:-translate-y-1 hover:border-blue-400">{activity}</button>)}</div><p className="mt-6 text-center text-sm font-bold text-slate-500">Think about the day from morning to night.</p></div>;
}
