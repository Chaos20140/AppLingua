import { describe, expect, it } from 'vitest';
import { LEVEL_TITLES, MAX_LEVEL, levelForXp, levelInfo, titleForLevel, totalXpForLevel } from './levels';
import { XP, XP_IDS, XP_REASON_LABELS, answerXp, comboBonus, examXp, lessonXp, reviewSessionXp, totalXp, xpByDay } from './xp';

describe('Level-Kurve', () => {
  it('folgt 25·(L−1)² + 75·(L−1)', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(100);
    expect(totalXpForLevel(3)).toBe(250);
    expect(totalXpForLevel(10)).toBe(2700);
    expect(totalXpForLevel(120)).toBe(25 * 119 * 119 + 75 * 119);
  });
  it('hat mindestens 120 Level und ist streng monoton', () => {
    expect(MAX_LEVEL).toBeGreaterThanOrEqual(120);
    for (let l = 1; l < MAX_LEVEL; l++) expect(totalXpForLevel(l + 1)).toBeGreaterThan(totalXpForLevel(l));
  });
  it('levelForXp ist die exakte Umkehrung an den Grenzen', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      expect(levelForXp(totalXpForLevel(l))).toBe(l);
      if (l > 1) expect(levelForXp(totalXpForLevel(l) - 1)).toBe(l - 1);
    }
    expect(levelForXp(-50)).toBe(1);
    expect(levelForXp(10 ** 9)).toBe(MAX_LEVEL);
  });
  it('Titel wechseln alle 10 Level', () => {
    expect(titleForLevel(1)).toBe('Neuling');
    expect(titleForLevel(10)).toBe('Neuling');
    expect(titleForLevel(11)).toBe('Entdecker');
    expect(titleForLevel(100)).toBe('Meister');
    expect(titleForLevel(101)).toBe('Legende');
    expect(titleForLevel(120)).toBe(LEVEL_TITLES[11]);
  });
  it('levelInfo liefert Fortschritt innerhalb des Levels', () => {
    const i = levelInfo(175);
    expect(i).toMatchObject({ level: 2, title: 'Neuling', xpIntoLevel: 75, xpForLevel: 150, xpToNext: 75, maxed: false });
    expect(i.progress).toBeCloseTo(0.5);
    expect(levelInfo(9).nextTitle).toBe('Entdecker');
    const max = levelInfo(10 ** 9);
    expect(max.maxed).toBe(true);
    expect(max.progress).toBe(1);
    expect(max.nextTitle).toBeNull();
  });
});

describe('XP-Tabelle', () => {
  it('Kombo-Bonus ab 3 in Folge, +2 je Stufe, max. +10', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 20].map(comboBonus)).toEqual([0, 0, 0, 2, 4, 6, 8, 10, 10, 10]);
    expect(answerXp(0)).toBe(10);
    expect(answerXp(3)).toBe(12);
    expect(answerXp(50)).toBe(20);
  });
  it('Lektion, Wiederholung, Prüfungen', () => {
    expect(lessonXp({ firstTime: true, perfect: false })).toBe(50);
    expect(lessonXp({ firstTime: true, perfect: true })).toBe(75);
    expect(lessonXp({ firstTime: false, perfect: true })).toBe(XP.lessonRepeat);
    expect(reviewSessionXp(9, 10)).toEqual({ base: 20, bonus: 10 });
    expect(reviewSessionXp(8, 10)).toEqual({ base: 20, bonus: 0 });
    expect(reviewSessionXp(3, 3)).toEqual({ base: 20, bonus: 0 }); // zu wenige Aufgaben für den Bonus
    expect(reviewSessionXp(0, 0)).toEqual({ base: 0, bonus: 0 });
    expect([examXp('midterm'), examXp('final'), examXp('boss'), examXp('song-boss')]).toEqual([80, 150, 250, 120]);
  });
  it('Song- und Missionswerte laut Vorgabe', () => {
    expect([XP.songLine, XP.songComplete, XP.songFlawless, XP.songExercise, XP.songBoss, XP.songPlay]).toEqual([5, 60, 40, 15, 120, 2]);
    expect([XP.missionDaily, XP.missionDailyHard, XP.missionWeekly]).toEqual([30, 50, 150]);
    expect(XP.pronAttempt).toBe(5);
  });
  it('deterministische IDs', () => {
    expect(XP_IDS.lessonFirst('es.s0.l01')).toBe('lesson:es.s0.l01:first');
    expect(XP_IDS.mission('2026-09-21', 'd.lesson')).toBe('mission:2026-09-21:d.lesson');
    expect(XP_IDS.songPlay('song.es.x', '2026-09-21')).toBe(XP_IDS.songPlay('song.es.x', '2026-09-21'));
    expect(Object.keys(XP_REASON_LABELS)).toContain('song-play');
  });
  it('Summen und Tageswerte', () => {
    const evs = [
      { at: '2026-09-21T10:00:00Z', amount: 10, reason: 'exercise' as const },
      { at: '2026-09-21T11:00:00Z', amount: 50, reason: 'lesson' as const },
      { at: '2026-09-22T10:00:00Z', amount: 5, reason: 'pronunciation' as const },
    ];
    expect(totalXp(evs)).toBe(65);
    expect(totalXp(evs.map((data) => ({ data })))).toBe(65);
    const m = xpByDay(evs, 'UTC');
    expect(m.get('2026-09-21')).toBe(60);
    expect(m.get('2026-09-22')).toBe(5);
  });
});
