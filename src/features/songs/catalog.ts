/**
 * Song-Katalog: vereinheitlicht Demo-Lernlieder (Inhalts-Registry) und eigene Texte des Nutzers
 * (Sammlung songUserTexts, Song-ID `user.<uuid>`) zu Song-Objekten und speist den Katalog in
 * `setSongCatalog` ein (für Abzeichen/Empfehlungen).
 */
import { useEffect, useMemo } from 'react';
import type { Song } from '../../content/types';
import { useSongs } from '../../content/registry';
import { useDataReady, useList, useRecord } from '../../data/store';
import { setSongCatalog } from '../../state/songCatalog';
import { isUserSongId, userTextIdOf, userTextToSong } from './userText';

export { userTextToSong } from './userText';

export interface SongLookup { song: Song | null; loading: boolean; error: string | null; isUser: boolean; retry: () => void }
export interface SongsLookup { songs: Song[]; loading: boolean; error: string | null; retry: () => void }

/** Nur die eigenen Texte als Songs (neueste zuerst). */
export function useUserSongs(): Song[] {
  const texts = useList('songUserTexts');
  return useMemo(
    () => [...texts]
      .sort((a, b) => (b.data.createdAt ?? '').localeCompare(a.data.createdAt ?? ''))
      .map((r) => userTextToSong(r.id, r.data)),
    [texts],
  );
}

/** Alle Songs (Demo + eigene Texte des Nutzers). Eigene Texte sind auch verfügbar, wenn Demo-Inhalte nicht laden. */
export function useAllSongs(): SongsLookup {
  const s = useSongs();
  const userSongs = useUserSongs();
  const songs = useMemo(() => [...(s.data ?? []), ...userSongs], [s.data, userSongs]);
  useEffect(() => {
    if (s.data) setSongCatalog(songs);
  }, [s.data, songs]);
  return { songs, loading: s.loading, error: s.error, retry: s.retry };
}

/**
 * Einzelner Song per ID (Demo `song.*` oder eigener Text `user.<uuid>`).
 * Eigene Texte hängen nicht vom Laden der Demo-Inhalte ab; der Katalog wird nebenbei eingespeist.
 */
export function useSongById(songId: string): SongLookup {
  const isUser = isUserSongId(songId);
  const all = useAllSongs();
  const ready = useDataReady();
  const text = useRecord('songUserTexts', userTextIdOf(songId) ?? '');
  const userSong = useMemo(() => (isUser && text ? userTextToSong(userTextIdOf(songId) as string, text) : null), [isUser, text, songId]);
  if (isUser) return { song: userSong, loading: !ready, error: null, isUser: true, retry: () => undefined };
  return { song: all.songs.find((x) => x.id === songId) ?? null, loading: all.loading, error: all.error, isUser: false, retry: all.retry };
}
