import { describe, expect, it } from 'vitest';
import type { PronAttempt } from '../../core/types';
import { activityLevel, niceMax, pronIssueSummary, toWeekColumns } from './statsLogic';

const att = (p: Partial<PronAttempt>): PronAttempt => ({
  at: '2026-09-01T10:00:00Z', courseId: 'es', itemId: 'i', context: 'pronunciation', target: 'perro',
  method: 'speech-recognition', scorePct: 50, issues: [], ...p,
});

describe('statsLogic', () => {
  it('rundet Skalen', () => {
    expect(niceMax(0)).toBe(10);
    expect(niceMax(47)).toBe(50);
    expect(niceMax(130)).toBe(150);
    expect(niceMax(1)).toBe(10);
  });

  it('fasst Aussprache-Baustellen zusammen', () => {
    const list = [
      att({ itemId: 'a', issues: ['rr'], scorePct: 40, at: '2026-09-01T10:00:00Z' }),
      att({ itemId: 'b', issues: ['rr', 'j'], scorePct: 60, at: '2026-09-02T10:00:00Z' }),
      att({ itemId: 'c', issues: ['stress'], scorePct: 50, at: '2026-09-01T09:00:00Z' }),
      att({ itemId: 'c', issues: [], scorePct: 90, at: '2026-09-03T10:00:00Z' }),
      att({ itemId: 'c', issues: [], scorePct: 95, at: '2026-09-04T10:00:00Z' }),
      att({ itemId: 'd', issues: ['rr'], courseId: 'pt-BR' }),
    ];
    const s = pronIssueSummary(list, 'es');
    expect(s.map((x) => x.code)).toEqual(['rr', 'j']);
    expect(s[0]).toMatchObject({ count: 2, avgScore: 50 });
  });

  it('stuft Aktivität ein', () => {
    expect(activityLevel(0, 50)).toBe(0);
    expect(activityLevel(10, 50)).toBe(1);
    expect(activityLevel(40, 50)).toBe(2);
    expect(activityLevel(60, 50)).toBe(3);
    expect(activityLevel(200, 50)).toBe(4);
  });

  it('bildet Wochenspalten ab Montag', () => {
    // 2026-09-23 ist ein Mittwoch
    const cols = toWeekColumns([{ day: '2026-09-23' }, { day: '2026-09-24' }]);
    expect(cols).toHaveLength(1);
    expect(cols[0][0]).toBeNull();
    expect(cols[0][2]).toEqual({ day: '2026-09-23' });
    expect(cols[0]).toHaveLength(7);
  });
});
