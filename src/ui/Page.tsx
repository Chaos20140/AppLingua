import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cx } from './internal/helpers';
import { TopBar } from './TopBar';
import s from './Page.module.css';

export interface PageProps {
  /** Seitentitel: großer Titel im Inhalt + kompakter Titel in der Leiste beim Scrollen. Setzt document.title. */
  title?: string;
  /** Unterzeile unter dem großen Titel. */
  subtitle?: ReactNode;
  /** true = zurück im Verlauf (Fallback /dashboard), string = fester Ziel-Pfad. */
  back?: boolean | string;
  /** Aktionen rechts in der Titelleiste. */
  actions?: ReactNode;
  /** Eigenes Element links in der Titelleiste (z. B. Schließen). */
  leading?: ReactNode;
  children?: ReactNode;
  /** Inhaltsbreite: default 760 px, wide 1120 px, full ohne Begrenzung. */
  width?: 'default' | 'wide' | 'full';
  /** false = nur kompakter Titel in der Leiste (z. B. Vollbild-Routen). Standard: true. */
  largeTitle?: boolean;
  /** Abstand zwischen direkten Kindern (Standard: md = 16 px). */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Seitenlayout: Safe-Areas, Titelleiste (sticky, Blur beim Scrollen), großer Titel,
 * Platz für Bottom-Navigation und Bildschirmtastatur. Scrollt mit dem Dokument
 * (natives iOS-Verhalten inkl. Tap auf Statusleiste).
 */
export function Page({
  title,
  subtitle,
  back,
  actions,
  leading,
  children,
  width = 'default',
  largeTitle = true,
  gap = 'md',
  className,
}: PageProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const hasBar = Boolean(title || back || actions || leading);
  const showLarge = Boolean(title) && largeTitle;

  useEffect(() => {
    if (title) document.title = `${title} · AppLingua`;
  }, [title]);

  // Nach einem Seitenwechsel ohne fokussiertes Element: Fokus auf den Inhalt (Screenreader).
  useEffect(() => {
    const active = document.activeElement;
    if (!active || active === document.body) mainRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const barHeight = barRef.current?.offsetHeight ?? 0;
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: `-${Math.round(barHeight)}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showLarge, hasBar]);

  return (
    <div className={cx(s.page, className)}>
      {hasBar && (
        <TopBar
          ref={barRef}
          title={title}
          back={back}
          leading={leading}
          actions={actions}
          elevated={scrolled}
          titleHidden={showLarge && !scrolled}
          titleIsHeading={!showLarge}
        />
      )}
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className={cx(s.main, s[width], s[`gap-${gap}`], !hasBar && s.noBar)}
      >
        {showLarge ? (
          <div ref={sentinelRef} className={s.header}>
            <h1 className={s.title}>{title}</h1>
            {subtitle && <p className={s.subtitle}>{subtitle}</p>}
          </div>
        ) : (
          <div ref={sentinelRef} className={s.sentinel} aria-hidden="true" />
        )}
        {!showLarge && subtitle && <p className={s.subtitle}>{subtitle}</p>}
        {children}
      </main>
    </div>
  );
}
