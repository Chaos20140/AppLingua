import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Inbox, Laptop, MailCheck, ShieldAlert, UserPlus } from 'lucide-react';
import { Button, Card, Spinner, TextField } from '../../ui';
import { useAuth, validateEmail, validatePassword } from '../../data/auth';
import { updateProfile, useProfile } from '../../state/settings';
import { AuthLayout, CloudUnavailable, FormAlert } from './AuthLayout';
import { PasswordField } from './PasswordField';
import { authErrorMessage, safeFrom, settleAfterSignIn, useLocalTarget } from './authHelpers';
import s from './Auth.module.css';

type Errors = { email?: string; password?: string; consent?: string };

export default function RegisterPage() {
  const auth = useAuth();
  const profile = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeFrom(location.state);
  const localTarget = useLocalTarget();
  const [name, setName] = useState(profile.displayName);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'busy' | 'sync' | 'confirm'>('form');
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  if (!auth.available) {
    return (
      <AuthLayout title="Konto erstellen" subtitle="Sichere deinen Fortschritt und lerne auf allen Geräten weiter.">
        <CloudUnavailable />
      </AuthLayout>
    );
  }

  if (phase === 'confirm') {
    return (
      <AuthLayout title="Bitte bestätige deine E-Mail" icon={<MailCheck size={32} />} iconTone="success" focusTitle back={false}>
        <Card padding="lg">
          <p className={s.bodyText}>
            Wir haben einen Bestätigungslink an <strong>{email.trim()}</strong> geschickt. Öffne ihn, um dein Konto zu
            aktivieren – danach bist du automatisch angemeldet.
          </p>
        </Card>
        <ul className={s.tips}>
          <li><Inbox size={18} aria-hidden="true" />Nichts angekommen? Schau im Spam- oder Werbung-Ordner nach. Die E-Mail kann ein paar Minuten brauchen.</li>
          <li><Laptop size={18} aria-hidden="true" />Öffne den Link am besten auf diesem Gerät und im selben Browser bzw. in der installierten App.</li>
          <li><ShieldAlert size={18} aria-hidden="true" />Hast du mit dieser Adresse schon ein Konto? Dann melde dich einfach an.</li>
        </ul>
        <div className={s.actions}>
          <Button size="lg" block to={localTarget} replace>Bis dahin weiterlernen</Button>
          <Button variant="secondary" block to="/anmelden" replace>Zur Anmeldung</Button>
          <Button variant="ghost" block onClick={() => { setPhase('form'); setPassword(''); }}>Andere E-Mail-Adresse verwenden</Button>
        </div>
      </AuthLayout>
    );
  }

  if (phase === 'sync') {
    return (
      <AuthLayout title="Konto erstellt!" icon={<UserPlus size={32} />} iconTone="success" back={false}>
        <div className={s.center} role="status" aria-live="polite">
          <Spinner size={28} label={null} />
          <p>Dein Fortschritt wird gesichert …</p>
        </div>
      </AuthLayout>
    );
  }

  if (auth.status === 'signed-in' && auth.user) {
    return (
      <AuthLayout title="Du bist bereits angemeldet" subtitle={auth.user.email}>
        <Card padding="lg">
          <div className={s.actions}>
            <Button size="lg" block to={from ?? '/'} replace>Weiter</Button>
            <Button variant="ghost" block to="/profil">Zum Profil</Button>
          </div>
        </Card>
      </AuthLayout>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (phase === 'busy') return;
    setError(null);
    const next: Errors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      consent: consent ? undefined : 'Bitte bestätige, dass du die Datenschutzhinweise gelesen hast.',
    };
    setErrors(next);
    if (next.email) { emailRef.current?.focus(); return; }
    if (next.password) { passwordRef.current?.focus(); return; }
    if (next.consent) { consentRef.current?.focus(); return; }
    setPhase('busy');
    try {
      const res = await auth.signUp(email, password);
      if (name.trim()) updateProfile({ displayName: name.trim() });
      if (res.status === 'signed-in') {
        setPhase('sync');
        await settleAfterSignIn();
        navigate(from ?? '/', { replace: true });
      } else {
        setPhase('confirm');
      }
    } catch (err) {
      setError(authErrorMessage(err));
      setPhase('form');
    }
  };

  const busy = phase === 'busy';
  return (
    <AuthLayout title="Konto erstellen" subtitle="Sichere deinen Fortschritt und lerne auf all deinen Geräten weiter.">
      <form className={s.form} onSubmit={onSubmit} noValidate aria-busy={busy}>
        <FormAlert message={error} />
        <TextField
          label="Vorname (optional)"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 40))}
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={40}
        />
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
          error={errors.email}
        />
        <PasswordField
          ref={passwordRef}
          label="Passwort"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          enterKeyHint="next"
          hint="Mindestens 8 Zeichen. Tipp: Ein kurzer Satz ist leicht zu merken und schwer zu erraten."
          error={errors.password}
          showStrength
        />
        <label className={s.check}>
          <input
            ref={consentRef}
            type="checkbox"
            checked={consent}
            onChange={(e) => { setConsent(e.target.checked); if (e.target.checked) setErrors((x) => ({ ...x, consent: undefined })); }}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
          />
          <span>
            Ich habe die{' '}
            <Link to="/datenschutz" target="_blank" rel="noopener">Datenschutzhinweise</Link>{' '}
            gelesen und bin einverstanden, dass mein Lernfortschritt in meinem Konto gespeichert wird.
          </span>
        </label>
        {errors.consent && <p id="consent-error" className={s.checkError} role="alert">{errors.consent}</p>}
        <Button type="submit" size="lg" block loading={busy} icon={<UserPlus size={20} />}>
          Konto erstellen
        </Button>
      </form>
      <p className={s.footnote}>
        Schon registriert?{' '}
        <Link className={s.textLink} to="/anmelden" state={from ? { from } : undefined}>Anmelden</Link>
      </p>
    </AuthLayout>
  );
}
