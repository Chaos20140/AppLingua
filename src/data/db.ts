/**
 * Lokale Datenbank (IndexedDB über 'idb').
 *
 * DB 'applingua' mit den Stores
 * - records     Datensätze aller Sammlungen, Schlüssel [collection, id]
 * - outbox      zum Hochladen vorgemerkte Schlüssel (+ Sequenznummer gegen Wettläufe)
 * - meta        Schlüssel/Wert (Besitzer des Geräts, Sync-Cursor, Sicherungen …)
 * - recordings  Sprachaufnahmen – nur mit ausdrücklicher Einwilligung, nie in der Cloud
 *
 * Ist IndexedDB nicht nutzbar (z. B. manche privaten Fenster), läuft alles im Arbeitsspeicher
 * weiter und `persistError` erklärt ehrlich, dass Fortschritte beim Schließen verloren gehen.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CollectionName, CourseId, StoredRecord } from '../core/types';
import { listRecords, useDataStore, type Persistence, type RecordKey } from './store';

export const DB_NAME = 'applingua';
const DB_VERSION = 1;
/** Meta-Schlüssel mit diesem Präfix überstehen `persistence.clear()` (Sicherungen fremder Konten). */
export const BACKUP_PREFIX = 'backup:';

export const STORAGE_UNAVAILABLE_MESSAGE =
  'Dieser Browser erlaubt hier keinen dauerhaften Speicher (z. B. im privaten Fenster). ' +
  'Du kannst weiterlernen, aber deine Fortschritte gehen beim Schließen verloren.';

export interface OutboxEntry { collection: CollectionName; id: string; seq: number }

export interface Recording {
  id: string;
  itemId: string;
  courseId: CourseId;
  mimeType: string;
  createdAt: string;
  durationMs?: number;
  blob: Blob;
}

interface StoredRecording extends Omit<Recording, 'blob'> { audio: ArrayBuffer }

interface AppSchema extends DBSchema {
  records: { key: [string, string]; value: StoredRecord };
  outbox: { key: [string, string]; value: OutboxEntry };
  meta: { key: string; value: unknown };
  recordings: { key: string; value: StoredRecording; indexes: { byItem: string } };
}

export interface LocalDb {
  /** false → Fallback im Arbeitsspeicher (nichts überlebt einen Neustart) */
  readonly persistent: boolean;
  readonly name: string;
  /** Für store.setPersistence() */
  readonly persistence: Persistence;
  getOutbox(): Promise<OutboxEntry[]>;
  /** Entfernt Einträge nur, wenn sie seit dem Lesen nicht erneut vorgemerkt wurden. */
  ackOutbox(entries: OutboxEntry[]): Promise<void>;
  dropOutbox(keys: RecordKey[]): Promise<void>;
  markDirty(keys: RecordKey[]): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  deleteMeta(key: string): Promise<void>;
  metaKeys(): Promise<string[]>;
  putRecording(r: StoredRecording): Promise<void>;
  recordingsFor(itemId?: string): Promise<StoredRecording[]>;
  deleteRecording(id: string): Promise<void>;
  clearRecordings(): Promise<void>;
  /** Löscht wirklich alles inkl. Sicherungen (DSGVO „Daten auf diesem Gerät löschen“). */
  wipe(): Promise<void>;
  /** Wartet, bis alle laufenden Schreibvorgänge abgeschlossen sind. */
  settle(): Promise<void>;
  close(): void;
}

// ───────────────────────── Hilfen ─────────────────────────
let lastSeq = 0;
function nextSeq(): number {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
}
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

class InflightTracker {
  private set = new Set<Promise<unknown>>();
  track<T>(p: Promise<T>): Promise<T> {
    this.set.add(p);
    const done = () => { this.set.delete(p); };
    p.then(done, done);
    return p;
  }
  async settle(): Promise<void> {
    // Der Store startet Schreibvorgänge in einem Microtask – erst danach ist alles registriert.
    await tick();
    for (let i = 0; i < 50 && this.set.size; i++) {
      await Promise.allSettled([...this.set]);
      await tick();
    }
  }
}

function isConnectionLost(e: unknown): boolean {
  const name = (e as { name?: string })?.name ?? '';
  const msg = String((e as { message?: string })?.message ?? '');
  return name === 'InvalidStateError' || name === 'UnknownError' || /connection.*(lost|closed)|database.*clos/i.test(msg);
}

// ───────────────────────── IndexedDB ─────────────────────────
/**
 * Transaktion sofort committen statt erst nach dem aktuellen Task: verkleinert das Fenster, in dem
 * Neuladen/Schließen direkt nach einer Aktion (z. B. Lektionsabschluss) den Schreibvorgang verliert.
 * `commit()` fehlt in alten Browsern (Safari < 15) → dann wie bisher automatisch.
 */
function commitNow(tx: { commit?: () => void }) {
  try { tx.commit?.(); } catch { /* bereits beendet → nichts zu tun */ }
}

class IdbLocalDb implements LocalDb {
  readonly persistent = true;
  readonly persistence: Persistence;
  private dbp: Promise<IDBPDatabase<AppSchema>> | null = null;
  private inflight = new InflightTracker();

  constructor(readonly name: string, first: IDBPDatabase<AppSchema>) {
    this.dbp = Promise.resolve(first);
    this.watch(first);
    const self = this;
    this.persistence = {
      loadAll: () => self.run((db) => db.getAll('records')),
      save: (records) => self.inflight.track(self.run(async (db) => {
        if (!records.length) return;
        const tx = db.transaction('records', 'readwrite');
        for (const r of records) void tx.store.put(r);
        commitNow(tx);
        await tx.done;
      })),
      markDirty: (keys) => self.markDirty(keys),
      clear: () => self.inflight.track(self.clearAll(true)),
    };
  }

  private watch(db: IDBPDatabase<AppSchema>) {
    // Safari beendet Verbindungen gelegentlich im Hintergrund → beim nächsten Zugriff neu öffnen.
    db.addEventListener('close', () => { this.dbp = null; });
  }

  private conn(): Promise<IDBPDatabase<AppSchema>> {
    if (!this.dbp) {
      this.dbp = openAppIdb(this.name, () => { this.dbp = null; }).then((db) => { this.watch(db); return db; });
      this.dbp.catch(() => { this.dbp = null; });
    }
    return this.dbp;
  }

  private async run<T>(fn: (db: IDBPDatabase<AppSchema>) => Promise<T>): Promise<T> {
    try {
      return await fn(await this.conn());
    } catch (e) {
      if (!isConnectionLost(e)) throw e;
      this.dbp = null;
      return fn(await this.conn());
    }
  }

  markDirty(keys: RecordKey[]): Promise<void> {
    return this.inflight.track(this.run(async (db) => {
      if (!keys.length) return;
      const tx = db.transaction('outbox', 'readwrite');
      for (const k of keys) void tx.store.put({ collection: k.collection, id: k.id, seq: nextSeq() });
      commitNow(tx);
      await tx.done;
    }));
  }

  getOutbox() { return this.run((db) => db.getAll('outbox')); }

  ackOutbox(entries: OutboxEntry[]): Promise<void> {
    return this.inflight.track(this.run(async (db) => {
      if (!entries.length) return;
      const tx = db.transaction('outbox', 'readwrite');
      await Promise.all(entries.map(async (e) => {
        const cur = await tx.store.get([e.collection, e.id]);
        if (cur && cur.seq === e.seq) await tx.store.delete([e.collection, e.id]);
      }));
      await tx.done;
    }));
  }

  dropOutbox(keys: RecordKey[]): Promise<void> {
    return this.inflight.track(this.run(async (db) => {
      if (!keys.length) return;
      const tx = db.transaction('outbox', 'readwrite');
      for (const k of keys) void tx.store.delete([k.collection, k.id]);
      await tx.done;
    }));
  }

  getMeta<T>(key: string) { return this.run(async (db) => (await db.get('meta', key)) as T | undefined); }
  setMeta(key: string, value: unknown) { return this.inflight.track(this.run(async (db) => { await db.put('meta', value, key); })); }
  deleteMeta(key: string) { return this.inflight.track(this.run((db) => db.delete('meta', key))); }
  metaKeys() { return this.run(async (db) => (await db.getAllKeys('meta')).map(String)); }

  putRecording(r: StoredRecording) { return this.inflight.track(this.run(async (db) => { await db.put('recordings', r); })); }
  recordingsFor(itemId?: string) {
    return this.run((db) => (itemId ? db.getAllFromIndex('recordings', 'byItem', itemId) : db.getAll('recordings')));
  }
  deleteRecording(id: string) { return this.inflight.track(this.run((db) => db.delete('recordings', id))); }
  clearRecordings() { return this.inflight.track(this.run((db) => db.clear('recordings'))); }

  private async clearAll(keepBackups: boolean): Promise<void> {
    await this.run(async (db) => {
      const tx = db.transaction(['records', 'outbox', 'meta', 'recordings'], 'readwrite');
      void tx.objectStore('records').clear();
      void tx.objectStore('outbox').clear();
      void tx.objectStore('recordings').clear();
      const meta = tx.objectStore('meta');
      const keys = await meta.getAllKeys();
      for (const k of keys) if (!keepBackups || !String(k).startsWith(BACKUP_PREFIX)) void meta.delete(k);
      await tx.done;
    });
  }

  wipe() { return this.inflight.track(this.clearAll(false)); }
  settle() { return this.inflight.settle(); }
  close() { void this.dbp?.then((db) => db.close()); this.dbp = null; }
}

function openAppIdb(name: string, onLost: () => void): Promise<IDBPDatabase<AppSchema>> {
  let db: IDBPDatabase<AppSchema> | undefined;
  const p = openDB<AppSchema>(name, DB_VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains('records')) d.createObjectStore('records', { keyPath: ['collection', 'id'] });
      if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { keyPath: ['collection', 'id'] });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
      if (!d.objectStoreNames.contains('recordings')) {
        d.createObjectStore('recordings', { keyPath: 'id' }).createIndex('byItem', 'itemId');
      }
    },
    // Ein anderer Tab möchte eine neuere Version öffnen → Verbindung freigeben.
    blocking() { db?.close(); onLost(); },
    terminated() { onLost(); },
  });
  return p.then((d) => { db = d; return d; });
}

// ───────────────────────── Fallback im Arbeitsspeicher ─────────────────────────
class MemoryLocalDb implements LocalDb {
  readonly persistent = false;
  readonly persistence: Persistence;
  private records = new Map<string, StoredRecord>();
  private outbox = new Map<string, OutboxEntry>();
  private meta = new Map<string, unknown>();
  private recs = new Map<string, StoredRecording>();

  constructor(readonly name: string) {
    this.persistence = {
      loadAll: async () => [...this.records.values()].map((r) => structuredClone(r)),
      save: async (records) => { for (const r of records) this.records.set(k(r), structuredClone(r)); },
      markDirty: (keys) => this.markDirty(keys),
      clear: async () => this.clearAll(true),
    };
  }

  async markDirty(keys: RecordKey[]) { for (const key of keys) this.outbox.set(k(key), { ...key, seq: nextSeq() }); }
  async getOutbox() { return [...this.outbox.values()].map((e) => ({ ...e })); }
  async ackOutbox(entries: OutboxEntry[]) {
    for (const e of entries) if (this.outbox.get(k(e))?.seq === e.seq) this.outbox.delete(k(e));
  }
  async dropOutbox(keys: RecordKey[]) { for (const key of keys) this.outbox.delete(k(key)); }
  async getMeta<T>(key: string) { return structuredClone(this.meta.get(key)) as T | undefined; }
  async setMeta(key: string, value: unknown) { this.meta.set(key, structuredClone(value)); }
  async deleteMeta(key: string) { this.meta.delete(key); }
  async metaKeys() { return [...this.meta.keys()]; }
  async putRecording(r: StoredRecording) { this.recs.set(r.id, r); }
  async recordingsFor(itemId?: string) { return [...this.recs.values()].filter((r) => !itemId || r.itemId === itemId); }
  async deleteRecording(id: string) { this.recs.delete(id); }
  async clearRecordings() { this.recs.clear(); }
  private clearAll(keepBackups: boolean) {
    this.records.clear(); this.outbox.clear(); this.recs.clear();
    for (const key of [...this.meta.keys()]) if (!keepBackups || !key.startsWith(BACKUP_PREFIX)) this.meta.delete(key);
  }
  async wipe() { this.clearAll(false); }
  async settle() { await tick(); }
  close() { /* nichts */ }
}

const k = (r: { collection: string; id: string }) => `${r.collection}\u0000${r.id}`;

// ───────────────────────── Öffnen & Singleton ─────────────────────────
let current: LocalDb | null = null;
let fallbackGuard: (() => void) | null = null;

/** Aktuelle lokale Datenbank (nach bootstrapData / openAppDb). */
export function getLocalDb(): LocalDb | null { return current; }

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('IndexedDB antwortet nicht')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Öffnet die lokale Datenbank. Schlägt IndexedDB fehl, wird ein Arbeitsspeicher-Fallback
 * verwendet und `persistError` dauerhaft gesetzt.
 */
export async function openAppDb(name: string = DB_NAME): Promise<LocalDb> {
  fallbackGuard?.();
  fallbackGuard = null;
  let db: LocalDb;
  try {
    if (typeof indexedDB === 'undefined' || !indexedDB) throw new Error('IndexedDB fehlt');
    const idb = await withTimeout(openAppIdb(name, () => {}), 8000);
    db = new IdbLocalDb(name, idb);
  } catch (e) {
    console.warn('[db] IndexedDB nicht verfügbar – Fallback im Arbeitsspeicher', e);
    db = new MemoryLocalDb(name);
    const assert = () => {
      if (useDataStore.getState().persistError !== STORAGE_UNAVAILABLE_MESSAGE) {
        useDataStore.setState({ persistError: STORAGE_UNAVAILABLE_MESSAGE });
      }
    };
    assert();
    // Der Store löscht persistError nach jedem erfolgreichen Speichern – hier bleibt die Meldung bestehen.
    fallbackGuard = useDataStore.subscribe((s) => { if (!s.persistError) assert(); });
  }
  current?.close();
  current = db;
  return db;
}

// ───────────────────────── Sprachaufnahmen (nur mit Einwilligung) ─────────────────────────
const MAX_RECORDINGS_PER_ITEM = 3;

export function hasRecordingConsent(): boolean {
  return listRecords('settings').some((s) => s.data.storeRecordings === true);
}

export const RECORDING_CONSENT_MESSAGE =
  'Aufnahmen werden nur gespeichert, wenn du in den Einstellungen „Sprachaufnahmen speichern“ aktivierst. ' +
  'Sie bleiben ausschließlich auf diesem Gerät.';

function requireDb(): LocalDb {
  if (!current) throw new Error('Lokale Datenbank ist noch nicht geöffnet.');
  return current;
}

/** Speichert eine Aufnahme lokal (höchstens 3 je Übungselement). Wirft ohne Einwilligung. */
export async function saveRecording(input: { itemId: string; courseId: CourseId; blob: Blob; durationMs?: number }): Promise<string> {
  if (!hasRecordingConsent()) throw new Error(RECORDING_CONSENT_MESSAGE);
  const db = requireDb();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `rec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.putRecording({
    id, itemId: input.itemId, courseId: input.courseId, durationMs: input.durationMs,
    mimeType: input.blob.type || 'audio/mp4', createdAt: new Date().toISOString(),
    // ArrayBuffer statt Blob: in älteren Safari-Versionen zuverlässiger in IndexedDB.
    audio: await input.blob.arrayBuffer(),
  });
  const all = (await db.recordingsFor(input.itemId)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  for (const old of all.slice(MAX_RECORDINGS_PER_ITEM)) await db.deleteRecording(old.id);
  return id;
}

/** Aufnahmen (neueste zuerst). Objekt-URLs erzeugt und freigibt der Aufrufer. */
export async function listRecordings(itemId?: string): Promise<Recording[]> {
  if (!current) return [];
  const all = await current.recordingsFor(itemId);
  return all
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(({ audio, ...rest }) => ({ ...rest, blob: new Blob([audio], { type: rest.mimeType }) }));
}

export async function deleteRecording(id: string): Promise<void> { await current?.deleteRecording(id); }

/** Alle Aufnahmen löschen (z. B. wenn die Einwilligung widerrufen wird). */
export async function deleteAllRecordings(): Promise<void> { await current?.clearRecordings(); }
