/**
 * Feldweise Zusammenführung für Sammlungen, bei denen Last-Write-Wins Fortschritt verlieren würde.
 * Einzige Quelle der Merge-Regeln (src/state/mergers.ts re-exportiert nur). Registriert werden sie
 * vor dem ersten Sync: bootstrapData(), startSync() und syncNow() rufen registerSyncMergers() auf.
 *
 * Wichtig: Ist das Ergebnis inhaltlich gleich der Remote-Version, wird exakt `remote` zurückgegeben.
 * Postgres (jsonb) sortiert Objektschlüssel um – ein naiver JSON-Vergleich in applyRemote würde
 * sonst endlos „geänderte“ Datensätze erneut hochladen (Pingpong zwischen Geräten).
 */
import type {
  BadgeEarned, CollectionName, ErrorEntry, LessonProgress, SongProgress, SrsCard, StoredRecord,
} from '../../core/types';
import { registerMerger } from '../store';

// ───────────────────────── Hilfen ─────────────────────────
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v).sort()) {
      const val = (v as Record<string, unknown>)[key];
      if (val !== undefined) out[key] = canonical(val);
    }
    return out;
  }
  return v;
}

export function sameData(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

const maxNum = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));
/** Kleinster positiver Wert (0/ungültige Dauern zählen nicht als „Bestzeit“). */
const minPos = (a?: number, b?: number) => {
  const v = [a, b].filter((x): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0);
  return v.length ? Math.min(...v) : undefined;
};
const earliest = (a?: string, b?: string) => (!a ? b : !b ? a : a < b ? a : b);
const latest = (a?: string, b?: string) => (!a ? b : !b ? a : a > b ? a : b);

function union(remote: string[] = [], local: string[] = []): string[] {
  const seen = new Set(remote);
  const out = [...remote];
  for (const x of local) if (!seen.has(x)) { seen.add(x); out.push(x); }
  return out;
}

function maxMap(remote: Record<string, number> = {}, local: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = { ...remote };
  for (const [key, v] of Object.entries(local)) out[key] = Math.max(out[key] ?? -Infinity, v);
  return out;
}

/** Entfernt undefined-Felder (sie existieren in jsonb nicht). */
function clean<T extends object>(o: T): T {
  for (const key of Object.keys(o) as (keyof T)[]) if (o[key] === undefined) delete o[key];
  return o;
}

function finish<C extends CollectionName>(local: StoredRecord<C>, remote: StoredRecord<C>, data: StoredRecord<C>['data']): StoredRecord {
  if (sameData(data, remote.data)) return remote as StoredRecord;
  return { ...remote, data, ...(local.localOnly ? { localOnly: true } : {}) } as StoredRecord;
}

const newer = <C extends CollectionName>(a: StoredRecord<C>, b: StoredRecord<C>) => (b.updatedAt > a.updatedAt ? b : a);

// ───────────────────────── Regeln ─────────────────────────
export function mergeLessonProgress(localR: StoredRecord, remoteR: StoredRecord): StoredRecord {
  const local = localR as StoredRecord<'lessonProgress'>;
  const remote = remoteR as StoredRecord<'lessonProgress'>;
  const a = local.data; const b = remote.data;
  const base = newer(local, remote).data;
  const data: LessonProgress = clean({
    ...base,
    bestScorePct: Math.max(a.bestScorePct ?? 0, b.bestScorePct ?? 0),
    stars: Math.max(a.stars ?? 0, b.stars ?? 0) as LessonProgress['stars'],
    attempts: Math.max(a.attempts ?? 0, b.attempts ?? 0),
    firstCompletedAt: earliest(a.firstCompletedAt, b.firstCompletedAt) ?? base.firstCompletedAt,
    lastCompletedAt: latest(a.lastCompletedAt, b.lastCompletedAt) ?? base.lastCompletedAt,
    bestCombo: Math.max(a.bestCombo ?? 0, b.bestCombo ?? 0),
    // „beste“ Dauer = schnellste
    bestDurationSec: minPos(a.bestDurationSec, b.bestDurationSec),
  });
  return finish(local, remote, data);
}

export function mergeSongProgress(localR: StoredRecord, remoteR: StoredRecord): StoredRecord {
  const local = localR as StoredRecord<'songProgress'>;
  const remote = remoteR as StoredRecord<'songProgress'>;
  const a = local.data; const b = remote.data;
  // Position stammt von der zuletzt gespielten Sitzung; die Übungsgenauigkeit gehört zur
  // Fassung mit den meisten Übungen (Zähler und Quote bleiben ein zusammenpassendes Paar).
  const recent = (a.lastPlayedAt ?? '') > (b.lastPlayedAt ?? '') ? a : b;
  const moreEx = (a.exercisesDone ?? 0) > (b.exercisesDone ?? 0) ? a : b;
  const data: SongProgress = clean({
    ...recent,
    learnedLineIds: union(b.learnedLineIds, a.learnedLineIds),
    modesUsed: union(b.modesUsed, a.modesUsed),
    lineScores: maxMap(b.lineScores, a.lineScores),
    pronScores: maxMap(b.pronScores, a.pronScores),
    playCount: Math.max(a.playCount ?? 0, b.playCount ?? 0),
    exercisesDone: moreEx.exercisesDone ?? 0,
    exerciseAccuracy: moreEx.exerciseAccuracy ?? recent.exerciseAccuracy,
    lastPlayedAt: latest(a.lastPlayedAt, b.lastPlayedAt) ?? recent.lastPlayedAt,
    lastPositionMs: recent.lastPositionMs ?? maxNum(a.lastPositionMs, b.lastPositionMs) ?? 0,
    bossPassedAt: earliest(a.bossPassedAt, b.bossPassedAt),
    flawlessSingAt: earliest(a.flawlessSingAt, b.flawlessSingAt),
    completedAt: earliest(a.completedAt, b.completedAt),
  });
  return finish(local, remote, data);
}

export function mergeBadge(localR: StoredRecord, remoteR: StoredRecord): StoredRecord {
  const local = localR as StoredRecord<'badges'>;
  const remote = remoteR as StoredRecord<'badges'>;
  const data: BadgeEarned = { ...remote.data, earnedAt: earliest(local.data.earnedAt, remote.data.earnedAt) ?? remote.data.earnedAt };
  return finish(local, remote, data);
}

export function mergeErrorEntry(localR: StoredRecord, remoteR: StoredRecord): StoredRecord {
  const local = localR as StoredRecord<'errorEntries'>;
  const remote = remoteR as StoredRecord<'errorEntries'>;
  const a = local.data; const b = remote.data;
  // Inhalt (Antwort, Erklärung) vom zuletzt aufgetretenen Fehler.
  const base = (a.lastAt ?? '') > (b.lastAt ?? '') ? a : b;
  const lastAt = latest(a.lastAt, b.lastAt) ?? base.lastAt;
  // Behoben ist der Eintrag, wenn die letzte Behebung nach dem letzten bekannten Fehler liegt –
  // eine Behebung auf nur einem Gerät darf nicht durch die ältere Fassung eines anderen verloren gehen.
  const resolvedCandidate = latest(a.resolvedAt, b.resolvedAt);
  const resolvedAt = resolvedCandidate && resolvedCandidate >= lastAt ? resolvedCandidate : undefined;
  const sameError = (a.lastAt ?? '') === (b.lastAt ?? '');
  const data: ErrorEntry = clean({
    ...base,
    count: Math.max(a.count ?? 0, b.count ?? 0),
    firstAt: earliest(a.firstAt, b.firstAt) ?? base.firstAt,
    lastAt,
    correctSince: resolvedAt || sameError ? Math.max(a.correctSince ?? 0, b.correctSince ?? 0) : base.correctSince,
    resolvedAt,
  });
  return finish(local, remote, data);
}

export function mergeVocabCard(localR: StoredRecord, remoteR: StoredRecord): StoredRecord {
  const local = localR as StoredRecord<'vocabCards'>;
  const remote = remoteR as StoredRecord<'vocabCards'>;
  const la = local.data.lastReviewedAt ?? ''; const ra = remote.data.lastReviewedAt ?? '';
  // Lernstand: die zuletzt tatsächlich geübte Karte gewinnt; ohne Unterschied entscheidet updatedAt.
  const winner: SrsCard = la > ra ? local.data : ra > la ? remote.data : newer(local, remote).data;
  // Verwaltungsfelder (Pausieren, Notiz) aus der zuletzt geänderten Fassung übernehmen.
  const managed = newer(local, remote).data;
  const data: SrsCard = clean({
    ...winner,
    createdAt: earliest(local.data.createdAt, remote.data.createdAt) ?? winner.createdAt,
    suspended: managed.suspended,
    note: managed.note,
  });
  return finish(local, remote, data);
}

let registered = false;
/** Registriert alle Merge-Regeln (idempotent). */
export function registerSyncMergers(): void {
  if (registered) return;
  registered = true;
  registerMerger('lessonProgress', mergeLessonProgress);
  registerMerger('songProgress', mergeSongProgress);
  registerMerger('badges', mergeBadge);
  registerMerger('errorEntries', mergeErrorEntry);
  registerMerger('vocabCards', mergeVocabCard);
}
