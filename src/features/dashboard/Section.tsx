import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import s from './Section.module.css';

/** Klassen zusammenführen (falsy wird ignoriert). */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export interface SectionProps {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  /** rechts neben dem Titel, z. B. <SectionLink> */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  id?: string;
}

/** Inhaltsabschnitt mit Überschrift (h2) – einheitlich auf allen Übersichtsseiten. */
export function Section({ title, eyebrow, description, action, children, className, id }: SectionProps) {
  const hid = useId();
  return (
    <section className={cx(s.section, className)} aria-labelledby={hid} id={id}>
      <div className={s.head}>
        <div className={s.headText}>
          {eyebrow && <p className={s.eyebrow}>{eyebrow}</p>}
          <h2 id={hid} className={s.title}>
            {title}
          </h2>
        </div>
        {action}
      </div>
      {description && <div className={s.desc}>{description}</div>}
      {children}
    </section>
  );
}

export function SectionLink({ to, children, label }: { to: string; children: ReactNode; label?: string }) {
  return (
    <Link to={to} className={s.link} aria-label={label}>
      {children}
      <ChevronRight aria-hidden="true" />
    </Link>
  );
}
