/**
 * Cloud-Adapter und Auth-Provider für Supabase, die ./supabaseAdapter.ts samt
 * `@supabase/supabase-js` erst beim ersten Aufruf nachladen. Ohne Konfiguration sind beide null –
 * dann lädt der Browser im Lokalen Modus kein einziges Byte der Supabase-Bibliothek.
 */
import { cloudConfigured, loadSupabase } from '../supabase';
import { CloudError, type AuthProvider, type CloudAdapter } from './adapter';

interface Loaded {
  cloud: CloudAdapter;
  auth: AuthProvider;
}

let loading: Promise<Loaded> | null = null;

function load(): Promise<Loaded> {
  if (!loading) {
    loading = Promise.all([loadSupabase(), import('./supabaseAdapter')])
      .then(([sb, mod]) => {
        if (!sb) throw new CloudError('unknown', 'Supabase ist nicht konfiguriert.');
        return { cloud: mod.createSupabaseCloudAdapter(sb), auth: mod.createSupabaseAuthProvider(sb) };
      })
      .catch((e: unknown) => {
        loading = null; // nächster Aufruf versucht es erneut (z. B. wieder online)
        throw e instanceof CloudError ? e : new CloudError('network', e instanceof Error ? e.message : String(e));
      });
  }
  return loading;
}

function lazyCloudAdapter(): CloudAdapter {
  return {
    id: 'supabase',
    push: async (userId, records) => (await load()).cloud.push(userId, records),
    pull: async (userId, req) => (await load()).cloud.pull(userId, req),
    purgeCollection: async (userId, collection, idPrefix, dataField) =>
      (await load()).cloud.purgeCollection(userId, collection, idPrefix, dataField),
  };
}

function lazyAuthProvider(): AuthProvider {
  return {
    id: 'supabase',
    getSessionUser: async () => (await load()).auth.getSessionUser(),
    onChange(cb) {
      let off: (() => void) | null = null;
      let cancelled = false;
      load().then(
        ({ auth }) => { if (!cancelled) off = auth.onChange(cb); },
        (e: unknown) => console.warn('[auth] Supabase konnte nicht geladen werden', e),
      );
      return () => {
        cancelled = true;
        off?.();
      };
    },
    signUp: async (email, password, redirectTo) => (await load()).auth.signUp(email, password, redirectTo),
    signIn: async (email, password) => (await load()).auth.signIn(email, password),
    signInWithOAuth: async (provider, redirectTo) => (await load()).auth.signInWithOAuth(provider, redirectTo),
    resetPassword: async (email, redirectTo) => (await load()).auth.resetPassword(email, redirectTo),
    updatePassword: async (password) => (await load()).auth.updatePassword(password),
    signOut: async () => (await load()).auth.signOut(),
    deleteAccount: async () => (await load()).auth.deleteAccount(),
  };
}

export const supabaseCloudAdapter: CloudAdapter | null = cloudConfigured ? lazyCloudAdapter() : null;
export const supabaseAuthProvider: AuthProvider | null = cloudConfigured ? lazyAuthProvider() : null;
