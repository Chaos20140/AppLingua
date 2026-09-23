/**
 * Song-Daten des Nutzers: Favoriten, Playlists, Notizen, markierte Wörter, eigene Texte.
 * Alles lokal-first über den Store; Datensätze zu eigenen Texten bleiben auf dem Gerät,
 * solange `settings.songs.syncUserTexts` aus ist.
 */
import { useMemo } from 'react';
import type { Playlist, Variant } from '../../core/types';
import { getRecord, listRecords, nowIso, putRecord, removeRecord, uid, useList } from '../../data/store';
import { getSettings } from '../../state/settings';
import { moveItem } from './library';
import { isUserSongId, userTextIdOf } from './userText';

/** Datensätze mit Liedtext-Auszügen eigener Texte nur lokal halten (außer Sync ist erlaubt). */
export const localOnlyFor = (songId: string) => isUserSongId(songId) && !getSettings().songs.syncUserTexts;

// ───────────────────────── Anzeige-Helfer ─────────────────────────
export const VARIANT_FLAG: Record<Variant, string> = { 'es-ES': '🇪🇸', 'es-LA': '🌎', 'pt-BR': '🇧🇷' };
export const VARIANT_SHORT: Record<Variant, string> = { 'es-ES': 'Spanien', 'es-LA': 'Lateinamerika', 'pt-BR': 'Brasilien' };
export const SPEED_LABEL = { langsam: 'Langsam', mittel: 'Mittel', schnell: 'Schnell' } as const;

// ───────────────────────── Favoriten ─────────────────────────
export function useFavoriteIds(): Set<string> {
  const list = useList('songFavorites');
  return useMemo(() => new Set(list.map((r) => r.data.songId)), [list]);
}

export function useFavorites(): { songId: string; addedAt: string }[] {
  const list = useList('songFavorites');
  return useMemo(() => list.map((r) => r.data).sort((a, b) => b.addedAt.localeCompare(a.addedAt)), [list]);
}

/** Favorit umschalten; gibt den neuen Zustand zurück. */
export function toggleFavorite(songId: string): boolean {
  if (getRecord('songFavorites', songId)) {
    removeRecord('songFavorites', songId);
    return false;
  }
  putRecord('songFavorites', songId, { songId, addedAt: nowIso() });
  return true;
}

// ───────────────────────── Playlists ─────────────────────────
export interface PlaylistView extends Playlist { id: string }

export function usePlaylists(): PlaylistView[] {
  const list = useList('playlists');
  return useMemo(() => list.map((r) => ({ id: r.id, ...r.data, songIds: r.data.songIds ?? [] })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [list]);
}

export const PLAYLIST_NAME_MAX = 60;
export const cleanPlaylistName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, PLAYLIST_NAME_MAX);

export function createPlaylist(name: string, songIds: string[] = []): string {
  const id = uid();
  putRecord('playlists', id, { name: cleanPlaylistName(name) || 'Neue Playlist', songIds, createdAt: nowIso() });
  return id;
}

function updatePlaylist(id: string, fn: (p: Playlist) => Playlist) {
  const p = getRecord('playlists', id);
  if (p) putRecord('playlists', id, fn({ ...p, songIds: [...(p.songIds ?? [])] }));
}

export const renamePlaylist = (id: string, name: string) => updatePlaylist(id, (p) => ({ ...p, name: cleanPlaylistName(name) || p.name }));
export const deletePlaylist = (id: string) => removeRecord('playlists', id);
export const addToPlaylist = (id: string, songId: string) =>
  updatePlaylist(id, (p) => (p.songIds.includes(songId) ? p : { ...p, songIds: [...p.songIds, songId] }));
export const removeFromPlaylist = (id: string, songId: string) =>
  updatePlaylist(id, (p) => ({ ...p, songIds: p.songIds.filter((s) => s !== songId) }));
export const movePlaylistSong = (id: string, index: number, delta: number) =>
  updatePlaylist(id, (p) => ({ ...p, songIds: moveItem(p.songIds, index, delta) }));

// ───────────────────────── Notizen & markierte Wörter ─────────────────────────
export const noteId = (songId: string, lineId?: string) => `${songId}:${lineId ?? 'song'}`;
export const markId = (songId: string, lineId: string, tokenIndex: number) => `${songId}:${lineId}:${tokenIndex}`;

/** Notiz speichern (leerer Text löscht sie). */
export function saveNote(songId: string, lineId: string | undefined, text: string) {
  const id = noteId(songId, lineId);
  const t = text.trim().slice(0, 2000);
  if (!t) { removeRecord('songNotes', id); return; }
  putRecord('songNotes', id, { songId, ...(lineId ? { lineId } : {}), text: t }, { localOnly: localOnlyFor(songId) });
}

/** Wort markieren/entmarkieren; gibt den neuen Zustand zurück. */
export function toggleMarkedWord(songId: string, lineId: string, tokenIndex: number, text: string): boolean {
  const id = markId(songId, lineId, tokenIndex);
  if (getRecord('songMarkedWords', id)) { removeRecord('songMarkedWords', id); return false; }
  putRecord('songMarkedWords', id, { songId, lineId, tokenIndex, text }, { localOnly: localOnlyFor(songId) });
  return true;
}

export function useSongNotes(songId: string) {
  const list = useList('songNotes');
  return useMemo(() => list.filter((r) => r.data.songId === songId).map((r) => ({ id: r.id, ...r.data })), [list, songId]);
}

export function useMarkedWords(songId: string) {
  const list = useList('songMarkedWords');
  return useMemo(() => list.filter((r) => r.data.songId === songId).map((r) => ({ id: r.id, ...r.data })), [list, songId]);
}

// ───────────────────────── Eigene Texte löschen ─────────────────────────
/** Löscht einen eigenen Text samt Notizen, Markierungen, Erklärungen, Favorit, Fortschritt und Playlist-Einträgen. */
export function deleteUserText(songId: string) {
  const textId = userTextIdOf(songId);
  if (!textId) return;
  removeRecord('songUserTexts', textId);
  for (const c of ['songNotes', 'songMarkedWords', 'songExplanations'] as const) {
    for (const r of listRecords(c)) if (r.data.songId === songId) removeRecord(c, r.id);
  }
  // Fehlerarchiv der Song-Übungen enthält Aufgabe und Lösung aus dem Text. (Antworten und
  // Aussprache-Versuche sind unveränderliche Ereignisse; sie bleiben bis zum Löschen aller Daten.)
  const exercisePrefix = `${songId}.x.`;
  for (const r of listRecords('errorEntries')) {
    if (r.data.refId === songId || r.data.exerciseId.startsWith(exercisePrefix)) removeRecord('errorEntries', r.id);
  }
  removeRecord('songFavorites', songId);
  removeRecord('songProgress', songId);
  for (const p of listRecords('playlists')) {
    if (p.data.songIds?.includes(songId)) removeFromPlaylist(p.id, songId);
  }
}
