"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { arcadeSound, speakArcade } from "../lead-arcade/audio";
import type { ArcadeStageProps } from "../lead-arcade/types";
import type { PreferenceProfile } from "./game-data";

type RecognitionEvent = { results: { length: number; [index: number]: { 0: { transcript: string } } } };
type Recognition = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: RecognitionEvent) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

function words(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9' ]/g, "").split(/\s+/).filter(Boolean);
}

function asActivity(value: string) {
  const [verb, ...rest] = value.split(" ");
  const forms: Record<string, string> = { play: "playing", eat: "eating", read: "reading", watch: "watching" };
  return [forms[verb] ?? verb, ...rest].join(" ");
}

function finish(attempts: number, onComplete: ArcadeStageProps["onComplete"]) {
  onComplete({ correct: 3, attempts: Math.max(3, attempts), bestCombo: 3, score: 925, stars: 3 });
}

export function SpeakLive({ name, profile, sound, onComplete }: ArcadeStageProps & { name: string; profile: PreferenceProfile }) {
  const lines = [
    `I like ${profile.liked[0] || "reading"}, but I don't like ${profile.disliked[0] || "spicy food"}.`,
    `I prefer to ${profile.preferred[0] || "play football"} because it is fun.`,
    `In my opinion, ${asActivity(profile.preferred[1] || "eat pizza")} is better for me.`,
  ];
  const [round, setRound] = useState(0);
  const [passed, setPassed] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("Press the microphone and speak your opinion.");
  const [attempts, setAttempts] = useState(0);
  const ref = useRef<Recognition | null>(null);

  useEffect(() => () => ref.current?.stop(), []);

  function start() {
    const RecognitionApi = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!RecognitionApi) return setMessage("Use Chrome or Edge and allow microphone permission.");
    ref.current?.stop();
    const recognition = new RecognitionApi();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let said = "";
      for (let index = 0; index < event.results.length; index += 1) said += ` ${event.results[index][0].transcript}`;
      said = said.trim();
      setTranscript(said);
      setAttempts((value) => value + 1);
      const target = words(lines[round]);
      const heard = words(said);
      const match = target.filter((word) => heard.includes(word)).length / target.length;
      if (match >= 0.65) {
        setPassed(true);
        setMessage(`Great opinion, ${name}! ${Math.round(match * 100)}% matched.`);
        arcadeSound("complete", sound);
      } else {
        setMessage("Try again and include the complete preference sentence.");
        arcadeSound("wrong", sound);
      }
    };
    recognition.onerror = () => { setListening(false); setMessage("I could not hear clearly. Check microphone permission and retry."); };
    recognition.onend = () => setListening(false);
    ref.current = recognition;
    recognition.start();
    setListening(true);
    setTranscript("");
    setMessage("Listening…");
  }

  function next() {
    ref.current?.stop();
    ref.current = null;
    if (round === 2) window.setTimeout(() => finish(attempts, onComplete), 350);
    else {
      setRound((value) => value + 1);
      setPassed(false);
      setTranscript("");
      setMessage("Press the microphone and speak the next opinion.");
    }
  }

  return (
    <section>
      <p className="text-xs font-black uppercase tracking-[.24em] text-yellow-300">Likes &amp; Dislikes</p>
      <h2 className="mt-2 font-heading text-4xl font-black">Preference Radio Live</h2>
      <div className="mt-5 rounded-3xl bg-gradient-to-b from-slate-950 to-blue-900 p-6 text-center">
        <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-black">● LIVE · OPINION {round + 1}/3</span>
        <div className="mx-auto mt-6 max-w-3xl rounded-3xl border-4 border-blue-300 bg-white p-6 text-slate-900">
          <div className="text-6xl">🎙️ {name}</div>
          <p className="mt-4 font-heading text-2xl font-black">“{lines[round]}”</p>
          <Button onClick={() => speakArcade(lines[round], sound)} variant="secondary" className="mt-4"><Volume2 /> HEAR MODEL</Button>
          <Button onClick={start} disabled={listening || passed} className={`mt-4 sm:ml-3 ${passed ? "bg-emerald-600" : "bg-red-600"}`}>{listening ? <MicOff /> : <Mic />}{listening ? "LISTENING…" : passed ? "OPINION PASSED ✓" : "START MICROPHONE"}</Button>
          <div className="mt-5 rounded-xl bg-slate-100 p-3 text-left"><small className="font-black uppercase text-slate-500">Live transcript</small><p className="mt-1 min-h-7 font-bold">{transcript || "Waiting for your voice…"}</p></div>
          <p className={`mt-3 font-black ${passed ? "text-emerald-600" : "text-blue-700"}`}>{message}</p>
          {passed ? <Button onClick={next} className="mt-4 w-full bg-yellow-300 text-slate-950">{round === 2 ? "FINISH LIVE SHOW 🏆" : "NEXT OPINION"}</Button> : null}
        </div>
      </div>
    </section>
  );
}
