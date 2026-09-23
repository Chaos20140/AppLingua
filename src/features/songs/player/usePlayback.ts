/**
 * Wiedergabe-Steuerung des Song-Players: verbindet eine PlaybackSource mit der Zeilenlogik
 * (aktuelle Zeile, Pause nach jeder Zeile, Abschnitt-Schleife, „gehörte“ Zeilen) sowie
 * Wake Lock, Hintergrund-Pause und Positionsspeicherung.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SongLine } from '../../../content/types';
import { lineIndexAt, seekTargetFor, type SectionRange } from './timeline';
import type { PlaybackSource, SourceStatus } from './sources/types';

export interface PlaybackOptions {
  lines: readonly SongLine[];
  durationMs: number;
  source: PlaybackSource | null;
  /** false = Schritt-Modus (Zeilen per Hand), Quelle spielt ggf. trotzdem */
  clock: boolean;
  pauseAfterLine: boolean;
  loop: SectionRange | null;
  onLineHeard?: (idx: number) => void;
  onEnded?: () => void;
  onAutoPause?: (idx: number) => void;
}

export interface Playback {
  status: SourceStatus | 'none';
  playing: boolean;
  lineIdx: number;
  /** gedrosselte Zeit für Anzeige/Schieberegler */
  timeMs: number;
  durationMs: number;
  /** nach „Pause nach jeder Zeile“ angehalten an Zeile … */
  heldAt: number | null;
  getTime: () => number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  seekLine: (i: number, opts?: { play?: boolean }) => void;
  next: () => void;
  prev: () => void;
  repeat: () => void;
}

const AUTO_PAUSE_MAX_WAIT_MS = 3500;

export function usePlayback(o: PlaybackOptions): Playback {
  const { source, clock } = o;
  const [status, setStatus] = useState<SourceStatus | 'none'>(source ? source.getStatus() : 'none');
  const [lineIdx, setLineIdx] = useState(-1);
  const [timeMs, setTimeMs] = useState(0);
  const [heldAt, setHeldAt] = useState<number | null>(null);

  const opts = useRef(o);
  opts.current = o;
  const lineRef = useRef(-1);
  const shownTime = useRef(0);
  const prevT = useRef(0);
  const armed = useRef(-1);
  const heldRef = useRef<number | null>(null);

  const setHeld = (v: number | null) => {
    heldRef.current = v;
    setHeldAt(v);
  };

  const getTime = useCallback(() => (source ? source.getTime() : 0), [source]);

  /** Anzeige an die aktuelle Quellzeit angleichen */
  const sync = useCallback((force = false) => {
    if (!source) return;
    const t = source.getTime();
    if (clock) {
      const idx = lineIndexAt(opts.current.lines, t);
      if (idx !== lineRef.current) {
        lineRef.current = idx;
        setLineIdx(idx);
      }
    }
    if (force || Math.abs(t - shownTime.current) >= 250) {
      shownTime.current = t;
      setTimeMs(t);
    }
    return t;
  }, [source, clock]);

  // Status der Quelle beobachten
  useEffect(() => {
    if (!source) {
      setStatus('none');
      return;
    }
    setStatus(source.getStatus());
    const offStatus = source.onStatus((s) => {
      setStatus(s);
      if (s !== 'playing') sync(true);
    });
    const offEnded = source.onEnded(() => opts.current.onEnded?.());
    prevT.current = source.getTime();
    sync(true);
    return () => {
      offStatus();
      offEnded();
    };
  }, [source, sync]);

  const playing = status === 'playing';

  // Uhr: pro Frame Zeile, Pause nach Zeile, Schleife und gehörte Zeilen
  useEffect(() => {
    if (!source || !playing) return;
    let raf = 0;
    prevT.current = source.getTime();
    const frame = () => {
      const cur = opts.current;
      const t = sync() ?? 0;
      const ls = cur.lines;
      const before = prevT.current;
      if (t > before && t - before < 1500) {
        for (let i = 0; i < ls.length; i++) {
          if (ls[i].endMs > before && ls[i].endMs <= t) cur.onLineHeard?.(i);
        }
      }
      prevT.current = t;

      if (cur.clock) {
        const inLine = lineIndexAt(ls, t, 0);
        if (inLine >= 0 && t < ls[inLine].endMs) armed.current = inLine;
        // Pause nach jeder Zeile (Sprachausgabe darf die Zeile zu Ende sprechen)
        if (cur.pauseAfterLine && armed.current >= 0) {
          const line = ls[armed.current];
          const over = t - line.endMs;
          if (over >= -30 && (!source.isBusy?.() || over > AUTO_PAUSE_MAX_WAIT_MS)) {
            const idx = armed.current;
            armed.current = -1;
            source.pause();
            setHeld(idx);
            cur.onAutoPause?.(idx);
            return;
          }
        }
        // Abschnitt-Schleife
        const loop = cur.loop;
        if (loop && t >= loop.endMs + 350 && !source.isBusy?.()) {
          armed.current = -1;
          source.seek(seekTargetFor(ls, loop.firstIdx));
          prevT.current = source.getTime();
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [source, playing, sync]);

  // Zeilenmodus gewechselt → Anzeige neu berechnen
  useEffect(() => {
    lineRef.current = -2;
    sync(true);
  }, [clock, sync]);

  const play = useCallback(() => {
    if (!source) return;
    const ls = opts.current.lines;
    const held = heldRef.current;
    if (held !== null) {
      const loop = opts.current.loop;
      const next = loop && held === loop.lastIdx ? loop.firstIdx : held + 1;
      if (next < ls.length) source.seek(seekTargetFor(ls, next));
      setHeld(null);
    } else if (source.getStatus() === 'ended') {
      source.seek(0);
    }
    armed.current = -1;
    void source.play();
  }, [source]);

  const pause = useCallback(() => {
    source?.pause();
  }, [source]);

  const toggle = useCallback(() => {
    if (!source) return;
    if (source.getStatus() === 'playing') source.pause();
    else play();
  }, [source, play]);

  const seek = useCallback((ms: number) => {
    if (!source) return;
    armed.current = -1;
    setHeld(null);
    source.seek(ms);
    prevT.current = ms;
    sync(true);
  }, [source, sync]);

  const seekLine = useCallback((i: number, so: { play?: boolean } = {}) => {
    if (!source) return;
    const ls = opts.current.lines;
    if (!ls.length) return;
    const idx = Math.max(0, Math.min(ls.length - 1, i));
    seek(seekTargetFor(ls, idx));
    if (so.play && source.getStatus() !== 'playing') void source.play();
  }, [source, seek]);

  const next = useCallback(() => {
    const cur = lineRef.current;
    seekLine(cur < 0 ? 0 : cur + 1, { play: source?.getStatus() === 'playing' });
  }, [seekLine, source]);

  const prev = useCallback(() => {
    const cur = lineRef.current;
    seekLine(Math.max(0, cur - 1), { play: source?.getStatus() === 'playing' });
  }, [seekLine, source]);

  const repeat = useCallback(() => {
    const cur = heldRef.current ?? lineRef.current;
    seekLine(Math.max(0, cur), { play: true });
  }, [seekLine]);

  return {
    status,
    playing,
    lineIdx,
    timeMs,
    durationMs: o.durationMs,
    heldAt,
    getTime,
    play,
    pause,
    toggle,
    seek,
    seekLine,
    next,
    prev,
    repeat,
  };
}

// ───────────────────────── Lebenszyklus: Wake Lock, Hintergrund, Position ─────────────────────────

interface LifecycleOptions {
  playing: boolean;
  pause: () => void;
  /** Position speichern (ms) – wird periodisch, beim Pausieren und beim Verlassen aufgerufen */
  save: () => void;
}

type WakeLockLike = { release: () => Promise<void> };

export function usePlayerLifecycle({ playing, pause, save }: LifecycleOptions) {
  const saveRef = useRef(save);
  saveRef.current = save;
  const pauseRef = useRef(pause);
  pauseRef.current = pause;

  // Wake Lock während der Wiedergabe (falls verfügbar)
  useEffect(() => {
    if (!playing) return;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockLike> } };
    if (!nav.wakeLock) return;
    let lock: WakeLockLike | null = null;
    let cancelled = false;
    nav.wakeLock.request('screen').then((l) => {
      if (cancelled) void l.release().catch(() => undefined);
      else lock = l;
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (lock) void lock.release().catch(() => undefined);
    };
  }, [playing]);

  // Periodisch speichern + beim Pausieren
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => saveRef.current(), 10000);
    return () => {
      window.clearInterval(id);
      saveRef.current();
    };
  }, [playing]);

  // Hintergrund → pausieren; Verlassen → speichern
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        pauseRef.current();
        saveRef.current();
      }
    };
    const onHide = () => saveRef.current();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      saveRef.current();
    };
  }, []);
}
