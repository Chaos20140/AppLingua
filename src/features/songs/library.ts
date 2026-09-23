/**
 * Song-Bibliothek: Suche (Titel/Künstler/Text), Filter, Sortierung und Hilfen für
 * Playlists – reine Logik ohne React.
 */
import type { CourseId, Variant } from '../../core/types';
import type { Song, SongGenre } from '../../content/types';
import { looseKey } from '../../engine/text';
import type { SongLevel } from './userText';

export type LangFilter = 'all' | CourseId | Variant;
export type ColloquialBucket = 'wenig' | 'mittel' | 'viel';

export interface LibraryFilters {
  lang: LangFilter;
  artist: string;
  level: 'all' | SongLevel;
  genre: 'all' | SongGenre;
  speed: 'all' | Song['speed'];
  colloquial: 'all' | ColloquialBucket;
}

export const EMPTY_FILTERS: LibraryFilters = { lang: 'all', artist: 'all', level: 'all', genre: 'all', speed: 'all', colloquial: 'all' };

/** Gleiche Schwellen wie die Empfehlungen: < 20 % wenig, > 40 % viel. */
export function colloquialBucket(pct: number): ColloquialBucket {
  if (pct < 20) return 'wenig';
  if (pct > 40) return 'viel';
  return 'mittel';
}

/** Anzahl aktiver Filter (ohne Sprache, die separat angezeigt wird). */
export function activeFilterCount(f: LibraryFilters): number {
  return (['artist', 'level', 'genre', 'speed', 'colloquial'] as const).filter((k) => f[k] !== 'all').length;
}

export function matchesLang(song: Pick<Song, 'courseId' | 'variant'>, lang: LangFilter): boolean {
  if (lang === 'all') return true;
  if (lang === 'es') return song.courseId === 'es';
  if (lang === 'pt-BR') return song.courseId === 'pt-BR';
  return song.variant === lang;
}

export function matchesFilters(song: Song, f: LibraryFilters, hideExplicit: boolean): boolean {
  if (hideExplicit && song.explicit) return false;
  if (!matchesLang(song, f.lang)) return false;
  if (f.artist !== 'all' && song.artist !== f.artist) return false;
  if (f.level !== 'all' && song.level !== f.level) return false;
  if (f.genre !== 'all' && song.genre !== f.genre) return false;
  if (f.speed !== 'all' && song.speed !== f.speed) return false;
  if (f.colloquial !== 'all' && colloquialBucket(song.colloquialPct) !== f.colloquial) return false;
  return true;
}

export interface LibraryHit {
  song: Song;
  /** Zeile, in der der Suchbegriff vorkommt (nur bei Treffern im Text) */
  matchedLine?: string;
  score: number;
}

const LEVEL_ORDER: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5 };

/** Standard-Sortierung: Sprache, Niveau, Titel. */
export function compareSongs(a: Song, b: Song): number {
  return a.courseId.localeCompare(b.courseId)
    || (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9)
    || a.title.localeCompare(b.title, 'de');
}

/**
 * Suche in Titel, Künstler und Songtext (akzent- und großschreibungsunabhängig; alle Suchwörter
 * müssen vorkommen). Treffer im Titel zählen mehr als im Künstler, diese mehr als im Text.
 */
export function searchLibrary(songs: readonly Song[], query: string, filters: LibraryFilters, hideExplicit: boolean): LibraryHit[] {
  const terms = looseKey(query).split(/\s+/).filter(Boolean);
  const out: LibraryHit[] = [];
  for (const song of songs) {
    if (!matchesFilters(song, filters, hideExplicit)) continue;
    if (!terms.length) { out.push({ song, score: 0 }); continue; }
    const title = looseKey(song.title);
    const artist = looseKey(song.artist);
    const lines = song.lines.map((l) => ({ text: l.text, key: looseKey(l.text) }));
    const lyric = lines.map((l) => l.key).join(' ');
    let score = 0;
    let ok = true;
    for (const t of terms) {
      if (title.includes(t)) score += 3;
      else if (artist.includes(t)) score += 2;
      else if (lyric.includes(t)) score += 1;
      else { ok = false; break; }
    }
    if (!ok) continue;
    const hit: LibraryHit = { song, score };
    if (!terms.every((t) => title.includes(t) || artist.includes(t))) {
      const line = lines.find((l) => terms.every((t) => l.key.includes(t))) ?? lines.find((l) => terms.some((t) => l.key.includes(t)));
      if (line) hit.matchedLine = line.text;
    }
    out.push(hit);
  }
  return out.sort((a, b) => b.score - a.score || compareSongs(a.song, b.song));
}

/** Verschiebt einen Eintrag um `delta` Positionen (Ränder werden eingehalten). */
export function moveItem<T>(items: readonly T[], index: number, delta: number): T[] {
  const next = [...items];
  const to = Math.max(0, Math.min(items.length - 1, index + delta));
  if (index < 0 || index >= items.length || to === index) return next;
  const [it] = next.splice(index, 1);
  next.splice(to, 0, it);
  return next;
}

/** Optionen für Künstler-/Genre-Filter aus den vorhandenen Songs (sortiert, eindeutig). */
export function distinctValues<K extends 'artist' | 'genre'>(songs: readonly Song[], key: K): Song[K][] {
  const set = new Set<Song[K]>();
  for (const s of songs) if (s[key]) set.add(s[key]);
  return [...set].sort((a, b) => String(a).localeCompare(String(b), 'de'));
}
