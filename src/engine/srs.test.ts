import { describe, expect, it } from 'vitest';
import type { SrsCard } from '../core/types';
import { SRS, dueCards, formatInterval, isDue, isMatureCard, newCard, nextInterval, previewIntervals, scheduleCard } from './srs';

// Fester Zeitpunkt mittags (lokale Zeit), damit Mitternachts-Fälligkeiten eindeutig sind
const NOON = new Date(2026, 8, 21, 12, 0, 0);
const at = (days: number, hours = 0) => new Date(NOON.getTime() + days * 86_400_000 + hours * 3_600_000);
const base = () => newCard({ courseId: 'es', itemId: 'es.v.hola', kind: 'vocab', front: 'hola', back: 'hallo', source: { type: 'lesson', ref: 'es.s0.l01' } }, NOON);

describe('SRS (SM-2-Variante)', () => {
  it('neue Karte ist sofort fällig', () => {
    const c = base();
    expect(c).toMatchObject({ ease: SRS.initialEase, intervalDays: 0, reps: 0, lapses: 0 });
    expect(isDue(c, NOON)).toBe(true);
  });
  it('„gut“ steigert das Intervall 1 → 3 → ≈ 3·Ease', () => {
    let c = scheduleCard(base(), 2, NOON);
    expect(c.intervalDays).toBe(1);
    expect(isDue(c, at(0, 6))).toBe(false);
    expect(isDue(c, at(1))).toBe(true); // ab lokaler Mitternacht fällig
    c = scheduleCard(c, 2, at(1));
    expect(c.intervalDays).toBe(3);
    c = scheduleCard(c, 2, at(4));
    expect(c.intervalDays).toBeGreaterThanOrEqual(7);
    expect(c.intervalDays).toBeLessThanOrEqual(8);
    expect(c.reps).toBe(3);
  });
  it('„leicht“ kommt deutlich seltener als „gut“ und erhöht die Ease', () => {
    const c = scheduleCard(scheduleCard(base(), 2, NOON), 2, at(1));
    expect(nextInterval(c, 3)).toBeGreaterThan(nextInterval(c, 2));
    expect(nextInterval(c, 2)).toBeGreaterThan(nextInterval(c, 1));
    expect(scheduleCard(c, 3, at(4)).ease).toBeCloseTo(c.ease + 0.15);
    expect(scheduleCard(base(), 3, NOON).intervalDays).toBe(4);
  });
  it('„nochmal“ setzt zurück, zählt einen Lapse und senkt die Ease (min. 1,3)', () => {
    let c = scheduleCard(scheduleCard(base(), 2, NOON), 2, at(1));
    c = scheduleCard(c, 0, at(4));
    expect(c).toMatchObject({ reps: 0, lapses: 1, intervalDays: 0 });
    expect(new Date(c.dueAt).getTime() - at(4).getTime()).toBe(SRS.againMinutes * 60_000);
    let low: SrsCard = c;
    for (let i = 0; i < 20; i++) low = scheduleCard(low, 0, at(5));
    expect(low.ease).toBe(SRS.minEase);
    expect(low.lapses).toBe(1); // weitere „nochmal“ ohne Zwischenerfolg sind keine neuen Lapses
  });
  it('Intervalle sind gedeckelt und deterministisch', () => {
    const c: SrsCard = { ...base(), reps: 10, intervalDays: 300, ease: 3 };
    expect(nextInterval(c, 3)).toBe(SRS.maxIntervalDays);
    expect(nextInterval(c, 2)).toBe(nextInterval({ ...c }, 2));
    expect(isMatureCard({ ...c, intervalDays: 21 })).toBe(true);
  });
  it('fällige Karten: pausierte ausgeschlossen, überfällige zuerst, Kursfilter', () => {
    const a = { ...base(), itemId: 'a', reps: 2, dueAt: at(-3).toISOString() };
    const b = { ...base(), itemId: 'b', reps: 2, dueAt: at(-1).toISOString() };
    const n = { ...base(), itemId: 'n' };
    const s = { ...base(), itemId: 's', suspended: true };
    const f = { ...base(), itemId: 'f', dueAt: at(2).toISOString() };
    const p = { ...base(), itemId: 'p', courseId: 'pt-BR' as const };
    expect(dueCards([n, b, s, f, a, p], NOON, 'es').map((c) => c.itemId)).toEqual(['a', 'b', 'n']);
  });
  it('lesbare Intervalle', () => {
    expect(formatInterval(0)).toBe('10 Min.');
    expect(formatInterval(1)).toBe('1 Tag');
    expect(formatInterval(3)).toBe('3 Tage');
    expect(formatInterval(21)).toBe('3 Wochen');
    expect(formatInterval(90)).toBe('3 Monate');
    expect(previewIntervals(base())).toEqual({ 0: '10 Min.', 1: '1 Tag', 2: '1 Tag', 3: '4 Tage' });
  });
});
