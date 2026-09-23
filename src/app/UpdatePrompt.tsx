import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { flushLocalWrites } from '../data/store';
import { Button, useToast } from '../ui';
import s from './Banners.module.css';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/** Meldet eine neue App-Version (Service Worker „waiting“) und aktualisiert erst nach Bestätigung. */
export default function UpdatePrompt() {
  const toast = useToast();
  const [updating, setUpdating] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // Stündlich (und nur online) nach neuen Versionen sehen.
      window.setInterval(() => {
        if (navigator.onLine && registration.installing === null) registration.update().catch(() => undefined);
      }, UPDATE_CHECK_MS);
    },
    onRegisterError(error) {
      console.warn('[AppLingua] Service Worker konnte nicht registriert werden:', error);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    toast('AppLingua ist jetzt auch offline verfügbar.', { tone: 'success' });
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady, toast]);

  if (!needRefresh) return null;

  const update = async () => {
    setUpdating(true);
    try {
      // Offene Schreibvorgänge sichern, bevor die Seite neu lädt.
      await flushLocalWrites().catch(() => undefined);
      await updateServiceWorker(true);
      // Fallback, falls der neue Service Worker die Seite nicht selbst neu lädt.
      window.setTimeout(() => window.location.reload(), 4000);
    } catch {
      setUpdating(false);
      toast('Das Update konnte nicht installiert werden. Bitte lade die Seite neu.', { tone: 'error' });
    }
  };

  return (
    <section className={s.update} aria-labelledby="update-title" aria-live="polite">
      <span className={s.updateIcon} aria-hidden="true">
        <Sparkles />
      </span>
      <div className={s.updateText}>
        <h2 id="update-title" className={s.updateTitle}>
          Neue Version verfügbar
        </h2>
        <p className={s.updateBody}>Aktualisiere für die neuesten Inhalte und Verbesserungen. Dein Fortschritt bleibt erhalten.</p>
      </div>
      <div className={s.updateActions}>
        <Button variant="ghost" onClick={() => setNeedRefresh(false)} disabled={updating}>
          Später
        </Button>
        <Button onClick={update} loading={updating}>
          Aktualisieren
        </Button>
      </div>
    </section>
  );
}
