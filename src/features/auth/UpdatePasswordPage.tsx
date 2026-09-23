import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, LinkIcon } from 'lucide-react';
import { Button, Card, Spinner } from '../../ui';
import { useAuth, validatePassword } from '../../data/auth';
import { AuthLayout, CloudUnavailable, FormAlert } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { authErrorMessage } from './authHelpers';
import s from './Auth.module.css';

/** Fehler aus dem Recovery-Link (Supabase hängt ?error=… bzw. #error=… an). */
function linkErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = q.get('error_code') ?? h.get('error_code');
  const err = q.get('error') ?? h.get('error');
  if (!code && !err) return null;
  return 'Der Link ist abgelaufen oder wurde bereits benutzt. Fordere bitte einen neuen an.';
}

export default function UpdatePasswordPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toLogin = () => navigate('/anmelden', { state: { from: '/passwort-neu' } });
  const linkError = useMemo(linkErrorFromUrl, []);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [errors, setErrors] = useState<{ password?: string; repeat?: string }>({});
  const [error, setError] = useState<{ message: string; reauth: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [slow, setSlow] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);
  const repeatRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (auth.status !== 'loading') return;
    const t = window.setTimeout(() => setSlow(true), 12_000);
    return () => window.clearTimeout(t);
  }, [auth.status]);

  if (!auth.available) {
    return (
      <AuthLayout title="Neues Passwort" icon={<KeyRound size={30} />}>
        <CloudUnavailable />
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Passwort geändert" icon={<CheckCircle2 size={34} />} iconTone="success" focusTitle back={false}
        subtitle="Ab sofort meldest du dich mit deinem neuen Passwort an.">
        <div className={s.actions}>
          <Button size="lg" block to="/dashboard" replace>Weiterlernen</Button>
        </div>
      </AuthLayout>
    );
  }

  if (linkError && auth.status !== 'signed-in') {
    return (
      <AuthLayout title="Link ungültig" icon={<LinkIcon size={30} />} iconTone="danger" subtitle={linkError} back="/anmelden">
        <div className={s.actions}>
          <Button size="lg" block to="/passwort-vergessen" replace>Neuen Link anfordern</Button>
          <Button variant="ghost" block to="/anmelden" replace>Zur Anmeldung</Button>
        </div>
      </AuthLayout>
    );
  }

  if (auth.status === 'loading') {
    return (
      <AuthLayout title="Link wird geprüft …" icon={<KeyRound size={30} />} back={false}>
        <div className={s.center} role="status" aria-live="polite">
          <Spinner size={28} label={null} />
          <p>{slow ? 'Das dauert ungewöhnlich lange. Prüfe deine Internetverbindung.' : 'Einen Moment bitte.'}</p>
          {slow && <Button variant="secondary" onClick={() => window.location.reload()}>Neu laden</Button>}
        </div>
      </AuthLayout>
    );
  }

  if (auth.status !== 'signed-in') {
    return (
      <AuthLayout
        title="Bitte erneut anmelden"
        icon={<KeyRound size={30} />}
        iconTone="info"
        subtitle="Um ein neues Passwort festzulegen, öffne den Link aus der E-Mail – oder melde dich an und ändere es im Profil."
      >
        <div className={s.actions}>
          <Button size="lg" block to="/passwort-vergessen">Link zum Zurücksetzen anfordern</Button>
          <Button variant="ghost" block onClick={toLogin}>Anmelden</Button>
        </div>
      </AuthLayout>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const pwErr = validatePassword(password);
    const repErr = !pwErr && password !== repeat ? 'Die Passwörter stimmen nicht überein.' : null;
    setErrors({ password: pwErr ?? undefined, repeat: repErr ?? undefined });
    if (pwErr) { pwRef.current?.focus(); return; }
    if (repErr) { repeatRef.current?.focus(); return; }
    setBusy(true);
    try {
      await auth.updatePassword(password);
      setDone(true);
    } catch (err) {
      const kind = (err as { kind?: string } | null)?.kind;
      setError({ message: authErrorMessage(err), reauth: kind === 'reauth-needed' || kind === 'session-missing' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={auth.recovery ? 'Neues Passwort festlegen' : 'Passwort ändern'}
      icon={<KeyRound size={30} />}
      subtitle={auth.user?.email ? `Für ${auth.user.email}` : undefined}
    >
      <form className={s.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
        <FormAlert message={error?.message ?? null} />
        {error?.reauth && (
          <Card tone="muted">
            <div className={s.actions}>
              <Button variant="secondary" block to="/passwort-vergessen">Bestätigungslink per E-Mail anfordern</Button>
            </div>
          </Card>
        )}
        <PasswordField
          ref={pwRef}
          label="Neues Passwort"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          enterKeyHint="next"
          error={errors.password}
          showStrength
        />
        <PasswordField
          ref={repeatRef}
          label="Neues Passwort wiederholen"
          value={repeat}
          onChange={setRepeat}
          autoComplete="new-password"
          enterKeyHint="done"
          error={errors.repeat}
        />
        <Button type="submit" size="lg" block loading={busy}>
          Passwort speichern
        </Button>
      </form>
    </AuthLayout>
  );
}
