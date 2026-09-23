import { Suspense, useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { cx } from '../ui/internal/helpers';
import BottomNav from './BottomNav';
import ErrorBoundary from './ErrorBoundary';
import PageSkeleton from './PageSkeleton';
import Sidebar from './Sidebar';
import { useKeyboardInset } from './useKeyboardInset';
import s from './AppShell.module.css';

export interface AppShellProps {
  /** Vollbild-Routen (Onboarding, Auth, Lektion, Prüfung, Song-Player, Partner-Chat) ohne Navigation. */
  fullscreen?: boolean;
}

/**
 * App-Rahmen: Bottom-Navigation (≤ 1023 px) bzw. Seitenleiste (≥ 1024 px), Seiten per <Outlet/>
 * mit Lade-Platzhalter und Fehlergrenze je Seite.
 */
export default function AppShell({ fullscreen = false }: AppShellProps) {
  const location = useLocation();
  const navigationType = useNavigationType();
  useKeyboardInset();

  // Bottom-Navigation reserviert Platz (CSS-Variable --nav-space).
  useEffect(() => {
    document.documentElement.setAttribute('data-nav', fullscreen ? 'none' : 'bottom');
  }, [fullscreen]);

  // Neue Seite beginnt oben; Zurück/Vor behält die Browser-Scrollposition.
  useLayoutEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  return (
    <div className={cx(s.shell, !fullscreen && s.withNav)}>
      <a
        href="#main"
        className={s.skip}
        onClick={(e) => {
          const main = document.getElementById('main');
          if (!main) return;
          e.preventDefault();
          main.focus();
          main.scrollIntoView({ block: 'start' });
        }}
      >
        Zum Inhalt springen
      </a>
      {!fullscreen && <Sidebar />}
      <div className={s.content}>
        <ErrorBoundary resetKey={location.pathname}>
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      {!fullscreen && <BottomNav />}
    </div>
  );
}
