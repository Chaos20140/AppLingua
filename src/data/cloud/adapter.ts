/**
 * Austauschbare Cloud-Schnittstellen.
 *
 * Die Sync-Engine und die Konto-Logik kennen nur diese Interfaces – nicht Supabase selbst.
 * Ein anderer Anbieter (z. B. Firebase) braucht nur eine eigene Implementierung von
 * `CloudAdapter` und `AuthProvider`.
 */
import type { AuthUser, CollectionName, StoredRecord } from '../../core/types';
import type { RecordKey } from '../store';

// ───────────────────────── Fehler ─────────────────────────
export type CloudErrorKind =
  | 'network'              // keine Verbindung / Zeitüberschreitung
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'rate-limit'
  | 'user-exists'
  | 'weak-password'
  | 'same-password'
  | 'session-missing'      // Sitzung abgelaufen / nicht angemeldet
  | 'reauth-needed'
  | 'link-expired'
  | 'signup-disabled'
  | 'invalid-email'
  | 'provider-disabled'
  | 'not-configured'
  | 'forbidden'            // RLS / fehlende Rechte
  | 'payload-too-large'
  | 'server'
  | 'unknown';

/** Anbieterunabhängiger Fehler; die deutsche Meldung entsteht erst in auth/errors.ts. */
export class CloudError extends Error {
  readonly kind: CloudErrorKind;
  readonly status?: number;
  constructor(kind: CloudErrorKind, detail?: string, status?: number) {
    super(detail ? `${kind}: ${detail}` : kind);
    this.name = 'CloudError';
    this.kind = kind;
    this.status = status;
  }
}

/** Auch über Modul-/Bundle-Grenzen hinweg zuverlässig (Duck-Typing statt nur instanceof). */
export function cloudErrorKind(e: unknown): CloudErrorKind | null {
  if (e instanceof CloudError) return e.kind;
  if (e && typeof e === 'object' && (e as { name?: unknown }).name === 'CloudError') {
    const kind = (e as { kind?: unknown }).kind;
    if (typeof kind === 'string') return kind as CloudErrorKind;
  }
  return null;
}

export const isCloudError = (e: unknown): e is CloudError => cloudErrorKind(e) !== null;

// ───────────────────────── Daten ─────────────────────────
export interface PullRequest {
  /** nur Datensätze mit server_updated_at >= since (null = alles) */
  since: string | null;
  limit: number;
  offset: number;
}

export interface PullPage {
  records: StoredRecord[];
  /** Anzahl gelieferter Zeilen (inkl. unbekannter Sammlungen, die übersprungen wurden) */
  rowCount: number;
  /** server_updated_at der letzten Zeile (ISO) oder null bei leerer Seite */
  lastServerUpdatedAt: string | null;
}

export interface CloudAdapter {
  readonly id: string;
  /** Upsert (inkl. Soft-Deletes). Ältere Stände verwirft der Server selbst (Trigger). */
  push(userId: string, records: StoredRecord[]): Promise<void>;
  /** Änderungen seit `since`, aufsteigend nach server_updated_at sortiert. */
  pull(userId: string, req: PullRequest): Promise<PullPage>;
  /**
   * Endgültiges Entfernen einer Sammlung aus der Cloud (z. B. eigene Songtexte); mit `idPrefix`
   * nur Datensätze, deren id so beginnt (z. B. 'user.' für Notizen zu eigenen Texten). Mit
   * `dataField` gilt das Präfix stattdessen für dieses Textfeld in `data` (z. B. refId von Antworten).
   */
  purgeCollection(userId: string, collection: CollectionName, idPrefix?: string, dataField?: string): Promise<void>;
}

// ───────────────────────── Konto ─────────────────────────
export type AuthChangeEvent = 'initial' | 'signed-in' | 'signed-out' | 'token-refreshed' | 'user-updated' | 'password-recovery';

export interface SignUpResult {
  /** 'signed-in': Konto sofort aktiv; 'confirm-email': Bestätigungslink wurde (ggf.) verschickt */
  status: 'signed-in' | 'confirm-email';
  user: AuthUser | null;
}

export interface AuthProvider {
  readonly id: string;
  /** Liefert den Nutzer der gespeicherten Sitzung (ohne Netz möglich). */
  getSessionUser(): Promise<AuthUser | null>;
  onChange(cb: (event: AuthChangeEvent, user: AuthUser | null) => void): () => void;
  signUp(email: string, password: string, emailRedirectTo: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signInWithOAuth(provider: 'apple', redirectTo: string): Promise<void>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  /** Meldet nur dieses Gerät ab. */
  signOut(): Promise<void>;
  /** Löscht das Konto samt Cloud-Daten endgültig (serverseitig). */
  deleteAccount(): Promise<void>;
}

export type { RecordKey };
