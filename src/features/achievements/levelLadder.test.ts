import { describe, expect, it } from 'vitest';
import { formatNumber, levelLadder } from './levelLadder';

describe('levelLadder', () => {
  it('deckt Level 1–120 in 12 Titelgruppen ab', () => {
    const g = levelLadder();
    expect(g).toHaveLength(12);
    expect(g[0]).toMatchObject({ title: 'Neuling', from: 1, to: 10 });
    expect(g[11]).toMatchObject({ title: 'Ikone', from: 111, to: 120 });
    const steps = g.flatMap((x) => x.steps);
    expect(steps).toHaveLength(120);
    expect(steps[0].xp).toBe(0);
    expect(steps[1].xp).toBe(100);
    expect(steps[119].xp).toBe(362950);
  });
  it('formatiert deutsch', () => {
    expect(formatNumber(362950)).toBe('362.950');
  });
});
