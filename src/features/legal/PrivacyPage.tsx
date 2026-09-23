import { useState } from 'react';
import { Bot, Check, Cloud, Download, EyeOff, HardDrive, Info, Mic, Scale, ShieldCheck, Tv } from 'lucide-react';
import { Button, Card, Page, useToast } from '../../ui';
import { cloudConfigured } from '../../data/supabase';
import { downloadAllData } from '../../data/exportData';
import { useAiStatus } from '../../ai/client';
import { LegalSection, LegalToc } from './LegalSection';
import s from './Legal.module.css';

const TOC = [
  { id: 'lokal', label: 'Auf dem Gerät' },
  { id: 'konto', label: 'Konto & Sync' },
  { id: 'sprache', label: 'Spracherkennung' },
  { id: 'ki', label: 'KI' },
  { id: 'einbettungen', label: 'Einbettungen' },
  { id: 'tracking', label: 'Kein Tracking' },
  { id: 'rechte', label: 'Deine Rechte' },
];

export default function PrivacyPage() {
  const ai = useAiStatus();
  const aiConfigured = ai.code !== 'not-configured';
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

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

  return (
    <Page title="Datenschutz" subtitle="Kurz und verständlich: was AppLingua mit deinen Daten macht." back gap="lg">
      <Card tone="success" padding="lg">
        <div className={s.summary}>
          <h2 className={s.summaryTitle}>Das Wichtigste in Kürze</h2>
          <ul className={s.points}>
            <li><Check size={18} aria-hidden="true" />Kein Tracking, keine Werbung, keine Analyse-Tools.</li>
            <li><Check size={18} aria-hidden="true" />Dein Lernfortschritt wird zuerst auf deinem Gerät gespeichert.</li>
            <li><Check size={18} aria-hidden="true" />Ein Konto ist freiwillig – nur dann liegen Daten zusätzlich in der Cloud.</li>
            <li><Check size={18} aria-hidden="true" />Sprachaufnahmen speichert AppLingua nur mit deiner Zustimmung und nur auf deinem Gerät.</li>
            <li><Check size={18} aria-hidden="true" />YouTube, Spotify und Apple Music laden erst nach deiner Einwilligung.</li>
          </ul>
        </div>
      </Card>

      <LegalToc items={TOC} />

      <LegalSection id="lokal" icon={<HardDrive size={20} />} title="Was auf deinem Gerät gespeichert wird">
        <p>
          AppLingua arbeitet „lokal zuerst“. In der Datenbank deines Browsers (<strong>IndexedDB</strong>) liegen:
        </p>
        <ul>
          <li>Lernfortschritt: Lektionen, Prüfungen, XP, Serien, Abzeichen, Vokabelkarten und Fehlerarchiv</li>
          <li>Einstellungen und Profil (dein Vorname ist optional)</li>
          <li>eigene Songtexte, die du für die private Analyse eingibst</li>
          <li>Aussprache-Aufnahmen – nur, wenn du das Speichern ausdrücklich erlaubst</li>
        </ul>
        <p>
          Zusätzlich merkt sich der Browser kleine Komfort-Zustände (z. B. den Zwischenstand der Einrichtung) und speichert die
          App-Dateien für die Offline-Nutzung. Diese Daten verlassen dein Gerät nicht, solange du kein Konto nutzt.
        </p>
      </LegalSection>

      <LegalSection id="konto" icon={<Cloud size={20} />} title="Konto & Synchronisierung (freiwillig)">
        <p className={s.status}>
          <Info size={16} aria-hidden="true" />
          {cloudConfigured
            ? 'In dieser Installation sind Konten eingerichtet. Ohne Anmeldung bleibt trotzdem alles auf deinem Gerät.'
            : 'In dieser Installation sind Konten nicht eingerichtet – es werden keine Lerndaten an einen Server übertragen.'}
        </p>
        <p>
          Legst du ein Konto an, nutzt AppLingua den Dienst <strong>Supabase</strong>. Gespeichert werden deine E-Mail-Adresse,
          dein Passwort (nur als sicherer Hash) und dein Lernfortschritt. Jeder Datensatz ist technisch so geschützt, dass nur
          du ihn lesen und ändern kannst. So kannst du auf mehreren Geräten weiterlernen.
        </p>
        <ul>
          <li><strong>Nicht</strong> in der Cloud: deine Sprachaufnahmen.</li>
          <li>
            Eigene Songtexte nur, wenn du „Eigene Texte synchronisieren“ in den Einstellungen aktivierst. Das gilt auch für alles,
            was Text daraus enthält: Notizen, Markierungen, Erklärungen, Übungsantworten, Fehlerarchiv und Aussprache-Versuche.
          </li>
          <li>
            Vokabelkarten, die du selbst aus einem eigenen Text anlegst (bei Wendungen mit der ganzen Zeile), werden wie alle
            Vokabelkarten synchronisiert.
          </li>
          <li>Bei „Mit Apple anmelden“ (falls angeboten) übermittelt Apple eine Kennung und ggf. deine E-Mail-Adresse.</li>
        </ul>
        <p>Der Serverstandort hängt vom Supabase-Projekt ab, das der Betreiber dieser Installation eingerichtet hat.</p>
      </LegalSection>

      <LegalSection id="sprache" icon={<Mic size={20} />} title="Spracherkennung & Sprachausgabe">
        <p>
          Für Ausspracheübungen nutzt AppLingua die <strong>Spracherkennung deines Browsers</strong>. Je nach Gerät und Browser
          wird deine Stimme dabei vom Hersteller verarbeitet – zum Beispiel von <strong>Apple</strong> (Safari) oder{' '}
          <strong>Google</strong> (Chrome), unter Umständen auf deren Servern. AppLingua selbst erhält dabei nur den erkannten
          Text.
        </p>
        <p>
          Das Mikrofon wird nur aktiv, wenn du auf die Aufnahme-Schaltfläche tippst und dein Browser es erlaubt. Ohne
          Spracherkennung kannst du dich selbst einschätzen.
        </p>
        <p>
          Die <strong>Sprachausgabe</strong> nutzt die
          Stimmen deines Geräts und läuft in der Regel lokal. Manche Browser bieten zusätzlich Online-Stimmen an; dann wird der
          vorgelesene Text an deren Anbieter übertragen.
        </p>
      </LegalSection>

      <LegalSection id="ki" icon={<Bot size={20} />} title="KI-Sprachpartner & Erklärungen">
        <p className={s.status}>
          <Info size={16} aria-hidden="true" />
          {aiConfigured
            ? 'In dieser Installation ist die KI eingerichtet. Sie wird nur genutzt, wenn du angemeldet bist und eine KI-Funktion startest.'
            : 'In dieser Installation ist die KI nicht eingerichtet – es werden keine KI-Anfragen gesendet. Gespräche laufen als geführte Dialoge.'}
        </p>
        <p>
          Nutzt du eine KI-Funktion, sendet AppLingua deine Anfrage über eine Server-Funktion (Supabase Edge Function) an{' '}
          <strong>Anthropic</strong> (Claude). Übertragen werden nur die nötigen Inhalte: dein eingegebener bzw. erkannter Text,
          der bisherige Gesprächsverlauf und das gewählte Szenario samt Niveau – <strong>keine Aufnahmen</strong> und nicht
          deine E-Mail-Adresse.
        </p>
        <p>Bitte gib in KI-Gesprächen keine sensiblen persönlichen Daten ein. KI-Antworten können Fehler enthalten.</p>
      </LegalSection>

      <LegalSection id="einbettungen" icon={<Tv size={20} />} title="Externe Einbettungen">
        <p>
          Inhalte von <strong>YouTube</strong>, <strong>Spotify</strong> oder <strong>Apple Music</strong> werden erst geladen,
          nachdem du zugestimmt hast (Zwei-Klick-Lösung). YouTube wird im erweiterten Datenschutzmodus über
          youtube-nocookie.com eingebunden. Sobald ein Player geladen ist, erhält der jeweilige Anbieter technische Daten wie
          deine IP-Adresse. Deine Zustimmung kannst du in den Einstellungen jederzeit widerrufen.
        </p>
      </LegalSection>

      <LegalSection id="tracking" icon={<EyeOff size={20} />} title="Kein Tracking, keine Werbung">
        <p>
          AppLingua verwendet keine Tracking- oder Werbe-Cookies, keine Analyse-Dienste und keine externen Schriftarten oder
          Werbenetzwerke. Die App wird als statische Website ausgeliefert; der Hosting-Anbieter verarbeitet dabei technisch
          notwendig deine IP-Adresse, um die Dateien zu übertragen.
        </p>
      </LegalSection>

      <LegalSection id="rechte" icon={<Scale size={20} />} title="Deine Rechte">
        <ul>
          <li><strong>Auskunft & Mitnahme:</strong> Einstellungen → Daten → Export (JSON-Datei mit allen Daten).</li>
          <li><strong>Berichtigung:</strong> Name und Einstellungen änderst du jederzeit im Profil.</li>
          <li><strong>Löschung:</strong> „Lokale Daten löschen“ bzw. „Konto löschen“ in den Einstellungen.</li>
          <li><strong>Widerruf:</strong> Einwilligungen für Aufnahmen und Einbettungen kannst du jederzeit zurücknehmen.</li>
          <li><strong>Beschwerde:</strong> Du kannst dich an eine Datenschutz-Aufsichtsbehörde wenden.</li>
        </ul>
        <p>
          Verantwortlich für die Verarbeitung ist der
          Betreiber dieser AppLingua-Installation. Seine Kontaktdaten findest du dort, wo du AppLingua erhalten hast.
        </p>
        <div className={s.actions}>
          <Button variant="secondary" icon={<Download size={18} />} loading={exporting} onClick={doExport}>Daten exportieren</Button>
          <Button variant="ghost" icon={<ShieldCheck size={18} />} to="/einstellungen">Einstellungen öffnen</Button>
        </div>
      </LegalSection>

      <p className={s.updated}>Stand: September 2026</p>
    </Page>
  );
}
