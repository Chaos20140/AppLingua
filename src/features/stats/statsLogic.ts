/** Reine Hilfslogik für Statistik & Diagramme. */
import type { CourseId, PronAttempt } from '../../core/types';
import { weekdayIndex, type DayKey } from '../../engine/dates';

/** Runde eine Skalen-Obergrenze auf einen „schönen“ Wert (≥ min). */
export function niceMax(value: number, min = 10): number {
  const v = Math.max(min, value);
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (m * pow >= v) return m * pow;
  }
  return 10 * pow;
}

export interface IssueSummary {
  code: string;
  count: number;
  /** Ø Verständlichkeit der Versuche mit diesem Problem */
  avgScore: number;
  lastAt: string;
}

/**
 * Aussprache-Baustellen: Problem-Codes aus den letzten Versuchen eines Kurses.
 * Ein Code gilt als erledigt, wenn die letzten zwei Versuche desselben Elements ≥ 85 % hatten.
 */
export function pronIssueSummary(attempts: readonly PronAttempt[], courseId: CourseId, opts: { recent?: number } = {}): IssueSummary[] {
  const recent = attempts
    .filter((a) => a.courseId === courseId)
    .slice()
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, opts.recent ?? 60);

  // Elemente, die zuletzt zweimal gut klangen, gelten als gelöst
  const byItem = new Map<string, PronAttempt[]>();
  for (const a of recent) byItem.set(a.itemId, [...(byItem.get(a.itemId) ?? []), a]);
  const solved = new Set<string>();
  for (const [item, list] of byItem) if (list.length >= 2 && list[0].scorePct >= 85 && list[1].scorePct >= 85) solved.add(item);

  const acc = new Map<string, { count: number; sum: number; lastAt: string }>();
  for (const a of recent) {
    if (solved.has(a.itemId)) continue;
    for (const code of new Set(a.issues ?? [])) {
      const cur = acc.get(code) ?? { count: 0, sum: 0, lastAt: a.at };
      cur.count += 1;
      cur.sum += a.scorePct;
      if (a.at > cur.lastAt) cur.lastAt = a.at;
      acc.set(code, cur);
    }
  }
  return [...acc.entries()]
    .map(([code, v]) => ({ code, count: v.count, avgScore: Math.round(v.sum / v.count), lastAt: v.lastAt }))
    .sort((a, b) => b.count - a.count || a.avgScore - b.avgScore || a.code.localeCompare(b.code));
}

/** Intensitätsstufe 0–4 für den Aktivitätskalender (relativ zum Tagesziel). */
export function activityLevel(xp: number, goal: number): 0 | 1 | 2 | 3 | 4 {
  if (xp <= 0) return 0;
  const g = Math.max(1, goal);
  if (xp < g * 0.5) return 1;
  if (xp < g) return 2;
  if (xp < g * 2) return 3;
  return 4;
}

/** Tage in Wochenspalten (Mo–So); Lücken am Anfang/Ende als null. */
export function toWeekColumns<T extends { day: DayKey }>(days: readonly T[]): (T | null)[][] {
  if (!days.length) return [];
  const lead = weekdayIndex(days[0].day);
  const cells: (T | null)[] = [...Array<null>(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  const cols: (T | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  return cols;
}

/** ISO-Zeitpunkt → „21.09.2026“ */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** DayKey → „Mo, 21.09.“ */
export function formatDayKey(day: DayKey): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
}
