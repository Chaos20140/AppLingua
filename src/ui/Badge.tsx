import type { ReactNode } from 'react';
import { cx } from './internal/helpers';
import s from './Badge.module.css';

export type BadgeTone = 'neutral' | 'accent' | 'gold' | 'success' | 'danger' | 'info' | 'warning';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** Kräftige Füllung statt getönt. */
  solid?: boolean;
  icon?: ReactNode;
  className?: string;
  title?: string;
}

/** Kleine, nicht interaktive Kennzeichnung (z. B. „Neu“, „A1“, „+20 XP“). */
export function Badge({ children, tone = 'neutral', solid = false, icon, className, title }: BadgeProps) {
  return (
    <span className={cx(s.badge, s[tone], solid && s.solid, className)} title={title}>
      {icon && <span className={s.icon} aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
