import type { MouseEventHandler, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cx } from './internal/helpers';
import s from './ListRow.module.css';

export interface ListRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Icon/Avatar links (wird in eine getönte Kachel gesetzt). */
  leading?: ReactNode;
  /** Rohes Element links ohne Kachel (z. B. ProgressRing). */
  leadingRaw?: ReactNode;
  /** Rechts: Wert, Badge, Toggle … */
  trailing?: ReactNode;
  to?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  /** Chevron anzeigen (Standard: bei `to`). */
  chevron?: boolean;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'gold' | 'success';
  className?: string;
  'aria-label'?: string;
}

/** Listenzeile im iOS-Stil – ideal in `<Card padding="none">` gruppiert. */
export function ListRow({
  title,
  subtitle,
  leading,
  leadingRaw,
  trailing,
  to,
  onClick,
  chevron,
  disabled = false,
  tone = 'default',
  className,
  ...aria
}: ListRowProps) {
  const interactive = (to !== undefined || onClick !== undefined) && !disabled;
  const showChevron = chevron ?? to !== undefined;
  const classes = cx(
    s.row,
    tone !== 'default' && s[tone],
    interactive && s.interactive,
    disabled && s.disabled,
    (leading !== undefined || leadingRaw !== undefined) && s.withLeading,
    className,
  );
  const content = (
    <>
      {leadingRaw}
      {leading && <span className={s.leading} aria-hidden="true">{leading}</span>}
      <span className={s.text}>
        <span className={s.title}>{title}</span>
        {subtitle && <span className={s.subtitle}>{subtitle}</span>}
      </span>
      {trailing !== undefined && <span className={s.trailing}>{trailing}</span>}
      {showChevron && <ChevronRight className={s.chevron} aria-hidden="true" />}
    </>
  );
  if (to !== undefined && !disabled) {
    return (
      <Link to={to} className={classes} onClick={onClick} {...aria}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} disabled={disabled} {...aria}>
        {content}
      </button>
    );
  }
  return (
    <div className={classes} aria-disabled={disabled || undefined} {...aria}>
      {content}
    </div>
  );
}
