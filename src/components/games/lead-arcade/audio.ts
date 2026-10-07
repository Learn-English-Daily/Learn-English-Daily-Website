export function speakArcade(text: string, enabled = true, rate = 0.88) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(text);
  voice.lang = "en-US";
  voice.rate = rate;
  voice.pitch = 1.04;
  window.speechSynthesis.speak(voice);
}

export function arcadeSound(kind: "correct" | "wrong" | "complete" | "power", enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = kind === "wrong" ? "sawtooth" : "sine";
  const start = kind === "wrong" ? 150 : kind === "power" ? 330 : kind === "complete" ? 520 : 420;
  oscillator.frequency.setValueAtTime(start, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(kind === "wrong" ? 85 : kind === "complete" ? 1040 : 720, context.currentTime + 0.18);
  gain.gain.setValueAtTime(0.075, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.23);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
}
