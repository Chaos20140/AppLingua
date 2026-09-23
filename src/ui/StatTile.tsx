import type { MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './internal/helpers';
import s from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** Kleiner Zusatz (z. B. „Rekord: 14“). */
  hint?: ReactNode;
  tone?: 'accent' | 'gold' | 'success' | 'info' | 'neutral';
  to?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  className?: string;
}

/** Kennzahl-Kachel (z. B. Streak, XP heute, Level). */
export function StatTile({ label, value, icon, hint, tone = 'accent', to, onClick, className }: StatTileProps) {
  const interactive = to !== undefined || onClick !== undefined;
  const classes = cx(s.tile, s[tone], interactive && s.interactive, className);
  const content = (
    <>
      {icon && <span className={s.icon} aria-hidden="true">{icon}</span>}
      <span className={s.value}>{value}</span>
      <span className={s.label}>{label}</span>
      {hint && <span className={s.hint}>{hint}</span>}
    </>
  );
  if (to !== undefined) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}
