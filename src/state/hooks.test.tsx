// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../data/store';
import { COURSE, EXERCISES, SONG } from '../engine/__fixtures__/course';
import { gradeExercise } from '../engine/grading';
import { awardXp, completeLesson, recordAnswer } from './actions';
import { useBadges } from './badges';
import { useMissions } from './missions';
import { useDailyPlan } from './plan';
import {
  useCompetences, useLanguageLevel, useLessonStatus, useLevelInfo, useNextLesson, usePersonalRecords,
  useStageStatus, useStreak, useStrengthsWeaknesses, useTodayXp, useTopicMastery, useWeekXp,
} from './progress';
import { useDueCards } from './review';
import { useActiveCourse, useSettings, updateSettings, useVariant, setActiveCourse, useProfile, updateProfile } from './settings';
import { setSongCatalog } from './songCatalog';
import { useSongMastery, useSongRecommendations } from './songs';

beforeEach(async () => {
  await resetStore();
  setSongCatalog([SONG]);
});

describe('Hooks (reaktiv, stabil)', () => {
  it('Level, Tages-XP, Woche und Serie reagieren auf neue XP', () => {
    const { result } = renderHook(() => ({ level: useLevelInfo(), today: useTodayXp(), week: useWeekXp(), streak: useStreak() }));
    expect(result.current.level).toMatchObject({ level: 1, totalXp: 0, title: 'Neuling' });
    expect(result.current.week).toHaveLength(7);
    act(() => { awardXp(120, 'lesson', { id: 't1' }); });
    expect(result.current.level).toMatchObject({ level: 2, totalXp: 120 });
    expect(result.current.today).toBe(120);
    expect(result.current.week[6]).toMatchObject({ xp: 120, isToday: true });
    expect(result.current.streak).toMatchObject({ current: 1, todayDone: true, songStreak: 0 });
  });

  it('Lernpfad, Kompetenzen, Sprachniveau und Tagesplan', () => {
    const { result } = renderHook(() => ({
      stages: useStageStatus('es', COURSE), lessons: useLessonStatus('es', COURSE), next: useNextLesson('es', COURSE),
      comp: useCompetences('es'), level: useLanguageLevel('es'), plan: useDailyPlan('es', COURSE), topics: useTopicMastery('es'),
      sw: useStrengthsWeaknesses('es'), due: useDueCards('es'), records: usePersonalRecords(),
    }));
    expect(result.current.next?.id).toBe('es.s0.l01');
    expect(result.current.level.level).toBe('Einsteiger');
    expect(result.current.plan?.items[0]).toMatchObject({ kind: 'lesson' });
    act(() => {
      completeLesson({ courseId: 'es', lesson: COURSE.lessons[0], scorePct: 90, bestCombo: 4, durationSec: 120 });
      for (let i = 0; i < 3; i++) recordAnswer({ courseId: 'es', exercise: EXERCISES.cloze, outcome: gradeExercise(EXERCISES.cloze, ['es', 'es']), context: 'lesson' });
    });
    expect(result.current.lessons['es.s0.l01']).toBe('completed');
    expect(result.current.next?.id).toBe('es.s0.l02');
    expect(result.current.comp.grammar.evidence).toBe(3);
    expect(result.current.topics['es.g.ser'].mastery).toBe(0);
    expect(result.current.sw.weakTopics).toContain('es.g.ser');
    expect(result.current.due.length).toBe(1); // „hola“ aus der Lektion
    expect(result.current.records.bestCombo).toBe(4);
    expect(result.current.plan?.items.map((i) => i.kind)).toEqual(expect.arrayContaining(['lesson', 'review', 'grammar', 'song']));
    expect(result.current.stages[0].lessonsDone).toBe(1);
  });

  it('Missionen und Abzeichen', () => {
    const { result } = renderHook(() => ({ missions: useMissions(), badges: useBadges() }));
    expect(result.current.missions.daily).toHaveLength(3);
    expect(result.current.missions.weekly).toHaveLength(3);
    expect(result.current.badges.earnedCount).toBe(0);
    act(() => { completeLesson({ courseId: 'es', lesson: COURSE.lessons[0], scorePct: 100, bestCombo: 0, durationSec: 60 }); });
    expect(result.current.badges.earnedCount).toBeGreaterThanOrEqual(2);
    expect(result.current.badges.badges[0].earned).toBe(true);
  });

  it('Einstellungen, Profil, Kurs und Variante', () => {
    const { result } = renderHook(() => ({ s: useSettings(), course: useActiveCourse(), variant: useVariant(), profile: useProfile() }));
    expect(result.current).toMatchObject({ course: 'es', variant: 'es-LA' });
    act(() => { updateSettings({ esVariant: 'es-ES' }); });
    expect(result.current.variant).toBe('es-ES');
    act(() => { setActiveCourse('pt-BR'); updateProfile({ displayName: '  Tolun  ', onboardingDone: true }); });
    expect(result.current).toMatchObject({ course: 'pt-BR', variant: 'pt-BR' });
    expect(result.current.profile).toMatchObject({ displayName: 'Tolun', onboardingDone: true });
    expect(result.current.profile.createdAt).toBeTruthy();
  });

  it('Song-Hooks', () => {
    const { result } = renderHook(() => ({ recs: useSongRecommendations([SONG], 'es'), mastery: useSongMastery(SONG) }));
    expect(result.current.recs[0].song.id).toBe(SONG.id);
    expect(result.current.mastery.total).toBe(0);
  });
});
