import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cx } from '../../ui/internal/helpers';
import s from './Onboarding.module.css';

export interface Choice<T extends string> {
  value: T;
  title: ReactNode;
  description?: ReactNode;
  /** Emoji oder Icon links */
  leading?: ReactNode;
  /** Zusatz neben dem Titel (z. B. Badge „Empfohlen“) */
  badge?: ReactNode;
}

interface ChoiceListProps<T extends string> {
  name: string;
  legend: string;
  choices: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
}

/** Große Auswahlkarten als native Radiogruppe (Pfeiltasten, Screenreader, Enter sendet das Formular ab). */
export function ChoiceList<T extends string>({ name, legend, choices, value, onChange }: ChoiceListProps<T>) {
  return (
    <fieldset className={s.options}>
      <legend className="sr-only">{legend}</legend>
      {choices.map((c) => {
        const selected = c.value === value;
        return (
          <label key={c.value} className={cx(s.option, selected && s.optionSelected)}>
            <input
              className={s.radio}
              type="radio"
              name={name}
              value={c.value}
              checked={selected}
              onChange={() => onChange(c.value)}
            />
            {c.leading !== undefined && <span className={s.optionLead} aria-hidden="true">{c.leading}</span>}
            <span className={s.optionText}>
              <span className={s.optionTitle}>
                {c.title}
                {c.badge}
              </span>
              {c.description && <span className={s.optionDesc}>{c.description}</span>}
            </span>
            <span className={s.check} aria-hidden="true">
              <Check size={16} strokeWidth={3} />
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
