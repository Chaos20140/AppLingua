import type { MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './internal/helpers';
import s from './Card.module.css';

export type CardTone = 'default' | 'muted' | 'outline' | 'accent' | 'gold' | 'success' | 'hero';

export interface CardProps {
  children?: ReactNode;
  /** Semantisches Element (bei `to`/`onClick` ignoriert). */
  as?: 'div' | 'section' | 'article' | 'li' | 'aside';
  /** Ganze Karte als Router-Link. */
  to?: string;
  /** Ganze Karte als Schaltfläche. */
  onClick?: MouseEventHandler<HTMLElement>;
  tone?: CardTone;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const PAD = { none: s.padNone, sm: s.padSm, md: s.padMd, lg: s.padLg } as const;

export function Card({
  children,
  as: Tag = 'div',
  to,
  onClick,
  tone = 'default',
  padding = 'md',
  className,
  ...aria
}: CardProps) {
  const interactive = to !== undefined || onClick !== undefined;
  const classes = cx(s.card, tone !== 'default' && s[tone], PAD[padding], interactive && s.interactive, className);
  if (to !== undefined) {
    return (
      <Link to={to} className={classes} onClick={onClick} {...aria}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} {...aria}>
        {children}
      </button>
    );
  }
  return (
    <Tag className={classes} {...aria}>
      {children}
    </Tag>
  );
}
