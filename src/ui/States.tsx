import type { ReactNode } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { cx } from './internal/helpers';
import { LogoMark } from './internal/LogoMark';
import { Button } from './Button';
import { Spinner } from './Spinner';
import s from './States.module.css';

// ───────────────────────── EmptyState ─────────────────────────

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Handlungsaufforderung (z. B. `<Button to="/songs">Songs entdecken</Button>`). */
  action?: ReactNode;
  compact?: boolean;
  /** Überschriftenebene – 3, wenn der leere Zustand in einem Abschnitt mit eigener h2 steht. */
  headingLevel?: 2 | 3;
  className?: string;
}

export function EmptyState({ icon, title, description, action, compact = false, headingLevel = 2, className }: EmptyStateProps) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return (
    <div className={cx(s.state, compact && s.compact, className)}>
      {icon && <div className={s.icon} aria-hidden="true">{icon}</div>}
      <Heading className={s.title}>{title}</Heading>
      {description && <div className={s.description}>{description}</div>}
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}

// ───────────────────────── ErrorState ─────────────────────────

export interface ErrorStateProps {
  /** Verständliche Fehlermeldung (Deutsch). */
  message: string;
  title?: string;
  /** „Erneut versuchen“ – nur anzeigen, wenn es wirklich etwas tut. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Zusätzliche Aktion (z. B. Link zur Startseite). */
  action?: ReactNode;
  /** Bildschirmfüllend zentriert (z. B. beim App-Start). */
  fullScreen?: boolean;
  className?: string;
}

export function ErrorState({
  message,
  title = 'Das hat nicht geklappt',
  onRetry,
  retryLabel = 'Erneut versuchen',
  action,
  fullScreen = false,
  className,
}: ErrorStateProps) {
  return (
    <div className={cx(s.state, fullScreen && s.fullScreen, className)} role="alert">
      <div className={cx(s.icon, s.iconDanger)} aria-hidden="true">
        <TriangleAlert />
      </div>
      <h2 className={s.title}>{title}</h2>
      <p className={s.description}>{message}</p>
      {(onRetry || action) && (
        <div className={s.action}>
          {onRetry && (
            <Button variant="primary" icon={<RotateCcw />} onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          {action}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── LoadingScreen ─────────────────────────

export interface LoadingScreenProps {
  label?: string;
}

/** Bildschirmfüllender Ladezustand (App-Start). Erscheint leicht verzögert, um Flackern zu vermeiden. */
export function LoadingScreen({ label = 'AppLingua wird geladen …' }: LoadingScreenProps) {
  return (
    <div className={s.loading} role="status" aria-live="polite" aria-busy="true">
      <div className={s.logo}>
        <LogoMark size={76} />
      </div>
      <div className={s.loadingRow}>
        <Spinner size={18} label={null} />
        <span>{label}</span>
      </div>
    </div>
  );
}

// ───────────────────────── Skeleton ─────────────────────────

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  /** Eckenradius (Standard: 12 px, Kreis bei `circle`). */
  radius?: number | string;
  circle?: boolean;
  /** Mehrere Textzeilen (letzte kürzer). */
  lines?: number;
  className?: string;
}

/** Platzhalter während des Ladens (für Screenreader verborgen). */
export function Skeleton({ width, height = 16, radius, circle = false, lines, className }: SkeletonProps) {
  if (lines && lines > 1) {
    return (
      <div className={cx(s.lines, className)} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <span
            key={i}
            className={s.skeleton}
            style={{ height, width: i === lines - 1 ? '62%' : '100%', borderRadius: radius ?? 8 }}
          />
        ))}
      </div>
    );
  }
  return (
    <span
      className={cx(s.skeleton, className)}
      aria-hidden="true"
      style={{
        width: circle ? height : (width ?? '100%'),
        height,
        borderRadius: circle ? '50%' : (radius ?? 12),
      }}
    />
  );
}
