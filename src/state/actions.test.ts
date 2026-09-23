import { beforeEach, describe, expect, it } from 'vitest';
import { getRecord, listRecords, resetStore } from '../data/store';
import { COURSE, EXERCISES, SONG } from '../engine/__fixtures__/course';
import { todayKey } from '../engine/dates';
import { gradeExercise } from '../engine/grading';
import { missionStatuses } from '../engine/missions';
import { totalXp } from '../engine/xp';
import {
  addSrsCard, awardXp, claimMission, completeLesson, completeReviewSession, missionSource, recordAnswer, recordExam,
  recordPartnerSession, recordPlacement, recordPronAttempt, recordSongActivity, reviewCard,
} from './actions';
import { evaluateBadges } from './badges';
import { onReward, type RewardEvent } from './rewards';
import { DEFAULT_SETTINGS, getCourseState, getSettings, mergeSettings, updateSettings, variantOf, ttsLangFor } from './settings';
import { setSongCatalog } from './songCatalog';

const xpSum = () => totalXp(listRecords('xpEvents').map((r) => r.data));
const lesson = (i: number) => COURSE.lessons[i];

beforeEach(async () => {
  await resetStore();
  setSongCatalog([SONG]);
});

describe('Einstellungen', () => {
  it('Standardwerte laut Vorgabe und Zusammenführung mit gespeicherten Werten', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ activeCourse: 'es', esVariant: 'es-LA', theme: 'system', dailyGoalXp: 50, ttsRate: 0.95, ttsSlowRate: 0.65, storeRecordings: false });
    expect(DEFAULT_SETTINGS.songs).toMatchObject({ explicitFilter: true, syncUserTexts: false });
    expect(DEFAULT_SETTINGS.embedConsent).toEqual({ youtube: false, spotify: false, appleMusic: false });
    expect(mergeSettings({ dailyGoalXp: 5000, songs: { explicitFilter: false } as never }).dailyGoalXp).toBe(500);
    updateSettings({ esVariant: 'es-ES', songs: { showPhonetic: false } });
    const s = getSettings();
    expect(s.esVariant).toBe('es-ES');
    expect(s.songs).toMatchObject({ showPhonetic: false, explicitFilter: true });
    expect(variantOf(s, 'pt-BR')).toBe('pt-BR');
    expect([ttsLangFor('es-ES'), ttsLangFor('es-LA'), ttsLangFor('pt-BR')]).toEqual(['es-ES', 'es-MX', 'pt-BR']);
  });
});

describe('XP & Lektionen', () => {
  it('awardXp ist mit ID idempotent', () => {
    expect(awardXp(30, 'mission', { id: 'test:1' })).toBe(30);
    expect(awardXp(30, 'mission', { id: 'test:1' })).toBe(0);
    expect(xpSum()).toBe(30);
  });
  it('completeLesson: 50 + 25 fehlerfrei, danach 15 XP einmal pro Tag; Fortschritt als Maximum', () => {
    const first = completeLesson({ courseId: 'es', lesson: lesson(0), scorePct: 100, bestCombo: 7, durationSec: 300 });
    expect(first).toMatchObject({ xp: 75, stars: 3, firstTime: true, perfect: true });
    expect(first.newBadges).toEqual(expect.arrayContaining(['lesson-1', 'perfect-1']));
    const again = completeLesson({ courseId: 'es', lesson: lesson(0), scorePct: 60, bestCombo: 2, durationSec: 200 });
    expect(again).toMatchObject({ xp: 15, stars: 1, firstTime: false });
    expect(again.newBadges).toEqual([]);
    expect(completeLesson({ courseId: 'es', lesson: lesson(0), scorePct: 100, bestCombo: 2, durationSec: 250 }).xp).toBe(0);
    expect(getRecord('lessonProgress', 'es:es.s0.l01')).toMatchObject({ bestScorePct: 100, stars: 3, attempts: 3, bestCombo: 7, bestDurationSec: 200 });
    expect(xpSum()).toBe(90);
    expect(getCourseState('es').currentLessonId).toBe('es.s0.l01');
  });
  it('übernimmt Vokabeln passend zur Variante in den Trainer', () => {
    const r = completeLesson({ courseId: 'es', lesson: lesson(0), scorePct: 80, bestCombo: 0, durationSec: 100 });
    expect(r.newCards).toBe(1); // „vosotros“ gilt nur für es-ES
    expect(getRecord('vocabCards', 'es:es.s0.l01.v.hola')).toMatchObject({ front: 'hola', kind: 'phrase' });
    updateSettings({ esVariant: 'es-ES' });
    expect(completeLesson({ courseId: 'es', lesson: lesson(0), scorePct: 80, bestCombo: 0, durationSec: 100 }).newCards).toBe(1);
  });
});

describe('Antworten & Fehlerarchiv', () => {
  it('Fehler anlegen, wiederholen und nach 2 richtigen Antworten beheben', () => {
    const ex = EXERCISES.translate;
    const wrong = gradeExercise(ex, 'Estoy estudiante');
    expect(recordAnswer({ courseId: 'es', exercise: ex, outcome: wrong, context: 'lesson' }).error).toBe('new');
    expect(recordAnswer({ courseId: 'es', exercise: ex, outcome: wrong, context: 'review' }).error).toBe('repeat');
    const entry = getRecord('errorEntries', 'es:x.translate')!;
    expect(entry).toMatchObject({ count: 2, correctSince: 0, correctAnswer: 'Soy estudiante.' });
    expect(entry.explanation.what).toContain('`Soy` statt `Estoy`');
    const right = gradeExercise(ex, 'Soy estudiante');
    expect(recordAnswer({ courseId: 'es', exercise: ex, outcome: right, context: 'review' }).error).toBe('progress');
    const resolved = recordAnswer({ courseId: 'es', exercise: ex, outcome: right, context: 'review' });
    expect(resolved.error).toBe('resolved');
    expect(resolved.newBadges).toContain('error-1');
    expect(getRecord('errorEntries', 'es:x.translate')?.resolvedAt).toBeTruthy();
    expect(listRecords('answers')).toHaveLength(4);
  });
  it('XP mit Kombo-Bonus in Lektionen, keine XP in Prüfungen, Einstufung ohne Fehlerarchiv', () => {
    const ok = gradeExercise(EXERCISES.mc, 0);
    expect(recordAnswer({ courseId: 'es', exercise: EXERCISES.mc, outcome: ok, context: 'lesson', combo: 1 }).xp).toBe(10);
    expect(recordAnswer({ courseId: 'es', exercise: EXERCISES.mc, outcome: ok, context: 'lesson', combo: 5 }).xp).toBe(16);
    expect(recordAnswer({ courseId: 'es', exercise: EXERCISES.mc, outcome: ok, context: 'exam' }).xp).toBe(0);
    recordAnswer({ courseId: 'es', exercise: EXERCISES.mc, outcome: gradeExercise(EXERCISES.mc, 1), context: 'placement' });
    expect(listRecords('errorEntries')).toHaveLength(0);
  });
});

describe('Prüfungen & Einstufung', () => {
  it('Abschlussprüfung + Boss schalten die nächste Etappe frei; XP nur beim ersten Bestehen', () => {
    for (let i = 0; i < 3; i++) completeLesson({ courseId: 'es', lesson: lesson(i), scorePct: 90, bestCombo: 3, durationSec: 200 });
    for (let i = 0; i < 20; i++) recordAnswer({ courseId: 'es', exercise: EXERCISES.cloze, outcome: gradeExercise(EXERCISES.cloze, ['soy', 'eres']), context: 'lesson' });
    const exams = new Map(COURSE.exams.map((e) => [e.id, e]));
    const fail = recordExam({ courseId: 'es', exam: exams.get('es.exam.s0.final'), scorePct: 50, durationSec: 300, content: COURSE });
    expect(fail).toMatchObject({ passed: false, xp: 15, firstPass: false });
    const final = recordExam({ courseId: 'es', exam: exams.get('es.exam.s0.final'), scorePct: 85, durationSec: 300, content: COURSE });
    expect(final).toMatchObject({ passed: true, xp: 150, firstPass: true });
    expect(final.unlockedStage).toBeUndefined();
    const boss = recordExam({ courseId: 'es', exam: exams.get('es.exam.s0.boss'), scorePct: 70, durationSec: 300, content: COURSE });
    expect(boss).toMatchObject({ passed: true, xp: 250, unlockedStage: 'a1' });
    expect(boss.newBadges).toEqual(expect.arrayContaining(['boss-1', 'stage-1']));
    expect(getCourseState('es').currentStageId).toBe('a1');
    expect(recordExam({ courseId: 'es', exam: exams.get('es.exam.s0.final'), scorePct: 95, durationSec: 300 })).toMatchObject({ passed: true, xp: 0, firstPass: false });
  });
  it('Einstufung überspringt Etappen und vergibt einmalig XP', () => {
    const r = recordPlacement('es', { takenAt: new Date().toISOString(), skipped: false, scorePct: 70, startStage: 'a1' });
    expect(r.xp).toBe(30);
    expect(getCourseState('es')).toMatchObject({ currentStageId: 'a1', skippedStages: ['stage0'] });
    expect(recordPlacement('es', { takenAt: new Date().toISOString(), skipped: false, scorePct: 90, startStage: 'a1' }).xp).toBe(0);
    recordPlacement('pt-BR', { takenAt: new Date().toISOString(), skipped: true, scorePct: 0, startStage: 'stage0' });
    expect(getCourseState('pt-BR')).toMatchObject({ currentStageId: 'stage0', skippedStages: [] });
  });
});

describe('SRS, Aussprache, Missionen, Partner', () => {
  it('Karten anlegen (idempotent) und bewerten', () => {
    const id = addSrsCard({ courseId: 'es', itemId: 'es.v.gato', kind: 'vocab', front: 'gato', back: 'Katze', source: { type: 'user' } });
    expect(addSrsCard({ courseId: 'es', itemId: 'es.v.gato', kind: 'vocab', front: 'x', back: 'y', source: { type: 'user' } })).toBe(id);
    expect(getRecord('vocabCards', id)?.front).toBe('gato');
    expect(reviewCard(id, 2)).toMatchObject({ reps: 1, intervalDays: 1 });
    expect(reviewCard('gibt-es-nicht', 2)).toBeNull();
  });
  it('Ausspracheversuche: 5 XP, höchstens 3× je Element und Tag', () => {
    const a = { courseId: 'es' as const, itemId: 'es.p.r.perro', context: 'pronunciation' as const, target: 'perro', method: 'speech-recognition' as const, scorePct: 70, issues: ['rr'] };
    expect([1, 2, 3, 4].map(() => recordPronAttempt(a).xp)).toEqual([5, 5, 5, 0]);
    expect(recordPronAttempt({ ...a, itemId: 'es.p.r.pero' }).xp).toBe(5);
    expect(listRecords('pronAttempts')).toHaveLength(5);
  });
  it('Mission einlösen genau einmal', () => {
    completeLesson({ courseId: 'es', lesson: lesson(0), scorePct: 100, bestCombo: 3, durationSec: 100 });
    for (let i = 0; i < 25; i++) recordAnswer({ courseId: 'es', exercise: EXERCISES.cloze, outcome: gradeExercise(EXERCISES.cloze, ['soy', 'eres']), context: 'lesson' });
    const day = todayKey();
    const done = missionStatuses(missionSource(), day, new Set()).find((m) => m.completed);
    expect(done).toBeDefined();
    const res = claimMission(done!.id, day);
    expect(res).toMatchObject({ ok: true, xp: done!.xp });
    expect(claimMission(done!.id, day)).toMatchObject({ ok: false });
    expect(listRecords('xpEvents').filter((r) => r.id === `mission:${day}:${done!.id}`)).toHaveLength(1);
  });
  it('KI-Gespräch: XP nur mit echter Beteiligung, einmal pro Szenario und Tag', () => {
    const s = { at: new Date().toISOString(), courseId: 'es' as const, scenarioId: 'es.sc.restaurant', mode: 'offline' as const, prefs: DEFAULT_SETTINGS.partner, turns: [{ role: 'user' as const, text: 'Hola' }, { role: 'user' as const, text: 'Un café' }] };
    const r = recordPartnerSession(s);
    expect(r.xp).toBe(30);
    expect(r.newBadges).toContain('partner-1');
    expect(recordPartnerSession(s).xp).toBe(0);
    expect(recordPartnerSession({ ...s, scenarioId: 'x', turns: [{ role: 'user', text: 'Hola' }] }).xp).toBe(0);
  });
  it('Wiederholungssitzung: 20 XP + Bonus, je Sitzung einmal', () => {
    expect(completeReviewSession({ courseId: 'es', sessionId: 's1', correct: 10, total: 10 })).toMatchObject({ xp: 30, bonus: 10 });
    expect(completeReviewSession({ courseId: 'es', sessionId: 's1', correct: 10, total: 10 }).xp).toBe(0);
    expect(completeReviewSession({ courseId: 'es', sessionId: 's2', correct: 5, total: 10 })).toMatchObject({ xp: 20, bonus: 0 });
  });
});

describe('Songs', () => {
  it('Hören 1× pro Tag, Zeilen lernen, Song vollständig, Boss und Mitsingen – alles idempotent', () => {
    expect(recordSongActivity(SONG, { type: 'play', mode: 'karaoke' }).xp).toBe(2);
    expect(recordSongActivity(SONG, { type: 'play', mode: 'lernen' }).xp).toBe(0);
    expect(getRecord('songProgress', SONG.id)).toMatchObject({ playCount: 2, modesUsed: ['karaoke', 'lernen'] });

    expect(recordSongActivity(SONG, { type: 'line-learned', lineId: 'l01', scorePct: 60 })).toMatchObject({ xp: 0, lineLearnedNow: false });
    expect(recordSongActivity(SONG, { type: 'line-learned', lineId: 'l01', scorePct: 90 })).toMatchObject({ xp: 5, lineLearnedNow: true });
    expect(recordSongActivity(SONG, { type: 'line-learned', lineId: 'l01', scorePct: 95 }).xp).toBe(0);
    const last = recordSongActivity(SONG, { type: 'line-learned', lineId: 'l02', scorePct: 85 });
    expect(last).toMatchObject({ xp: 65, completedNow: true, mastery: 40 });

    const sing = recordSongActivity(SONG, { type: 'sing-line', lineId: 'l01', scorePct: 90, target: '¡Hola, amigo!' });
    expect(sing.xp).toBe(5);
    expect(listRecords('pronAttempts')[0].data).toMatchObject({ context: 'song', itemId: `${SONG.id}:l01` });

    expect(recordSongActivity(SONG, { type: 'exercise', exerciseType: 'cloze', correct: 4, total: 5 }).xp).toBe(15);
    expect(recordSongActivity(SONG, { type: 'exercise', exerciseType: 'cloze', correct: 5, total: 5 }).xp).toBe(0);
    expect(getRecord('songProgress', SONG.id)).toMatchObject({ exercisesDone: 2, exerciseAccuracy: 86 });

    expect(recordSongActivity(SONG, { type: 'boss', scorePct: 50 })).toMatchObject({ xp: 0, bossPassed: false });
    const boss = recordSongActivity(SONG, { type: 'boss', scorePct: 80 });
    expect(boss).toMatchObject({ xp: 120, bossPassed: true });
    expect(boss.newBadges).toContain('song-boss');
    const flawless = recordSongActivity(SONG, { type: 'flawless' });
    expect(flawless.xp).toBe(40);
    expect(recordSongActivity(SONG, { type: 'flawless' }).xp).toBe(0);
    expect(recordSongActivity(SONG, { type: 'line-learned', lineId: 'unbekannt', scorePct: 100 }).xp).toBe(0);
  });
});

describe('Abzeichen & Belohnungen', () => {
  it('evaluateBadges vergibt jedes Abzeichen nur einmal und meldet Belohnungen', () => {
    const events: RewardEvent[] = [];
    const off = onReward((e) => events.push(e));
    awardXp(300, 'lesson', { id: 'big' });
    expect(events.some((e) => e.type === 'level-up' && e.level === 3)).toBe(true);
    completeLesson({ courseId: 'es', lesson: lesson(0), scorePct: 80, bestCombo: 0, durationSec: 60 });
    expect(events.some((e) => e.type === 'badges' && e.badgeIds.includes('lesson-1'))).toBe(true);
    expect(evaluateBadges()).toEqual([]);
    expect(listRecords('badges').filter((r) => r.id === 'lesson-1')).toHaveLength(1);
    off();
  });
});
