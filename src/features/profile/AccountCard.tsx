import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudOff, HardDrive, KeyRound, LogIn, LogOut, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Skeleton, useToast } from '../../ui';
import { cx } from '../../ui/internal/helpers';
import { SyncIndicator } from '../../app/SyncIndicator';
import { UnsyncedChangesError, toAuthError, useAuth } from '../../data/auth';
import { getSyncStatus, syncNow, useSyncStatus } from '../../data/sync';
import s from './Profile.module.css';

/** Konto-Karte: lokaler Modus / Gast / angemeldet – mit echten Aktionen. */
export function AccountCard() {
  const auth = useAuth();
  const sync = useSyncStatus();
  const toast = useToast();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [unsynced, setUnsynced] = useState<string | null>(null);

  if (!auth.available) {
    return (
      <Card>
        <div className={s.accountHead}>
          <span className={s.accountIcon} aria-hidden="true"><HardDrive size={22} /></span>
          <div className={s.accountText}>
            <p className={s.accountTitle}>Lokaler Modus</p>
            <p className={s.explain}>
              Konten sind in dieser Installation nicht eingerichtet. Dein Fortschritt liegt sicher auf diesem Gerät –
              lege unter Einstellungen → Daten regelmäßig eine Sicherung an.
            </p>
          </div>
        </div>
        <div className={s.buttons}>
          <Button variant="secondary" to="/einstellungen">Zu den Daten-Einstellungen</Button>
        </div>
      </Card>
    );
  }

  if (auth.status === 'loading') {
    return (
      <Card aria-label="Konto wird geladen">
        <div className={s.accountHead}>
          <Skeleton width={44} height={44} radius={12} />
          <div className={s.accountText}>
            <Skeleton width="40%" height={18} />
            <Skeleton width="70%" height={14} />
          </div>
        </div>
      </Card>
    );
  }

  if (auth.status === 'guest' || !auth.user) {
    return (
      <Card>
        <div className={s.accountHead}>
          <span className={s.accountIcon} aria-hidden="true"><CloudOff size={22} /></span>
          <div className={s.accountText}>
            <p className={s.accountTitle}>Gast <Badge tone="warning">nur dieses Gerät</Badge></p>
            <p className={s.explain}>
              Dein Fortschritt ist nur hier gespeichert. Mit einem Konto sicherst du ihn und lernst auf allen Geräten
              weiter – deinen Gastfortschritt kannst du dabei übernehmen.
            </p>
          </div>
        </div>
        <div className={s.buttons}>
          <Button icon={<UserPlus size={18} />} to="/registrieren">Konto erstellen</Button>
          <Button variant="secondary" icon={<LogIn size={18} />} to="/anmelden">Anmelden</Button>
        </div>
      </Card>
    );
  }

  const doSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      const st = getSyncStatus();
      if (st.state === 'error') toast(st.message, { tone: 'error' });
      else if (st.state === 'pending') {
        toast(st.offline
          ? 'Du bist offline – deine Änderungen werden gesichert, sobald du wieder online bist.'
          : `${st.count} Änderung(en) warten noch auf die Sicherung. Versuche es gleich noch einmal.`, { tone: 'info' });
      } else toast('Alles synchronisiert.', { tone: 'success' });
    } catch (e) {
      toast(toAuthError(e).message, { tone: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const doSignOut = async (force = false) => {
    setSigningOut(true);
    try {
      await auth.signOut(force ? { force: true } : undefined);
      setUnsynced(null);
      toast('Du bist abgemeldet. Dieses Gerät ist jetzt im Gastmodus.', { tone: 'info' });
      navigate('/', { replace: true });
    } catch (e) {
      if (e instanceof UnsyncedChangesError) setUnsynced(e.message);
      else {
        setUnsynced(null);
        toast(toAuthError(e).message, { tone: 'error' });
      }
    } finally {
      setSigningOut(false);
    }
  };

  const busySync = syncing || sync.state === 'syncing';
  return (
    <Card>
      <div className={s.stack}>
        <div className={s.accountHead}>
          <span className={cx(s.accountIcon, s.accountIconOk)} aria-hidden="true"><ShieldCheck size={22} /></span>
          <div className={s.accountText}>
            <p className={s.accountTitle}>Angemeldet {auth.user.provider === 'apple' && <Badge>über Apple</Badge>}</p>
            {auth.user.email && <p className={s.email}>{auth.user.email}</p>}
          </div>
        </div>
        <SyncIndicator variant="full" />
      </div>
      <div className={s.buttons}>
        <Button variant="secondary" icon={<RefreshCw size={18} />} loading={busySync} onClick={doSync}>
          Jetzt synchronisieren
        </Button>
        {auth.user.provider === 'email' && (
          <Button variant="ghost" icon={<KeyRound size={18} />} to="/passwort-neu">Passwort ändern</Button>
        )}
        <Button variant="ghost" icon={<LogOut size={18} />} loading={signingOut && !unsynced} onClick={() => doSignOut(false)}>
          Abmelden
        </Button>
      </div>
      <ConfirmDialog
        open={unsynced !== null}
        onClose={() => setUnsynced(null)}
        onConfirm={() => doSignOut(true)}
        title="Nicht gesicherte Änderungen"
        message={unsynced ?? undefined}
        confirmLabel="Trotzdem abmelden"
        cancelLabel="Angemeldet bleiben"
        tone="danger"
      />
    </Card>
  );
}
