import { cx } from './internal/helpers';
import s from './Spinner.module.css';

export interface SpinnerProps {
  /** Durchmesser in px (Standard 24). */
  size?: number;
  /** Text für Screenreader. `null` = rein dekorativ (z. B. im ladenden Button). */
  label?: string | null;
  className?: string;
}

export function Spinner({ size = 24, label = 'Lädt …', className }: SpinnerProps) {
  const svg = (
    <svg className={s.svg} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" data-motion-safe="">
      <circle className={s.track} cx="12" cy="12" r="9.5" fill="none" strokeWidth="3" />
      <path className={s.arc} d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5" fill="none" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
  if (label === null) return <span className={cx(s.spinner, className)} aria-hidden="true">{svg}</span>;
  return (
    <span className={cx(s.spinner, className)} role="status">
      {svg}
      <span className="sr-only">{label}</span>
    </span>
  );
}
