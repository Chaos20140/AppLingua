/**
 * Spielerlevel (XP) – strikt getrennt vom nachgewiesenen Sprachniveau.
 * Gesamt-XP für Level L: 25·(L−1)² + 75·(L−1)  → L2 = 100, L3 = 250, L10 = 2 700, L120 = 362 950.
 */

export const MAX_LEVEL = 120;

/** Titel je 10 Level (Level 1–10 = Neuling, …, 111–120 = Ikone). */
export const LEVEL_TITLES = [
  'Neuling', 'Entdecker', 'Reisender', 'Gesprächspartner', 'Weltenbummler', 'Sprachkünstler',
  'Stilist', 'Kenner', 'Virtuose', 'Meister', 'Legende', 'Ikone',
] as const;

/** Benötigte Gesamt-XP, um Level L zu erreichen. */
export function totalXpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level)) - 1;
  return 25 * l * l + 75 * l;
}

/** Level zu einer XP-Summe (1 … MAX_LEVEL). */
export function levelForXp(totalXp: number): number {
  const xp = Math.max(0, totalXp);
  // Umkehrung von 25x² + 75x = xp → x = (−75 + √(75² + 100·xp)) / 50
  let l = Math.floor((-75 + Math.sqrt(5625 + 100 * xp)) / 50) + 1;
  // Rundungsfehler absichern
  while (l > 1 && totalXpForLevel(l) > xp) l--;
  while (l < MAX_LEVEL && totalXpForLevel(l + 1) <= xp) l++;
  return Math.min(MAX_LEVEL, Math.max(1, l));
}

export function titleForLevel(level: number): string {
  const idx = Math.min(LEVEL_TITLES.length - 1, Math.floor((Math.max(1, level) - 1) / 10));
  return LEVEL_TITLES[idx];
}

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  /** XP seit Beginn des aktuellen Levels */
  xpIntoLevel: number;
  /** XP-Spanne des aktuellen Levels (bis zum nächsten) */
  xpForLevel: number;
  /** 0..1 Fortschritt zum nächsten Level (1 bei Maximallevel) */
  progress: number;
  /** noch fehlende XP bis zum nächsten Level (0 bei Maximallevel) */
  xpToNext: number;
  /** Titel, der beim nächsten Titelwechsel erreicht wird */
  nextTitle: string | null;
  /** Level, ab dem der nächste Titel gilt */
  nextTitleLevel: number | null;
  maxed: boolean;
}

export function levelInfo(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.round(totalXp));
  const level = levelForXp(xp);
  const title = titleForLevel(level);
  const base = totalXpForLevel(level);
  const maxed = level >= MAX_LEVEL;
  const span = totalXpForLevel(level + 1) - base;
  const into = xp - base;
  const nextTitleLevel = Math.floor((level - 1) / 10) * 10 + 11;
  const hasNextTitle = nextTitleLevel <= MAX_LEVEL;
  return {
    level,
    title,
    totalXp: xp,
    xpIntoLevel: maxed ? Math.min(into, span) : into,
    xpForLevel: span,
    progress: maxed ? 1 : Math.min(1, into / span),
    xpToNext: maxed ? 0 : span - into,
    nextTitle: hasNextTitle ? titleForLevel(nextTitleLevel) : null,
    nextTitleLevel: hasNextTitle ? nextTitleLevel : null,
    maxed,
  };
}
