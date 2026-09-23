/**
 * Wiederholungssitzung: mischt fällige SRS-Karten, offene Fehler aus dem Fehlerarchiv,
 * Übungen zu schwachen Themen und Aussprache-Problemstellen.
 */
import type { CourseId, ErrorEntry, PronAttempt, SrsCard, Variant } from '../core/types';
import type { CourseContent, Exercise, PronItem } from '../content/types';
import type { TopicMastery } from './competence';
import { weakTopics } from './competence';
import { dueCards } from './srs';
import { seededShuffle } from './text';

export type ReviewReason = 'error' | 'weak-topic' | 'pronunciation';

export interface ReviewItem {
  exercise: Exercise;
  reason: ReviewReason;
  /** deutsche Begründung, z. B. „Aus deinem Fehlerarchiv“ */
  label: string;
  /** Fehlerarchiv-ID, Themen-ID oder PronItem-ID */
  sourceId?: string;
}

export interface ReviewSession {
  cards: SrsCard[];
  items: ReviewItem[];
  exercises: Exercise[];
  counts: { cards: number; errors: number; weakTopics: number; pronunciation: number };
  empty: boolean;
}

export interface ReviewInput {
  courseId: CourseId;
  content: CourseContent;
  cards: readonly SrsCard[];
  errors: readonly ErrorEntry[];
  topicMastery: Record<string, TopicMastery>;
  pronAttempts: readonly PronAttempt[];
  /** nur Übungen aus bereits abgeschlossenen Lektionen verwenden (Grammatikzentrum ist immer erlaubt) */
  completedLessonIds?: ReadonlySet<string>;
}

export interface ReviewOptions {
  now?: Date;
  maxCards?: number;
  maxExercises?: number;
  variant?: Variant;
  /** sanfter Wiedereinstieg: weniger Karten und Aufgaben */
  gentle?: boolean;
  /** Seed für die (deterministische) Auswahl, Standard: Datum */
  seed?: string;
}

export interface IndexedExercise {
  exercise: Exercise;
  source: { type: 'lesson' | 'grammar' | 'exam'; id: string; title: string };
}

/** Alle Übungen eines Kurses nach ID (ohne Einstufungstest). */
export function indexExercises(content: CourseContent): Map<string, IndexedExercise> {
  const map = new Map<string, IndexedExercise>();
  for (const l of content.lessons) {
    for (const ex of [...l.guided, ...l.application, ...l.review]) {
      map.set(ex.id, { exercise: ex, source: { type: 'lesson', id: l.id, title: l.title } });
    }
  }
  for (const g of content.grammar) {
    for (const lvl of g.levels) for (const ex of lvl.exercises) map.set(ex.id, { exercise: ex, source: { type: 'grammar', id: g.id, title: g.title } });
  }
  for (const e of content.exams) {
    for (const s of e.sections) for (const ex of s.exercises) map.set(ex.id, { exercise: ex, source: { type: 'exam', id: e.id, title: e.title } });
  }
  return map;
}

/** Häufigste Aussprache-Probleme aus den letzten Versuchen (nur schwache Versuche). */
export function frequentPronIssues(attempts: readonly PronAttempt[], opts: { courseId?: CourseId; recent?: number; maxScore?: number } = {}): { code: string; count: number }[] {
  const recent = attempts
    .filter((a) => !opts.courseId || a.courseId === opts.courseId)
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, opts.recent ?? 30)
    .filter((a) => a.scorePct < (opts.maxScore ?? 70));
  const counts = new Map<string, number>();
  for (const a of recent) for (const c of a.issues ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

const variantOk = (v: Variant | undefined, variant?: Variant) => !v || !variant || v === variant;

/** Sprechübung aus einem Element des Aussprache-Labors. */
export function pronExercise(item: PronItem): Exercise {
  return {
    id: `review.pron.${item.id}`,
    type: 'speak',
    skills: ['pronunciation', 'speaking'],
    text: item.text,
    german: item.german,
    phonetic: item.helper,
    ipa: item.ipa,
    pronItemId: item.id,
    variant: item.variant,
    feedback: {
      rule: item.mouth,
      why: item.mistakes.length ? `Typisch für Deutschsprachige: ${item.mistakes.join('; ')}` : undefined,
      avoid: item.tips.join(' '),
    },
  };
}

/** Aussprache-Elemente, die zu den Problem-Codes passen (meiste Treffer zuerst). */
export function pronItemsForIssues(content: CourseContent, codes: readonly string[], variant?: Variant): PronItem[] {
  const set = new Set(codes);
  return content.pronItems
    .filter((p) => variantOk(p.variant, variant) && p.issueCodes.some((c) => set.has(c)))
    .map((p) => ({ p, hits: p.issueCodes.filter((c) => set.has(c)).length }))
    .sort((a, b) => b.hits - a.hits || a.p.level - b.p.level || a.p.id.localeCompare(b.p.id))
    .map((x) => x.p);
}

const EXCLUDED_TYPES = new Set<Exercise['type']>(['aiChat']);

export function buildReviewSession(input: ReviewInput, opts: ReviewOptions = {}): ReviewSession {
  const now = opts.now ?? new Date();
  const seed = opts.seed ?? now.toISOString().slice(0, 10);
  const gentle = !!opts.gentle;
  const maxCards = opts.maxCards ?? (gentle ? 10 : 20);
  const maxExercises = opts.maxExercises ?? (gentle ? 6 : 12);
  const { content, courseId, variant } = { ...input, variant: opts.variant };

  const cards = dueCards(input.cards, now, courseId).slice(0, maxCards);
  const index = indexExercises(content);
  const usable = (x: IndexedExercise | undefined): x is IndexedExercise =>
    !!x && !EXCLUDED_TYPES.has(x.exercise.type) && variantOk(x.exercise.variant, variant);
  const used = new Set<string>();

  // 1) Offene Fehler (häufigste und jüngste zuerst)
  const errorItems: ReviewItem[] = [];
  const openErrors = input.errors
    .filter((e) => e.courseId === courseId && !e.resolvedAt)
    .slice()
    .sort((a, b) => b.count - a.count || (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0));
  for (const e of openErrors) {
    const x = index.get(e.exerciseId);
    if (!usable(x) || used.has(x.exercise.id)) continue;
    used.add(x.exercise.id);
    errorItems.push({ exercise: x.exercise, reason: 'error', label: `Aus deinem Fehlerarchiv (${e.count}× falsch)`, sourceId: `${e.courseId}:${e.exerciseId}` });
  }

  // 2) Schwache Themen
  const topicTitle = new Map(content.grammar.map((g) => [g.id, g.title]));
  const topicItems: ReviewItem[] = [];
  const weak = weakTopics(input.topicMastery).slice(0, 3);
  for (const t of weak) {
    const candidates = [...index.values()].filter((x) =>
      usable(x) && !used.has(x.exercise.id) && x.source.type !== 'exam' &&
      (x.exercise.topicIds ?? []).includes(t.topicId) &&
      (x.source.type === 'grammar' || !input.completedLessonIds || input.completedLessonIds.has(x.source.id)) &&
      (x.exercise.difficulty ?? 1) <= (gentle ? 1 : 2),
    );
    for (const x of seededShuffle(candidates, `${seed}:${t.topicId}`).slice(0, 3)) {
      used.add(x.exercise.id);
      topicItems.push({
        exercise: x.exercise, reason: 'weak-topic', sourceId: t.topicId,
        label: `Schwaches Thema: ${topicTitle.get(t.topicId) ?? t.topicId} (${t.mastery} %)`,
      });
    }
  }

  // 3) Aussprache-Problemstellen
  const pronItems: ReviewItem[] = [];
  const codes = frequentPronIssues(input.pronAttempts, { courseId }).slice(0, 2).map((i) => i.code);
  if (codes.length) {
    for (const item of pronItemsForIssues(content, codes, variant).slice(0, gentle ? 1 : 3)) {
      const ex = pronExercise(item);
      if (used.has(ex.id)) continue;
      used.add(ex.id);
      pronItems.push({ exercise: ex, reason: 'pronunciation', label: 'Aussprache: hier hatte die Spracherkennung zuletzt Mühe', sourceId: item.id });
    }
  }

  // Budget verteilen: Fehler bis zur Hälfte, Aussprache bis 2 (sanft: 1), Rest Themen – ungenutztes Budget auffüllen
  const pick = (list: ReviewItem[], n: number) => list.slice(0, Math.max(0, n));
  const pronBudget = Math.min(pronItems.length, gentle ? 1 : 2);
  let errBudget = Math.min(errorItems.length, Math.ceil(maxExercises / 2));
  let topicBudget = Math.min(topicItems.length, maxExercises - errBudget - pronBudget);
  const spare = maxExercises - errBudget - pronBudget - topicBudget;
  if (spare > 0) {
    const moreErr = Math.min(spare, errorItems.length - errBudget);
    errBudget += moreErr;
    topicBudget += Math.min(spare - moreErr, topicItems.length - topicBudget);
  }
  const lists = [pick(errorItems, errBudget), pick(topicItems, topicBudget), pick(pronItems, pronBudget)];

  // Abwechselnd mischen (Interleaving fördert das Behalten)
  const items: ReviewItem[] = [];
  for (let i = 0; items.length < lists.reduce((n, l) => n + l.length, 0); i++) {
    for (const l of lists) if (l[i]) items.push(l[i]);
  }

  return {
    cards,
    items,
    exercises: items.map((i) => i.exercise),
    counts: { cards: cards.length, errors: lists[0].length, weakTopics: lists[1].length, pronunciation: lists[2].length },
    empty: cards.length === 0 && items.length === 0,
  };
}
