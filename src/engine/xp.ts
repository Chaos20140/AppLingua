/**
 * XP-Tabelle, Kombo-Bonus und deterministische Ereignis-IDs (Idempotenz über Geräte hinweg).
 */
import type { CourseId, ExamResult, XpEvent, XpReason } from '../core/types';
import { dayKey, type DayKey } from './dates';

export const XP = {
  correctAnswer: 10,
  /** Kombo-Bonus ab 3 richtigen Antworten in Folge: +2 je Stufe, höchstens +10 */
  comboFrom: 3,
  comboStep: 2,
  comboMax: 10,
  lesson: 50,
  lessonPerfect: 25,
  /** Wiederholte Lektion (1× pro Lektion und Tag) */
  lessonRepeat: 15,
  reviewSession: 20,
  reviewBonus: 10,
  reviewBonusPct: 90,
  /** Mindestanzahl Aufgaben, damit der Wiederholungsbonus zählt */
  reviewBonusMinItems: 5,
  pronAttempt: 5,
  /** XP-Vergabe für Ausspracheversuche höchstens 3× pro Element und Tag */
  pronAttemptsPerItemPerDay: 3,
  midterm: 80,
  final: 150,
  boss: 250,
  /** Anerkennung für einen nicht bestandenen Prüfungsversuch (1× pro Prüfung und Tag) */
  examEffort: 15,
  missionDaily: 30,
  missionDailyHard: 50,
  missionWeekly: 150,
  songLine: 5,
  songComplete: 60,
  songFlawless: 40,
  songExercise: 15,
  songBoss: 120,
  /** Song gehört: 1× pro Song und Tag */
  songPlay: 2,
  placement: 30,
  partner: 30,
} as const;

/** Tages-Aktivität zählt für die Serie ab dieser XP-Menge. */
export const STREAK_MIN_XP = 10;

/** Kombo-Bonus für die n-te richtige Antwort in Folge (3 → +2, 4 → +4 … ab 7 → +10). */
export function comboBonus(combo: number): number {
  if (combo < XP.comboFrom) return 0;
  return Math.min(XP.comboMax, (combo - XP.comboFrom + 1) * XP.comboStep);
}

/** XP für eine richtige Antwort inklusive Kombo-Bonus. */
export const answerXp = (combo = 0) => XP.correctAnswer + comboBonus(combo);

export function lessonXp(opts: { firstTime: boolean; perfect: boolean; perfectBonusAvailable?: boolean }): number {
  if (!opts.firstTime) return XP.lessonRepeat;
  return XP.lesson + (opts.perfect && opts.perfectBonusAvailable !== false ? XP.lessonPerfect : 0);
}

export function reviewSessionXp(correct: number, total: number): { base: number; bonus: number } {
  if (total <= 0) return { base: 0, bonus: 0 };
  const pct = (correct / total) * 100;
  return {
    base: XP.reviewSession,
    bonus: total >= XP.reviewBonusMinItems && pct >= XP.reviewBonusPct ? XP.reviewBonus : 0,
  };
}

export function examXp(kind: ExamResult['kind']): number {
  switch (kind) {
    case 'midterm': return XP.midterm;
    case 'final': return XP.final;
    case 'boss': return XP.boss;
    case 'song-boss': return XP.songBoss;
    case 'placement': return XP.placement;
  }
}

/** Deterministische IDs für XP-Ereignisse (verhindern Doppelvergabe, auch geräteübergreifend). */
export const XP_IDS = {
  answer: (answerId: string) => `ans:${answerId}`,
  lessonFirst: (lessonId: string) => `lesson:${lessonId}:first`,
  lessonPerfect: (lessonId: string) => `lesson:${lessonId}:perfect`,
  lessonRepeat: (lessonId: string, day: DayKey) => `lesson:${lessonId}:repeat:${day}`,
  mission: (periodKey: string, missionId: string) => `mission:${periodKey}:${missionId}`,
  examPassed: (examId: string) => `exam:${examId}:passed`,
  examEffort: (examId: string, day: DayKey) => `exam:${examId}:try:${day}`,
  placement: (courseId: CourseId) => `placement:${courseId}`,
  review: (sessionId: string) => `review:${sessionId}`,
  reviewBonus: (sessionId: string) => `review:${sessionId}:bonus`,
  pron: (courseId: CourseId, itemId: string, day: DayKey, n: number) => `pron:${courseId}:${itemId}:${day}:${n}`,
  partner: (scenarioId: string, day: DayKey) => `partner:${scenarioId}:${day}`,
  songPlay: (songId: string, day: DayKey) => `song:${songId}:play:${day}`,
  songLine: (songId: string, lineId: string) => `song:${songId}:line:${lineId}`,
  songComplete: (songId: string) => `song:${songId}:complete`,
  songFlawless: (songId: string) => `song:${songId}:flawless`,
  songBoss: (songId: string) => `song:${songId}:boss`,
  songExercise: (songId: string, exerciseType: string, day: DayKey) => `song:${songId}:ex:${exerciseType}:${day}`,
} as const;

/** Deutsche Bezeichnungen der XP-Gründe (z. B. für Statistik/Verlauf). */
export const XP_REASON_LABELS: Record<XpReason, string> = {
  exercise: 'Richtige Antworten',
  combo: 'Kombo-Bonus',
  lesson: 'Lektionen',
  perfect: 'Fehlerfrei-Bonus',
  review: 'Wiederholung',
  'review-bonus': 'Wiederholungsbonus',
  pronunciation: 'Aussprache',
  exam: 'Prüfungen',
  boss: 'Endgegner',
  mission: 'Missionen',
  placement: 'Einstufungstest',
  streak: 'Serie',
  partner: 'KI-Gespräche',
  grammar: 'Grammatiktraining',
  vocab: 'Vokabeltraining',
  'song-line': 'Songzeilen gelernt',
  'song-complete': 'Songs abgeschlossen',
  'song-perfect-sing': 'Fehlerfrei mitgesungen',
  'song-exercise': 'Song-Übungen',
  'song-boss': 'Song-Boss',
  'song-play': 'Songs gehört',
};

export const isSongReason = (r: XpReason) => r.startsWith('song-');

export function totalXp(events: readonly { data: XpEvent }[] | readonly XpEvent[]): number {
  let sum = 0;
  for (const e of events) sum += ('data' in e ? e.data : e).amount || 0;
  return sum;
}

/** XP je lokalem Kalendertag. */
export function xpByDay(events: readonly XpEvent[], tz?: string, filter?: (e: XpEvent) => boolean): Map<DayKey, number> {
  const map = new Map<DayKey, number>();
  for (const e of events) {
    if (filter && !filter(e)) continue;
    const k = dayKey(e.at, tz);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + (e.amount || 0));
  }
  return map;
}
