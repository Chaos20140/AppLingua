/**
 * Aktionen: schreiben Ereignisse/Datensätze über den Store und vergeben Belohnungen idempotent.
 * Abgeleitete Werte (XP-Summe, Level, Serie, Kompetenzen …) werden nie gespeichert.
 */
import {
  STAGE_ORDER,
  type AnswerEvent, type CollectionData, type CollectionName, type CourseId, type ErrorEntry, type ExamResult,
  type ExerciseContext, type LessonProgress, type PartnerSession, type PlacementResult, type PronAttempt, type Skill,
  type SongProgress, type SrsCard, type StageId, type XpEvent, type XpReason,
} from '../core/types';
import type { CourseContent, Exam, Exercise, Lesson, Song } from '../content/types';
import { appendEvent, getRecord, listRecords, nowIso, putRecord, removeRecord, uid } from '../data/store';
import { computeCompetences } from '../engine/competence';
import { todayKey } from '../engine/dates';
import { explainMistake, exercisePrompt, type ExerciseOutcome } from '../engine/grading';
import { levelForXp, titleForLevel } from '../engine/levels';
import { checkClaim, type MissionSource } from '../engine/missions';
import { SONG_BOSS_PASS_PCT, SONG_LINE_LEARNED_PCT, songMastery } from '../engine/songs';
import { cardId, newCard, scheduleCard, type NewCardInput, type SrsGrade } from '../engine/srs';
import { computeUnlocks, type StageStatus } from '../engine/unlock';
import { XP, XP_IDS, answerXp, examXp, reviewSessionXp, totalXp } from '../engine/xp';
import { evaluateBadges } from './badges';
import { emitReward } from './rewards';
import { getCourseState, getSettings, updateCourseState, variantOf } from './settings';

const rows = <C extends CollectionName>(c: C): CollectionData[C][] => listRecords(c).map((r) => r.data);
const currentLevel = () => levelForXp(totalXp(rows('xpEvents')));

function trackLevel<T>(fn: () => T): { result: T; levelUp: number | null } {
  const before = currentLevel();
  const result = fn();
  const after = currentLevel();
  return { result, levelUp: after > before ? after : null };
}

// ───────────────────────── XP ─────────────────────────

/**
 * Vergibt XP. Mit `id` idempotent (gleiche ID → keine zweite Vergabe, auch geräteübergreifend).
 * Gibt die tatsächlich vergebene Menge zurück (0, wenn bereits vorhanden).
 */
export function awardXp(amount: number, reason: XpReason, opts: { courseId?: CourseId; ref?: string; id?: string; at?: string } = {}): number {
  const value = Math.round(amount);
  if (!(value > 0)) return 0;
  if (opts.id && getRecord('xpEvents', opts.id)) return 0;
  const before = totalXp(rows('xpEvents'));
  const ev: XpEvent = { at: opts.at ?? nowIso(), amount: value, reason };
  if (opts.courseId) ev.courseId = opts.courseId;
  if (opts.ref) ev.ref = opts.ref;
  if (!appendEvent('xpEvents', ev, opts.id ?? `xp:${uid()}`)) return 0;
  const lb = levelForXp(before);
  const la = levelForXp(before + value);
  emitReward({ type: 'xp', amount: value, reason });
  if (la > lb) emitReward({ type: 'level-up', level: la, title: titleForLevel(la) });
  return value;
}

// ───────────────────────── Antworten & Fehlerarchiv ─────────────────────────

const XP_CONTEXTS: Partial<Record<ExerciseContext, XpReason>> = {
  lesson: 'exercise', review: 'exercise', grammar: 'grammar', vocab: 'vocab',
};

export interface RecordAnswerInput {
  courseId: CourseId;
  exercise: Exercise;
  outcome: ExerciseOutcome;
  context: ExerciseContext;
  /** z. B. lessonId, examId, topicId, songId */
  refId?: string;
  /** Anzahl richtiger Antworten in Folge inkl. dieser (für den Kombo-Bonus) */
  combo?: number;
  /** XP vergeben? Standard: ja in Lektion, Wiederholung, Grammatik und Vokabeln (Prüfungen belohnen am Ende). */
  awardXp?: boolean;
}

export interface RecordAnswerResult {
  answerId: string;
  xp: number;
  levelUp: number | null;
  /** Auswirkung aufs Fehlerarchiv */
  error: 'new' | 'repeat' | 'progress' | 'resolved' | null;
  newBadges: string[];
}

/** Speichert eine Antwort, pflegt das Fehlerarchiv und vergibt XP (inkl. Kombo-Bonus). */
export function recordAnswer(input: RecordAnswerInput): RecordAnswerResult {
  const { courseId, exercise, outcome, context, refId } = input;
  const at = nowIso();
  const answerId = uid();
  const ev: AnswerEvent = {
    at, courseId,
    exerciseId: exercise.id,
    exerciseType: exercise.type,
    context,
    skills: exercise.skills?.length ? exercise.skills : ['grammar'],
    topicIds: exercise.topicIds ?? [],
    correct: outcome.correct,
    score: Math.round(Math.max(0, Math.min(1, outcome.score)) * 1000) / 1000,
    userAnswer: (outcome.userAnswer ?? '').slice(0, 500),
    durationMs: outcome.durationMs,
  };
  if (refId) ev.refId = refId;
  if (outcome.accentOnly) ev.accentOnly = true;
  appendEvent('answers', ev, answerId);

  // Fehlerarchiv (Einstufung ist Diagnose, kein Fehler)
  let error: RecordAnswerResult['error'] = null;
  if (context !== 'placement') {
    const eid = `${courseId}:${exercise.id}`;
    const prev = getRecord('errorEntries', eid);
    if (!outcome.correct) {
      const explanation = outcome.explanation ?? explainMistake(exercise, outcome.userAnswer, outcome.expected);
      const entry: ErrorEntry = prev
        ? { ...prev, context, userAnswer: ev.userAnswer ?? '', correctAnswer: outcome.expected, explanation, count: prev.count + 1, lastAt: at, correctSince: 0 }
        : {
          courseId, exerciseId: exercise.id, context, skill: (exercise.skills?.[0] ?? 'grammar') as Skill,
          topicIds: exercise.topicIds ?? [], prompt: exercisePrompt(exercise).slice(0, 500),
          userAnswer: ev.userAnswer ?? '', correctAnswer: outcome.expected, explanation,
          count: 1, firstAt: at, lastAt: at, correctSince: 0,
        };
      if (refId) entry.refId = refId;
      delete entry.resolvedAt;
      putRecord('errorEntries', eid, entry);
      error = prev ? 'repeat' : 'new';
    } else if (prev && !prev.resolvedAt) {
      const correctSince = prev.correctSince + 1;
      const next: ErrorEntry = { ...prev, correctSince };
      if (correctSince >= 2) next.resolvedAt = at;
      putRecord('errorEntries', eid, next);
      error = correctSince >= 2 ? 'resolved' : 'progress';
    }
  }

  // XP
  let xp = 0;
  let levelUp: number | null = null;
  const reason = XP_CONTEXTS[context];
  const shouldAward = input.awardXp ?? !!reason;
  if (outcome.correct && shouldAward) {
    const t = trackLevel(() => awardXp(answerXp(input.combo ?? 0), reason ?? 'exercise', { courseId, ref: refId ?? exercise.id, id: XP_IDS.answer(answerId) }));
    xp = t.result;
    levelUp = t.levelUp;
  }
  const newBadges = xp > 0 || error === 'resolved' ? evaluateBadges() : [];
  return { answerId, xp, levelUp, error, newBadges };
}

// ───────────────────────── Lektionen ─────────────────────────

export const starsFor = (scorePct: number): 1 | 2 | 3 => (scorePct >= 100 ? 3 : scorePct >= 80 ? 2 : 1);

export interface CompleteLessonInput {
  courseId: CourseId;
  lesson: Lesson;
  /** 0–100 */
  scorePct: number;
  bestCombo: number;
  durationSec: number;
}

export interface CompleteLessonResult {
  xp: number;
  stars: 1 | 2 | 3;
  firstTime: boolean;
  perfect: boolean;
  newBadges: string[];
  levelUp: number | null;
  /** neu angelegte Vokabelkarten */
  newCards: number;
}

/** Lektion abschließen: Fortschritt (Maximum), Vokabelkarten, XP (50 + 25 fehlerfrei, Wiederholung 15/Tag). */
export function completeLesson(input: CompleteLessonInput): CompleteLessonResult {
  const { courseId, lesson } = input;
  const scorePct = Math.round(Math.max(0, Math.min(100, input.scorePct)));
  const perfect = scorePct >= 100;
  const stars = starsFor(scorePct);
  const at = nowIso();
  const id = `${courseId}:${lesson.id}`;
  const prev = getRecord('lessonProgress', id);
  const firstTime = !prev;
  const duration = input.durationSec > 0 ? Math.round(input.durationSec) : undefined;

  const next: LessonProgress = prev
    ? {
      ...prev,
      bestScorePct: Math.max(prev.bestScorePct, scorePct),
      stars: Math.max(prev.stars, stars) as LessonProgress['stars'],
      attempts: prev.attempts + 1,
      lastCompletedAt: at,
      bestCombo: Math.max(prev.bestCombo, input.bestCombo || 0),
    }
    : { courseId, lessonId: lesson.id, bestScorePct: scorePct, stars, attempts: 1, firstCompletedAt: at, lastCompletedAt: at, bestCombo: input.bestCombo || 0 };
  const bestDur = [prev?.bestDurationSec, duration].filter((d): d is number => typeof d === 'number' && d > 0);
  if (bestDur.length) next.bestDurationSec = Math.min(...bestDur);
  putRecord('lessonProgress', id, next);

  // Vokabeln in den Trainer übernehmen (passend zur Variante)
  const variant = variantOf(getSettings(), courseId);
  let newCards = 0;
  for (const v of lesson.vocab) {
    if (v.variant && v.variant !== variant) continue;
    const hint = [v.gender ? `(${v.gender})` : '', v.plural ? `Pl. ${v.plural}` : ''].filter(Boolean).join(' ');
    const before = getRecord('vocabCards', cardId(courseId, v.id));
    addSrsCard({
      courseId, itemId: v.id, kind: v.pos === 'phrase' ? 'phrase' : 'vocab', front: v.target, back: v.german,
      hint: hint || undefined, source: { type: 'lesson', ref: lesson.id, label: lesson.title },
    });
    if (!before) newCards++;
  }

  const cs = getCourseState(courseId);
  const laterStage = STAGE_ORDER.indexOf(lesson.stageId) > STAGE_ORDER.indexOf(cs.currentStageId);
  updateCourseState(courseId, { currentLessonId: lesson.id, lastActivityAt: at, ...(laterStage ? { currentStageId: lesson.stageId } : {}) });

  const { result: xp, levelUp } = trackLevel(() => {
    let sum = 0;
    const first = awardXp(XP.lesson, 'lesson', { courseId, ref: lesson.id, id: XP_IDS.lessonFirst(lesson.id) });
    sum += first;
    if (!first) sum += awardXp(XP.lessonRepeat, 'lesson', { courseId, ref: lesson.id, id: XP_IDS.lessonRepeat(lesson.id, todayKey()) });
    if (perfect) sum += awardXp(XP.lessonPerfect, 'perfect', { courseId, ref: lesson.id, id: XP_IDS.lessonPerfect(lesson.id) });
    return sum;
  });

  return { xp, stars, firstTime, perfect, newBadges: evaluateBadges(), levelUp, newCards };
}

// ───────────────────────── Prüfungen & Einstufung ─────────────────────────

export interface RecordExamInput {
  courseId: CourseId;
  exam?: Exam;
  examId?: string;
  kind?: ExamResult['kind'];
  stageId?: StageId;
  /** 0–100 */
  scorePct: number;
  perSkill?: Partial<Record<Skill, number>>;
  durationSec: number;
  /** Bestehensgrenze, falls kein Exam-Objekt übergeben wird (Standard 70) */
  passPct?: number;
  /** Kursinhalt – nötig, um eine neu freigeschaltete Etappe zu melden */
  content?: CourseContent;
}

export interface RecordExamResult {
  passed: boolean;
  /** erstmals bestanden */
  firstPass: boolean;
  xp: number;
  unlockedStage?: StageId;
  levelUp: number | null;
  newBadges: string[];
}

function stageStates(content: CourseContent, courseId: CourseId): StageStatus[] {
  const competences = computeCompetences({ answers: rows('answers'), pronAttempts: rows('pronAttempts'), examResults: rows('examResults') }, courseId);
  return computeUnlocks(content, {
    courseState: getCourseState(courseId),
    lessonProgress: rows('lessonProgress'),
    examResults: rows('examResults'),
    competences,
  }).stages;
}

const isOpen = (s: StageStatus) => s.state === 'available' || s.state === 'completed';

export function recordExam(input: RecordExamInput): RecordExamResult {
  const examId = input.exam?.id ?? input.examId;
  if (!examId) throw new Error('recordExam: exam oder examId fehlt');
  const kind: ExamResult['kind'] = input.exam?.kind ?? input.kind ?? 'midterm';
  const stageId = input.exam?.stageId ?? input.stageId;
  const scorePct = Math.round(Math.max(0, Math.min(100, input.scorePct)));
  const passPct = input.exam?.passPct ?? input.passPct ?? 70;
  const passed = scorePct >= passPct;
  const courseId = input.courseId;
  const before = input.content ? stageStates(input.content, courseId) : null;
  const alreadyPassed = rows('examResults').some((r) => r.examId === examId && r.passed);

  const result: ExamResult = {
    at: nowIso(), courseId, examId, kind, scorePct, passed,
    perSkill: input.perSkill ?? {}, durationSec: Math.max(0, Math.round(input.durationSec)),
  };
  if (stageId) result.stageId = stageId;
  appendEvent('examResults', result, `exam:${examId}:${uid()}`);

  const { result: xp, levelUp } = trackLevel(() => {
    const reason: XpReason = kind === 'boss' ? 'boss' : kind === 'song-boss' ? 'song-boss' : kind === 'placement' ? 'placement' : 'exam';
    if (passed) return awardXp(examXp(kind), reason, { courseId, ref: examId, id: XP_IDS.examPassed(examId) });
    return awardXp(XP.examEffort, 'exam', { courseId, ref: examId, id: XP_IDS.examEffort(examId, todayKey()) });
  });

  let unlockedStage: StageId | undefined;
  if (input.content && before) {
    const after = stageStates(input.content, courseId);
    const newly = after.find((s) => isOpen(s) && !isOpen(before.find((b) => b.stageId === s.stageId) ?? s) );
    if (newly) {
      unlockedStage = newly.stageId;
      updateCourseState(courseId, { currentStageId: newly.stageId });
    }
  }
  updateCourseState(courseId, { lastActivityAt: result.at });
  return { passed, firstPass: passed && !alreadyPassed, xp, unlockedStage, levelUp, newBadges: evaluateBadges() };
}

/** Ergebnis des Einstufungstests speichern (oder „übersprungen“). Übersprungene Etappen werden frei. */
export function recordPlacement(courseId: CourseId, result: PlacementResult, opts: { perSkill?: Partial<Record<Skill, number>>; durationSec?: number } = {}): { xp: number; newBadges: string[] } {
  const startRank = STAGE_ORDER.indexOf(result.startStage);
  const skippedStages = result.skipped ? [] : STAGE_ORDER.filter((_, i) => i < startRank);
  updateCourseState(courseId, {
    placement: result,
    currentStageId: result.skipped ? 'stage0' : result.startStage,
    skippedStages,
    lastActivityAt: result.takenAt,
  });
  let xp = 0;
  if (!result.skipped) {
    appendEvent('examResults', {
      at: result.takenAt || nowIso(), courseId, examId: `${courseId}.placement`, kind: 'placement',
      stageId: result.startStage, scorePct: Math.round(result.scorePct), passed: true,
      perSkill: opts.perSkill ?? {}, durationSec: Math.max(0, Math.round(opts.durationSec ?? 0)),
    }, `placement:${courseId}:${uid()}`);
    xp = awardXp(XP.placement, 'placement', { courseId, id: XP_IDS.placement(courseId) });
  }
  return { xp, newBadges: evaluateBadges() };
}

// ───────────────────────── Wiederholung (SRS) ─────────────────────────

/** Karte anlegen (falls noch nicht vorhanden). Gibt die Karten-ID zurück. */
export function addSrsCard(partial: NewCardInput): string {
  const id = cardId(partial.courseId, partial.itemId);
  const existing = getRecord('vocabCards', id);
  if (existing) {
    if (existing.suspended) putRecord('vocabCards', id, { ...existing, suspended: false });
    return id;
  }
  putRecord('vocabCards', id, newCard(partial));
  return id;
}

/** Karte bewerten (0 nochmal, 1 schwer, 2 gut, 3 leicht). */
export function reviewCard(id: string, grade: SrsGrade): SrsCard | null {
  const card = getRecord('vocabCards', id);
  if (!card) return null;
  const next = scheduleCard(card, grade);
  putRecord('vocabCards', id, next);
  if ((next.reps + next.lapses) % 10 === 0) evaluateBadges();
  return next;
}

export function setCardSuspended(id: string, suspended: boolean) {
  const card = getRecord('vocabCards', id);
  if (card) putRecord('vocabCards', id, { ...card, suspended });
}

export function removeSrsCard(id: string) {
  removeRecord('vocabCards', id);
}

export function updateCardNote(id: string, note: string) {
  const card = getRecord('vocabCards', id);
  if (!card) return;
  const next: SrsCard = { ...card };
  if (note.trim()) next.note = note.trim().slice(0, 500); else delete next.note;
  putRecord('vocabCards', id, next);
}

/** Wiederholungssitzung abschließen: 20 XP + 10 Bonus ab 90 % (mind. 5 Aufgaben), je Sitzung einmal. */
export function completeReviewSession(input: { courseId: CourseId; sessionId: string; correct: number; total: number }): { xp: number; bonus: number; levelUp: number | null; newBadges: string[] } {
  const { base, bonus } = reviewSessionXp(input.correct, input.total);
  const { result, levelUp } = trackLevel(() => {
    const b = awardXp(base, 'review', { courseId: input.courseId, id: XP_IDS.review(input.sessionId) });
    const bb = b ? awardXp(bonus, 'review-bonus', { courseId: input.courseId, id: XP_IDS.reviewBonus(input.sessionId) }) : 0;
    return { b, bb };
  });
  updateCourseState(input.courseId, { lastActivityAt: nowIso() });
  return { xp: result.b + result.bb, bonus: result.bb, levelUp, newBadges: evaluateBadges() };
}

// ───────────────────────── Aussprache ─────────────────────────

export type PronAttemptInput = Omit<PronAttempt, 'at'> & { at?: string };

function storePronAttempt(attempt: PronAttemptInput): number {
  const at = attempt.at ?? nowIso();
  const ev: PronAttempt = { ...attempt, at, scorePct: Math.round(Math.max(0, Math.min(100, attempt.scorePct))), issues: attempt.issues ?? [] };
  if (!ev.transcript) delete ev.transcript;
  appendEvent('pronAttempts', ev);
  const day = todayKey();
  for (let n = 1; n <= XP.pronAttemptsPerItemPerDay; n++) {
    const id = XP_IDS.pron(attempt.courseId, attempt.itemId, day, n);
    if (getRecord('xpEvents', id)) continue;
    return awardXp(XP.pronAttempt, 'pronunciation', { courseId: attempt.courseId, ref: attempt.itemId, id });
  }
  return 0;
}

/** Ausspracheversuch speichern; 5 XP (höchstens 3× je Element und Tag). */
export function recordPronAttempt(attempt: PronAttemptInput): { xp: number; levelUp: number | null; newBadges: string[] } {
  const { result: xp, levelUp } = trackLevel(() => storePronAttempt(attempt));
  return { xp, levelUp, newBadges: evaluateBadges() };
}

// ───────────────────────── Missionen ─────────────────────────

export function missionSource(): MissionSource {
  return {
    xpEvents: rows('xpEvents'),
    answers: rows('answers'),
    pronAttempts: rows('pronAttempts'),
    partnerSessions: rows('partnerSessions'),
    songExerciseResults: rows('songExerciseResults'),
    examResults: rows('examResults'),
    vocabCards: rows('vocabCards'),
    dailyGoalXp: getSettings().dailyGoalXp,
  };
}

export type ClaimResult = { ok: true; xp: number; levelUp: number | null; newBadges: string[] } | { ok: false; reason: string };

/** Missionsbelohnung abholen (idempotent über `mission:<periode>:<id>`). */
export function claimMission(missionId: string, periodKey: string): ClaimResult {
  const claimed = new Set(listRecords('xpEvents').map((r) => r.id));
  const check = checkClaim(missionSource(), missionId, periodKey, todayKey(), claimed);
  if (!check.ok) return check;
  const { result: xp, levelUp } = trackLevel(() => awardXp(check.xp, 'mission', { ref: missionId, id: check.rewardId }));
  if (!xp) return { ok: false, reason: 'Belohnung bereits abgeholt.' };
  return { ok: true, xp, levelUp, newBadges: evaluateBadges() };
}

// ───────────────────────── KI-Partner ─────────────────────────

/** Gespräch speichern; 30 XP je Szenario und Tag, wenn mindestens 2 eigene Beiträge. */
export function recordPartnerSession(session: PartnerSession): { id: string; xp: number; levelUp: number | null; newBadges: string[] } {
  const id = uid();
  appendEvent('partnerSessions', session, id);
  const userTurns = session.turns.filter((t) => t.role === 'user' && t.text.trim()).length;
  const { result: xp, levelUp } = trackLevel(() =>
    userTurns >= 2 ? awardXp(XP.partner, 'partner', { courseId: session.courseId, ref: session.scenarioId, id: XP_IDS.partner(session.scenarioId, todayKey()) }) : 0,
  );
  updateCourseState(session.courseId, { lastActivityAt: nowIso() });
  return { id, xp, levelUp, newBadges: evaluateBadges() };
}

// ───────────────────────── Songs ─────────────────────────

/** Minimal nötige Song-Angaben (Demo-Song oder aus eigenem Text abgeleitet). */
export type SongRef = Pick<Song, 'id' | 'courseId'> & { lines: readonly { id: string }[] };

export type SongActivity =
  | { type: 'play'; mode?: string; positionMs?: number }
  | { type: 'line-learned'; lineId: string; scorePct: number }
  | { type: 'sing-line'; lineId: string; scorePct: number; target: string; method?: PronAttempt['method']; transcript?: string; issues?: string[] }
  | { type: 'exercise'; exerciseType: string; correct: number; total: number }
  | { type: 'complete' }
  | { type: 'boss'; scorePct: number; passPct?: number; durationSec?: number; perSkill?: Partial<Record<Skill, number>> }
  | { type: 'flawless' };

export interface SongActivityResult {
  xp: number;
  levelUp: number | null;
  newBadges: string[];
  /** 0–100 */
  mastery: number;
  lineLearnedNow: boolean;
  completedNow: boolean;
  bossPassed?: boolean;
}

const emptySongProgress = (song: SongRef, at: string): SongProgress => ({
  songId: song.id, courseId: song.courseId, lastPositionMs: 0, learnedLineIds: [], lineScores: {}, pronScores: {},
  playCount: 0, lastPlayedAt: at, modesUsed: [], exercisesDone: 0, exerciseAccuracy: 0,
});

/**
 * Song-Aktivität erfassen: aktualisiert songProgress, vergibt XP (idempotent) und pflegt die Song-Serie.
 * - play: 2 XP 1× pro Song/Tag · line-learned (ab 80 %): 5 XP je Zeile einmalig · alle Zeilen → 60 XP
 * - sing-line: Aussprache je Zeile (zählt als Ausspracheversuch, 5 XP gedeckelt)
 * - exercise: 15 XP je Übungstyp/Song/Tag · boss: 120 XP beim ersten Bestehen · flawless: +40 XP einmalig
 */
export function recordSongActivity(song: SongRef, activity: SongActivity): SongActivityResult {
  const at = nowIso();
  const day = todayKey();
  const prev = getRecord('songProgress', song.id);
  const p: SongProgress = prev ? { ...prev, learnedLineIds: [...prev.learnedLineIds], lineScores: { ...prev.lineScores }, pronScores: { ...prev.pronScores }, modesUsed: [...prev.modesUsed] } : emptySongProgress(song, at);
  const cid = song.courseId;
  const lineIds = new Set(song.lines.map((l) => l.id));
  let lineLearnedNow = false;
  let completedNow = false;
  let bossPassed: boolean | undefined;
  const awards: (() => number)[] = [];

  switch (activity.type) {
    case 'play': {
      p.playCount += 1;
      p.lastPlayedAt = at;
      if (activity.mode && !p.modesUsed.includes(activity.mode)) p.modesUsed.push(activity.mode);
      if (typeof activity.positionMs === 'number') p.lastPositionMs = Math.max(0, Math.round(activity.positionMs));
      awards.push(() => awardXp(XP.songPlay, 'song-play', { courseId: cid, ref: song.id, id: XP_IDS.songPlay(song.id, day) }));
      break;
    }
    case 'line-learned': {
      if (!lineIds.has(activity.lineId)) break;
      const score = Math.round(Math.max(0, Math.min(100, activity.scorePct)));
      p.lineScores[activity.lineId] = Math.max(p.lineScores[activity.lineId] ?? 0, score);
      if (score >= SONG_LINE_LEARNED_PCT && !p.learnedLineIds.includes(activity.lineId)) {
        p.learnedLineIds.push(activity.lineId);
        lineLearnedNow = true;
      }
      if (score >= SONG_LINE_LEARNED_PCT) {
        awards.push(() => awardXp(XP.songLine, 'song-line', { courseId: cid, ref: song.id, id: XP_IDS.songLine(song.id, activity.lineId) }));
      }
      break;
    }
    case 'sing-line': {
      if (!lineIds.has(activity.lineId)) break;
      const score = Math.round(Math.max(0, Math.min(100, activity.scorePct)));
      p.pronScores[activity.lineId] = Math.max(p.pronScores[activity.lineId] ?? 0, score);
      awards.push(() => storePronAttempt({
        courseId: cid, itemId: `${song.id}:${activity.lineId}`, context: 'song', target: activity.target,
        method: activity.method ?? 'speech-recognition', transcript: activity.transcript, scorePct: score, issues: activity.issues ?? [],
      }));
      break;
    }
    case 'exercise': {
      const total = Math.max(0, Math.round(activity.total));
      const correct = Math.max(0, Math.min(total, Math.round(activity.correct)));
      if (!total) break;
      const acc = (correct / total) * 100;
      p.exerciseAccuracy = Math.round(p.exercisesDone > 0 ? p.exerciseAccuracy * 0.7 + acc * 0.3 : acc);
      p.exercisesDone += 1;
      appendEvent('songExerciseResults', { at, songId: song.id, exerciseType: activity.exerciseType, correct, total });
      awards.push(() => awardXp(XP.songExercise, 'song-exercise', { courseId: cid, ref: song.id, id: XP_IDS.songExercise(song.id, activity.exerciseType, day) }));
      break;
    }
    case 'boss': {
      const score = Math.round(Math.max(0, Math.min(100, activity.scorePct)));
      bossPassed = score >= (activity.passPct ?? SONG_BOSS_PASS_PCT);
      appendEvent('examResults', {
        at, courseId: cid, examId: `${song.id}.boss`, kind: 'song-boss', scorePct: score, passed: bossPassed,
        perSkill: activity.perSkill ?? {}, durationSec: Math.max(0, Math.round(activity.durationSec ?? 0)),
      }, `exam:${song.id}.boss:${uid()}`);
      if (bossPassed) {
        if (!p.bossPassedAt) p.bossPassedAt = at;
        awards.push(() => awardXp(XP.songBoss, 'song-boss', { courseId: cid, ref: song.id, id: XP_IDS.songBoss(song.id) }));
      }
      break;
    }
    case 'flawless': {
      if (!p.flawlessSingAt) p.flawlessSingAt = at;
      awards.push(() => awardXp(XP.songFlawless, 'song-perfect-sing', { courseId: cid, ref: song.id, id: XP_IDS.songFlawless(song.id) }));
      break;
    }
    case 'complete':
      break;
  }

  // Vollständig gelernt: alle Zeilen gelernt (oder ausdrücklich abgeschlossen)
  const allLearned = lineIds.size > 0 && [...lineIds].every((id) => p.learnedLineIds.includes(id));
  if (!p.completedAt && (allLearned || activity.type === 'complete')) {
    p.completedAt = at;
    completedNow = true;
  }
  if (p.completedAt) {
    awards.push(() => awardXp(XP.songComplete, 'song-complete', { courseId: cid, ref: song.id, id: XP_IDS.songComplete(song.id) }));
  }

  putRecord('songProgress', song.id, p);
  const { result: xp, levelUp } = trackLevel(() => awards.reduce((n, f) => n + f(), 0));
  updateCourseState(cid, { lastActivityAt: at });
  return { xp, levelUp, newBadges: evaluateBadges(), mastery: songMastery(p, song).total, lineLearnedNow, completedNow, bossPassed };
}

/** Wiedergabeposition merken (ohne XP), z. B. beim Verlassen des Players. */
export function saveSongPosition(song: SongRef, positionMs: number) {
  const prev = getRecord('songProgress', song.id);
  const p = prev ?? emptySongProgress(song, nowIso());
  putRecord('songProgress', song.id, { ...p, lastPositionMs: Math.max(0, Math.round(positionMs)) });
}
