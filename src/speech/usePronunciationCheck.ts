/**
 * usePronunciationCheck – kapselt den kompletten Ablauf einer Ausspracheprüfung:
 *
 *   idle → listening (Spracherkennung) | recording (Aufnahme) → evaluating → result
 *                                          └→ self-rating → result
 *
 * Fallback-Kette (automatisch und ehrlich begründet):
 *   1. Spracherkennung → Wertung „Verständlichkeit laut Spracherkennung“
 *   2. Aufnahme + Selbstvergleich (eigene Aufnahme vs. Vorbild, Selbsteinschätzung 1–4)
 *   3. ohne Mikrofon: Vorbild anhören, laut nachsprechen, Selbsteinschätzung
 * Aufnahmen bleiben nur im Arbeitsspeicher dieser Prüfung (gespeichert nur mit Einwilligung).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CourseId, ExerciseContext, PronAttempt } from '../core/types';
import { issueTip, scorePronunciation, type PronRating, type PronScore } from './pronunciationScore';
import {
  cancelRecording, playBlob, recorderSupport, rememberRecording, RecorderError, startRecording,
  stopPlayback as stopBlobPlayback, stopRecording, type RecorderSupport,
} from './recorder';
import { abortListening, listen, stopListening, SttError, sttSupport, type SttSupport } from './stt';
import { speak, stopSpeaking, ttsSupported } from './tts';

export type PronCheckMode = 'speech-recognition' | 'recording' | 'listen-only';
export type PronCheckStatus = 'idle' | 'listening' | 'recording' | 'evaluating' | 'self-rating' | 'result' | 'error';
export type SelfRating = 1 | 2 | 3 | 4;

export interface PronCheckResult extends PronScore {
  method: 'speech-recognition' | 'self-assessment';
  /** alle Hypothesen der Erkennung (leer bei Selbsteinschätzung) */
  transcripts: string[];
  selfRating?: SelfRating;
}

export interface PronCheckSupport {
  stt: SttSupport;
  recorder: RecorderSupport;
  tts: boolean;
  /** verfügbare Methoden, beste zuerst */
  modes: PronCheckMode[];
}

export interface PronCheckOptions {
  /** 'es-ES' | 'es-MX' | 'pt-BR' … */
  lang: string;
  /** Problem-Codes des Items (PronItem.issueCodes) */
  issueCodes?: string[];
  /** Item-ID – nur für das Merken der Aufnahme in dieser Sitzung (mit Einwilligung) */
  itemId?: string;
  /** bevorzugter Start-Modus (fällt zurück, wenn nicht verfügbar) */
  mode?: PronCheckMode;
  /** max. Dauer fürs Zuhören/Aufnehmen (Standard: 8 s Erkennung, 12 s Aufnahme) */
  maxDurationMs?: number;
  /** wird bei jedem Ergebnis aufgerufen (z. B. recordPronAttempt) */
  onResult?: (result: PronCheckResult) => void;
}

export interface UsePronunciationCheck {
  status: PronCheckStatus;
  mode: PronCheckMode;
  setMode: (mode: PronCheckMode) => void;
  support: PronCheckSupport;
  result: PronCheckResult | null;
  /** deutsche Fehlermeldung (Status 'error') */
  error: string | null;
  /** deutsche Handlungsanweisung für den aktuellen Zustand */
  hint: string;
  /** Live-Zwischenstand der Erkennung */
  interim: string;
  /** Mikrofonpegel 0..1 während der Aufnahme */
  level: number;
  /** Start je nach Modus: zuhören, aufnehmen oder (ohne Mikrofon) Vorbild abspielen + Selbsteinschätzung */
  start: () => void;
  /** Zuhören/Aufnahme beenden (Ergebnis folgt) */
  stop: () => void;
  /** laufenden Vorgang ohne Ergebnis abbrechen */
  cancel: () => void;
  /** Selbsteinschätzung 1–4 → 25/50/75/100 % */
  selfRate: (rating: SelfRating) => void;
  /** eigene Aufnahme abspielen */
  playRecording: () => Promise<void>;
  /** Vorbild (Sprachausgabe) abspielen */
  playModel: (slow?: boolean) => Promise<void>;
  stopPlayback: () => void;
  playing: 'model' | 'recording' | null;
  recording: Blob | null;
  hasRecording: boolean;
  /** alles zurücksetzen (Ergebnis, Fehler, Aufnahme) */
  reset: () => void;
}

export const SELF_RATING_OPTIONS: { value: SelfRating; label: string; scorePct: number }[] = [
  { value: 1, label: 'Noch weit weg', scorePct: 25 },
  { value: 2, label: 'Teilweise getroffen', scorePct: 50 },
  { value: 3, label: 'Fast wie das Vorbild', scorePct: 75 },
  { value: 4, label: 'Wie das Vorbild', scorePct: 100 },
];

const SELF_SUMMARY: Record<SelfRating, { rating: PronRating; summary: string }> = {
  1: { rating: 'poor', summary: 'Selbsteinschätzung: noch unsicher. Hör dir das Vorbild langsam an und übe Silbe für Silbe.' },
  2: { rating: 'partial', summary: 'Selbsteinschätzung: teilweise getroffen. Konzentriere dich auf die Tipps unten.' },
  3: { rating: 'good', summary: 'Selbsteinschätzung: fast wie das Vorbild – nur noch Feinschliff.' },
  4: { rating: 'excellent', summary: 'Selbsteinschätzung: klingt wie das Vorbild. Stark!' },
};

function computeSupport(): PronCheckSupport {
  const stt = sttSupport();
  const recorder = recorderSupport();
  const modes: PronCheckMode[] = [];
  if (stt.available) modes.push('speech-recognition');
  if (recorder.available) modes.push('recording');
  modes.push('listen-only');
  return { stt, recorder, tts: ttsSupported(), modes };
}

function pickMode(preferred: PronCheckMode | undefined, support: PronCheckSupport): PronCheckMode {
  if (preferred && support.modes.includes(preferred)) return preferred;
  return support.modes[0];
}

/** Baut einen PronAttempt-Datensatz (für `recordPronAttempt`). */
export function buildPronAttempt(
  result: PronCheckResult,
  meta: { courseId: CourseId; itemId: string; context: ExerciseContext; target: string; at?: string },
): PronAttempt {
  return {
    at: meta.at ?? new Date().toISOString(),
    courseId: meta.courseId,
    itemId: meta.itemId,
    context: meta.context,
    target: meta.target,
    method: result.method,
    transcript: result.method === 'speech-recognition' ? result.transcript || undefined : undefined,
    scorePct: result.scorePct,
    issues: result.issues,
  };
}

export function usePronunciationCheck(target: string, opts: PronCheckOptions): UsePronunciationCheck {
  const support = computeSupport();
  const [mode, setModeState] = useState<PronCheckMode>(() => pickMode(opts.mode, support));
  const [status, setStatusState] = useState<PronCheckStatus>('idle');
  const [result, setResult] = useState<PronCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState('');
  const [level, setLevel] = useState(0);
  const [playing, setPlaying] = useState<'model' | 'recording' | null>(null);
  const [recording, setRecording] = useState<Blob | null>(null);

  // Aktuelle Werte für stabile Callbacks
  const latest = useRef({ target, opts, mode, recording, status });
  latest.current = { target, opts, mode, recording, status };
  const runRef = useRef(0);
  const statusRef = useRef<PronCheckStatus>('idle');
  const mountedRef = useRef(true);
  const recStartRef = useRef<Promise<void> | null>(null);
  const finishingRef = useRef(false);
  const levelAt = useRef(0);

  const setStatus = useCallback((s: PronCheckStatus) => {
    statusRef.current = s;
    if (mountedRef.current) setStatusState(s);
  }, []);

  const emitResult = useCallback((r: PronCheckResult) => {
    setResult(r);
    setStatus('result');
    try {
      latest.current.opts.onResult?.(r);
    } catch {
      /* Fehler des Aufrufers nicht in den Ablauf tragen */
    }
  }, [setStatus]);

  const fail = useCallback((message: string) => {
    setError(message);
    setStatus('error');
    setLevel(0);
  }, [setStatus]);

  // ── Wiedergabe ──
  const stopPlaybackAll = useCallback(() => {
    stopBlobPlayback();
    stopSpeaking();
    setPlaying(null);
  }, []);

  const playModel = useCallback(async (slow = false) => {
    const s = statusRef.current;
    if (s === 'listening' || s === 'recording') return;
    const { target: t, opts: o } = latest.current;
    stopBlobPlayback();
    setPlaying('model');
    try {
      await speak(t, { lang: o.lang, slow, key: `pron:${t}` });
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Die Sprachausgabe ist fehlgeschlagen.');
    } finally {
      if (mountedRef.current) setPlaying((p) => (p === 'model' ? null : p));
    }
  }, []);

  const playRecording = useCallback(async () => {
    const blob = latest.current.recording;
    const s = statusRef.current;
    if (!blob || s === 'listening' || s === 'recording') return;
    stopSpeaking();
    setPlaying('recording');
    try {
      await playBlob(blob);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : 'Die Aufnahme kann nicht abgespielt werden.');
    } finally {
      if (mountedRef.current) setPlaying((p) => (p === 'recording' ? null : p));
    }
  }, []);

  // ── Aufnahme beenden → Selbstvergleich ──
  const finishRecording = useCallback((run: number) => {
    if (finishingRef.current || run !== runRef.current) return;
    finishingRef.current = true;
    setStatus('evaluating');
    setLevel(0);
    stopRecording()
      .then((blob) => {
        if (run !== runRef.current || !mountedRef.current) return;
        setRecording(blob);
        const id = latest.current.opts.itemId;
        if (id) rememberRecording(id, blob);
        setStatus('self-rating');
      })
      .catch((e: unknown) => {
        if (run !== runRef.current || !mountedRef.current) return;
        fail(e instanceof Error ? e.message : 'Die Aufnahme ist fehlgeschlagen.');
      });
  }, [fail, setStatus]);

  // ── Start ──
  const start = useCallback(() => {
    const s = statusRef.current;
    if (s === 'listening' || s === 'recording' || s === 'evaluating') return;
    const { target: t, opts: o } = latest.current;
    const sup = computeSupport();
    let m = latest.current.mode;
    if (!sup.modes.includes(m)) {
      m = pickMode(undefined, sup);
      setModeState(m);
    }
    const run = ++runRef.current;
    finishingRef.current = false;
    stopPlaybackAll();
    setError(null);
    setResult(null);
    setInterim('');
    setLevel(0);

    if (m === 'speech-recognition') {
      setRecording(null);
      setStatus('listening');
      listen({
        lang: o.lang,
        maxAlternatives: 5,
        timeoutMs: o.maxDurationMs ?? 8000,
        onInterim: (text) => {
          if (run === runRef.current && mountedRef.current) setInterim(text);
        },
      })
        .then((res) => {
          if (run !== runRef.current || !mountedRef.current) return;
          setStatus('evaluating');
          const score = scorePronunciation(t, res.transcripts, { lang: o.lang, issueCodes: o.issueCodes });
          emitResult({ ...score, method: 'speech-recognition', transcripts: res.transcripts });
        })
        .catch((e: unknown) => {
          if (run !== runRef.current || !mountedRef.current) return;
          if (e instanceof SttError) {
            if (e.code === 'aborted') {
              setStatus('idle');
              return;
            }
            if (e.retryable) {
              fail(e.message);
              return;
            }
            // Nicht behebbar → auf den nächsten Weg wechseln und ehrlich sagen, warum
            const next: PronCheckMode = !e.micBlocked && recorderSupport().available ? 'recording' : 'listen-only';
            setModeState(next);
            fail(
              `${e.message} ${next === 'recording'
                ? 'Stattdessen kannst du dich aufnehmen und selbst mit dem Vorbild vergleichen.'
                : 'Stattdessen kannst du das Vorbild anhören, laut nachsprechen und dich selbst einschätzen.'}`,
            );
            return;
          }
          fail('Die Spracherkennung ist unerwartet fehlgeschlagen. Bitte noch einmal versuchen.');
        });
      return;
    }

    if (m === 'recording') {
      setRecording(null);
      setStatus('recording');
      const p = startRecording({
        maxDurationMs: o.maxDurationMs ?? 12000,
        onLevel: (l) => {
          const now = performance.now();
          if (now - levelAt.current < 80 || run !== runRef.current || !mountedRef.current) return;
          levelAt.current = now;
          setLevel(Math.round(l * 20) / 20);
        },
        onAutoStop: () => finishRecording(run),
      });
      recStartRef.current = p;
      p.catch((e: unknown) => {
        if (run !== runRef.current || !mountedRef.current) return;
        if (e instanceof RecorderError && e.code !== 'mic-busy' && e.code !== 'failed') {
          setModeState('listen-only');
          fail(`${e.message} Stattdessen kannst du das Vorbild anhören, laut nachsprechen und dich selbst einschätzen.`);
          return;
        }
        fail(e instanceof Error ? e.message : 'Die Aufnahme konnte nicht gestartet werden.');
      });
      return;
    }

    // listen-only: Vorbild abspielen (Geste → auch auf iOS erlaubt), dann selbst einschätzen
    setRecording(null);
    setStatus('self-rating');
    if (ttsSupported()) void playModel(false);
  }, [emitResult, fail, finishRecording, playModel, setStatus, stopPlaybackAll]);

  // ── Stopp / Abbruch ──
  const stop = useCallback(() => {
    const s = statusRef.current;
    if (s === 'listening') {
      setStatus('evaluating');
      stopListening();
      return;
    }
    if (s === 'recording') {
      const run = runRef.current;
      const p = recStartRef.current;
      if (p) void p.then(() => finishRecording(run), () => undefined);
      else finishRecording(run);
      return;
    }
    stopPlaybackAll();
  }, [finishRecording, setStatus, stopPlaybackAll]);

  const cancel = useCallback(() => {
    const s = statusRef.current;
    runRef.current++;
    finishingRef.current = false;
    if (s === 'listening' || s === 'evaluating') abortListening();
    if (s === 'recording' || s === 'evaluating') {
      const p = recStartRef.current;
      cancelRecording();
      // Falls der Mikrofonzugriff gerade erst gewährt wird: danach sofort wieder freigeben
      if (p) void p.then(() => cancelRecording(), () => undefined);
    }
    recStartRef.current = null;
    stopPlaybackAll();
    setInterim('');
    setLevel(0);
    if (s !== 'result') setStatus('idle');
  }, [setStatus, stopPlaybackAll]);

  const reset = useCallback(() => {
    cancel();
    setResult(null);
    setError(null);
    setRecording(null);
    setStatus('idle');
  }, [cancel, setStatus]);

  const selfRate = useCallback((rating: SelfRating) => {
    const s = statusRef.current;
    const prev = latest.current;
    const canRate = s === 'self-rating' || (s === 'result' && result?.method === 'self-assessment');
    if (!canRate || ![1, 2, 3, 4].includes(rating)) return;
    stopPlaybackAll();
    const codes = prev.opts.issueCodes ?? [];
    const issues = rating <= 2 ? codes.slice(0, 3) : rating === 3 ? codes.slice(0, 1) : [];
    const tips = issues.map((c) => issueTip(c, prev.opts.lang)).filter((x): x is string => !!x);
    emitResult({
      scorePct: rating * 25,
      words: [],
      issues,
      tips,
      notes: [],
      transcript: '',
      ...SELF_SUMMARY[rating],
      method: 'self-assessment',
      transcripts: [],
      selfRating: rating,
    });
  }, [emitResult, result, stopPlaybackAll]);

  const setMode = useCallback((m: PronCheckMode) => {
    const s = statusRef.current;
    if (s === 'listening' || s === 'recording' || s === 'evaluating') return;
    if (!computeSupport().modes.includes(m)) return;
    setModeState(m);
    setError(null);
    if (s === 'error' || s === 'self-rating') setStatus('idle');
  }, [setStatus]);

  // Neues Ziel/Sprache → frisch beginnen
  const key = `${opts.lang}\u0000${target}`;
  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current !== key) {
      prevKey.current = key;
      reset();
    }
  }, [key, reset]);

  // Aufräumen beim Verlassen: Mikrofon freigeben, Wiedergabe stoppen, Aufnahme verwerfen
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const s = statusRef.current;
      runRef.current++;
      if (s === 'listening' || s === 'evaluating') abortListening();
      if (s === 'recording' || s === 'evaluating') {
        cancelRecording();
        const p = recStartRef.current;
        if (p) void p.then(() => cancelRecording(), () => undefined);
      }
      stopBlobPlayback();
      stopSpeaking();
    };
  }, []);

  const hint = (() => {
    switch (status) {
      case 'listening':
        return interim ? 'Ich höre zu … tippe auf „Fertig“, wenn du fertig bist.' : 'Ich höre zu – sprich jetzt.';
      case 'recording':
        return 'Aufnahme läuft … tippe auf „Stopp“, wenn du fertig bist.';
      case 'evaluating':
        return 'Wird ausgewertet …';
      case 'self-rating':
        return recording
          ? 'Hör dir das Vorbild und deine Aufnahme an – wie nah bist du dran?'
          : 'Hör dir das Vorbild an, sprich laut nach – wie nah warst du dran?';
      case 'result':
        return result?.summary ?? '';
      case 'error':
        return error ?? '';
      default:
        if (mode === 'speech-recognition') return 'Tippe auf „Sprechen“ und sag den Text laut und deutlich.';
        if (mode === 'recording') return 'Tippe auf „Aufnehmen“, sprich den Text und stoppe die Aufnahme. Danach vergleichst du selbst mit dem Vorbild.';
        return 'Hör dir das Vorbild an, sprich laut nach und schätze dich selbst ein.';
    }
  })();

  return {
    status,
    mode,
    setMode,
    support,
    result,
    error,
    hint,
    interim,
    level,
    start,
    stop,
    cancel,
    selfRate,
    playRecording,
    playModel,
    stopPlayback: stopPlaybackAll,
    playing,
    recording,
    hasRecording: recording !== null,
    reset,
  };
}
