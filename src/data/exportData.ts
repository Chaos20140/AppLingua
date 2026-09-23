/**
 * Datenexport (DSGVO Art. 15/20) und Löschen der Daten auf diesem Gerät.
 */
import type { CollectionName, StoredRecord } from '../core/types';
import { COLLECTIONS } from '../core/types';
import { useAuth } from './auth/useAuth';
import { getLocalDb, listRecordings } from './db';
import { clearGuestDecision } from './migrateGuest';
import { allRecords, flushLocalWrites, resetStore } from './store';
import { setSyncUser } from './sync/engine';

export interface ExportOptions {
  /** Sprachaufnahmen (nur lokal gespeichert) als Base64 beilegen. Standard: true */
  includeRecordings?: boolean;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Alle persönlichen Daten dieses Geräts als JSON-Datei (Blob). */
export async function exportAllData(opts: ExportOptions = {}): Promise<Blob> {
  await flushLocalWrites();
  const user = useAuth.getState().user;
  const collections = {} as Record<CollectionName, { id: string; updatedAt: string; onlyOnThisDevice?: true; data: StoredRecord['data'] }[]>;
  for (const c of COLLECTIONS) collections[c] = [];
  for (const r of allRecords()) {
    if (r.deleted) continue;
    collections[r.collection].push({ id: r.id, updatedAt: r.updatedAt, ...(r.localOnly ? { onlyOnThisDevice: true as const } : {}), data: r.data });
  }
  const recordings = opts.includeRecordings === false ? [] : await Promise.all((await listRecordings()).map(async (rec) => ({
    id: rec.id, itemId: rec.itemId, courseId: rec.courseId, createdAt: rec.createdAt,
    mimeType: rec.mimeType, durationMs: rec.durationMs, audioBase64: toBase64(await rec.blob.arrayBuffer()),
  })));
  const payload = {
    format: 'applingua-export',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    hinweis: 'Dieser Export enthält alle auf diesem Gerät gespeicherten AppLingua-Daten. Einträge mit ' +
      '"onlyOnThisDevice" wurden nie in die Cloud übertragen.',
    account: user ? { id: user.id, email: user.email ?? null, provider: user.provider } : null,
    collections,
    recordings,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function exportFileName(date = new Date()): string {
  return `applingua-daten-${date.toISOString().slice(0, 10)}.json`;
}

/** Export erzeugen und als Datei herunterladen (Nutzer-Geste nötig, v. a. in Safari). */
export async function downloadAllData(opts: ExportOptions = {}): Promise<void> {
  const blob = await exportAllData(opts);
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Safari braucht die URL noch kurz nach dem Klick.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

/**
 * Löscht ALLE AppLingua-Daten auf diesem Gerät (Fortschritt, Einstellungen, Aufnahmen, Sicherungen).
 * Ist ein Konto angemeldet, wird dieses Gerät dabei abgemeldet – die Daten im Konto bleiben erhalten
 * (Konto löschen: useAuth().deleteAccount()). Noch nicht synchronisierte Änderungen gehen verloren.
 */
export async function deleteLocalData(): Promise<void> {
  const { user, signOut } = useAuth.getState();
  if (user) await signOut({ force: true });
  setSyncUser(null);
  clearGuestDecision();
  await resetStore();
  const db = getLocalDb();
  if (db) {
    await db.wipe();
    await db.setMeta('owner', 'guest');
  }
}
