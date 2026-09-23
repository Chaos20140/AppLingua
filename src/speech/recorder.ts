/**
 * Mikrofonaufnahme (MediaRecorder) für „Aufnehmen & vergleichen“.
 *
 * - MIME-Erkennung: Safari/iOS → audio/mp4, sonst audio/webm;codecs=opus (mit Fallbacks).
 * - Mikrofon-Tracks werden nach jeder Aufnahme gestoppt (Aufnahme-Symbol verschwindet).
 * - Objekt-URLs für die Wiedergabe werden nach dem Abspielen wieder freigegeben.
 * - Aufnahmen werden NICHT gespeichert. Nur mit `settings.storeRecordings` liefert
 *   `toStorableRecording()` einen speicherbaren Datensatz (die Feature-Seite legt ihn ab);
 *   `rememberRecording()` hält ihn sonst höchstens für diese Sitzung im Arbeitsspeicher.
 */
import type { CourseId } from '../core/types';
import { getAudioContext, resumeAudioContext } from './audioContext';
import { isBrowser, isIOS, isSafariLike, isSecure, speechSettings } from './env';
import { stopSpeaking } from './tts';

export type RecorderErrorCode =
  | 'unsupported' | 'insecure' | 'not-allowed' | 'no-microphone' | 'mic-busy'
  | 'empty' | 'not-recording' | 'playback-blocked' | 'failed';

export class RecorderError extends Error {
  readonly code: RecorderErrorCode;
  constructor(code: RecorderErrorCode, message?: string) {
    super(message ?? recorderMessage(code));
    this.name = 'RecorderError';
    this.code = code;
  }
}

function recorderMessage(code: RecorderErrorCode): string {
  switch (code) {
    case 'unsupported':
      return isIOS()
        ? 'Dieses iPhone kann im Browser keine Audioaufnahmen erstellen. Aktualisiere iOS (ab 14.3) – bis dahin kannst du anhören und dich selbst einschätzen.'
        : 'Dein Browser kann keine Audioaufnahmen erstellen. Nutze einen aktuellen Safari, Chrome, Edge oder Firefox.';
    case 'insecure':
      return 'Das Mikrofon ist nur über eine sichere Verbindung (https) nutzbar.';
    case 'not-allowed':
      return isIOS()
        ? 'Der Mikrofonzugriff wurde verweigert. Erlaube ihn unter Einstellungen → Safari → Mikrofon (oder in Safari über „aA“ → Website-Einstellungen → Mikrofon) und tippe erneut.'
        : 'Der Mikrofonzugriff wurde verweigert. Erlaube ihn über das Schloss-Symbol in der Adressleiste und tippe erneut.';
    case 'no-microphone':
      return 'Es wurde kein Mikrofon gefunden. Schließe ein Mikrofon/Headset an oder prüfe die Systemeinstellungen.';
    case 'mic-busy':
      return 'Das Mikrofon wird gerade von einer anderen App verwendet (z. B. Anruf oder Sprachmemo). Beende sie und versuche es erneut.';
    case 'empty':
      return 'Die Aufnahme ist leer. Bitte noch einmal aufnehmen und etwas länger sprechen.';
    case 'not-recording':
      return 'Es läuft gerade keine Aufnahme.';
    case 'playback-blocked':
      return 'Die Wiedergabe wurde vom Browser blockiert. Tippe erneut auf „Abspielen“.';
    default:
      return 'Die Aufnahme ist fehlgeschlagen. Bitte noch einmal versuchen.';
  }
}

// ───────────────────────── Unterstützung & Format ─────────────────────────
const SAFARI_TYPES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
const OTHER_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];

/** Bestes unterstütztes Aufnahmeformat ('' = Browser-Standard). */
export function pickMimeType(): string {
  if (!isBrowser || typeof MediaRecorder === 'undefined') return '';
  if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
  for (const t of isSafariLike() ? SAFARI_TYPES : OTHER_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* weiter */
    }
  }
  return '';
}

export interface RecorderSupport {
  available: boolean;
  reason?: string;
  code?: RecorderErrorCode;
  mimeType?: string;
}

export function recorderSupport(): RecorderSupport {
  if (!isBrowser || typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    if (isBrowser && !isSecure()) return { available: false, code: 'insecure', reason: recorderMessage('insecure') };
    return { available: false, code: 'unsupported', reason: recorderMessage('unsupported') };
  }
  if (!isSecure()) return { available: false, code: 'insecure', reason: recorderMessage('insecure') };
  return { available: true, mimeType: pickMimeType() || undefined };
}

// ───────────────────────── Aufnahme ─────────────────────────
export interface StartRecordingOptions {
  /** automatisch beenden nach … ms (Standard 15000) */
  maxDurationMs?: number;
  /** Eingangspegel 0..1 (ca. 30×/s) – z. B. für eine Pegelanzeige */
  onLevel?: (level: number) => void;
  /** wird aufgerufen, wenn die Aufnahme wegen `maxDurationMs` endet */
  onAutoStop?: () => void;
}

interface Session {
  stream: MediaStream;
  recorder: MediaRecorder;
  result: Promise<Blob>;
  maxTimer?: ReturnType<typeof setTimeout>;
  stopLevel?: () => void;
  cancelled: boolean;
}

let session: Session | null = null;
/** Ergebnis einer automatisch beendeten Aufnahme, bis `stopRecording()` es abholt */
let autoStopped: Promise<Blob> | null = null;
const durations = new WeakMap<Blob, number>();

function stopTracks(stream: MediaStream) {
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* egal */
    }
  });
}

function mapMediaError(e: unknown): RecorderError {
  const name = (e as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return new RecorderError('not-allowed');
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return new RecorderError('no-microphone');
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return new RecorderError('mic-busy');
  return new RecorderError('failed');
}

async function getMicStream(): Promise<MediaStream> {
  const md = navigator.mediaDevices;
  try {
    return await md.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
  } catch (e) {
    const name = (e as { name?: string })?.name ?? '';
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError' || name === 'TypeError') {
      try {
        return await md.getUserMedia({ audio: true });
      } catch (e2) {
        throw mapMediaError(e2);
      }
    }
    throw mapMediaError(e);
  }
}

function startLevelMeter(stream: MediaStream, onLevel: (l: number) => void): () => void {
  const ctx = getAudioContext();
  if (!ctx) return () => undefined;
  void resumeAudioContext(ctx);
  let source: MediaStreamAudioSourceNode;
  let analyser: AnalyserNode;
  try {
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
  } catch {
    return () => undefined;
  }
  const buf = new Uint8Array(analyser.fftSize);
  let raf = 0;
  let lastEmit = 0;
  const tick = (t: number) => {
    raf = requestAnimationFrame(tick);
    if (t - lastEmit < 33) return;
    lastEmit = t;
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / buf.length);
    onLevel(Math.min(1, rms * 4));
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    try {
      source.disconnect();
      analyser.disconnect();
    } catch {
      /* egal */
    }
  };
}

/**
 * Startet eine Aufnahme (fragt ggf. nach Mikrofonzugriff). Muss aus einer Nutzer-Geste kommen.
 * Wirft `RecorderError` mit deutscher Meldung.
 */
export async function startRecording(opts: StartRecordingOptions = {}): Promise<void> {
  const support = recorderSupport();
  if (!support.available) throw new RecorderError(support.code ?? 'unsupported');
  cancelRecording();
  autoStopped = null;
  stopPlayback();
  stopSpeaking();

  const stream = await getMicStream();
  const mime = support.mimeType ?? '';
  let recorder: MediaRecorder;
  try {
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 }) : new MediaRecorder(stream);
  } catch {
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      stopTracks(stream);
      throw new RecorderError('unsupported');
    }
  }

  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let resolve!: (b: Blob) => void;
  let reject!: (e: RecorderError) => void;
  const result = new Promise<Blob>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Unbehandelte Ablehnungen vermeiden, falls niemand stopRecording() aufruft
  result.catch(() => undefined);

  const s: Session = { stream, recorder, result, cancelled: false };

  const finalize = () => {
    clearTimeout(s.maxTimer);
    s.stopLevel?.();
    stopTracks(stream);
    if (session === s) session = null;
    if (s.cancelled) {
      reject(new RecorderError('not-recording', 'Die Aufnahme wurde abgebrochen.'));
      return;
    }
    const type = recorder.mimeType || mime || chunks[0]?.type || (isSafariLike() ? 'audio/mp4' : 'audio/webm');
    const blob = new Blob(chunks, { type });
    if (blob.size === 0) {
      reject(new RecorderError('empty'));
      return;
    }
    durations.set(blob, Date.now() - startedAt);
    resolve(blob);
  };

  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.onstop = finalize;
  recorder.onerror = () => {
    clearTimeout(s.maxTimer);
    s.stopLevel?.();
    stopTracks(stream);
    if (session === s) session = null;
    reject(new RecorderError('failed'));
  };

  try {
    recorder.start();
  } catch {
    stopTracks(stream);
    throw new RecorderError('failed');
  }
  session = s;
  if (opts.onLevel) s.stopLevel = startLevelMeter(stream, opts.onLevel);
  s.maxTimer = setTimeout(() => {
    if (session !== s) return;
    autoStopped = result;
    try {
      recorder.stop();
    } catch {
      finalize();
    }
    opts.onAutoStop?.();
  }, Math.max(1000, opts.maxDurationMs ?? 15000));
}

/** Beendet die Aufnahme und liefert das Audio (Blob). */
export function stopRecording(): Promise<Blob> {
  const s = session;
  if (s) {
    if (s.recorder.state !== 'inactive') {
      try {
        s.recorder.requestData?.();
      } catch {
        /* egal */
      }
      try {
        s.recorder.stop();
      } catch {
        return Promise.reject(new RecorderError('failed'));
      }
    }
    autoStopped = null;
    return s.result;
  }
  if (autoStopped) {
    const r = autoStopped;
    autoStopped = null;
    return r;
  }
  return Promise.reject(new RecorderError('not-recording'));
}

/** Bricht die Aufnahme ohne Ergebnis ab und gibt das Mikrofon frei. */
export function cancelRecording(): void {
  const s = session;
  autoStopped = null;
  if (!s) return;
  s.cancelled = true;
  session = null;
  try {
    if (s.recorder.state !== 'inactive') s.recorder.stop();
  } catch {
    /* egal */
  }
  clearTimeout(s.maxTimer);
  s.stopLevel?.();
  stopTracks(s.stream);
}

export function isRecording(): boolean {
  return session !== null;
}

/** Dauer einer mit `stopRecording()` erzeugten Aufnahme in ms. */
export function recordingDurationMs(blob: Blob): number | undefined {
  return durations.get(blob);
}

// ───────────────────────── Wiedergabe ─────────────────────────
interface Playback {
  audio: HTMLAudioElement;
  url: string;
  finish: () => void;
}
let playback: Playback | null = null;

/**
 * Spielt eine Aufnahme ab; die Objekt-URL wird danach automatisch freigegeben.
 * Erfüllt am Ende (oder bei `stopPlayback()`); lehnt mit `RecorderError` ab.
 */
export function playBlob(blob: Blob): Promise<void> {
  stopPlayback();
  stopSpeaking();
  if (!isBrowser) return Promise.reject(new RecorderError('failed'));
  const url = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = 'auto';
  return new Promise<void>((resolve, reject) => {
    let done = false;
    const end = (err?: RecorderError) => {
      if (done) return;
      done = true;
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
      } catch {
        /* egal */
      }
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {
        /* egal */
      }
      URL.revokeObjectURL(url);
      if (playback?.audio === audio) playback = null;
      if (err) reject(err);
      else resolve();
    };
    playback = { audio, url, finish: () => end() };
    audio.onended = () => end();
    audio.onerror = () => end(new RecorderError('failed', 'Die Aufnahme kann auf diesem Gerät nicht abgespielt werden.'));
    audio.src = url;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((e: unknown) => {
        const name = (e as { name?: string })?.name;
        if (name === 'AbortError') end();
        else end(new RecorderError(name === 'NotAllowedError' ? 'playback-blocked' : 'failed'));
      });
    }
  });
}

export function stopPlayback(): void {
  playback?.finish();
  playback = null;
}

export function isPlayingBack(): boolean {
  return playback !== null;
}

/** Objekt-URL mit Freigabe-Funktion (z. B. für ein eigenes <audio>-Element). */
export function createRecordingUrl(blob: Blob): { url: string; revoke: () => void } {
  const url = URL.createObjectURL(blob);
  let revoked = false;
  return {
    url,
    revoke: () => {
      if (!revoked) URL.revokeObjectURL(url);
      revoked = true;
    },
  };
}

// ───────────────────────── Speichern (nur mit Einwilligung) ─────────────────────────
/** true, wenn der Nutzer dem lokalen Speichern von Aufnahmen ausdrücklich zugestimmt hat. */
export function recordingStorageAllowed(): boolean {
  return speechSettings().storeRecordings;
}

export interface StorableRecording {
  id: string;
  itemId: string;
  courseId?: CourseId;
  target?: string;
  mimeType: string;
  durationMs?: number;
  sizeBytes: number;
  createdAt: string;
  blob: Blob;
}

/**
 * Bereitet eine Aufnahme zum lokalen Speichern vor – nur, wenn `settings.storeRecordings` aktiv ist,
 * sonst `null`. Die Feature-Seite legt den Datensatz ab (nie in die Cloud).
 */
export function toStorableRecording(
  blob: Blob,
  meta: { itemId: string; courseId?: CourseId; target?: string },
): StorableRecording | null {
  if (!recordingStorageAllowed()) return null;
  const createdAt = new Date().toISOString();
  return {
    id: `${meta.itemId}:${createdAt}`,
    itemId: meta.itemId,
    courseId: meta.courseId,
    target: meta.target,
    mimeType: blob.type || 'audio/mp4',
    durationMs: recordingDurationMs(blob),
    sizeBytes: blob.size,
    createdAt,
    blob,
  };
}

const remembered = new Map<string, Blob>();
const REMEMBER_MAX = 30;

/**
 * Merkt sich die letzte Aufnahme eines Items für diese Sitzung (nur Arbeitsspeicher),
 * aber nur mit Einwilligung (`storeRecordings`). Gibt zurück, ob gemerkt wurde.
 */
export function rememberRecording(itemId: string, blob: Blob): boolean {
  if (!recordingStorageAllowed()) {
    remembered.clear();
    return false;
  }
  remembered.delete(itemId);
  remembered.set(itemId, blob);
  while (remembered.size > REMEMBER_MAX) {
    const oldest = remembered.keys().next().value;
    if (oldest === undefined) break;
    remembered.delete(oldest);
  }
  return true;
}

export function getRememberedRecording(itemId: string): Blob | undefined {
  if (!recordingStorageAllowed()) {
    remembered.clear();
    return undefined;
  }
  return remembered.get(itemId);
}

export function forgetRecordings(): void {
  remembered.clear();
}
