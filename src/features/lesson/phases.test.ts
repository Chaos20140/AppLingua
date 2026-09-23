import { describe, expect, it } from 'vitest';
import type { CourseContent, Exercise, Lesson, PronItem } from '../../content/types';
import { formatDuration, lastExercisePhase, planLesson } from './phases';

const ex = (id: string, variant?: Exercise['variant']): Exercise =>
  ({ id, type: 'mc', skills: ['grammar'], feedback: { rule: '' }, prompt: 'P', options: [{ text: 'a' }], answer: 0, variant }) as Exercise;
const pron = (id: string, variant?: PronItem['variant']) => ({ id, variant }) as PronItem;

const lesson = (over: Partial<Lesson> = {}): Lesson => ({
  id: 'es.s0.l01', courseId: 'es', stageId: 'stage0', chapterId: 'c1', order: 1, title: 'T', icon: '👋', minutes: 8,
  goal: 'Ziel', canDo: [], topicIds: [], vocab: [], explanation: [{ type: 'text', md: 'x' }],
  examples: [{ target: 'hola', german: 'hallo' }],
  guided: [ex('g1'), ex('g2', 'es-LA'), ex('g3')],
  pronunciation: ['p1', 'p2', 'missing'],
  application: [ex('a1')],
  review: [ex('r1'), ex('r2', 'es-ES')],
  ...over,
});
const content = { pronItems: [pron('p1'), pron('p2', 'es-LA')] } as unknown as CourseContent;

describe('planLesson', () => {
  it('liefert 8 Phasen, filtert Varianten und berechnet Bereiche', () => {
    const plan = planLesson(lesson(), content, 'es-ES');
    expect(plan.phases).toEqual(['goal', 'explain', 'examples', 'guided', 'pron', 'application', 'review', 'result']);
    expect(plan.exercises.map((e) => e.id)).toEqual(['g1', 'g3', 'a1', 'r1', 'r2']);
    expect(plan.ranges).toEqual({ guided: [0, 2], application: [2, 3], review: [3, 5] });
    expect(plan.pronItems.map((p) => p.id)).toEqual(['p1']);
    expect(lastExercisePhase(plan.phases)).toBe('review');
  });

  it('lässt leere Phasen weg', () => {
    const plan = planLesson(lesson({ explanation: [], examples: [], pronunciation: [], application: [], review: [] }), content, 'es-LA');
    expect(plan.phases).toEqual(['goal', 'guided', 'result']);
    expect(lastExercisePhase(plan.phases)).toBe('guided');
  });
});

describe('formatDuration', () => {
  it('formatiert Minuten:Sekunden', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(600.4)).toBe('10:00');
  });
});
