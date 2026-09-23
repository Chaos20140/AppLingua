/**
 * Supabase-Implementierung von CloudAdapter (Tabelle public.user_records) und AuthProvider.
 * Schema: supabase/migrations/20260921000000_init.sql
 * Wird nur per dynamischem Import geladen (./lazySupabase.ts) – im Lokalen Modus nie.
 */
import {
  FunctionsFetchError, FunctionsHttpError, FunctionsRelayError,
  isAuthApiError, isAuthError, isAuthRetryableFetchError, isAuthSessionMissingError,
  type AuthChangeEvent as SbAuthEvent, type PostgrestError, type SupabaseClient, type User,
} from '@supabase/supabase-js';
import { COLLECTIONS, type AuthUser, type CollectionName, type StoredRecord } from '../../core/types';
import { AUTH_STORAGE_KEY } from '../supabase';
import {
  CloudError, type AuthChangeEvent, type AuthProvider, type CloudAdapter, type CloudErrorKind,
  type PullPage, type PullRequest, type SignUpResult,
} from './adapter';

const TABLE = 'user_records';
const COLUMNS = 'collection,id,data,updated_at,deleted,server_updated_at';

interface Row {
  collection: string;
  id: string;
  data: unknown;
  updated_at: string;
  deleted: boolean;
  server_updated_at: string;
}

// ───────────────────────── Fehlerabbildung ─────────────────────────
function offlineNow(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function postgrestError(error: PostgrestError | null, status: number): CloudError | null {
  if (!error && status < 400) return null;
  const code = error?.code ?? '';
  const detail = error?.message ?? `HTTP ${status}`;
  let kind: CloudErrorKind = 'unknown';
  if (status === 0 || offlineNow() || /fetch|network|load failed/i.test(detail) && !code) kind = 'network';
  else if (status === 401 || code === 'PGRST301' || code === 'PGRST303') kind = 'session-missing';
  else if (status === 403 || code === '42501') kind = 'forbidden';
  else if (status === 413 || code === '23514' || code === '54000') kind = 'payload-too-large';
  else if (status === 429) kind = 'rate-limit';
  else if (status >= 500) kind = 'server';
  return new CloudError(kind, detail, status);
}

const AUTH_CODE_KIND: Partial<Record<string, CloudErrorKind>> = {
  invalid_credentials: 'invalid-credentials',
  email_not_confirmed: 'email-not-confirmed',
  over_request_rate_limit: 'rate-limit',
  over_email_send_rate_limit: 'rate-limit',
  over_sms_send_rate_limit: 'rate-limit',
  user_already_exists: 'user-exists',
  email_exists: 'user-exists',
  identity_already_exists: 'user-exists',
  weak_password: 'weak-password',
  same_password: 'same-password',
  session_not_found: 'session-missing',
  session_expired: 'session-missing',
  refresh_token_not_found: 'session-missing',
  refresh_token_already_used: 'session-missing',
  bad_jwt: 'session-missing',
  no_authorization: 'session-missing',
  user_not_found: 'session-missing',
  reauthentication_needed: 'reauth-needed',
  reauthentication_not_valid: 'reauth-needed',
  otp_expired: 'link-expired',
  flow_state_expired: 'link-expired',
  flow_state_not_found: 'link-expired',
  bad_code_verifier: 'link-expired',
  bad_oauth_state: 'link-expired',
  signup_disabled: 'signup-disabled',
  email_provider_disabled: 'signup-disabled',
  email_address_invalid: 'invalid-email',
  email_address_not_authorized: 'invalid-email',
  provider_disabled: 'provider-disabled',
  oauth_provider_not_supported: 'provider-disabled',
  request_timeout: 'network',
};

export function authError(e: unknown): CloudError {
  if (e instanceof CloudError) return e;
  if (offlineNow() || isAuthRetryableFetchError(e)) return new CloudError('network', String((e as Error)?.message ?? e));
  if (isAuthSessionMissingError(e)) return new CloudError('session-missing');
  if (isAuthError(e)) {
    const code = e.code ?? '';
    const status = e.status;
    let kind = AUTH_CODE_KIND[code];
    if (!kind) {
      if (/invalid login credentials/i.test(e.message)) kind = 'invalid-credentials';
      else if (/email not confirmed/i.test(e.message)) kind = 'email-not-confirmed';
      else if (/already registered/i.test(e.message)) kind = 'user-exists';
      else if (/password/i.test(e.message) && code === 'validation_failed') kind = 'weak-password';
      else if (code === 'validation_failed' && /email/i.test(e.message)) kind = 'invalid-email';
      else if (status === 429) kind = 'rate-limit';
      else if (isAuthApiError(e) && (status ?? 0) >= 500) kind = 'server';
      else kind = 'unknown';
    }
    return new CloudError(kind, `${code || 'auth'}: ${e.message}`, status);
  }
  if (e instanceof TypeError) return new CloudError('network', e.message);
  return new CloudError('unknown', String((e as Error)?.message ?? e));
}

async function functionsError(e: unknown): Promise<CloudError> {
  if (e instanceof FunctionsFetchError || e instanceof FunctionsRelayError) return new CloudError('network', e.message);
  if (e instanceof FunctionsHttpError) {
    const res = e.context as Response | undefined;
    const status = res?.status ?? 500;
    let code = '';
    try { code = ((await res?.json()) as { error?: { code?: string } })?.error?.code ?? ''; } catch { /* kein JSON */ }
    if (status === 401 || code === 'unauthorized') return new CloudError('session-missing', code, status);
    if (status === 429) return new CloudError('rate-limit', code, status);
    if (status === 403) return new CloudError('forbidden', code, status);
    return new CloudError(status >= 500 ? 'server' : 'unknown', code || `HTTP ${status}`, status);
  }
  return authError(e);
}

// ───────────────────────── CloudAdapter ─────────────────────────
function toRow(userId: string, r: StoredRecord) {
  return {
    user_id: userId,
    collection: r.collection,
    id: r.id,
    // Gelöschte Datensätze tragen keine Inhalte mehr in die Cloud (Datensparsamkeit).
    data: r.deleted ? {} : r.data,
    updated_at: r.updatedAt,
    deleted: Boolean(r.deleted),
  };
}

function fromRow(row: Row): StoredRecord | null {
  if (!(COLLECTIONS as string[]).includes(row.collection)) return null;
  const t = Date.parse(row.updated_at);
  if (Number.isNaN(t)) return null;
  const rec: StoredRecord = {
    collection: row.collection as CollectionName,
    id: row.id,
    data: row.data as StoredRecord['data'],
    // Postgres liefert "+00:00" – lokal wird immer toISOString() (…Z) verglichen.
    updatedAt: new Date(t).toISOString(),
  };
  if (row.deleted) rec.deleted = true;
  return rec;
}

export function createSupabaseCloudAdapter(sb: SupabaseClient): CloudAdapter {
  return {
    id: 'supabase',
    async push(userId, records) {
      if (!records.length) return;
      const { error, status } = await sb
        .from(TABLE)
        .upsert(records.map((r) => toRow(userId, r)), { onConflict: 'user_id,collection,id' });
      const err = postgrestError(error, status);
      if (err) throw err;
    },
    async pull(userId, req: PullRequest): Promise<PullPage> {
      let q = sb.from(TABLE).select(COLUMNS).eq('user_id', userId);
      if (req.since) q = q.gte('server_updated_at', req.since);
      const { data, error, status } = await q
        .order('server_updated_at', { ascending: true })
        .order('collection', { ascending: true })
        .order('id', { ascending: true })
        .range(req.offset, req.offset + req.limit - 1);
      const err = postgrestError(error, status);
      if (err) throw err;
      const rows = (data ?? []) as Row[];
      const records: StoredRecord[] = [];
      for (const row of rows) {
        const rec = fromRow(row);
        if (rec) records.push(rec);
      }
      const last = rows.length ? rows[rows.length - 1].server_updated_at : null;
      return { records, rowCount: rows.length, lastServerUpdatedAt: last ? new Date(Date.parse(last)).toISOString() : null };
    },
    async purgeCollection(userId, collection, idPrefix, dataField) {
      if (dataField !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(dataField)) throw new CloudError('unknown', 'invalid data field');
      let q = sb.from(TABLE).delete().eq('user_id', userId).eq('collection', collection);
      // LIKE-Platzhalter (%, _, \) im Präfix wörtlich nehmen; mit dataField wird data->>Feld verglichen.
      if (idPrefix) q = q.like(dataField ? `data->>${dataField}` : 'id', `${idPrefix.replace(/[\\%_]/g, '\\$&')}%`);
      const { error, status } = await q;
      const err = postgrestError(error, status);
      if (err) throw err;
    },
  };
}

// ───────────────────────── AuthProvider ─────────────────────────
/** Entfernt die gespeicherte Supabase-Sitzung dieses Geräts (Abmelden ohne Netz). */
function forgetLocalSession() {
  try {
    for (const suffix of ['', '-code-verifier', '-user']) localStorage.removeItem(AUTH_STORAGE_KEY + suffix);
  } catch { /* Speicher nicht verfügbar – dann gibt es auch keine gespeicherte Sitzung */ }
}

export function toAuthUser(u: User): AuthUser {
  const p = u.app_metadata?.provider;
  return { id: u.id, email: u.email ?? undefined, provider: p === 'email' ? 'email' : p === 'apple' ? 'apple' : 'other' };
}

const EVENT_MAP: Partial<Record<SbAuthEvent, AuthChangeEvent>> = {
  INITIAL_SESSION: 'initial',
  SIGNED_IN: 'signed-in',
  SIGNED_OUT: 'signed-out',
  TOKEN_REFRESHED: 'token-refreshed',
  USER_UPDATED: 'user-updated',
  PASSWORD_RECOVERY: 'password-recovery',
  MFA_CHALLENGE_VERIFIED: 'user-updated',
};

export function createSupabaseAuthProvider(sb: SupabaseClient): AuthProvider {
  return {
    id: 'supabase',
    async getSessionUser() {
      const { data, error } = await sb.auth.getSession();
      if (error) throw authError(error);
      return data.session?.user ? toAuthUser(data.session.user) : null;
    },
    onChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        const mapped = EVENT_MAP[event];
        if (!mapped) return;
        const user = session?.user ? toAuthUser(session.user) : null;
        // Nicht synchron im Callback weiterarbeiten (Supabase empfiehlt Entkopplung).
        setTimeout(() => cb(mapped, user), 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signUp(email, password, emailRedirectTo): Promise<SignUpResult> {
      try {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo } });
        if (error) throw error;
        if (data.session?.user) return { status: 'signed-in', user: toAuthUser(data.session.user) };
        // Ohne Sitzung: Bestätigung nötig. (Bei bereits registrierter Adresse verrät Supabase das
        // absichtlich nicht – die UI formuliert die Meldung entsprechend neutral.)
        return { status: 'confirm-email', user: data.user ? toAuthUser(data.user) : null };
      } catch (e) { throw authError(e); }
    },
    async signIn(email, password) {
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return toAuthUser(data.user);
      } catch (e) { throw authError(e); }
    },
    async signInWithOAuth(provider, redirectTo) {
      try {
        const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
        if (error) throw error;
      } catch (e) { throw authError(e); }
    },
    async resetPassword(email, redirectTo) {
      try {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
      } catch (e) { throw authError(e); }
    },
    async updatePassword(password) {
      try {
        const { error } = await sb.auth.updateUser({ password });
        if (error) throw error;
      } catch (e) { throw authError(e); }
    },
    async signOut() {
      try {
        const { error } = await sb.auth.signOut({ scope: 'local' });
        if (error) throw error;
      } catch (e) {
        const err = authError(e);
        // Sitzung existiert serverseitig nicht mehr → lokal gilt man trotzdem als abgemeldet.
        if (err.kind === 'session-missing') return;
        // Offline: Abmelden auf diesem Gerät muss trotzdem möglich sein (gemeinsam genutzte Geräte).
        // Die lokale Sitzung wird entfernt; das Refresh-Token verfällt serverseitig von selbst.
        if (err.kind === 'network') { forgetLocalSession(); return; }
        throw err;
      }
    },
    async deleteAccount() {
      const { error } = await sb.functions.invoke('delete-account', { body: { confirm: true }, timeout: 30_000 });
      if (error) throw await functionsError(error);
    },
  };
}
