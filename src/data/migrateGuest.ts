/**
 * Gastmodus → Konto.
 *
 * Meldet sich jemand auf einem Gerät an, auf dem bereits Gast-Lernfortschritt liegt, wird NICHT
 * automatisch gemischt: `usePendingGuestDecision()` meldet der UI, dass gefragt werden muss.
 * - adoptGuestData(): Gastdaten ins Konto übernehmen (alles hochladen, danach zusammenführen)
 * - discardGuestData(): Gastdaten verwerfen und die Kontodaten laden
 * Reine Einrichtungsdaten (Einstellungen/Profil ohne Lernfortschritt) werden ohne Rückfrage
 * „weich“ übernommen: vorhandene Kontodaten haben dabei immer Vorrang.
 */
import { create } from 'zustand';
import type { CollectionName, StoredRecord } from '../core/types';
import { restoreAccountBackup } from './accountBackup';
import { getLocalDb, type LocalDb } from './db';
import { allRecords, flushLocalWrites, resetStore, useDataStore, type RecordKey } from './store';
import { setSyncUser, syncNow } from './sync/engine';

/** Sammlungen, die nur Einrichtung/Präferenzen enthalten (kein Lernfortschritt). */
const SETUP_COLLECTIONS: CollectionName[] = ['settings', 'profile', 'courseState'];

export interface GuestDataSummary {
  /** Anzahl Datensätze insgesamt */
  records: number;
  xp: number;
  lessons: number;
  vocabCards: number;
  songs: number;
  userTexts: number;
  /** true, wenn echter Lernfortschritt vorhanden ist (sonst nur Einstellungen) */
  meaningful: boolean;
}

interface GuestDecisionState {
  /** Konto, für das die Entscheidung aussteht (null = keine offene Frage) */
  userId: string | null;
  summary: GuestDataSummary | null;
  busy: boolean;
}

export const useGuestDecisionStore = create<GuestDecisionState>(() => ({ userId: null, summary: null, busy: false }));

/** true, solange die UI fragen muss, was mit den Gastdaten passieren soll. */
export const usePendingGuestDecision = (): boolean => useGuestDecisionStore((s) => s.userId !== null);
export const useGuestDataSummary = (): GuestDataSummary | null => useGuestDecisionStore((s) => s.summary);
export const getPendingGuestDecision = (): string | null => useGuestDecisionStore.getState().userId;

export function guestDataSummary(): GuestDataSummary {
  const live = allRecords().filter((r) => !r.deleted);
  const count = (c: CollectionName) => live.filter((r) => r.collection === c).length;
  const xp = live
    .filter((r): r is StoredRecord<'xpEvents'> => r.collection === 'xpEvents')
    .reduce((sum, r) => sum + (Number(r.data.amount) || 0), 0);
  const progress = live.filter((r) => !SETUP_COLLECTIONS.includes(r.collection)).length;
  return {
    records: live.length,
    xp,
    lessons: count('lessonProgress'),
    vocabCards: count('vocabCards'),
    songs: count('songProgress'),
    userTexts: count('songUserTexts'),
    meaningful: progress > 0,
  };
}

/** Gibt es auf diesem Gerät Gastdaten (irgendeinen nicht gelöschten Datensatz)? */
export function hasGuestData(): boolean {
  return allRecords().some((r) => !r.deleted);
}

function requireDb(): LocalDb {
  const db = getLocalDb();
  if (!db) throw new Error('Lokale Datenbank ist nicht geöffnet.');
  return db;
}

/** Intern (bootstrap): Entscheidung anfordern. */
export function requestGuestDecision(userId: string) {
  useGuestDecisionStore.setState({ userId, summary: guestDataSummary(), busy: false });
}

/** Intern (Abmelden): offene Frage verwerfen, Gastdaten bleiben unverändert. */
export function clearGuestDecision() {
  useGuestDecisionStore.setState({ userId: null, summary: null, busy: false });
}

function markAllDirty(db: LocalDb): Promise<void> {
  const keys: RecordKey[] = allRecords().filter((r) => !r.localOnly).map((r) => ({ collection: r.collection, id: r.id }));
  return db.markDirty(keys);
}

/** Gastdaten ins angemeldete Konto übernehmen. */
export async function adoptGuestData(): Promise<void> {
  const userId = getPendingGuestDecision();
  if (!userId) return;
  const db = requireDb();
  useGuestDecisionStore.setState({ busy: true });
  try {
    await flushLocalWrites();
    await db.settle();
    await markAllDirty(db);
    await db.setMeta('owner', userId);
    await restoreAccountBackup(db, userId);
    clearGuestDecision();
    setSyncUser(userId);
    await syncNow();
  } finally {
    useGuestDecisionStore.setState({ busy: false });
  }
}

/** Gastdaten auf diesem Gerät löschen und stattdessen die Kontodaten laden. */
export async function discardGuestData(): Promise<void> {
  const userId = getPendingGuestDecision();
  if (!userId) return;
  const db = requireDb();
  useGuestDecisionStore.setState({ busy: true });
  try {
    await resetStore();
    await db.setMeta('owner', userId);
    await restoreAccountBackup(db, userId);
    clearGuestDecision();
    setSyncUser(userId);
    await syncNow();
  } finally {
    useGuestDecisionStore.setState({ busy: false });
  }
}

/**
 * Nur Einrichtungsdaten vorhanden: ohne Rückfrage übernehmen, aber so alt datiert, dass bereits
 * vorhandene Kontodaten (z. B. Einstellungen von einem anderen Gerät) gewinnen.
 */
export async function softAdoptSetupData(userId: string): Promise<void> {
  const db = requireDb();
  await flushLocalWrites();
  await db.settle();
  const records = allRecords().filter((r) => !r.deleted);
  const restamped = records.map((r, i) => ({ ...r, updatedAt: new Date(Date.UTC(2000, 0, 1) + i).toISOString() }));
  useDataStore.setState((s) => {
    const tables = { ...s.tables } as Record<CollectionName, Record<string, StoredRecord>>;
    for (const r of restamped) tables[r.collection] = { ...tables[r.collection], [r.id]: r };
    return { tables: tables as typeof s.tables };
  });
  await db.persistence.save(restamped);
  await db.markDirty(restamped.filter((r) => !r.localOnly).map((r) => ({ collection: r.collection, id: r.id })));
  await db.setMeta('owner', userId);
  // Geräte-Sicherung dieses Kontos vor dem ersten Sync zurückspielen (landet so im ersten Upload).
  await restoreAccountBackup(db, userId);
  setSyncUser(userId);
}
