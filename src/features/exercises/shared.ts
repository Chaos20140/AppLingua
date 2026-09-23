/** Gemeinsame Typen und Helfer der Übungs-Komponenten. */
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { CourseId, ExerciseContext, Variant } from '../../core/types';
import type { Exercise, ExerciseType } from '../../content/types';
import type { AnswerMap, ExerciseOutcome } from '../../engine/grading';
import { hashString, seededShuffle } from '../../engine/text';

export type ExOf<T extends ExerciseType> = Extract<Exercise, { type: T }>;

export interface ExEnv {
  courseId: CourseId;
  variant: Variant;
  context: ExerciseContext;
  refId?: string;
  examMode: boolean;
  /** BCP-47 der Sprachausgabe/Erkennung ('es-ES' | 'es-MX' | 'pt-BR') */
  lang: string;
  base: 'es' | 'pt';
  /** Hörtexte automatisch abspielen (Einstellung + bereits erfolgte Nutzer-Geste) */
  autoplay: boolean;
  showIpa: boolean;
}

export interface BodyProps<T extends ExerciseType> {
  ex: ExOf<T>;
  env: ExEnv;
  /** nach „Prüfen“/„Abgeben“: keine Änderungen mehr */
  locked: boolean;
  /** Ergebnis (nur außerhalb des Prüfungsmodus, sonst null) */
  outcome: ExerciseOutcome | null;
  setAnswer: (answer: AnswerMap[T] | null) => void;
  /** prüfen (Enter); optional direkt mit einer Antwort */
  submit: (answer?: AnswerMap[T]) => void;
}

/**
 * Deterministisch mischen (per Übungs-ID). Ergibt das Mischen zufällig die Originalreihenfolge,
 * wird rotiert – sonst wäre z. B. ein Satzbau schon gelöst.
 */
export function shuffleFor<T>(items: readonly T[], seed: string, same: (a: T, b: T) => boolean = Object.is): T[] {
  const out = seededShuffle(items, seed);
  if (out.length > 1 && out.every((v, i) => same(v, items[i]))) out.push(out.shift() as T);
  return out;
}

export function pickBy<T>(list: readonly T[], seed: string): T {
  return list[hashString(seed) % list.length];
}

// ── Nutzer-Geste (für Autoplay: Safari erlaubt Audio erst nach einer Geste) ──
let gestured = false;
if (typeof window !== 'undefined') {
  const mark = () => { gestured = true; };
  window.addEventListener('pointerdown', mark, { once: true, capture: true });
  window.addEventListener('keydown', mark, { once: true, capture: true });
}
export function hasUserGesture(): boolean {
  if (gestured) return true;
  const ua = (typeof navigator !== 'undefined' ? (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation : undefined);
  return !!ua?.hasBeenActive;
}

export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return true;
  const m = document.documentElement.getAttribute('data-motion');
  if (m === 'reduce') return true;
  if (m === 'full') return false;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function isTextInput(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return !el.readOnly && ['text', 'search', ''].includes(el.type);
  return false;
}

/** Eingabefeld nach dem Öffnen der Tastatur in die Bildschirmmitte holen (iPhone). */
export function scrollFieldIntoView(el: HTMLElement) {
  window.setTimeout(() => {
    if (document.activeElement !== el) return;
    el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, 320);
}

/** Enter (ohne IME-Komposition) → Callback. */
export function onEnter(fn: () => void) {
  return (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey) {
      e.preventDefault();
      fn();
    }
  };
}

/** Gemeinsame Eingabe-Attribute für Zielsprache (keine Autokorrektur, keine Rechtschreibprüfung). */
export function targetInputProps(lang: string, capitalize: 'off' | 'sentences' = 'off') {
  return {
    lang,
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: capitalize,
    spellCheck: false,
    enterKeyHint: 'done' as const,
  };
}

export const TYPE_LABEL: Record<ExerciseType, string> = {
  mc: 'Auswahl',
  cloze: 'Lückentext',
  order: 'Satzbau',
  translate: 'Übersetzen',
  freeText: 'Freies Schreiben',
  listening: 'Hörverstehen',
  dictation: 'Diktat',
  speak: 'Nachsprechen',
  minimalPair: 'Genau hinhören',
  fixError: 'Fehler finden',
  dialogue: 'Dialog',
  situation: 'Situation',
  imageMatch: 'Bilder zuordnen',
  matchPairs: 'Paare finden',
  conjugate: 'Verbform',
  speakFree: 'Freies Sprechen',
  aiChat: 'Gespräch',
};

export const PRAISE = [
  'Richtig!', 'Genau so!', 'Stark!', 'Sehr gut!', 'Sitzt!', 'Perfekt!', 'Klasse gemacht!', 'Treffer!', 'Sauber gelöst!', 'Ganz genau!',
];
export const ENCOURAGE = [
  'Nicht ganz – so geht’s',
  'Fast! Hier ist der Knackpunkt',
  'Knapp daneben – das lernst du jetzt',
  'Kein Problem – Fehler sind Lernchancen',
  'Gute Lernchance – schau kurz hin',
];

/** Übungstypen mit Texteingabe in der Zielsprache (→ Akzent-Leiste). */
export function needsAccentBar(ex: Exercise): boolean {
  switch (ex.type) {
    case 'translate': return ex.direction === 'toTarget';
    case 'cloze': case 'dictation': case 'fixError': case 'conjugate': case 'freeText': case 'speakFree': return true;
    case 'dialogue': return !(ex.options && typeof ex.answer === 'number');
    default: return false;
  }
}

/** Ist die richtige Lösung Zielsprache (→ „Anhören“ in der Erklärung)? */
export function solutionIsTarget(ex: Exercise): boolean {
  if (ex.type === 'translate') return ex.direction === 'toTarget';
  return !['imageMatch', 'matchPairs', 'aiChat'].includes(ex.type);
}
