import type { ReactNode } from 'react';
import { clamp01, cx } from './internal/helpers';
import s from './Progress.module.css';

export type ProgressTone = 'accent' | 'gold' | 'success' | 'info';

export interface ProgressBarProps {
  /** Fortschritt 0..1 */
  value: number;
  /** Zugänglicher Name (z. B. „Tagesziel“). */
  label: string;
  /** Beschriftung + Wert sichtbar über dem Balken anzeigen. */
  showLabel?: boolean;
  /** Text statt Prozentwert (z. B. „30 / 50 XP“). */
  valueText?: string;
  tone?: ProgressTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showLabel = false,
  valueText,
  tone = 'accent',
  size = 'md',
  className,
}: ProgressBarProps) {
  const v = clamp01(value);
  const pct = Math.round(v * 100);
  return (
    <div className={cx(s.bar, s[tone], s[size], className)}>
      {showLabel && (
        <div className={s.meta} aria-hidden="true">
          <span className={s.metaLabel}>{label}</span>
          <span className={s.metaValue}>{valueText ?? `${pct} %`}</span>
        </div>
      )}
      <div
        className={s.track}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={valueText ?? `${pct} %`}
      >
        <div className={s.fill} style={{ transform: `translateX(${(v - 1) * 100}%)` }} />
      </div>
    </div>
  );
}

export interface ProgressRingProps {
  /** Fortschritt 0..1 */
  value: number;
  /** Zugänglicher Name. */
  label: string;
  valueText?: string;
  /** Durchmesser in px (Standard 64). */
  size?: number;
  /** Strichstärke in px (Standard: 10 % des Durchmessers, min. 4). */
  stroke?: number;
  tone?: ProgressTone;
  /** Inhalt in der Mitte (z. B. Level oder Prozent). */
  children?: ReactNode;
  className?: string;
}

export function ProgressRing({
  value,
  label,
  valueText,
  size = 64,
  stroke,
  tone = 'accent',
  children,
  className,
}: ProgressRingProps) {
  const v = clamp01(value);
  const pct = Math.round(v * 100);
  const sw = stroke ?? Math.max(4, Math.round(size * 0.1));
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      className={cx(s.ring, s[tone], className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueText ?? `${pct} %`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={s.ringSvg} aria-hidden="true">
        <circle className={s.ringTrack} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} />
        <circle
          className={s.ringFill}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          opacity={v === 0 ? 0 : 1}
        />
      </svg>
      {children !== undefined && <div className={s.ringCenter}>{children}</div>}
    </div>
  );
}
