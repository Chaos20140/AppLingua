/**
 * Auswertungen fürs Fehlerarchiv (rein, ohne React).
 */
import type { ErrorEntry, ExerciseContext, Skill } from '../../core/types';
import { SKILLS } from '../../core/types';

export type ErrorItem = ErrorEntry & { id: string };

export const SKILL_LABELS: Record<Skill, string> = {
  grammar: 'Grammatik',
  pronunciation: 'Aussprache',
  listening: 'Hören',
  speaking: 'Sprechen',
  reading: 'Lesen',
  writing: 'Schreiben',
  vocabulary: 'Wortschatz',
};

export const CONTEXT_LABELS: Record<ExerciseContext, string> = {
  lesson: 'Lektion',
  review: 'Wiederholung',
  exam: 'Prüfung',
  boss: 'Boss-Prüfung',
  grammar: 'Grammatik',
  pronunciation: 'Aussprache',
  vocab: 'Vokabeln',
  placement: 'Einstufung',
  song: 'Song',
  partner: 'KI-Partner',
};

export interface ErrorFilter {
  skill?: Skill | 'all';
  topicId?: string | 'all';
}

export function filterErrors<T extends ErrorEntry>(entries: readonly T[], f: ErrorFilter): T[] {
  return entries.filter((e) =>
    (!f.skill || f.skill === 'all' || e.skill === f.skill)
    && (!f.topicId || f.topicId === 'all' || (e.topicIds ?? []).includes(f.topicId)));
}

/** Kompetenzen, die in den Einträgen vorkommen (in fester Reihenfolge). */
export function skillsIn(entries: readonly ErrorEntry[]): Skill[] {
  const used = new Set(entries.map((e) => e.skill));
  return SKILLS.filter((s) => used.has(s));
}

/** Themen-IDs, die in den Einträgen vorkommen (häufigste zuerst). */
export function topicsIn(entries: readonly ErrorEntry[]): string[] {
  return topErrorTopics(entries, Infinity).map((t) => t.topicId);
}

export interface TopicStat {
  topicId: string;
  /** Summe der Fehlversuche */
  mistakes: number;
  /** Anzahl verschiedener Übungen */
  exercises: number;
}

/** Häufigste Fehlerthemen: Summe der Fehlversuche je Thema, absteigend. */
export function topErrorTopics(entries: readonly ErrorEntry[], limit = 5): TopicStat[] {
  const acc = new Map<string, TopicStat>();
  for (const e of entries) {
    for (const t of new Set(e.topicIds ?? [])) {
      const cur = acc.get(t) ?? { topicId: t, mistakes: 0, exercises: 0 };
      cur.mistakes += Math.max(1, e.count || 0);
      cur.exercises += 1;
      acc.set(t, cur);
    }
  }
  return [...acc.values()]
    .sort((a, b) => b.mistakes - a.mistakes || b.exercises - a.exercises || a.topicId.localeCompare(b.topicId))
    .slice(0, limit);
}

/** Sortierung: offene nach Häufigkeit/Aktualität, behobene nach Behebungsdatum. */
export function sortErrors<T extends ErrorEntry>(entries: readonly T[], tab: 'open' | 'resolved'): T[] {
  const list = entries.slice();
  if (tab === 'open') return list.sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
  return list.sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));
}

/** Relative deutsche Zeitangabe („heute“, „gestern“, „vor 3 Tagen“, Datum). */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff <= 0) return 'heute';
  if (diff === 1) return 'gestern';
  if (diff < 7) return `vor ${diff} Tagen`;
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}
