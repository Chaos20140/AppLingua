import type { MouseEventHandler, ReactNode } from 'react';
import { cx } from './internal/helpers';
import s from './Chip.module.css';

export type ChipTone = 'neutral' | 'accent' | 'gold' | 'success' | 'danger' | 'info';

export interface ChipProps {
  children: ReactNode;
  /** Ausgewählt (für Filter-Chips; setzt aria-pressed). */
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ReactNode;
  tone?: ChipTone;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Chip: interaktiv (Filter/Umschalter) mit `onClick`, sonst reine Kennzeichnung. */
export function Chip({ children, selected, onClick, icon, tone = 'neutral', size = 'md', disabled, className, ...aria }: ChipProps) {
  const classes = cx(s.chip, s[tone], size === 'sm' && s.sm, selected && s.selected, className);
  const content = (
    <>
      {icon && <span className={s.icon} aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cx(classes, s.interactive)} onClick={onClick} aria-pressed={selected} disabled={disabled} {...aria}>
        {content}
      </button>
    );
  }
  return (
    <span className={classes} {...aria}>
      {content}
    </span>
  );
}
