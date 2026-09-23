/** Reine Hilfsfunktionen für Vokabeltrainer und Wiederholung (ohne React). */
import type { SrsCard } from '../../core/types';
import type { TextGrade } from '../../engine/grading';
import { formatInterval, isDue, isMatureCard, type SrsGrade } from '../../engine/srs';
import { looseKey } from '../../engine/text';

export type SourceGroup = 'lesson' | 'song' | 'user' | 'error' | 'other';
export type StudyMode = 'flash' | 'write' | 'listen';
export type CardFilter = 'all' | 'due' | 'new' | SourceGroup | 'suspended';

export const SOURCE_GROUP_LABEL: Record<SourceGroup, string> = {
  lesson: 'Lektionen', song: 'Songs', user: 'Eigene', error: 'Fehler', other: 'Sonstige',
};

export const SOURCE_LABEL: Record<SrsCard['source']['type'], string> = {
  lesson: 'Lektion', song: 'Song', user: 'Eigene Karte', error: 'Fehlerarchiv', grammar: 'Grammatik', pronunciation: 'Aussprache',
};

/** „Lektion · Hola …“ – ohne Doppelung, wenn das Label nur die Art wiederholt (eigene Karten: „Eigene Karte“). */
export function sourceText(card: Pick<SrsCard, 'source'>): string {
  const base = SOURCE_LABEL[card.source.type];
  const label = card.source.label?.trim();
  return label && label !== base ? `${base} · ${label}` : base;
}

export function sourceGroup(card: Pick<SrsCard, 'source'>): SourceGroup {
  const t = card.source.type;
  return t === 'lesson' || t === 'song' || t === 'user' || t === 'error' ? t : 'other';
}

/** Akzeptierte Schreibweisen: ganze Vorderseite, Varianten mit „/“, ohne Klammerzusätze. */
export function acceptedAnswers(front: string): string[] {
  const out: string[] = [];
  const add = (v: string) => {
    const t = v.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  add(front);
  const noParens = front.replace(/\s*\([^)]*\)/g, '').trim();
  add(noParens);
  if (noParens.includes('/')) for (const part of noParens.split('/')) add(part);
  return out;
}

/** SRS-Note aus einer Texteingabe: exakt → Gut, Tippfehler/Akzente → Schwer, falsch → Nochmal. */
export function gradeForText(g: Pick<TextGrade, 'correct' | 'typo' | 'accentOnly'>): SrsGrade {
  if (!g.correct) return 0;
  return g.typo || g.accentOnly ? 1 : 2;
}

const DAY = 86_400_000;

/** Kurzbeschreibung der Fälligkeit („Fällig“, „Neu“, „morgen“, „in 5 Tagen“, „Pausiert“). */
export function dueLabel(card: SrsCard, now: Date = new Date()): string {
  if (card.suspended) return 'Pausiert';
  if (card.reps === 0 && isDue(card, now)) return 'Neu';
  if (isDue(card, now)) return 'Fällig';
  const ms = new Date(card.dueAt).getTime() - now.getTime();
  if (ms < 60 * 60_000) return `in ${Math.max(1, Math.ceil(ms / 60_000))} Min.`;
  if (ms < DAY) return `in ${Math.ceil(ms / (60 * 60_000))} Std.`;
  const days = Math.round(ms / DAY);
  if (days <= 1) return 'morgen';
  return `in ${formatInterval(days)}`;
}

export interface CardStats {
  total: number;
  due: number;
  fresh: number;
  learned: number;
  mature: number;
  suspended: number;
  bySource: Record<SourceGroup, number>;
  /** früheste Fälligkeit einer noch nicht fälligen, aktiven Karte */
  nextDueAt: string | null;
}

export function cardStats(cards: readonly SrsCard[], now: Date = new Date()): CardStats {
  const bySource: Record<SourceGroup, number> = { lesson: 0, song: 0, user: 0, error: 0, other: 0 };
  let due = 0, fresh = 0, learned = 0, mature = 0, suspended = 0;
  let nextDueAt: string | null = null;
  for (const c of cards) {
    bySource[sourceGroup(c)]++;
    if (c.suspended) { suspended++; continue; }
    if (isDue(c, now)) due++;
    else if (!nextDueAt || c.dueAt < nextDueAt) nextDueAt = c.dueAt;
    if (c.reps === 0) fresh++;
    else learned++;
    if (isMatureCard(c)) mature++;
  }
  return { total: cards.length, due, fresh, learned, mature, suspended, bySource, nextDueAt };
}

/** Suche (Ziel-/Muttersprache, Notiz, akzenttolerant) und Filter. */
export function filterCards(cards: readonly SrsCard[], query: string, filter: CardFilter, now: Date = new Date()): SrsCard[] {
  const q = looseKey(query);
  return cards.filter((c) => {
    switch (filter) {
      case 'all': break;
      case 'due': if (c.suspended || !isDue(c, now)) return false; break;
      case 'new': if (c.suspended || c.reps > 0) return false; break;
      case 'suspended': if (!c.suspended) return false; break;
      default: if (sourceGroup(c) !== filter) return false;
    }
    if (!q) return true;
    return looseKey(c.front).includes(q) || looseKey(c.back).includes(q) || (c.note ? looseKey(c.note).includes(q) : false)
      || (c.source.label ? looseKey(c.source.label).includes(q) : false);
  });
}

/** Freies Üben (ohne Einplanung): aktive Karten, am längsten nicht gesehen zuerst. */
export function pickPractice(cards: readonly SrsCard[], n: number): SrsCard[] {
  return cards
    .filter((c) => !c.suspended)
    .slice()
    .sort((a, b) => (a.lastReviewedAt ?? '').localeCompare(b.lastReviewedAt ?? '') || a.front.localeCompare(b.front))
    .slice(0, n);
}

export function formatDueDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
