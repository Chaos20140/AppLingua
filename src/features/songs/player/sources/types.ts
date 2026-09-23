/**
 * Gemeinsame Schnittstelle aller Wiedergabequellen des Song-Players.
 * Zeiten sind immer Song-Zeit in ms (bei Tempo < 1 läuft die Song-Zeit langsamer als die Uhr).
 */
export type SourceKind = 'synth' | 'youtube' | 'spotify';
export type SourceStatus = 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlaybackSource {
  readonly kind: SourceKind;
  /** Tempoänderung möglich? (kann sich nach dem Laden ändern, z. B. YouTube) */
  readonly supportsRate: boolean;
  /** Grund, falls kein Tempo möglich ist (deutsch) */
  readonly rateReason?: string;
  play(): Promise<void>;
  pause(): void;
  seek(ms: number): void;
  getTime(): number;
  setRate(rate: number): void;
  onEnded(cb: () => void): () => void;
  dispose(): void;
  // ── Erweiterungen (Player-intern) ──
  getStatus(): SourceStatus;
  onStatus(cb: (status: SourceStatus) => void): () => void;
  /** Hinweise für die Oberfläche (z. B. „Keine Stimme installiert“) */
  onNotice(cb: (message: string) => void): () => void;
  /** Tempi, die die Quelle tatsächlich kann (Teilmenge von 0.5/0.75/0.9/1) */
  availableRates(): number[];
  /** Dauer in ms, falls von der Quelle bekannt */
  getDuration(): number | null;
  /** true, solange die Quelle noch „nachklingt“ (z. B. Sprachausgabe spricht die Zeile zu Ende) */
  isBusy?(): boolean;
  /** Letzte Fehlermeldung (deutsch) bei Status 'error' */
  readonly error?: string | null;
}

export const PLAYER_RATES = [0.5, 0.75, 0.9, 1] as const;

/** Winziger Ereignisverteiler */
export class Emitter<T> {
  private fns = new Set<(v: T) => void>();
  on(fn: (v: T) => void): () => void {
    this.fns.add(fn);
    return () => { this.fns.delete(fn); };
  }
  emit(v: T) {
    for (const fn of [...this.fns]) {
      try { fn(v); } catch { /* Beobachterfehler nicht weiterreichen */ }
    }
  }
  clear() { this.fns.clear(); }
}

/** Basisklasse: Status-, Ende- und Hinweisverwaltung */
export abstract class BaseSource {
  protected status: SourceStatus = 'loading';
  protected statusEm = new Emitter<SourceStatus>();
  protected endedEm = new Emitter<void>();
  protected noticeEm = new Emitter<string>();
  error: string | null = null;

  getStatus() { return this.status; }
  onStatus(cb: (s: SourceStatus) => void) { return this.statusEm.on(cb); }
  onEnded(cb: () => void) { return this.endedEm.on(cb); }
  onNotice(cb: (m: string) => void) { return this.noticeEm.on(cb); }

  protected setStatus(s: SourceStatus, error?: string) {
    if (error !== undefined) this.error = error;
    if (s === this.status && error === undefined) return;
    this.status = s;
    this.statusEm.emit(s);
    if (s === 'ended') this.endedEm.emit();
  }

  protected clearListeners() {
    this.statusEm.clear();
    this.endedEm.clear();
    this.noticeEm.clear();
  }
}

const scripts = new Map<string, Promise<void>>();

/** Lädt ein externes Skript genau einmal (nur offizielle Anbieter-APIs). */
export function loadScriptOnce(src: string, timeoutMs = 15000): Promise<void> {
  const known = scripts.get(src);
  if (known) return known;
  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    const timer = window.setTimeout(() => reject(new Error('timeout')), timeoutMs);
    el.onload = () => { window.clearTimeout(timer); resolve(); };
    el.onerror = () => { window.clearTimeout(timer); reject(new Error('load')); };
    document.head.appendChild(el);
  });
  // Fehlschläge nicht zwischenspeichern → erneuter Versuch möglich
  p.catch(() => {
    scripts.delete(src);
    document.head.querySelectorAll(`script[src="${CSS.escape(src)}"]`).forEach((n) => n.remove());
  });
  scripts.set(src, p);
  return p;
}
