import { describe, expect, it } from 'vitest';
import type { AnswerEvent, ExamResult, PronAttempt } from '../core/types';
import { computeCompetences, computeTopicMastery, strengthsAndWeaknesses, weakTopics } from './competence';

let t = 0;
const ans = (p: Partial<AnswerEvent>): AnswerEvent => ({
  at: new Date(Date.UTC(2026, 8, 1) + (t++) * 60_000).toISOString(),
  courseId: 'es', exerciseId: 'x', exerciseType: 'mc', context: 'lesson', skills: ['grammar'], topicIds: [], correct: true, ...p,
});

describe('Kompetenzen', () => {
  it('ohne Belege 0, mit wenigen Belegen gedämpft (Vertrauensfaktor)', () => {
    const c0 = computeCompetences({ answers: [] });
    expect(c0.grammar).toEqual({ score: 0, evidence: 0, accuracy: 0 });
    const c = computeCompetences({ answers: [ans({}), ans({})] });
    expect(c.grammar.accuracy).toBe(100);
    expect(c.grammar.score).toBeLessThan(20);
    expect(c.grammar.evidence).toBe(2);
  });
  it('gewichteter gleitender Mittelwert: neuere Belege zählen mehr', () => {
    const early = Array.from({ length: 20 }, () => ans({ correct: false }));
    const late = Array.from({ length: 20 }, () => ans({ correct: true }));
    const improving = computeCompetences({ answers: [...early, ...late] }).grammar;
    const declining = computeCompetences({ answers: [...late.map((a) => ({ ...a, at: a.at.replace('2026', '2025') })), ...early.map((a) => ({ ...a, at: a.at.replace('2026', '2027') }))] }).grammar;
    expect(improving.accuracy).toBeGreaterThan(50);
    expect(declining.accuracy).toBeLessThan(50);
    expect(improving.score).toBeGreaterThan(declining.score);
  });
  it('Hauptkompetenz voll, weitere halb; Teilpunkte über score', () => {
    const c = computeCompetences({ answers: Array.from({ length: 30 }, () => ans({ skills: ['listening', 'writing'], correct: false, score: 0.5 })) });
    expect(c.listening.accuracy).toBe(50);
    expect(c.writing.accuracy).toBe(50);
    expect(c.listening.evidence).toBe(30);
    expect(c.vocabulary.evidence).toBe(0);
  });
  it('Aussprache aus Versuchen, Prüfungen zählen stark, Kursfilter', () => {
    const pron: PronAttempt[] = Array.from({ length: 20 }, (_, i) => ({ at: `2026-09-0${1 + (i % 9)}T10:00:00Z`, courseId: 'es', itemId: 'p', context: 'pronunciation', target: 'perro', method: 'speech-recognition', scorePct: 80, issues: [] }));
    const exam: ExamResult = { at: '2026-09-10T10:00:00Z', courseId: 'es', examId: 'e', kind: 'final', scorePct: 90, passed: true, perSkill: { reading: 90 }, durationSec: 60 };
    const c = computeCompetences({ answers: [ans({ courseId: 'pt-BR' })], pronAttempts: pron, examResults: [exam] }, 'es');
    expect(c.pronunciation.accuracy).toBe(80);
    expect(c.speaking.evidence).toBe(20);
    expect(c.reading.accuracy).toBe(90);
    expect(c.grammar.evidence).toBe(0); // pt-BR-Antwort gefiltert
  });
  it('Themen-Beherrschung, schwache Themen, Stärken/Schwächen', () => {
    const answers = [
      ...Array.from({ length: 6 }, () => ans({ topicIds: ['es.g.ser'], correct: false })),
      ...Array.from({ length: 6 }, () => ans({ topicIds: ['es.g.estar'], correct: true, skills: ['vocabulary'] })),
      ans({ topicIds: ['es.g.hay'], correct: false }),
    ];
    const tm = computeTopicMastery(answers, 'es');
    expect(tm['es.g.ser']).toMatchObject({ mastery: 0, evidence: 6, correct: 0 });
    expect(tm['es.g.estar'].mastery).toBe(100);
    expect(weakTopics(tm).map((x) => x.topicId)).toEqual(['es.g.ser']); // es.g.hay hat zu wenige Belege
    const sw = strengthsAndWeaknesses(computeCompetences({ answers }), tm);
    expect(sw.weaknesses).toContain('grammar');
    expect(sw.weakTopics).toEqual(['es.g.ser']);
    expect(sw.strongTopics).toEqual(['es.g.estar']);
    expect(sw.untested).toContain('speaking');
  });
});
