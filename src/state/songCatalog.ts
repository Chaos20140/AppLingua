/**
 * Zwischenspeicher für den Song-Katalog (für Abzeichen und Empfehlungen, die Genre/Künstler brauchen).
 * Der Katalog wird bei Bedarf lazy über die Inhalts-Registry geladen.
 */
import { useSyncExternalStore } from 'react';
import type { Song } from '../content/types';

let catalog: Song[] | null = null;
let loading: Promise<Song[] | null> | null = null;
const listeners = new Set<() => void>();

export const getSongCatalog = () => catalog;

export function setSongCatalog(songs: Song[]) {
  if (catalog === songs) return;
  catalog = songs;
  listeners.forEach((l) => l());
}

/** Lädt den Katalog einmalig (Fehler → null, erneuter Versuch beim nächsten Aufruf). */
export function ensureSongCatalog(): Promise<Song[] | null> {
  if (catalog) return Promise.resolve(catalog);
  if (!loading) {
    loading = import('../content/registry')
      .then((m) => m.loadSongs())
      .then((songs) => { setSongCatalog(songs); return songs; })
      .catch(() => null)
      .finally(() => { loading = null; });
  }
  return loading;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Reaktiver Zugriff auf den (evtl. noch nicht geladenen) Katalog. */
export function useSongCatalog(): Song[] | null {
  return useSyncExternalStore(subscribe, getSongCatalog, getSongCatalog);
}
