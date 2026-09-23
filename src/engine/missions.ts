/**
 * Missionen: täglich 3 und wöchentlich 3, deterministisch per Datum aus einem Pool gewählt.
 * Der Fortschritt wird ausschließlich aus den Ereignissen der Periode berechnet;
 * die Belohnung ist ein XP-Ereignis mit der ID `mission:<periode>:<missionId>` (idempotent).
 */
import type {
  AnswerEvent, ExamResult, PartnerSession, PronAttempt, SongExerciseResult, SrsCard, XpEvent,
} from '../core/types';
import { daysOfWeekKey, dayKey, isDayKey, isWeekKey, weekKey, addDays, type DayKey } from './dates';
import { STREAK_MIN_XP, XP, XP_IDS, xpByDay } from './xp';
import { seededShuffle } from './text';

export type MissionPeriod = 'daily' | 'weekly';
export type MissionCategory =
  | 'lesson' | 'answers' | 'goal' | 'pronunciation' | 'review' | 'grammar' | 'partner'
  | 'song-lines' | 'song-sing' | 'song-exercise' | 'vocab' | 'listening' | 'days' | 'xp';

/** Ereignisse einer Periode. */
export interface PeriodData {
  xpEvents: XpEvent[];
  answers: AnswerEvent[];
  pronAttempts: PronAttempt[];
  partnerSessions: PartnerSession[];
  songExerciseResults: SongExerciseResult[];
  examResults: ExamResult[];
  /** in der Periode wiederholte Karten */
  reviewedCards: number;
  dailyGoalXp: number;
  tz?: string;
}

export interface MissionDef {
  id: string;
  period: MissionPeriod;
  category: MissionCategory;
  title: string;
  description: string;
  icon: string;
  /** Zielwert (bei 'goal' dynamisch = Tagesziel) */
  target: number | ((d: PeriodData) => number);
  xp: number;
  /** Kernmission (eine davon ist immer dabei) */
  core?: boolean;
  /** Links in die App */
  route: string;
  measure: (d: PeriodData) => number;
}

const count = <T>(arr: readonly T[], pred: (x: T) => boolean) => arr.reduce((n, x) => n + (pred(x) ? 1 : 0), 0);
const lessonsDone = (d: PeriodData) => new Set(d.xpEvents.filter((e) => e.reason === 'lesson' && e.ref).map((e) => e.ref)).size;
const correctAnswers = (d: PeriodData) => count(d.answers, (a) => a.correct);
const reviewItems = (d: PeriodData) => Math.max(count(d.answers, (a) => a.context === 'review'), d.reviewedCards);
const grammarCorrect = (d: PeriodData) => count(d.answers, (a) => a.correct && (a.context === 'grammar' || a.skills?.[0] === 'grammar'));
const listeningCorrect = (d: PeriodData) => count(d.answers, (a) => a.correct && a.skills?.includes('listening'));
const vocabAnswers = (d: PeriodData) => count(d.answers, (a) => a.context === 'vocab' || (a.skills?.[0] === 'vocabulary' && a.correct));
const songLines = (d: PeriodData) => count(d.xpEvents, (e) => e.reason === 'song-line');
const songSing = (d: PeriodData) => count(d.pronAttempts, (p) => p.context === 'song');
const songExercises = (d: PeriodData) => d.songExerciseResults.length;
const partnerTalks = (d: PeriodData) => count(d.partnerSessions, (s) => s.turns.filter((t) => t.role === 'user').length >= 2);
const xpWithoutMissions = (d: PeriodData) => d.xpEvents.reduce((n, e) => n + (e.reason === 'mission' ? 0 : e.amount), 0);
const activeDays = (d: PeriodData) => {
  let n = 0;
  for (const xp of xpByDay(d.xpEvents, d.tz).values()) if (xp >= STREAK_MIN_XP) n++;
  return n;
};

export const MISSIONS: MissionDef[] = [
  // ── täglich: Kern ──
  { id: 'd.lesson', period: 'daily', category: 'lesson', core: true, icon: '📘', title: 'Eine Lektion abschließen', description: 'Schließe heute eine Lektion ab – neu oder zur Wiederholung.', target: 1, xp: XP.missionDaily, route: '/lernpfad', measure: lessonsDone },
  { id: 'd.correct', period: 'daily', category: 'answers', core: true, icon: '✅', title: '20 richtige Antworten', description: 'Beantworte heute 20 Aufgaben richtig – egal wo.', target: 20, xp: XP.missionDaily, route: '/lernpfad', measure: correctAnswers },
  { id: 'd.goal', period: 'daily', category: 'goal', core: true, icon: '🎯', title: 'Tagesziel erreichen', description: 'Sammle heute so viele XP wie dein Tagesziel (Missionen zählen nicht mit).', target: (d) => Math.max(10, d.dailyGoalXp), xp: XP.missionDaily, route: '/dashboard', measure: xpWithoutMissions },
  // ── täglich: Abwechslung ──
  { id: 'd.pron', period: 'daily', category: 'pronunciation', icon: '🗣️', title: '5 Ausspracheversuche', description: 'Sprich heute 5 Wörter oder Sätze im Aussprache-Labor oder in Lektionen.', target: 5, xp: XP.missionDaily, route: '/aussprache', measure: (d) => d.pronAttempts.length },
  { id: 'd.review', period: 'daily', category: 'review', icon: '🔁', title: '10 Wiederholungen', description: 'Wiederhole heute 10 Karten oder Aufgaben.', target: 10, xp: XP.missionDaily, route: '/wiederholung', measure: reviewItems },
  { id: 'd.grammar', period: 'daily', category: 'grammar', icon: '🧩', title: '8 Grammatikaufgaben richtig', description: 'Löse heute 8 Grammatikaufgaben richtig.', target: 8, xp: XP.missionDailyHard, route: '/grammatik', measure: grammarCorrect },
  { id: 'd.partner', period: 'daily', category: 'partner', icon: '💬', title: 'Ein Gespräch führen', description: 'Führe heute ein Gespräch mit dem Sprachpartner (mindestens 2 eigene Beiträge).', target: 1, xp: XP.missionDailyHard, route: '/partner', measure: partnerTalks },
  { id: 'd.vocab', period: 'daily', category: 'vocab', icon: '📚', title: '10 Vokabeln üben', description: 'Übe heute 10 Vokabeln – im Vokabeltrainer oder in Lektionen.', target: 10, xp: XP.missionDaily, route: '/vokabeln', measure: vocabAnswers },
  { id: 'd.listening', period: 'daily', category: 'listening', icon: '🎧', title: '5 Höraufgaben richtig', description: 'Löse heute 5 Hör- oder Diktataufgaben richtig.', target: 5, xp: XP.missionDaily, route: '/lernpfad', measure: listeningCorrect },
  { id: 'd.song-lines', period: 'daily', category: 'song-lines', icon: '🎵', title: '3 Songzeilen lernen', description: 'Lerne heute 3 Zeilen eines Lernsongs.', target: 3, xp: XP.missionDaily, route: '/songs', measure: songLines },
  { id: 'd.song-sing', period: 'daily', category: 'song-sing', icon: '🎤', title: '4 Zeilen mitsingen', description: 'Singe heute 4 Songzeilen mit (Aussprache im Song).', target: 4, xp: XP.missionDailyHard, route: '/songs', measure: songSing },
  { id: 'd.song-exercise', period: 'daily', category: 'song-exercise', icon: '🎼', title: 'Eine Song-Übung', description: 'Mache heute eine Übung zu einem Song.', target: 1, xp: XP.missionDaily, route: '/songs', measure: songExercises },

  // ── wöchentlich: Kern ──
  { id: 'w.lessons', period: 'weekly', category: 'lesson', core: true, icon: '📗', title: '5 Lektionen abschließen', description: 'Schließe diese Woche 5 Lektionen ab.', target: 5, xp: XP.missionWeekly, route: '/lernpfad', measure: lessonsDone },
  { id: 'w.days', period: 'weekly', category: 'days', core: true, icon: '📅', title: 'An 5 Tagen lernen', description: 'Sammle diese Woche an 5 Tagen jeweils mindestens 10 XP.', target: 5, xp: XP.missionWeekly, route: '/dashboard', measure: activeDays },
  { id: 'w.xp', period: 'weekly', category: 'xp', core: true, icon: '⚡', title: '500 XP sammeln', description: 'Sammle diese Woche 500 XP (ohne Missionsbelohnungen).', target: 500, xp: XP.missionWeekly, route: '/dashboard', measure: xpWithoutMissions },
  // ── wöchentlich: Abwechslung ──
  { id: 'w.correct', period: 'weekly', category: 'answers', icon: '🏅', title: '150 richtige Antworten', description: 'Beantworte diese Woche 150 Aufgaben richtig.', target: 150, xp: XP.missionWeekly, route: '/lernpfad', measure: correctAnswers },
  { id: 'w.pron', period: 'weekly', category: 'pronunciation', icon: '🎙️', title: '30 Ausspracheversuche', description: 'Sprich diese Woche 30 Wörter oder Sätze.', target: 30, xp: XP.missionWeekly, route: '/aussprache', measure: (d) => d.pronAttempts.length },
  { id: 'w.review', period: 'weekly', category: 'review', icon: '🧠', title: '50 Wiederholungen', description: 'Wiederhole diese Woche 50 Karten oder Aufgaben.', target: 50, xp: XP.missionWeekly, route: '/wiederholung', measure: reviewItems },
  { id: 'w.grammar', period: 'weekly', category: 'grammar', icon: '🔧', title: '40 Grammatikaufgaben richtig', description: 'Löse diese Woche 40 Grammatikaufgaben richtig.', target: 40, xp: XP.missionWeekly, route: '/grammatik', measure: grammarCorrect },
  { id: 'w.partner', period: 'weekly', category: 'partner', icon: '🗨️', title: '3 Gespräche führen', description: 'Führe diese Woche 3 Gespräche mit dem Sprachpartner.', target: 3, xp: XP.missionWeekly, route: '/partner', measure: partnerTalks },
  { id: 'w.listening', period: 'weekly', category: 'listening', icon: '👂', title: '25 Höraufgaben richtig', description: 'Löse diese Woche 25 Hör- oder Diktataufgaben richtig.', target: 25, xp: XP.missionWeekly, route: '/lernpfad', measure: listeningCorrect },
  { id: 'w.song-lines', period: 'weekly', category: 'song-lines', icon: '🎶', title: '15 Songzeilen lernen', description: 'Lerne diese Woche 15 Songzeilen.', target: 15, xp: XP.missionWeekly, route: '/songs', measure: songLines },
  { id: 'w.song-sing', period: 'weekly', category: 'song-sing', icon: '🎤', title: '20 Zeilen mitsingen', description: 'Singe diese Woche 20 Songzeilen mit.', target: 20, xp: XP.missionWeekly, route: '/songs', measure: songSing },
  { id: 'w.song-exercise', period: 'weekly', category: 'song-exercise', icon: '🎼', title: '3 Song-Übungen', description: 'Mache diese Woche 3 Übungen zu Songs.', target: 3, xp: XP.missionWeekly, route: '/songs', measure: songExercises },
];

export const MISSIONS_BY_ID = new Map(MISSIONS.map((m) => [m.id, m]));
export const MISSIONS_PER_PERIOD = 3;

export const periodOfKey = (periodKey: string): MissionPeriod | null =>
  isDayKey(periodKey) ? 'daily' : isWeekKey(periodKey) ? 'weekly' : null;

export const currentPeriodKey = (period: MissionPeriod, today: DayKey) => (period === 'daily' ? today : weekKey(today));

/** Tage einer Periode. */
export const daysOfPeriod = (periodKey: string): DayKey[] =>
  isDayKey(periodKey) ? [periodKey] : isWeekKey(periodKey) ? daysOfWeekKey(periodKey) : [];

/**
 * Deterministische Auswahl: 1 Kernmission + 2 weitere aus unterschiedlichen Kategorien.
 * Gleicher Periodenschlüssel → gleiche Missionen auf allen Geräten.
 */
export function selectMissions(periodKey: string): MissionDef[] {
  const period = periodOfKey(periodKey);
  if (!period) return [];
  const pool = MISSIONS.filter((m) => m.period === period);
  const core = seededShuffle(pool.filter((m) => m.core), `${periodKey}:core`);
  const rest = seededShuffle(pool.filter((m) => !m.core), `${periodKey}:rest`);
  const picked: MissionDef[] = [core[0]];
  const cats = new Set<MissionCategory>([core[0].category]);
  let songPicked = false;
  for (const m of rest) {
    if (picked.length >= MISSIONS_PER_PERIOD) break;
    const isSong = m.category.startsWith('song-');
    if (cats.has(m.category) || (isSong && songPicked)) continue;
    picked.push(m);
    cats.add(m.category);
    if (isSong) songPicked = true;
  }
  return picked;
}

/** Quelle für die Periodenberechnung (alle Ereignisse; die Funktion filtert selbst). */
export interface MissionSource {
  xpEvents: readonly XpEvent[];
  answers: readonly AnswerEvent[];
  pronAttempts: readonly PronAttempt[];
  partnerSessions: readonly PartnerSession[];
  songExerciseResults: readonly SongExerciseResult[];
  examResults: readonly ExamResult[];
  vocabCards: readonly SrsCard[];
  dailyGoalXp: number;
}

export function buildPeriodData(src: MissionSource, periodKey: string, tz?: string): PeriodData {
  const days = new Set(daysOfPeriod(periodKey));
  const inPeriod = (at: string | undefined) => !!at && days.has(dayKey(at, tz));
  return {
    xpEvents: src.xpEvents.filter((e) => inPeriod(e.at)),
    answers: src.answers.filter((a) => inPeriod(a.at)),
    pronAttempts: src.pronAttempts.filter((p) => inPeriod(p.at)),
    partnerSessions: src.partnerSessions.filter((s) => inPeriod(s.at)),
    songExerciseResults: src.songExerciseResults.filter((s) => inPeriod(s.at)),
    examResults: src.examResults.filter((r) => inPeriod(r.at)),
    reviewedCards: src.vocabCards.filter((c) => inPeriod(c.lastReviewedAt)).length,
    dailyGoalXp: src.dailyGoalXp,
    tz,
  };
}

export interface MissionStatus {
  id: string;
  period: MissionPeriod;
  periodKey: string;
  category: MissionCategory;
  title: string;
  description: string;
  icon: string;
  route: string;
  target: number;
  progress: number;
  /** 0..1 */
  ratio: number;
  xp: number;
  completed: boolean;
  claimed: boolean;
  /** ID des Belohnungs-Ereignisses */
  rewardId: string;
}

export const targetOf = (m: MissionDef, d: PeriodData) => (typeof m.target === 'function' ? m.target(d) : m.target);

/** Status der Missionen einer Periode. `claimedIds` = vorhandene XP-Ereignis-IDs. */
export function missionStatuses(src: MissionSource, periodKey: string, claimedIds: ReadonlySet<string>, tz?: string): MissionStatus[] {
  const period = periodOfKey(periodKey);
  if (!period) return [];
  const data = buildPeriodData(src, periodKey, tz);
  return selectMissions(periodKey).map((m) => {
    const target = targetOf(m, data);
    const raw = m.measure(data);
    const rewardId = XP_IDS.mission(periodKey, m.id);
    return {
      id: m.id, period, periodKey, category: m.category, title: m.title, description: m.description,
      icon: m.icon, route: m.route, target,
      progress: Math.min(raw, target),
      ratio: target > 0 ? Math.min(1, raw / target) : 1,
      xp: m.xp,
      completed: raw >= target,
      claimed: claimedIds.has(rewardId),
      rewardId,
    };
  });
}

export type ClaimCheck = { ok: true; mission: MissionDef; xp: number; rewardId: string } | { ok: false; reason: string };

/**
 * Prüft, ob eine Mission eingelöst werden darf: Sie muss zur Auswahl der Periode gehören,
 * die Periode muss aktuell (oder die unmittelbar vorherige) sein und das Ziel erreicht sein.
 */
export function checkClaim(src: MissionSource, missionId: string, periodKey: string, today: DayKey, claimedIds: ReadonlySet<string>, tz?: string): ClaimCheck {
  const period = periodOfKey(periodKey);
  if (!period) return { ok: false, reason: 'Unbekannter Zeitraum.' };
  const mission = selectMissions(periodKey).find((m) => m.id === missionId);
  if (!mission) return { ok: false, reason: 'Diese Mission gehört nicht zu diesem Zeitraum.' };
  const current = currentPeriodKey(period, today);
  const previous = period === 'daily' ? addDays(today, -1) : weekKey(addDays(today, -7));
  if (periodKey !== current && periodKey !== previous) return { ok: false, reason: 'Dieser Zeitraum ist abgelaufen.' };
  const rewardId = XP_IDS.mission(periodKey, missionId);
  if (claimedIds.has(rewardId)) return { ok: false, reason: 'Belohnung bereits abgeholt.' };
  const data = buildPeriodData(src, periodKey, tz);
  if (mission.measure(data) < targetOf(mission, data)) return { ok: false, reason: 'Die Mission ist noch nicht erfüllt.' };
  return { ok: true, mission, xp: mission.xp, rewardId };
}
