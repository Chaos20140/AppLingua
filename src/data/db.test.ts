import { describe, expect, it, vi } from 'vitest';
import type { Settings, StoredRecord } from '../core/types';

let n = 0;
async function fresh() {
  vi.resetModules();
  const store = await import('./store');
  const dbm = await import('./db');
  const db = await dbm.openAppDb(`db-test-${++n}`);
  store.setPersistence(db.persistence);
  await store.hydrate();
  return { store, dbm, db };
}

const rec = (id: string, extra: Partial<StoredRecord> = {}): StoredRecord => ({
  collection: 'badges', id, data: { badgeId: id, earnedAt: '2026-09-01T00:00:00.000Z' },
  updatedAt: '2026-09-01T00:00:00.000Z', ...extra,
} as StoredRecord);

describe('lokale Datenbank (IndexedDB)', () => {
  it('speichert Datensätze dauerhaft und lädt sie nach einem Neustart', async () => {
    const { store, dbm, db } = await fresh();
    expect(db.persistent).toBe(true);
    store.putRecord('profile', 'me', { displayName: 'Ana', createdAt: '2026-09-01T00:00:00.000Z', onboardingDone: false });
    store.appendEvent('xpEvents', { at: '2026-09-01T00:00:00.000Z', amount: 5, reason: 'exercise' }, 'x1');
    await store.flushLocalWrites();
    await db.settle();
    // „Neustart“: gleiche DB mit neuen Modulinstanzen öffnen
    vi.resetModules();
    const store2 = await import('./store');
    const db2 = await (await import('./db')).openAppDb(db.name);
    store2.setPersistence(db2.persistence);
    await store2.hydrate();
    expect(store2.getRecord('profile', 'me')?.displayName).toBe('Ana');
    expect(store2.listRecords('xpEvents')).toHaveLength(1);
    expect((await db2.getOutbox()).map((e) => e.id).sort()).toEqual(['me', 'x1']);
    expect(dbm.DB_NAME).toBe('applingua');
  });

  it('Outbox: ack entfernt nur unveränderte Einträge, localOnly wird nie vorgemerkt', async () => {
    const { store, db } = await fresh();
    await db.persistence.save([rec('a'), rec('b')]);
    await db.markDirty([{ collection: 'badges', id: 'a' }, { collection: 'badges', id: 'b' }]);
    const before = await db.getOutbox();
    await db.markDirty([{ collection: 'badges', id: 'b' }]);
    await db.ackOutbox(before);
    expect((await db.getOutbox()).map((e) => e.id)).toEqual(['b']);
    store.putRecord('songUserTexts', 'priv', {
      title: 'T', artist: 'A', courseId: 'es', variant: 'es-ES', lyrics: 'x', createdAt: '2026-09-01T00:00:00.000Z', privateUseConfirmed: true,
    }, { localOnly: true });
    await store.flushLocalWrites();
    await db.settle();
    expect((await db.getOutbox()).some((e) => e.id === 'priv')).toBe(false);
    expect((await db.persistence.loadAll()).some((r) => r.id === 'priv' && r.localOnly)).toBe(true);
  });

  it('clear() löscht Nutzerdaten, behält aber Sicherungen; wipe() löscht alles', async () => {
    const { db } = await fresh();
    await db.persistence.save([rec('a')]);
    await db.markDirty([{ collection: 'badges', id: 'a' }]);
    await db.setMeta('owner', 'u1');
    await db.setMeta('backup:u2', { savedAt: 'x', records: [] });
    await db.persistence.clear();
    expect(await db.persistence.loadAll()).toEqual([]);
    expect(await db.getOutbox()).toEqual([]);
    expect(await db.getMeta('owner')).toBeUndefined();
    expect(await db.getMeta('backup:u2')).toBeTruthy();
    await db.wipe();
    expect(await db.metaKeys()).toEqual([]);
  });

  it('Sprachaufnahmen nur mit Einwilligung, höchstens 3 je Element', async () => {
    const { store, dbm, db } = await fresh();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mp4' });
    await expect(dbm.saveRecording({ itemId: 'es.p.r.perro', courseId: 'es', blob })).rejects.toThrow(/Einstellungen/);
    store.putRecord('settings', 'main', { storeRecordings: true } as unknown as Settings);
    for (let i = 0; i < 4; i++) {
      await dbm.saveRecording({ itemId: 'es.p.r.perro', courseId: 'es', blob });
      await new Promise((r) => setTimeout(r, 2));
    }
    const list = await dbm.listRecordings('es.p.r.perro');
    expect(list).toHaveLength(3);
    expect(list[0].blob.size).toBe(3);
    expect(list[0].blob.type).toBe('audio/mp4');
    await dbm.deleteAllRecordings();
    expect(await dbm.listRecordings()).toHaveLength(0);
    expect(db.persistent).toBe(true);
  });

  it('Fallback im Arbeitsspeicher mit dauerhafter Meldung, wenn IndexedDB fehlt', async () => {
    vi.resetModules();
    vi.stubGlobal('indexedDB', undefined);
    try {
      const store = await import('./store');
      const dbm = await import('./db');
      const db = await dbm.openAppDb('db-test-fallback');
      expect(db.persistent).toBe(false);
      store.setPersistence(db.persistence);
      await store.hydrate();
      expect(store.useDataStore.getState().persistError).toBe(dbm.STORAGE_UNAVAILABLE_MESSAGE);
      store.putRecord('profile', 'me', { displayName: 'Ana', createdAt: '2026-09-01T00:00:00.000Z', onboardingDone: false });
      await store.flushLocalWrites();
      await db.settle();
      // Nach erfolgreichem Speichern (im RAM) bleibt der Hinweis bestehen
      expect(store.useDataStore.getState().persistError).toBe(dbm.STORAGE_UNAVAILABLE_MESSAGE);
      expect((await db.getOutbox()).length).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
