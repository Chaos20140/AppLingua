/**
 * Sync-Engine (lokal-first).
 *
 * Ablauf je Durchgang: lokale Schreibvorgänge abwarten → Änderungen seit Cursor holen
 * (5 s Überlappung, Seiten à 1000) und per applyRemote zusammenführen → eigene Songtexte
 * abgleichen → Outbox hochladen (Batch-Upsert, inkl. Merge-Ergebnisse).
 *
 * Auslöser: Start, lokale Änderung (entprellt 1,5 s), online, Sichtbarkeit/Fokus, alle 60 s
 * (nur sichtbar). Fehler → exponentielles Backoff. Ohne Cloud-Konfiguration oder ohne
 * Anmeldung passiert nichts – der Status sagt das ehrlich („local-only“).
 */
import { create } from 'zustand';
import type { CollectionName, StoredRecord, SyncStatus } from '../../core/types';
import { cloudErrorKind, type CloudAdapter } from '../cloud/adapter';
import { supabaseCloudAdapter } from '../cloud/lazySupabase';
import { getLocalDb, type LocalDb, type OutboxEntry } from '../db';
import { cloudErrorMessage } from '../auth/errors';
import {
  applyRemote, flushLocalWrites, listRecords, onLocalChange, putRecord, useDataStore, type RecordKey,
} from '../store';
import { registerSyncMergers } from './mergers';

export const PUSH_BATCH = 200;
export const PULL_PAGE = 1000;
export const OVERLAP_MS = 5000;
const DEBOUNCE_MS = 1500;
const INTERVAL_MS = 60_000;
const FOCUS_THROTTLE_MS = 5000;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_MAX_MS = 5 * 60_000;
/**
 * Datensätze darüber (UTF-8-Bytes des JSON) bleiben lokal. Die Datenbank erlaubt 512 KiB je Eintrag
 * (gemessen als jsonb-Text, der durch Leerzeichen etwas länger ist) – so lehnt der Server nie einen
 * ganzen Batch wegen eines einzelnen Eintrags ab.
 */
const MAX_RECORD_BYTES = 200_000;
/** Längste in user_records erlaubte ID (check char_length(id) between 1 and 200). */
const MAX_ID_CHARS = 200;
/** Obergrenze je Upload-Anfrage (neben PUSH_BATCH), damit große Batches nicht am Gateway scheitern. */
const MAX_BATCH_BYTES = 1_000_000;

// ───────────────────────── Status (zustand) ─────────────────────────
interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt?: string;
  /** Hinweis ohne Fehlerstatus (z. B. zu großer Eintrag bleibt lokal) */
  warning: string | null;
}

let adapter: CloudAdapter | null = supabaseCloudAdapter;
let localOverride: LocalDb | null = null;
let userId: string | null = null;
let generation = 0;
let running: Promise<void> | null = null;
let rerun = false;
let lastError: unknown = null;
let failures = 0;
let lastRunAt = 0;
let started = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let intervalTimer: ReturnType<typeof setInterval> | null = null;
let teardown: (() => void)[] = [];

const initialStatus = (): SyncStatus =>
  adapter ? { state: 'local-only', reason: 'guest' } : { state: 'local-only', reason: 'not-configured' };

export const useSyncStore = create<SyncState>(() => ({ status: initialStatus(), pendingCount: 0, warning: null }));

/** Aktueller Sync-Status für die UI. */
export const useSyncStatus = (): SyncStatus => useSyncStore((s) => s.status);
/** Anzahl lokaler Änderungen, die noch nicht in der Cloud sind. */
export const usePendingCount = (): number => useSyncStore((s) => s.pendingCount);
export const useSyncWarning = (): string | null => useSyncStore((s) => s.warning);
export const getSyncStatus = (): SyncStatus => useSyncStore.getState().status;

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const isNetworkError = (e: unknown) => cloudErrorKind(e) === 'network' || e instanceof TypeError;

function computeStatus(isRunning: boolean): SyncStatus {
  if (!adapter) return { state: 'local-only', reason: 'not-configured' };
  if (!userId) return { state: 'local-only', reason: 'guest' };
  if (isRunning) return { state: 'syncing' };
  const { pendingCount: count, lastSyncedAt } = useSyncStore.getState();
  if (lastError) {
    if (isNetworkError(lastError) || isOffline()) return count ? { state: 'pending', count, offline: true } : { state: 'idle', lastSyncedAt };
    const kind = cloudErrorKind(lastError) ?? 'unknown';
    return { state: 'error', message: cloudErrorMessage(kind), count };
  }
  if (count > 0) return { state: 'pending', count, offline: isOffline() };
  return { state: 'idle', lastSyncedAt };
}

function refreshStatus() {
  useSyncStore.setState({ status: computeStatus(running !== null) });
}

// ───────────────────────── Konfiguration ─────────────────────────
/** Austausch von Cloud-Adapter/lokaler DB (Tests, anderer Anbieter). */
export function configureSync(opts: { adapter?: CloudAdapter | null; local?: LocalDb | null }) {
  if (opts.adapter !== undefined) adapter = opts.adapter;
  if (opts.local !== undefined) localOverride = opts.local;
  refreshStatus();
}

const db = (): LocalDb | null => localOverride ?? getLocalDb();

export const getSyncUser = () => userId;

/** Wird von bootstrap/auth gesetzt; null = Gastmodus bzw. Entscheidung über Gastdaten offen. */
export function setSyncUser(id: string | null) {
  if (id === userId) return;
  generation++;
  userId = id;
  lastError = null;
  failures = 0;
  clearTimer('retry');
  refreshStatus();
  void refreshPending();
  if (id) void syncNow();
}

// ───────────────────────── Eigene Songtexte ─────────────────────────
/** Präfix der Song-IDs eigener Texte (siehe src/features/songs/userText.ts). */
const USER_SONG_PREFIX = 'user.';
/** Sammlungen, die Text aus Songs zitieren (Notizen, markierte Wörter, KI-Erklärungen). */
const USER_TEXT_DERIVED: readonly CollectionName[] = ['songNotes', 'songMarkedWords', 'songExplanations'];
/**
 * Sammlungen, deren Einträge über ein Datenfeld auf einen Song verweisen und dabei Text daraus
 * enthalten (Song-Übungen: Aufgabe/Antwort in Fehlerarchiv und Antworten, Zielzeile beim Mitsingen).
 * Bei eigenen Texten gelten sie ebenfalls als privat.
 */
const USER_TEXT_REF_FIELD: Partial<Record<CollectionName, 'refId' | 'itemId'>> = {
  answers: 'refId', errorEntries: 'refId', pronAttempts: 'itemId',
};
const PRIVATE_COLLECTIONS: readonly CollectionName[] = [
  'songUserTexts', ...USER_TEXT_DERIVED, ...(Object.keys(USER_TEXT_REF_FIELD) as CollectionName[]),
];

/**
 * Enthält der Datensatz Inhalte eines eigenen Songtexts? Solche Datensätze gehen nur mit
 * aktivierter „Eigene Texte synchronisieren“-Einstellung in die Cloud. (IDs der abgeleiteten
 * Sammlungen beginnen mit der Song-ID – so werden auch Tombstones ohne Inhalt erkannt.)
 */
export function isPrivateSongRecord(rec: { collection: CollectionName; id: string; data?: unknown }): boolean {
  if (rec.collection === 'songUserTexts') return true;
  const refField = USER_TEXT_REF_FIELD[rec.collection];
  if (refField) {
    const ref = (rec.data as Record<string, unknown> | null | undefined)?.[refField];
    return typeof ref === 'string' && ref.startsWith(USER_SONG_PREFIX);
  }
  if (!USER_TEXT_DERIVED.includes(rec.collection)) return false;
  const songId = (rec.data as { songId?: unknown } | null | undefined)?.songId;
  return rec.id.startsWith(USER_SONG_PREFIX) || (typeof songId === 'string' && songId.startsWith(USER_SONG_PREFIX));
}

export function userTextsSyncEnabled(): boolean {
  return listRecords('settings').some((s) => s.data.songs?.syncUserTexts === true);
}

/**
 * Setzt localOnly-Markierungen der eigenen Songtexte (inkl. Notizen, Markierungen und Erklärungen
 * dazu) passend zur Einstellung und entfernt sie aus der Cloud, sobald die Synchronisierung aus ist.
 * `cloudHasPrivate`: der Pull hat solche Inhalte geliefert, obwohl die Synchronisierung aus ist
 * (z. B. verlorene Lösch-Vormerkung, Upload eines Geräts mit altem Stand) → ebenfalls bereinigen.
 */
async function reconcileUserTexts(local: LocalDb, uid: string | null, cloudHasPrivate = false) {
  const enabled = userTextsSyncEnabled();
  const tables = useDataStore.getState().tables;
  for (const c of PRIVATE_COLLECTIONS) {
    for (const rec of Object.values(tables[c] as Record<string, StoredRecord>)) {
      if (rec.deleted || !isPrivateSongRecord(rec)) continue;
      if (enabled && rec.localOnly) putRecord(c, rec.id, rec.data as never, { localOnly: false });
      else if (!enabled && !rec.localOnly) putRecord(c, rec.id, rec.data as never, { localOnly: true });
    }
  }
  const prev = await local.getMeta<boolean>('userTextsSync');
  if (prev !== enabled) await local.setMeta('userTextsSync', enabled);
  if (uid && !enabled && (prev === true || cloudHasPrivate)) await local.setMeta(`purgeUserTexts:${uid}`, true);
  if (uid && adapter && (await local.getMeta<boolean>(`purgeUserTexts:${uid}`))) {
    await adapter.purgeCollection(uid, 'songUserTexts');
    for (const c of USER_TEXT_DERIVED) await adapter.purgeCollection(uid, c, USER_SONG_PREFIX);
    for (const [c, field] of Object.entries(USER_TEXT_REF_FIELD)) {
      await adapter.purgeCollection(uid, c as CollectionName, USER_SONG_PREFIX, field);
    }
    await local.deleteMeta(`purgeUserTexts:${uid}`);
  }
}

/**
 * Eigene Songtexte im Konto synchronisieren (true) oder nur auf diesem Gerät behalten (false).
 * Aktualisiert settings.songs.syncUserTexts, markiert die Texte und bereinigt ggf. die Cloud.
 */
export async function setUserTextsSync(enabled: boolean): Promise<void> {
  for (const s of listRecords('settings')) {
    if (s.data.songs?.syncUserTexts === enabled) continue;
    putRecord('settings', s.id, { ...s.data, songs: { ...s.data.songs, syncUserTexts: enabled } });
  }
  const local = db();
  if (!local) return;
  await flushLocalWrites();
  await local.settle();
  if (userId && adapter) await syncNow();
  else await reconcileUserTexts(local, null);
}

// ───────────────────────── Push / Pull ─────────────────────────
class SyncAborted extends Error {}

function syncable(rec: StoredRecord | undefined, textsEnabled: boolean): rec is StoredRecord {
  if (!rec || rec.localOnly) return false;
  if (!textsEnabled && isPrivateSongRecord(rec)) return false;
  return true;
}

function lookup(e: RecordKey): StoredRecord | undefined {
  const t = useDataStore.getState().tables[e.collection as CollectionName] as Record<string, StoredRecord> | undefined;
  return t?.[e.id];
}

async function push(uid: string, local: LocalDb, gen: number, cloud: CloudAdapter) {
  const entries = await local.getOutbox();
  if (!entries.length) return;
  const texts = userTextsSyncEnabled();
  const send: { entry: OutboxEntry; rec: StoredRecord; bytes: number }[] = [];
  const skip: OutboxEntry[] = [];
  let oversized = 0;
  for (const entry of entries) {
    const rec = lookup(entry);
    if (!syncable(rec, texts)) { skip.push(entry); continue; }
    const bytes = rec.deleted ? 0 : utf8Length(JSON.stringify(rec.data));
    // Zu große Einträge (oder IDs über der Datenbankgrenze) würden den ganzen Batch scheitern lassen.
    if (bytes > MAX_RECORD_BYTES || rec.id.length > MAX_ID_CHARS) { oversized++; skip.push(entry); continue; }
    send.push({ entry, rec, bytes });
  }
  // localOnly/zu große Einträge nie hochladen – nur austragen, falls seitdem nicht neu vorgemerkt.
  if (skip.length) await local.ackOutbox(skip);
  if (oversized) useSyncStore.setState({ warning: cloudErrorMessage('payload-too-large') });
  for (let i = 0; i < send.length;) {
    if (gen !== generation) throw new SyncAborted();
    // Batch: höchstens PUSH_BATCH Einträge und MAX_BATCH_BYTES (mindestens ein Eintrag).
    let end = i + 1;
    let size = send[i].bytes;
    while (end < send.length && end - i < PUSH_BATCH && size + send[end].bytes <= MAX_BATCH_BYTES) size += send[end++].bytes;
    const chunk = send.slice(i, end);
    await cloud.push(uid, chunk.map((x) => x.rec));
    await local.ackOutbox(chunk.map((x) => x.entry));
    i = end;
  }
}

const utf8 = new TextEncoder();
/** Länge in UTF-8-Bytes (reine ASCII-Texte ohne Kodierung). */
function utf8Length(s: string): number {
  return /[\u0080-￿]/.test(s) ? utf8.encode(s).length : s.length;
}

/**
 * Holt alle Änderungen seit dem Cursor; Merge-Ergebnisse werden für den Upload vorgemerkt.
 * Liefert true, wenn dabei Inhalte eigener Songtexte waren (für reconcileUserTexts).
 */
async function pull(uid: string, local: LocalDb, gen: number, cloud: CloudAdapter): Promise<boolean> {
  const cursorKey = `cursor:${uid}`;
  let since = (await local.getMeta<string>(cursorKey)) ?? null;
  let offset = 0;
  let maxTs: string | null = null;
  let sawPrivate = false;
  for (let guard = 0; guard < 100_000; guard++) {
    const page = await cloud.pull(uid, { since, limit: PULL_PAGE, offset });
    if (gen !== generation) throw new SyncAborted();
    if (!sawPrivate) sawPrivate = page.records.some((r) => !r.deleted && isPrivateSongRecord(r));
    if (page.records.length) {
      const keys = applyRemote(page.records);
      if (keys.length) await local.markDirty(keys);
    }
    if (page.lastServerUpdatedAt) maxTs = page.lastServerUpdatedAt;
    if (page.rowCount < PULL_PAGE) break;
    // Nächste Seite ab dem letzten Zeitstempel; nur wenn eine ganze Seite denselben Zeitstempel
    // hat, wird per Offset weitergeblättert (doppelte Zeilen sind durch applyRemote harmlos).
    const next = page.lastServerUpdatedAt;
    if (next === since) offset += page.rowCount;
    else { since = next; offset = 0; }
  }
  // Erst nach dem lokalen Speichern den Cursor fortschreiben – sonst gingen Daten bei Abbruch verloren.
  await local.settle();
  // Kontowechsel währenddessen: keinen Cursor mehr für das alte Konto schreiben.
  if (gen !== generation) throw new SyncAborted();
  if (maxTs) await local.setMeta(cursorKey, new Date(Date.parse(maxTs) - OVERLAP_MS).toISOString());
  return sawPrivate;
}

async function runOnce(): Promise<void> {
  const uid = userId; const local = db(); const cloud = adapter;
  if (!uid || !local || !cloud) return;
  const gen = generation;
  lastRunAt = Date.now();
  refreshStatus();
  try {
    await flushLocalWrites();
    await local.settle();
    // Erst holen, dann hochladen: so werden lokale Stände mit dem Serverstand zusammengeführt,
    // bevor sie ihn überschreiben (sonst könnten Merge-Felder anderer Geräte verloren gehen).
    const cloudHasPrivate = await pull(uid, local, gen, cloud);
    if (gen !== generation) return;
    await reconcileUserTexts(local, uid, cloudHasPrivate);
    await flushLocalWrites();
    await local.settle();
    await push(uid, local, gen, cloud);
    if (gen !== generation) return;
    lastError = null;
    failures = 0;
    clearTimer('retry');
    useSyncStore.setState({ lastSyncedAt: new Date().toISOString() });
  } catch (e) {
    if (e instanceof SyncAborted || gen !== generation) return;
    lastError = e;
    failures++;
    if (!isNetworkError(e)) console.warn('[sync] fehlgeschlagen', e);
    scheduleRetry();
  }
}

/** Sofort synchronisieren (ohne Konto/Cloud: no-op). Laufende Durchgänge werden zusammengefasst. */
export function syncNow(): Promise<void> {
  if (!adapter || !userId || !db()) { refreshStatus(); return Promise.resolve(); }
  registerSyncMergers();
  clearTimer('debounce');
  if (running) { rerun = true; return running; }
  running = (async () => {
    try {
      do { rerun = false; await runOnce(); } while (rerun && userId);
    } finally {
      running = null;
      await refreshPending();
    }
  })();
  refreshStatus();
  return running;
}

/**
 * Versucht alles hochzuladen und liefert die Anzahl der danach noch ungesicherten Änderungen.
 * (Für das Abmelden.)
 */
export async function flushSync(): Promise<number> {
  const local = db();
  if (!local) return 0;
  await flushLocalWrites();
  await local.settle();
  await syncNow();
  return refreshPending();
}

/** Zählt vorgemerkte, hochladbare Änderungen. */
export async function refreshPending(): Promise<number> {
  const local = db();
  let count = 0;
  if (local) {
    try {
      const texts = userTextsSyncEnabled();
      count = (await local.getOutbox()).filter((e) => syncable(lookup(e), texts)).length;
    } catch { /* DB gerade nicht erreichbar */ }
  }
  useSyncStore.setState({ pendingCount: count });
  refreshStatus();
  return count;
}

// ───────────────────────── Auslöser ─────────────────────────
function clearTimer(which: 'retry' | 'debounce') {
  if (which === 'retry' && retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (which === 'debounce' && debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
}

function scheduleRetry() {
  clearTimer('retry');
  if (!started) return;
  const base = Math.min(BACKOFF_BASE_MS * 2 ** Math.max(0, failures - 1), BACKOFF_MAX_MS);
  retryTimer = setTimeout(() => { retryTimer = null; void syncNow(); }, base * (0.8 + Math.random() * 0.4));
}

function scheduleDebounced() {
  if (!userId || !adapter) return;
  // Während eines Backoffs übernimmt der Wiederholungs-Timer.
  if (retryTimer) return;
  clearTimer('debounce');
  debounceTimer = setTimeout(() => { debounceTimer = null; void syncNow(); }, DEBOUNCE_MS);
}

/** Installiert alle Auslöser (idempotent). */
export function startSync(): void {
  registerSyncMergers();
  if (started) return;
  started = true;
  teardown.push(onLocalChange(() => { void refreshPending(); scheduleDebounced(); }));
  if (typeof window !== 'undefined') {
    const onOnline = () => { failures = 0; clearTimer('retry'); void syncNow(); };
    const onOffline = () => refreshStatus();
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - lastRunAt < FOCUS_THROTTLE_MS) return;
      void syncNow();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    teardown.push(() => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    });
    intervalTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void syncNow();
    }, INTERVAL_MS);
  }
  refreshStatus();
  void refreshPending();
  if (userId) void syncNow();
}

/** Entfernt alle Auslöser; laufende Durchgänge werden verworfen. */
export function stopSync(): void {
  teardown.forEach((fn) => fn());
  teardown = [];
  if (intervalTimer) clearInterval(intervalTimer);
  intervalTimer = null;
  clearTimer('retry');
  clearTimer('debounce');
  started = false;
}
