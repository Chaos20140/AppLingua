import { describe, expect, it } from 'vitest';
import type { CourseState, ExamResult, LessonProgress } from '../core/types';
import { COURSE } from './__fixtures__/course';
import { computeLanguageLevel, computeUnlocks, orderedStageLessons, type UnlockInput } from './unlock';

const done = (lessonId: string, scorePct = 40): LessonProgress => ({
  courseId: 'es', lessonId, bestScorePct: scorePct, stars: 1, attempts: 1, firstCompletedAt: '2026-09-01T10:00:00Z', lastCompletedAt: '2026-09-01T10:00:00Z', bestCombo: 0,
});
const exam = (examId: string, kind: ExamResult['kind'], scorePct: number, passed = scorePct >= 70, stageId: ExamResult['stageId'] = 'stage0'): ExamResult => ({
  at: '2026-09-02T10:00:00Z', courseId: 'es', examId, kind, stageId, scorePct, passed, perSkill: {}, durationSec: 300,
});
const input = (p: Partial<UnlockInput> = {}): UnlockInput => ({ lessonProgress: [], examResults: [], competences: { grammar: { score: 50 } }, ...p });

describe('Freischaltung', () => {
  it('Lektionen einer Etappe in Kapitelreihenfolge', () => {
    expect(orderedStageLessons(COURSE, COURSE.stages[0]).map((l) => l.id)).toEqual(['es.s0.l01', 'es.s0.l02', 'es.s0.l03']);
  });
  it('erste Lektion ist frei, weitere nacheinander – auch nach schwachem Ergebnis', () => {
    const r0 = computeUnlocks(COURSE, input());
    expect(r0.lessons).toMatchObject({ 'es.s0.l01': 'available', 'es.s0.l02': 'locked', 'es.s0.l03': 'locked', 'es.a1.l01': 'locked' });
    expect(r0.nextLesson?.id).toBe('es.s0.l01');
    expect(r0.stages.map((s) => s.state)).toEqual(['available', 'locked', 'coming-soon']);
    const r1 = computeUnlocks(COURSE, input({ lessonProgress: [done('es.s0.l01', 10)] }));
    expect(r1.lessons['es.s0.l01']).toBe('completed');
    expect(r1.lessons['es.s0.l02']).toBe('available');
    expect(r1.nextStep).toMatchObject({ kind: 'lesson' });
  });
  it('Zwischentest nach den Kapitel-Lektionen, Abschlussprüfung nach allen, Boss nach bestandener Prüfung', () => {
    const lp = [done('es.s0.l01'), done('es.s0.l02')];
    const r = computeUnlocks(COURSE, input({ lessonProgress: lp }));
    const st = r.stages[0];
    expect(st.midterms[0]).toMatchObject({ examId: 'es.exam.s0.mid', unlocked: true, passed: false });
    expect(st.final?.unlocked).toBe(false);
    expect(st.final?.lockedReason).toContain('Lektionen');
    // nächster Schritt ist die offene Lektion (vor dem Zwischentest)
    expect(r.nextStep).toMatchObject({ kind: 'lesson', lesson: { id: 'es.s0.l03' } });

    const all = [...lp, done('es.s0.l03')];
    const r2 = computeUnlocks(COURSE, input({ lessonProgress: all }));
    expect(r2.stages[0].final?.unlocked).toBe(true);
    expect(r2.stages[0].boss?.unlocked).toBe(false);
    expect(r2.nextStep).toMatchObject({ kind: 'exam', exam: { id: 'es.exam.s0.mid' } });

    const r3 = computeUnlocks(COURSE, input({ lessonProgress: all, examResults: [exam('es.exam.s0.mid', 'midterm', 80), exam('es.exam.s0.final', 'final', 75)] }));
    expect(r3.stages[0].boss?.unlocked).toBe(true);
    expect(r3.nextStep).toMatchObject({ kind: 'exam', exam: { id: 'es.exam.s0.boss' } });
    expect(r3.stages[1].state).toBe('locked');
  });
  it('nächste Etappe erst bei erfüllter Meisterschaft – mit Liste, was fehlt', () => {
    const all = ['es.s0.l01', 'es.s0.l02', 'es.s0.l03'].map((id) => done(id));
    const results = [exam('es.exam.s0.final', 'final', 72), exam('es.exam.s0.boss', 'boss', 65, true)];
    const weak = computeUnlocks(COURSE, input({ lessonProgress: all, examResults: results, competences: { grammar: { score: 10 } } }));
    expect(weak.stages[0].masteryMet).toBe(false);
    expect(weak.stages[0].missing).toEqual(['Grammatik: mindestens 20 Punkte (aktuell 10)']);
    expect(weak.stages[1].state).toBe('locked');

    const ok = computeUnlocks(COURSE, input({ lessonProgress: all, examResults: results }));
    expect(ok.stages[0]).toMatchObject({ state: 'completed', masteryMet: true, missing: [] });
    expect(ok.stages[1].state).toBe('available');
    expect(ok.lessons['es.a1.l01']).toBe('available');
    expect(ok.nextLesson?.id).toBe('es.a1.l01');

    const fresh = computeUnlocks(COURSE, input());
    expect(fresh.stages[0].missing[0]).toBe('Noch 3 Lektionen abschließen');
    expect(fresh.stages[0].missing.some((m) => m.includes('Abschlussprüfung') && m.includes('70 %'))).toBe(true);
    expect(fresh.stages[0].missing.some((m) => m.includes('Don Tilde'))).toBe(true);
  });
  it('per Einstufung übersprungene Etappen sind komplett frei', () => {
    const cs: CourseState = { courseId: 'es', currentStageId: 'a1', placement: { takenAt: '2026-09-01T00:00:00Z', skipped: false, scorePct: 80, startStage: 'a1' }, skippedStages: ['stage0'] };
    const r = computeUnlocks(COURSE, input({ courseState: cs }));
    expect(r.stages[0]).toMatchObject({ skipped: true });
    expect(r.lessons).toMatchObject({ 'es.s0.l01': 'available', 'es.s0.l02': 'available', 'es.s0.l03': 'available', 'es.a1.l01': 'available' });
    expect(r.stages[0].final?.unlocked).toBe(true);
    expect(r.stages[1].state).toBe('available');
    expect(r.nextLesson?.id).toBe('es.a1.l01');
  });
});

describe('Sprachniveau (getrennt vom Level)', () => {
  it('ohne Prüfungen Einsteiger (nicht nachgewiesen)', () => {
    const l = computeLanguageLevel([], undefined, 'es');
    expect(l).toMatchObject({ level: 'Einsteiger', provisional: false, foundationsConfirmed: false, provenStage: null });
  });
  it('Stufe 0 bestanden = Grundlagen bestätigt, Niveau bleibt Einsteiger', () => {
    const l = computeLanguageLevel([exam('f', 'final', 80), exam('b', 'boss', 70)], undefined, 'es');
    expect(l).toMatchObject({ level: 'Einsteiger', foundationsConfirmed: true, provenStage: 'stage0' });
    expect(l.basis).toContain('Grundlagen bestätigt');
  });
  it('A1-Etappe (Abschluss + Boss) = A1; nur Abschlussprüfung reicht nicht', () => {
    expect(computeLanguageLevel([exam('f', 'final', 80, true, 'a1')], undefined, 'es').level).toBe('Einsteiger');
    const l = computeLanguageLevel([exam('f', 'final', 80, true, 'a1'), exam('b', 'boss', 80, true, 'a1')], undefined, 'es');
    expect(l).toMatchObject({ level: 'A1', provisional: false });
  });
  it('Einstufung → vorläufig, bis Prüfungen es bestätigen', () => {
    const cs: CourseState = { courseId: 'es', currentStageId: 'a2', placement: { takenAt: '', skipped: false, scorePct: 70, startStage: 'a2' } };
    expect(computeLanguageLevel([], cs)).toMatchObject({ level: 'A1', provisional: true });
    const confirmed = computeLanguageLevel([exam('f', 'final', 80, true, 'a2'), exam('b', 'boss', 80, true, 'a2')], cs);
    expect(confirmed).toMatchObject({ level: 'A2', provisional: false });
  });
  it('Native Mastery ist eine Trainingsstufe', () => {
    const l = computeLanguageLevel([exam('f', 'final', 90, true, 'native'), exam('b', 'boss', 90, true, 'native')], undefined, 'es');
    expect(l).toMatchObject({ level: 'Native Mastery', isTrainingLevel: true });
    expect(l.basis).toContain('kein offizielles Zertifikat');
  });
});
