import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './internal/helpers';
import s from './IconButton.module.css';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children' | 'aria-label'> {
  /** Pflicht: zugänglicher Name (wird als aria-label gesetzt). */
  label: string;
  icon: ReactNode;
  variant?: 'plain' | 'tonal' | 'solid' | 'outline';
  /** Sichtbare Größe; die Trefferfläche ist immer mindestens 44 × 44 px. */
  size?: 'sm' | 'md' | 'lg';
  /** Für Umschalter (z. B. Favorit): setzt aria-pressed. */
  pressed?: boolean;
  /** Kleiner Punkt als Hinweis (z. B. neue Inhalte). */
  dot?: boolean;
  /** Als Router-Link rendern. */
  to?: string;
}

export function IconButton({
  label,
  icon,
  variant = 'plain',
  size = 'md',
  pressed,
  dot = false,
  to,
  className,
  type = 'button',
  ref,
  ...rest
}: IconButtonProps) {
  const classes = cx(s.btn, s[variant], s[size], pressed && s.pressed, className);
  const inner = (
    <>
      <span className={s.icon} aria-hidden="true">{icon}</span>
      {dot && <span className={s.dot} aria-hidden="true" />}
    </>
  );
  if (to !== undefined) {
    return (
      <Link to={to} className={classes} aria-label={label} title={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={classes} aria-label={label} title={label} aria-pressed={pressed} {...rest}>
      {inner}
    </button>
  );
}
