import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './app/ErrorBoundary';
import GlobalOverlays from './app/GlobalOverlays';
import OfflineBanner from './app/OfflineBanner';
import ThemeController from './app/ThemeController';
import UpdatePrompt from './app/UpdatePrompt';
import { bootstrapData } from './data/bootstrap';
import AppRoutes from './routes';
import { ErrorState, LoadingScreen, ToastProvider } from './ui';

/** GitHub-Pages-Basis-Pfad ohne abschließenden Slash (z. B. „/AppLingua“). */
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/';

type BootState = { phase: 'loading' } | { phase: 'ready' } | { phase: 'error'; message: string };

function bootErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : '';
  if (/indexeddb|quota|storage|database/i.test(raw) || (err instanceof DOMException && /Quota|Invalid|Unknown/.test(err.name))) {
    return 'Der lokale Speicher deines Browsers ist nicht verfügbar. Im privaten Modus oder bei vollem Speicher kann AppLingua keine Daten sichern. Bitte prüfe die Browser-Einstellungen und versuche es erneut.';
  }
  return raw && /[äöüß]|\b(der|die|das|nicht|bitte)\b/i.test(raw)
    ? raw
    : 'AppLingua konnte nicht gestartet werden. Bitte versuche es erneut.';
}

function Boot() {
  const [state, setState] = useState<BootState>({ phase: 'loading' });

  const start = useCallback(() => {
    setState({ phase: 'loading' });
    bootstrapData().then(
      () => setState({ phase: 'ready' }),
      (err: unknown) => {
        console.error('[AppLingua] Start fehlgeschlagen:', err);
        setState({ phase: 'error', message: bootErrorMessage(err) });
      },
    );
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  if (state.phase === 'loading') return <LoadingScreen />;
  if (state.phase === 'error') {
    return <ErrorState fullScreen title="Start fehlgeschlagen" message={state.message} onRetry={start} />;
  }
  return (
    <>
      <AppRoutes />
      <GlobalOverlays />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary fullPage>
      <ToastProvider>
        <ThemeController />
        <BrowserRouter basename={basename}>
          <Boot />
          <OfflineBanner />
          <UpdatePrompt />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
