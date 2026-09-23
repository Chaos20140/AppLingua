/**
 * Reine Sitzungslogik (ohne React): Variantenfilter, Kombo, XP-Summe, Wiederholungsrunde,
 * Teilpunkte und Auswertung. Wird von `useExerciseSession` genutzt und separat getestet.
 */
import type { Skill, Variant } from '../../core/types';
import type { Exercise } from '../../content/types';
import type { ExerciseOutcome } from '../../engine/grading';
import type { SessionResult, SessionSummary } from './contract';

export interface SessionState {
  /** Schlüssel der Übungsliste (ändert sich die Liste, beginnt die Sitzung neu) */
  key: string;
  /** Warteschlange: gefilterte Übungen + ggf. Wiederholungsrunde falsch beantworteter */
  queue: Exercise[];
  /** Anzahl der Übungen ohne Wiederholungsrunde */
  base: number;
  index: number;
  combo: number;
  bestCombo: number;
  xp: number;
  results: SessionResult[];
  /** IDs, die bereits in die Wiederholungsrunde aufgenommen wurden */
  retried: string[];
  startedAt: number;
  finishedAt: number | null;
}

/** Entfernt Einträge einer anderen Sprachvariante. */
export function filterByVariant<T extends { variant?: Variant }>(items: readonly T[], variant: Variant): T[] {
  return items.filter((i) => !i.variant || i.variant === variant);
}

export const sessionKey = (exercises: readonly Exercise[], variant: Variant) =>
  `${variant}|${exercises.map((e) => e.id).join('|')}`;

export function initSession(exercises: readonly Exercise[], key: string, now: number): SessionState {
  return {
    key,
    queue: exercises.slice(),
    base: exercises.length,
    index: 0,
    combo: 0,
    bestCombo: 0,
    xp: 0,
    results: [],
    retried: [],
    startedAt: now,
    finishedAt: exercises.length === 0 ? now : null,
  };
}

/** Kombo nach dieser Antwort (richtig → +1, sonst 0). */
export const nextCombo = (state: SessionState, outcome: ExerciseOutcome) => (outcome.correct ? state.combo + 1 : 0);

/**
 * Wendet eine Antwort auf die aktuelle Übung an. `xp` = tatsächlich vergebene XP (aus recordAnswer).
 * Mit `retryWrong` wird eine falsch beantwortete Übung (einmal) ans Ende gestellt.
 */
export function applyAnswer(
  state: SessionState,
  outcome: ExerciseOutcome,
  xp: number,
  opts: { retryWrong?: boolean; now: number },
): SessionState {
  const exercise = state.queue[state.index];
  if (!exercise || state.finishedAt !== null) return state;
  const combo = nextCombo(state, outcome);
  let queue = state.queue;
  let retried = state.retried;
  if (opts.retryWrong && !outcome.correct && !retried.includes(exercise.id)) {
    queue = [...queue, exercise];
    retried = [...retried, exercise.id];
  }
  const index = state.index + 1;
  return {
    ...state,
    queue,
    retried,
    index,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    xp: state.xp + Math.max(0, xp || 0),
    results: [...state.results, { exercise, outcome }],
    finishedAt: index >= queue.length ? opts.now : null,
  };
}

/** Anrechnung einer Antwort: richtig = voll, sonst Teilpunkte (0..1). */
export const creditOf = (o: ExerciseOutcome) => (o.correct ? 1 : Math.max(0, Math.min(1, Number(o.score) || 0)));

/** Erste Antwort je Übung (Wiederholungen verbessern die Punktzahl nicht). */
export function firstAttempts(results: readonly SessionResult[]): SessionResult[] {
  const seen = new Set<string>();
  const out: SessionResult[] = [];
  for (const r of results) {
    if (seen.has(r.exercise.id)) continue;
    seen.add(r.exercise.id);
    out.push(r);
  }
  return out;
}

export function summarize(state: SessionState, now: number = Date.now()): SessionSummary {
  const first = firstAttempts(state.results);
  const total = Math.max(state.base, first.length);
  const credit = first.reduce((sum, r) => sum + creditOf(r.outcome), 0);
  const skillSum: Partial<Record<Skill, { sum: number; n: number }>> = {};
  for (const r of first) {
    const skills = r.exercise.skills?.length ? r.exercise.skills : (['grammar'] as Skill[]);
    for (const sk of new Set(skills)) {
      const agg = skillSum[sk] ?? { sum: 0, n: 0 };
      agg.sum += creditOf(r.outcome);
      agg.n += 1;
      skillSum[sk] = agg;
    }
  }
  const perSkill: Partial<Record<Skill, number>> = {};
  for (const [sk, agg] of Object.entries(skillSum) as [Skill, { sum: number; n: number }][]) {
    perSkill[sk] = Math.round((agg.sum / agg.n) * 100);
  }
  const end = state.finishedAt ?? now;
  return {
    total,
    correct: first.filter((r) => r.outcome.correct).length,
    scorePct: total ? Math.round((credit / total) * 100) : 0,
    bestCombo: state.bestCombo,
    xp: state.xp,
    durationSec: Math.max(0, Math.round((end - state.startedAt) / 1000)),
    perSkill,
    results: state.results,
    mistakes: first.filter((r) => !r.outcome.correct),
  };
}
