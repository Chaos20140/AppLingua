import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './internal/helpers';
import s from './Tabs.module.css';

export interface TabOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  /** Zugänglicher Name, falls `label` kein Text ist. */
  ariaLabel?: string;
  /** Zusatz rechts (z. B. Anzahl). */
  badge?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Zugänglicher Name der Gruppe. */
  label?: string;
  /** Präfix für IDs: Tabs erhalten `${idPrefix}-tab-${value}`, verweisen auf `${idPrefix}-panel-${value}`. */
  idPrefix?: string;
  className?: string;
}

function useRovingKeys<T extends string>(options: TabOption<T>[], value: T, onChange: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) return;
    const current = options.findIndex((o) => o.value === value);
    const pos = Math.max(0, enabled.indexOf(current));
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = enabled[(pos + 1) % enabled.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = enabled[(pos - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

/** Reiter mit Unterstreichung (role=tablist); horizontal scrollbar bei vielen Einträgen. */
export function Tabs<T extends string>({ options, value, onChange, label, idPrefix, className }: TabsProps<T>) {
  const { refs, onKeyDown } = useRovingKeys(options, value, onChange);
  return (
    <div className={cx(s.tabs, className)} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${o.value}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${o.value}` : undefined}
            aria-selected={selected}
            aria-label={o.ariaLabel}
            tabIndex={selected ? 0 : -1}
            disabled={o.disabled}
            className={s.tab}
            onClick={() => onChange(o.value)}
          >
            {o.icon && <span className={s.icon} aria-hidden="true">{o.icon}</span>}
            <span>{o.label}</span>
            {o.badge !== undefined && <span className={s.badge}>{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

export type SegmentedProps<T extends string = string> = Omit<TabsProps<T>, 'idPrefix'> & {
  size?: 'md' | 'sm';
};

/** Segment-Umschalter (role=radiogroup) mit gleitendem Indikator. */
export function Segmented<T extends string>({ options, value, onChange, label, size = 'md', className }: SegmentedProps<T>) {
  const { refs, onKeyDown } = useRovingKeys(options, value, onChange);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const style = { '--count': options.length, '--index': index } as CSSProperties;
  return (
    <div
      className={cx(s.segmented, size === 'sm' && s.segSm, className)}
      role="radiogroup"
      aria-label={label}
      style={style}
      onKeyDown={onKeyDown}
    >
      <span className={s.thumb} aria-hidden="true" />
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.ariaLabel}
            tabIndex={selected ? 0 : -1}
            disabled={o.disabled}
            className={s.segment}
            onClick={() => onChange(o.value)}
          >
            {o.icon && <span className={s.icon} aria-hidden="true">{o.icon}</span>}
            <span className={s.segLabel}>{o.label}</span>
            {o.badge !== undefined && <span className={s.badge}>{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
