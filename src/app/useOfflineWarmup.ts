import { useEffect } from 'react';
import { loadCourse } from '../content/registry';
import { useActiveCourse } from '../state/settings';

/**
 * Kurs-Chunks, die der Service Worker nicht vorab (Precache), sondern per Runtime-Cache vorhält.
 * Synchron halten mit `runtimeCaching` in vite.config.ts.
 */
const CONTENT_CHUNK = /\/assets\/pt-BR-[\w-]+\.js$/;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Legt bereits geladene Kurs-Chunks in den Runtime-Cache des Service Workers. Nötig beim ersten
 * Besuch: Dann steuert der gerade installierte Service Worker die Seite noch nicht, der Chunk kam
 * am Service Worker vorbei aus dem Netz. Workbox verarbeitet die Nachricht „CACHE_URLS“ selbst.
 */
async function warmServiceWorkerCache(): Promise<void> {
  if (!('serviceWorker' in navigator) || typeof performance?.getEntriesByType !== 'function') return;
  const urls = performance.getEntriesByType('resource')
    .map((e) => e.name)
    .filter((name) => {
      try {
        const u = new URL(name);
        return u.origin === location.origin && CONTENT_CHUNK.test(u.pathname);
      } catch {
        return false;
      }
    });
  if (!urls.length) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: 'CACHE_URLS', payload: { urlsToCache: [...new Set(urls)] } });
}

/**
 * Lädt den aktiven Kurs nach dem Start im Leerlauf vor, damit Lernpfad und Lektionen sofort
 * und auch offline verfügbar sind (Spanisch liegt im Precache, Portugiesisch im Runtime-Cache).
 */
export function useOfflineWarmup(): void {
  const course = useActiveCourse();
  useEffect(() => {
    let alive = true;
    const run = () => {
      loadCourse(course)
        .then(() => (alive ? warmServiceWorkerCache() : undefined))
        .catch(() => undefined); // offline/Fehler: Die Seite lädt den Kurs bei Bedarf selbst und zeigt ggf. einen Fehler.
    };
    const w = window as IdleWindow;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 5000 });
      return () => { alive = false; w.cancelIdleCallback?.(id); };
    }
    const t = window.setTimeout(run, 3000);
    return () => { alive = false; window.clearTimeout(t); };
  }, [course]);
}
