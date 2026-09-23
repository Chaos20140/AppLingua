import { useEffect } from 'react';
import type { CourseId, Settings } from '../core/types';
import { useDataReady } from '../data/store';
import { useActiveCourse, useSettings } from '../state/settings';

/** Hintergrundfarben für <meta name="theme-color"> (entsprechen --bg in tokens.css). */
const THEME_COLOR = { light: '#F7F4EE', dark: '#0D111D' } as const;
const CACHE_KEY = 'applingua.appearance';

interface Appearance {
  theme: Settings['theme'];
  course: CourseId;
  motion: Settings['reducedMotion'];
}

function isAppearance(v: unknown): v is Appearance {
  if (!v || typeof v !== 'object') return false;
  const a = v as Record<string, unknown>;
  return (
    ['system', 'light', 'dark'].includes(a.theme as string) &&
    ['es', 'pt-BR'].includes(a.course as string) &&
    ['system', 'on', 'off'].includes(a.motion as string)
  );
}

function applyThemeColor(theme: Settings['theme']) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    const isDarkMeta = (meta.getAttribute('media') ?? '').includes('dark');
    meta.content = theme === 'system' ? (isDarkMeta ? THEME_COLOR.dark : THEME_COLOR.light) : THEME_COLOR[theme];
  });
}

function applyAppearance({ theme, course, motion }: Appearance) {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  root.setAttribute('data-course', course);
  if (motion === 'on') root.setAttribute('data-motion', 'reduce');
  else if (motion === 'off') root.setAttribute('data-motion', 'full');
  else root.removeAttribute('data-motion');
  applyThemeColor(theme);
}

/**
 * Setzt das zuletzt verwendete Erscheinungsbild sofort beim Start (vor dem Laden der Daten),
 * damit kein Farbwechsel sichtbar ist. Nur eine Bequemlichkeit pro Gerät – Quelle der Wahrheit
 * bleiben die Einstellungen.
 */
export function applyCachedAppearance(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (isAppearance(parsed)) applyAppearance(parsed);
  } catch {
    // Kein Zugriff auf localStorage (privater Modus) – Standard-Erscheinungsbild bleibt.
  }
}

/** Überträgt settings.theme / reducedMotion und den aktiven Kurs auf <html> (data-theme, data-motion, data-course, theme-color). */
export default function ThemeController() {
  const settings = useSettings();
  const course = useActiveCourse();
  const theme = settings?.theme ?? 'system';
  const motion = settings?.reducedMotion ?? 'system';
  const ready = useDataReady();

  useEffect(() => {
    // Vor dem Laden der Daten gilt das zwischengespeicherte Erscheinungsbild (siehe main.tsx).
    if (!ready) return;
    const appearance: Appearance = { theme, course, motion };
    applyAppearance(appearance);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(appearance));
    } catch {
      // ignorieren
    }
  }, [ready, theme, course, motion]);

  return null;
}
