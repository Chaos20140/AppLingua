/**
 * Freischaltung im Lernpfad und nachgewiesenes Sprachniveau.
 *
 * Regeln:
 * - Lektionen einer verfügbaren Etappe werden nacheinander frei (die erste immer).
 *   Abschluss zählt unabhängig von der Punktzahl – Fehler sperren nie.
 * - Per Einstufung übersprungene Etappen sind komplett frei (inkl. Prüfungen).
 * - Zwischentest: nach allen Lektionen seines Kapitels. Abschlussprüfung: nach allen Lektionen.
 *   Endgegner (Boss): nach bestandener Abschlussprüfung.
 * - Nächste Etappe: stage.mastery erfüllt (finalPct, bossPct, minSkills).
 * - Sprachniveau (getrennt vom XP-Level): Abschlussprüfung + Boss je Etappe. Einstufung → „vorläufig“.
 */
import {
  STAGE_ORDER, type CourseId, type CourseState, type ExamResult, type LanguageLevel, type LessonProgress, type Skill, type StageId,
} from '../core/types';
import type { CourseContent, Exam, Lesson, Stage } from '../content/types';
import { SKILL_LABELS } from './competence';

export type LessonState = 'locked' | 'available' | 'completed';
export type StageState = 'locked' | 'available' | 'completed' | 'coming-soon';

export interface ExamGate {
  examId: string;
  kind: 'midterm' | 'final' | 'boss';
  title: string;
  chapterId?: string;
  unlocked: boolean;
  passed: boolean;
  /** bestes Ergebnis in % oder null (noch nicht versucht) */
  bestPct: number | null;
  attempts: number;
  /** Warum noch gesperrt (deutsch) */
  lockedReason?: string;
}

export interface StageStatus {
  stageId: StageId;
  title: string;
  short: string;
  state: StageState;
  /** per Einstufungstest übersprungen (alles frei) */
  skipped: boolean;
  lessonsDone: number;
  lessonsTotal: number;
  /** 0..1 Lektionsfortschritt */
  progress: number;
  midterms: ExamGate[];
  final: ExamGate | null;
  boss: ExamGate | null;
  /** Voraussetzungen für die nächste Etappe erfüllt */
  masteryMet: boolean;
  /** Was fehlt noch bis zur nächsten Etappe (deutsch) */
  missing: string[];
}

export type NextStep =
  | { kind: 'lesson'; lesson: Lesson; stageId: StageId }
  | { kind: 'exam'; exam: Exam; stageId: StageId }
  | { kind: 'done'; stageId: StageId | null; message: string };

export interface UnlockInput {
  courseState?: CourseState;
  lessonProgress: readonly LessonProgress[];
  examResults: readonly ExamResult[];
  /** Kompetenzwerte 0–100 je Skill (für stage.mastery.minSkills) */
  competences: Partial<Record<Skill, { score: number }>>;
}

export interface UnlockResult {
  stages: StageStatus[];
  lessons: Record<string, LessonState>;
  /** nächste offene Lektion (oder null) */
  nextLesson: Lesson | null;
  /** nächster sinnvoller Schritt: Lektion, Prüfung oder fertig */
  nextStep: NextStep;
}

const stageRank = (id: StageId) => STAGE_ORDER.indexOf(id);

/** Lektionen einer Etappe in Lernreihenfolge (Kapitelreihenfolge, dann `order`). */
export function orderedStageLessons(content: CourseContent, stage: Stage): Lesson[] {
  const byId = new Map(content.lessons.map((l) => [l.id, l]));
  const seen = new Set<string>();
  const out: Lesson[] = [];
  for (const ch of stage.chapters) {
    for (const id of ch.lessonIds) {
      const l = byId.get(id);
      if (l && !seen.has(id)) { seen.add(id); out.push(l); }
    }
  }
  // Lektionen der Etappe, die in keinem Kapitel stehen, hinten anhängen
  const rest = content.lessons
    .filter((l) => l.stageId === stage.id && !seen.has(l.id))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return out.concat(rest);
}

function examStats(results: readonly ExamResult[], examId: string) {
  let best: number | null = null;
  let passed = false;
  let attempts = 0;
  for (const r of results) {
    if (r.examId !== examId) continue;
    attempts++;
    if (best === null || r.scorePct > best) best = r.scorePct;
    if (r.passed) passed = true;
  }
  return { best, passed, attempts };
}

/** Etappen, die laut Einstufung übersprungen wurden. */
export function skippedStagesOf(state?: CourseState): Set<StageId> {
  const out = new Set<StageId>(state?.skippedStages ?? []);
  const p = state?.placement;
  if (p && !p.skipped) for (const s of STAGE_ORDER) if (stageRank(s) < stageRank(p.startStage)) out.add(s);
  return out;
}

export function computeUnlocks(content: CourseContent, input: UnlockInput): UnlockResult {
  const courseId: CourseId = content.meta.id;
  const done = new Set(
    input.lessonProgress.filter((p) => p.courseId === courseId && p.attempts > 0).map((p) => p.lessonId),
  );
  const results = input.examResults.filter((r) => r.courseId === courseId);
  const examById = new Map(content.exams.map((e) => [e.id, e]));
  const skipped = skippedStagesOf(input.courseState);
  const placementStart = input.courseState?.placement && !input.courseState.placement.skipped
    ? input.courseState.placement.startStage : null;

  const stages = content.stages.slice().sort((a, b) => stageRank(a.id) - stageRank(b.id));
  const lessons: Record<string, LessonState> = {};
  const statuses: StageStatus[] = [];
  let prevOpen = true; // erste Etappe ist immer offen
  let nextStep: NextStep | null = null;
  let nextLesson: Lesson | null = null;

  for (const [idx, stage] of stages.entries()) {
    const isSkipped = skipped.has(stage.id);
    const unlocked: boolean = idx === 0 || isSkipped || placementStart === stage.id || prevOpen;
    const ordered = orderedStageLessons(content, stage);
    const usable = unlocked && stage.available;

    // Lektionen
    let prevDone = true;
    let doneCount = 0;
    for (const l of ordered) {
      const isDone = done.has(l.id);
      if (isDone) doneCount++;
      let state: LessonState;
      if (isDone) state = 'completed';
      else if (usable && (isSkipped || prevDone)) state = 'available';
      else state = 'locked';
      lessons[l.id] = state;
      prevDone = isDone;
      if (state === 'available' && !nextLesson && !isSkipped) nextLesson = l;
    }
    const allDone = ordered.length > 0 && doneCount === ordered.length;

    // Zwischentests
    const midterms: ExamGate[] = [];
    for (const ch of stage.chapters) {
      if (!ch.examId) continue;
      const exam = examById.get(ch.examId);
      if (!exam) continue;
      const chLessons = ch.lessonIds.filter((id) => ordered.some((l) => l.id === id));
      const chDone = chLessons.length > 0 && chLessons.every((id) => done.has(id));
      const st = examStats(results, exam.id);
      const open = usable && (chDone || isSkipped);
      midterms.push({
        examId: exam.id, kind: 'midterm', title: exam.title, chapterId: ch.id,
        unlocked: open, passed: st.passed, bestPct: st.best, attempts: st.attempts,
        lockedReason: open ? undefined : !usable ? 'Etappe noch nicht freigeschaltet' : `Schließe zuerst alle Lektionen von „${ch.title}“ ab.`,
      });
    }

    // Abschlussprüfung & Boss
    const finalExam = stage.finalExamId ? examById.get(stage.finalExamId) : undefined;
    const bossExam = stage.bossExamId ? examById.get(stage.bossExamId) : undefined;
    const fs = finalExam ? examStats(results, finalExam.id) : null;
    const bs = bossExam ? examStats(results, bossExam.id) : null;
    const finalOpen = usable && (allDone || isSkipped);
    const final: ExamGate | null = finalExam && fs ? {
      examId: finalExam.id, kind: 'final', title: finalExam.title,
      unlocked: finalOpen, passed: fs.passed, bestPct: fs.best, attempts: fs.attempts,
      lockedReason: finalOpen ? undefined : !usable ? 'Etappe noch nicht freigeschaltet' : `Schließe zuerst alle ${ordered.length} Lektionen ab.`,
    } : null;
    const bossOpen = usable && !!fs?.passed;
    const boss: ExamGate | null = bossExam && bs ? {
      examId: bossExam.id, kind: 'boss', title: bossExam.title,
      unlocked: bossOpen, passed: bs.passed, bestPct: bs.best, attempts: bs.attempts,
      lockedReason: bossOpen ? undefined : 'Bestehe zuerst die Abschlussprüfung.',
    } : null;

    // Meisterschaft → nächste Etappe
    const missing: string[] = [];
    const m = stage.mastery;
    if (!stage.available) missing.push('Die Inhalte dieser Etappe folgen in einem Update.');
    const openLessons = ordered.length - doneCount;
    if (stage.available && openLessons > 0 && !isSkipped) {
      missing.push(`Noch ${openLessons} ${openLessons === 1 ? 'Lektion' : 'Lektionen'} abschließen`);
    }
    let finalOk = false;
    if (!finalExam) {
      if (stage.available) missing.push('Die Abschlussprüfung dieser Etappe folgt in einem Update.');
    } else {
      finalOk = (fs?.best ?? -1) >= m.finalPct && !!fs?.passed;
      if (!finalOk) {
        missing.push(`Abschlussprüfung „${finalExam.title}“ mit mindestens ${Math.max(m.finalPct, finalExam.passPct)} % bestehen` +
          (fs?.best != null ? ` (bisher ${Math.round(fs.best)} %)` : ''));
      }
    }
    let bossOk = false;
    if (!bossExam) {
      if (stage.available) missing.push('Der Endgegner dieser Etappe folgt in einem Update.');
    } else {
      bossOk = (bs?.best ?? -1) >= m.bossPct && !!bs?.passed;
      if (!bossOk) {
        const name = bossExam.boss?.name ?? bossExam.title;
        missing.push(`Endgegner „${name}“ mit mindestens ${Math.max(m.bossPct, bossExam.passPct)} % besiegen` +
          (bs?.best != null ? ` (bisher ${Math.round(bs.best)} %)` : ''));
      }
    }
    let skillsOk = true;
    for (const [skill, min] of Object.entries(m.minSkills ?? {}) as [Skill, number][]) {
      const cur = Math.round(input.competences[skill]?.score ?? 0);
      if (cur < min) {
        skillsOk = false;
        missing.push(`${SKILL_LABELS[skill]}: mindestens ${min} Punkte (aktuell ${cur})`);
      }
    }
    const masteryMet = !!finalExam && !!bossExam && finalOk && bossOk && skillsOk;

    const state: StageState = !stage.available ? 'coming-soon' : !unlocked ? 'locked' : masteryMet ? 'completed' : 'available';
    statuses.push({
      stageId: stage.id, title: stage.title, short: stage.short, state, skipped: isSkipped,
      lessonsDone: doneCount, lessonsTotal: ordered.length,
      progress: ordered.length ? doneCount / ordered.length : 0,
      midterms, final, boss, masteryMet, missing: masteryMet ? [] : missing,
    });

    // Nächster Schritt: erste Etappe (Reihenfolge), die offen und nicht abgeschlossen ist
    if (!nextStep && usable && !masteryMet && !isSkipped) {
      const lesson = ordered.find((l) => lessons[l.id] === 'available');
      const midterm = midterms.find((g) => g.unlocked && !g.passed);
      if (lesson) nextStep = { kind: 'lesson', lesson, stageId: stage.id };
      else if (midterm && examById.get(midterm.examId)) nextStep = { kind: 'exam', exam: examById.get(midterm.examId)!, stageId: stage.id };
      else if (final && final.unlocked && !finalOk && finalExam) nextStep = { kind: 'exam', exam: finalExam, stageId: stage.id };
      else if (boss && boss.unlocked && !bossOk && bossExam) nextStep = { kind: 'exam', exam: bossExam, stageId: stage.id };
    }

    prevOpen = unlocked && (masteryMet || isSkipped);
  }

  if (!nextStep) {
    const lastOpen = [...statuses].reverse().find((s) => s.state === 'available' || s.state === 'completed');
    const blocked = statuses.find((s) => s.state === 'available' && !s.masteryMet);
    nextStep = {
      kind: 'done',
      stageId: blocked?.stageId ?? lastOpen?.stageId ?? null,
      message: blocked
        ? `Für die nächste Etappe fehlt noch: ${blocked.missing[0] ?? 'etwas Übung'}.`
        : 'Du hast alle verfügbaren Inhalte abgeschlossen – neue Etappen folgen. Nutze Wiederholung, Songs und den KI-Partner, um in Form zu bleiben.',
    };
  }
  return { stages: statuses, lessons, nextLesson, nextStep };
}

// ───────────────────────── Sprachniveau ─────────────────────────

export const STAGE_LEVEL: Record<StageId, LanguageLevel> = {
  stage0: 'Einsteiger', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1', c2: 'C2', native: 'Native Mastery',
};

export const LANGUAGE_LEVEL_ORDER: LanguageLevel[] = ['Einsteiger', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native Mastery'];
export const languageLevelRank = (l: LanguageLevel) => LANGUAGE_LEVEL_ORDER.indexOf(l);

export interface LanguageLevelInfo {
  level: LanguageLevel;
  /** true = nur laut Einstufungstest, noch nicht durch Prüfungen bestätigt */
  provisional: boolean;
  /** Begründung (deutsch) */
  basis: string;
  /** Stufe 0 bestanden („Grundlagen bestätigt“) */
  foundationsConfirmed: boolean;
  /** höchste Etappe mit bestandener Abschlussprüfung + Boss */
  provenStage: StageId | null;
  /** Native Mastery ist eine Trainingsstufe, kein Zertifikat */
  isTrainingLevel: boolean;
}

/** Etappen, deren Abschlussprüfung UND Boss bestanden wurden. */
export function provenStages(examResults: readonly ExamResult[], courseId?: CourseId): Set<StageId> {
  const finals = new Set<StageId>();
  const bosses = new Set<StageId>();
  for (const r of examResults) {
    if ((courseId && r.courseId !== courseId) || !r.passed || !r.stageId) continue;
    if (r.kind === 'final') finals.add(r.stageId);
    else if (r.kind === 'boss') bosses.add(r.stageId);
  }
  return new Set([...finals].filter((s) => bosses.has(s)));
}

export function computeLanguageLevel(examResults: readonly ExamResult[], courseState?: CourseState, courseId?: CourseId): LanguageLevelInfo {
  const cid = courseId ?? courseState?.courseId;
  const proven = provenStages(examResults, cid);
  let provenStage: StageId | null = null;
  for (const s of STAGE_ORDER) if (proven.has(s)) provenStage = s;
  const foundationsConfirmed = proven.size > 0;
  const provenLevel: LanguageLevel = provenStage ? STAGE_LEVEL[provenStage] : 'Einsteiger';

  const p = courseState?.placement;
  let placementLevel: LanguageLevel | null = null;
  if (p && !p.skipped) {
    const idx = stageRank(p.startStage);
    if (idx >= 1) placementLevel = STAGE_LEVEL[STAGE_ORDER[idx - 1]];
  }

  if (placementLevel && languageLevelRank(placementLevel) > languageLevelRank(provenLevel)) {
    return {
      level: placementLevel, provisional: true, foundationsConfirmed, provenStage, isTrainingLevel: false,
      basis: `Vorläufig laut Einstufungstest – bestätige ${placementLevel === 'Einsteiger' ? 'deine Grundlagen' : `dein Niveau ${placementLevel}`} mit Abschlussprüfung und Endgegner.`,
    };
  }
  if (!provenStage) {
    return {
      level: 'Einsteiger', provisional: false, foundationsConfirmed: false, provenStage: null, isTrainingLevel: false,
      basis: 'Noch nicht nachgewiesen – Abschlussprüfung und Endgegner einer Etappe bestätigen dein Niveau.',
    };
  }
  if (provenStage === 'stage0') {
    return {
      level: 'Einsteiger', provisional: false, foundationsConfirmed: true, provenStage, isTrainingLevel: false,
      basis: 'Grundlagen bestätigt: Abschlussprüfung und Endgegner von Stufe 0 bestanden. Als Nächstes: A1.',
    };
  }
  if (provenStage === 'native') {
    return {
      level: 'Native Mastery', provisional: false, foundationsConfirmed: true, provenStage, isTrainingLevel: true,
      basis: 'Trainingsstufe „Native Mastery“ abgeschlossen – ein anspruchsvolles Trainingsziel, kein offizielles Zertifikat.',
    };
  }
  return {
    level: provenLevel, provisional: false, foundationsConfirmed: true, provenStage, isTrainingLevel: false,
    basis: `Nachgewiesen durch Abschlussprüfung und Endgegner der Etappe ${provenLevel} (Trainingsniveau, kein offizielles Zertifikat).`,
  };
}
