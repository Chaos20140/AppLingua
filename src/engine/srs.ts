/**
 * Spaced Repetition – SM-2-Variante mit vier Noten:
 * 0 = nochmal, 1 = schwer, 2 = gut, 3 = leicht. Leichte Inhalte kommen deutlich seltener.
 * Fälligkeit wird auf lokale Mitternacht gelegt, damit Karten morgens schon bereitstehen.
 */
import type { CourseId, SrsCard } from '../core/types';
import { hashString } from './text';

export type SrsGrade = 0 | 1 | 2 | 3;

export const SRS = {
  initialEase: 2.5,
  minEase: 1.3,
  maxEase: 3.0,
  againMinutes: 10,
  maxIntervalDays: 365,
} as const;

export const GRADE_LABELS: Record<SrsGrade, string> = { 0: 'Nochmal', 1: 'Schwer', 2: 'Gut', 3: 'Leicht' };

export type NewCardInput = Pick<SrsCard, 'courseId' | 'itemId' | 'kind' | 'front' | 'back' | 'source'> &
  Partial<Pick<SrsCard, 'hint' | 'note'>>;

export const cardId = (courseId: CourseId, itemId: string) => `${courseId}:${itemId}`;

export function newCard(input: NewCardInput, now: Date = new Date()): SrsCard {
  const iso = now.toISOString();
  const card: SrsCard = {
    courseId: input.courseId,
    itemId: input.itemId,
    kind: input.kind,
    front: input.front,
    back: input.back,
    source: input.source,
    ease: SRS.initialEase,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    dueAt: iso,
    createdAt: iso,
  };
  if (input.hint) card.hint = input.hint;
  if (input.note) card.note = input.note;
  return card;
}

const clampEase = (e: number) => Math.round(Math.min(SRS.maxEase, Math.max(SRS.minEase, e)) * 100) / 100;

/** Deterministische Streuung (±5 %) ab 7 Tagen, damit sich Wiederholungen nicht stauen. */
function fuzz(days: number, seed: string): number {
  if (days < 7) return days;
  const f = ((hashString(seed) % 11) - 5) / 100;
  return Math.max(1, Math.round(days * (1 + f)));
}

/** Lokale Mitternacht `days` Tage nach `now`. */
function dueAfterDays(now: Date, days: number): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 0, 0, 0, 0).toISOString();
}

/** Nächstes Intervall (Tage) für eine Note – ohne die Karte zu verändern. 0 = in wenigen Minuten. */
export function nextInterval(card: Pick<SrsCard, 'ease' | 'intervalDays' | 'reps' | 'itemId'>, grade: SrsGrade): number {
  const prev = Math.max(0, card.intervalDays);
  const ease = card.ease || SRS.initialEase;
  let days = 1;
  switch (grade) {
    case 0:
      return 0;
    case 1:
      days = card.reps === 0 ? 1 : Math.max(prev + 1, Math.round(prev * 1.2));
      break;
    case 2:
      days = card.reps === 0 ? 1 : card.reps === 1 ? 3 : Math.max(prev + 1, Math.round(prev * ease));
      break;
    case 3: {
      const good = card.reps === 0 ? 1 : card.reps === 1 ? 3 : Math.max(prev + 1, Math.round(prev * ease));
      days = card.reps === 0 ? 4 : Math.max(good + 1, Math.round(good * 1.3));
      break;
    }
  }
  return Math.min(SRS.maxIntervalDays, fuzz(days, `${card.itemId}:${card.reps}:${grade}`));
}

/** Karte nach einer Bewertung neu planen. */
export function scheduleCard(card: SrsCard, grade: SrsGrade, now: Date = new Date()): SrsCard {
  const iso = now.toISOString();
  const interval = nextInterval(card, grade);
  const next: SrsCard = { ...card, lastReviewedAt: iso };
  if (grade === 0) {
    next.lapses = card.reps > 0 ? card.lapses + 1 : card.lapses;
    next.reps = 0;
    next.ease = clampEase(card.ease - 0.2);
    next.intervalDays = 0;
    next.dueAt = new Date(now.getTime() + SRS.againMinutes * 60_000).toISOString();
    return next;
  }
  next.reps = card.reps + 1;
  next.ease = clampEase(card.ease + (grade === 1 ? -0.15 : grade === 3 ? 0.15 : 0));
  next.intervalDays = interval;
  next.dueAt = dueAfterDays(now, interval);
  return next;
}

export const isDue = (card: SrsCard, now: Date = new Date()) =>
  !card.suspended && new Date(card.dueAt).getTime() <= now.getTime();

/** Fällige Karten, am längsten überfällige zuerst (neue Karten nach wiederholten). */
export function dueCards(cards: readonly SrsCard[], now: Date = new Date(), courseId?: CourseId): SrsCard[] {
  return cards
    .filter((c) => (!courseId || c.courseId === courseId) && isDue(c, now))
    .sort((a, b) => (a.reps === 0 ? 1 : 0) - (b.reps === 0 ? 1 : 0) || a.dueAt.localeCompare(b.dueAt) || a.itemId.localeCompare(b.itemId));
}

/** Menschlich lesbares Intervall, z. B. „10 Min.“, „1 Tag“, „3 Wochen“. */
export function formatInterval(days: number): string {
  if (days <= 0) return `${SRS.againMinutes} Min.`;
  if (days === 1) return '1 Tag';
  if (days < 14) return `${days} Tage`;
  if (days < 60) return `${Math.round(days / 7)} Wochen`;
  if (days < 365) return `${Math.round(days / 30)} Monate`;
  return '1 Jahr';
}

/** Vorschau für die vier Bewertungsknöpfe. */
export function previewIntervals(card: SrsCard): Record<SrsGrade, string> {
  return {
    0: formatInterval(nextInterval(card, 0)),
    1: formatInterval(nextInterval(card, 1)),
    2: formatInterval(nextInterval(card, 2)),
    3: formatInterval(nextInterval(card, 3)),
  };
}

/** Karte gilt als „gefestigt“, wenn das Intervall mindestens drei Wochen beträgt. */
export const isMatureCard = (card: SrsCard) => card.intervalDays >= 21;
