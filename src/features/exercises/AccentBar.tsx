/**
 * Akzent-Leiste über Texteingaben – wichtig fürs iPhone ohne spanische/portugiesische Tastatur.
 * Fügt das Zeichen an der Cursorposition des zuletzt fokussierten Feldes ein, ohne die Tastatur zu schließen.
 */
import { useState, type RefObject } from 'react';
import { ArrowBigUp } from 'lucide-react';
import { cx } from './cx';
import s from './ex.module.css';

export const ACCENTS: Record<'es' | 'pt', string[]> = {
  es: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
  pt: ['á', 'â', 'ã', 'à', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'],
};

type Field = HTMLInputElement | HTMLTextAreaElement;

/** Setzt den Wert so, dass React das onChange-Ereignis erhält. */
export function insertIntoField(el: Field, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, next);
  else el.value = next;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  const caret = start + text.length;
  el.focus({ preventScroll: true });
  try { el.setSelectionRange(caret, caret); } catch { /* einige Typen unterstützen keine Auswahl */ }
}

export interface AccentBarProps {
  base: 'es' | 'pt';
  /** zuletzt fokussiertes Eingabefeld */
  targetRef: RefObject<Field | null>;
}

export function AccentBar({ base, targetRef }: AccentBarProps) {
  const [upper, setUpper] = useState(false);
  const chars = ACCENTS[base];

  const insert = (ch: string) => {
    const el = targetRef.current;
    if (!el || el.readOnly || el.disabled) return;
    const out = upper ? ch.toLocaleUpperCase(base === 'pt' ? 'pt-BR' : 'es') : ch;
    insertIntoField(el, out);
    if (upper) setUpper(false);
  };

  return (
    <div className={s.accentBar} role="toolbar" aria-label="Sonderzeichen einfügen" data-accent-bar>
      <button
        type="button"
        className={cx(s.accentKey, s.accentShift, upper && s.accentShiftOn)}
        aria-pressed={upper}
        aria-label="Großbuchstaben"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => setUpper((u) => !u)}
      >
        <ArrowBigUp aria-hidden />
      </button>
      {chars.map((ch) => {
        const shown = upper && ch !== '¿' && ch !== '¡' ? ch.toLocaleUpperCase() : ch;
        return (
          <button
            key={ch}
            type="button"
            className={s.accentKey}
            aria-label={`${shown} einfügen`}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => insert(ch)}
          >
            {shown}
          </button>
        );
      })}
    </div>
  );
}
