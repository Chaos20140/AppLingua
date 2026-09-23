/**
 * Fortschritt je Zeile für die Gewichtung der Song-Übungen: beste Zeilen-/Aussprachewerte aus
 * songProgress und offene Fehler aus dem Fehlerarchiv (Übungen dieses Songs).
 */
import { useMemo } from 'react';
import type { Song } from '../../../content/types';
import { useList, useRecord } from '../../../data/store';
import { lineIdsForExercises, type LineFocus } from './generator';

export function useSongFocus(song: Song | null): LineFocus {
  const progress = useRecord('songProgress', song?.id ?? '');
  const errors = useList('errorEntries');
  const openErrorIds = useMemo(() => {
    if (!song) return '';
    const prefix = `${song.id}.x.`;
    return errors
      .filter((r) => !r.data.resolvedAt && r.data.courseId === song.courseId && r.data.exerciseId.startsWith(prefix))
      .map((r) => r.data.exerciseId)
      .sort()
      .join('|');
  }, [errors, song]);

  return useMemo<LineFocus>(() => {
    if (!song) return {};
    const errorLineIds = openErrorIds ? lineIdsForExercises(song, openErrorIds.split('|')) : [];
    return { lineScores: progress?.lineScores ?? {}, pronScores: progress?.pronScores ?? {}, errorLineIds };
  }, [song, progress, openErrorIds]);
}
