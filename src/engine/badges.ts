/**
 * Abzeichen – deutsch, sinnvoll, aus Ereignissen abgeleitet. Vergabe idempotent über die
 * Datensatz-ID `badges/<badgeId>`; diese Datei berechnet nur, was erfüllt ist.
 */
import type {
  CourseId, ErrorEntry, ExamResult, LessonProgress, PartnerSession, PronAttempt, SongProgress, SrsCard, XpEvent,
} from '../core/types';
import type { Song } from '../content/types';
import { dayKey, type DayKey } from './dates';
import { levelForXp } from './levels';
import { songMastery } from './songs';
import { streakFromXp } from './streak';
import { totalXp, xpByDay } from './xp';
import { provenStages } from './unlock';

export type BadgeCategory = 'Lernen' | 'Serien' | 'Level' | 'Prüfungen' | 'Aussprache' | 'Wortschatz' | 'Gespräche' | 'Songs' | 'Besonderes';

export interface BadgeStats {
  lessonsCompleted: number;
  perfectLessons: number;
  longestStreak: number;
  currentStreak: number;
  bestCombo: number;
  level: number;
  totalXp: number;
  bestDayXp: number;
  examsPassed: number;
  bossesDefeated: number;
  stagesCompleted: number;
  pronAttempts: number;
  vocabCards: number;
  cardReviews: number;
  errorsResolved: number;
  partnerSessions: number;
  coursesWithLessons: number;
  songsPlayed: number;
  songsCompleted: number;
  songGenres: number;
  artistsCompleted: number;
  songsMastered: number;
  flawlessSings: number;
  songBosses: number;
}

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  /** Zielwert der Kennzahl */
  target: number;
  metric: (s: BadgeStats) => number;
}

const b = (id: string, category: BadgeCategory, icon: string, title: string, description: string, target: number, metric: (s: BadgeStats) => number): BadgeDef =>
  ({ id, category, icon, title, description, target, metric });

export const BADGE_DEFS: BadgeDef[] = [
  // Lernen
  b('lesson-1', 'Lernen', '🌱', 'Erster Schritt', 'Deine erste Lektion abgeschlossen.', 1, (s) => s.lessonsCompleted),
  b('lesson-10', 'Lernen', '📖', 'Fleißig', '10 Lektionen abgeschlossen.', 10, (s) => s.lessonsCompleted),
  b('lesson-25', 'Lernen', '📚', 'Bücherwurm', '25 Lektionen abgeschlossen.', 25, (s) => s.lessonsCompleted),
  b('perfect-1', 'Lernen', '💎', 'Fehlerfrei', 'Eine Lektion ohne einen einzigen Fehler abgeschlossen.', 1, (s) => s.perfectLessons),
  b('perfect-5', 'Lernen', '🎯', 'Präzisionsarbeit', '5 Lektionen fehlerfrei abgeschlossen.', 5, (s) => s.perfectLessons),
  b('combo-10', 'Lernen', '🔥', 'In Fahrt', '10 richtige Antworten in Folge.', 10, (s) => s.bestCombo),
  b('combo-25', 'Lernen', '☄️', 'Nicht zu bremsen', '25 richtige Antworten in Folge.', 25, (s) => s.bestCombo),
  // Serien
  b('streak-3', 'Serien', '📅', 'Drei am Stück', 'An 3 Tagen in Folge gelernt.', 3, (s) => s.longestStreak),
  b('streak-7', 'Serien', '🗓️', 'Eine Woche dran', 'An 7 Tagen in Folge gelernt.', 7, (s) => s.longestStreak),
  b('streak-30', 'Serien', '🏔️', 'Monatsroutine', 'An 30 Tagen in Folge gelernt.', 30, (s) => s.longestStreak),
  b('streak-100', 'Serien', '🏆', 'Hundert Tage', 'An 100 Tagen in Folge gelernt.', 100, (s) => s.longestStreak),
  // Level
  b('level-10', 'Level', '⭐', 'Level 10', 'Level 10 erreicht.', 10, (s) => s.level),
  b('level-25', 'Level', '🌟', 'Level 25', 'Level 25 erreicht.', 25, (s) => s.level),
  b('level-50', 'Level', '💫', 'Level 50', 'Level 50 erreicht.', 50, (s) => s.level),
  b('level-100', 'Level', '👑', 'Level 100', 'Level 100 erreicht.', 100, (s) => s.level),
  b('xp-day-100', 'Level', '⚡', 'Power-Tag', 'An einem Tag 100 XP gesammelt.', 100, (s) => s.bestDayXp),
  // Prüfungen
  b('exam-1', 'Prüfungen', '📝', 'Geprüft', 'Deine erste Prüfung bestanden.', 1, (s) => s.examsPassed),
  b('boss-1', 'Prüfungen', '🐉', 'Bezwinger', 'Deinen ersten Endgegner besiegt.', 1, (s) => s.bossesDefeated),
  b('stage-1', 'Prüfungen', '🧭', 'Etappe gemeistert', 'Abschlussprüfung und Endgegner einer Etappe bestanden.', 1, (s) => s.stagesCompleted),
  // Aussprache
  b('pron-50', 'Aussprache', '🗣️', 'Klangforscher', '50 Ausspracheversuche gemacht.', 50, (s) => s.pronAttempts),
  // Wortschatz
  b('vocab-100', 'Wortschatz', '🧠', 'Wortsammler', '100 Vokabeln in deinem Trainer.', 100, (s) => s.vocabCards),
  b('review-100', 'Wortschatz', '🔁', 'Gedächtnisprofi', '100 Karten wiederholt.', 100, (s) => s.cardReviews),
  b('error-1', 'Wortschatz', '🩹', 'Aus Fehlern gelernt', 'Einen Fehler aus dem Fehlerarchiv behoben.', 1, (s) => s.errorsResolved),
  b('error-25', 'Wortschatz', '🛠️', 'Fehlerjäger', '25 Fehler aus dem Fehlerarchiv behoben.', 25, (s) => s.errorsResolved),
  // Gespräche
  b('partner-1', 'Gespräche', '💬', 'Erstes Gespräch', 'Dein erstes Gespräch mit dem Sprachpartner geführt.', 1, (s) => s.partnerSessions),
  b('partner-10', 'Gespräche', '🎙️', 'Gesprächsprofi', '10 Gespräche mit dem Sprachpartner geführt.', 10, (s) => s.partnerSessions),
  b('both-languages', 'Besonderes', '🌍', 'Zweisprachig', 'In Spanisch und Portugiesisch je eine Lektion abgeschlossen.', 2, (s) => s.coursesWithLessons),
  // Songs
  b('song-first', 'Songs', '🎵', 'Erster Song', 'Deinen ersten Lernsong angehört.', 1, (s) => s.songsPlayed),
  b('song-genres-3', 'Songs', '🎸', 'Genre-Wanderer', 'Songs aus 3 verschiedenen Genres gehört.', 3, (s) => s.songGenres),
  b('song-artist', 'Songs', '🎤', 'Echter Fan', 'Alle Songs eines Künstlers vollständig gelernt.', 1, (s) => s.artistsCompleted),
  b('song-mastery', 'Songs', '🏅', 'Song-Meister', 'Einen Song zu 100 % gemeistert.', 1, (s) => s.songsMastered),
  b('song-flawless', 'Songs', '✨', 'Glasklar gesungen', 'Einen Song fehlerfrei mitgesungen.', 1, (s) => s.flawlessSings),
  b('song-boss', 'Songs', '🥁', 'Bühnenreif', 'Einen Song-Boss besiegt.', 1, (s) => s.songBosses),
];

export const BADGES_BY_ID = new Map(BADGE_DEFS.map((d) => [d.id, d]));

export interface BadgeSource {
  xpEvents: readonly XpEvent[];
  lessonProgress: readonly LessonProgress[];
  examResults: readonly ExamResult[];
  pronAttempts: readonly PronAttempt[];
  vocabCards: readonly SrsCard[];
  errorEntries: readonly ErrorEntry[];
  partnerSessions: readonly PartnerSession[];
  songProgress: readonly SongProgress[];
  /** Song-Katalog (für Genres/Künstler/Mastery); fehlt er, werden diese Kennzahlen 0 */
  songs?: readonly Song[];
  today: DayKey;
  tz?: string;
}

export function computeBadgeStats(src: BadgeSource): BadgeStats {
  const streak = streakFromXp(src.xpEvents, src.today, src.tz);
  const xp = totalXp(src.xpEvents);
  let bestDayXp = 0;
  for (const v of xpByDay(src.xpEvents, src.tz, (e) => e.reason !== 'mission').values()) if (v > bestDayXp) bestDayXp = v;

  const completed = src.lessonProgress.filter((p) => p.attempts > 0);
  const courses = new Set<CourseId>(completed.map((p) => p.courseId));
  const passed = src.examResults.filter((r) => r.passed && r.kind !== 'placement' && r.kind !== 'song-boss');
  const stagesCompleted = (['es', 'pt-BR'] as CourseId[]).reduce((n, c) => n + provenStages(src.examResults, c).size, 0);

  const songsById = new Map((src.songs ?? []).map((s) => [s.id, s]));
  const played = src.songProgress.filter((p) => p.playCount > 0);
  const genres = new Set<string>();
  for (const p of played) {
    const s = songsById.get(p.songId);
    if (s) genres.add(s.genre);
  }
  let artistsCompleted = 0;
  if (src.songs?.length) {
    const byArtist = new Map<string, Song[]>();
    for (const s of src.songs) byArtist.set(s.artist, [...(byArtist.get(s.artist) ?? []), s]);
    const completedIds = new Set(src.songProgress.filter((p) => p.completedAt).map((p) => p.songId));
    for (const list of byArtist.values()) {
      if (list.length >= 2 && list.every((s) => completedIds.has(s.id))) artistsCompleted++;
    }
  }
  let songsMastered = 0;
  for (const p of src.songProgress) {
    const s = songsById.get(p.songId);
    if (s && songMastery(p, s).total >= 100) songsMastered++;
  }

  return {
    lessonsCompleted: completed.length,
    perfectLessons: completed.filter((p) => p.bestScorePct >= 100).length,
    longestStreak: streak.longest,
    currentStreak: streak.current,
    bestCombo: completed.reduce((m, p) => Math.max(m, p.bestCombo || 0), 0),
    level: levelForXp(xp),
    totalXp: xp,
    bestDayXp,
    examsPassed: passed.length,
    bossesDefeated: passed.filter((r) => r.kind === 'boss').length,
    stagesCompleted,
    pronAttempts: src.pronAttempts.length,
    vocabCards: src.vocabCards.filter((c) => c.kind === 'vocab' || c.kind === 'phrase').length,
    cardReviews: src.vocabCards.reduce((n, c) => n + (c.lastReviewedAt ? c.reps + c.lapses : 0), 0),
    errorsResolved: src.errorEntries.filter((e) => e.resolvedAt).length,
    partnerSessions: src.partnerSessions.filter((s) => s.turns.some((t) => t.role === 'user')).length,
    coursesWithLessons: courses.size,
    songsPlayed: played.length,
    songsCompleted: src.songProgress.filter((p) => p.completedAt).length,
    songGenres: genres.size,
    artistsCompleted,
    songsMastered,
    flawlessSings: src.songProgress.filter((p) => p.flawlessSingAt).length,
    songBosses: src.songProgress.filter((p) => p.bossPassedAt).length,
  };
}

export const isBadgeEarned = (def: BadgeDef, stats: BadgeStats) => def.metric(stats) >= def.target;

/** IDs erfüllter Abzeichen, die noch nicht vergeben sind. */
export function newlyEarnedBadges(stats: BadgeStats, earned: ReadonlySet<string>): string[] {
  return BADGE_DEFS.filter((d) => !earned.has(d.id) && isBadgeEarned(d, stats)).map((d) => d.id);
}

export interface BadgeProgress { value: number; target: number; ratio: number }

export function badgeProgress(def: BadgeDef, stats: BadgeStats): BadgeProgress {
  const value = Math.min(def.metric(stats), def.target);
  return { value, target: def.target, ratio: def.target > 0 ? value / def.target : 1 };
}

/** Kalendertag der Vergabe (für Anzeigen wie „erhalten am …“). */
export const badgeDay = (earnedAt: string, tz?: string) => dayKey(earnedAt, tz);
