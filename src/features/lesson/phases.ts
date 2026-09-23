/** Die acht Lektionsphasen und ihre Ableitung aus den Inhalten (leere Phasen entfallen ehrlich). */
import { BookOpen, Dumbbell, ListChecks, MessageSquareQuote, Mic, Repeat, Target, Trophy, type LucideIcon } from 'lucide-react';
import type { Variant } from '../../core/types';
import type { CourseContent, Exercise, Lesson, PronItem } from '../../content/types';
import { filterByVariant } from '../exercises/sessionLogic';

export type PhaseKey = 'goal' | 'explain' | 'examples' | 'guided' | 'pron' | 'application' | 'review' | 'result';

export const PHASE_META: Record<PhaseKey, { label: string; icon: LucideIcon }> = {
  goal: { label: 'Lernziel', icon: Target },
  explain: { label: 'Erklärung', icon: BookOpen },
  examples: { label: 'Beispiele', icon: MessageSquareQuote },
  guided: { label: 'Geführte Übungen', icon: ListChecks },
  pron: { label: 'Aussprache', icon: Mic },
  application: { label: 'Anwendung', icon: Dumbbell },
  review: { label: 'Wiederholung', icon: Repeat },
  result: { label: 'Ergebnis', icon: Trophy },
};

export type ExercisePhase = 'guided' | 'application' | 'review';
export const isExercisePhase = (p: PhaseKey): p is ExercisePhase => p === 'guided' || p === 'application' || p === 'review';

export interface LessonPlan {
  phases: PhaseKey[];
  exercises: Exercise[];
  /** Bereich [start, end) je Übungsphase in `exercises` */
  ranges: Record<ExercisePhase, [number, number]>;
  pronItems: PronItem[];
  examples: Lesson['examples'];
  vocab: Lesson['vocab'];
}

export function planLesson(lesson: Lesson, content: CourseContent, variant: Variant): LessonPlan {
  const guided = filterByVariant(lesson.guided, variant);
  const application = filterByVariant(lesson.application, variant);
  const review = filterByVariant(lesson.review, variant);
  const byId = new Map(content.pronItems.map((p) => [p.id, p]));
  const pronItems = filterByVariant(
    lesson.pronunciation.map((id) => byId.get(id)).filter((p): p is PronItem => !!p),
    variant,
  );
  const examples = filterByVariant(lesson.examples, variant);
  const vocab = filterByVariant(lesson.vocab, variant);
  const g = guided.length;
  const a = application.length;
  const r = review.length;
  const phases: PhaseKey[] = ['goal'];
  if (lesson.explanation.length) phases.push('explain');
  if (examples.length || vocab.length) phases.push('examples');
  if (g) phases.push('guided');
  if (pronItems.length) phases.push('pron');
  if (a) phases.push('application');
  if (r) phases.push('review');
  phases.push('result');
  return {
    phases,
    exercises: [...guided, ...application, ...review],
    ranges: { guided: [0, g], application: [g, g + a], review: [g + a, g + a + r] },
    pronItems,
    examples,
    vocab,
  };
}

/** Letzte Übungsphase der Lektion (danach folgt das Ergebnis) oder null. */
export function lastExercisePhase(phases: PhaseKey[]): ExercisePhase | null {
  for (let i = phases.length - 1; i >= 0; i--) {
    const p = phases[i];
    if (isExercisePhase(p)) return p;
  }
  return null;
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
