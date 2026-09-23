import { useId, type ReactNode } from 'react';
import { cx } from './internal/helpers';
import s from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /** Beschriftung nur für Screenreader. */
  hideLabel?: boolean;
  id?: string;
  className?: string;
}

/** Schalter (role=switch) mit ganzer Zeile als Trefferfläche. */
export function Toggle({ checked, onChange, label, description, disabled, hideLabel, id, className }: ToggleProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  return (
    <label className={cx(s.row, disabled && s.disabled, hideLabel && s.compact, className)} htmlFor={inputId}>
      <span className={cx(s.text, hideLabel && 'sr-only')}>
        <span className={s.label}>{label}</span>
        {description && (
          <span id={descId} className={s.description}>
            {description}
          </span>
        )}
      </span>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className={s.input}
        checked={checked}
        disabled={disabled}
        aria-checked={checked}
        aria-describedby={description ? descId : undefined}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={s.track} aria-hidden="true">
        <span className={s.thumb} />
      </span>
    </label>
  );
}
