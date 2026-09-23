/**
 * Start der Datenschicht (einmal beim App-Start, vor dem ersten Rendern der Inhalte):
 * IndexedDB öffnen → setPersistence → hydrate → Sitzung laden → Besitzer prüfen → Sync starten.
 *
 * Besitzer des Geräts (meta.owner): 'guest' oder die Nutzer-ID.
 * - gleicher Nutzer          → einfach synchronisieren
 * - Gast + Lernfortschritt   → UI fragt (usePendingGuestDecision), bis dahin kein Sync
 * - Gast + nur Einstellungen → weich übernehmen (Kontodaten haben Vorrang)
 * - anderer Nutzer           → nie mischen: ungesicherte Daten des anderen Kontos werden lokal
 *                              gesichert und bei dessen nächster Anmeldung wiederhergestellt
 */
import { restoreAccountBackup as restoreBackup, stashAccountData } from './accountBackup';
import { initAuth, useAuth } from './auth/useAuth';
import { getLocalDb, openAppDb } from './db';
import {
  clearGuestDecision, getPendingGuestDecision, guestDataSummary, hasGuestData, requestGuestDecision, softAdoptSetupData,
} from './migrateGuest';
import { hydrate, resetStore, setPersistence } from './store';
import { setSyncUser, startSync } from './sync/engine';
import { registerSyncMergers } from './sync/mergers';

let bootPromise: Promise<void> | null = null;
let queue: Promise<void> = Promise.resolve();

/** Idempotent; bei Fehlern kann erneut aufgerufen werden. */
export function bootstrapData(): Promise<void> {
  if (!bootPromise) {
    bootPromise = boot().catch((e) => {
      bootPromise = null;
      throw e;
    });
  }
  return bootPromise;
}

async function boot(): Promise<void> {
  const db = await openAppDb();
  setPersistence(db.persistence);
  registerSyncMergers();
  await hydrate();
  const user = await initAuth();
  startSync();
  let applied = user?.id ?? null;
  await enqueueUser(applied);
  // Spätere An-/Abmeldungen (auch aus anderen Tabs oder nach Ablauf der Sitzung)
  const onAuth = (id: string | null) => {
    if (id === applied) return;
    applied = id;
    void enqueueUser(id);
  };
  useAuth.subscribe((s) => onAuth(s.user?.id ?? null));
  onAuth(useAuth.getState().user?.id ?? null);
}

function enqueueUser(userId: string | null): Promise<void> {
  queue = queue.then(() => applyUser(userId)).catch((e) => console.error('[bootstrap] Kontowechsel fehlgeschlagen', e));
  return queue;
}

async function applyUser(userId: string | null): Promise<void> {
  const db = getLocalDb();
  if (!db) return;
  if (!userId) {
    // Abgemeldet (freiwillig oder Sitzung abgelaufen): Daten bleiben, Sync ruht.
    clearGuestDecision();
    setSyncUser(null);
    return;
  }
  if (getPendingGuestDecision() === userId) return;
  const owner = (await db.getMeta<string>('owner')) ?? 'guest';
  if (owner === userId) {
    await restoreBackup(db, userId);
    setSyncUser(userId);
    return;
  }
  if (owner === 'guest') {
    if (!hasGuestData()) {
      await db.setMeta('owner', userId);
      await restoreBackup(db, userId);
      setSyncUser(userId);
    } else if (!guestDataSummary().meaningful) {
      await softAdoptSetupData(userId); // spielt auch die Geräte-Sicherung zurück
    } else {
      setSyncUser(null);
      requestGuestDecision(userId);
    }
    return;
  }
  // Daten eines anderen Kontos liegen auf dem Gerät → nicht mischen.
  setSyncUser(null);
  await stashAccountData(db, owner);
  await resetStore();
  await db.setMeta('owner', userId);
  await restoreBackup(db, userId);
  setSyncUser(userId);
}
