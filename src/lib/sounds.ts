/**
 * Small interface sounds, synthesised with the Web Audio API so there are no
 * audio files to ship or license. Every sound is short and quiet, and the
 * whole thing can be switched off in Settings (stored per browser).
 *
 * Browsers only allow audio after the person has interacted with the page,
 * so the first sound of a visit may be dropped silently; that's expected.
 */

export type SoundName = "notify" | "message" | "complete" | "success";

const STORAGE_KEY = "bh-sounds";
let ctx: AudioContext | null = null;

export function soundsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundsEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* private browsing */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One soft sine note with a quick attack and an exponential fade. */
function tone(ac: AudioContext, freq: number, start: number, length: number, volume: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

// Each sound as [frequency Hz, offset s, length s, volume]
const SOUNDS: Record<SoundName, [number, number, number, number][]> = {
  // Two-note chime: something new for you
  notify: [
    [880, 0, 0.35, 0.08],
    [1318.5, 0.11, 0.45, 0.07],
  ],
  // Single soft pop: a teammate wrote in chat
  message: [[740, 0, 0.18, 0.06]],
  // Short bright tick: a task or checklist item done
  complete: [
    [1046.5, 0, 0.12, 0.06],
    [1568, 0.05, 0.16, 0.05],
  ],
  // Rising major arpeggio: a meeting booked, a company booked
  success: [
    [523.25, 0, 0.25, 0.06],
    [659.25, 0.08, 0.25, 0.06],
    [783.99, 0.16, 0.4, 0.06],
  ],
};

export function playSound(name: SoundName) {
  if (!soundsEnabled()) return;
  const ac = audio();
  if (!ac) return;
  const now = ac.currentTime + 0.01;
  for (const [freq, offset, length, volume] of SOUNDS[name]) {
    tone(ac, freq, now + offset, length, volume);
  }
}
