/**
 * Abzeichen: Definitionen, Hook und idempotente Vergabe (Datensatz badges/<badgeId>).
 */
import { useMemo } from 'react';
import type { CollectionData, CollectionName } from '../core/types';
import { listRecords, nowIso, putRecord, useList } from '../data/store';
import {
  BADGE_DEFS, badgeProgress, computeBadgeStats, newlyEarnedBadges,
  type BadgeCategory, type BadgeDef, type BadgeProgress, type BadgeSource, type BadgeStats,
} from '../engine/badges';
import { todayKey } from '../engine/dates';
import type { Song } from '../content/types';
import { emitReward } from './rewards';
import { ensureSongCatalog, getSongCatalog, useSongCatalog } from './songCatalog';
import { useToday } from './today';

export const BADGES: readonly BadgeDef[] = BADGE_DEFS;
export type { BadgeDef, BadgeCategory, BadgeStats, BadgeProgress };

const rows = <C extends CollectionName>(c: C): CollectionData[C][] => listRecords(c).map((r) => r.data);

function currentSource(songs?: readonly Song[]): BadgeSource {
  return {
    xpEvents: rows('xpEvents'),
    lessonProgress: rows('lessonProgress'),
    examResults: rows('examResults'),
    pronAttempts: rows('pronAttempts'),
    vocabCards: rows('vocabCards'),
    errorEntries: rows('errorEntries'),
    partnerSessions: rows('partnerSessions'),
    songProgress: rows('songProgress'),
    songs: songs ?? getSongCatalog() ?? undefined,
    today: todayKey(),
  };
}

let catalogRetry = false;

/**
 * Prüft alle Abzeichen und vergibt neu erfüllte (idempotent). Gibt die neuen IDs zurück
 * und meldet sie zusätzlich über `onReward` (für das Celebration-Overlay).
 * Song-Abzeichen, die den Katalog brauchen, werden nachgereicht, sobald er geladen ist.
 */
export function evaluateBadges(opts: { songs?: readonly Song[] } = {}): string[] {
  const earned = new Set(listRecords('badges').map((r) => r.id));
  const stats = computeBadgeStats(currentSource(opts.songs));
  const fresh = newlyEarnedBadges(stats, earned);
  const at = nowIso();
  for (const id of fresh) putRecord('badges', id, { badgeId: id, earnedAt: at });
  if (fresh.length) emitReward({ type: 'badges', badgeIds: fresh });
  if (!opts.songs && !getSongCatalog() && !catalogRetry && listRecords('songProgress').length) {
    catalogRetry = true;
    void ensureSongCatalog().then((songs) => {
      catalogRetry = false;
      if (songs) evaluateBadges({ songs });
    });
  }
  return fresh;
}

export interface BadgeView {
  def: BadgeDef;
  earned: boolean;
  earnedAt?: string;
  progress: BadgeProgress;
}

/** Alle Abzeichen mit Status und Fortschritt (erhaltene zuerst nach Datum, dann nach Fortschritt). */
export function useBadges(): { badges: BadgeView[]; earnedCount: number; total: number; stats: BadgeStats } {
  const badgeRows = useList('badges');
  const xpEvents = useList('xpEvents');
  const lessonProgress = useList('lessonProgress');
  const examResults = useList('examResults');
  const pronAttempts = useList('pronAttempts');
  const vocabCards = useList('vocabCards');
  const errorEntries = useList('errorEntries');
  const partnerSessions = useList('partnerSessions');
  const songProgress = useList('songProgress');
  const songs = useSongCatalog();
  const today = useToday();

  return useMemo(() => {
    const stats = computeBadgeStats({
      xpEvents: xpEvents.map((r) => r.data),
      lessonProgress: lessonProgress.map((r) => r.data),
      examResults: examResults.map((r) => r.data),
      pronAttempts: pronAttempts.map((r) => r.data),
      vocabCards: vocabCards.map((r) => r.data),
      errorEntries: errorEntries.map((r) => r.data),
      partnerSessions: partnerSessions.map((r) => r.data),
      songProgress: songProgress.map((r) => r.data),
      songs: songs ?? undefined,
      today,
    });
    const earnedAt = new Map(badgeRows.map((r) => [r.id, r.data.earnedAt]));
    const badges: BadgeView[] = BADGE_DEFS.map((def) => ({
      def,
      earned: earnedAt.has(def.id),
      earnedAt: earnedAt.get(def.id),
      progress: badgeProgress(def, stats),
    }));
    badges.sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1;
      if (a.earned && b.earned) return (b.earnedAt ?? '').localeCompare(a.earnedAt ?? '');
      return b.progress.ratio - a.progress.ratio || BADGE_DEFS.indexOf(a.def) - BADGE_DEFS.indexOf(b.def);
    });
    const earnedCount = badges.filter((b) => b.earned).length;
    return { badges, earnedCount, total: BADGE_DEFS.length, stats };
  }, [badgeRows, xpEvents, lessonProgress, examResults, pronAttempts, vocabCards, errorEntries, partnerSessions, songProgress, songs, today]);
}
