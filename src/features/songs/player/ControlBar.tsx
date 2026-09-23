/**
 * Fixierte Steuerleiste des Song-Players: Optionen (Tempo, Pause nach Zeile, Schleife, Gesang),
 * Zeitleiste und Transport (Zeile wiederholen/zurück, Play/Pause, Zeile vor, Anzeige).
 * Im Schritt-Modus: Zeile zurück / Zeile anhören / Zeile vor.
 */
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import {
  Mic2, Pause, PauseCircle, Play, Repeat, RotateCcw, SkipBack, SkipForward, SlidersHorizontal, Timer, Volume2, VolumeX,
} from 'lucide-react';
import { Spinner } from '../../../ui';
import { formatTime, spokenTime } from './timeline';
import { cx } from './util';
import s from './player.module.css';

export interface ControlBarProps {
  clock: boolean;
  playing: boolean;
  loading: boolean;
  canPlay: boolean;
  timeMs: number;
  durationMs: number;
  lineIdx: number;
  lineCount: number;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onRepeat: () => void;
  /** Schritt-Modus: aktuelle Zeile per Sprachausgabe */
  onSpeakLine?: () => void;
  speaking?: boolean;
  onOpenDisplay: () => void;
  // Optionen
  tempo: number;
  tempoEnabled: boolean;
  tempoReason?: string;
  onTempo: () => void;
  pauseAfterLine: boolean;
  onTogglePauseAfterLine: () => void;
  loopLabel: string | null;
  onOpenLoop: () => void;
  /** nur Demo-Quelle */
  vocals?: boolean;
  onToggleVocals?: () => void;
  /** Mikrofon-Leiste (Mitsingen) */
  micSlot?: ReactNode;
  hidden?: boolean;
}

const tempoLabel = (t: number) => `${t.toLocaleString('de-DE', { minimumFractionDigits: t === 1 ? 1 : 2, maximumFractionDigits: 2 })}×`;

/**
 * Hält `--player-bar-h` am Elternelement aktuell (Platzhalter unter dem Text, schwebende Knöpfe),
 * auch wenn Optionen umbrechen oder die Mikrofon-Leiste erscheint.
 */
function useBarHeight(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    const set = () => host.style.setProperty('--player-bar-h', `${Math.ceil(el.offsetHeight)}px`);
    set();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      host.style.removeProperty('--player-bar-h');
    };
  }, [ref]);
}

export default function ControlBar(p: ControlBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  useBarHeight(barRef);
  const lineLabel = p.lineIdx >= 0 ? `Zeile ${p.lineIdx + 1}/${p.lineCount}` : `Intro · ${p.lineCount} Zeilen`;
  return (
    <div ref={barRef} className={cx(s.bar, p.hidden && s.barHidden)} data-player-bar aria-hidden={p.hidden || undefined}>
      <div className={s.barInner}>
        {p.micSlot}
        {p.clock && (
          <div className={s.pills} role="toolbar" aria-label="Wiedergabe-Optionen">
            <button
              type="button"
              className={cx(s.pill, !p.tempoEnabled && s.pillOff, p.tempo !== 1 && p.tempoEnabled && s.pillOn)}
              onClick={p.onTempo}
              aria-disabled={!p.tempoEnabled || undefined}
              aria-label={p.tempoEnabled ? `Tempo ${tempoLabel(p.tempo)} – tippen zum Ändern` : `Tempo nicht verfügbar: ${p.tempoReason ?? ''}`}
            >
              <Timer size={16} aria-hidden="true" /> {p.tempoEnabled ? `Tempo ${tempoLabel(p.tempo)}` : 'Tempo fix'}
            </button>
            <button type="button" className={cx(s.pill, p.pauseAfterLine && s.pillOn)} aria-pressed={p.pauseAfterLine} onClick={p.onTogglePauseAfterLine}>
              <PauseCircle size={16} aria-hidden="true" /> Pause nach Zeile
            </button>
            <button type="button" className={cx(s.pill, p.loopLabel && s.pillOn)} onClick={p.onOpenLoop} aria-haspopup="dialog">
              <Repeat size={16} aria-hidden="true" /> {p.loopLabel ? `Schleife: ${p.loopLabel}` : 'Schleife'}
            </button>
            {p.onToggleVocals && (
              <button type="button" className={cx(s.pill, p.vocals && s.pillOn)} aria-pressed={!!p.vocals} onClick={p.onToggleVocals}>
                {p.vocals ? <Mic2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />} {p.vocals ? 'Gesang an' : 'Gesang aus'}
              </button>
            )}
          </div>
        )}

        {p.clock ? (
          <div className={s.timeline}>
            <span className={s.time} aria-hidden="true">{formatTime(p.timeMs)}</span>
            <input
              type="range"
              className={s.range}
              min={0}
              max={Math.max(1, Math.round(p.durationMs))}
              step={250}
              value={Math.min(Math.round(p.timeMs), Math.round(p.durationMs))}
              onChange={(e) => p.onSeek(Number(e.target.value))}
              aria-label="Position im Song"
              aria-valuetext={`${spokenTime(p.timeMs)} von ${spokenTime(p.durationMs)}`}
              disabled={!p.canPlay}
              style={{ '--fill': `${p.durationMs ? Math.min(100, (p.timeMs / p.durationMs) * 100) : 0}%` } as CSSProperties}
            />
            <span className={s.time} aria-hidden="true">{formatTime(p.durationMs)}</span>
          </div>
        ) : (
          <p className={s.stepInfo} aria-live="polite">{lineLabel} · Schritt-Modus</p>
        )}

        <div className={s.transport}>
          {p.clock ? (
            <button type="button" className={s.tBtn} onClick={p.onRepeat} disabled={!p.canPlay} aria-label="Zeile wiederholen">
              <RotateCcw size={22} aria-hidden="true" />
            </button>
          ) : <span className={s.tSpacer} aria-hidden="true" />}
          <button type="button" className={s.tBtn} onClick={p.onPrev} disabled={(p.clock && !p.canPlay) || p.lineIdx <= 0} aria-label="Zeile zurück">
            <SkipBack size={24} aria-hidden="true" />
          </button>
          {p.clock ? (
            <button
              type="button"
              className={cx(s.tMain, p.playing && s.tMainOn)}
              onClick={p.onToggle}
              disabled={!p.canPlay}
              aria-label={p.playing ? 'Pause' : 'Abspielen'}
            >
              {p.loading ? <Spinner size={26} label="Lädt …" /> : p.playing ? <Pause size={30} aria-hidden="true" /> : <Play size={30} aria-hidden="true" className={s.playIcon} />}
            </button>
          ) : (
            <button
              type="button"
              className={cx(s.tMain, p.speaking && s.tMainOn)}
              onClick={p.onSpeakLine}
              disabled={!p.onSpeakLine}
              aria-label={p.speaking ? 'Vorlesen stoppen' : 'Zeile anhören'}
            >
              {p.speaking ? <Pause size={28} aria-hidden="true" /> : <Volume2 size={28} aria-hidden="true" />}
            </button>
          )}
          <button type="button" className={s.tBtn} onClick={p.onNext} disabled={p.clock && (!p.canPlay || p.lineIdx >= p.lineCount - 1)} aria-label={!p.clock && p.lineIdx >= p.lineCount - 1 ? 'Song abschließen' : 'Zeile vor'}>
            <SkipForward size={24} aria-hidden="true" />
          </button>
          <button type="button" className={s.tBtn} onClick={p.onOpenDisplay} aria-label="Anzeige & Übung einstellen" aria-haspopup="dialog">
            <SlidersHorizontal size={22} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
