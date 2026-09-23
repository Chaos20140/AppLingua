/**
 * Tap-Sync-Editor für eigene Texte: Während die Musik läuft, bei jedem Zeilenbeginn auf
 * „Nächste Zeile“ tippen. Uhr = eingebetteter Player (YouTube/Spotify) oder eine Stoppuhr,
 * wenn die Musik woanders läuft. Ergebnis: aufsteigende Zeiten je Zeile (ms).
 */
import { useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw, Timer, Undo2, X } from 'lucide-react';
import type { Song } from '../../../content/types';
import { Button } from '../../../ui';
import type { PlaybackSource } from './sources/types';
import { formatTime } from './timeline';
import s from './player.module.css';

export interface TapSyncProps {
  song: Song;
  /** steuerbarer Player (YouTube/Spotify) – sonst Stoppuhr */
  source: PlaybackSource | null;
  onSave: (timings: number[]) => void;
  onCancel: () => void;
}

const MIN_GAP_MS = 250;

export default function TapSync({ song, source, onSave, onCancel }: TapSyncProps) {
  const lines = song.lines;
  const [phase, setPhase] = useState<'intro' | 'running' | 'review'>('intro');
  const [times, setTimes] = useState<number[]>([]);
  const [now, setNow] = useState(0);
  const [paused, setPaused] = useState(false);
  const watch = useRef({ acc: 0, startedAt: 0, running: false });
  const tapRef = useRef<HTMLButtonElement>(null);

  const clock = () => {
    if (source) return source.getTime();
    const w = watch.current;
    return w.running ? w.acc + performance.now() - w.startedAt : w.acc;
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => setNow(clock()), 100);
    return () => window.clearInterval(id);
  }, [phase, source]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'running') tapRef.current?.focus();
  }, [phase]);

  const start = () => {
    setTimes([]);
    setPaused(false);
    if (source) {
      source.seek(0);
      void source.play();
    } else {
      watch.current = { acc: 0, startedAt: performance.now(), running: true };
    }
    setPhase('running');
  };

  const togglePause = () => {
    if (source) {
      if (source.getStatus() === 'playing') { source.pause(); setPaused(true); } else { void source.play(); setPaused(false); }
      return;
    }
    const w = watch.current;
    if (w.running) {
      w.acc += performance.now() - w.startedAt;
      w.running = false;
      setPaused(true);
    } else {
      w.startedAt = performance.now();
      w.running = true;
      setPaused(false);
    }
  };

  const tap = () => {
    const t = Math.round(clock());
    const last = times[times.length - 1];
    if (last !== undefined && t - last < MIN_GAP_MS) return;
    const next = [...times, t];
    setTimes(next);
    if (next.length >= lines.length) {
      if (source) source.pause();
      watch.current.running = false;
      setPhase('review');
    }
  };

  const undo = () => setTimes((t) => t.slice(0, -1));
  const idx = times.length;

  if (phase === 'intro') {
    return (
      <section className={s.panel} aria-label="Zeiten per Tippen erstellen">
        <div className={s.panelHead}><span className={s.panelTitle}><Timer size={18} aria-hidden="true" /> Tap-Sync</span></div>
        <p>So läuft dein Text synchron zur Musik:</p>
        <ol className={s.steps}>
          {source ? (
            <li>Tippe auf „Start“ – der Player oben beginnt von vorn.</li>
          ) : (
            <li>Starte den Song in deiner Musik-App und tippe <strong>gleichzeitig</strong> auf „Start“ (Stoppuhr).</li>
          )}
          <li>Tippe bei jedem Zeilenbeginn auf „Nächste Zeile“ ({lines.length} Zeilen).</li>
          <li>Prüfen, speichern – fertig. Die Zeiten bleiben bei deinem Text.</li>
        </ol>
        <div className={s.actions}>
          <Button variant="ghost" icon={<X size={16} aria-hidden="true" />} onClick={onCancel}>Abbrechen</Button>
          <Button variant="primary" icon={<Play size={16} aria-hidden="true" />} onClick={start} disabled={!lines.length}>Start</Button>
        </div>
      </section>
    );
  }

  if (phase === 'review') {
    return (
      <section className={s.panel} aria-label="Zeiten prüfen">
        <div className={s.panelHead}><span className={s.panelTitle}>Alle {lines.length} Zeilen getippt</span></div>
        <ol className={s.syncList}>
          {lines.map((l, i) => (
            <li key={l.id}><span className={s.syncTime}>{formatTime(times[i] ?? 0)}</span><span lang={song.courseId === 'pt-BR' ? 'pt' : 'es'}>{l.text}</span></li>
          ))}
        </ol>
        <div className={s.actions}>
          <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => setPhase('intro')}>Neu tippen</Button>
          <Button variant="primary" icon={<Check size={16} aria-hidden="true" />} onClick={() => onSave(times)}>Zeiten speichern</Button>
        </div>
      </section>
    );
  }

  return (
    <section className={s.tapSync} aria-label="Tap-Sync läuft">
      <p className={s.tapClock} aria-hidden="true">{formatTime(now)}{paused ? ' · pausiert' : ''}</p>
      <p className={s.muted}>Zeile {Math.min(idx + 1, lines.length)} von {lines.length} – tippe, sobald sie beginnt:</p>
      <p className={s.tapLine} lang={song.courseId === 'pt-BR' ? 'pt' : 'es'} aria-live="polite">{lines[idx]?.text}</p>
      {lines[idx + 1] && <p className={s.tapNext}>danach: {lines[idx + 1].text}</p>}
      <button ref={tapRef} type="button" className={s.tapBtn} onClick={tap} disabled={paused}>
        {idx === 0 ? 'Erste Zeile beginnt' : 'Nächste Zeile'}
      </button>
      <div className={s.actions}>
        <Button variant="secondary" icon={<Undo2 size={16} aria-hidden="true" />} onClick={undo} disabled={!times.length}>Rückgängig</Button>
        <Button variant="secondary" icon={paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />} onClick={togglePause}>
          {paused ? 'Weiter' : 'Pause'}
        </Button>
        <Button variant="ghost" icon={<X size={16} aria-hidden="true" />} onClick={() => { source?.pause(); onCancel(); }}>Abbrechen</Button>
      </div>
    </section>
  );
}
