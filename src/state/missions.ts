/**
 * Missionen als Hook. Fortschritt stammt aus den Ereignissen der Periode, eingelöst wird
 * über `claimMission` (idempotent, siehe actions.ts).
 */
import { useMemo } from 'react';
import { useList } from '../data/store';
import { weekKey } from '../engine/dates';
import { missionStatuses, type MissionStatus } from '../engine/missions';
import { claimMission } from './actions';
import { useSettings } from './settings';
import { useToday } from './today';

export { claimMission };
export type { MissionStatus };

export interface MissionsView {
  daily: MissionStatus[];
  weekly: MissionStatus[];
  dailyKey: string;
  weeklyKey: string;
  /** abholbereite Belohnungen */
  claimable: number;
}

export function useMissions(): MissionsView {
  const xpEvents = useList('xpEvents');
  const answers = useList('answers');
  const pronAttempts = useList('pronAttempts');
  const partnerSessions = useList('partnerSessions');
  const songExerciseResults = useList('songExerciseResults');
  const examResults = useList('examResults');
  const vocabCards = useList('vocabCards');
  const { dailyGoalXp } = useSettings();
  const today = useToday();

  return useMemo(() => {
    const src = {
      xpEvents: xpEvents.map((r) => r.data),
      answers: answers.map((r) => r.data),
      pronAttempts: pronAttempts.map((r) => r.data),
      partnerSessions: partnerSessions.map((r) => r.data),
      songExerciseResults: songExerciseResults.map((r) => r.data),
      examResults: examResults.map((r) => r.data),
      vocabCards: vocabCards.map((r) => r.data),
      dailyGoalXp,
    };
    const claimed = new Set(xpEvents.map((r) => r.id));
    const dailyKey = today;
    const weeklyKey = weekKey(today);
    const daily = missionStatuses(src, dailyKey, claimed);
    const weekly = missionStatuses(src, weeklyKey, claimed);
    const claimable = [...daily, ...weekly].filter((m) => m.completed && !m.claimed).length;
    return { daily, weekly, dailyKey, weeklyKey, claimable };
  }, [xpEvents, answers, pronAttempts, partnerSessions, songExerciseResults, examResults, vocabCards, dailyGoalXp, today]);
}
