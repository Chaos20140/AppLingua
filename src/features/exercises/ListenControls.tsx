/** Hörtext abspielen: „Anhören“ (normal) und „Langsam“, Zähler, Autoplay nach Geste, ehrliche Fallbacks. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Snail, Square, Volume2 } from 'lucide-react';
import { useTts } from '../../speech/tts';
import { cx } from './cx';
import s from './ex.module.css';

export interface ListenControlsProps {
  text: string;
  lang: string;
  /** nach dem Mount automatisch einmal abspielen */
  autoPlay?: boolean;
  /** Anzahl der Wiedergaben anzeigen */
  showCount?: boolean;
  /** Ohne Sprachausgabe: Text zum Lesen aufdecken (damit die Übung lösbar bleibt) */
  revealFallback?: boolean;
  size?: 'lg' | 'md';
  label?: string;
}

export function ListenControls({ text, lang, autoPlay, showCount, revealFallback, size = 'lg', label = 'Anhören' }: ListenControlsProps) {
  const tts = useTts();
  const [plays, setPlays] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const keyNormal = `ex:${text}:n`;
  const keySlow = `ex:${text}:s`;
  const busyNormal = tts.speaking && tts.speakingKey === keyNormal;
  const busySlow = tts.speaking && tts.speakingKey === keySlow;

  const play = useCallback((slow: boolean) => {
    const key = slow ? keySlow : keyNormal;
    if (tts.speaking && tts.speakingKey === key) {
      tts.stop();
      return;
    }
    setPlays((n) => n + 1);
    void tts.speak(text, { lang, slow, key });
  }, [keyNormal, keySlow, lang, text, tts]);

  const playRef = useRef(play);
  useEffect(() => { playRef.current = play; });
  useEffect(() => {
    if (!autoPlay) return;
    const t = window.setTimeout(() => playRef.current(false), 450);
    return () => window.clearTimeout(t);
  }, [autoPlay]);

  if (!tts.available) {
    return (
      <div className={s.audioFallback} role="note">
        <p>Die Sprachausgabe ist in diesem Browser nicht verfügbar.</p>
        {revealFallback && (revealed
          ? <p className={s.revealedText} lang={lang}>{text}</p>
          : (
            <button type="button" className={s.linkBtn} onClick={() => setRevealed(true)}>
              <Eye aria-hidden /> Text stattdessen lesen
            </button>
          ))}
      </div>
    );
  }

  const help = tts.missingVoiceHelp(lang);
  return (
    <div className={s.listen}>
      <div className={s.listenRow}>
        <button
          type="button"
          className={cx(s.playBtn, size === 'md' && s.playBtnMd, busyNormal && s.playing)}
          onClick={() => play(false)}
          aria-label={busyNormal ? 'Wiedergabe stoppen' : label}
        >
          {busyNormal ? <Square aria-hidden /> : <Volume2 aria-hidden />}
          {busyNormal && <span className={s.pulse} aria-hidden data-motion-safe />}
        </button>
        <button
          type="button"
          className={cx(s.slowBtn, busySlow && s.playing)}
          onClick={() => play(true)}
          aria-label={busySlow ? 'Wiedergabe stoppen' : 'Langsam anhören'}
        >
          {busySlow ? <Square aria-hidden /> : <Snail aria-hidden />}
          <span>Langsam</span>
        </button>
        {showCount && (
          <span className={s.playCount} aria-live="polite">
            {plays === 0 ? 'Noch nicht gehört' : `${plays}× gehört`}
          </span>
        )}
      </div>
      {tts.error && <p className={s.softNote} role="status">{tts.error}</p>}
      {help && (
        <details className={s.voiceNote}>
          <summary>Hinweis zur Stimme</summary>
          <p>{help}</p>
        </details>
      )}
    </div>
  );
}

/** Kleiner Lautsprecher-Knopf (z. B. neben Lösungen). */
export function SpeakButton({ text, lang, label }: { text: string; lang: string; label?: string }) {
  const tts = useTts();
  if (!tts.available || !text) return null;
  const key = `sb:${text}`;
  const busy = tts.speaking && tts.speakingKey === key;
  return (
    <button
      type="button"
      className={cx(s.speakBtn, busy && s.playing)}
      aria-label={busy ? 'Wiedergabe stoppen' : label ?? `„${text}“ anhören`}
      onClick={() => (busy ? tts.stop() : void tts.speak(text, { lang, key }))}
    >
      {busy ? <Square aria-hidden /> : <Volume2 aria-hidden />}
    </button>
  );
}

/** Sprechfunktion für RichText (`Zielsprache` antippen). */
export function useSpeakFn(lang: string) {
  const tts = useTts();
  const speakRef = useRef(tts.speak);
  useEffect(() => { speakRef.current = tts.speak; });
  return useCallback((text: string) => { void speakRef.current(text, { lang }); }, [lang]);
}
