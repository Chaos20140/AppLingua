/**
 * Übung per ID im Kursinhalt finden (Lektionen, Grammatikthemen, Prüfungen, Einstufung) –
 * für „Jetzt üben“ im Fehlerarchiv. Rein, ohne React.
 */
import type { CourseContent, Exercise } from '../../content/types';

export type ExerciseSourceKind = 'lesson' | 'grammar' | 'exam' | 'placement';

export interface ExerciseSource {
  kind: ExerciseSourceKind;
  /** ID der Lektion / des Themas / der Prüfung */
  id: string;
  title: string;
  /** Route zur Quelle (falls vorhanden) */
  href?: string;
  exercise: Exercise;
}

const cache = new WeakMap<CourseContent, Map<string, ExerciseSource>>();

/** Index aller Übungen eines Kurses: exerciseId → Quelle. Erste Fundstelle gewinnt. */
export function buildExerciseIndex(content: CourseContent): Map<string, ExerciseSource> {
  const index = new Map<string, ExerciseSource>();
  const add = (exercise: Exercise | undefined, src: Omit<ExerciseSource, 'exercise'>) => {
    if (exercise?.id && !index.has(exercise.id)) index.set(exercise.id, { ...src, exercise });
  };
  for (const l of content.lessons ?? []) {
    const src = { kind: 'lesson' as const, id: l.id, title: l.title, href: `/lektion/${l.id}` };
    for (const e of [...(l.guided ?? []), ...(l.application ?? []), ...(l.review ?? [])]) add(e, src);
  }
  for (const t of content.grammar ?? []) {
    const src = { kind: 'grammar' as const, id: t.id, title: t.title, href: `/grammatik/${t.id}` };
    for (const lvl of t.levels ?? []) for (const e of lvl.exercises ?? []) add(e, src);
  }
  for (const x of content.exams ?? []) {
    const src = { kind: 'exam' as const, id: x.id, title: x.title, href: `/pruefung/${x.id}` };
    for (const sec of x.sections ?? []) for (const e of sec.exercises ?? []) add(e, src);
  }
  for (const q of content.placement?.questions ?? []) {
    add(q.exercise, { kind: 'placement', id: 'placement', title: 'Einstufungstest' });
  }
  return index;
}

/** Findet eine Übung per ID (Index wird je Kursinhalt zwischengespeichert). */
export function findExercise(content: CourseContent | null | undefined, exerciseId: string): ExerciseSource | null {
  if (!content || !exerciseId) return null;
  let index = cache.get(content);
  if (!index) {
    index = buildExerciseIndex(content);
    cache.set(content, index);
  }
  return index.get(exerciseId) ?? null;
}

export const SOURCE_LABEL: Record<ExerciseSourceKind, string> = {
  lesson: 'Lektion',
  grammar: 'Grammatik',
  exam: 'Prüfung',
  placement: 'Einstufung',
};
