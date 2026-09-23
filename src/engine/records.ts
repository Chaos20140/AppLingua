/**
 * Persönliche Rekorde – aus gespeicherten Ereignissen und Lektionsfortschritt abgeleitet.
 */
import type { LessonProgress, XpEvent } from '../core/types';
import type { DayKey } from './dates';
import { streakFromXp } from './streak';
import { xpByDay } from './xp';

export interface PersonalRecords {
  bestCombo: number;
  /** meiste XP an einem Tag (ohne Missionsbelohnungen) */
  mostXpDay: { day: DayKey; xp: number } | null;
  longestStreak: number;
  /** schnellste abgeschlossene Lektion */
  fastestLesson: { lessonId: string; seconds: number } | null;
  perfectLessons: number;
  lessonsCompleted: number;
}

export function computePersonalRecords(xpEvents: readonly XpEvent[], lessonProgress: readonly LessonProgress[], today: DayKey, tz?: string): PersonalRecords {
  let mostXpDay: PersonalRecords['mostXpDay'] = null;
  for (const [day, xp] of xpByDay(xpEvents, tz, (e) => e.reason !== 'mission')) {
    if (!mostXpDay || xp > mostXpDay.xp || (xp === mostXpDay.xp && day < mostXpDay.day)) mostXpDay = { day, xp };
  }
  let fastestLesson: PersonalRecords['fastestLesson'] = null;
  let bestCombo = 0;
  let perfect = 0;
  let completed = 0;
  for (const p of lessonProgress) {
    if (p.attempts <= 0) continue;
    completed++;
    if (p.bestScorePct >= 100) perfect++;
    bestCombo = Math.max(bestCombo, p.bestCombo || 0);
    if (typeof p.bestDurationSec === 'number' && p.bestDurationSec > 0 &&
      (!fastestLesson || p.bestDurationSec < fastestLesson.seconds)) {
      fastestLesson = { lessonId: p.lessonId, seconds: p.bestDurationSec };
    }
  }
  return {
    bestCombo,
    mostXpDay,
    longestStreak: streakFromXp(xpEvents, today, tz).longest,
    fastestLesson,
    perfectLessons: perfect,
    lessonsCompleted: completed,
  };
}
