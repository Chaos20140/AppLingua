/**
 * Konto-Zustand & -Aktionen (zustand). Alle Aktionen werfen `AuthError` mit deutscher Meldung.
 * Ohne Cloud-Konfiguration bleibt der Status dauerhaft 'guest' und jede Aktion erklärt ehrlich,
 * dass Konten erst nach der Einrichtung verfügbar sind.
 */
import { create } from 'zustand';
import type { AuthUser } from '../../core/types';
import { dropAccountBackup, stashAccountData } from '../accountBackup';
import type { AuthProvider, SignUpResult } from '../cloud/adapter';
import { supabaseAuthProvider } from '../cloud/lazySupabase';
import { getLocalDb } from '../db';
import { clearGuestDecision, getPendingGuestDecision } from '../migrateGuest';
import { resetStore } from '../store';
import { appleLoginEnabled, appUrl } from '../supabase';
import { flushSync, getSyncUser, setSyncUser } from '../sync/engine';
import {
  AuthError, CLOUD_NOT_CONFIGURED_MESSAGE, UnsyncedChangesError, cloudErrorMessage, toAuthError,
  validateEmail, validatePassword,
} from './errors';

export type AuthStatus = 'loading' | 'guest' | 'signed-in';

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  /** Konten verfügbar (Cloud eingerichtet)? */
  available: boolean;
  appleAvailable: boolean;
  /** true, nachdem ein Passwort-zurücksetzen-Link geöffnet wurde (→ neues Passwort setzen) */
  recovery: boolean;
  /** Registrierung. 'confirm-email' → UI zeigt „Bitte bestätige deine E-Mail-Adresse“. */
  signUp(email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  /** Leitet zu Apple weiter (nur wenn VITE_ENABLE_APPLE_LOGIN === 'true'). */
  signInWithApple(): Promise<void>;
  /**
   * Abmelden: sichert zuerst alle Änderungen. Bleiben welche ungesichert, wird
   * `UnsyncedChangesError` geworfen – mit `{ force: true }` trotzdem abmelden.
   * Danach werden die Kontodaten vom Gerät entfernt; das Gerät ist wieder im Gastmodus.
   * Ungesicherte Änderungen und nur-lokale eigene Songtexte bleiben kontogebunden (unsichtbar)
   * auf dem Gerät und kommen bei der nächsten Anmeldung desselben Kontos zurück.
   */
  signOut(opts?: { force?: boolean }): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  /** Konto samt Cloud-Daten endgültig löschen (Edge Function delete-account). */
  deleteAccount(): Promise<void>;
}

let provider: AuthProvider | null = supabaseAuthProvider;

/** Für Tests / anderen Anbieter. */
export function configureAuth(p: AuthProvider | null) { provider = p; }

function requireProvider(): AuthProvider {
  if (!provider) throw new AuthError(CLOUD_NOT_CONFIGURED_MESSAGE, 'not-configured');
  return provider;
}

function requireOnline() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AuthError(cloudErrorMessage('network'), 'network');
  }
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); } catch (e) { throw toAuthError(e); }
}

function validation(msg: string | null) {
  if (msg) throw new AuthError(msg, 'validation');
}

/**
 * Lokale Daten des Kontos entfernen → Gerät wieder im Gastmodus.
 * `keepDeviceOnly`: nur-lokale Datensätze (eigene Songtexte) und ungesicherte Änderungen werden
 * vorher kontogebunden auf dem Gerät gesichert und bei der nächsten Anmeldung zurückgespielt.
 */
async function dropLocalAccountData(userId: string, keepDeviceOnly: boolean) {
  const db = getLocalDb();
  if (!db) return;
  const owner = await db.getMeta<string>('owner');
  if (owner === userId) {
    if (keepDeviceOnly) await stashAccountData(db, userId);
    await resetStore();
    await db.setMeta('owner', 'guest');
  }
  if (!keepDeviceOnly) await dropAccountBackup(db, userId);
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: provider ? 'loading' : 'guest',
  available: provider !== null,
  appleAvailable: provider !== null && appleLoginEnabled,
  recovery: false,

  signUp: (email, password) => run(async () => {
    const p = requireProvider();
    validation(validateEmail(email));
    validation(validatePassword(password));
    requireOnline();
    const res = await p.signUp(email.trim(), password, appUrl('auth/callback'));
    if (res.status === 'signed-in' && res.user) set({ user: res.user, status: 'signed-in' });
    return res;
  }),

  signIn: (email, password) => run(async () => {
    const p = requireProvider();
    validation(validateEmail(email));
    if (!password) validation('Bitte gib dein Passwort ein.');
    requireOnline();
    const user = await p.signIn(email.trim(), password);
    set({ user, status: 'signed-in' });
    return user;
  }),

  signInWithApple: () => run(async () => {
    const p = requireProvider();
    if (!appleLoginEnabled) throw new AuthError('Die Anmeldung mit Apple ist in dieser Version nicht aktiviert.', 'provider-disabled');
    requireOnline();
    await p.signInWithOAuth('apple', appUrl('auth/callback'));
  }),

  signOut: ({ force = false } = {}) => run(async () => {
    const p = requireProvider();
    const user = get().user;
    if (!user) return;
    const db = getLocalDb();
    const ownsData = !getPendingGuestDecision() && (await db?.getMeta<string>('owner')) === user.id;
    if (ownsData) {
      if (getSyncUser() !== user.id) setSyncUser(user.id);
      const pending = await flushSync();
      if (pending > 0 && !force) {
        throw new UnsyncedChangesError(pending, typeof navigator !== 'undefined' && navigator.onLine === false);
      }
    }
    setSyncUser(null);
    try {
      await p.signOut();
    } catch (e) {
      if (ownsData) setSyncUser(user.id);
      throw e;
    }
    clearGuestDecision();
    await dropLocalAccountData(user.id, true);
    set({ user: null, status: 'guest', recovery: false });
  }),

  resetPassword: (email) => run(async () => {
    const p = requireProvider();
    validation(validateEmail(email));
    requireOnline();
    await p.resetPassword(email.trim(), appUrl('passwort-neu'));
  }),

  updatePassword: (password) => run(async () => {
    const p = requireProvider();
    validation(validatePassword(password));
    if (!get().user) throw new AuthError(cloudErrorMessage('session-missing'), 'session-missing');
    requireOnline();
    await p.updatePassword(password);
    set({ recovery: false });
  }),

  deleteAccount: () => run(async () => {
    const p = requireProvider();
    const user = get().user;
    if (!user) throw new AuthError(cloudErrorMessage('session-missing'), 'session-missing');
    requireOnline();
    await p.deleteAccount();
    setSyncUser(null);
    try { await p.signOut(); } catch { /* Konto existiert nicht mehr – Sitzung ist ohnehin ungültig */ }
    clearGuestDecision();
    await dropLocalAccountData(user.id, false);
    set({ user: null, status: 'guest', recovery: false });
  }),
}));

// ───────────────────────── Initialisierung ─────────────────────────
let initPromise: Promise<AuthUser | null> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Lädt die gespeicherte Sitzung und abonniert Änderungen. Liefert den Nutzer oder null.
 * Antwortet der Server nicht rechtzeitig, bleibt der Status 'loading', bis Supabase sich meldet.
 */
export function initAuth(): Promise<AuthUser | null> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const p = provider;
    if (!p) { useAuth.setState({ user: null, status: 'guest' }); return null; }
    p.onChange((event, user) => {
      const patch: Partial<AuthState> = { user, status: user ? 'signed-in' : 'guest' };
      if (event === 'password-recovery') patch.recovery = true;
      if (event === 'signed-out') patch.recovery = false;
      useAuth.setState(patch);
    });
    // Passwort-Link geöffnet? (Das Supabase-Ereignis kann vor dem Abonnieren eintreffen.)
    const recoveryLink = typeof window !== 'undefined' && /passwort-neu\/?$/.test(window.location.pathname)
      && /[?&#](code|token_hash|type=recovery)/.test(window.location.search + window.location.hash);
    try {
      const user = await withTimeout(p.getSessionUser(), 4000);
      useAuth.setState({ user, status: user ? 'signed-in' : 'guest', ...(user && recoveryLink ? { recovery: true } : {}) });
      return user;
    } catch (e) {
      if ((e as Error)?.message !== 'timeout') {
        console.warn('[auth] Sitzung konnte nicht geladen werden', e);
        useAuth.setState({ user: null, status: 'guest' });
      }
      return null;
    }
  })();
  return initPromise;
}

/** Nicht-reaktiver Zugriff. */
export const getAuthState = () => useAuth.getState();

/**
 * Für /auth/callback: wertet Fehler aus der URL aus und wartet auf die Sitzung
 * (PKCE-Austausch übernimmt der Supabase-Client beim Start).
 */
export async function completeAuthCallback(): Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }> {
  if (!provider) return { ok: false, message: CLOUD_NOT_CONFIGURED_MESSAGE };
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const errCode = params.get('error_code') ?? hash.get('error_code');
  const hasError = errCode || params.get('error') || hash.get('error');
  const clean = () => { try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch { /* egal */ } };
  if (hasError) {
    clean();
    const expired = errCode === 'otp_expired' || /expired|invalid/i.test(params.get('error_description') ?? hash.get('error_description') ?? '');
    return { ok: false, message: cloudErrorMessage(expired ? 'link-expired' : 'unknown') };
  }
  await initAuth();
  let user: AuthUser | null = null;
  try { user = await withTimeout(provider.getSessionUser(), 10_000); } catch { user = useAuth.getState().user; }
  clean();
  if (user) {
    useAuth.setState({ user, status: 'signed-in' });
    return { ok: true, user };
  }
  return {
    ok: false,
    message: 'Die Anmeldung konnte nicht abgeschlossen werden. Öffne den Link bitte im selben Browser bzw. derselben App, ' +
      'in der du dich registriert hast – oder melde dich einfach mit E-Mail und Passwort an.',
  };
}
