import { useCallback, useId, useLayoutEffect, useRef, type ComponentPropsWithRef, type ReactNode, type Ref } from 'react';
import { ChevronDown, CircleAlert } from 'lucide-react';
import { cx } from './internal/helpers';
import s from './Field.module.css';

interface FieldFrameProps {
  id: string;
  label: string;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactNode;
  /** Rechts unter dem Feld (z. B. Zeichenzähler). */
  aside?: ReactNode;
}

function FieldFrame({ id, label, hideLabel, hint, error, className, children, aside }: FieldFrameProps) {
  return (
    <div className={cx(s.field, className)}>
      <label htmlFor={id} className={cx(s.label, hideLabel && 'sr-only')}>
        {label}
      </label>
      {children}
      {((hint && !error) || aside) && (
        <div className={s.below}>
          {hint && !error ? (
            <p id={`${id}-hint`} className={s.hint}>
              {hint}
            </p>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}
      <p id={`${id}-error`} className={s.error} aria-live="polite" hidden={!error}>
        {error && (
          <>
            <CircleAlert aria-hidden="true" />
            <span>{error}</span>
          </>
        )}
      </p>
    </div>
  );
}

function describedBy(id: string, hint: ReactNode, error: string | null | undefined, extra?: string) {
  const ids = [extra, error ? `${id}-error` : hint ? `${id}-hint` : undefined].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

// ───────────────────────── TextField ─────────────────────────

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'size'> {
  label: string;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string | null;
  /** Element links im Feld (z. B. Such-Icon). */
  leading?: ReactNode;
  /** Element rechts im Feld (z. B. IconButton „Passwort anzeigen“). */
  trailing?: ReactNode;
  /** Klasse für den äußeren Container. */
  className?: string;
  /** Klasse für das input-Element. */
  inputClassName?: string;
}

export function TextField({
  label,
  hideLabel,
  hint,
  error,
  leading,
  trailing,
  className,
  inputClassName,
  id,
  disabled,
  ref,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame id={fieldId} label={label} hideLabel={hideLabel} hint={hint} error={error} className={className}>
      <div className={cx(s.control, error && s.invalid, disabled && s.disabled)}>
        {leading && <span className={s.adornment} aria-hidden="true">{leading}</span>}
        <input
          ref={ref}
          id={fieldId}
          className={cx(s.input, leading !== undefined && s.hasLeading, inputClassName)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error, ariaDescribedBy)}
          {...rest}
        />
        {trailing && <span className={s.trailing}>{trailing}</span>}
      </div>
    </FieldFrame>
  );
}

// ───────────────────────── TextArea ─────────────────────────

export interface TextAreaProps extends ComponentPropsWithRef<'textarea'> {
  label: string;
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string | null;
  /** Höhe wächst mit dem Inhalt (Standard: true). */
  autoGrow?: boolean;
  /** Maximale Höhe in Zeilen beim automatischen Wachsen (Standard: 12). */
  maxRows?: number;
  className?: string;
  /** Zeichenzähler anzeigen (nutzt maxLength). */
  showCount?: boolean;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export function TextArea({
  label,
  hideLabel,
  hint,
  error,
  autoGrow = true,
  maxRows = 12,
  className,
  showCount = false,
  id,
  rows = 3,
  disabled,
  onInput,
  ref,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: TextAreaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = innerRef.current;
    if (!el || !autoGrow) return;
    const cs = getComputedStyle(el);
    const lineHeight = parseFloat(cs.lineHeight) || 24;
    const chrome = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    el.style.height = 'auto';
    const max = lineHeight * maxRows + chrome;
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [autoGrow, maxRows]);

  useLayoutEffect(() => {
    resize();
  }, [resize, rest.value]);

  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      assignRef(ref, el);
    },
    [ref],
  );

  const length = typeof rest.value === 'string' ? rest.value.length : undefined;

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      hideLabel={hideLabel}
      hint={hint}
      error={error}
      className={className}
      aside={
        showCount && rest.maxLength !== undefined && length !== undefined ? (
          <p className={s.count} aria-hidden="true">
            {length} / {rest.maxLength}
          </p>
        ) : undefined
      }
    >
      <div className={cx(s.control, s.multiline, error && s.invalid, disabled && s.disabled)}>
        <textarea
          ref={setRefs}
          id={fieldId}
          rows={rows}
          className={cx(s.input, s.textarea, autoGrow && s.autoGrow)}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error, ariaDescribedBy)}
          onInput={(e) => {
            resize();
            onInput?.(e);
          }}
          {...rest}
        />
      </div>
    </FieldFrame>
  );
}

// ───────────────────────── Select ─────────────────────────

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string>
  extends Omit<ComponentPropsWithRef<'select'>, 'onChange' | 'value' | 'defaultValue' | 'children'> {
  label: string;
  hideLabel?: boolean;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}

export function Select<T extends string>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  hint,
  error,
  className,
  id,
  disabled,
  ref,
  'aria-describedby': ariaDescribedBy,
  ...rest
}: SelectProps<T>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame id={fieldId} label={label} hideLabel={hideLabel} hint={hint} error={error} className={className}>
      <div className={cx(s.control, error && s.invalid, disabled && s.disabled)}>
        <select
          ref={ref}
          id={fieldId}
          className={cx(s.input, s.select)}
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error, ariaDescribedBy)}
          onChange={(e) => onChange(e.target.value as T)}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className={s.chevron} aria-hidden="true" />
      </div>
    </FieldFrame>
  );
}
