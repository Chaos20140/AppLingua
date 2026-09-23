/**
 * Sync-Tests mit In-Memory-Cloud: jedes „Gerät“ hat eigene Modulinstanzen (Store, DB, Engine)
 * und eine eigene IndexedDB (fake-indexeddb); die Cloud ist gemeinsam.
 */
import { describe, expect, it, vi } from 'vitest';
import type {
  AnswerEvent, ErrorEntry, LessonProgress, PronAttempt, Settings, SongExplanationRecord, SongProgress, SrsCard, UserSongText,
} from '../../core/types';
import { MemoryCloudAdapter } from '../cloud/memoryAdapter';
import type { LocalDb } from '../db';

type StoreMod = typeof import('../store');
type EngineMod = typeof import('./engine');
type GuestMod = typeof import('../migrateGuest');

interface Device { store: StoreMod; sync: EngineMod; guest: GuestMod; db: LocalDb }

let counter = 0;
const USER = 'user-1';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function device(cloud: MemoryCloudAdapter | null, userId: string | null = USER): Promise<Device> {
  vi.resetModules();
  const store = await import('../store');
  const dbm = await import('../db');
  const sync = await import('./engine');
  const guest = await import('../migrateGuest');
  const db = await dbm.openAppDb(`sync-test-${++counter}`);
  store.setPersistence(db.persistence);
  await store.hydrate();
  sync.configureSync({ adapter: cloud, local: db });
  if (userId) {
    await db.setMeta('owner', userId);
    sync.setSyncUser(userId);
  }
  return { store, sync, guest, db };
}

async function settle(d: Device) {
  await d.store.flushLocalWrites();
  await d.db.settle();
}

async function sync(d: Device) {
  await settle(d);
  await d.sync.syncNow();
  await settle(d);
}

function settings(syncUserTexts = false): Settings {
  return {
    activeCourse: 'es', esVariant: 'es-ES', theme: 'system', dailyGoalXp: 30, ttsRate: 1, ttsSlowRate: 0.7,
    showIPA: false, autoplayAudio: true, soundEffects: true, reducedMotion: 'system', strictAccents: false,
    storeRecordings: false, embedConsent: { youtube: false, spotify: false, appleMusic: false },
    partner: { level: 'A1', formal: false, speed: 'normal', correction: 'danach', translations: true },
    songs: {
      explicitFilter: true, preferredGenres: [], preferredArtists: [], speed: 'egal', colloquial: 'egal',
      showTranslation: true, showPhonetic: true, syncUserTexts,
    },
  };
}

const lesson = (p: Partial<LessonProgress>): LessonProgress => ({
  courseId: 'es', lessonId: 'es.s0.l01', bestScorePct: 0, stars: 0, attempts: 1,
  firstCompletedAt: '2026-09-01T10:00:00.000Z', lastCompletedAt: '2026-09-01T10:00:00.000Z', bestCombo: 0, ...p,
});

const song = (p: Partial<SongProgress>): SongProgress => ({
  songId: 'song.es.demo', courseId: 'es', lastPositionMs: 0, learnedLineIds: [], lineScores: {}, pronScores: {},
  playCount: 1, lastPlayedAt: '2026-09-01T10:00:00.000Z', modesUsed: [], exercisesDone: 0, exerciseAccuracy: 0, ...p,
});

const userText: UserSongText = {
  title: 'Mein Lied', artist: 'Ich', courseId: 'es', variant: 'es-ES', lyrics: 'Hola\nAdiós',
  createdAt: '2026-09-01T10:00:00.000Z', privateUseConfirmed: true,
};

describe('Sync-Engine', () => {
  it('ohne Cloud-Konfiguration ehrlich im lokalen Modus', async () => {
    const d = await device(null);
    d.store.putRecord('profile', 'me', { displayName: 'Ana', createdAt: '2026-09-01T00:00:00.000Z', onboardingDone: true });
    await sync(d);
    expect(d.sync.getSyncStatus()).toEqual({ state: 'local-only', reason: 'not-configured' });
  });

  it('Gastmodus: kein Upload, Status local-only/guest', async () => {
    const cloud = new MemoryCloudAdapter();
    const d = await device(cloud, null);
    d.store.appendEvent('xpEvents', { at: '2026-09-01T00:00:00.000Z', amount: 5, reason: 'exercise' });
    await sync(d);
    expect(d.sync.getSyncStatus()).toEqual({ state: 'local-only', reason: 'guest' });
    expect(cloud.count(USER)).toBe(0);
  });

  it('Gerätewechsel: neues Gerät erhält alle Daten', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('profile', 'me', { displayName: 'Ana', createdAt: '2026-09-01T00:00:00.000Z', onboardingDone: true });
    a.store.putRecord('settings', 'main', settings());
    a.store.appendEvent('xpEvents', { at: '2026-09-01T00:00:00.000Z', amount: 15, reason: 'lesson' }, 'lesson:es.s0.l01:first');
    a.store.putRecord('lessonProgress', 'es:es.s0.l01', lesson({ bestScorePct: 80, stars: 2 }));
    a.store.removeRecord('profile', 'nonexistent');
    await sync(a);
    expect(a.sync.getSyncStatus().state).toBe('idle');
    expect(a.sync.useSyncStore.getState().pendingCount).toBe(0);
    expect(cloud.count(USER)).toBe(4);

    const b = await device(cloud);
    await sync(b);
    expect(b.store.getRecord('profile', 'me')?.displayName).toBe('Ana');
    expect(b.store.getRecord('lessonProgress', 'es:es.s0.l01')?.bestScorePct).toBe(80);
    expect(b.store.listRecords('xpEvents')).toHaveLength(1);
    expect(b.store.getRecord('settings', 'main')).toEqual(settings());
    // Pull-Cursor ist gesetzt → zweiter Durchgang holt nur die Überlappung
    expect(await b.db.getMeta<string>(`cursor:${USER}`)).toBeTruthy();
  });

  it('Löschungen werden als Tombstone übertragen', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const b = await device(cloud);
    a.store.putRecord('playlists', 'p1', { name: 'Favoriten', songIds: ['song.es.demo'], createdAt: '2026-09-01T00:00:00.000Z' });
    await sync(a);
    await sync(b);
    expect(b.store.getRecord('playlists', 'p1')?.name).toBe('Favoriten');
    b.store.removeRecord('playlists', 'p1');
    await sync(b);
    await sync(a);
    expect(a.store.getRecord('playlists', 'p1')).toBeUndefined();
    expect(cloud.get(USER, 'playlists', 'p1')?.deleted).toBe(true);
  });

  it('LWW-Konflikt: die neuere Änderung gewinnt auf allen Geräten', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const b = await device(cloud);
    a.store.putRecord('profile', 'me', { displayName: 'Start', createdAt: '2026-09-01T00:00:00.000Z', onboardingDone: true });
    await sync(a);
    await sync(b);
    b.store.patchRecord('profile', 'me', { displayName: 'Älter (B)' });
    await sleep(5);
    a.store.patchRecord('profile', 'me', { displayName: 'Neuer (A)' });
    // A lädt zuerst hoch, B danach mit älterem Stand → Server verwirft B
    await sync(a);
    await sync(b);
    await sync(a);
    expect(cloud.get(USER, 'profile', 'me')?.data).toMatchObject({ displayName: 'Neuer (A)' });
    expect(a.store.getRecord('profile', 'me')?.displayName).toBe('Neuer (A)');
    expect(b.store.getRecord('profile', 'me')?.displayName).toBe('Neuer (A)');
  });

  it('Event-Sammlungen werden vereinigt, deterministische IDs bleiben einmalig', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const b = await device(cloud);
    a.store.appendEvent('xpEvents', { at: '2026-09-01T10:00:00.000Z', amount: 10, reason: 'exercise' });
    b.store.appendEvent('xpEvents', { at: '2026-09-01T11:00:00.000Z', amount: 20, reason: 'exercise' });
    a.store.appendEvent('xpEvents', { at: '2026-09-01T12:00:00.000Z', amount: 50, reason: 'mission' }, 'mission:2026-09-01:daily-3');
    b.store.appendEvent('xpEvents', { at: '2026-09-01T12:00:01.000Z', amount: 50, reason: 'mission' }, 'mission:2026-09-01:daily-3');
    await sync(a); await sync(b); await sync(a);
    const sum = (d: Device) => d.store.listRecords('xpEvents').reduce((s, e) => s + e.data.amount, 0);
    expect(a.store.listRecords('xpEvents')).toHaveLength(3);
    expect(b.store.listRecords('xpEvents')).toHaveLength(3);
    expect(sum(a)).toBe(80);
    expect(sum(b)).toBe(80);
  });

  it('Merger lessonProgress: Maximalwerte, früheste Erstabsolvierung – ohne Pingpong', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const b = await device(cloud);
    a.store.putRecord('lessonProgress', 'es:es.s0.l01', lesson({
      bestScorePct: 70, stars: 1, attempts: 4, bestCombo: 9, bestDurationSec: 300,
      firstCompletedAt: '2026-09-02T10:00:00.000Z', lastCompletedAt: '2026-09-05T10:00:00.000Z',
    }));
    await sync(a);
    await sleep(5);
    b.store.putRecord('lessonProgress', 'es:es.s0.l01', lesson({
      bestScorePct: 95, stars: 3, attempts: 2, bestCombo: 4, bestDurationSec: 200,
      firstCompletedAt: '2026-09-01T10:00:00.000Z', lastCompletedAt: '2026-09-03T10:00:00.000Z',
    }));
    await sync(b);
    await sync(a);
    const expected = {
      bestScorePct: 95, stars: 3, attempts: 4, bestCombo: 9, bestDurationSec: 200,
      firstCompletedAt: '2026-09-01T10:00:00.000Z', lastCompletedAt: '2026-09-05T10:00:00.000Z',
    };
    expect(a.store.getRecord('lessonProgress', 'es:es.s0.l01')).toMatchObject(expected);
    expect(b.store.getRecord('lessonProgress', 'es:es.s0.l01')).toMatchObject(expected);
    // Stabil: weitere Durchgänge laden nichts mehr hoch (kein Merge-Pingpong trotz jsonb-Schlüsselsortierung)
    await sync(b); await sync(a);
    const calls = cloud.pushCalls;
    await sync(a); await sync(b); await sync(a);
    expect(cloud.pushCalls).toBe(calls);
    expect(a.sync.useSyncStore.getState().pendingCount).toBe(0);
  });

  it('Merger songProgress: Vereinigung, Maximum, früheste Meilensteine, Position der letzten Sitzung', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const b = await device(cloud);
    a.store.putRecord('songProgress', 'song.es.demo', song({
      learnedLineIds: ['l1', 'l2'], modesUsed: ['karaoke'], lineScores: { l1: 90, l2: 60 }, pronScores: { l1: 70 },
      playCount: 5, lastPlayedAt: '2026-09-05T10:00:00.000Z', lastPositionMs: 42_000, bossPassedAt: '2026-09-04T10:00:00.000Z',
    }));
    await sync(a);
    await sleep(5);
    b.store.putRecord('songProgress', 'song.es.demo', song({
      learnedLineIds: ['l2', 'l3'], modesUsed: ['lueckentext'], lineScores: { l2: 85, l3: 80 }, pronScores: { l1: 50, l3: 90 },
      playCount: 3, lastPlayedAt: '2026-09-03T10:00:00.000Z', lastPositionMs: 5_000, bossPassedAt: '2026-09-02T10:00:00.000Z',
      completedAt: '2026-09-03T10:00:00.000Z',
    }));
    await sync(b);
    await sync(a);
    for (const d of [a, b]) {
      const p = d.store.getRecord('songProgress', 'song.es.demo')!;
      expect([...p.learnedLineIds].sort()).toEqual(['l1', 'l2', 'l3']);
      expect([...p.modesUsed].sort()).toEqual(['karaoke', 'lueckentext']);
      expect(p.lineScores).toEqual({ l1: 90, l2: 85, l3: 80 });
      expect(p.pronScores).toEqual({ l1: 70, l3: 90 });
      expect(p.playCount).toBe(5);
      expect(p.lastPositionMs).toBe(42_000);
      expect(p.lastPlayedAt).toBe('2026-09-05T10:00:00.000Z');
      expect(p.bossPassedAt).toBe('2026-09-02T10:00:00.000Z');
      expect(p.completedAt).toBe('2026-09-03T10:00:00.000Z');
    }
  });

  it('Offline: Änderungen bleiben in der Outbox und werden später nachgeholt', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    await sync(a);
    cloud.online = false;
    a.store.appendEvent('xpEvents', { at: '2026-09-01T10:00:00.000Z', amount: 10, reason: 'exercise' });
    a.store.putRecord('badges', 'first-lesson', { badgeId: 'first-lesson', earnedAt: '2026-09-01T10:00:00.000Z' });
    await sync(a);
    expect(a.sync.getSyncStatus()).toEqual({ state: 'pending', count: 2, offline: true });
    expect((await a.db.getOutbox()).length).toBe(2);
    expect(cloud.count(USER)).toBe(0);

    cloud.online = true;
    await sync(a);
    expect(a.sync.getSyncStatus().state).toBe('idle');
    expect((await a.db.getOutbox()).length).toBe(0);
    expect(cloud.count(USER)).toBe(2);
  });

  it('Änderung während des Uploads bleibt vorgemerkt (Sequenznummer)', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('profile', 'me', { displayName: 'Eins', createdAt: '2026-09-01T00:00:00.000Z', onboardingDone: true });
    await settle(a);
    const [entry] = await a.db.getOutbox();
    a.store.patchRecord('profile', 'me', { displayName: 'Zwei' });
    await settle(a);
    await a.db.ackOutbox([entry]); // veralteter Eintrag darf die neue Vormerkung nicht löschen
    expect((await a.db.getOutbox()).length).toBe(1);
    await sync(a);
    expect(cloud.get(USER, 'profile', 'me')?.data).toMatchObject({ displayName: 'Zwei' });
  });
});

describe('Gastdaten', () => {
  async function accountWithData(cloud: MemoryCloudAdapter) {
    const a = await device(cloud);
    a.store.putRecord('settings', 'main', { ...settings(), dailyGoalXp: 50 });
    a.store.appendEvent('xpEvents', { at: '2026-09-01T10:00:00.000Z', amount: 100, reason: 'lesson' });
    await sync(a);
    return a;
  }

  it('Übernahme: Gastfortschritt wird ins Konto hochgeladen und mit Kontodaten vereint', async () => {
    const cloud = new MemoryCloudAdapter();
    await accountWithData(cloud);
    const g = await device(cloud, null);
    g.store.appendEvent('xpEvents', { at: '2026-09-02T10:00:00.000Z', amount: 30, reason: 'exercise' });
    g.store.putRecord('lessonProgress', 'es:es.s0.l02', lesson({ lessonId: 'es.s0.l02', bestScorePct: 60 }));
    await settle(g);
    expect(g.guest.hasGuestData()).toBe(true);
    expect(g.guest.guestDataSummary()).toMatchObject({ xp: 30, lessons: 1, meaningful: true });

    g.guest.requestGuestDecision(USER);
    expect(g.guest.getPendingGuestDecision()).toBe(USER);
    await g.guest.adoptGuestData();
    await settle(g);
    expect(g.guest.getPendingGuestDecision()).toBeNull();
    expect(await g.db.getMeta('owner')).toBe(USER);
    expect(g.store.listRecords('xpEvents')).toHaveLength(2);
    expect(cloud.get(USER, 'lessonProgress', 'es:es.s0.l02')).toBeTruthy();
    expect(cloud.count(USER, 'xpEvents')).toBe(2);
  });

  it('Verwerfen: nur die Kontodaten bleiben', async () => {
    const cloud = new MemoryCloudAdapter();
    await accountWithData(cloud);
    const g = await device(cloud, null);
    g.store.appendEvent('xpEvents', { at: '2026-09-02T10:00:00.000Z', amount: 30, reason: 'exercise' });
    await settle(g);
    g.guest.requestGuestDecision(USER);
    await g.guest.discardGuestData();
    await settle(g);
    const xp = g.store.listRecords('xpEvents');
    expect(xp).toHaveLength(1);
    expect(xp[0].data.amount).toBe(100);
    expect(cloud.count(USER, 'xpEvents')).toBe(1);
  });

  it('Nur Einstellungen: weiche Übernahme – vorhandene Kontodaten haben Vorrang', async () => {
    const cloud = new MemoryCloudAdapter();
    await accountWithData(cloud);
    const g = await device(cloud, null);
    g.store.putRecord('settings', 'main', { ...settings(), dailyGoalXp: 10 });
    g.store.putRecord('profile', 'me', { displayName: 'Gast', createdAt: '2026-09-02T00:00:00.000Z', onboardingDone: true });
    await settle(g);
    expect(g.guest.guestDataSummary().meaningful).toBe(false);
    await g.guest.softAdoptSetupData(USER);
    await sync(g);
    expect(g.store.getRecord('settings', 'main')?.dailyGoalXp).toBe(50);   // Konto gewinnt
    expect(g.store.getRecord('profile', 'me')?.displayName).toBe('Gast');  // Lücke gefüllt
    expect(cloud.get(USER, 'profile', 'me')).toBeTruthy();
  });
});

describe('Eigene Songtexte (localOnly)', () => {
  it('werden nie hochgeladen, solange die Synchronisierung aus ist', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('settings', 'main', settings(false));
    a.store.putRecord('songUserTexts', 't1', userText, { localOnly: true });
    // auch ohne localOnly-Markierung schützt die Einstellung
    a.store.putRecord('songUserTexts', 't2', { ...userText, title: 'Zweites' });
    await sync(a);
    expect(cloud.count(USER, 'songUserTexts')).toBe(0);
    expect(cloud.count(USER, 'settings')).toBe(1);
    expect(a.sync.useSyncStore.getState().pendingCount).toBe(0);
    // Markierung wurde nachgezogen
    expect(a.store.useDataStore.getState().tables.songUserTexts.t2.localOnly).toBe(true);
  });

  it('setUserTextsSync(true) lädt hoch, (false) entfernt aus der Cloud und behält lokal', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('settings', 'main', settings(false));
    a.store.putRecord('songUserTexts', 't1', userText, { localOnly: true });
    await sync(a);
    await a.sync.setUserTextsSync(true);
    await sync(a);
    expect(a.store.getRecord('settings', 'main')?.songs.syncUserTexts).toBe(true);
    expect(cloud.count(USER, 'songUserTexts')).toBe(1);

    const b = await device(cloud);
    await sync(b);
    expect(b.store.getRecord('songUserTexts', 't1')?.title).toBe('Mein Lied');

    await a.sync.setUserTextsSync(false);
    await sync(a);
    expect(cloud.count(USER, 'songUserTexts')).toBe(0);
    expect(a.store.getRecord('songUserTexts', 't1')?.title).toBe('Mein Lied');
    // Gerät B übernimmt die Einstellung und behält seine Kopie nur lokal
    await sync(b);
    expect(b.store.getRecord('settings', 'main')?.songs.syncUserTexts).toBe(false);
    expect(b.store.useDataStore.getState().tables.songUserTexts.t1.localOnly).toBe(true);
    expect(b.store.getRecord('songUserTexts', 't1')).toBeTruthy();
    expect(cloud.count(USER, 'songUserTexts')).toBe(0);
  });
});

const errorEntry = (p: Partial<ErrorEntry>): ErrorEntry => ({
  courseId: 'es', exerciseId: 'ex1', context: 'lesson', skill: 'grammar', topicIds: [], prompt: 'Yo ___',
  userAnswer: 'es', correctAnswer: 'soy', explanation: {} as ErrorEntry['explanation'], count: 1,
  firstAt: '2026-09-01T10:00:00.000Z', lastAt: '2026-09-01T10:00:00.000Z', correctSince: 0, ...p,
} as ErrorEntry);

const card = (p: Partial<SrsCard>): SrsCard => ({
  courseId: 'es', itemId: 'hola', kind: 'vocab', front: 'hola', back: 'hallo', source: { type: 'lesson' },
  ease: 2.5, intervalDays: 1, reps: 1, lapses: 0, dueAt: '2026-09-02T00:00:00.000Z',
  lastReviewedAt: '2026-09-01T10:00:00.000Z', createdAt: '2026-09-01T09:00:00.000Z', ...p,
});

describe('Merge-Regeln (eine Quelle)', () => {
  it('src/state/mergers re-exportiert nur die Regeln aus src/data/sync/mergers', async () => {
    const syncM = await import('./mergers');
    const stateM = await import('../../state/mergers');
    expect(stateM.mergeLessonProgress).toBe(syncM.mergeLessonProgress);
    expect(stateM.mergeVocabCard).toBe(syncM.mergeVocabCard);
    expect(stateM.registerEngineMergers).toBe(syncM.registerSyncMergers);
  });

  it('Fehlerarchiv: Behebung auf einem Gerät bleibt erhalten, neuer Fehler danach hebt sie auf', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const b = await device(cloud);
    a.store.putRecord('errorEntries', 'e1', errorEntry({}));
    await sync(a);
    await sync(b);
    a.store.putRecord('errorEntries', 'e1', errorEntry({ correctSince: 2, resolvedAt: '2026-09-02T10:00:00.000Z' }));
    await sync(a);
    await sync(b);
    await sync(a);
    expect(b.store.getRecord('errorEntries', 'e1')?.resolvedAt).toBe('2026-09-02T10:00:00.000Z');
    expect(a.store.getRecord('errorEntries', 'e1')?.resolvedAt).toBe('2026-09-02T10:00:00.000Z');
    expect(cloud.get(USER, 'errorEntries', 'e1')?.data).toMatchObject({ resolvedAt: '2026-09-02T10:00:00.000Z' });

    b.store.putRecord('errorEntries', 'e1', errorEntry({ count: 2, lastAt: '2026-09-03T10:00:00.000Z', userAnswer: 'eres' }));
    await sync(b);
    await sync(a);
    const merged = a.store.getRecord('errorEntries', 'e1');
    expect(merged?.resolvedAt).toBeUndefined();
    expect(merged).toMatchObject({ count: 2, correctSince: 0, userAnswer: 'eres', lastAt: '2026-09-03T10:00:00.000Z' });
  });

  it('Vokabelkarte: Lernstand der letzten Wiederholung, Pausieren aus der neueren Änderung', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const b = await device(cloud);
    a.store.putRecord('vocabCards', 'c1', card({}));
    await sync(a);
    await sync(b);
    // B wiederholt offline, danach pausiert A die Karte (neuere Änderung ohne Wiederholung)
    b.store.putRecord('vocabCards', 'c1', card({ reps: 2, intervalDays: 3, lastReviewedAt: '2026-09-02T10:00:00.000Z' }));
    await sleep(5);
    a.store.putRecord('vocabCards', 'c1', card({ suspended: true, createdAt: '2026-09-01T08:00:00.000Z' }));
    await sync(a);
    await sync(b);
    await sync(a);
    for (const d of [a, b]) {
      expect(d.store.getRecord('vocabCards', 'c1')).toMatchObject({
        reps: 2, intervalDays: 3, suspended: true, createdAt: '2026-09-01T08:00:00.000Z',
      });
    }
  });
});

describe('Inhalte eigener Songtexte (Notizen, Markierungen, KI-Erklärungen)', () => {
  const explanation = (songId: string): SongExplanationRecord => ({
    songId, lineId: 'l1', span: 'hola', action: 'meaning', level: 'A1',
    result: { natural: 'hallo', source: 'ai' }, createdAt: '2026-09-01T10:00:00.000Z',
  } as SongExplanationRecord);

  it('gehen ohne Synchronisierung nie in die Cloud und werden beim Ausschalten mit entfernt', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('settings', 'main', settings(false));
    a.store.putRecord('songUserTexts', 't1', userText, { localOnly: true });
    // absichtlich ohne localOnly-Markierung: die Einstellung schützt trotzdem
    a.store.putRecord('songNotes', 'user.t1:song', { songId: 'user.t1', text: 'meine Notiz' });
    a.store.putRecord('songExplanations', 'user.t1:l1:hola:meaning', explanation('user.t1'));
    a.store.putRecord('songMarkedWords', 'user.t1:l1:0', { songId: 'user.t1', lineId: 'l1', tokenIndex: 0, text: 'Hola' });
    a.store.putRecord('songNotes', 'song.es.demo:song', { songId: 'song.es.demo', text: 'Katalog-Notiz' });
    await sync(a);
    expect(cloud.count(USER, 'songExplanations')).toBe(0);
    expect(cloud.count(USER, 'songMarkedWords')).toBe(0);
    expect(cloud.get(USER, 'songNotes', 'user.t1:song')).toBeUndefined();
    expect(cloud.get(USER, 'songNotes', 'song.es.demo:song')).toBeTruthy();
    expect(a.store.useDataStore.getState().tables.songExplanations['user.t1:l1:hola:meaning'].localOnly).toBe(true);
    expect(a.sync.useSyncStore.getState().pendingCount).toBe(0);

    await a.sync.setUserTextsSync(true);
    await sync(a);
    expect(cloud.get(USER, 'songExplanations', 'user.t1:l1:hola:meaning')).toBeTruthy();
    expect(cloud.get(USER, 'songNotes', 'user.t1:song')).toBeTruthy();

    await a.sync.setUserTextsSync(false);
    await sync(a);
    expect(cloud.count(USER, 'songUserTexts')).toBe(0);
    expect(cloud.count(USER, 'songExplanations')).toBe(0);
    expect(cloud.count(USER, 'songMarkedWords')).toBe(0);
    expect(cloud.get(USER, 'songNotes', 'user.t1:song')).toBeUndefined();
    expect(cloud.get(USER, 'songNotes', 'song.es.demo:song')).toBeTruthy(); // Katalog-Songs bleiben
    expect(a.store.getRecord('songNotes', 'user.t1:song')?.text).toBe('meine Notiz'); // lokal erhalten
  });

  it('Selbstheilung: private Inhalte in der Cloud werden bei ausgeschalteter Synchronisierung entfernt', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('settings', 'main', settings(false));
    await sync(a);
    // z. B. Upload eines Geräts mit veraltetem Stand
    await cloud.push(USER, [
      { collection: 'songUserTexts', id: 't9', data: userText, updatedAt: '2026-09-01T10:00:00.000Z' },
      { collection: 'songExplanations', id: 'user.t9:l1:hola:meaning', data: explanation('user.t9'), updatedAt: '2026-09-01T10:00:00.000Z' },
    ]);
    await sync(a);
    expect(cloud.count(USER, 'songUserTexts')).toBe(0);
    expect(cloud.count(USER, 'songExplanations')).toBe(0);
    const t = a.store.useDataStore.getState().tables;
    expect(t.songUserTexts.t9.localOnly).toBe(true);
    expect(t.songExplanations['user.t9:l1:hola:meaning'].localOnly).toBe(true);
  });
});

describe('Abmelden / Kontowechsel: Geräte-Sicherung', () => {
  it('ungesicherte Änderungen und nur-lokale Texte überstehen das Zurücksetzen und kommen beim selben Konto zurück', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    const backup = await import('../accountBackup');
    a.store.putRecord('settings', 'main', settings(false));
    a.store.putRecord('songUserTexts', 't1', userText, { localOnly: true });
    await sync(a);
    cloud.online = false;
    a.store.putRecord('lessonProgress', 'es:es.s0.l01', lesson({ bestScorePct: 90 }));
    await sync(a);

    expect(await backup.stashAccountData(a.db, USER)).toBe(2);
    a.sync.setSyncUser(null);
    await a.store.resetStore();
    await a.db.setMeta('owner', 'guest');
    expect(a.store.allRecords()).toHaveLength(0); // nichts mehr sichtbar (Gastmodus)

    cloud.online = true;
    await a.db.setMeta('owner', USER);
    await backup.restoreAccountBackup(a.db, USER);
    a.sync.setSyncUser(USER);
    await sync(a);
    expect(a.store.getRecord('lessonProgress', 'es:es.s0.l01')?.bestScorePct).toBe(90);
    expect(a.store.useDataStore.getState().tables.songUserTexts.t1.localOnly).toBe(true);
    expect(cloud.get(USER, 'lessonProgress', 'es:es.s0.l01')).toBeTruthy();
    expect(cloud.count(USER, 'songUserTexts')).toBe(0);
    expect(await a.db.getMeta(`backup:${USER}`)).toBeUndefined();
  });

  it('Kontowechsel: Daten von Konto A landen nie bei Konto B und kommen für A zurück', async () => {
    const cloud = new MemoryCloudAdapter();
    const OTHER = 'user-2';
    const a = await device(cloud);
    const backup = await import('../accountBackup');
    a.store.putRecord('settings', 'main', { ...settings(), dailyGoalXp: 50 });
    await sync(a);
    cloud.online = false;
    a.store.putRecord('lessonProgress', 'es:es.s0.l01', lesson({ bestScorePct: 70 })); // ungesichert
    await sync(a);
    cloud.online = true;
    await cloud.push(OTHER, [{ collection: 'settings', id: 'main', data: { ...settings(), dailyGoalXp: 20 }, updatedAt: '2026-09-01T10:00:00.000Z' }]);

    // Ablauf wie bootstrap.applyUser bei fremdem Besitzer
    a.sync.setSyncUser(null);
    await backup.stashAccountData(a.db, USER);
    await a.store.resetStore();
    await a.db.setMeta('owner', OTHER);
    await backup.restoreAccountBackup(a.db, OTHER);
    a.sync.setSyncUser(OTHER);
    await sync(a);
    expect(a.store.getRecord('settings', 'main')?.dailyGoalXp).toBe(20);
    expect(a.store.getRecord('lessonProgress', 'es:es.s0.l01')).toBeUndefined();
    expect(cloud.count(OTHER)).toBe(1);
    expect(await a.db.getMeta(`cursor:${USER}`)).toBeUndefined();

    // zurück zu Konto A: Sicherung wird eingespielt und nur in A hochgeladen
    a.sync.setSyncUser(null);
    await backup.stashAccountData(a.db, OTHER);
    await a.store.resetStore();
    await a.db.setMeta('owner', USER);
    await backup.restoreAccountBackup(a.db, USER);
    a.sync.setSyncUser(USER);
    await sync(a);
    expect(a.store.getRecord('lessonProgress', 'es:es.s0.l01')?.bestScorePct).toBe(70);
    expect(a.store.getRecord('settings', 'main')?.dailyGoalXp).toBe(50);
    expect(cloud.get(USER, 'lessonProgress', 'es:es.s0.l01')).toBeTruthy();
    expect(cloud.get(OTHER, 'lessonProgress', 'es:es.s0.l01')).toBeUndefined();
    expect(cloud.count(OTHER)).toBe(1);
  });

  it('weiche Übernahme spielt die Geräte-Sicherung des Kontos vor dem ersten Upload ein', async () => {
    const cloud = new MemoryCloudAdapter();
    const g = await device(cloud, null);
    await g.db.setMeta(`backup:${USER}`, {
      savedAt: '2026-09-01T12:00:00.000Z',
      records: [{ collection: 'lessonProgress', id: 'es:es.s0.l03', data: lesson({ lessonId: 'es.s0.l03', bestScorePct: 55 }), updatedAt: '2026-09-01T12:00:00.000Z' }],
    });
    g.store.putRecord('settings', 'main', settings());
    await settle(g);
    await g.guest.softAdoptSetupData(USER);
    await sync(g);
    expect(g.store.getRecord('lessonProgress', 'es:es.s0.l03')?.bestScorePct).toBe(55);
    expect(cloud.get(USER, 'lessonProgress', 'es:es.s0.l03')).toBeTruthy();
    expect(await g.db.getMeta(`backup:${USER}`)).toBeUndefined();
  });
});

describe('Song-Übungen zu eigenen Texten (Antworten, Fehlerarchiv, Aussprache)', () => {
  const answer = (refId: string): AnswerEvent => ({
    at: '2026-09-01T10:00:00.000Z', courseId: 'es', exerciseId: `song:${refId}:l1:gap`, exerciseType: 'gap-fill',
    context: 'song', refId, skills: ['vocabulary'], topicIds: [], correct: false, userAnswer: 'adios',
  });
  const error = (refId: string): ErrorEntry => ({
    courseId: 'es', exerciseId: `song:${refId}:l1:gap`, context: 'song', skill: 'vocabulary', topicIds: [], refId,
    prompt: 'Hola, ___ amor', userAnswer: 'adios', correctAnswer: 'mi', explanation: { what: '', why: '', rule: '', correct: 'mi', avoid: '' }, count: 1,
    firstAt: '2026-09-01T10:00:00.000Z', lastAt: '2026-09-01T10:00:00.000Z', correctSince: 0,
  });
  const pron = (songId: string): PronAttempt => ({
    at: '2026-09-01T10:00:00.000Z', courseId: 'es', itemId: `${songId}:l1`, context: 'song',
    target: 'Hola, mi amor', method: 'speech-recognition', scorePct: 80, issues: [],
  });

  it('bleiben ohne Synchronisierung lokal, gehen mit ihr hoch und werden beim Ausschalten entfernt', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('settings', 'main', settings(false));
    a.store.appendEvent('answers', answer('user.t1'), 'ans-own');
    a.store.appendEvent('answers', answer('song.es.demo'), 'ans-demo');
    a.store.putRecord('errorEntries', 'es:song:user.t1:l1:gap', error('user.t1'));
    a.store.appendEvent('pronAttempts', pron('user.t1'), 'pron-own');
    await sync(a);
    expect(cloud.get(USER, 'answers', 'ans-own')).toBeUndefined();
    expect(cloud.get(USER, 'answers', 'ans-demo')).toBeTruthy();
    expect(cloud.count(USER, 'errorEntries')).toBe(0);
    expect(cloud.count(USER, 'pronAttempts')).toBe(0);
    expect(a.store.useDataStore.getState().tables.answers['ans-own'].localOnly).toBe(true);
    expect(a.sync.useSyncStore.getState().pendingCount).toBe(0);

    await a.sync.setUserTextsSync(true);
    await sync(a);
    expect(cloud.get(USER, 'answers', 'ans-own')).toBeTruthy();
    expect(cloud.get(USER, 'errorEntries', 'es:song:user.t1:l1:gap')).toBeTruthy();
    expect(cloud.get(USER, 'pronAttempts', 'pron-own')).toBeTruthy();

    await a.sync.setUserTextsSync(false);
    await sync(a);
    expect(cloud.get(USER, 'answers', 'ans-own')).toBeUndefined();
    expect(cloud.get(USER, 'answers', 'ans-demo')).toBeTruthy(); // Katalog-Songs bleiben
    expect(cloud.count(USER, 'errorEntries')).toBe(0);
    expect(cloud.count(USER, 'pronAttempts')).toBe(0);
    expect(a.store.getRecord('errorEntries', 'es:song:user.t1:l1:gap')?.prompt).toBe('Hola, ___ amor'); // lokal erhalten
  });

  it('Selbstheilung: früher hochgeladene Übungsdaten eigener Texte werden aus der Cloud entfernt', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    a.store.putRecord('settings', 'main', settings(false));
    await sync(a);
    await cloud.push(USER, [
      { collection: 'answers', id: 'old-1', data: answer('user.t9'), updatedAt: '2026-09-01T10:00:00.000Z' },
      { collection: 'pronAttempts', id: 'old-2', data: pron('user.t9'), updatedAt: '2026-09-01T10:00:00.000Z' },
    ]);
    await sync(a);
    expect(cloud.count(USER, 'answers')).toBe(0);
    expect(cloud.count(USER, 'pronAttempts')).toBe(0);
    expect(a.store.useDataStore.getState().tables.pronAttempts['old-2'].localOnly).toBe(true);
  });
});

describe('Upload/Download großer Datenmengen', () => {
  it('teilt Uploads nach Größe auf; übergroße Einträge (UTF-8-Bytes) bleiben mit Hinweis lokal', async () => {
    const cloud = new MemoryCloudAdapter();
    const a = await device(cloud);
    for (let i = 0; i < 6; i++) {
      a.store.putRecord('songNotes', `song.es.demo:n${i}`, { songId: 'song.es.demo', text: 'x'.repeat(190_000) });
    }
    // 150 000 Zeichen, aber 300 000 Bytes → zu groß
    a.store.putRecord('songNotes', 'song.es.demo:big', { songId: 'song.es.demo', text: 'ä'.repeat(150_000) });
    const before = cloud.pushCalls;
    await sync(a);
    expect(cloud.count(USER, 'songNotes')).toBe(6);
    expect(cloud.pushCalls - before).toBe(2); // 5 × ~190 KB, dann 1
    expect(cloud.get(USER, 'songNotes', 'song.es.demo:big')).toBeUndefined();
    expect(a.store.getRecord('songNotes', 'song.es.demo:big')).toBeTruthy();
    expect(a.sync.useSyncStore.getState().warning).toBeTruthy();
    expect(a.sync.getSyncStatus().state).toBe('idle');
  });

  it('Pull blättert über Seiten mit gleichem Zeitstempel, ohne Datensätze zu verlieren', async () => {
    const cloud = new MemoryCloudAdapter();
    cloud.sharedClockPerPush = true;
    const events = Array.from({ length: 1500 }, (_, i) => ({
      collection: 'xpEvents' as const, id: `e${String(i).padStart(4, '0')}`,
      data: { at: '2026-09-01T10:00:00.000Z', amount: 1, reason: 'exercise' as const }, updatedAt: '2026-09-01T10:00:00.000Z',
    }));
    await cloud.push(USER, events); // eine Zeitmarke für alle 1500 Zeilen
    await cloud.push(USER, [{ ...events[0], id: 'late' }]);
    const b = await device(cloud);
    await sync(b);
    expect(b.store.listRecords('xpEvents')).toHaveLength(1501);
  });
});
