/**
 * Demo-Lernlied-Quelle: Begleitmusik wird im Browser synthetisiert (Web Audio: Bass, Akkorde,
 * Schlagzeug) mit Lookahead-Scheduler; „Gesang“ = Sprachausgabe je Zeile ab startMs.
 * Tempo 0.5–1.0 skaliert Musik und Sprechrate gemeinsam (Sprechrate = ttsRate × Tempo).
 */
import type { Song } from '../../../../content/types';
import { getAudioContext, resumeAudioContext } from '../../../../speech/audioContext';
import { isSpeaking, speak, stopSpeaking, ttsSupported } from '../../../../speech/tts';
import { bassNote, chordVoicing, midiToFreq, parseProgression, type ParsedChord } from '../chords';
import { GROOVES, stepsPerBar, type Groove } from './grooves';
import { BaseSource, PLAYER_RATES, type PlaybackSource } from './types';

export interface SynthOptions {
  /** BCP-47-Sprache der Stimme (Variante des Songs) */
  lang: string;
  vocals: boolean;
  /** aktuelle Sprechrate aus den Einstellungen (live gelesen) */
  ttsRate: () => number;
}

const LOOKAHEAD_S = 0.16;
const TICK_MS = 25;
const START_DELAY_S = 0.06;

type Live = { node: AudioScheduledSourceNode; end: number };

let speechUnlocked = false;
/** iOS: Sprachausgabe innerhalb einer Nutzer-Geste freischalten (stummes Leer-Utterance). */
function unlockSpeech() {
  if (speechUnlocked || typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    speechUnlocked = true;
  } catch { /* egal – speak() meldet Fehler später ehrlich */ }
}

export class SynthSource extends BaseSource implements PlaybackSource {
  readonly kind = 'synth' as const;
  readonly supportsRate = true;
  readonly rateReason = undefined;

  private readonly song: Song;
  private readonly opts: SynthOptions;
  private readonly groove: Groove;
  private readonly steps: number;
  private readonly stepMs: number;
  private readonly progression: ParsedChord[];
  private readonly durationMs: number;

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private live: Live[] = [];
  private timer: number | null = null;

  private tempo = 1;
  private posMs = 0;
  private anchorCtx = 0;
  private anchorMs = 0;
  private nextStep = 0;
  private playing = false;
  private disposed = false;

  private vocals: boolean;
  private vocalsFailed = false;
  private lastVocalMs = -1;

  constructor(song: Song, opts: SynthOptions) {
    super();
    this.song = song;
    this.opts = opts;
    this.vocals = opts.vocals;
    const style = song.backing?.style && GROOVES[song.backing.style] ? song.backing.style : 'pop';
    this.groove = GROOVES[style];
    this.steps = stepsPerBar(style);
    const bpm = Math.min(220, Math.max(40, song.backing?.bpm || 96));
    this.stepMs = 240000 / bpm / this.steps;
    this.progression = parseProgression(song.backing?.chords ?? [], song.backing?.key ?? 'C');
    const last = song.lines[song.lines.length - 1];
    this.durationMs = Math.max(song.durationMs || 0, last ? last.endMs + 1500 : 4000);
    this.status = 'ready';
  }

  // ───────────── Steuerung ─────────────

  async play(): Promise<void> {
    if (this.disposed || this.playing) return;
    // Synchroner Teil: läuft noch innerhalb der Nutzer-Geste (iOS-Freischaltung)
    const ctx = this.ensureContext();
    if (!ctx) {
      this.setStatus('error', ttsSupported()
        ? 'Dein Browser kann keine Begleitmusik erzeugen (Web Audio fehlt). Nutze den Schritt-Modus oder „Zeile anhören“.'
        : 'Dein Browser kann weder Begleitmusik erzeugen (Web Audio fehlt) noch vorlesen. Im Schritt-Modus liest du Zeile für Zeile mit Übersetzung und Aussprachehilfe.');
      return;
    }
    const resumed = resumeAudioContext(ctx);
    this.unlockAudio(ctx);
    if (this.vocals) unlockSpeech();
    if (this.posMs >= this.durationMs - 50) this.posMs = 0;
    if (this.vocals && ttsSupported()) this.posMs = this.alignToLineStart(this.posMs);

    const ok = await resumed;
    if (this.disposed) return;
    if (!ok) {
      this.noticeEm.emit('Der Ton ist noch gesperrt – tippe auf „Abspielen“, um ihn freizugeben.');
      this.setStatus('paused');
      return;
    }
    this.playing = true;
    this.startBus(ctx);
    this.anchor(ctx.currentTime + START_DELAY_S, this.posMs);
    this.lastVocalMs = this.posMs - 1;
    if (this.timer === null) this.timer = window.setInterval(() => this.tick(), TICK_MS);
    this.setStatus('playing');
    this.tick();
  }

  pause(): void {
    if (!this.playing) return;
    this.posMs = this.getTime();
    this.halt();
    stopSpeaking();
    this.setStatus('paused');
  }

  seek(ms: number): void {
    const target = Math.max(0, Math.min(this.durationMs, ms));
    this.lastVocalMs = target - 1;
    if (this.playing && this.ctx) {
      stopSpeaking();
      this.stopBus();
      this.startBus(this.ctx);
      this.anchor(this.ctx.currentTime + 0.03, target);
    } else {
      this.posMs = target;
      if (this.status === 'ended' && target < this.durationMs) this.setStatus('paused');
    }
  }

  getTime(): number {
    if (!this.playing || !this.ctx) return this.posMs;
    return Math.min(this.durationMs, this.timeAt(this.ctx.currentTime));
  }

  setRate(rate: number): void {
    const r = Math.min(1, Math.max(0.5, rate));
    if (r === this.tempo) return;
    if (this.playing && this.ctx) {
      const pos = this.getTime();
      this.tempo = r;
      this.anchor(this.ctx.currentTime, pos);
    } else {
      this.tempo = r;
    }
  }

  availableRates() { return [...PLAYER_RATES]; }
  getDuration() { return this.durationMs; }
  isBusy() { return this.vocals && !this.vocalsFailed && isSpeaking(); }

  setVocals(on: boolean) {
    this.vocals = on;
    if (!on) stopSpeaking();
    else if (this.playing) this.lastVocalMs = this.getTime();
    this.applyMasterLevel();
  }

  dispose(): void {
    if (this.disposed) return;
    // Position festhalten, damit „Position speichern“ beim Verlassen den richtigen Wert liest
    if (this.playing) this.posMs = this.getTime();
    this.halt();
    stopSpeaking();
    this.disposed = true;
    try { this.master?.disconnect(); } catch { /* bereits getrennt */ }
    this.master = null;
    this.clearListeners();
  }

  // ───────────── intern: Uhr & Scheduler ─────────────

  private ensureContext(): AudioContext | null {
    if (this.ctx && this.ctx.state !== 'closed' && this.master) return this.ctx;
    const ctx = getAudioContext(true);
    if (!ctx) return null;
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    comp.attack.value = 0.005;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    const master = ctx.createGain();
    master.connect(comp);
    this.master = master;
    this.applyMasterLevel();
    const len = Math.floor(ctx.sampleRate * 0.5);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
    return ctx;
  }

  private applyMasterLevel() {
    if (!this.master || !this.ctx) return;
    // Mit Gesang etwas leiser, damit die Stimme gut verständlich bleibt
    this.master.gain.setTargetAtTime(this.vocals ? 0.42 : 0.62, this.ctx.currentTime, 0.05);
  }

  private unlockAudio(ctx: AudioContext) {
    try {
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
    } catch { /* egal */ }
  }

  private anchor(ctxTime: number, songMs: number) {
    this.anchorCtx = ctxTime;
    this.anchorMs = songMs;
    this.nextStep = Math.ceil(songMs / this.stepMs - 1e-6);
  }

  private timeAt(ctxTime: number) {
    return Math.max(this.anchorMs, this.anchorMs + (ctxTime - this.anchorCtx) * 1000 * this.tempo);
  }

  private ctxTimeFor(songMs: number) {
    return this.anchorCtx + (songMs - this.anchorMs) / 1000 / this.tempo;
  }

  private alignToLineStart(pos: number): number {
    const line = this.song.lines.find((l) => l.startMs < pos && pos < l.endMs - 300);
    return line ? Math.max(0, line.startMs - 150) : pos;
  }

  private startBus(ctx: AudioContext) {
    const bus = ctx.createGain();
    bus.gain.value = 1;
    if (this.master) bus.connect(this.master);
    this.bus = bus;
  }

  private stopBus() {
    const ctx = this.ctx;
    const bus = this.bus;
    this.bus = null;
    if (!ctx || !bus) return;
    const now = ctx.currentTime;
    try {
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(0, now, 0.012);
    } catch { /* egal */ }
    for (const l of this.live) {
      try { l.node.stop(now + 0.08); } catch { /* schon gestoppt */ }
    }
    this.live = [];
    window.setTimeout(() => { try { bus.disconnect(); } catch { /* egal */ } }, 200);
  }

  private halt() {
    this.playing = false;
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.stopBus();
  }

  private tick() {
    const ctx = this.ctx;
    if (!this.playing || !ctx) return;
    const now = ctx.currentTime;
    const pos = this.timeAt(now);
    if (pos >= this.durationMs) {
      this.posMs = this.durationMs;
      this.halt();
      this.setStatus('ended');
      return;
    }
    // Musik: alle Schritte im Lookahead-Fenster einplanen
    const horizon = now + LOOKAHEAD_S;
    for (let guard = 0; guard < 64; guard++) {
      const stepMs = this.nextStep * this.stepMs;
      if (stepMs >= this.durationMs) break;
      const when = this.ctxTimeFor(stepMs);
      if (when > horizon) break;
      if (when >= now - 0.03) this.scheduleStep(this.nextStep, Math.max(when, now));
      this.nextStep++;
    }
    if (this.live.length > 48) this.live = this.live.filter((l) => l.end > now);
    // Gesang: Zeilen, deren Start seit dem letzten Tick überschritten wurde
    if (this.vocals && !this.vocalsFailed) {
      let due = -1;
      this.song.lines.forEach((l, i) => {
        if (l.startMs > this.lastVocalMs && l.startMs <= pos) due = i;
      });
      if (due >= 0) this.speakLine(due);
    }
    this.lastVocalMs = pos;
  }

  private speakLine(i: number) {
    const line = this.song.lines[i];
    if (!line?.text.trim()) return;
    const rate = Math.min(1.6, Math.max(0.3, (this.opts.ttsRate() || 0.95) * this.tempo));
    speak(line.text, { lang: this.opts.lang, rate, key: `song:${this.song.id}:${line.id}` }).catch((err: unknown) => {
      if (this.vocalsFailed || this.disposed) return;
      this.vocalsFailed = true;
      const msg = err instanceof Error && err.message ? err.message : 'Die Sprachausgabe ist nicht verfügbar.';
      this.noticeEm.emit(`${msg} Du hörst nur die Begleitmusik – der Text läuft trotzdem mit.`);
    });
  }

  // ───────────── intern: Klangerzeugung ─────────────

  private track(node: AudioScheduledSourceNode, end: number) {
    this.live.push({ node, end });
  }

  private scheduleStep(step: number, t: number) {
    const ctx = this.ctx;
    const out = this.bus;
    if (!ctx || !out) return;
    const g = this.groove;
    const i = step % this.steps;
    const bar = Math.floor(step / this.steps);
    const chord = this.progression[bar % this.progression.length];
    const stepS = this.stepMs / 1000 / this.tempo;
    const mix = g.mix;

    const k = g.kick[i];
    if (k !== '.') this.kick(t, (k === 'X' ? 1 : 0.8) * mix.drums, out);
    const sn = g.snare[i];
    if (sn !== '.') (g.rim ? this.rim(t, (sn === 'X' ? 0.9 : 0.6) * mix.drums, out) : this.snare(t, (sn === 'X' ? 1 : 0.75) * mix.drums, out));
    const h = g.hat[i];
    if (h !== '.') this.hat(t, (h === 'X' ? 0.5 : 0.28) * mix.drums, out);

    const b = g.bass[i];
    if (b !== '.') {
      const interval = b === '5' ? 7 : b === 'O' ? 12 : b === '3' ? (chord.intervals[1] ?? 4) : 0;
      const len = this.untilNext(g.bass, i) * stepS * 0.92;
      this.bass(midiToFreq(bassNote(chord, interval)), t, Math.max(0.08, len), 0.5 * mix.bass, out);
    }

    if (g.chord[i] !== '.') {
      const notes = chordVoicing(chord).slice(0, 4).map(midiToFreq);
      switch (g.chordStyle) {
        case 'pad':
          this.pad(notes, t, this.untilNext(g.chord, i) * stepS, 0.22 * mix.chords, out);
          break;
        case 'stab':
          this.pluck(notes, t, 0.22, 0.26 * mix.chords, out, 2600, 0);
          break;
        case 'pluck':
          this.pluck(notes, t, 0.7, 0.24 * mix.chords, out, 2200, 0.006);
          break;
        case 'strum':
          this.pluck(notes, t, 0.9, 0.22 * mix.chords, out, 3000, 0.014);
          break;
        case 'arp': {
          const pos = [...g.chord.slice(0, i)].filter((c) => c !== '.').length;
          const all = chordVoicing(chord);
          // auf- und absteigendes Arpeggio über gut eine Oktave
          const up = [...all.slice(0, 3), all[0] + 12];
          const seq = [...up, ...up.slice(1, -1).reverse()];
          const note = seq[pos % seq.length];
          this.pluck([midiToFreq(note)], t, 0.9, 0.34 * mix.chords, out, 2400, 0);
          if (i === 0) this.pad(notes, t, this.steps * stepS, 0.08 * mix.chords, out);
          break;
        }
      }
    }
  }

  /** Schritte bis zum nächsten Anschlag im Muster (oder Taktende) */
  private untilNext(pattern: string, i: number) {
    let n = 1;
    while (i + n < pattern.length && pattern[i + n] === '.') n++;
    return n;
  }

  private env(gain: GainNode, t: number, peak: number, attack: number, decay: number) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private kick(t: number, vol: number, out: AudioNode) {
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    this.env(g, t, vol, 0.004, 0.3);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.34);
    this.track(osc, t + 0.34);
  }

  private noiseHit(t: number, vol: number, out: AudioNode, type: BiquadFilterType, freq: number, decay: number, q = 0.7) {
    const ctx = this.ctx as AudioContext;
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, vol, 0.002, decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.3);
    src.stop(t + decay + 0.02);
    this.track(src, t + decay + 0.02);
  }

  private snare(t: number, vol: number, out: AudioNode) {
    this.noiseHit(t, vol * 0.7, out, 'highpass', 1400, 0.16);
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    this.env(g, t, vol * 0.5, 0.002, 0.1);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.12);
    this.track(osc, t + 0.12);
  }

  private rim(t: number, vol: number, out: AudioNode) {
    this.noiseHit(t, vol * 0.5, out, 'bandpass', 2300, 0.05, 3);
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, t);
    this.env(g, t, vol * 0.45, 0.001, 0.035);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.05);
    this.track(osc, t + 0.05);
  }

  private hat(t: number, vol: number, out: AudioNode) {
    this.noiseHit(t, vol, out, 'highpass', 7200, 0.04);
  }

  private bass(freq: number, t: number, dur: number, vol: number, out: AudioNode) {
    const ctx = this.ctx as AudioContext;
    const osc = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    f.type = 'lowpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(1300, t);
    f.frequency.exponentialRampToValueAtTime(420, t + Math.min(0.25, dur));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setTargetAtTime(vol * 0.65, t + 0.02, 0.08);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.03);
    osc.connect(f).connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.2);
    this.track(osc, t + dur + 0.2);
  }

  private pad(freqs: number[], t: number, dur: number, vol: number, out: AudioNode) {
    const ctx = this.ctx as AudioContext;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1600;
    const g = ctx.createGain();
    const per = vol / Math.max(1, freqs.length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(per, t + 0.08);
    g.gain.setTargetAtTime(0.0001, t + Math.max(0.1, dur - 0.05), 0.12);
    f.connect(g).connect(out);
    const end = t + dur + 0.6;
    for (const fr of freqs) {
      for (const [type, detune] of [['triangle', -6], ['sawtooth', 7]] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(fr, t);
        osc.detune.setValueAtTime(detune, t);
        if (type === 'sawtooth') {
          const soft = ctx.createGain();
          soft.gain.value = 0.25;
          osc.connect(soft).connect(f);
        } else {
          osc.connect(f);
        }
        osc.start(t);
        osc.stop(end);
        this.track(osc, end);
      }
    }
  }

  private pluck(freqs: number[], t: number, decay: number, vol: number, out: AudioNode, bright: number, stagger: number) {
    const ctx = this.ctx as AudioContext;
    const per = vol / Math.max(1, Math.sqrt(freqs.length) * 1.4);
    freqs.forEach((fr, n) => {
      const start = t + n * stagger;
      const osc = ctx.createOscillator();
      const f = ctx.createBiquadFilter();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(fr, start);
      f.type = 'lowpass';
      f.frequency.setValueAtTime(bright, start);
      f.frequency.exponentialRampToValueAtTime(700, start + decay);
      this.env(g, start, per, 0.004, decay);
      osc.connect(f).connect(g).connect(out);
      osc.start(start);
      osc.stop(start + decay + 0.05);
      this.track(osc, start + decay + 0.05);
    });
  }
}
