import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, KeyRound, Trash2, UserX } from 'lucide-react';
import { Button, ConfirmDialog, Dialog, ListRow, TextField, useToast } from '../../ui';
import { toAuthError, useAuth } from '../../data/auth';
import { deleteLocalData, downloadAllData } from '../../data/exportData';
import { FormAlert } from '../auth/AuthLayout';
import { Item, ItemHead, Section } from './SettingsParts';
import s from './Profile.module.css';

const CONFIRM_WORD = 'LÖSCHEN';

/** Daten: Export, lokale Daten löschen, Passwort ändern, Konto löschen (doppelte Bestätigung). */
export function DataSettings() {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const signedIn = auth.available && auth.status === 'signed-in' && !!auth.user;

  const [exporting, setExporting] = useState(false);
  const [confirmLocal, setConfirmLocal] = useState(false);
  const [delStep, setDelStep] = useState<0 | 1 | 2>(0);
  const [delText, setDelText] = useState('');
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const doExport = async () => {
    setExporting(true);
    try {
      await downloadAllData();
      toast('Export erstellt – die Datei liegt in deinen Downloads.', { tone: 'success' });
    } catch {
      toast('Der Export ist fehlgeschlagen. Bitte versuche es erneut.', { tone: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const doDeleteLocal = async () => {
    try {
      await deleteLocalData();
      setConfirmLocal(false);
      toast('Alle Daten auf diesem Gerät wurden gelöscht.', { tone: 'success' });
      navigate('/willkommen', { replace: true });
    } catch (e) {
      setConfirmLocal(false);
      toast(toAuthError(e).message, { tone: 'error' });
    }
  };

  const doDeleteAccount = async () => {
    setDelBusy(true);
    setDelError(null);
    try {
      await auth.deleteAccount();
      setDelStep(0);
      toast('Dein Konto und deine Cloud-Daten wurden gelöscht.', { tone: 'success' });
      navigate('/', { replace: true });
    } catch (e) {
      setDelError(toAuthError(e).message);
    } finally {
      setDelBusy(false);
    }
  };

  const closeDelete = () => { if (!delBusy) { setDelStep(0); setDelText(''); setDelError(null); } };
  const wordOk = delText.trim().toLocaleUpperCase('de-DE') === CONFIRM_WORD;

  return (
    <Section
      id="set-data"
      title="Daten & Konto"
      note="Du hast jederzeit das Recht auf Auskunft (Export) und Löschung deiner Daten."
    >
      <Item>
        <ItemHead
          label="Daten exportieren"
          description="Alle Lernfortschritte, Einstellungen und lokal gespeicherten Aufnahmen als JSON-Datei."
        />
        <Button variant="secondary" icon={<Download size={18} />} loading={exporting} onClick={doExport}>
          Export herunterladen
        </Button>
      </Item>
      {signedIn && auth.user?.provider === 'email' && (
        <ListRow leading={<KeyRound size={20} />} title="Passwort ändern" to="/passwort-neu" />
      )}
      <Item>
        <ItemHead
          label="Lokale Daten löschen"
          description={signedIn
            ? 'Löscht alles auf diesem Gerät und meldet es ab. Deine Daten im Konto bleiben erhalten.'
            : 'Löscht deinen gesamten Fortschritt, deine Einstellungen und Aufnahmen auf diesem Gerät.'}
        />
        <Button variant="danger" icon={<Trash2 size={18} />} onClick={() => setConfirmLocal(true)}>
          Lokale Daten löschen
        </Button>
      </Item>
      {signedIn && (
        <Item>
          <ItemHead
            label="Konto löschen"
            description="Löscht dein Konto und alle in der Cloud gespeicherten Daten endgültig."
          />
          <Button variant="danger" icon={<UserX size={18} />} onClick={() => setDelStep(1)}>
            Konto löschen …
          </Button>
        </Item>
      )}

      <ConfirmDialog
        open={confirmLocal}
        onClose={() => setConfirmLocal(false)}
        onConfirm={doDeleteLocal}
        title="Lokale Daten wirklich löschen?"
        message={signedIn
          ? 'Dieses Gerät wird abgemeldet und alle lokalen Daten werden gelöscht. Noch nicht synchronisierte Änderungen gehen verloren. Deine Daten im Konto bleiben erhalten.'
          : 'Dein gesamter Fortschritt auf diesem Gerät wird unwiderruflich gelöscht. Tipp: Exportiere vorher deine Daten.'}
        confirmLabel="Endgültig löschen"
        tone="danger"
      />

      <ConfirmDialog
        open={delStep === 1}
        onClose={closeDelete}
        onConfirm={() => setDelStep(2)}
        title="Konto endgültig löschen?"
        message="Dein Konto und alle Lernfortschritte in der Cloud werden unwiderruflich gelöscht. Auf diesem Gerät wirst du abgemeldet. Tipp: Exportiere vorher deine Daten."
        confirmLabel="Weiter"
        tone="danger"
      />

      <Dialog
        open={delStep === 2}
        onClose={closeDelete}
        dismissible={!delBusy}
        role="alertdialog"
        title="Letzte Bestätigung"
        description={`Tippe „${CONFIRM_WORD}“, um dein Konto endgültig zu löschen.`}
        actions={
          <>
            <Button variant="ghost" block disabled={delBusy} onClick={closeDelete}>Abbrechen</Button>
            <Button variant="danger" block loading={delBusy} disabled={!wordOk} onClick={doDeleteAccount}>
              Konto endgültig löschen
            </Button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); if (wordOk && !delBusy) void doDeleteAccount(); }}>
          <TextField
            className={s.confirmField}
            label="Bestätigung"
            value={delText}
            onChange={(e) => setDelText(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder={CONFIRM_WORD}
          />
        </form>
        <div aria-live="polite">
          <FormAlert message={delError} />
        </div>
      </Dialog>
    </Section>
  );
}
