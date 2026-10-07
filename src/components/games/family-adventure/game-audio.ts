export function speak(text: string, enabled = true) {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.84;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
}

export function arcadeTone(kind: "correct" | "wrong" | "complete", enabled = true) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = kind === "wrong" ? "sawtooth" : "sine";
  oscillator.frequency.setValueAtTime(kind === "wrong" ? 160 : kind === "complete" ? 520 : 420, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(kind === "complete" ? 920 : kind === "wrong" ? 90 : 680, context.currentTime + 0.16);
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.23);
}
