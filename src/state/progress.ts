/**
 * Abgeleitete Fortschrittswerte als Hooks – immer aus Ereignissen berechnet
 * und über die stabilen useList-Referenzen memoisiert.
 */
import { useMemo } from 'react';
import type { CourseId, Skill } from '../core/types';
import type { CourseContent, Lesson } from '../content/types';
import { useList } from '../data/store';
import {
  computeCompetences, computeTopicMastery, strengthsAndWeaknesses,
  type Competences, type StrengthsWeaknesses, type TopicMastery,
} from '../engine/competence';
import { dayKey, lastNDays, weekdayShort, type DayKey } from '../engine/dates';
import { levelInfo, type LevelInfo } from '../engine/levels';
import { computePersonalRecords, type PersonalRecords } from '../engine/records';
import { computeStreak, songActiveDays, streakFromXp } from '../engine/streak';
import { computeLanguageLevel, computeUnlocks, type LanguageLevelInfo, type LessonState, type NextStep, type StageStatus, type UnlockResult } from '../engine/unlock';
import { totalXp, xpByDay } from '../engine/xp';
import { useCourseState, useSettings } from './settings';
import { useToday } from './today';

const useData = <T,>(list: { data: T }[]): T[] => useMemo(() => list.map((r) => r.data), [list]);

export function useXpEvents() {
  return useData(useList('xpEvents'));
}

export function useLevelInfo(): LevelInfo {
  const list = useList('xpEvents');
  return useMemo(() => levelInfo(totalXp(list)), [list]);
}

export function useTotalXp(): number {
  const list = useList('xpEvents');
  return useMemo(() => totalXp(list), [list]);
}

function useXpByDay() {
  const events = useXpEvents();
  return useMemo(() => xpByDay(events), [events]);
}

export function useTodayXp(): number {
  const byDay = useXpByDay();
  const today = useToday();
  return byDay.get(today) ?? 0;
}

/** Tagesziel-Fortschritt für heute. */
export function useDailyGoal(): { goal: number; xp: number; ratio: number; reached: boolean } {
  const xp = useTodayXp();
  const { dailyGoalXp } = useSettings();
  return { goal: dailyGoalXp, xp, ratio: Math.min(1, xp / Math.max(1, dailyGoalXp)), reached: xp >= dailyGoalXp };
}

/** XP der letzten 7 Tage (älteste zuerst), inkl. Wochentagskürzel. */
export function useWeekXp(): { day: DayKey; xp: number; label: string; isToday: boolean }[] {
  const byDay = useXpByDay();
  const today = useToday();
  return useMemo(
    () => lastNDays(7, today).map((day) => ({ day, xp: byDay.get(day) ?? 0, label: weekdayShort(day), isToday: day === today })),
    [byDay, today],
  );
}

export interface StreakView {
  current: number;
  longest: number;
  todayDone: boolean;
  /** aktuelle Song-Serie (Tage mit Song-Aktivität) */
  songStreak: number;
  songLongest: number;
  songTodayDone: boolean;
}

export function useStreak(): StreakView {
  const events = useXpEvents();
  const pron = useData(useList('pronAttempts'));
  const today = useToday();
  return useMemo(() => {
    const s = streakFromXp(events, today);
    const song = computeStreak(songActiveDays(events, pron), today);
    return {
      current: s.current, longest: s.longest, todayDone: s.todayDone,
      songStreak: song.current, songLongest: song.longest, songTodayDone: song.todayDone,
    };
  }, [events, pron, today]);
}

export function useCompetences(courseId: CourseId): Competences {
  const answers = useData(useList('answers'));
  const pronAttempts = useData(useList('pronAttempts'));
  const examResults = useData(useList('examResults'));
  return useMemo(() => computeCompetences({ answers, pronAttempts, examResults }, courseId), [answers, pronAttempts, examResults, courseId]);
}

export function useTopicMastery(courseId: CourseId): Record<string, TopicMastery> {
  const answers = useData(useList('answers'));
  return useMemo(() => computeTopicMastery(answers, courseId), [answers, courseId]);
}

export function useStrengthsWeaknesses(courseId: CourseId): StrengthsWeaknesses {
  const comp = useCompetences(courseId);
  const topics = useTopicMastery(courseId);
  return useMemo(() => strengthsAndWeaknesses(comp, topics), [comp, topics]);
}

export function useLanguageLevel(courseId: CourseId): LanguageLevelInfo {
  const examResults = useData(useList('examResults'));
  const courseState = useCourseState(courseId);
  return useMemo(() => computeLanguageLevel(examResults, courseState, courseId), [examResults, courseState, courseId]);
}

/** Vollständiges Freischaltungs-Ergebnis (null, solange der Inhalt lädt). */
export function useUnlocks(courseId: CourseId, content: CourseContent | null | undefined): UnlockResult | null {
  const lessonProgress = useData(useList('lessonProgress'));
  const examResults = useData(useList('examResults'));
  const courseState = useCourseState(courseId);
  const competences = useCompetences(courseId);
  return useMemo(
    () => (content && content.meta.id === courseId ? computeUnlocks(content, { courseState, lessonProgress, examResults, competences }) : null),
    [content, courseId, courseState, lessonProgress, examResults, competences],
  );
}

export function useStageStatus(courseId: CourseId, content: CourseContent | null | undefined): StageStatus[] {
  const u = useUnlocks(courseId, content);
  return u?.stages ?? EMPTY_STAGES;
}

export function useLessonStatus(courseId: CourseId, content: CourseContent | null | undefined): Record<string, LessonState> {
  const u = useUnlocks(courseId, content);
  return u?.lessons ?? EMPTY_LESSONS;
}

export function useNextLesson(courseId: CourseId, content: CourseContent | null | undefined): Lesson | null {
  return useUnlocks(courseId, content)?.nextLesson ?? null;
}

/** Nächster sinnvoller Schritt im Lernpfad (Lektion, Prüfung oder „alles erledigt“). */
export function useNextStep(courseId: CourseId, content: CourseContent | null | undefined): NextStep | null {
  return useUnlocks(courseId, content)?.nextStep ?? null;
}

export function usePersonalRecords(): PersonalRecords {
  const events = useXpEvents();
  const lessonProgress = useData(useList('lessonProgress'));
  const today = useToday();
  return useMemo(() => computePersonalRecords(events, lessonProgress, today), [events, lessonProgress, today]);
}

/** Lektionsfortschritt eines Kurses (id = lessonId). */
export function useLessonProgress(courseId: CourseId) {
  const list = useList('lessonProgress');
  return useMemo(() => {
    const out: Record<string, (typeof list)[number]['data']> = {};
    for (const r of list) if (r.data.courseId === courseId) out[r.data.lessonId] = r.data;
    return out;
  }, [list, courseId]);
}

/** Aktivitätsübersicht für Kalender/Heatmap: XP je Tag der letzten n Tage. */
export function useActivityDays(days = 84): { day: DayKey; xp: number }[] {
  const byDay = useXpByDay();
  const today = useToday();
  return useMemo(() => lastNDays(days, today).map((day) => ({ day, xp: byDay.get(day) ?? 0 })), [byDay, today, days]);
}

/** Letzter Lerntag (oder null). */
export function useLastActiveDay(): DayKey | null {
  const events = useXpEvents();
  return useMemo(() => {
    let best: string | null = null;
    for (const e of events) if (!best || e.at > best) best = e.at;
    return best ? dayKey(best) : null;
  }, [events]);
}

export type { Competences, TopicMastery, StrengthsWeaknesses, LanguageLevelInfo, StageStatus, LessonState, NextStep, UnlockResult, LevelInfo, PersonalRecords, Skill };

const EMPTY_STAGES: StageStatus[] = [];
const EMPTY_LESSONS: Record<string, LessonState> = {};
