/**
 * Lädt Kursinhalte pro Sprache (Code-Splitting: jede Sprache ist ein eigener Chunk,
 * der vom Service Worker offline vorgehalten wird). Spanisch und Portugiesisch sind
 * vollständig getrennte Lernpfade.
 */
import { useEffect, useState } from 'react';
import type { CourseId } from '../core/types';
import type { CourseContent, Song } from './types';

const courseCache = new Map<CourseId, Promise<CourseContent>>();
let songsCache: Promise<Song[]> | null = null;

export function loadCourse(id: CourseId): Promise<CourseContent> {
  let p = courseCache.get(id);
  if (!p) {
    p = (id === 'es' ? import('./es/index') : import('./pt-BR/index')).then((m) => m.default);
    p.catch(() => courseCache.delete(id));
    courseCache.set(id, p);
  }
  return p;
}

export function loadSongs(): Promise<Song[]> {
  if (!songsCache) {
    songsCache = import('./songs/index').then((m) => m.default);
    songsCache.catch(() => { songsCache = null; });
  }
  return songsCache;
}

type Loadable<T> = { data: T | null; loading: boolean; error: string | null; retry: () => void };

function useLoadable<T>(load: () => Promise<T>, key: string): Loadable<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; key: string }>({ data: null, error: null, key: '' });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => { if (alive) setState({ data, error: null, key }); },
      () => { if (alive) setState({ data: null, error: 'Inhalte konnten nicht geladen werden. Bitte prüfe deine Verbindung.', key }); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);
  const fresh = state.key === key;
  return { data: fresh ? state.data : null, loading: !fresh, error: fresh ? state.error : null, retry: () => setNonce((n) => n + 1) };
}

export const useCourseContent = (id: CourseId) => useLoadable(() => loadCourse(id), id);
export const useSongs = () => useLoadable(loadSongs, 'songs');
