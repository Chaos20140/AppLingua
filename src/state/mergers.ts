/**
 * Kompatibilitäts-Modul: Die Merge-Regeln für den Sync liegen ausschließlich in
 * src/data/sync/mergers.ts (eine Quelle, keine konkurrierenden Registrierungen mehr).
 * Der Import aus src/state/settings.ts registriert sie weiterhin früh; der Aufruf ist idempotent.
 */
import { registerSyncMergers } from '../data/sync/mergers';

export {
  mergeBadge, mergeErrorEntry, mergeLessonProgress, mergeSongProgress, mergeVocabCard, registerSyncMergers,
  registerSyncMergers as registerEngineMergers,
} from '../data/sync/mergers';

registerSyncMergers();
