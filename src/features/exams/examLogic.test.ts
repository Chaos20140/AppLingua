import { describe, expect, it } from 'vitest';
import { COURSE, EXERCISES } from '../../engine/__fixtures__/course';
import { examExercises, examRecommendations, exercisePromptText, formatClock, formatDuration, resultMessage, sectionMap, softTimer } from './examLogic';

describe('examLogic', () => {
  it('formatiert Zeiten', () => {
    expect(formatClock(75)).toBe('1:15');
    expect(formatClock(3725)).toBe('1:02:05');
    expect(formatDuration(30)).toBe('30 Sek.');
    expect(formatDuration(600)).toBe('10 Min.');
  });

  it('weicher Timer bricht nicht ab, sondern zählt Überzeit', () => {
    expect(softTimer(10)).toMatchObject({ remaining: null, overtime: false });
    expect(softTimer(60, 100)).toMatchObject({ remaining: 40, overtime: false, label: '0:40' });
    expect(softTimer(130, 100)).toMatchObject({ remaining: 0, overtime: true, label: '+0:30', used: 1 });
  });

  it('ordnet Übungen Abschnitten zu und filtert Varianten', () => {
    const exam = COURSE.exams[1];
    const map = sectionMap(exam);
    expect(map.get(exam.sections[0].exercises[0].id)?.index).toBe(0);
    const withVariant = { ...exam, sections: [{ ...exam.sections[0], exercises: [...exam.sections[0].exercises, { ...EXERCISES.mc, id: 'x', variant: 'es-LA' as const }] }] };
    expect(examExercises(withVariant, 'es-ES').some((e) => e.id === 'x')).toBe(false);
    expect(examExercises(withVariant, 'es-LA').some((e) => e.id === 'x')).toBe(true);
  });

  it('liefert Aufgabentexte für alle Typen', () => {
    for (const ex of Object.values(EXERCISES)) expect(exercisePromptText(ex).length).toBeGreaterThan(0);
  });

  it('empfiehlt schwache Skills und Themen', () => {
    const recs = examRecommendations({
      perSkill: { grammar: 40, listening: 90, vocabulary: 55 },
      passPct: 70,
      mistakes: [{ exercise: { ...EXERCISES.cloze, topicIds: ['es.g.ser'] } }, { exercise: { ...EXERCISES.mc, topicIds: ['es.g.ser'] } }],
      grammar: COURSE.grammar,
    });
    expect(recs[0].route).toBe('/grammatik/es.g.ser');
    expect(recs.some((r) => r.route === '/vokabeln')).toBe(true);
    expect(recs.some((r) => r.id === 'skill:listening')).toBe(false);
    expect(new Set(recs.map((r) => r.route)).size).toBe(recs.length);
  });

  it('formuliert ermutigende Ergebnisse', () => {
    expect(resultMessage(true, 80, 70, 'boss').title).toMatch(/besiegt/);
    expect(resultMessage(false, 65, 70, 'final').text).toMatch(/5 Prozentpunkte/);
    expect(resultMessage(false, 30, 70, 'final').text).toMatch(/70 %/);
  });
});
