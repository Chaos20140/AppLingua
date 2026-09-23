import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserCheck } from 'lucide-react';
import { Button, Card, Spinner, TextField } from '../../ui';
import { useAuth, validateEmail } from '../../data/auth';
import { AuthLayout, CloudUnavailable, FormAlert } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { authErrorMessage, safeFrom, settleAfterSignIn } from './authHelpers';
import s from './Auth.module.css';

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-2.99-.79-1.54.02-2.96.9-3.75 2.27-1.6 2.78-.41 6.89 1.15 9.14.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.66ZM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.76-.96 2.8 1.02.08 2.05-.51 2.68-1.28Z" />
    </svg>
  );
}

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeFrom(location.state);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'password' | 'apple' | 'sync' | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (!auth.available) {
    return (
      <AuthLayout title="Anmelden" subtitle="Mit einem Konto lernst du auf allen Geräten weiter.">
        <CloudUnavailable />
      </AuthLayout>
    );
  }

  if (busy === 'sync') {
    return (
      <AuthLayout title="Willkommen zurück!" icon={<UserCheck size={32} />} iconTone="success" back={false}>
        <div className={s.center} role="status" aria-live="polite">
          <Spinner size={28} label={null} />
          <p>Dein Fortschritt wird geladen …</p>
        </div>
      </AuthLayout>
    );
  }

  if (auth.status === 'signed-in' && auth.user) {
    return (
      <AuthLayout title="Du bist angemeldet" icon={<UserCheck size={32} />} iconTone="success" subtitle={auth.user.email}>
        <Card padding="lg">
          <div className={s.actions}>
            <Button size="lg" block to={from ?? '/'} replace>Weiter</Button>
            <Button variant="ghost" block to="/profil">Konto im Profil verwalten</Button>
          </div>
        </Card>
      </AuthLayout>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const emailErr = validateEmail(email);
    const pwErr = password ? null : 'Bitte gib dein Passwort ein.';
    setFieldErrors({ email: emailErr ?? undefined, password: pwErr ?? undefined });
    if (emailErr) { emailRef.current?.focus(); return; }
    if (pwErr) { passwordRef.current?.focus(); return; }
    setBusy('password');
    try {
      await auth.signIn(email, password);
      setBusy('sync');
      await settleAfterSignIn();
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  };

  const onApple = async () => {
    if (busy) return;
    setError(null);
    setBusy('apple');
    try {
      await auth.signInWithApple();
      // Weiterleitung zu Apple läuft – Seite wird verlassen.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(null);
    }
  };

  return (
    <AuthLayout title="Willkommen zurück" subtitle="Melde dich an, um deinen Fortschritt auf allen Geräten zu nutzen.">
      <form className={s.form} onSubmit={onSubmit} noValidate aria-busy={busy !== null}>
        <FormAlert message={error} />
        <TextField
          ref={emailRef}
          label="E-Mail-Adresse"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />
        <PasswordField
          ref={passwordRef}
          label="Passwort"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={fieldErrors.password}
        />
        <div className={s.rowEnd}>
          <Link className={s.textLink} to="/passwort-vergessen">Passwort vergessen?</Link>
        </div>
        <Button type="submit" size="lg" block loading={busy === 'password'} disabled={busy !== null && busy !== 'password'} icon={<LogIn size={20} />}>
          Anmelden
        </Button>
      </form>

      {auth.appleAvailable && (
        <>
          <div className={s.divider}>oder</div>
          <button type="button" className={s.apple} onClick={onApple} disabled={busy !== null}>
            {busy === 'apple' ? <Spinner size={18} label={null} /> : <AppleLogo />}
            Mit Apple anmelden
          </button>
        </>
      )}

      <p className={s.footnote}>
        Noch kein Konto?{' '}
        <Link className={s.textLink} to="/registrieren" state={from ? { from } : undefined}>Jetzt registrieren</Link>
      </p>
    </AuthLayout>
  );
}
