import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LinkIcon, ShieldCheck } from 'lucide-react';
import { Button, Spinner } from '../../ui';
import { completeAuthCallback, useAuth } from '../../data/auth';
import { AuthLayout, CloudUnavailable } from './AuthLayout';
import { settleAfterSignIn, useLocalTarget } from './authHelpers';
import s from './Auth.module.css';

type State =
  | { phase: 'working' }
  | { phase: 'syncing'; email?: string }
  | { phase: 'error'; message: string };

export default function AuthCallbackPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const localTarget = useLocalTarget();
  const [state, setState] = useState<State>({ phase: 'working' });
  const started = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // Nur einmal ausführen (auch im StrictMode): der Link-Code ist einmalig.
    if (!auth.available || started.current) return;
    started.current = true;
    (async () => {
      const res = await completeAuthCallback();
      if (!mounted.current) return;
      if (!res.ok) { setState({ phase: 'error', message: res.message }); return; }
      setState({ phase: 'syncing', email: res.user.email });
      await settleAfterSignIn();
      if (mounted.current) navigate('/dashboard', { replace: true });
    })().catch(() => {
      if (mounted.current) setState({ phase: 'error', message: 'Die Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.' });
    });
  }, [auth.available, navigate]);

  if (!auth.available) {
    return (
      <AuthLayout title="Anmeldung" back={false}>
        <CloudUnavailable />
      </AuthLayout>
    );
  }

  if (state.phase === 'error') {
    return (
      <AuthLayout title="Anmeldung nicht abgeschlossen" icon={<LinkIcon size={30} />} iconTone="danger" subtitle={state.message} focusTitle back={false}>
        <div className={s.actions}>
          <Button size="lg" block to="/anmelden" replace>Zur Anmeldung</Button>
          <Button variant="secondary" block to="/passwort-vergessen" replace>Neuen Link anfordern</Button>
          <Button variant="ghost" block to={localTarget} replace>Im lokalen Modus weiterlernen</Button>
        </div>
      </AuthLayout>
    );
  }

  const syncing = state.phase === 'syncing';
  return (
    <AuthLayout
      title={syncing ? 'Du bist angemeldet!' : 'Anmeldung wird abgeschlossen …'}
      icon={syncing ? <CheckCircle2 size={34} /> : <ShieldCheck size={30} />}
      iconTone={syncing ? 'success' : 'accent'}
      subtitle={syncing && state.email ? state.email : undefined}
      back={false}
    >
      <div className={s.center} role="status" aria-live="polite">
        <Spinner size={28} label={null} />
        <p>{syncing ? 'Dein Fortschritt wird geladen …' : 'Wir prüfen deinen Link. Das dauert nur einen Moment.'}</p>
      </div>
    </AuthLayout>
  );
}
