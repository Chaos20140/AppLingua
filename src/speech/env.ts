/**
 * Gemeinsame Umgebungs- und Einstellungs-Helfer für src/speech/* (intern).
 * Liest Einstellungen direkt aus dem Datenspeicher, damit das Sprachmodul
 * keine Abhängigkeit auf React-Hooks anderer Module braucht.
 */
import { useMemo } from 'react';
import type { Settings } from '../core/types';
import { listRecords, useList } from '../data/store';

export const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

/** iPhone/iPad (inkl. iPadOS, das sich als „Macintosh“ ausgibt). */
export function isIOS(): boolean {
  if (!isBrowser) return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return /Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
}

/** Safari (macOS/iOS) bzw. jede WebKit-Engine auf iOS. */
export function isSafariLike(): boolean {
  if (!isBrowser) return false;
  const ua = navigator.userAgent || '';
  if (isIOS()) return true;
  return /Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\/|OPR\/|Android/.test(ua);
}

/** Als App vom Home-Bildschirm gestartet (PWA-Standalone-Modus). */
export function isStandalone(): boolean {
  if (!isBrowser) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

export function isSecure(): boolean {
  return !isBrowser || window.isSecureContext !== false;
}

// ───────────────────────── Einstellungen ─────────────────────────
export interface SpeechSettings {
  ttsRate: number;
  ttsSlowRate: number;
  soundEffects: boolean;
  storeRecordings: boolean;
  /** Standardsprache für Sprachausgabe/-erkennung laut aktivem Kurs + Variante */
  defaultLang: string;
}

const DEFAULTS: SpeechSettings = {
  ttsRate: 0.95,
  ttsSlowRate: 0.65,
  soundEffects: true,
  storeRecordings: false,
  defaultLang: 'es-ES',
};

function pickSettings(list: { id: string; data: Settings }[]): Partial<Settings> | undefined {
  if (!list.length) return undefined;
  return (list.find((r) => r.id === 'settings' || r.id === 'me' || r.id === 'default') ?? list[0]).data;
}

function toSpeechSettings(s: Partial<Settings> | undefined): SpeechSettings {
  if (!s) return DEFAULTS;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const course = s.activeCourse ?? 'es';
  const defaultLang = course === 'pt-BR' ? 'pt-BR' : s.esVariant === 'es-LA' ? 'es-MX' : 'es-ES';
  return {
    ttsRate: num(s.ttsRate, DEFAULTS.ttsRate),
    ttsSlowRate: num(s.ttsSlowRate, DEFAULTS.ttsSlowRate),
    soundEffects: s.soundEffects ?? DEFAULTS.soundEffects,
    storeRecordings: s.storeRecordings === true,
    defaultLang,
  };
}

/** Aktuelle Einstellungen (imperativ, z. B. in Event-Handlern). */
export function speechSettings(): SpeechSettings {
  try {
    return toSpeechSettings(pickSettings(listRecords('settings')));
  } catch {
    return DEFAULTS;
  }
}

/** Reaktive Variante für Hooks. */
export function useSpeechSettings(): SpeechSettings {
  const list = useList('settings');
  return useMemo(() => toSpeechSettings(pickSettings(list)), [list]);
}

/**
 * Normalisiert Sprach-Tags: 'es_ES' → 'es-ES', 'es-LA' → 'es-MX' (Lateinamerika),
 * 'pt' → 'pt-BR', 'es' → 'es-ES'.
 */
export function normalizeLang(lang: string | undefined): string {
  const raw = (lang || '').trim().replace('_', '-');
  if (!raw) return speechSettings().defaultLang;
  const [base, region] = raw.split('-');
  const b = base.toLowerCase();
  if (b === 'pt') return region && region.toUpperCase() === 'PT' ? 'pt-PT' : 'pt-BR';
  if (b === 'es') {
    if (!region) return 'es-ES';
    const r = region.toUpperCase();
    if (r === 'LA' || r === '419') return 'es-MX';
    return `es-${r}`;
  }
  return region ? `${b}-${region.toUpperCase()}` : b;
}

export const baseLang = (lang: string) => normalizeLang(lang).slice(0, 2) as 'es' | 'pt' | string;
