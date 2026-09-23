import { describe, expect, it } from 'vitest';
import type { ErrorEntry } from '../../core/types';
import { COURSE, EXERCISES } from '../../engine/__fixtures__/course';
import type { CourseContent } from '../../content/types';
import { buildExerciseIndex, findExercise } from './lookup';
import { filterErrors, relativeDay, skillsIn, sortErrors, topErrorTopics, topicsIn } from './stats';

const entry = (exerciseId: string, over: Partial<ErrorEntry> = {}): ErrorEntry => ({
  courseId: 'es', exerciseId, context: 'lesson', skill: 'grammar', topicIds: [], prompt: 'p', userAnswer: 'u',
  correctAnswer: 'c', explanation: { what: '', why: '', rule: '', correct: '', avoid: '' }, count: 1,
  firstAt: '2026-09-01T10:00:00.000Z', lastAt: '2026-09-01T10:00:00.000Z', correctSince: 0, ...over,
});

describe('lookup', () => {
  const mc = { ...EXERCISES.mc, id: 'x.lesson.g01' };
  const gr = { ...EXERCISES.cloze, id: 'es.g.ser.L1.01' };
  const exm = { ...EXERCISES.translate, id: 'es.exam.s0.mid.01' };
  const pl = { ...EXERCISES.mc, id: 'es.pl.01' };
  const content: CourseContent = {
    ...COURSE,
    lessons: [{ ...COURSE.lessons[0], id: 'x.lesson', title: 'Hallo', guided: [mc], application: [], review: [] }],
    grammar: [{ ...COURSE.grammar[0], id: 'es.g.ser', title: 'Ser', levels: [{ level: 1, title: 'L1', exercises: [gr] }] }],
    exams: [{ ...COURSE.exams[0], id: 'es.exam.s0.mid', title: 'Zwischentest', sections: [{ title: 'S', skill: 'grammar', exercises: [exm] }] }],
    placement: { ...COURSE.placement, questions: [{ level: 'stage0', exercise: pl }] },
  };

  it('findet Übungen in Lektionen, Grammatik, Prüfungen und Einstufung', () => {
    expect(findExercise(content, 'x.lesson.g01')).toMatchObject({ kind: 'lesson', id: 'x.lesson', href: '/lektion/x.lesson' });
    expect(findExercise(content, 'es.g.ser.L1.01')).toMatchObject({ kind: 'grammar', href: '/grammatik/es.g.ser' });
    expect(findExercise(content, 'es.exam.s0.mid.01')).toMatchObject({ kind: 'exam', title: 'Zwischentest' });
    expect(findExercise(content, 'es.pl.01')?.kind).toBe('placement');
    expect(findExercise(content, 'fehlt')).toBeNull();
    expect(findExercise(null, 'x')).toBeNull();
  });

  it('liefert die Übung selbst und nutzt den Cache', () => {
    expect(findExercise(content, 'x.lesson.g01')?.exercise).toBe(mc);
    expect(buildExerciseIndex(content).size).toBeGreaterThanOrEqual(4);
  });
});

describe('stats', () => {
  const list = [
    entry('a', { topicIds: ['es.g.ser'], count: 3, skill: 'grammar' }),
    entry('b', { topicIds: ['es.g.ser', 'es.g.estar'], count: 1, skill: 'writing' }),
    entry('c', { topicIds: ['es.g.estar'], count: 1, skill: 'grammar', lastAt: '2026-09-05T10:00:00.000Z' }),
  ];

  it('häufigste Fehlerthemen nach Summe der Fehlversuche', () => {
    expect(topErrorTopics(list)).toEqual([
      { topicId: 'es.g.ser', mistakes: 4, exercises: 2 },
      { topicId: 'es.g.estar', mistakes: 2, exercises: 2 },
    ]);
    expect(topErrorTopics(list, 1)).toHaveLength(1);
    expect(topicsIn(list)).toEqual(['es.g.ser', 'es.g.estar']);
  });

  it('filtert nach Kompetenz und Thema', () => {
    expect(filterErrors(list, { skill: 'grammar' }).map((e) => e.exerciseId)).toEqual(['a', 'c']);
    expect(filterErrors(list, { topicId: 'es.g.estar' }).map((e) => e.exerciseId)).toEqual(['b', 'c']);
    expect(filterErrors(list, { skill: 'all', topicId: 'all' })).toHaveLength(3);
    expect(skillsIn(list)).toEqual(['grammar', 'writing']);
  });

  it('sortiert offene nach Häufigkeit, behobene nach Datum', () => {
    expect(sortErrors(list, 'open').map((e) => e.exerciseId)).toEqual(['a', 'c', 'b']);
    const res = [entry('x', { resolvedAt: '2026-09-02T00:00:00Z' }), entry('y', { resolvedAt: '2026-09-09T00:00:00Z' })];
    expect(sortErrors(res, 'resolved').map((e) => e.exerciseId)).toEqual(['y', 'x']);
  });

  it('relative Tage', () => {
    const now = new Date(2026, 8, 21, 12);
    expect(relativeDay(new Date(2026, 8, 21, 8).toISOString(), now)).toBe('heute');
    expect(relativeDay(new Date(2026, 8, 20, 8).toISOString(), now)).toBe('gestern');
    expect(relativeDay(new Date(2026, 8, 18, 8).toISOString(), now)).toBe('vor 3 Tagen');
    expect(relativeDay('kaputt', now)).toBe('');
  });
});
