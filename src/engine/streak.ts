/**
 * Serien (Streaks): Tage in lokaler Zeitzone mit mindestens 10 XP.
 * Keine Bestrafung – eine unterbrochene Serie beginnt einfach neu, XP gehen nie verloren.
 */
import type { PronAttempt, XpEvent } from '../core/types';
import { addDays, dayKey, diffDays, type DayKey } from './dates';
import { STREAK_MIN_XP, isSongReason, xpByDay } from './xp';

export interface StreakInfo {
  /** aktuelle Serie in Tagen (läuft weiter, wenn gestern aktiv war und heute noch nicht) */
  current: number;
  longest: number;
  /** heute schon ≥ 10 XP */
  todayDone: boolean;
  /** letzter aktiver Tag (oder null) */
  lastActiveDay: DayKey | null;
  /** Anzahl aller aktiven Tage */
  activeDays: number;
}

/** Aus einer Menge aktiver Tage die aktuelle und längste Serie berechnen. */
export function computeStreak(days: Iterable<DayKey>, today: DayKey): StreakInfo {
  const set = new Set<DayKey>();
  for (const d of days) if (d && d <= today) set.add(d);
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: DayKey | null = null;
  for (const d of sorted) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  const todayDone = set.has(today);
  let current = 0;
  let cursor: DayKey | null = todayDone ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  while (cursor && set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest, todayDone, lastActiveDay: sorted.length ? sorted[sorted.length - 1] : null, activeDays: set.size };
}

/** Aktive Lerntage (≥ minXp XP am lokalen Kalendertag). */
export function activeDays(events: readonly XpEvent[], tz?: string, minXp = STREAK_MIN_XP): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const [day, xp] of xpByDay(events, tz)) if (xp >= minXp) out.add(day);
  return out;
}

export function streakFromXp(events: readonly XpEvent[], today: DayKey, tz?: string, minXp = STREAK_MIN_XP): StreakInfo {
  return computeStreak(activeDays(events, tz, minXp), today);
}

/** Tage mit Song-Aktivität (Hören, Zeilen, Übungen, Mitsingen/Aussprache im Song). */
export function songActiveDays(xpEvents: readonly XpEvent[], pronAttempts: readonly PronAttempt[], tz?: string): Set<DayKey> {
  const out = new Set<DayKey>();
  for (const e of xpEvents) if (isSongReason(e.reason)) out.add(dayKey(e.at, tz));
  for (const p of pronAttempts) if (p.context === 'song') out.add(dayKey(p.at, tz));
  out.delete('');
  return out;
}

/** Letzter aktiver Tag VOR `today` (für den Wiedereinstieg nach einer Pause). */
export function lastActiveDayBefore(days: Iterable<DayKey>, today: DayKey): DayKey | null {
  let best: DayKey | null = null;
  for (const d of days) if (d && d < today && (!best || d > best)) best = d;
  return best;
}
