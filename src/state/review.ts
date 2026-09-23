/**
 * Wiederholung: fällige Karten (reaktiv) und Zusammenstellung einer Wiederholungssitzung.
 */
import { useEffect, useMemo, useState } from 'react';
import type { CourseId, SrsCard } from '../core/types';
import type { CourseContent } from '../content/types';
import { listRecords, uid, useList } from '../data/store';
import { computeTopicMastery } from '../engine/competence';
import { buildReviewSession as buildSession, type ReviewOptions, type ReviewSession } from '../engine/review';
import { dueCards } from '../engine/srs';
import { getSettings, variantOf } from './settings';

export type { ReviewSession, ReviewOptions };
export { completeReviewSession, reviewCard } from './actions';

/** Zähler, der minütlich weiterläuft (damit „nochmal“-Karten nach 10 Min. wieder erscheinen). */
function useMinuteTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  return tick;
}

/** Fällige Karten eines Kurses (überfällige zuerst). */
export function useDueCards(courseId: CourseId): SrsCard[] {
  const list = useList('vocabCards');
  const tick = useMinuteTick();
  // Zeitpunkt bei jeder Neuberechnung frisch bestimmen (neue Karten sind sofort fällig; `tick` erzwingt minütlich eine Neuberechnung)
  return useMemo(() => dueCards(list.map((r) => r.data), new Date(), courseId), [list, tick, courseId]);
}

/** Alle Karten eines Kurses (z. B. für den Vokabeltrainer). */
export function useCards(courseId: CourseId): SrsCard[] {
  const list = useList('vocabCards');
  return useMemo(
    () => list.map((r) => r.data).filter((c) => c.courseId === courseId).sort((a, b) => a.front.localeCompare(b.front, undefined, { sensitivity: 'base' })),
    [list, courseId],
  );
}

/**
 * Stellt eine Wiederholungssitzung aus dem aktuellen Stand zusammen:
 * fällige Karten + offene Fehler + schwache Themen + Aussprache-Problemstellen.
 * `sessionId` für `completeReviewSession` (XP einmal pro Sitzung).
 */
export function buildReviewSession(courseId: CourseId, content: CourseContent, opts: ReviewOptions = {}): ReviewSession & { sessionId: string } {
  const answers = listRecords('answers').map((r) => r.data);
  const completedLessonIds = new Set(
    listRecords('lessonProgress').map((r) => r.data).filter((p) => p.courseId === courseId && p.attempts > 0).map((p) => p.lessonId),
  );
  const session = buildSession({
    courseId,
    content,
    cards: listRecords('vocabCards').map((r) => r.data),
    errors: listRecords('errorEntries').map((r) => r.data),
    topicMastery: computeTopicMastery(answers, courseId),
    pronAttempts: listRecords('pronAttempts').map((r) => r.data),
    completedLessonIds,
  }, { variant: variantOf(getSettings(), courseId), ...opts });
  return { ...session, sessionId: uid() };
}

/** Offene Fehler eines Kurses (Fehlerarchiv), häufigste zuerst. */
export function useOpenErrors(courseId: CourseId) {
  const list = useList('errorEntries');
  return useMemo(
    () => list.map((r) => ({ id: r.id, ...r.data }))
      .filter((e) => e.courseId === courseId && !e.resolvedAt)
      .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt)),
    [list, courseId],
  );
}
