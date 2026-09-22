/** Rest-over alert: three short beeps and a buzz on phones that support it.
 *  Browsers only let a page make sound after the user has interacted with it, so
 *  `primeRestAlert()` is called from the set tap (a real gesture) — by the time
 *  the countdown ends the audio context is already running. */

let context: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

export function primeRestAlert(): void {
  try {
    void audioContext()?.resume();
  } catch {
    // No audio available — the countdown still works, just silently.
  }
}

export function playRestAlert({ sound }: { sound: boolean }): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Vibration unsupported.
  }
  if (!sound) return;
  try {
    const ctx = audioContext();
    if (!ctx) return;
    const start = ctx.currentTime + 0.02;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      const at = start + i * 0.28;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.22);
    }
  } catch {
    // Blocked or unsupported audio — ignore.
  }
}
