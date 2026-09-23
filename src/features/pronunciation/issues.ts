/**
 * Aussprache-Labor: Auswertung der Versuche (rein, ohne React).
 */
import type { CourseId, PronAttempt } from '../../core/types';
import type { PronItem } from '../../content/types';

const LABELS: Record<'es' | 'pt', Record<string, string>> = {
  es: {
    rr: 'Gerolltes rr',
    r: 'Einfaches r',
    j: 'Rachenlaut j',
    g: 'g-Laute',
    'll-y': 'll und y',
    ny: 'ñ',
    'b-v': 'b und v',
    'c-z': 'c und z',
    h: 'Stummes h',
    stress: 'Betonung',
    vowels: 'Klare Vokale',
  },
  pt: {
    nasal: 'Nasalvokale',
    ao: 'Nasales -ão',
    lh: 'lh',
    nh: 'nh',
    r: 'R-Laute',
    'd-t': 't und d vor i',
    'l-final': 'L am Silbenende',
    'open-closed': 'Offene & geschlossene Vokale',
    stress: 'Betonung',
  },
};

const baseOf = (courseId: CourseId): 'es' | 'pt' => (courseId === 'pt-BR' ? 'pt' : 'es');

/** Deutsche Bezeichnung eines Problem-Codes. */
export function issueLabel(code: string, courseId: CourseId): string {
  return LABELS[baseOf(courseId)][code] ?? code;
}

export interface ItemStats {
  itemId: string;
  attempts: number;
  best: number;
  last: number;
  lastAt: string;
  lastIssues: string[];
}

/** Statistik je Item (nur Versuche des Kurses). */
export function statsByItem(attempts: readonly PronAttempt[], courseId: CourseId): Map<string, ItemStats> {
  const out = new Map<string, ItemStats>();
  for (const a of attempts) {
    if (a.courseId !== courseId) continue;
    const cur = out.get(a.itemId);
    if (!cur) {
      out.set(a.itemId, { itemId: a.itemId, attempts: 1, best: a.scorePct, last: a.scorePct, lastAt: a.at, lastIssues: a.issues ?? [] });
      continue;
    }
    cur.attempts += 1;
    cur.best = Math.max(cur.best, a.scorePct);
    if (a.at >= cur.lastAt) {
      cur.last = a.scorePct;
      cur.lastAt = a.at;
      cur.lastIssues = a.issues ?? [];
    }
  }
  return out;
}

export interface IssueStat {
  code: string;
  /** Anzahl Wörter/Sätze, deren letzter Versuch diesen Code zeigte */
  items: number;
  itemIds: string[];
  lastAt: string;
}

/**
 * „Deine Baustellen“: Problem-Codes aus dem jeweils LETZTEN Versuch je Item. Wird ein Item später
 * besser gesprochen, verschwindet die Baustelle automatisch. Häufigste zuerst.
 */
export function aggregateIssues(attempts: readonly PronAttempt[], courseId: CourseId, limit = 4): IssueStat[] {
  const acc = new Map<string, IssueStat>();
  for (const st of statsByItem(attempts, courseId).values()) {
    for (const code of new Set(st.lastIssues)) {
      const cur = acc.get(code) ?? { code, items: 0, itemIds: [], lastAt: '' };
      cur.items += 1;
      cur.itemIds.push(st.itemId);
      if (st.lastAt > cur.lastAt) cur.lastAt = st.lastAt;
      acc.set(code, cur);
    }
  }
  return [...acc.values()]
    .sort((a, b) => b.items - a.items || b.lastAt.localeCompare(a.lastAt) || a.code.localeCompare(b.code))
    .slice(0, limit);
}

/** Kategorie, die einen Problem-Code am häufigsten trainiert (für „Jetzt üben“). */
export function categoryForIssue(code: string, items: readonly PronItem[]): string | null {
  const counts = new Map<string, number>();
  for (const it of items) if (it.issueCodes?.includes(code)) counts.set(it.categoryId, (counts.get(it.categoryId) ?? 0) + 1);
  let best: string | null = null;
  let n = 0;
  for (const [cat, c] of counts) if (c > n) { best = cat; n = c; }
  return best;
}

/** Letzte Versuche eines Items (neueste zuerst). */
export function recentAttempts(attempts: readonly PronAttempt[], itemId: string, courseId: CourseId, limit = 5): PronAttempt[] {
  return attempts
    .filter((a) => a.itemId === itemId && a.courseId === courseId)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}

/** Zieht ein zufälliges Minimalpaar-Element (deterministisch testbar über `rand`). */
export function pickPairRound(pairs: readonly [string, string][], rand: () => number = Math.random): { pair: [string, string]; answer: 0 | 1 } | null {
  if (!pairs.length) return null;
  const pair = pairs[Math.min(pairs.length - 1, Math.floor(rand() * pairs.length))];
  return { pair: [pair[0], pair[1]], answer: rand() < 0.5 ? 0 : 1 };
}
