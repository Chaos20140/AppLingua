/**
 * Songs: Meisterschaft je Song und Empfehlungen (rein, ohne React).
 * Mastery = 40 % gelernte Zeilen + 25 % Übungsgenauigkeit + 25 % Aussprache + 10 % Song-Boss.
 */
import type { CourseId, LanguageLevel, SongPrefs, SongProgress, Variant } from '../core/types';
import type { Song } from '../content/types';

export const SONG_MASTERY_WEIGHTS = { lines: 0.4, exercises: 0.25, pronunciation: 0.25, boss: 0.1 } as const;
/** Zeile gilt ab dieser Punktzahl als gelernt. */
export const SONG_LINE_LEARNED_PCT = 80;
/** Song-Boss gilt ab dieser Punktzahl als bestanden. */
export const SONG_BOSS_PASS_PCT = 70;

export interface SongMastery {
  /** 0–100 */
  total: number;
  /** je Bestandteil 0–100 */
  lines: number;
  exercises: number;
  pronunciation: number;
  boss: number;
  learnedLines: number;
  totalLines: number;
}

type SongLike = Pick<Song, 'id'> & { lines: readonly { id: string }[] };

export function songMastery(progress: SongProgress | undefined | null, song: SongLike): SongMastery {
  const totalLines = song.lines.length;
  if (!progress || !totalLines) {
    return { total: 0, lines: 0, exercises: 0, pronunciation: 0, boss: 0, learnedLines: 0, totalLines };
  }
  const lineIds = new Set(song.lines.map((l) => l.id));
  const learnedLines = new Set(progress.learnedLineIds.filter((id) => lineIds.has(id))).size;
  const lines = (learnedLines / totalLines) * 100;
  const exercises = progress.exercisesDone > 0 ? Math.max(0, Math.min(100, progress.exerciseAccuracy)) : 0;
  let pronSum = 0;
  for (const l of song.lines) pronSum += Math.max(0, Math.min(100, progress.pronScores?.[l.id] ?? 0));
  const pronunciation = pronSum / totalLines;
  const boss = progress.bossPassedAt ? 100 : 0;
  const w = SONG_MASTERY_WEIGHTS;
  const total = Math.round(lines * w.lines + exercises * w.exercises + pronunciation * w.pronunciation + boss * w.boss);
  return {
    total: Math.min(100, total),
    lines: Math.round(lines),
    exercises: Math.round(exercises),
    pronunciation: Math.round(pronunciation),
    boss,
    learnedLines,
    totalLines,
  };
}

/** Rang der Song-Niveaus (A1 = 1 … C1 = 5) bzw. Sprachniveaus (Einsteiger = 0 … Native = 7). */
const LEVEL_RANK: Record<string, number> = {
  Einsteiger: 0, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, 'Native Mastery': 7,
};

export interface RecommendContext {
  courseId: CourseId;
  variant: Variant;
  level: LanguageLevel;
  prefs: Pick<SongPrefs, 'explicitFilter' | 'preferredGenres' | 'preferredArtists' | 'speed' | 'colloquial'>;
  /** schwache Grammatikthemen (IDs) */
  weakTopicIds?: readonly string[];
  /** Fortschritt je songId */
  progress?: Readonly<Record<string, SongProgress | undefined>>;
}

export interface SongRecommendation {
  song: Song;
  score: number;
  /** deutsche Begründungen, wichtigste zuerst */
  reasons: string[];
  mastery: number;
}

/** Songs, die für Kurs + Filter (explizite Inhalte) überhaupt infrage kommen. */
export function eligibleSongs(songs: readonly Song[], courseId: CourseId, explicitFilter: boolean): Song[] {
  return songs.filter((s) => s.courseId === courseId && !(explicitFilter && s.explicit));
}

/**
 * Empfehlungen: Niveau-Passung, Vorlieben (Genre, Künstler, Tempo, Umgangssprache),
 * schwache Grammatikthemen, Variante und Lernfortschritt. Deterministisch sortiert.
 */
export function recommendSongs(songs: readonly Song[], ctx: RecommendContext): SongRecommendation[] {
  const userRank = LEVEL_RANK[ctx.level] ?? 0;
  const weak = new Set(ctx.weakTopicIds ?? []);
  const out: SongRecommendation[] = [];
  for (const song of eligibleSongs(songs, ctx.courseId, ctx.prefs.explicitFilter)) {
    const reasons: { w: number; text: string }[] = [];
    let score = 0;
    const add = (w: number, text?: string) => { score += w; if (text && w > 0) reasons.push({ w, text }); };

    // Niveau
    const diff = (LEVEL_RANK[song.level] ?? 1) - userRank;
    if (diff === 0) add(30, `Passt zu deinem Niveau (${song.level})`);
    else if (diff === 1) add(22, `Kleine Herausforderung (${song.level})`);
    else if (diff === -1) add(12, `Entspannt für dein Niveau (${song.level})`);
    else if (diff < -1) add(2);
    else add(diff === 2 ? -5 : -25);

    // Variante
    if (song.variant === ctx.variant) add(8);
    else add(-4);

    // Vorlieben
    if (ctx.prefs.preferredGenres.includes(song.genre)) add(15, `Dein Lieblingsgenre: ${song.genre}`);
    if (ctx.prefs.preferredArtists.includes(song.artist)) add(15, `Von ${song.artist}, den du magst`);
    if (ctx.prefs.speed === 'langsam') {
      if (song.speed === 'langsam') add(8, 'Langsames Tempo – gut zum Mitlesen');
      else if (song.speed === 'schnell') add(-8);
    } else if (ctx.prefs.speed === 'schnell') {
      if (song.speed === 'schnell') add(8, 'Schnelles Tempo, wie du es magst');
      else if (song.speed === 'langsam') add(-4);
    }
    if (ctx.prefs.colloquial === 'wenig') {
      if (song.colloquialPct > 40) add(-8);
      else if (song.colloquialPct < 20) add(4);
    } else if (ctx.prefs.colloquial === 'viel' && song.colloquialPct > 40) {
      add(8, 'Viel Umgangssprache aus dem Alltag');
    }

    // Schwachstellen
    const hits = song.grammarTags.filter((t) => weak.has(t)).length;
    if (hits > 0) add(Math.min(24, hits * 12), hits === 1 ? 'Übt ein Grammatikthema, das dir noch schwerfällt' : `Übt ${hits} Grammatikthemen, die dir noch schwerfallen`);

    // Fortschritt
    const prog = ctx.progress?.[song.id];
    const mastery = prog ? songMastery(prog, song).total : 0;
    if (!prog || (prog.playCount === 0 && !prog.learnedLineIds.length)) add(6, 'Neu für dich');
    else if (mastery >= 100 || (prog.completedAt && mastery >= 90)) add(-25);
    else if (mastery > 0) add(14, `Weiterlernen: ${mastery} % gemeistert`);

    reasons.sort((a, b) => b.w - a.w);
    out.push({ song, score, reasons: reasons.map((r) => r.text), mastery });
  }
  return out.sort((a, b) => b.score - a.score || a.song.id.localeCompare(b.song.id));
}
