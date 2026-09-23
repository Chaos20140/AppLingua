/**
 * Spracherkennung (Web Speech API – (webkit)SpeechRecognition).
 *
 * Ehrlich: `sttSupport()` meldet nur „verfügbar“, wenn die API existiert und der Kontext
 * sicher ist. Fehler werden auf verständliche deutsche Meldungen abgebildet (inkl. iPhone-
 * Eigenheiten: „Siri & Diktieren“, Home-Bildschirm-Modus). Der Ton wird NICHT gespeichert.
 */
import { isBrowser, isIOS, isSecure, isStandalone, normalizeLang } from './env';
import { stopSpeaking } from './tts';

// ───────────────────────── Minimale Typen (lib.dom kennt SpeechRecognition nicht) ─────────────────────────
interface RecAlternative { transcript: string; confidence: number }
interface RecResult { readonly length: number; readonly isFinal: boolean; [i: number]: RecAlternative }
interface RecResultList { readonly length: number; [i: number]: RecResult }
interface RecEvent extends Event { readonly resultIndex: number; readonly results: RecResultList }
interface RecErrorEvent extends Event { readonly error: string; readonly message?: string }
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecEvent) => void) | null;
  onerror: ((e: RecErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (!isBrowser) return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ───────────────────────── Fehler ─────────────────────────
export type SttErrorCode =
  | 'unsupported' | 'insecure' | 'not-allowed' | 'service-not-allowed' | 'standalone-unsupported'
  | 'no-speech' | 'audio-capture' | 'network' | 'language-not-supported' | 'aborted' | 'busy' | 'unknown';

export class SttError extends Error {
  readonly code: SttErrorCode;
  /** true → ein erneuter Versuch kann klappen (z. B. nichts gehört); false → auf Fallback wechseln */
  readonly retryable: boolean;
  /** true → auch das Mikrofon selbst ist nicht nutzbar (Aufnahme-Fallback sinnlos) */
  readonly micBlocked: boolean;
  constructor(code: SttErrorCode, message: string) {
    super(message);
    this.name = 'SttError';
    this.code = code;
    this.retryable = code === 'no-speech' || code === 'aborted' || code === 'busy' || code === 'unknown';
    this.micBlocked = code === 'audio-capture' || (code === 'not-allowed' && !isIOS());
  }
}

const SAFARI_TAB_HINT =
  'Auf dem iPhone funktioniert die Spracherkennung nicht, wenn AppLingua vom Home-Bildschirm gestartet wurde. Öffne AppLingua in einem normalen Safari-Tab (dort liegt dein lokaler Fortschritt getrennt – mit Konto wird er abgeglichen) – oder nutze hier „Aufnehmen & vergleichen“.';

function messageFor(code: SttErrorCode, lang: string): string {
  const ios = isIOS();
  switch (code) {
    case 'unsupported':
      return ios
        ? 'Dieser Browser bietet auf dem iPhone keine Spracherkennung. Öffne AppLingua in Safari – oder nutze „Aufnehmen & vergleichen“.'
        : 'Dein Browser bietet keine Spracherkennung (z. B. Firefox). In Safari, Chrome oder Edge funktioniert sie – oder nutze „Aufnehmen & vergleichen“.';
    case 'insecure':
      return 'Spracherkennung ist nur über eine sichere Verbindung (https) möglich.';
    case 'not-allowed':
      return ios
        ? 'Der Zugriff auf Mikrofon oder Spracherkennung wurde verweigert. Erlaube ihn unter Einstellungen → Safari → Mikrofon (bzw. über „aA“ → Website-Einstellungen) und versuche es erneut.'
        : 'Der Mikrofonzugriff wurde verweigert. Erlaube ihn über das Schloss-Symbol in der Adressleiste und versuche es erneut.';
    case 'service-not-allowed':
      if (ios && isStandalone()) return SAFARI_TAB_HINT;
      return ios
        ? 'Die Spracherkennung ist auf diesem iPhone abgeschaltet. Aktiviere „Siri & Diktieren“: Einstellungen → Allgemein → Tastatur → „Diktierfunktion aktivieren“ (und ggf. Einstellungen → Bildschirmzeit → Beschränkungen → Siri & Diktieren erlauben).'
        : 'Der Browser erlaubt die Spracherkennung hier nicht. Prüfe die Website-Berechtigungen oder nutze „Aufnehmen & vergleichen“.';
    case 'standalone-unsupported':
      return SAFARI_TAB_HINT;
    case 'no-speech':
      return `Es wurde keine Sprache erkannt. Sprich direkt nach dem Start deutlich und etwas lauter – nah am Mikrofon.${ios && isStandalone() ? ` ${SAFARI_TAB_HINT}` : ''}`;
    case 'audio-capture':
      return 'Kein Mikrofon gefunden oder es wird gerade von einer anderen App benutzt (z. B. Anruf, Sprachmemo).';
    case 'network':
      return 'Die Spracherkennung dieses Browsers braucht eine Internetverbindung (manche Browser wie Brave blockieren sie ganz). Prüfe deine Verbindung oder nutze „Aufnehmen & vergleichen“.';
    case 'language-not-supported':
      return `Die Spracherkennung unterstützt „${lang}“ auf diesem Gerät nicht. Auf dem iPhone hilft es, die Diktiersprache hinzuzufügen: Einstellungen → Allgemein → Tastatur → Tastaturen → Tastatur hinzufügen.`;
    case 'aborted':
      return 'Die Erkennung wurde abgebrochen.';
    case 'busy':
      return 'Die Spracherkennung ist gerade beschäftigt. Bitte einen Moment warten und erneut versuchen.';
    default:
      return 'Die Spracherkennung ist unerwartet fehlgeschlagen. Bitte noch einmal versuchen.';
  }
}

function sttError(code: SttErrorCode, lang: string) {
  return new SttError(code, messageFor(code, lang));
}

function mapBrowserError(err: string): SttErrorCode {
  switch (err) {
    case 'not-allowed':
      return 'not-allowed';
    case 'service-not-allowed':
      return isIOS() && isStandalone() ? 'standalone-unsupported' : 'service-not-allowed';
    case 'no-speech':
      return 'no-speech';
    case 'audio-capture':
      return 'audio-capture';
    case 'network':
      return 'network';
    case 'language-not-supported':
    case 'bad-grammar':
      return 'language-not-supported';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

// ───────────────────────── Unterstützung ─────────────────────────
export interface SttSupport {
  available: boolean;
  /** deutscher Grund, falls nicht verfügbar */
  reason?: string;
  code?: SttErrorCode;
  /** Hinweis bei eingeschränkter Unterstützung (z. B. iPhone-Home-Bildschirm-Modus) */
  warning?: string;
}

/** Sitzungsweite Sperre nach einem nicht behebbaren Fehler (spart wiederholte Fehlversuche). */
let sessionBlock: SttError | null = null;

export function sttSupport(): SttSupport {
  if (!recognitionCtor()) return { available: false, code: 'unsupported', reason: messageFor('unsupported', '') };
  if (!isSecure()) return { available: false, code: 'insecure', reason: messageFor('insecure', '') };
  if (sessionBlock) return { available: false, code: sessionBlock.code, reason: sessionBlock.message };
  if (isIOS() && isStandalone()) return { available: true, warning: SAFARI_TAB_HINT };
  return { available: true };
}

/** Hebt die sitzungsweite Sperre auf (z. B. nachdem der Nutzer eine Berechtigung erteilt hat). */
export function resetSttBlock(): void {
  sessionBlock = null;
}

// ───────────────────────── Erkennung ─────────────────────────
export interface ListenOptions {
  lang: string;
  /** Standard 5 */
  maxAlternatives?: number;
  /** Maximale Gesamtdauer (Standard 8000 ms) */
  timeoutMs?: number;
  /** Stille nach erkannter Sprache, nach der automatisch beendet wird (Standard 1600 ms) */
  silenceMs?: number;
  onStart?: () => void;
  onSpeechStart?: () => void;
  /** Zwischenstand (live) */
  onInterim?: (text: string) => void;
}

export interface ListenResult {
  /** Hypothesen, beste zuerst (dedupliziert) */
  transcripts: string[];
  /** 0..1, falls der Browser sie liefert (Safari meldet oft 0 → undefined) */
  confidence?: number;
}

interface Session {
  rec: Recognition;
  settle: (r: ListenResult | SttError) => void;
}
let active: Session | null = null;

function collect(results: RecResultList, maxAlt: number): ListenResult {
  const segs: string[][] = [];
  let conf: number | undefined;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const alts: string[] = [];
    for (let j = 0; j < r.length; j++) {
      const t = (r[j]?.transcript ?? '').trim();
      if (t && !alts.includes(t)) alts.push(t);
      if (i === 0 && j === 0 && r[j]?.confidence > 0) conf = r[j].confidence;
    }
    if (alts.length) segs.push(alts);
  }
  if (!segs.length) return { transcripts: [] };
  const best = segs.map((s) => s[0]);
  const out = [best.join(' ')];
  // Varianten: je Segment eine Alternative einsetzen
  for (let i = 0; i < segs.length && out.length < maxAlt * 2; i++) {
    for (let j = 1; j < segs[i].length && out.length < maxAlt * 2; j++) {
      const v = best.slice();
      v[i] = segs[i][j];
      const t = v.join(' ');
      if (!out.includes(t)) out.push(t);
    }
  }
  return { transcripts: out.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean), confidence: conf };
}

/**
 * Hört einmal zu und liefert die erkannten Hypothesen.
 * Muss durch eine Nutzer-Geste ausgelöst werden. Lehnt mit `SttError` ab.
 */
export function listen(opts: ListenOptions): Promise<ListenResult> {
  const lang = normalizeLang(opts.lang);
  const support = sttSupport();
  const Ctor = recognitionCtor();
  if (!support.available || !Ctor) {
    return Promise.reject(sessionBlock ?? sttError(support.code ?? 'unsupported', lang));
  }
  abortListening();
  stopSpeaking(); // sonst hört das Mikrofon die Sprachausgabe mit

  const maxAlt = Math.max(1, Math.min(10, opts.maxAlternatives ?? 5));
  const timeoutMs = opts.timeoutMs ?? 8000;
  const silenceMs = opts.silenceMs ?? 1600;

  return new Promise<ListenResult>((resolve, reject) => {
    let rec: Recognition;
    try {
      rec = new Ctor();
    } catch {
      reject(sttError('unsupported', lang));
      return;
    }
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = maxAlt;

    let last: ListenResult = { transcripts: [] };
    let error: SttError | null = null;
    let settled = false;
    let stopping = false;
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;
    let endGuard: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      clearTimeout(overall);
      clearTimeout(silenceTimer);
      clearTimeout(endGuard);
      rec.onresult = rec.onerror = rec.onend = rec.onstart = rec.onspeechstart = rec.onaudiostart = null;
      if (active?.rec === rec) {
        active = null;
        stopActive = null;
      }
    };

    const settle = (r: ListenResult | SttError) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (r instanceof SttError) {
        if (!r.retryable) sessionBlock = r.code === 'not-allowed' && isIOS() ? null : r;
        reject(r);
      } else resolve(r);
    };

    const finishFromState = () => {
      if (last.transcripts.length) settle(last);
      else if (error) settle(error);
      // Nie gestartet: auf dem iPhone im Home-Bildschirm-Modus typisch
      else if (!started) settle(sttError(isIOS() && isStandalone() ? 'standalone-unsupported' : 'unknown', lang));
      else settle(sttError('no-speech', lang));
    };

    /** Sanft beenden (liefert Endergebnis); falls der Browser kein `end` sendet, selbst abschließen. */
    const gracefulStop = () => {
      if (stopping || settled) return;
      stopping = true;
      try {
        rec.stop();
      } catch {
        /* egal */
      }
      endGuard = setTimeout(() => {
        try {
          rec.abort();
        } catch {
          /* egal */
        }
        finishFromState();
      }, 1500);
    };

    const overall = setTimeout(gracefulStop, timeoutMs);

    let started = false;
    rec.onstart = () => {
      started = true;
      opts.onStart?.();
    };
    rec.onaudiostart = () => {
      started = true;
    };
    rec.onspeechstart = () => opts.onSpeechStart?.();
    rec.onresult = (e: RecEvent) => {
      const r = collect(e.results, maxAlt);
      if (r.transcripts.length) {
        last = r;
        opts.onInterim?.(r.transcripts[0]);
      }
      // Safari beendet teils nicht selbst → nach kurzer Stille abschließen
      clearTimeout(silenceTimer);
      const allFinal = e.results.length > 0 && Array.from({ length: e.results.length }, (_, i) => e.results[i]).every((x) => x.isFinal);
      silenceTimer = setTimeout(gracefulStop, allFinal ? 350 : silenceMs);
    };
    rec.onerror = (e: RecErrorEvent) => {
      const code = mapBrowserError(e.error);
      // „no-speech“/„aborted“ nach bereits erkanntem Text ist kein echter Fehler
      if ((code === 'no-speech' || code === 'aborted') && last.transcripts.length) return;
      error = sttError(code, lang);
      if (code !== 'aborted' && code !== 'no-speech') settle(error);
    };
    rec.onend = () => finishFromState();

    active = {
      rec,
      settle: (r) => {
        if (r instanceof SttError) {
          try {
            rec.abort();
          } catch {
            /* egal */
          }
        }
        settle(r);
      },
    };
    // Für stopListening(): sanft beenden
    stopActive = gracefulStop;

    try {
      rec.start();
    } catch {
      settle(sttError('busy', lang));
    }
  });
}

let stopActive: (() => void) | null = null;

/** Beendet das Zuhören sanft – `listen()` erfüllt mit dem bisher Erkannten. */
export function stopListening(): void {
  if (active && stopActive) stopActive();
}

/** Bricht das Zuhören ab – `listen()` lehnt mit Code 'aborted' ab. */
export function abortListening(): void {
  const a = active;
  if (!a) return;
  active = null;
  stopActive = null;
  a.settle(sttError('aborted', a.rec.lang));
}

export function isListening(): boolean {
  return active !== null;
}
