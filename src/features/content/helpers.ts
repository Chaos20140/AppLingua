/**
 * Reine Hilfsfunktionen für die gemeinsamen Erklär-Renderer (ohne React).
 */
import type { CourseId, Variant } from '../../core/types';
import type { ColoredPart, Role } from '../../content/types';

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'wavy';

export interface RoleMeta {
  label: string;
  /** kurze Funktionserklärung (für Antippen/Legende) */
  hint: string;
  /** Unterstreichungsstil – damit Rollen nicht nur über die Farbe unterscheidbar sind */
  line: LineStyle;
}

export const ROLE_META: Record<Role, RoleMeta> = {
  subject: { label: 'Subjekt', hint: 'wer oder was handelt', line: 'solid' },
  verb: { label: 'Verb', hint: 'Tätigkeit oder Zustand', line: 'double' },
  object: { label: 'Objekt', hint: 'wen oder was', line: 'dashed' },
  article: { label: 'Artikel', hint: 'Begleiter des Nomens', line: 'dotted' },
  noun: { label: 'Nomen', hint: 'Person, Ding oder Ort', line: 'solid' },
  adjective: { label: 'Adjektiv', hint: 'beschreibt ein Nomen', line: 'wavy' },
  adverb: { label: 'Adverb', hint: 'wie, wann oder wo', line: 'dashed' },
  preposition: { label: 'Präposition', hint: 'Verhältniswort wie de, en, a', line: 'dotted' },
  pronoun: { label: 'Pronomen', hint: 'steht für ein Nomen', line: 'double' },
  negation: { label: 'Verneinung', hint: 'macht den Satz negativ', line: 'wavy' },
  question: { label: 'Fragewort', hint: 'leitet die Frage ein', line: 'double' },
  ending: { label: 'Endung', hint: 'zeigt Person oder Zeit', line: 'solid' },
  other: { label: 'Sonstiges', hint: '', line: 'solid' },
};

/** Reihenfolge in Legenden. */
export const ROLE_ORDER: Role[] = [
  'subject', 'verb', 'object', 'article', 'noun', 'adjective', 'adverb',
  'preposition', 'pronoun', 'negation', 'question', 'ending',
];

/** Rollen, die in den Teilen vorkommen (ohne 'other'), in Legendenreihenfolge. */
export function rolesIn(parts: readonly ColoredPart[]): Role[] {
  const used = new Set(parts.map((p) => p.role).filter((r): r is Role => !!r && r !== 'other'));
  return ROLE_ORDER.filter((r) => used.has(r));
}

/** Zerlegt einen Teiltext in führende Leerzeichen, Kern und nachfolgende Leerzeichen. */
export function splitSpaces(text: string): { lead: string; core: string; trail: string } {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  return m ? { lead: m[1], core: m[2], trail: m[3] } : { lead: '', core: text, trail: '' };
}

/**
 * Trennt eine Verbform in Stamm und Endung, z. B. ('hablo', 'o') → { stem: 'habl', ending: 'o' }.
 * Passt die Endung nicht zur Form, wird nichts markiert.
 */
export function splitEnding(form: string, ending?: string): { stem: string; ending: string } {
  const e = (ending ?? '').trim();
  if (!e || e.length > form.length) return { stem: form, ending: '' };
  if (form.toLowerCase().endsWith(e.toLowerCase())) {
    return { stem: form.slice(0, form.length - e.length), ending: form.slice(form.length - e.length) };
  }
  return { stem: form, ending: '' };
}

/** Gilt ein Inhalt mit optionaler `variant` für die Variante des Nutzers? */
export const isForVariant = (itemVariant: Variant | undefined, variant: Variant): boolean =>
  !itemVariant || itemVariant === variant;

export const VARIANT_SHORT: Record<Variant, string> = {
  'es-ES': 'Spanien',
  'es-LA': 'Lateinamerika',
  'pt-BR': 'Brasilien',
};

/** Name der Zielsprache für Überschriften. */
export const targetLanguageName = (variant: Variant): string => (variant === 'pt-BR' ? 'Portugiesisch' : 'Spanisch');

/** BCP-47-Sprache für `lang`-Attribute (Screenreader-Aussprache). */
export const htmlLangFor = (variant: Variant): string =>
  variant === 'pt-BR' ? 'pt-BR' : variant === 'es-ES' ? 'es-ES' : 'es-419';

/** Kurs aus einer Inhalts-ID ableiten ('es.g.ser' → 'es', 'pt.pc.r' → 'pt-BR'). */
export function courseOfId(id: string | undefined | null): CourseId | null {
  if (!id) return null;
  if (id.startsWith('pt.')) return 'pt-BR';
  if (id.startsWith('es.')) return 'es';
  return null;
}
