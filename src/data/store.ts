/**
 * Zentraler, lokal-first Datenspeicher.
 *
 * - Alle Daten liegen im Speicher (zustand) und werden über eine austauschbare
 *   `Persistence` (IndexedDB) dauerhaft gesichert.
 * - Jede lokale Änderung wird in die Outbox eingetragen; die Sync-Engine
 *   (src/data/sync) überträgt sie in die Cloud, sobald ein Konto + Netz vorhanden ist.
 * - Features lesen über Hooks (useRecord/useList) und schreiben über
 *   putRecord/patchRecord/removeRecord/appendEvent – NIE direkt in IndexedDB.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import {
  COLLECTIONS, EVENT_COLLECTIONS,
  type CollectionData, type CollectionName, type StoredRecord,
} from '../core/types';

export interface RecordKey { collection: CollectionName; id: string }

export interface Persistence {
  loadAll(): Promise<StoredRecord[]>;
  /** Upsert (inkl. Soft-Deletes) */
  save(records: StoredRecord[]): Promise<void>;
  /** Datensätze für den Upload vormerken (Outbox) */
  markDirty(keys: RecordKey[]): Promise<void>;
  /** Alle Nutzerdaten löschen (z. B. nach Abmelden) */
  clear(): Promise<void>;
}

type Table<C extends CollectionName> = Record<string, StoredRecord<C>>;
type Tables = { [C in CollectionName]: Table<C> };

interface DataState {
  ready: boolean;
  tables: Tables;
  /** letzter Fehler beim lokalen Speichern (z. B. Speicher voll / privater Modus) */
  persistError: string | null;
}

const emptyTables = (): Tables =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as unknown as Tables;

export const useDataStore = create<DataState>(() => ({ ready: false, tables: emptyTables(), persistError: null }));

// ───────────────────────── Konfiguration ─────────────────────────
const memoryPersistence: Persistence = {
  loadAll: async () => [],
  save: async () => {},
  markDirty: async () => {},
  clear: async () => {},
};

let persistence: Persistence = memoryPersistence;
type ChangeListener = (keys: RecordKey[]) => void;
const listeners = new Set<ChangeListener>();

export function setPersistence(p: Persistence) { persistence = p; }
/** Sync-Engine abonniert lokale Änderungen (wird nach dem Schreiben aufgerufen). */
export function onLocalChange(fn: ChangeListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function hydrate(): Promise<void> {
  const all = await persistence.loadAll();
  const tables = emptyTables();
  for (const r of all) {
    if (!(r.collection in tables)) continue;
    (tables[r.collection] as Record<string, StoredRecord>)[r.id] = r;
  }
  useDataStore.setState({ tables, ready: true });
}

// ───────────────────────── Hilfsfunktionen ─────────────────────────
export const nowIso = () => new Date().toISOString();

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Zeitstempel, der garantiert neuer ist als `prev` (Schutz vor Uhr-Rücksprüngen). */
function nextStamp(prev?: string): string {
  const n = nowIso();
  if (!prev || n > prev) return n;
  return new Date(new Date(prev).getTime() + 1).toISOString();
}

export const isEventCollection = (c: CollectionName) => EVENT_COLLECTIONS.includes(c);

let pendingSave: StoredRecord[] = [];
let pendingDirty: RecordKey[] = [];
let flushScheduled = false;
/** Laufende Schreibvorgänge (für flushLocalWrites). */
const persisting = new Set<Promise<void>>();

function schedulePersist(records: StoredRecord[]) {
  pendingSave.push(...records);
  pendingDirty.push(...records.filter((r) => !r.localOnly).map((r) => ({ collection: r.collection, id: r.id })));
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    const p = persistPending();
    persisting.add(p);
    void p.finally(() => persisting.delete(p));
  });
}

async function persistPending(): Promise<void> {
  const save = pendingSave; const dirty = pendingDirty;
  pendingSave = []; pendingDirty = []; flushScheduled = false;
  try {
    await persistence.save(save);
    if (dirty.length) await persistence.markDirty(dirty);
    if (useDataStore.getState().persistError) useDataStore.setState({ persistError: null });
    if (dirty.length) listeners.forEach((fn) => fn(dirty));
  } catch (e) {
    console.error('[store] Speichern fehlgeschlagen', e);
    useDataStore.setState({ persistError: 'Lokales Speichern fehlgeschlagen. Ist der Gerätespeicher voll oder der private Modus aktiv?' });
  }
}

/**
 * Wartet, bis alle ausstehenden lokalen Schreibvorgänge abgeschlossen (IndexedDB-Transaktion
 * committed) sind – z. B. vor einem Neuladen nach App-Update, vor Export oder Kontowechsel.
 */
export async function flushLocalWrites(): Promise<void> {
  // Erst den Microtask aus schedulePersist laufen lassen – danach ist alles in `persisting`.
  await new Promise<void>((r) => queueMicrotask(() => r()));
  for (let i = 0; i < 50 && persisting.size; i++) {
    await Promise.allSettled([...persisting]);
    await new Promise<void>((r) => queueMicrotask(() => r()));
  }
  await new Promise<void>((r) => setTimeout(r, 0));
}

function writeRecords(records: StoredRecord[]) {
  if (!records.length) return;
  useDataStore.setState((s) => {
    const tables = { ...s.tables } as Tables;
    for (const r of records) {
      const t = { ...(tables[r.collection] as Record<string, StoredRecord>) };
      t[r.id] = r;
      (tables as Record<CollectionName, Record<string, StoredRecord>>)[r.collection] = t;
    }
    return { tables };
  });
  schedulePersist(records);
}

// ───────────────────────── Lesen (imperativ) ─────────────────────────
export function getRecord<C extends CollectionName>(c: C, id: string): CollectionData[C] | undefined {
  const r = useDataStore.getState().tables[c][id] as StoredRecord<C> | undefined;
  return r && !r.deleted ? r.data : undefined;
}

export function listRecords<C extends CollectionName>(c: C): { id: string; data: CollectionData[C] }[] {
  const t = useDataStore.getState().tables[c] as Table<C>;
  return Object.values(t).filter((r) => !r.deleted).map((r) => ({ id: r.id, data: r.data }));
}

// ───────────────────────── Schreiben ─────────────────────────
export function putRecord<C extends CollectionName>(c: C, id: string, data: CollectionData[C], opts: { localOnly?: boolean } = {}) {
  const prev = useDataStore.getState().tables[c][id] as StoredRecord<C> | undefined;
  const rec: StoredRecord<C> = { collection: c, id, data, updatedAt: nextStamp(prev?.updatedAt) };
  const localOnly = opts.localOnly ?? prev?.localOnly;
  if (localOnly) rec.localOnly = true;
  writeRecords([rec as StoredRecord]);
}

/** Teilaktualisierung; legt den Datensatz mit `init` an, falls er fehlt. */
export function patchRecord<C extends CollectionName>(
  c: C, id: string, patch: Partial<CollectionData[C]> | ((prev: CollectionData[C] | undefined) => CollectionData[C]),
  init?: CollectionData[C],
) {
  const prev = getRecord(c, id);
  let next: CollectionData[C];
  if (typeof patch === 'function') next = patch(prev);
  else {
    const base = prev ?? init;
    if (!base) throw new Error(`patchRecord: ${c}/${id} existiert nicht und kein init angegeben`);
    next = { ...base, ...patch };
  }
  putRecord(c, id, next);
}

export function removeRecord(c: CollectionName, id: string) {
  const prev = useDataStore.getState().tables[c][id];
  if (!prev || prev.deleted) return;
  writeRecords([{ ...prev, deleted: true, updatedAt: nextStamp(prev.updatedAt) }]);
}

/**
 * Ereignis anhängen. Eine deterministische `id` macht den Vorgang idempotent
 * (z. B. `mission:2026-09-21:daily-3` → Belohnung kann nie doppelt vergeben werden).
 * Gibt false zurück, wenn die id bereits existierte.
 */
export function appendEvent<C extends CollectionName>(c: C, data: CollectionData[C], id: string = uid()): boolean {
  if (!isEventCollection(c)) throw new Error(`appendEvent: ${c} ist keine Event-Sammlung`);
  if (useDataStore.getState().tables[c][id]) return false;
  writeRecords([{ collection: c, id, data, updatedAt: nowIso() } as StoredRecord]);
  return true;
}

// ───────────────────────── Sync-Schnittstelle ─────────────────────────
type Merger = (local: StoredRecord, remote: StoredRecord) => StoredRecord;
const mergers: Partial<Record<CollectionName, Merger>> = {};

/** Feature-Module können für mutable Sammlungen eine feldweise Merge-Regel registrieren. */
export function registerMerger(c: CollectionName, fn: Merger) { mergers[c] = fn; }

/**
 * Übernimmt Datensätze aus der Cloud. Standard: Last-Write-Wins nach updatedAt.
 * `dirtyIds`: lokal noch nicht hochgeladene Datensätze – diese gewinnen, außer die
 * Remote-Version ist neuer (dann greift ggf. die Merge-Funktion).
 * Gibt die Schlüssel zurück, die lokal geändert wurden und erneut hochgeladen werden müssen
 * (Ergebnis einer feldweisen Zusammenführung).
 */
export function applyRemote(records: StoredRecord[]): RecordKey[] {
  const tables = useDataStore.getState().tables;
  const accepted: StoredRecord[] = [];
  const reupload: RecordKey[] = [];
  for (const remote of records) {
    if (!(remote.collection in tables)) continue;
    const local = (tables[remote.collection] as Record<string, StoredRecord>)[remote.id];
    if (!local) { accepted.push(remote); continue; }
    if (local.updatedAt === remote.updatedAt) continue;
    const merger = mergers[remote.collection];
    if (merger && !local.deleted && !remote.deleted) {
      const merged = merger(local, remote);
      const newer = remote.updatedAt > local.updatedAt ? remote.updatedAt : local.updatedAt;
      const stamped = { ...merged, updatedAt: newer };
      accepted.push(stamped);
      if (JSON.stringify(stamped.data) !== JSON.stringify(remote.data)) {
        stamped.updatedAt = nextStamp(newer);
        reupload.push({ collection: remote.collection, id: remote.id });
      }
      continue;
    }
    // Eine nur-lokale Markierung (eigene Songtexte) geht durch einen Cloud-Stand nie verloren.
    if (remote.updatedAt > local.updatedAt) accepted.push(local.localOnly ? { ...remote, localOnly: true } : remote);
  }
  if (accepted.length) {
    useDataStore.setState((s) => {
      const t = { ...s.tables } as Tables;
      for (const r of accepted) {
        const tab = { ...(t[r.collection] as Record<string, StoredRecord>) };
        tab[r.id] = r;
        (t as Record<CollectionName, Record<string, StoredRecord>>)[r.collection] = tab;
      }
      return { tables: t };
    });
    void persistence.save(accepted)
      .then(() => (reupload.length ? persistence.markDirty(reupload) : undefined))
      .catch((e) => {
        console.error('[store] Speichern der Cloud-Daten fehlgeschlagen', e);
        useDataStore.setState({ persistError: 'Lokales Speichern fehlgeschlagen. Ist der Gerätespeicher voll oder der private Modus aktiv?' });
      });
  }
  return reupload;
}

/** Alle lokalen Datensätze (z. B. für Gast→Konto-Übernahme oder Export). */
export function allRecords(): StoredRecord[] {
  const t = useDataStore.getState().tables;
  return COLLECTIONS.flatMap((c) => Object.values(t[c] as Record<string, StoredRecord>));
}

/** Setzt den Speicher zurück (Abmelden / Kontowechsel). */
export async function resetStore(): Promise<void> {
  await persistence.clear();
  useDataStore.setState({ tables: emptyTables(), ready: true });
}

// ───────────────────────── React-Hooks ─────────────────────────
export function useRecord<C extends CollectionName>(c: C, id: string): CollectionData[C] | undefined {
  const r = useDataStore((s) => s.tables[c][id]) as StoredRecord<C> | undefined;
  return r && !r.deleted ? r.data : undefined;
}

/** Stabile Liste (neue Referenz nur bei Änderung der Sammlung). */
export function useList<C extends CollectionName>(c: C): { id: string; data: CollectionData[C] }[] {
  const table = useDataStore((s) => s.tables[c]) as Table<C>;
  return useMemo(
    () => Object.values(table).filter((r) => !r.deleted).map((r) => ({ id: r.id, data: r.data })),
    [table],
  );
}

export const useDataReady = () => useDataStore((s) => s.ready);
export const usePersistError = () => useDataStore((s) => s.persistError);
