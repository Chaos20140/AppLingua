import { describe, expect, it } from 'vitest';
import { dashboardSubline, greeting, salutationFor } from './greeting';

describe('greeting', () => {
  it('wählt die Tageszeit', () => {
    expect(salutationFor(7)).toBe('Guten Morgen');
    expect(salutationFor(13)).toBe('Hallo');
    expect(salutationFor(19)).toBe('Guten Abend');
    expect(salutationFor(2)).toBe('Hallo, Nachteule');
  });
  it('setzt den Namen ein', () => {
    expect(greeting(8, 'Ana')).toBe('Guten Morgen, Ana');
    expect(greeting(8, '  ')).toBe('Guten Morgen');
    expect(greeting(1, 'Ana')).toBe('Hallo Ana, noch wach?');
  });
  it('motiviert passend zum Stand', () => {
    const base = { hour: 10, totalXp: 100, goalReached: false, goalXp: 50, todayXp: 0, streak: 0, todayDone: false };
    expect(dashboardSubline({ ...base, totalXp: 0 })).toMatch(/erste Lektion/);
    expect(dashboardSubline({ ...base, goalReached: true })).toMatch(/Bonus/);
    expect(dashboardSubline({ ...base, streak: 4 })).toMatch(/4 Tage/);
    expect(dashboardSubline({ ...base, todayXp: 20 })).toMatch(/Noch 30 XP/);
  });
});
