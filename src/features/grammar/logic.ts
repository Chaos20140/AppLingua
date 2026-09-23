/**
 * Reine Logik fürs Grammatikzentrum: Suche, Gruppierung, Stufenstatus, Empfehlung.
 */
import type { StageId, Variant } from '../../core/types';
import { STAGE_ORDER } from '../../core/types';
import type { Exercise, GrammarTopic } from '../../content/types';
import { looseKey } from '../../engine/text';

// ───────────────────────── Suche ─────────────────────────

const key = (s: string | undefined) => looseKey(s ?? '');

/** Durchsuchbarer Text eines Themas (akzentunabhängig, klein). */
export function topicHaystack(t: GrammarTopic): { title: string; rest: string } {
  const parts = [
    t.summary,
    t.category,
    ...(t.keywords ?? []),
    ...(t.examples ?? []).flatMap((e) => [e.target, e.german]),
  ];
  return { title: key(t.title), rest: parts.map(key).join(' | ') };
}

/**
 * Sucht in Titel, Zusammenfassung, Kategorie, Keywords und Beispielen. Alle Suchwörter müssen
 * vorkommen (akzent- und groß/kleinunabhängig). Treffer im Titel zuerst.
 */
export function searchTopics<T extends GrammarTopic>(topics: readonly T[], query: string): T[] {
  const words = key(query).split(' ').filter(Boolean);
  if (!words.length) return topics.slice();
  const scored: { t: T; score: number; i: number }[] = [];
  topics.forEach((t, i) => {
    const h = topicHaystack(t);
    let score = 0;
    for (const w of words) {
      if (h.title.includes(w)) score += h.title.startsWith(w) ? 3 : 2;
      else if (h.rest.includes(w)) score += 1;
      else return;
    }
    scored.push({ t, score, i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.t);
}

// ───────────────────────── Gruppierung ─────────────────────────

export interface TopicGroup<T extends GrammarTopic = GrammarTopic> {
  stageId: StageId;
  categories: { category: string; topics: T[] }[];
  count: number;
}

/** Nach Etappe (Lernpfad-Reihenfolge) und Kategorie (Reihenfolge des ersten Auftretens) gruppiert. */
export function groupTopics<T extends GrammarTopic>(topics: readonly T[]): TopicGroup<T>[] {
  const sorted = topics.slice().sort((a, b) =>
    STAGE_ORDER.indexOf(a.stageId) - STAGE_ORDER.indexOf(b.stageId) || a.order - b.order || a.title.localeCompare(b.title));
  const byStage = new Map<StageId, Map<string, T[]>>();
  for (const t of sorted) {
    let cats = byStage.get(t.stageId);
    if (!cats) byStage.set(t.stageId, (cats = new Map()));
    const list = cats.get(t.category);
    if (list) list.push(t);
    else cats.set(t.category, [t]);
  }
  return [...byStage.entries()].map(([stageId, cats]) => ({
    stageId,
    categories: [...cats.entries()].map(([category, list]) => ({ category, topics: list })),
    count: [...cats.values()].reduce((n, l) => n + l.length, 0),
  }));
}

// ───────────────────────── Stufen ─────────────────────────

export type LevelState = 'done' | 'recommended' | 'open';

export interface LevelInfo {
  level: 1 | 2 | 3;
  state: LevelState;
  /** Übungen mit mindestens einer richtigen Antwort */
  solved: number;
  total: number;
}

/** Anteil gelöster Übungen, ab dem eine Stufe als abgeschlossen gilt. */
export const LEVEL_DONE_RATIO = 0.8;

const forVariant = (ex: Exercise, variant: Variant) => !ex.variant || ex.variant === variant;

/**
 * Status der Übungsstufen eines Themas. Abgeschlossen = mind. 80 % der Übungen je einmal richtig.
 * Empfohlen = erste nicht abgeschlossene Stufe. Nie gesperrt.
 */
export function levelInfos(
  levels: GrammarTopic['levels'],
  solvedIds: ReadonlySet<string>,
  variant: Variant,
): LevelInfo[] {
  const sorted = levels.slice().sort((a, b) => a.level - b.level);
  let recommended = false;
  return sorted.map((l) => {
    const exs = l.exercises.filter((e) => forVariant(e, variant));
    const total = exs.length;
    const solved = exs.filter((e) => solvedIds.has(e.id)).length;
    const done = total > 0 && solved / total >= LEVEL_DONE_RATIO;
    let state: LevelState = done ? 'done' : 'open';
    if (!done && !recommended && total > 0) {
      state = 'recommended';
      recommended = true;
    }
    return { level: l.level, state, solved, total };
  });
}

/** IDs aller Übungen, die mindestens einmal richtig beantwortet wurden. */
export function solvedExerciseIds(answers: readonly { exerciseId: string; correct: boolean }[]): Set<string> {
  const out = new Set<string>();
  for (const a of answers) if (a.correct) out.add(a.exerciseId);
  return out;
}

// ───────────────────────── Empfehlung ─────────────────────────

export interface MasteryLike { mastery: number; evidence: number }

export type Recommendation<T extends GrammarTopic> =
  | { kind: 'weak'; topic: T; mastery: number }
  | { kind: 'next'; topic: T }
  | null;

/**
 * „Dein schwächstes Thema“: niedrigste Beherrschung mit genug Belegen (≥ 3, < 70 %).
 * Sonst: erstes Thema ohne Belege in Lernpfad-Reihenfolge („Als Nächstes“).
 */
export function recommendTopic<T extends GrammarTopic>(
  topics: readonly T[],
  mastery: Readonly<Record<string, MasteryLike | undefined>>,
  opts: { minEvidence?: number; threshold?: number } = {},
): Recommendation<T> {
  const minEvidence = opts.minEvidence ?? 3;
  const threshold = opts.threshold ?? 70;
  let weak: { topic: T; mastery: number; evidence: number } | null = null;
  for (const t of topics) {
    const m = mastery[t.id];
    if (!m || m.evidence < minEvidence || m.mastery >= threshold) continue;
    if (!weak || m.mastery < weak.mastery || (m.mastery === weak.mastery && m.evidence > weak.evidence)) {
      weak = { topic: t, mastery: m.mastery, evidence: m.evidence };
    }
  }
  if (weak) return { kind: 'weak', topic: weak.topic, mastery: weak.mastery };
  const ordered = groupTopics(topics).flatMap((g) => g.categories.flatMap((c) => c.topics));
  const next = ordered.find((t) => !mastery[t.id]?.evidence);
  return next ? { kind: 'next', topic: next } : null;
}

/** Beherrschungs-Einordnung für Anzeige. */
export function masteryLabel(m: MasteryLike | undefined): { label: string; tone: 'neutral' | 'danger' | 'gold' | 'success' } {
  if (!m || m.evidence === 0) return { label: 'Neu', tone: 'neutral' };
  if (m.evidence < 3) return { label: 'Begonnen', tone: 'neutral' };
  if (m.mastery >= 85) return { label: 'Sicher', tone: 'success' };
  if (m.mastery >= 60) return { label: 'Im Aufbau', tone: 'gold' };
  return { label: 'Üben', tone: 'danger' };
}
