/**
 * Supabase-Client – existiert nur, wenn die Cloud konfiguriert ist
 * (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY bzw. VITE_SUPABASE_PUBLISHABLE_KEY).
 * Ohne Konfiguration läuft die App ehrlich im „Lokalen Modus“ (siehe docs/SETUP-SUPABASE.md).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env;
const url = typeof env.VITE_SUPABASE_URL === 'string' ? env.VITE_SUPABASE_URL.trim() : '';
const key = (() => {
  const k = env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return typeof k === 'string' ? k.trim() : '';
})();

function validUrl(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.hostname === 'localhost' || p.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** true, sobald URL und öffentlicher Schlüssel gesetzt sind. */
export const cloudConfigured: boolean = Boolean(url && key && validUrl(url));

/** Sign in with Apple nur, wenn ausdrücklich aktiviert (Provider muss in Supabase eingerichtet sein). */
export const appleLoginEnabled: boolean = cloudConfigured && env.VITE_ENABLE_APPLE_LOGIN === 'true';

/** localStorage-Schlüssel der Supabase-Sitzung (Präfix auch für -code-verifier / -user). */
export const AUTH_STORAGE_KEY = 'applingua-auth';

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Supabase-Client, erst bei Bedarf erzeugt: `@supabase/supabase-js` (~215 KB) wird per dynamischem
 * Import nur geladen, wenn die Cloud konfiguriert ist – im Lokalen Modus nie.
 * Ein fehlgeschlagener Ladeversuch (z. B. offline ohne Cache) wird beim nächsten Aufruf wiederholt.
 */
export function loadSupabase(): Promise<SupabaseClient | null> {
  if (!cloudConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: AUTH_STORAGE_KEY,
      },
    }));
    clientPromise.catch(() => { clientPromise = null; });
  }
  return clientPromise;
}

/** Absolute URL innerhalb der App (berücksichtigt den GitHub-Pages-Basis-Pfad). */
export function appUrl(path: string): string {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin + base + path.replace(/^\//, '');
}
