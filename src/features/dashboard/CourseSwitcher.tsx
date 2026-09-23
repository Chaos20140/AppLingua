import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import type { CourseId, Variant } from '../../core/types';
import { BottomSheet } from '../../ui';
import { setActiveCourse, useSettings, variantOf, VARIANT_LABELS } from '../../state/settings';
import { cx } from './Section';
import s from './CourseSwitcher.module.css';

const COURSES: { id: CourseId; name: string; native: string; lang: string }[] = [
  { id: 'es', name: 'Spanisch', native: 'Español', lang: 'es' },
  { id: 'pt-BR', name: 'Portugiesisch', native: 'Português', lang: 'pt-BR' },
];

export const flagFor = (v: Variant) => (v === 'es-ES' ? '🇪🇸' : v === 'es-LA' ? '🌎' : '🇧🇷');
export const courseName = (id: CourseId) => COURSES.find((c) => c.id === id)?.name ?? id;

/** Kurswechsel-Chip (öffnet ein Sheet mit beiden Kursen). */
export function CourseSwitcher() {
  const settings = useSettings();
  const active = settings.activeCourse;
  const [open, setOpen] = useState(false);
  const cur = COURSES.find((c) => c.id === active) ?? COURSES[0];
  const v = variantOf(settings, active);

  return (
    <>
      <button
        type="button"
        className={s.chip}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Aktiver Kurs: ${VARIANT_LABELS[v]}. Kurs wechseln`}
      >
        <span className={s.flag} aria-hidden="true">
          {flagFor(v)}
        </span>
        <span className={s.name}>{cur.name}</span>
        <ChevronDown className={s.chev} aria-hidden="true" />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Kurs wechseln"
        description="Jeder Kurs hat seinen eigenen Lernpfad, eigene Prüfungen und ein eigenes Sprachniveau. XP und Spielerlevel sammelst du kursübergreifend."
      >
        <ul className={s.list}>
          {COURSES.map((c) => {
            const cv = variantOf(settings, c.id);
            const isActive = c.id === active;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={cx(s.option, isActive && s.optionActive)}
                  aria-pressed={isActive}
                  onClick={() => {
                    if (!isActive) setActiveCourse(c.id);
                    setOpen(false);
                  }}
                >
                  <span className={s.optFlag} aria-hidden="true">
                    {flagFor(cv)}
                  </span>
                  <span className={s.optText}>
                    <span className={s.optName}>
                      {c.name} <span lang={c.lang} className={s.native}>· {c.native}</span>
                    </span>
                    <span className={s.optSub}>{VARIANT_LABELS[cv]}</span>
                  </span>
                  {isActive && <Check className={s.check} aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className={s.note}>
          Die Variante (Spanien oder Lateinamerika) kannst du in den <Link to="/einstellungen">Einstellungen</Link> ändern.
        </p>
      </BottomSheet>
    </>
  );
}
