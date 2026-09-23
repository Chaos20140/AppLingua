import { describe, expect, it } from 'vitest';
import { enqueueReward, initialRewardQueue, isFocusRoute, takeNext } from './rewardQueue';

describe('rewardQueue', () => {
  it('ignoriert XP-Ereignisse', () => {
    const s = enqueueReward(initialRewardQueue(), { type: 'xp', amount: 10, reason: 'exercise' });
    expect(s.queue).toHaveLength(0);
  });

  it('fasst Level-ups zusammen und stellt sie vor Abzeichen', () => {
    let s = initialRewardQueue();
    s = enqueueReward(s, { type: 'badges', badgeIds: ['lesson-1'] });
    s = enqueueReward(s, { type: 'level-up', level: 3, title: 'Neuling' });
    s = enqueueReward(s, { type: 'level-up', level: 4, title: 'Neuling' });
    s = enqueueReward(s, { type: 'level-up', level: 2, title: 'Neuling' });
    expect(s.queue.map((q) => q.kind)).toEqual(['level-up', 'badges']);
    expect(s.queue[0]).toMatchObject({ level: 4 });
  });

  it('entfernt doppelte und unbekannte Abzeichen und bündelt sie', () => {
    let s = initialRewardQueue();
    const known = (id: string) => id !== 'x';
    s = enqueueReward(s, { type: 'badges', badgeIds: ['a', 'a', 'x'] }, known);
    s = enqueueReward(s, { type: 'badges', badgeIds: ['a', 'b'] }, known);
    expect(s.queue).toEqual([{ kind: 'badges', badgeIds: ['a', 'b'] }]);
    const { item, state } = takeNext(s);
    expect(item).toEqual({ kind: 'badges', badgeIds: ['a', 'b'] });
    // bereits gezeigt → nicht erneut
    expect(enqueueReward(state, { type: 'badges', badgeIds: ['b'] }, known).queue).toHaveLength(0);
  });

  it('erkennt Fokus-Routen', () => {
    expect(isFocusRoute('/lektion/es.s0.l01')).toBe(true);
    expect(isFocusRoute('/pruefung/es.exam.s0.boss')).toBe(true);
    expect(isFocusRoute('/songs/song.es.x/spielen')).toBe(true);
    expect(isFocusRoute('/songs/song.es.x')).toBe(false);
    expect(isFocusRoute('/dashboard')).toBe(false);
    expect(isFocusRoute('/partner')).toBe(false);
  });
});
