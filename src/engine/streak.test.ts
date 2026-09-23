import { describe, expect, it } from 'vitest';
import type { XpEvent } from '../core/types';
import { addDays, dayKey, daysOfWeekKey, diffDays, lastNDays, weekKey, weekdayShort } from './dates';
import { activeDays, computeStreak, lastActiveDayBefore, songActiveDays, streakFromXp } from './streak';

const ev = (at: string, amount = 10, reason: XpEvent['reason'] = 'exercise'): XpEvent => ({ at, amount, reason });

describe('Datumslogik', () => {
  it('dayKey respektiert Zeitzonen an Tagesgrenzen', () => {
    const at = '2026-09-21T23:30:00Z';
    expect(dayKey(at, 'UTC')).toBe('2026-09-21');
    expect(dayKey(at, 'Europe/Berlin')).toBe('2026-09-22'); // 01:30 Ortszeit
    expect(dayKey(at, 'America/Los_Angeles')).toBe('2026-09-21'); // 16:30 Ortszeit
    expect(dayKey('2026-09-21T10:30:00Z', 'Pacific/Auckland')).toBe('2026-09-21');
    expect(dayKey('2026-09-21T12:30:00Z', 'Pacific/Auckland')).toBe('2026-09-22');
    expect(dayKey('kein Datum')).toBe('');
  });
  it('rechnet Tage über Monats-, Jahres- und Sommerzeitgrenzen', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-29', -1)).toBe('2026-03-28');
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2); // Zeitumstellung in Europa
    expect(lastNDays(3, '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
  it('ISO-Wochen', () => {
    expect(weekKey('2026-09-21')).toBe('2026-W39');
    expect(weekKey('2027-01-01')).toBe('2026-W53');
    expect(weekKey('2024-12-30')).toBe('2025-W01');
    expect(daysOfWeekKey('2026-W39')[0]).toBe('2026-09-21');
    expect(daysOfWeekKey('2026-W39')[6]).toBe('2026-09-27');
    expect(weekdayShort('2026-09-21')).toBe('Mo');
  });
});

describe('Serie', () => {
  it('zählt zusammenhängende Tage bis heute bzw. gestern', () => {
    const days = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'];
    expect(computeStreak(days, '2026-09-21')).toMatchObject({ current: 4, longest: 4, todayDone: true });
    // heute noch nichts gelernt → Serie läuft weiter (keine Bestrafung)
    expect(computeStreak(days.slice(0, 3), '2026-09-21')).toMatchObject({ current: 3, todayDone: false });
    // Lücke → Serie beginnt neu, längste bleibt erhalten
    expect(computeStreak(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-20'], '2026-09-22')).toMatchObject({ current: 0, longest: 3 });
    expect(computeStreak([], '2026-09-21')).toMatchObject({ current: 0, longest: 0, lastActiveDay: null });
  });
  it('braucht mindestens 10 XP am lokalen Tag', () => {
    const events = [ev('2026-09-20T10:00:00Z', 5), ev('2026-09-21T10:00:00Z', 5), ev('2026-09-21T11:00:00Z', 5)];
    expect([...activeDays(events, 'UTC')]).toEqual(['2026-09-21']);
    expect(streakFromXp(events, '2026-09-21', 'UTC').current).toBe(1);
  });
  it('wertet dieselben Ereignisse je nach Zeitzone unterschiedlich', () => {
    // 22:30 UTC an zwei Abenden: in Berlin schon der Folgetag
    const events = [ev('2026-09-20T22:30:00Z'), ev('2026-09-21T22:30:00Z')];
    expect(streakFromXp(events, '2026-09-21', 'UTC')).toMatchObject({ current: 2, todayDone: true });
    expect(streakFromXp(events, '2026-09-21', 'Europe/Berlin')).toMatchObject({ current: 1, todayDone: true });
    expect(streakFromXp(events, '2026-09-22', 'Europe/Berlin')).toMatchObject({ current: 2, todayDone: true });
  });
  it('Song-Serie aus Song-XP und Mitsingen', () => {
    const d = songActiveDays(
      [ev('2026-09-20T10:00:00Z', 2, 'song-play'), ev('2026-09-21T10:00:00Z', 10, 'exercise')],
      [{ at: '2026-09-21T12:00:00Z', courseId: 'es', itemId: 'x', context: 'song', target: 'x', method: 'self-assessment', scorePct: 80, issues: [] }],
      'UTC',
    );
    expect([...d].sort()).toEqual(['2026-09-20', '2026-09-21']);
  });
  it('letzter aktiver Tag vor heute', () => {
    expect(lastActiveDayBefore(['2026-09-01', '2026-09-15', '2026-09-21'], '2026-09-21')).toBe('2026-09-15');
    expect(lastActiveDayBefore([], '2026-09-21')).toBeNull();
  });
});
