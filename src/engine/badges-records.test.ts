import { describe, expect, it } from 'vitest';
import type { LessonProgress, SongProgress, XpEvent } from '../core/types';
import { SONG } from './__fixtures__/course';
import { BADGE_DEFS, badgeProgress, computeBadgeStats, newlyEarnedBadges, type BadgeSource } from './badges';
import { computePersonalRecords } from './records';

const lp = (lessonId: string, p: Partial<LessonProgress> = {}): LessonProgress => ({
  courseId: 'es', lessonId, bestScorePct: 80, stars: 2, attempts: 1, firstCompletedAt: '2026-09-01T10:00:00Z', lastCompletedAt: '2026-09-01T10:00:00Z', bestCombo: 4, ...p,
});
const xp = (at: string, amount: number, reason: XpEvent['reason'] = 'exercise'): XpEvent => ({ at, amount, reason });
const src = (p: Partial<BadgeSource> = {}): BadgeSource => ({
  xpEvents: [], lessonProgress: [], examResults: [], pronAttempts: [], vocabCards: [], errorEntries: [], partnerSessions: [], songProgress: [], today: '2026-09-21', tz: 'UTC', ...p,
});
const song = (p: Partial<SongProgress> = {}): SongProgress => ({
  songId: SONG.id, courseId: 'es', lastPositionMs: 0, learnedLineIds: [], lineScores: {}, pronScores: {}, playCount: 1, lastPlayedAt: '2026-09-21T10:00:00Z', modesUsed: [], exercisesDone: 0, exerciseAccuracy: 0, ...p,
});

describe('Abzeichen', () => {
  it('rund 30 eindeutige, deutsche Abzeichen', () => {
    expect(BADGE_DEFS.length).toBeGreaterThanOrEqual(28);
    expect(new Set(BADGE_DEFS.map((b) => b.id)).size).toBe(BADGE_DEFS.length);
    for (const b of BADGE_DEFS) expect(b.title && b.description && b.icon).toBeTruthy();
  });
  it('vergibt erfüllte Abzeichen und ist idempotent', () => {
    const s = computeBadgeStats(src({
      lessonProgress: [lp('a', { bestScorePct: 100, bestCombo: 12 }), lp('b', { courseId: 'pt-BR' })],
      xpEvents: ['2026-09-19', '2026-09-20', '2026-09-21'].map((d) => xp(`${d}T10:00:00Z`, 40)),
    }));
    const fresh = newlyEarnedBadges(s, new Set());
    expect(fresh).toEqual(expect.arrayContaining(['lesson-1', 'perfect-1', 'combo-10', 'streak-3', 'both-languages']));
    expect(fresh).not.toContain('combo-25');
    expect(fresh).not.toContain('streak-7');
    expect(newlyEarnedBadges(s, new Set(fresh))).toEqual([]);
  });
  it('Level-, Prüfungs- und Etappen-Abzeichen', () => {
    const s = computeBadgeStats(src({
      xpEvents: [xp('2026-09-21T10:00:00Z', 2700)],
      examResults: [
        { at: '', courseId: 'es', examId: 'f', kind: 'final', stageId: 'stage0', scorePct: 80, passed: true, perSkill: {}, durationSec: 1 },
        { at: '', courseId: 'es', examId: 'b', kind: 'boss', stageId: 'stage0', scorePct: 80, passed: true, perSkill: {}, durationSec: 1 },
        { at: '', courseId: 'es', examId: 'p', kind: 'placement', stageId: 'a1', scorePct: 80, passed: true, perSkill: {}, durationSec: 1 },
      ],
    }));
    expect(s.level).toBe(10);
    expect(s.examsPassed).toBe(2);
    expect(s.stagesCompleted).toBe(1);
    expect(newlyEarnedBadges(s, new Set())).toEqual(expect.arrayContaining(['level-10', 'exam-1', 'boss-1', 'stage-1', 'xp-day-100']));
  });
  it('Song-Abzeichen brauchen den Katalog', () => {
    const progress = [song({
      learnedLineIds: ['l01', 'l02'], completedAt: '2026-09-21T10:00:00Z', exercisesDone: 2, exerciseAccuracy: 100,
      pronScores: { l01: 100, l02: 100 }, bossPassedAt: '2026-09-21T11:00:00Z', flawlessSingAt: '2026-09-21T11:00:00Z',
    })];
    const without = computeBadgeStats(src({ songProgress: progress }));
    expect(without).toMatchObject({ songsPlayed: 1, songGenres: 0, songsMastered: 0, flawlessSings: 1, songBosses: 1 });
    const second = { ...SONG, id: 'song.es.zwei', genre: 'Cumbia' as const };
    const withCat = computeBadgeStats(src({ songProgress: [...progress, song({ songId: second.id, completedAt: '2026-09-21T12:00:00Z' })], songs: [SONG, second] }));
    expect(withCat).toMatchObject({ songGenres: 2, songsMastered: 1, artistsCompleted: 1 });
    const ids = newlyEarnedBadges(withCat, new Set());
    expect(ids).toEqual(expect.arrayContaining(['song-first', 'song-mastery', 'song-flawless', 'song-boss', 'song-artist']));
    expect(ids).not.toContain('song-genres-3');
  });
  it('Fortschrittsanzeige', () => {
    const s = computeBadgeStats(src({ pronAttempts: Array.from({ length: 10 }, () => ({ at: '', courseId: 'es' as const, itemId: 'x', context: 'pronunciation' as const, target: 'x', method: 'self-assessment' as const, scorePct: 50, issues: [] })) }));
    const def = BADGE_DEFS.find((b) => b.id === 'pron-50')!;
    expect(badgeProgress(def, s)).toEqual({ value: 10, target: 50, ratio: 0.2 });
  });
});

describe('Persönliche Rekorde', () => {
  it('beste Kombo, meiste XP/Tag, längste Serie, schnellste Lektion, fehlerfreie Lektionen', () => {
    const r = computePersonalRecords(
      [xp('2026-09-20T10:00:00Z', 30), xp('2026-09-21T10:00:00Z', 80), xp('2026-09-21T11:00:00Z', 500, 'mission')],
      [lp('a', { bestCombo: 9, bestDurationSec: 300 }), lp('b', { bestScorePct: 100, bestDurationSec: 240 }), lp('c', { attempts: 0, bestDurationSec: 10 })],
      '2026-09-21', 'UTC',
    );
    expect(r).toEqual({
      bestCombo: 9, mostXpDay: { day: '2026-09-21', xp: 80 }, longestStreak: 2,
      fastestLesson: { lessonId: 'b', seconds: 240 }, perfectLessons: 1, lessonsCompleted: 2,
    });
  });
});
