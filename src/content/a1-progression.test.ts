/**
 * Freischaltung mit echtem Kursinhalt und echter Engine: Stufe 0 → A1.
 * Spanisch: A1 komplett (Lektionen, Zwischentests, Abschlussprüfung, Endgegner, Sprachniveau).
 * Portugiesisch: A1 begonnen – Lektionen und Zwischentests verfügbar, Abschluss/Boss ehrlich „folgt“.
 */
import { describe, expect, it } from 'vitest';
import type { CourseId, ExamResult, LessonProgress, Skill } from '../core/types';
import { SKILLS } from '../core/types';
import { computeLanguageLevel, computeUnlocks, orderedStageLessons, type UnlockInput } from '../engine/unlock';
import { buildPathModel } from '../features/path/pathModel';
import { loadCourse } from './registry';
import type { CourseContent, Exam } from './types';

const T = '2026-09-01T10:00:00Z';
const done = (courseId: CourseId, lessonId: string): LessonProgress => ({
  courseId, lessonId, bestScorePct: 80, stars: 2, attempts: 1, firstCompletedAt: T, lastCompletedAt: T, bestCombo: 0,
});
const passed = (e: Exam, scorePct = 90): ExamResult => ({
  at: T, courseId: e.courseId, examId: e.id, kind: e.kind, stageId: e.stageId, scorePct, passed: true, perSkill: {}, durationSec: 300,
});
/** Kompetenzen hoch genug für jede Meisterschaftsschwelle. */
const strong = Object.fromEntries(SKILLS.map((s) => [s, { score: 95 }])) as Record<Skill, { score: number }>;

function exam(c: CourseContent, id: string | undefined): Exam {
  const e = c.exams.find((x) => x.id === id);
  if (!e) throw new Error(`Prüfung ${id} fehlt`);
  return e;
}

/** Stufe 0 vollständig: alle Lektionen + Abschlussprüfung + Endgegner bestanden. */
function stage0Complete(c: CourseContent): { lessonProgress: LessonProgress[]; examResults: ExamResult[] } {
  const s0 = c.stages.find((s) => s.id === 'stage0')!;
  return {
    lessonProgress: orderedStageLessons(c, s0).map((l) => done(c.meta.id, l.id)),
    examResults: [passed(exam(c, s0.finalExamId)), passed(exam(c, s0.bossExamId))],
  };
}

const run = (c: CourseContent, p: Partial<UnlockInput>) =>
  computeUnlocks(c, { lessonProgress: [], examResults: [], competences: strong, ...p });

describe('Spanisch A1 – Freischaltung mit echtem Inhalt', { timeout: 60_000 }, () => {
  it('A1 bleibt zu, bis Stufe 0 (Abschluss + Boss) gemeistert ist', async () => {
    const es = await loadCourse('es');
    const fresh = run(es, {});
    expect(fresh.stages.find((s) => s.stageId === 'a1')?.state).toBe('locked');
    expect(fresh.lessons['es.a1.l01']).toBe('locked');

    const base = stage0Complete(es);
    const onlyFinal = run(es, { ...base, examResults: base.examResults.filter((r) => r.kind === 'final') });
    expect(onlyFinal.stages.find((s) => s.stageId === 'a1')?.state).toBe('locked');

    const r = run(es, base);
    expect(r.stages.find((s) => s.stageId === 'stage0')).toMatchObject({ state: 'completed', masteryMet: true });
    expect(r.stages.find((s) => s.stageId === 'a1')?.state).toBe('available');
    expect(computeLanguageLevel(base.examResults, undefined, 'es')).toMatchObject({ level: 'Einsteiger', foundationsConfirmed: true });
  });

  it('16 A1-Lektionen nacheinander, Zwischentests nach ihren Kapiteln, dann Abschluss, dann Boss → Niveau A1', async () => {
    const es = await loadCourse('es');
    const a1 = es.stages.find((s) => s.id === 'a1')!;
    const ordered = orderedStageLessons(es, a1);
    expect(ordered.map((l) => l.id)).toEqual(Array.from({ length: 16 }, (_, i) => `es.a1.l${String(i + 1).padStart(2, '0')}`));
    expect(a1.chapters.map((ch) => ch.examId)).toEqual(['es.exam.a1.c1', 'es.exam.a1.c2', 'es.exam.a1.c3', 'es.exam.a1.c4', 'es.exam.a1.c5']);

    const base = stage0Complete(es);
    const progress = [...base.lessonProgress];
    for (let k = 0; k <= ordered.length; k++) {
      const r = run(es, { ...base, lessonProgress: progress });
      const st = r.stages.find((s) => s.stageId === 'a1')!;
      // sequenziell: erledigte abgeschlossen, genau die nächste frei, der Rest gesperrt
      ordered.forEach((l, i) => expect(r.lessons[l.id], `${l.id} nach ${k} Lektionen`).toBe(i < k ? 'completed' : i === k ? 'available' : 'locked'));
      if (k < ordered.length) {
        expect(r.nextLesson?.id).toBe(ordered[k].id);
        expect(r.nextStep).toMatchObject({ kind: 'lesson', lesson: { id: ordered[k].id } });
      }
      // Zwischentest genau dann offen, wenn alle Lektionen seines Kapitels erledigt sind
      const doneIds = new Set(ordered.slice(0, k).map((l) => l.id));
      for (const ch of a1.chapters) {
        const gate = st.midterms.find((g) => g.chapterId === ch.id)!;
        expect(gate.unlocked, `${ch.id} nach ${k} Lektionen`).toBe(ch.lessonIds.every((id) => doneIds.has(id)));
      }
      // Abschlussprüfung erst nach allen Lektionen, Boss noch zu
      expect(st.final?.unlocked).toBe(k === ordered.length);
      expect(st.boss?.unlocked).toBe(false);
      if (k < ordered.length) progress.push(done('es', ordered[k].id));
    }

    // alle Lektionen erledigt: nächster Schritt ist der erste offene Zwischentest
    const all = run(es, { ...base, lessonProgress: progress });
    expect(all.nextStep).toMatchObject({ kind: 'exam', exam: { id: 'es.exam.a1.c1' } });

    const midterms = a1.chapters.map((ch) => passed(exam(es, ch.examId)));
    const withMid = run(es, { lessonProgress: progress, examResults: [...base.examResults, ...midterms] });
    expect(withMid.nextStep).toMatchObject({ kind: 'exam', exam: { id: 'es.exam.a1.final' } });

    const fin = passed(exam(es, a1.finalExamId));
    const withFinal = run(es, { lessonProgress: progress, examResults: [...base.examResults, ...midterms, fin] });
    const stF = withFinal.stages.find((s) => s.stageId === 'a1')!;
    expect(stF.boss?.unlocked).toBe(true);
    expect(withFinal.nextStep).toMatchObject({ kind: 'exam', exam: { id: 'es.exam.a1.boss' } });
    expect(computeLanguageLevel([...base.examResults, fin], undefined, 'es').level).toBe('Einsteiger');

    const boss = passed(exam(es, a1.bossExamId));
    const results = [...base.examResults, ...midterms, fin, boss];
    const r = run(es, { lessonProgress: progress, examResults: results });
    expect(r.stages.find((s) => s.stageId === 'a1')).toMatchObject({ state: 'completed', masteryMet: true, missing: [] });
    expect(r.stages.find((s) => s.stageId === 'a2')?.state).toBe('coming-soon');
    expect(computeLanguageLevel(results, undefined, 'es')).toMatchObject({ level: 'A1', provisional: false, provenStage: 'a1' });
  });

  it('Lernpfad-Modell: A1 hat 5 Kapitel mit Zwischentest sowie Abschlussprüfung und Endgegner', async () => {
    const es = await loadCourse('es');
    const worlds = buildPathModel(es, run(es, stage0Complete(es)));
    const a1 = worlds.find((w) => w.stage.id === 'a1')!;
    expect(a1.chapters.map((c) => [c.lessonsTotal, c.planned, c.nodes.at(-1)?.id])).toEqual([
      [4, false, 'es.exam.a1.c1'],
      [3, false, 'es.exam.a1.c2'],
      [3, false, 'es.exam.a1.c3'],
      [3, false, 'es.exam.a1.c4'],
      [3, false, 'es.exam.a1.c5'],
    ]);
    expect(a1.finale.map((n) => [n.id, n.exam.kind])).toEqual([['es.exam.a1.final', 'final'], ['es.exam.a1.boss', 'boss']]);
  });
});

describe('Portugiesisch A1 (begonnen) – Freischaltung mit echtem Inhalt', { timeout: 60_000 }, () => {
  it('A1 ist nach Stufe 0 verfügbar; 6 Lektionen, 2 Zwischentests; Abschluss & Boss ehrlich „folgt“', async () => {
    const pt = await loadCourse('pt-BR');
    const a1 = pt.stages.find((s) => s.id === 'a1')!;
    expect(a1.available).toBe(true);
    const ordered = orderedStageLessons(pt, a1);
    expect(ordered.map((l) => l.id)).toEqual(['pt.a1.l01', 'pt.a1.l02', 'pt.a1.l03', 'pt.a1.l04', 'pt.a1.l05', 'pt.a1.l06']);

    const base = stage0Complete(pt);
    const r0 = run(pt, base);
    expect(r0.stages.find((s) => s.stageId === 'a1')?.state).toBe('available');
    expect(r0.lessons).toMatchObject({ 'pt.a1.l01': 'available', 'pt.a1.l02': 'locked' });
    expect(r0.nextStep).toMatchObject({ kind: 'lesson', lesson: { id: 'pt.a1.l01' } });

    const progress = [...base.lessonProgress, ...ordered.slice(0, 3).map((l) => done('pt-BR', l.id))];
    const r1 = run(pt, { ...base, lessonProgress: progress });
    const st1 = r1.stages.find((s) => s.stageId === 'a1')!;
    expect(st1.midterms.map((g) => [g.examId, g.unlocked])).toEqual([['pt.exam.a1.c1', true], ['pt.exam.a1.c2', false]]);
    expect(r1.lessons['pt.a1.l04']).toBe('available');

    const all = [...base.lessonProgress, ...ordered.map((l) => done('pt-BR', l.id))];
    const mids = a1.chapters.filter((ch) => ch.examId).map((ch) => passed(exam(pt, ch.examId)));
    const r = run(pt, { lessonProgress: all, examResults: [...base.examResults, ...mids] });
    const st = r.stages.find((s) => s.stageId === 'a1')!;
    expect(st).toMatchObject({ state: 'available', masteryMet: false, final: null, boss: null, lessonsDone: 6, lessonsTotal: 6 });
    expect(st.missing).toEqual(expect.arrayContaining([
      'Die Abschlussprüfung dieser Etappe folgt in einem Update.',
      'Der Endgegner dieser Etappe folgt in einem Update.',
    ]));
    expect(r.nextStep).toMatchObject({ kind: 'done', stageId: 'a1' });
    const msg = r.nextStep.kind === 'done' ? r.nextStep.message : '';
    expect(msg).toContain('Die Abschlussprüfung dieser Etappe folgt in einem Update.');
    expect(msg).not.toContain('..');
    // Niveau bleibt ehrlich „Einsteiger“ (Grundlagen bestätigt) – A1 lässt sich noch nicht nachweisen
    expect(computeLanguageLevel([...base.examResults, ...mids], undefined, 'pt-BR')).toMatchObject({ level: 'Einsteiger', foundationsConfirmed: true });

    const worlds = buildPathModel(pt, r);
    const w = worlds.find((x) => x.stage.id === 'a1')!;
    expect(w.chapters.map((c) => [c.lessonsTotal, c.planned])).toEqual([[3, false], [3, false], [0, true], [0, true]]);
    expect(w.finale).toEqual([]);
  });
});
