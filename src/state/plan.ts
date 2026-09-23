/**
 * Tagesplan-Hook (inkl. sanftem Wiedereinstieg nach ≥ 3 Tagen Pause).
 */
import { useMemo } from 'react';
import type { CourseId } from '../core/types';
import type { CourseContent, Song } from '../content/types';
import { useList } from '../data/store';
import { buildDailyPlan, type DailyPlan, type PlanItem } from '../engine/plan';
import { lastActiveDayBefore } from '../engine/streak';
import { xpByDay } from '../engine/xp';
import { useTopicMastery, useUnlocks, useXpEvents } from './progress';
import { useDueCards } from './review';
import { useSettings } from './settings';
import { useSongCatalog } from './songCatalog';
import { useSongRecommendations } from './songs';
import { useToday } from './today';

export type { DailyPlan, PlanItem };

/**
 * Tagesplan für einen Kurs. `songs` optional (sonst der bereits geladene Katalog);
 * ohne Songs entfällt die Song-Empfehlung. Gibt null zurück, solange der Inhalt lädt.
 */
export function useDailyPlan(courseId: CourseId, content: CourseContent | null | undefined, songs?: readonly Song[] | null): DailyPlan | null {
  const unlock = useUnlocks(courseId, content);
  const due = useDueCards(courseId);
  const topicMastery = useTopicMastery(courseId);
  const pronList = useList('pronAttempts');
  const events = useXpEvents();
  const { dailyGoalXp } = useSettings();
  const today = useToday();
  const catalog = useSongCatalog();
  const recs = useSongRecommendations(songs ?? catalog, courseId);

  return useMemo(() => {
    if (!unlock || !content) return null;
    const byDay = xpByDay(events);
    const top = recs[0];
    return buildDailyPlan({
      courseId,
      content,
      unlock,
      dueCount: due.length,
      topicMastery,
      pronAttempts: pronList.map((r) => r.data),
      song: top ? { song: top.song, reason: top.reasons[0] } : null,
      lastActiveBefore: lastActiveDayBefore(byDay.keys(), today),
      today,
      dailyGoalXp,
      todayXp: byDay.get(today) ?? 0,
      hasHistory: events.length > 0,
    });
  }, [unlock, content, events, recs, courseId, due.length, topicMastery, pronList, today, dailyGoalXp]);
}
