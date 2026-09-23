/** Kachel-Übungen: Satzbau (order) und Wortbank (für translate/cloze). */
import { useMemo, useState } from 'react';
import { joinTokens } from '../../engine/text';
import { cx } from './cx';
import { shuffleFor, type BodyProps } from './shared';
import s from './ex.module.css';

export interface TileBuilderProps {
  /** Kacheln (bereits gemischt) */
  tiles: string[];
  /** gewählte Kachel-Indizes in Reihenfolge */
  value: number[];
  onChange: (value: number[]) => void;
  locked: boolean;
  /** nach dem Prüfen: Zeile grün/rot */
  result?: 'ok' | 'bad' | null;
  lang: string;
  label: string;
}

/** Kacheln antippen → Satz bauen; im Satz antippen → zurück. Freie Plätze bleiben als Schatten stehen. */
export function TileBuilder({ tiles, value, onChange, locked, result, lang, label }: TileBuilderProps) {
  const used = new Set(value);
  const sentence = joinTokens(value.map((i) => tiles[i]));
  return (
    <div className={s.tiles}>
      <div
        className={cx(s.tileLine, result === 'ok' && s.tileLineOk, result === 'bad' && s.tileLineBad)}
        aria-label={label}
        role="group"
      >
        {value.length === 0 && <span className={s.tilePlaceholder}>Tippe die Wörter in der richtigen Reihenfolge an</span>}
        {value.map((ti, pos) => (
          <button
            key={`${ti}`}
            type="button"
            className={cx(s.tile, s.tileIn)}
            lang={lang}
            disabled={locked}
            aria-label={`„${tiles[ti]}“ entfernen (Position ${pos + 1})`}
            onClick={() => onChange(value.filter((v) => v !== ti))}
          >
            {tiles[ti]}
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">{sentence ? `Dein Satz: ${sentence}` : ''}</p>
      <div className={s.tilePool} role="group" aria-label="Verfügbare Wörter">
        {tiles.map((t, i) => (used.has(i) ? (
          <span key={i} className={cx(s.tile, s.tileGhost)} aria-hidden>{t}</span>
        ) : (
          <button
            key={i}
            type="button"
            className={s.tile}
            lang={lang}
            disabled={locked}
            data-enter-check
            aria-label={`„${t}“ hinzufügen`}
            onClick={() => onChange([...value, i])}
          >
            {t}
          </button>
        )))}
      </div>
    </div>
  );
}

export function OrderBody({ ex, env, locked, outcome, setAnswer }: BodyProps<'order'>) {
  const tiles = useMemo(() => shuffleFor([...ex.tokens, ...(ex.extra ?? [])], ex.id), [ex]);
  const [value, setValue] = useState<number[]>([]);
  const change = (v: number[]) => {
    setValue(v);
    setAnswer(v.length ? v.map((i) => tiles[i]) : null);
  };
  return (
    <>
      <div className={s.promptCard}>
        <p className={s.promptGerman}>{ex.german}</p>
      </div>
      <TileBuilder
        tiles={tiles} value={value} onChange={change} locked={locked} lang={env.lang}
        result={locked && outcome ? (outcome.correct ? 'ok' : 'bad') : null} label="Dein Satz"
      />
    </>
  );
}
