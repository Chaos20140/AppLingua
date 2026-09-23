import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AudioLines, BookOpenCheck, MessagesSquare, Music4, UserCheck } from 'lucide-react';
import type { CourseId } from '../../core/types';
import { BottomSheet, Button, Page } from '../../ui';
import { LogoMark } from '../../ui/internal/LogoMark';
import { cx } from '../../ui/internal/helpers';
import { useAuth } from '../../data/auth';
import { useProfile } from '../../state/settings';
import s from './Welcome.module.css';

const BENEFITS = [
  {
    icon: <BookOpenCheck size={22} />,
    title: 'Grammatik verständlich',
    text: 'Klare Erklärungen auf Deutsch, farbige Satzbaupläne und Beispiele, die im Kopf bleiben.',
  },
  {
    icon: <AudioLines size={22} />,
    title: 'Aussprache-Labor',
    text: 'Hören, nachsprechen, vergleichen – mit Rückmeldung, wie verständlich du klingst.',
  },
  {
    icon: <MessagesSquare size={22} />,
    title: 'KI-Sprachpartner',
    text: 'Übe Alltagsgespräche vom Café bis zum Vorstellungsgespräch – mit KI, wenn verfügbar, sonst mit geführten Dialogen.',
  },
  {
    icon: <Music4 size={22} />,
    title: 'Lernen mit Songs',
    text: 'Eigene Lernlieder mit Übersetzung, Lautschrift und Mitsing-Übungen.',
  },
] as const;

const LANGS: { id: CourseId; flag: string; label: string }[] = [
  { id: 'es', flag: '🇪🇸', label: 'Spanisch' },
  { id: 'pt-BR', flag: '🇧🇷', label: 'Portugiesisch (Brasilien)' },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const profile = useProfile();
  const auth = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const done = profile.onboardingDone;
  const name = profile.displayName.trim();

  useEffect(() => {
    document.title = 'AppLingua – Spanisch & Portugiesisch lernen';
  }, []);

  const onHaveAccount = () => {
    if (auth.available) navigate('/anmelden');
    else setSheetOpen(true);
  };

  return (
    <Page gap="lg">
      <section className={cx(s.hero, s.rise)} aria-labelledby="welcome-claim">
        <div className={s.brandRow}>
          <LogoMark size={56} className={s.logo} />
          <span className={s.brand}>AppLingua</span>
        </div>
        <h1 id="welcome-claim" className={s.claim}>
          Sprachen verstehen – nicht nur pauken.
        </h1>
        <p className={s.lead}>
          Spanisch und brasilianisches Portugiesisch lernen, mit Erklärungen, die Sinn ergeben, echtem Sprechtraining und
          Songs, die hängen bleiben.
        </p>
        <div className={s.langs} role="group" aria-label={done ? 'Verfügbare Sprachen' : 'Mit dieser Sprache starten'}>
          {LANGS.map((l) =>
            done ? (
              <span key={l.id} className={s.langChip}>
                <span className={s.flag} aria-hidden="true">{l.flag}</span>
                {l.label}
              </span>
            ) : (
              <button
                key={l.id}
                type="button"
                className={s.langChip}
                onClick={() => navigate('/onboarding', { state: { course: l.id } })}
                aria-label={`Mit ${l.label} starten`}
              >
                <span className={s.flag} aria-hidden="true">{l.flag}</span>
                {l.label}
              </button>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="welcome-benefits">
        <h2 id="welcome-benefits" className={cx(s.sectionTitle, s.rise, s.d1)}>
          Was dich erwartet
        </h2>
        <ul className={s.benefits}>
          {BENEFITS.map((b, i) => (
            <li key={b.title} className={cx(s.benefit, s.rise, [s.d1, s.d2, s.d3, s.d4][i])}>
              <span className={s.benefitIcon} aria-hidden="true">{b.icon}</span>
              <div>
                <h3 className={s.benefitTitle}>{b.title}</h3>
                <p className={s.benefitText}>{b.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className={cx(s.cta, s.rise, s.d5)}>
        {done ? (
          <>
            {name && <p className={s.greeting}>Schön, dass du wieder da bist, {name}!</p>}
            <Button size="lg" block to="/dashboard" iconRight={<ArrowRight size={20} />}>
              Weiterlernen
            </Button>
          </>
        ) : (
          <Button size="lg" block to="/onboarding" iconRight={<ArrowRight size={20} />}>
            Jetzt starten
          </Button>
        )}

        {auth.status === 'signed-in' && auth.user ? (
          <p className={s.signedIn}>
            <UserCheck size={16} aria-hidden="true" />
            Angemeldet{auth.user.email ? ` als ${auth.user.email}` : ''}
          </p>
        ) : (
          !done && (
            <Button variant="ghost" block onClick={onHaveAccount}>
              Ich habe schon ein Konto
            </Button>
          )
        )}

        <p className={s.fine}>
          Ohne Werbung, ohne Tracking ·{' '}
          <Link to="/datenschutz">Datenschutz</Link>
          {' · '}
          <Link to="/rechtliches">Rechtliches</Link>
        </p>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Konten sind noch nicht eingerichtet"
        footer={
          <Button block onClick={() => { setSheetOpen(false); navigate('/onboarding'); }}>
            Im lokalen Modus starten
          </Button>
        }
      >
        <div className={s.sheetBody}>
          <p>
            Konten sind in dieser Installation noch nicht eingerichtet – dein Fortschritt wird sicher auf diesem Gerät
            gespeichert.
          </p>
          <p>
            Du kannst trotzdem alles nutzen. Unter <strong>Einstellungen → Daten</strong> kannst du jederzeit eine Sicherung
            als Datei exportieren.
          </p>
        </div>
      </BottomSheet>
    </Page>
  );
}
