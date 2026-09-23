/**
 * Reine Auswertungslogik des Einstufungstests (ohne React).
 * Regel: Eine Etappe gilt als beherrscht, wenn sie UND alle Etappen davor ≥ 70 % erreichen.
 * Empfohlener Start = die Etappe NACH der höchsten beherrschten (sonst Stufe 0).
 * Gestartet werden kann nur in einer Etappe mit verfügbaren Inhalten.
 */
import { STAGE_ORDER, type StageId } from '../../core/types';

export const PLACEMENT_PASS_RATIO = 0.7;

/** Kurzbezeichnung der Etappen (Fallback, falls Inhalte noch nicht geladen sind). */
export const STAGE_SHORT: Record<StageId, string> = {
  stage0: 'Stufe 0', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1', c2: 'C2', native: 'Native Mastery',
};

export interface PlacementAnswer {
  level: StageId;
  /** 0..1 (Teilpunkte); „Weiß ich nicht“ = 0 */
  score: number;
}

export interface StageScore {
  stageId: StageId;
  total: number;
  /** Summe der Punkte (0..total) */
  points: number;
  /** 0..100 */
  pct: number;
  passed: boolean;
}

export interface PlacementEvaluation {
  /** nur Etappen mit beantworteten Fragen, in Lernreihenfolge */
  perStage: StageScore[];
  /** höchste beherrschte Etappe (inkl. aller davor) oder null */
  masteredStage: StageId | null;
  /** Etappe nach der höchsten beherrschten */
  recommendedStage: StageId;
  /** tatsächlich möglicher Start (höchste verfügbare Etappe ≤ Empfehlung) */
  startStage: StageId;
  /** true = Empfehlung liegt über den verfügbaren Inhalten */
  capped: boolean;
  /** 0..100 über alle beantworteten Fragen */
  scorePct: number;
}

const rank = (s: StageId) => STAGE_ORDER.indexOf(s);
const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Fragen in Lernreihenfolge (stabil innerhalb einer Etappe). */
export function sortByStage<T extends { level: StageId }>(questions: readonly T[]): T[] {
  return questions
    .map((q, i) => ({ q, i }))
    .sort((a, b) => rank(a.q.level) - rank(b.q.level) || a.i - b.i)
    .map((x) => x.q);
}

export function stageScores(answers: readonly PlacementAnswer[]): StageScore[] {
  const map = new Map<StageId, { total: number; points: number }>();
  for (const a of answers) {
    const cur = map.get(a.level) ?? { total: 0, points: 0 };
    cur.total += 1;
    cur.points += clamp01(a.score);
    map.set(a.level, cur);
  }
  return STAGE_ORDER.filter((s) => map.has(s)).map((stageId) => {
    const { total, points } = map.get(stageId)!;
    const ratio = total > 0 ? points / total : 0;
    return { stageId, total, points, pct: Math.round(ratio * 100), passed: ratio >= PLACEMENT_PASS_RATIO - 1e-9 };
  });
}

/**
 * @param answers beantwortete Fragen
 * @param availableStages Etappen mit verfügbaren Lektionen (Stufe 0 gilt immer als verfügbar)
 */
export function evaluatePlacement(answers: readonly PlacementAnswer[], availableStages: readonly StageId[]): PlacementEvaluation {
  const perStage = stageScores(answers);
  const byStage = new Map(perStage.map((s) => [s.stageId, s]));

  // Lückenlos von Stufe 0 aufwärts: jede Etappe braucht Fragen und ≥ 70 %.
  let masteredStage: StageId | null = null;
  for (const stageId of STAGE_ORDER) {
    const s = byStage.get(stageId);
    if (!s || !s.passed) break;
    masteredStage = stageId;
  }

  const recIdx = masteredStage === null ? 0 : Math.min(rank(masteredStage) + 1, STAGE_ORDER.length - 1);
  const recommendedStage = STAGE_ORDER[recIdx];

  const available = new Set<StageId>(['stage0', ...availableStages]);
  let startStage: StageId = 'stage0';
  for (let i = recIdx; i >= 0; i--) {
    if (available.has(STAGE_ORDER[i])) { startStage = STAGE_ORDER[i]; break; }
  }

  const total = answers.length;
  const points = answers.reduce((sum, a) => sum + clamp01(a.score), 0);
  return {
    perStage,
    masteredStage,
    recommendedStage,
    startStage,
    capped: startStage !== recommendedStage,
    scorePct: total > 0 ? Math.round((points / total) * 100) : 0,
  };
}

/**
 * Soll der Test nach der gerade beantworteten Frage enden?
 * Ja, wenn eine Etappe vollständig beantwortet und nicht bestanden ist (schwerere Fragen wären nur frustrierend)
 * oder keine Fragen mehr übrig sind.
 */
export function shouldStopAfter(
  questions: readonly { level: StageId }[],
  answeredCount: number,
  answers: readonly PlacementAnswer[],
): boolean {
  if (answeredCount >= questions.length) return true;
  const last = questions[answeredCount - 1];
  const next = questions[answeredCount];
  if (!last || !next || last.level === next.level) return false;
  const s = stageScores(answers).find((x) => x.stageId === last.level);
  return !!s && !s.passed;
}

/** Punkte pro Kompetenz (0..100) für recordPlacement. */
export function perSkillPct(items: readonly { skills: readonly string[]; score: number }[]): Record<string, number> {
  const acc: Record<string, { n: number; p: number }> = {};
  for (const it of items) {
    const skill = it.skills[0];
    if (!skill) continue;
    const cur = (acc[skill] ??= { n: 0, p: 0 });
    cur.n += 1;
    cur.p += clamp01(it.score);
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(acc)) out[k] = Math.round((v.p / v.n) * 100);
  return out;
}
