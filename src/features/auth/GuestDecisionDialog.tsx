import { useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { Button, ConfirmDialog, Dialog, useToast } from '../../ui';
import { useAuth } from '../../data/auth';
import { adoptGuestData, discardGuestData, useGuestDataSummary, useGuestDecisionStore, usePendingGuestDecision } from '../../data/migrateGuest';
import { FormAlert } from './AuthLayout';
import s from './Auth.module.css';

const fmt = (n: number) => n.toLocaleString('de-DE');

/**
 * Global gemountet: Nach der Anmeldung auf einem Gerät mit Gast-Lernfortschritt fragen,
 * ob dieser ins Konto übernommen oder verworfen wird.
 */
export default function GuestDecisionDialog() {
  const pending = usePendingGuestDecision();
  const summary = useGuestDataSummary();
  const busy = useGuestDecisionStore((st) => st.busy);
  const email = useAuth((st) => st.user?.email);
  const toast = useToast();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'adopt' | 'discard' | null>(null);

  if (!pending) return null;

  const adopt = async () => {
    setError(null);
    setAction('adopt');
    try {
      await adoptGuestData();
      toast('Dein Gastfortschritt ist jetzt in deinem Konto gesichert.', { tone: 'success' });
    } catch {
      setError('Die Übernahme hat nicht geklappt. Deine Daten sind unverändert auf diesem Gerät – bitte versuche es erneut.');
    } finally {
      setAction(null);
    }
  };

  const discard = async () => {
    setError(null);
    setAction('discard');
    try {
      await discardGuestData();
      setConfirmDiscard(false);
      toast('Gastfortschritt verworfen – dein Kontostand wird geladen.', { tone: 'info' });
    } catch {
      setConfirmDiscard(false);
      setError('Das Verwerfen hat nicht geklappt. Bitte versuche es erneut.');
    } finally {
      setAction(null);
    }
  };

  const items = summary
    ? [
        { value: summary.xp, label: 'XP gesammelt' },
        { value: summary.lessons, label: summary.lessons === 1 ? 'Lektion' : 'Lektionen' },
        { value: summary.vocabCards, label: 'Vokabelkarten' },
        { value: summary.songs, label: 'Songs geübt' },
        ...(summary.userTexts > 0 ? [{ value: summary.userTexts, label: 'eigene Texte' }] : []),
      ]
    : [];

  return (
    <>
      <Dialog
        open={pending && !confirmDiscard}
        onClose={() => undefined}
        dismissible={false}
        title="Gastfortschritt übernehmen?"
        description={
          <>
            Du bist jetzt{email ? <> als <strong>{email}</strong></> : ''} angemeldet. Auf diesem Gerät gibt es noch Fortschritt aus
            dem Gastmodus.
          </>
        }
        actions={
          <>
            <Button variant="ghost" block disabled={busy || action !== null} onClick={() => setConfirmDiscard(true)}>
              Verwerfen
            </Button>
            <Button block icon={<CloudUpload size={20} />} loading={action === 'adopt'} disabled={busy && action !== 'adopt'} onClick={adopt}>
              In mein Konto übernehmen
            </Button>
          </>
        }
      >
        {items.length > 0 && (
          <ul className={s.summary} aria-label="Gastfortschritt auf diesem Gerät">
            {items.map((it) => (
              <li key={it.label} className={s.summaryItem}>
                <span className={s.summaryValue}>{fmt(it.value)}</span>
                <span className={s.summaryLabel}>{it.label}</span>
              </li>
            ))}
          </ul>
        )}
        <p className={s.dialogText}>
          Beim Übernehmen wird dein Gastfortschritt mit deinem Konto zusammengeführt – nichts geht verloren. Beim Verwerfen
          werden die Gastdaten auf diesem Gerät gelöscht und dein Kontostand geladen.
        </p>
        <div aria-live="polite">
          <FormAlert message={error} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={discard}
        title="Gastfortschritt wirklich verwerfen?"
        message={`${summary && summary.xp > 0
          ? `${fmt(summary.xp)} XP und der übrige Gastfortschritt auf diesem Gerät werden endgültig gelöscht.`
          : 'Der Gastfortschritt auf diesem Gerät wird endgültig gelöscht.'} Dein Konto bleibt unverändert.`}
        confirmLabel="Endgültig verwerfen"
        cancelLabel="Zurück"
        tone="danger"
      />
    </>
  );
}
