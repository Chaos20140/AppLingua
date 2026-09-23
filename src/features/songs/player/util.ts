/** Kleine Hilfen des Song-Players (ohne React-Abhängigkeit). */

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}

/** Reduzierte Bewegung: App-Einstellung (data-motion) vor Systemeinstellung */
export function prefersReducedMotion(): boolean {
  if (typeof document === 'undefined') return false;
  const attr = document.documentElement.getAttribute('data-motion');
  if (attr === 'reduce') return true;
  if (attr === 'full') return false;
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const PREFS_KEY = 'applingua.player.prefs';

/** Geräte-Komfort (Schriftgröße, Anzeige): localStorage, fehlertolerant */
export function readLocalPrefs<T extends object>(fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return fallback;
  }
}

export function writeLocalPrefs(value: object) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(value));
  } catch { /* privater Modus o. Ä. – egal */ }
}
