/**
 * Song-Hooks: Fortschritt, Meisterschaft und Empfehlungen.
 * Aktionen: `recordSongActivity`, `saveSongPosition` (aus actions.ts).
 */
import { useMemo } from 'react';
import type { CourseId, SongProgress } from '../core/types';
import type { Song } from '../content/types';
import { useList, useRecord } from '../data/store';
import { recommendSongs, songMastery, type SongMastery, type SongRecommendation } from '../engine/songs';
import { useLanguageLevel, useStrengthsWeaknesses } from './progress';
import { useSettings, variantOf } from './settings';

export { recordSongActivity, saveSongPosition, type SongActivity, type SongActivityResult, type SongRef } from './actions';
export { ensureSongCatalog, setSongCatalog, useSongCatalog } from './songCatalog';
export type { SongMastery, SongRecommendation };

export function useSongProgress(songId: string): SongProgress | undefined {
  return useRecord('songProgress', songId);
}

export function useAllSongProgress(): Record<string, SongProgress> {
  const list = useList('songProgress');
  return useMemo(() => Object.fromEntries(list.map((r) => [r.id, r.data])), [list]);
}

export function useSongMastery(song: Pick<Song, 'id'> & { lines: readonly { id: string }[] } | null | undefined): SongMastery {
  const progress = useRecord('songProgress', song?.id ?? '');
  return useMemo(() => songMastery(progress, song ?? { id: '', lines: [] }), [progress, song]);
}

/** Empfehlungen für den aktiven (oder angegebenen) Kurs – Filter für explizite Inhalte inklusive. */
export function useSongRecommendations(songs: readonly Song[] | null | undefined, courseId?: CourseId): SongRecommendation[] {
  const settings = useSettings();
  const cid = courseId ?? settings.activeCourse;
  const level = useLanguageLevel(cid);
  const sw = useStrengthsWeaknesses(cid);
  const progress = useAllSongProgress();
  return useMemo(() => {
    if (!songs?.length) return [];
    return recommendSongs(songs, {
      courseId: cid,
      variant: variantOf(settings, cid),
      level: level.level,
      prefs: settings.songs,
      weakTopicIds: sw.weakTopics,
      progress,
    });
  }, [songs, cid, settings, level.level, sw.weakTopics, progress]);
}
