import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CloudOff } from 'lucide-react';
import { Button, Card, Page } from '../../ui';
import { LogoMark } from '../../ui/internal/LogoMark';
import { cx } from '../../ui/internal/helpers';
import { CLOUD_NOT_CONFIGURED_MESSAGE } from '../../data/auth';
import { useLocalTarget } from './authHelpers';
import s from './Auth.module.css';

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  /** Statt Logo: Icon im Kreis (z. B. Bestätigung) */
  icon?: ReactNode;
  iconTone?: 'accent' | 'success' | 'danger' | 'info';
  back?: boolean | string;
  /** Überschrift beim Anzeigen fokussieren (z. B. nach Zustandswechsel) */
  focusTitle?: boolean;
  children?: ReactNode;
}

/** Gemeinsamer Rahmen der Konto-Seiten: zentriert, schmal, mit Logo/Icon und eigener h1. */
export function AuthLayout({ title, subtitle, icon, iconTone = 'accent', back = true, focusTitle = false, children }: AuthLayoutProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { document.title = `${title} · AppLingua`; }, [title]);
  useEffect(() => {
    if (focusTitle) titleRef.current?.focus({ preventScroll: true });
  }, [focusTitle, title]);
  return (
    <Page back={back}>
      <div className={s.wrap}>
        <header className={s.header}>
          {icon ? (
            <div
              className={cx(s.iconCircle, iconTone === 'success' && s.iconSuccess, iconTone === 'danger' && s.iconDanger, iconTone === 'info' && s.iconInfo)}
              aria-hidden="true"
            >
              {icon}
            </div>
          ) : (
            <div className={s.mark}><LogoMark size={56} /></div>
          )}
          <h1 ref={titleRef} tabIndex={-1} className={s.title}>{title}</h1>
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        </header>
        {children}
      </div>
    </Page>
  );
}

/** Ehrlicher Hinweis, wenn keine Cloud eingerichtet ist. */
export function CloudUnavailable() {
  const target = useLocalTarget();
  return (
    <Card padding="lg">
      <div className={s.actions}>
        <FormAlert tone="info" icon={<CloudOff size={18} aria-hidden="true" />} message={CLOUD_NOT_CONFIGURED_MESSAGE} />
        <Button size="lg" block to={target} replace>
          Im lokalen Modus weiterlernen
        </Button>
        <p className={s.footnote}>
          <Link className={s.textLink} to="/datenschutz">Wie wir mit deinen Daten umgehen</Link>
        </p>
      </div>
    </Card>
  );
}

/** Hinweis-/Fehlerbox (Fehler als role=alert, sonst role=status). */
export function FormAlert({ message, tone = 'danger', icon }: { message: string | null; tone?: 'danger' | 'info' | 'success'; icon?: ReactNode }) {
  if (!message) return null;
  return (
    <p role={tone === 'danger' ? 'alert' : 'status'} className={cx(s.alert, tone === 'info' && s.alertInfo, tone === 'success' && s.alertSuccess)}>
      {icon}
      <span>{message}</span>
    </p>
  );
}
