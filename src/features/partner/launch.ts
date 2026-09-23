/** Übergabe der Gesprächseinstellungen vom Setup an die Chat-Seite (Router-State, nie in der URL). */
import type { LanguageLevel, PartnerPrefs } from '../../core/types';
import type { ChatMode } from './useConversation';

export interface PartnerLaunchState {
  prefs: PartnerPrefs;
  mode: ChatMode;
  topic?: string;
}

export const LANGUAGE_LEVELS: LanguageLevel[] = ['Einsteiger', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native Mastery'];
const SPEEDS: PartnerPrefs['speed'][] = ['langsam', 'normal', 'schnell'];
const CORRECTIONS: PartnerPrefs['correction'][] = ['sofort', 'danach'];

/** Prüft den Router-State defensiv (z. B. nach Neuladen oder bei alten Verlaufseinträgen). */
export function readLaunchState(raw: unknown): PartnerLaunchState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const p = r.prefs as Record<string, unknown> | undefined;
  if (!p || typeof p !== 'object') return null;
  if (!LANGUAGE_LEVELS.includes(p.level as LanguageLevel)) return null;
  if (!SPEEDS.includes(p.speed as PartnerPrefs['speed']) || !CORRECTIONS.includes(p.correction as PartnerPrefs['correction'])) return null;
  const mode: ChatMode = r.mode === 'ai' ? 'ai' : 'offline';
  const prefs: PartnerPrefs = {
    level: p.level as LanguageLevel,
    formal: p.formal === true,
    speed: p.speed as PartnerPrefs['speed'],
    correction: p.correction as PartnerPrefs['correction'],
    translations: p.translations !== false,
  };
  const topic = typeof r.topic === 'string' && r.topic.trim() ? r.topic.trim().slice(0, 80) : undefined;
  return { prefs, mode, ...(topic ? { topic } : {}) };
}

export const SPEED_LABEL: Record<PartnerPrefs['speed'], string> = { langsam: 'Langsam', normal: 'Normal', schnell: 'Schnell' };

export function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
