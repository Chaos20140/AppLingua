import type { ComponentPropsWithRef, MouseEvent, MouseEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './internal/helpers';
import { Spinner } from './Spinner';
import s from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Zeigt einen Spinner, blockiert weitere Klicks, behält aber den Fokus. */
  loading?: boolean;
  /** Icon links vom Text (z. B. `<Play />` aus lucide-react). */
  icon?: ReactNode;
  /** Icon rechts vom Text. */
  iconRight?: ReactNode;
  /** Volle Breite. */
  block?: boolean;
  children?: ReactNode;
  /** Als Router-Link rendern (Navigation statt Aktion). */
  to?: string;
  replace?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  block = false,
  className,
  children,
  to,
  replace,
  disabled,
  type = 'button',
  onClick,
  ref,
  ...rest
}: ButtonProps) {
  const hasLabel = children !== undefined && children !== null && children !== false;
  const classes = cx(
    s.btn,
    s[variant],
    size === 'lg' && s.lg,
    block && s.block,
    loading && s.loading,
    !hasLabel && s.iconOnly,
    className,
  );
  const content = (
    <>
      {loading && (
        <span className={s.spinner}>
          <Spinner size={size === 'lg' ? 22 : 20} label={null} />
        </span>
      )}
      {icon && <span className={s.icon} aria-hidden="true">{icon}</span>}
      {hasLabel && <span className={s.label}>{children}</span>}
      {iconRight && <span className={s.icon} aria-hidden="true">{iconRight}</span>}
    </>
  );

  if (to !== undefined) {
    const inactive = Boolean(disabled || loading);
    const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
      if (inactive) {
        e.preventDefault();
        return;
      }
      (onClick as unknown as MouseEventHandler<HTMLAnchorElement> | undefined)?.(e);
    };
    return (
      <Link
        to={to}
        replace={replace}
        className={classes}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        aria-label={rest['aria-label']}
        aria-describedby={rest['aria-describedby']}
        id={rest.id}
        title={rest.title}
        tabIndex={disabled ? -1 : undefined}
        onClick={handleLinkClick}
      >
        {content}
      </Link>
    );
  }

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </button>
  );
}
