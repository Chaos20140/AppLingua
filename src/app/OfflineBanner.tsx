import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Wifi, WifiOff, X } from 'lucide-react';
import { cx } from '../ui/internal/helpers';
import s from './Banners.module.css';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/** Dezenter Hinweis bei fehlender Verbindung; kurz „Wieder online“ nach Rückkehr. */
export default function OfflineBanner() {
  const online = useOnline();
  const [dismissed, setDismissed] = useState(false);
  const [backOnline, setBackOnline] = useState(false);
  const prev = useRef(online);

  useEffect(() => {
    if (prev.current === online) return;
    prev.current = online;
    if (!online) {
      setDismissed(false);
      setBackOnline(false);
      return;
    }
    setBackOnline(true);
    const t = window.setTimeout(() => setBackOnline(false), 3000);
    return () => window.clearTimeout(t);
  }, [online]);

  const showOffline = !online && !dismissed;

  return (
    <div className={s.topRegion} role="status" aria-live="polite">
      {showOffline && (
        <div className={s.pill}>
          <WifiOff className={s.pillIcon} aria-hidden="true" />
          <span>Offline – du kannst weiterlernen, alles wird lokal gespeichert.</span>
          <button type="button" className={s.pillClose} aria-label="Hinweis ausblenden" onClick={() => setDismissed(true)}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}
      {online && backOnline && (
        <div className={cx(s.pill, s.pillSuccess)}>
          <Wifi className={s.pillIcon} aria-hidden="true" />
          <span>Wieder online</span>
        </div>
      )}
    </div>
  );
}
