/**
 * Dezente Soundeffekte, rein synthetisch über Web Audio (keine Audiodateien).
 * - respektiert `settings.soundEffects`
 * - AudioContext entsteht erst bei einer Nutzer-Geste (bzw. beim ersten Effekt) und wird
 *   nach iOS-Unterbrechungen (Anruf, Hintergrund) bei der nächsten Geste fortgesetzt.
 * - folgt dem Stummschalter des iPhones (Web Audio ist dort „ambient“) – gewollt für Effekte.
 */
import { getAudioContext, resumeAudioContext } from './audioContext';
import { isBrowser, speechSettings } from './env';

export type SfxName = 'correct' | 'wrong' | 'levelUp' | 'tap';

interface Note {
  freq: number;
  /** Start relativ zum Effektbeginn (s) */
  at: number;
  dur: number;
  gain: number;
  type?: OscillatorType;
  /** Tonhöhe gleitet bis zu dieser Frequenz */
  glideTo?: number;
}

const SOUNDS: Record<SfxName, Note[]> = {
  // kurzer, weicher Klick
  tap: [{ freq: 740, at: 0, dur: 0.04, gain: 0.05, type: 'sine' }],
  // zwei helle, aufsteigende Töne (E5 → A5)
  correct: [
    { freq: 659.25, at: 0, dur: 0.11, gain: 0.12, type: 'triangle' },
    { freq: 880, at: 0.09, dur: 0.2, gain: 0.12, type: 'triangle' },
    { freq: 1760, at: 0.09, dur: 0.16, gain: 0.02, type: 'sine' },
  ],
  // sanft absteigend, tief und leise – kein „Strafton“
  wrong: [
    { freq: 311.13, at: 0, dur: 0.14, gain: 0.09, type: 'sine' },
    { freq: 261.63, at: 0.12, dur: 0.24, gain: 0.09, type: 'sine', glideTo: 246.94 },
  ],
  // kleines Arpeggio C5–E5–G5–C6 mit Glanz
  levelUp: [
    { freq: 523.25, at: 0, dur: 0.12, gain: 0.1, type: 'triangle' },
    { freq: 659.25, at: 0.1, dur: 0.12, gain: 0.1, type: 'triangle' },
    { freq: 783.99, at: 0.2, dur: 0.12, gain: 0.1, type: 'triangle' },
    { freq: 1046.5, at: 0.3, dur: 0.45, gain: 0.12, type: 'triangle' },
    { freq: 2093, at: 0.3, dur: 0.4, gain: 0.025, type: 'sine' },
  ],
};

const MASTER_VOLUME = 0.7;
let master: GainNode | null = null;
let lastTapAt = 0;

function enabled(): boolean {
  return speechSettings().soundEffects;
}

function output(ctx: AudioContext): GainNode {
  if (master && master.context === ctx) return master;
  master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ctx.destination);
  return master;
}

function schedule(ctx: AudioContext, notes: Note[]) {
  const out = output(ctx);
  const t0 = ctx.currentTime + 0.01;
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = n.type ?? 'sine';
    const start = t0 + n.at;
    const end = start + n.dur;
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.glideTo) osc.frequency.exponentialRampToValueAtTime(n.glideTo, end);
    // weiche Hüllkurve: 8 ms Einschwingen, exponentielles Ausklingen (kein Knacken)
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(n.gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(g);
    g.connect(out);
    osc.start(start);
    osc.stop(end + 0.02);
    osc.onended = () => {
      try {
        osc.disconnect();
        g.disconnect();
      } catch {
        /* egal */
      }
    };
  }
}

/** Spielt einen Effekt (still, wenn Soundeffekte aus sind oder Audio nicht verfügbar ist). */
export function playSfx(name: SfxName): void {
  if (!isBrowser || !enabled()) return;
  if (name === 'tap') {
    const now = performance.now();
    if (now - lastTapAt < 60) return;
    lastTapAt = now;
  }
  const ctx = getAudioContext();
  if (!ctx) return;
  const notes = SOUNDS[name];
  if (ctx.state === 'running') {
    schedule(ctx, notes);
    return;
  }
  // angehalten (iOS vor der ersten Geste / nach Unterbrechung): fortsetzen, dann spielen
  void resumeAudioContext(ctx).then((ok) => {
    if (ok) schedule(ctx, notes);
  });
}

export const sfx = {
  correct: () => playSfx('correct'),
  wrong: () => playSfx('wrong'),
  levelUp: () => playSfx('levelUp'),
  tap: () => playSfx('tap'),
};

// ── Freischalten bei Nutzer-Gesten (iOS) ──
// Bei jeder Geste: bestehenden Kontext fortsetzen bzw. (bei aktivierten Effekten) erstmals
// erzeugen, damit spätere Effekte – z. B. nach einer asynchronen Auswertung – hörbar sind.
let unlockInstalled = false;

export function installSfxUnlock(): void {
  if (!isBrowser || unlockInstalled) return;
  unlockInstalled = true;
  const onGesture = () => {
    const existing = getAudioContext(false);
    if (existing) {
      if (existing.state !== 'running') void resumeAudioContext(existing);
      return;
    }
    if (!enabled()) return;
    const ctx = getAudioContext(true);
    if (!ctx) return;
    void resumeAudioContext(ctx);
    // stiller Puffer: schaltet die Ausgabe auf älteren iOS-Versionen frei
    try {
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      /* egal */
    }
  };
  const opts: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('pointerdown', onGesture, opts);
  window.addEventListener('touchend', onGesture, opts);
  window.addEventListener('keydown', onGesture, opts);
  window.addEventListener('click', onGesture, opts);
}

installSfxUnlock();
