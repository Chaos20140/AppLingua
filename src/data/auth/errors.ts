/**
 * Verständliche deutsche Fehlermeldungen für Konto & Cloud.
 * Alle Auth-Funktionen werfen `AuthError` (message = deutscher Text, kind = maschinenlesbar).
 */
import { cloudErrorKind, type CloudErrorKind } from '../cloud/adapter';

export const CLOUD_NOT_CONFIGURED_MESSAGE =
  'Konten sind in dieser Version noch nicht verfügbar, weil die Cloud noch nicht eingerichtet ist. ' +
  'Du kannst AppLingua trotzdem vollständig im lokalen Modus nutzen – deine Fortschritte bleiben auf diesem Gerät gespeichert.';

const MESSAGES: Record<CloudErrorKind, string> = {
  'network': 'Keine Verbindung zum Server. Prüfe deine Internetverbindung und versuche es erneut.',
  'invalid-credentials': 'E-Mail-Adresse oder Passwort ist falsch.',
  'email-not-confirmed': 'Bitte bestätige zuerst deine E-Mail-Adresse über den Link, den wir dir geschickt haben. Schau auch im Spam-Ordner nach.',
  'rate-limit': 'Zu viele Versuche in kurzer Zeit. Bitte warte ein paar Minuten und versuche es dann erneut.',
  'user-exists': 'Für diese E-Mail-Adresse gibt es bereits ein Konto. Melde dich an oder setze dein Passwort zurück.',
  'weak-password': 'Das Passwort ist zu schwach. Verwende mindestens 8 Zeichen – am besten mit Zahlen und Sonderzeichen.',
  'same-password': 'Das neue Passwort muss sich von deinem bisherigen unterscheiden.',
  'session-missing': 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.',
  'reauth-needed': 'Aus Sicherheitsgründen musst du dich erneut anmelden, bevor du das Passwort ändern kannst.',
  'link-expired': 'Der Link ist abgelaufen oder wurde bereits benutzt. Fordere bitte einen neuen an.',
  'signup-disabled': 'Neue Registrierungen sind derzeit deaktiviert.',
  'invalid-email': 'Bitte gib eine gültige E-Mail-Adresse ein.',
  'provider-disabled': 'Diese Anmeldemethode ist derzeit nicht aktiviert.',
  'not-configured': CLOUD_NOT_CONFIGURED_MESSAGE,
  'forbidden': 'Zugriff verweigert. Bitte melde dich erneut an.',
  'payload-too-large': 'Ein Eintrag ist zu groß für die Cloud und bleibt nur auf diesem Gerät gespeichert.',
  'server': 'Der Server hat gerade ein Problem. Bitte versuche es später erneut.',
  'unknown': 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
};

export function cloudErrorMessage(kind: CloudErrorKind): string {
  return MESSAGES[kind] ?? MESSAGES.unknown;
}

export class AuthError extends Error {
  readonly kind: CloudErrorKind | 'validation' | 'unsynced';
  constructor(message: string, kind: AuthError['kind']) {
    super(message);
    this.name = 'AuthError';
    this.kind = kind;
  }
}

/** Beim Abmelden sind noch nicht gesicherte Änderungen vorhanden. */
export class UnsyncedChangesError extends AuthError {
  readonly pending: number;
  constructor(pending: number, offline: boolean) {
    super(
      (pending === 1 ? '1 Änderung ist' : `${pending} Änderungen sind`) +
        ' noch nicht in deinem Konto gesichert' + (offline ? ', weil du offline bist' : '') + '. ' +
        'Verbinde dich mit dem Internet und warte kurz – oder melde dich trotzdem ab: Dann bleiben sie nur auf diesem Gerät ' +
        'zurückgelegt und werden bei deiner nächsten Anmeldung hier nachgeholt.',
      'unsynced',
    );
    this.name = 'UnsyncedChangesError';
    this.pending = pending;
  }
}

/** Beliebigen Fehler in einen AuthError mit deutscher Meldung umwandeln. */
export function toAuthError(e: unknown): AuthError {
  if (e instanceof AuthError) return e;
  const kind = cloudErrorKind(e);
  if (kind) return new AuthError(cloudErrorMessage(kind), kind);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return new AuthError(MESSAGES.network, 'network');
  console.error('[auth] unerwarteter Fehler', e);
  return new AuthError(MESSAGES.unknown, 'unknown');
}

// ───────────────────────── Eingabeprüfung ─────────────────────────
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt-Grenze bei Supabase (in Bytes – Umlaute zählen doppelt)

/** null = in Ordnung, sonst deutscher Hinweis */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen lang sein.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return `Das Passwort darf höchstens ${PASSWORD_MAX_LENGTH} Zeichen lang sein (Umlaute und Sonderzeichen zählen teils doppelt).`;
  }
  if (!password.trim()) return 'Das Passwort darf nicht nur aus Leerzeichen bestehen.';
  return null;
}

export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return 'Bitte gib deine E-Mail-Adresse ein.';
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return MESSAGES['invalid-email'];
  return null;
}
