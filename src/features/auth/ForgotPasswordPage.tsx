import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Inbox, KeyRound, MailCheck } from 'lucide-react';
import { Button, Card, TextField } from '../../ui';
import { useAuth, validateEmail } from '../../data/auth';
import { AuthLayout, CloudUnavailable, FormAlert } from './AuthLayout';
import { authErrorMessage } from './authHelpers';
import s from './Auth.module.css';

const COOLDOWN_SEC = 60;

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState(auth.user?.email ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  if (!auth.available) {
    return (
      <AuthLayout title="Passwort vergessen" icon={<KeyRound size={30} />}>
        <CloudUnavailable />
      </AuthLayout>
    );
  }

  const send = async () => {
    setError(null);
    const err = validateEmail(email);
    setFieldError(err);
    if (err) { emailRef.current?.focus(); return; }
    setBusy(true);
    try {
      await auth.resetPassword(email);
      setSent(true);
      setCooldown(COOLDOWN_SEC);
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) void send();
  };

  if (sent) {
    return (
      <AuthLayout title="Schau in dein Postfach" icon={<MailCheck size={32} />} iconTone="success" focusTitle back="/anmelden">
        <Card padding="lg">
          <p className={s.bodyText}>
            Falls es zu <strong>{email.trim()}</strong> ein Konto gibt, haben wir dir einen Link zum Zurücksetzen geschickt.
            Über den Link legst du ein neues Passwort fest.
          </p>
        </Card>
        <ul className={s.tips}>
          <li><Inbox size={18} aria-hidden="true" />Keine E-Mail? Prüfe den Spam-Ordner und ob die Adresse stimmt.</li>
          <li><Clock size={18} aria-hidden="true" />Der Link ist nur kurze Zeit gültig und funktioniert einmal.</li>
        </ul>
        <FormAlert message={error} />
        <div className={s.actions}>
          <Button size="lg" block to="/anmelden" replace>Zurück zur Anmeldung</Button>
          <Button variant="ghost" block loading={busy} disabled={cooldown > 0} onClick={() => void send()}>
            {cooldown > 0 ? `Erneut senden (in ${cooldown} s)` : 'Link erneut senden'}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Passwort vergessen?"
      icon={<KeyRound size={30} />}
      subtitle="Kein Problem. Gib deine E-Mail-Adresse ein – wir schicken dir einen Link für ein neues Passwort."
    >
      <form className={s.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
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
          enterKeyHint="send"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError}
        />
        <Button type="submit" size="lg" block loading={busy}>
          Link senden
        </Button>
      </form>
      <p className={s.footnote}>
        Doch wieder eingefallen? <Link className={s.textLink} to="/anmelden">Anmelden</Link>
      </p>
    </AuthLayout>
  );
}
