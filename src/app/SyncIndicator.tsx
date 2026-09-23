import { useEffect, useState, type ReactNode } from 'react';
import { CloudCheck, CloudOff, CloudUpload, HardDrive, RefreshCw, TriangleAlert, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SyncStatus } from '../core/types';
import { syncNow, useSyncStatus, useSyncWarning } from '../data/sync';
import { cx } from '../ui/internal/helpers';
import s from './SyncIndicator.module.css';

type Tone = 'ok' | 'busy' | 'pending' | 'error' | 'local';

interface Described {
  tone: Tone;
  icon: ReactNode;
  label: string;
  detail: string;
  /** Was ein Tipp auf den Indikator tut. */
  action: 'sync' | 'login' | null;
}

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('de', { numeric: 'auto' }) : null;

function relativeTime(iso: string | undefined, now: number): string | null {
  if (!iso || !rtf) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const sec = Math.round((t - now) / 1000);
  if (Math.abs(sec) < 45) return 'gerade eben';
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, 'hour');
  return rtf.format(Math.round(h / 24), 'day');
}

const changes = (n: number) => (n === 1 ? '1 Änderung' : `${n} Änderungen`);

function describe(status: SyncStatus, now: number): Described {
  switch (status.state) {
    case 'local-only':
      return status.reason === 'guest'
        ? {
            tone: 'local',
            icon: <UserRound />,
            label: 'Gastmodus',
            detail: 'Nur auf diesem Gerät gespeichert. Melde dich an, um geräteübergreifend zu synchronisieren.',
            action: 'login',
          }
        : {
            tone: 'local',
            icon: <HardDrive />,
            label: 'Nur lokal',
            detail: 'Cloud-Sync ist nicht eingerichtet. Deine Daten bleiben sicher auf diesem Gerät.',
            action: null,
          };
    case 'idle': {
      const when = relativeTime(status.lastSyncedAt, now);
      return {
        tone: 'ok',
        icon: <CloudCheck />,
        label: 'Synchronisiert',
        detail: when ? `Zuletzt ${when}. Tippen zum erneuten Abgleich.` : 'Alles ist auf dem neuesten Stand.',
        action: 'sync',
      };
    }
    case 'syncing':
      return { tone: 'busy', icon: <RefreshCw />, label: 'Synchronisiere …', detail: 'Deine Änderungen werden abgeglichen.', action: null };
    case 'pending':
      return status.offline
        ? {
            tone: 'pending',
            icon: <CloudOff />,
            label: status.count > 0 ? `Offline · ${status.count} ausstehend` : 'Offline',
            detail:
              status.count > 0
                ? `${changes(status.count)} ${status.count === 1 ? 'wird' : 'werden'} synchronisiert, sobald du wieder online bist.`
                : 'Du kannst weiterlernen – alles wird lokal gespeichert.',
            action: null,
          }
        : {
            tone: 'pending',
            icon: <CloudUpload />,
            label: `${status.count} ausstehend`,
            detail: `${changes(status.count)} noch nicht in der Cloud. Tippen zum Synchronisieren.`,
            action: 'sync',
          };
    case 'error':
      return {
        tone: 'error',
        icon: <TriangleAlert />,
        label: 'Sync-Fehler',
        detail: `${status.message}${status.count > 0 ? ` (${changes(status.count)} ausstehend)` : ''} Tippen zum erneuten Versuch.`,
        action: 'sync',
      };
  }
}

export interface SyncIndicatorProps {
  /** compact = Pille (z. B. in einer Titelleiste), full = Karte mit Erklärung (Seitenleiste, Profil). */
  variant?: 'compact' | 'full';
  className?: string;
}

/** Ehrliche Anzeige des Speicher-/Sync-Zustands; Tipp löst – wo sinnvoll – eine echte Aktion aus. */
export function SyncIndicator({ variant = 'compact', className }: SyncIndicatorProps) {
  const status = useSyncStatus();
  const warning = useSyncWarning();
  const [now, setNow] = useState(() => Date.now());
  const [kicked, setKicked] = useState(false);

  // Relative Zeitangabe („vor 3 Minuten“) aktuell halten.
  useEffect(() => {
    if (status.state !== 'idle' || !status.lastSyncedAt) return;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, [status]);

  const d = describe(status, now);
  const busy = status.state === 'syncing' || kicked;
  const detail = warning ? `${d.detail} Hinweis: ${warning}` : d.detail;

  const onSync = () => {
    setKicked(true);
    syncNow()
      .catch(() => undefined)
      .finally(() => setKicked(false));
  };

  const body =
    variant === 'full' ? (
      <>
        <span className={cx(s.icon, busy && s.spin)} aria-hidden="true">
          {busy ? <RefreshCw /> : d.icon}
        </span>
        <span className={s.text}>
          <span className={s.label}>{busy && status.state !== 'syncing' ? 'Synchronisiere …' : d.label}</span>
          <span className={s.detail}>{detail}</span>
        </span>
      </>
    ) : (
      <>
        <span className={cx(s.pillIcon, busy && s.spin)} aria-hidden="true">
          {busy ? <RefreshCw /> : d.icon}
        </span>
        <span>{busy && status.state !== 'syncing' ? 'Synchronisiere …' : d.label}</span>
      </>
    );

  const classes = cx(variant === 'full' ? s.full : s.pill, s[d.tone], warning && s.warn, className);
  const a11yLabel = `Sync-Status: ${d.label}. ${detail}`;

  if (d.action === 'login') {
    return (
      <Link to="/anmelden" className={cx(classes, s.interactive)} aria-label={`${a11yLabel} Zur Anmeldung.`} title={detail}>
        {body}
      </Link>
    );
  }
  if (d.action === 'sync') {
    return (
      <button
        type="button"
        className={cx(classes, s.interactive)}
        onClick={onSync}
        disabled={busy}
        aria-label={`${a11yLabel}`}
        title={detail}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={classes} role="status" aria-label={a11yLabel} title={detail}>
      {body}
    </div>
  );
}

export default SyncIndicator;
