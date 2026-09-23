/**
 * Sprachausgabe (Web Speech API – speechSynthesis).
 *
 * - Stimmenauswahl je Sprache mit Präferenzliste (iOS/macOS, Google, Microsoft),
 *   Neuheiten-Stimmen (Eddy, Flo, Grandma …) werden gemieden.
 * - Stimmen laden: `voiceschanged` + Polling (iOS/Chrome liefern die Liste verzögert).
 * - `speak()` ist Promise-basiert, bricht vorheriges Sprechen ab, teilt lange Texte in
 *   kurze Stücke (iOS-Hänger, Chrome-15-s-Abbruch) und hat Start- und Gesamt-Timeouts.
 * - Fehlt eine Stimme, liefert `missingVoiceHelp()` eine konkrete Anleitung (iPhone zuerst).
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { isBrowser, isIOS, isSafariLike, normalizeLang, speechSettings } from './env';

export interface SpeakOptions {
  /** BCP-47, z. B. 'es-ES' | 'es-MX' | 'pt-BR' (Standard: aktiver Kurs laut Einstellungen) */
  lang?: string;
  /** explizite Rate (0.3–1.6); sonst Einstellung `ttsRate` bzw. `ttsSlowRate` */
  rate?: number;
  /** true → langsame Rate aus den Einstellungen */
  slow?: boolean;
  pitch?: number;
  /** Kennung für `speakingKey` (Standard: der Text) – z. B. um den aktiven Play-Button zu markieren */
  key?: string;
  /** bestimmte Stimme erzwingen */
  voiceURI?: string;
}

export type TtsErrorCode =
  | 'unsupported' | 'not-allowed' | 'no-start' | 'voice-unavailable' | 'network' | 'audio-busy' | 'failed';

export class TtsError extends Error {
  readonly code: TtsErrorCode;
  constructor(code: TtsErrorCode, message: string) {
    super(message);
    this.name = 'TtsError';
    this.code = code;
  }
}

export type VoiceStatus = 'ok' | 'region-fallback' | 'missing' | 'unknown' | 'unsupported';

// ───────────────────────── Zustand (für useSyncExternalStore) ─────────────────────────
interface TtsSnapshot {
  voices: SpeechSynthesisVoice[];
  voicesLoaded: boolean;
  speaking: boolean;
  speakingKey: string | null;
}

let snapshot: TtsSnapshot = { voices: [], voicesLoaded: false, speaking: false, speakingKey: null };
const listeners = new Set<() => void>();
const bestCache = new Map<string, SpeechSynthesisVoice | null>();

function setSnap(patch: Partial<TtsSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => snapshot;

function synth(): SpeechSynthesis | null {
  return isBrowser && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

export function ttsSupported(): boolean {
  return !!synth() && typeof SpeechSynthesisUtterance !== 'undefined';
}

// ───────────────────────── Stimmen ─────────────────────────
const ISO3: Record<string, string> = { spa: 'es', por: 'pt', eng: 'en', deu: 'de' };
const REGION3: Record<string, string> = { ESP: 'ES', MEX: 'MX', USA: 'US', BRA: 'BR', PRT: 'PT', ARG: 'AR', COL: 'CO', CHL: 'CL' };

/** 'es_ES' | 'spa-ESP' | 'es-es' → 'es-ES' */
function voiceTag(v: SpeechSynthesisVoice): string {
  const [b = '', r = ''] = (v.lang || '').replace(/_/g, '-').split('-');
  const base = ISO3[b.toLowerCase()] ?? b.toLowerCase();
  const reg = REGION3[r.toUpperCase()] ?? r.toUpperCase();
  return reg ? `${base}-${reg}` : base;
}

const REGION_FALLBACK: Record<string, string[]> = {
  'es-ES': ['es-ES'],
  'es-MX': ['es-MX', 'es-US', 'es-419', 'es-CO', 'es-AR', 'es-CL', 'es-PE', 'es-VE', 'es-EC', 'es-GT', 'es-CR', 'es-UY'],
  'pt-BR': ['pt-BR'],
};

const PREFERRED_NAMES: Record<string, string[]> = {
  'es-ES': ['mónica', 'monica', 'jorge', 'marisol', 'google español', 'elvira', 'álvaro', 'alvaro', 'helena', 'laura', 'pablo', 'lucia'],
  'es-MX': ['paulina', 'juan', 'google español de estados unidos', 'dalia', 'jorge', 'sabina', 'raúl', 'raul', 'paloma', 'alonso'],
  'pt-BR': ['luciana', 'felipe', 'fernanda', 'google português do brasil', 'francisca', 'antônio', 'antonio', 'thalita', 'maria', 'daniel'],
};

const QUALITY = /(premium|enhanced|erweitert|natural|neural|online)/i;
const NOVELTY = /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|albert|bad news|bahh|bells|boing|bubbles|cellos|wobble|good news|jester|organ|superstar|trinoids|whisper|zarvox|fred|junior|kathy|ralph|oma|opa)\b/i;

function scoreVoice(v: SpeechSynthesisVoice, want: string): number {
  const tag = voiceTag(v);
  const base = want.slice(0, 2);
  if (tag.slice(0, 2) !== base) return -1;
  const fallback = REGION_FALLBACK[want] ?? [want];
  const idx = fallback.indexOf(tag);
  let s: number;
  if (tag === want) s = 100;
  else if (idx >= 0) s = 80 - idx * 3;
  else if (base === 'pt') s = 15;                         // pt-PT klingt deutlich anders als pt-BR
  else if (want !== 'es-ES' && tag === 'es-ES') s = 35;   // Spanien-Stimme als Notlösung für Lateinamerika
  else s = 45;
  const name = v.name.toLowerCase();
  const pi = (PREFERRED_NAMES[want] ?? []).findIndex((p) => name.includes(p));
  if (pi >= 0) s += 12 - Math.min(pi, 10);
  if (QUALITY.test(name)) s += 8;
  if (NOVELTY.test(name)) s -= 40;
  if (v.localService) s += 2;
  if (v.default) s += 1;
  return s;
}

function refreshVoices(): boolean {
  const s = synth();
  if (!s) return false;
  let list: SpeechSynthesisVoice[] = [];
  try {
    list = s.getVoices() || [];
  } catch {
    list = [];
  }
  const prev = snapshot.voices;
  if (list.length && (list.length !== prev.length || list.some((v, i) => v.voiceURI !== prev[i]?.voiceURI))) {
    bestCache.clear();
    setSnap({ voices: list.slice(), voicesLoaded: true });
  }
  return list.length > 0;
}

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
let globalHooksInstalled = false;

function installGlobalHooks() {
  const s = synth();
  if (!s || globalHooksInstalled) return;
  globalHooksInstalled = true;
  // Neue Stimmen (z. B. nachträglich installiert) übernehmen
  try {
    s.addEventListener('voiceschanged', () => refreshVoices());
  } catch {
    /* ältere Engines ohne EventTarget */
  }
  // Seite verlassen/verdeckt → Wiedergabe sauber beenden (iOS bleibt sonst „hängen“)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopSpeaking();
  });
  // iOS: Sprachausgabe bei der ersten Nutzer-Geste freischalten, damit spätere
  // (z. B. automatische) Wiedergaben nicht stumm bleiben.
  if (isIOS()) {
    const unlock = () => {
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        if (!s.speaking) s.speak(u);
      } catch {
        /* egal */
      }
    };
    window.addEventListener('touchend', unlock, { once: true, capture: true, passive: true });
    window.addEventListener('click', unlock, { once: true, capture: true, passive: true });
  }
}

/** Lädt die Stimmenliste (voiceschanged + Polling, max. `timeoutMs`). */
export function loadVoices(timeoutMs = 4000): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  installGlobalHooks();
  if (refreshVoices()) return Promise.resolve(snapshot.voices);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    const started = Date.now();
    const finish = () => {
      clearInterval(timer);
      try {
        s.removeEventListener('voiceschanged', onChange);
      } catch {
        /* egal */
      }
      voicesPromise = null;
      if (!snapshot.voicesLoaded) setSnap({ voicesLoaded: true });
      resolve(snapshot.voices);
    };
    const onChange = () => {
      if (refreshVoices()) finish();
    };
    try {
      s.addEventListener('voiceschanged', onChange);
    } catch {
      /* egal */
    }
    const timer = setInterval(() => {
      if (refreshVoices() || Date.now() - started > timeoutMs) finish();
    }, 250);
  });
  return voicesPromise;
}

/** Alle passenden Stimmen für eine Sprache, beste zuerst. */
export function voicesFor(lang?: string): SpeechSynthesisVoice[] {
  const want = normalizeLang(lang);
  return snapshot.voices
    .map((v) => ({ v, s: scoreVoice(v, want) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

export function bestVoice(lang?: string): SpeechSynthesisVoice | null {
  const want = normalizeLang(lang);
  if (bestCache.has(want)) return bestCache.get(want) ?? null;
  const v = voicesFor(want)[0] ?? null;
  if (snapshot.voices.length) bestCache.set(want, v);
  return v;
}

export function voiceStatus(lang?: string): VoiceStatus {
  if (!ttsSupported()) return 'unsupported';
  const want = normalizeLang(lang);
  // Leere Liste: manche Engines verraten ihre Stimmen nicht – dann nicht fälschlich warnen.
  if (!snapshot.voicesLoaded || snapshot.voices.length === 0) return 'unknown';
  const v = bestVoice(want);
  if (!v) return 'missing';
  const tag = voiceTag(v);
  if (tag === want || (REGION_FALLBACK[want] ?? []).includes(tag)) return 'ok';
  return 'region-fallback';
}

const LANG_LABEL: Record<string, { lang: string; region: string; ios: string; voice: string }> = {
  'es-ES': { lang: 'Spanisch', region: 'Spanisch (Spanien)', ios: 'Spanisch (Spanien)', voice: 'Mónica' },
  'es-MX': { lang: 'Spanisch', region: 'Spanisch (Lateinamerika)', ios: 'Spanisch (Mexiko)', voice: 'Paulina' },
  'pt-BR': { lang: 'Portugiesisch', region: 'Portugiesisch (Brasilien)', ios: 'Portugiesisch (Brasilien)', voice: 'Luciana' },
};

function installInstructions(want: string): string {
  const l = LANG_LABEL[want] ?? { lang: want, region: want, ios: want, voice: '' };
  const ua = isBrowser ? navigator.userAgent : '';
  if (isIOS()) {
    return `So lädst du sie auf dem iPhone/iPad: Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → ${l.lang} → ${l.ios}${l.voice ? ` → z. B. „${l.voice}“` : ''} antippen und laden (die Version „Erweitert“ klingt am natürlichsten). Danach AppLingua schließen und neu öffnen.`;
  }
  if (/Android/.test(ua)) {
    return `So geht es unter Android: Einstellungen → System → Sprachen & Eingabe → Sprachausgabe (Text-in-Sprache) → Google-Sprachausgabe → Sprachdaten installieren → ${l.region}. Danach die Seite neu laden.`;
  }
  if (/Macintosh|Mac OS X/.test(ua)) {
    return `So geht es auf dem Mac: Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte → Systemstimme → Stimmen verwalten → ${l.region}${l.voice ? ` (z. B. „${l.voice}“)` : ''} laden. Danach den Browser neu starten.`;
  }
  if (/Windows/.test(ua)) {
    return `So geht es unter Windows: Einstellungen → Zeit und Sprache → Sprache und Region → Sprache hinzufügen → ${l.region} mit „Sprachausgabe“ installieren. Alternativ bringt Microsoft Edge natürliche Online-Stimmen mit.`;
  }
  return `Installiere in den Systemeinstellungen deines Geräts eine Stimme für ${l.region} und lade die Seite danach neu.`;
}

/**
 * Hilfetext, wenn für `lang` keine (passende) Stimme installiert ist – sonst `null`.
 * Bei `region-fallback` (z. B. nur europäisches statt brasilianisches Portugiesisch) gibt es
 * einen milderen Hinweis mit derselben Anleitung.
 */
export function missingVoiceHelp(lang?: string): string | null {
  const want = normalizeLang(lang);
  const status = voiceStatus(want);
  const l = LANG_LABEL[want] ?? { region: want };
  if (status === 'unsupported') {
    return 'Dieser Browser bietet keine Sprachausgabe. Öffne AppLingua in Safari (iPhone/iPad) oder in einem aktuellen Chrome bzw. Edge.';
  }
  if (status === 'missing') {
    return `Auf diesem Gerät ist keine Stimme für ${l.region} installiert – deshalb bleibt die Aussprache stumm oder klingt falsch. ${installInstructions(want)}`;
  }
  if (status === 'region-fallback') {
    const v = bestVoice(want);
    return `Keine Stimme für ${l.region} gefunden – vorübergehend spricht „${v?.name ?? 'eine andere Stimme'}“ (${v ? voiceTag(v) : '?'}), deren Akzent abweicht. ${installInstructions(want)}`;
  }
  return null;
}

// ───────────────────────── Sprechen ─────────────────────────
interface Current {
  id: number;
  finish: () => void;
}
let current: Current | null = null;
let seq = 0;
/** Referenzen halten: Chrome verliert sonst Events von gesammelten Utterances. */
const keepAlive = new Set<SpeechSynthesisUtterance>();

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Teilt Text in kurze, natürliche Stücke (Satz → Komma → Leerzeichen). */
export function splitForSpeech(text: string, max = 160): string[] {
  const sentences = text.match(/[^.!?…;]+[.!?…;]*\s*/g) ?? [text];
  const pieces: string[] = [];
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length <= max) {
      pieces.push(s);
      continue;
    }
    const parts = s.match(/[^,:–—]+[,:–—]*\s*/g) ?? [s];
    for (const p0 of parts) {
      let p = p0.trim();
      while (p.length > max) {
        let cut = p.lastIndexOf(' ', max);
        if (cut < max * 0.4) cut = max;
        pieces.push(p.slice(0, cut).trim());
        p = p.slice(cut).trim();
      }
      if (p) pieces.push(p);
    }
  }
  // Sehr kurze Stücke zusammenfassen (weniger Pausen)
  const merged: string[] = [];
  for (const p of pieces) {
    const last = merged[merged.length - 1];
    if (last && last.length + p.length + 1 <= max && (last.length < 40 || p.length < 25)) merged[merged.length - 1] = `${last} ${p}`;
    else merged.push(p);
  }
  return merged.length ? merged : [text];
}

function errorFor(code: string, lang: string): TtsError {
  switch (code) {
    case 'not-allowed':
      return new TtsError('not-allowed', 'Der Browser hat die Sprachausgabe blockiert. Tippe direkt auf „Anhören“, dann klappt es.');
    case 'language-unavailable':
    case 'voice-unavailable':
      return new TtsError('voice-unavailable', missingVoiceHelp(lang) ?? 'Für diese Sprache ist auf dem Gerät keine Stimme verfügbar.');
    case 'network':
      return new TtsError('network', 'Diese Stimme braucht eine Internetverbindung. Prüfe deine Verbindung oder installiere eine Offline-Stimme.');
    case 'audio-busy':
    case 'audio-hardware':
      return new TtsError('audio-busy', 'Die Audioausgabe ist gerade belegt (z. B. durch einen Anruf oder eine andere App).');
    default:
      return new TtsError('failed', 'Die Sprachausgabe ist fehlgeschlagen. Bitte noch einmal versuchen.');
  }
}

function setSpeaking(key: string | null) {
  if (snapshot.speaking !== !!key || snapshot.speakingKey !== key) setSnap({ speaking: !!key, speakingKey: key });
}

/**
 * Spricht `text`. Vorheriges Sprechen wird abgebrochen (dessen Promise wird erfüllt).
 * Erfüllt, wenn fertig oder unterbrochen; lehnt mit `TtsError` (deutsche Meldung) ab,
 * wenn die Ausgabe nicht möglich ist. Nur nach einer Nutzer-Geste zuverlässig (iOS).
 */
export function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  const s = synth();
  if (!s || typeof SpeechSynthesisUtterance === 'undefined') {
    return Promise.reject(new TtsError('unsupported', missingVoiceHelp() ?? 'Keine Sprachausgabe verfügbar.'));
  }
  installGlobalHooks();
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return Promise.resolve();

  stopSpeaking();
  if (s.paused) {
    try {
      s.resume();
    } catch {
      /* egal */
    }
  }
  refreshVoices();

  const lang = normalizeLang(opts.lang);
  const st = speechSettings();
  const rate = clamp(opts.rate ?? (opts.slow ? st.ttsSlowRate : st.ttsRate), 0.3, 1.6);
  const voice = (opts.voiceURI && snapshot.voices.find((v) => v.voiceURI === opts.voiceURI)) || bestVoice(lang);
  const chunks = splitForSpeech(clean, isIOS() ? 120 : 160);
  const key = opts.key ?? clean;
  const id = ++seq;
  const ua = isBrowser ? navigator.userAgent : '';
  const needsKeepAlive = !!voice && !voice.localService && !isSafariLike() && !/Android/.test(ua);

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let started = false;
    let retried = false;
    let extended = false;
    let nextIndex = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let keepAliveTimer: ReturnType<typeof setInterval> | undefined;
    let utts: SpeechSynthesisUtterance[] = [];

    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, ms);
      timers.add(t);
    };

    const detach = () => {
      for (const u of utts) {
        u.onstart = null;
        u.onend = null;
        u.onerror = null;
        keepAlive.delete(u);
      }
      utts = [];
    };

    const done = (err?: TtsError) => {
      if (settled) return;
      settled = true;
      timers.forEach(clearTimeout);
      timers.clear();
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      detach();
      if (current?.id === id) {
        current = null;
        setSpeaking(null);
      }
      if (err) reject(err);
      else resolve();
    };

    const make = (chunk: string, i: number) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = voice ? voice.lang.replace(/_/g, '-') : lang;
      if (voice) u.voice = voice;
      u.rate = rate;
      u.pitch = opts.pitch ?? 1;
      u.volume = 1;
      u.onstart = () => {
        started = true;
        nextIndex = i;
      };
      u.onend = () => {
        nextIndex = i + 1;
        if (i === chunks.length - 1) done();
      };
      u.onerror = (e: SpeechSynthesisErrorEvent) => {
        if (settled) return;
        if (e.error === 'interrupted' || e.error === 'canceled') {
          // Abgebrochen (stopSpeaking, neues speak, Anruf …) → still beenden
          done();
          return;
        }
        try {
          s.cancel();
        } catch {
          /* egal */
        }
        done(errorFor(e.error, lang));
      };
      keepAlive.add(u);
      return u;
    };

    const queueFrom = (from: number) => {
      detach();
      utts = chunks.slice(from).map((c, j) => make(c, from + j));
      for (const u of utts) s.speak(u);
    };

    current = { id, finish: () => done() };
    setSpeaking(key);

    try {
      queueFrom(0);
    } catch {
      done(new TtsError('failed', 'Die Sprachausgabe ist fehlgeschlagen. Bitte noch einmal versuchen.'));
      return;
    }

    // Start-Watchdog: iOS/Chrome verschlucken gelegentlich die erste Äußerung.
    const checkStart = () => {
      if (settled || started || s.speaking) return;
      if (!retried) {
        retried = true;
        try {
          s.cancel();
          if (s.paused) s.resume();
          queueFrom(nextIndex);
        } catch {
          /* unten behandelt */
        }
        later(checkStart, 2500);
        return;
      }
      try {
        s.cancel();
      } catch {
        /* egal */
      }
      done(new TtsError('no-start', 'Die Sprachausgabe ist nicht gestartet. Tippe noch einmal auf „Anhören“ und prüfe Lautstärke und Stummschalter.'));
    };
    later(checkStart, 1800);

    // Gesamt-Timeout: ~13 Zeichen/s bei Rate 1, großzügig bemessen
    const estimate = (clean.length / (13 * rate)) * 1000 * 1.8 + 5000;
    const overall = () => {
      if (settled) return;
      if (s.speaking && !extended) {
        extended = true;
        later(overall, estimate * 0.5);
        return;
      }
      try {
        s.cancel();
      } catch {
        /* egal */
      }
      done();
    };
    later(overall, estimate);

    // Chrome (Online-Stimmen) bricht lange Äußerungen nach ~15 s ab → regelmäßig anstupsen
    if (needsKeepAlive) {
      keepAliveTimer = setInterval(() => {
        if (settled || !s.speaking) return;
        try {
          s.pause();
          s.resume();
        } catch {
          /* egal */
        }
      }, 10000);
    }
  });
}

/** Beendet die aktuelle Wiedergabe (deren Promise wird erfüllt). */
export function stopSpeaking(): void {
  const c = current;
  current = null;
  c?.finish();
  setSpeaking(null);
  const s = synth();
  if (s && (s.speaking || s.pending)) {
    try {
      s.cancel();
    } catch {
      /* egal */
    }
  }
}

export function isSpeaking(): boolean {
  return snapshot.speaking;
}

// ───────────────────────── React-Hook ─────────────────────────
export interface UseTts {
  /** Sprachausgabe grundsätzlich vorhanden */
  available: boolean;
  speaking: boolean;
  /** `key` (bzw. Text) der laufenden Wiedergabe */
  speakingKey: string | null;
  voicesLoaded: boolean;
  /** Spricht; lehnt nie ab – Fehler landen in `error`. true = vollständig gesprochen/abgebrochen ohne Fehler. */
  speak: (text: string, opts?: SpeakOptions) => Promise<boolean>;
  stop: () => void;
  voicesFor: (lang?: string) => SpeechSynthesisVoice[];
  bestVoice: (lang?: string) => SpeechSynthesisVoice | null;
  voiceStatus: (lang?: string) => VoiceStatus;
  /** Anleitung, falls keine passende Stimme installiert ist; sonst null */
  missingVoiceHelp: (lang?: string) => string | null;
  /** letzte Fehlermeldung (deutsch) */
  error: string | null;
  clearError: () => void;
}

export function useTts(): UseTts {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void loadVoices();
    return () => {
      mounted.current = false;
    };
  }, []);

  const speakFn = useCallback(async (text: string, opts?: SpeakOptions) => {
    setError(null);
    try {
      await speak(text, opts);
      return true;
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Die Sprachausgabe ist fehlgeschlagen.');
      return false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Die Funktionen lesen den Modulzustand; der Hook rendert bei jeder Änderung (Stimmen, Wiedergabe) neu.
  return {
    available: ttsSupported(),
    speaking: snap.speaking,
    speakingKey: snap.speakingKey,
    voicesLoaded: snap.voicesLoaded,
    speak: speakFn,
    stop: stopSpeaking,
    voicesFor,
    bestVoice,
    voiceStatus,
    missingVoiceHelp,
    error,
    clearError,
  };
}
