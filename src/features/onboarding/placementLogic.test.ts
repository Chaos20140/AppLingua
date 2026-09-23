import { describe, expect, it } from 'vitest';
import type { StageId } from '../../core/types';
import { evaluatePlacement, perSkillPct, shouldStopAfter, sortByStage, stageScores, type PlacementAnswer } from './placementLogic';

const ans = (level: StageId, scores: number[]): PlacementAnswer[] => scores.map((score) => ({ level, score }));

describe('stageScores', () => {
  it('berechnet Prozent je Etappe in Lernreihenfolge', () => {
    const s = stageScores([...ans('a1', [1, 0]), ...ans('stage0', [1, 1, 1, 0])]);
    expect(s.map((x) => x.stageId)).toEqual(['stage0', 'a1']);
    expect(s[0]).toMatchObject({ pct: 75, passed: true });
    expect(s[1]).toMatchObject({ pct: 50, passed: false });
  });
  it('70 % genau zählt als bestanden, Teilpunkte werden berücksichtigt', () => {
    expect(stageScores(ans('stage0', [1, 1, 1, 1, 1, 1, 1, 0, 0, 0]))[0].passed).toBe(true);
    expect(stageScores(ans('stage0', [0.5, 0.5]))[0]).toMatchObject({ pct: 50, passed: false });
  });
});

describe('evaluatePlacement', () => {
  const available: StageId[] = ['stage0', 'a1'];

  it('niemand besteht Stufe 0 → Start bei Stufe 0', () => {
    const e = evaluatePlacement(ans('stage0', [0, 1, 0]), available);
    expect(e.masteredStage).toBeNull();
    expect(e.startStage).toBe('stage0');
    expect(e.capped).toBe(false);
  });

  it('Stufe 0 beherrscht → Start bei A1', () => {
    const e = evaluatePlacement([...ans('stage0', [1, 1, 1]), ...ans('a1', [0, 0, 1])], available);
    expect(e.masteredStage).toBe('stage0');
    expect(e.recommendedStage).toBe('a1');
    expect(e.startStage).toBe('a1');
  });

  it('höhere Etappe zählt nur, wenn alle darunter bestanden sind', () => {
    const e = evaluatePlacement([...ans('stage0', [0, 0, 1]), ...ans('a1', [1, 1, 1])], available);
    expect(e.masteredStage).toBeNull();
    expect(e.startStage).toBe('stage0');
  });

  it('Empfehlung über verfügbaren Inhalten wird gedeckelt', () => {
    const e = evaluatePlacement([...ans('stage0', [1, 1]), ...ans('a1', [1, 1]), ...ans('a2', [1, 0.5])], available);
    expect(e.masteredStage).toBe('a2');
    expect(e.recommendedStage).toBe('b1');
    expect(e.startStage).toBe('a1');
    expect(e.capped).toBe(true);
  });

  it('Gesamtpunktzahl in Prozent', () => {
    expect(evaluatePlacement(ans('stage0', [1, 0, 1, 0]), available).scorePct).toBe(50);
    expect(evaluatePlacement([], available).scorePct).toBe(0);
  });
});

describe('shouldStopAfter', () => {
  const qs = [{ level: 'stage0' as StageId }, { level: 'stage0' as StageId }, { level: 'a1' as StageId }, { level: 'a1' as StageId }];
  it('läuft innerhalb einer Etappe weiter', () => {
    expect(shouldStopAfter(qs, 1, ans('stage0', [0]))).toBe(false);
  });
  it('stoppt nach einer nicht bestandenen Etappe', () => {
    expect(shouldStopAfter(qs, 2, ans('stage0', [0, 1]))).toBe(true);
  });
  it('läuft nach bestandener Etappe weiter und stoppt am Ende', () => {
    expect(shouldStopAfter(qs, 2, ans('stage0', [1, 1]))).toBe(false);
    expect(shouldStopAfter(qs, 4, [...ans('stage0', [1, 1]), ...ans('a1', [1, 1])])).toBe(true);
  });
});

describe('Hilfsfunktionen', () => {
  it('sortiert stabil nach Etappe', () => {
    const sorted = sortByStage([{ level: 'a1' as StageId, n: 1 }, { level: 'stage0' as StageId, n: 2 }, { level: 'a1' as StageId, n: 3 }]);
    expect(sorted.map((x) => x.n)).toEqual([2, 1, 3]);
  });
  it('Kompetenzwerte nach Hauptkompetenz', () => {
    expect(perSkillPct([{ skills: ['grammar'], score: 1 }, { skills: ['grammar', 'reading'], score: 0 }, { skills: ['listening'], score: 1 }]))
      .toEqual({ grammar: 50, listening: 100 });
  });
});
