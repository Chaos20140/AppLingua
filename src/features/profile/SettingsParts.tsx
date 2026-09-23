import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Card } from '../../ui';
import { cx } from '../../ui/internal/helpers';
import s from './Profile.module.css';

/** Gruppierter Abschnitt im iOS-Stil. */
export function Section({ id, title, icon, note, children }: { id: string; title: string; icon?: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={s.section}>
      <h2 id={id} className={s.sectionTitle}>
        {icon && <span aria-hidden="true">{icon}</span>}
        {title}
      </h2>
      <Card padding="none">
        <div className={s.group}>{children}</div>
      </Card>
      {note && <p className={s.sectionNote}>{note}</p>}
    </section>
  );
}

export function Item({ children, tight = false }: { children: ReactNode; tight?: boolean }) {
  return <div className={cx(s.item, tight && s.itemTight)}>{children}</div>;
}

export function ItemHead({ label, description, id }: { label: string; description?: ReactNode; id?: string }) {
  return (
    <>
      <span className={s.label} id={id}>{label}</span>
      {description && <span className={s.desc}>{description}</span>}
    </>
  );
}

export const fmtRate = (v: number) => `${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}×`;

/** Schieberegler, der erst nach kurzer Pause speichert (keine Schreibflut beim Ziehen). */
export function RateSlider({ label, value, min, max, onCommit, disabled }: {
  label: string; value: number; min: number; max: number; onCommit: (v: number) => void; disabled?: boolean;
}) {
  const id = useId();
  const [local, setLocal] = useState(value);
  const commitRef = useRef(onCommit);
  useEffect(() => { commitRef.current = onCommit; });
  useEffect(() => { setLocal(value); }, [value]);
  useEffect(() => {
    if (Math.abs(local - value) < 0.001) return;
    const t = window.setTimeout(() => commitRef.current(local), 250);
    return () => window.clearTimeout(t);
  }, [local, value]);
  return (
    <div className={s.range}>
      <div className={s.rangeHead}>
        <label htmlFor={id} className={s.label}>{label}</label>
        <span className={s.rangeValue} aria-hidden="true">{fmtRate(local)}</span>
      </div>
      <input
        id={id}
        className={s.slider}
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={local}
        disabled={disabled}
        onChange={(e) => setLocal(Number(e.target.value))}
        aria-valuetext={`${fmtRate(local)} Geschwindigkeit`}
      />
    </div>
  );
}
