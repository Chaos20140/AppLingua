/**
 * Einstellungen, Profil und aktiver Kurs.
 * Gespeichert als Einzeldatensätze: settings/'settings', profile/'profile', courseState/<courseId>.
 */
import { useMemo } from 'react';
import type {
  CourseId, CourseState, EsVariant, PartnerPrefs, Profile, Settings, SongPrefs, Variant,
} from '../core/types';
import { getRecord, nowIso, putRecord, useRecord } from '../data/store';
import './mergers';

export const SETTINGS_ID = 'settings';
export const PROFILE_ID = 'profile';

export const DEFAULT_SETTINGS: Settings = {
  activeCourse: 'es',
  esVariant: 'es-LA',
  theme: 'system',
  dailyGoalXp: 50,
  ttsRate: 0.95,
  ttsSlowRate: 0.65,
  showIPA: false,
  autoplayAudio: true,
  soundEffects: true,
  reducedMotion: 'system',
  strictAccents: false,
  storeRecordings: false,
  embedConsent: { youtube: false, spotify: false, appleMusic: false },
  partner: { level: 'Einsteiger', formal: false, speed: 'langsam', correction: 'sofort', translations: true },
  songs: {
    explicitFilter: true,
    preferredGenres: [],
    preferredArtists: [],
    speed: 'egal',
    colloquial: 'egal',
    showTranslation: true,
    showPhonetic: true,
    syncUserTexts: false,
  },
};

/** Auswahl für das Tagesziel (XP). */
export const DAILY_GOAL_OPTIONS = [
  { xp: 20, label: 'Locker', description: 'ca. 5 Minuten am Tag' },
  { xp: 50, label: 'Normal', description: 'ca. 10 Minuten am Tag' },
  { xp: 100, label: 'Ernsthaft', description: 'ca. 20 Minuten am Tag' },
  { xp: 150, label: 'Intensiv', description: 'ca. 30 Minuten am Tag' },
] as const;

export type SettingsPatch = Partial<Omit<Settings, 'embedConsent' | 'partner' | 'songs'>> & {
  embedConsent?: Partial<Settings['embedConsent']>;
  partner?: Partial<PartnerPrefs>;
  songs?: Partial<SongPrefs>;
};

const clamp = (v: unknown, min: number, max: number, fallback: number) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, n));
};
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback;

/** Vervollständigt gespeicherte (evtl. ältere/teilweise) Einstellungen mit Standardwerten und prüft Wertebereiche. */
export function mergeSettings(stored?: Partial<Settings> | SettingsPatch | null): Settings {
  const s = (stored ?? {}) as SettingsPatch;
  const d = DEFAULT_SETTINGS;
  return {
    ...d,
    ...s,
    activeCourse: oneOf(s.activeCourse, ['es', 'pt-BR'] as const, d.activeCourse),
    esVariant: oneOf(s.esVariant, ['es-ES', 'es-LA'] as const, d.esVariant),
    theme: oneOf(s.theme, ['system', 'light', 'dark'] as const, d.theme),
    reducedMotion: oneOf(s.reducedMotion, ['system', 'on', 'off'] as const, d.reducedMotion),
    dailyGoalXp: Math.round(clamp(s.dailyGoalXp, 10, 500, d.dailyGoalXp)),
    ttsRate: clamp(s.ttsRate, 0.8, 1.1, d.ttsRate),
    ttsSlowRate: clamp(s.ttsSlowRate, 0.5, 0.8, d.ttsSlowRate),
    embedConsent: { ...d.embedConsent, ...(s.embedConsent ?? {}) },
    partner: { ...d.partner, ...(s.partner ?? {}) },
    songs: { ...d.songs, ...(s.songs ?? {}) },
  } as Settings;
}

/** Aktuelle Einstellungen (imperativ, z. B. in Aktionen). */
export const getSettings = (): Settings => mergeSettings(getRecord('settings', SETTINGS_ID));

export function useSettings(): Settings {
  const stored = useRecord('settings', SETTINGS_ID);
  return useMemo(() => mergeSettings(stored), [stored]);
}

/** Einstellungen ändern (verschachtelte Objekte werden feldweise zusammengeführt). */
export function updateSettings(patch: SettingsPatch): Settings {
  const cur = getSettings();
  const next = mergeSettings({
    ...cur,
    ...patch,
    embedConsent: { ...cur.embedConsent, ...(patch.embedConsent ?? {}) },
    partner: { ...cur.partner, ...(patch.partner ?? {}) },
    songs: { ...cur.songs, ...(patch.songs ?? {}) },
  });
  putRecord('settings', SETTINGS_ID, next);
  return next;
}

// ───────────────────────── Profil ─────────────────────────

export const DEFAULT_PROFILE: Profile = { displayName: '', createdAt: '', onboardingDone: false };

export const getProfile = (): Profile => ({ ...DEFAULT_PROFILE, ...(getRecord('profile', PROFILE_ID) ?? {}) });

export function useProfile(): Profile {
  const stored = useRecord('profile', PROFILE_ID);
  return useMemo(() => ({ ...DEFAULT_PROFILE, ...(stored ?? {}) }), [stored]);
}

export function updateProfile(patch: Partial<Profile>): Profile {
  const prev = getRecord('profile', PROFILE_ID);
  const next: Profile = { ...DEFAULT_PROFILE, ...(prev ?? {}), ...patch };
  if (!next.createdAt) next.createdAt = nowIso();
  next.displayName = (next.displayName ?? '').trim().slice(0, 40);
  putRecord('profile', PROFILE_ID, next);
  return next;
}

// ───────────────────────── Kurs & Variante ─────────────────────────

export function variantOf(settings: Pick<Settings, 'esVariant'>, courseId: CourseId): Variant {
  return courseId === 'pt-BR' ? 'pt-BR' : settings.esVariant;
}

/** Sprachcode für die Sprachausgabe/-erkennung. */
export function ttsLangFor(variant: Variant): 'es-ES' | 'es-MX' | 'pt-BR' {
  if (variant === 'pt-BR') return 'pt-BR';
  return variant === 'es-ES' ? 'es-ES' : 'es-MX';
}

export const VARIANT_LABELS: Record<Variant, string> = {
  'es-ES': 'Spanisch (Spanien)',
  'es-LA': 'Spanisch (Lateinamerika)',
  'pt-BR': 'Portugiesisch (Brasilien)',
};

export const useActiveCourse = (): CourseId => useSettings().activeCourse;

export function useVariant(courseId?: CourseId): Variant {
  const s = useSettings();
  return variantOf(s, courseId ?? s.activeCourse);
}

export function setEsVariant(v: EsVariant) {
  updateSettings({ esVariant: v });
}

export const defaultCourseState = (courseId: CourseId): CourseState => ({ courseId, currentStageId: 'stage0' });

export const getCourseState = (courseId: CourseId): CourseState =>
  getRecord('courseState', courseId) ?? defaultCourseState(courseId);

export function useCourseState(courseId: CourseId): CourseState {
  const stored = useRecord('courseState', courseId);
  return useMemo(() => stored ?? defaultCourseState(courseId), [stored, courseId]);
}

export function updateCourseState(courseId: CourseId, patch: Partial<Omit<CourseState, 'courseId'>>): CourseState {
  const next: CourseState = { ...getCourseState(courseId), ...patch, courseId };
  putRecord('courseState', courseId, next);
  return next;
}

/** Aktiven Kurs wechseln (legt den Kurszustand bei Bedarf an). */
export function setActiveCourse(id: CourseId) {
  if (!getRecord('courseState', id)) putRecord('courseState', id, defaultCourseState(id));
  updateSettings({ activeCourse: id });
}
