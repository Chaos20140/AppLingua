import type { ReactNode } from 'react';
import { Card } from '../../ui';
import s from './Legal.module.css';

/** Abschnitt einer Rechtsseite: Karte mit Icon, Überschrift (h2) und Fließtext. */
export function LegalSection({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card as="section" aria-labelledby={`${id}-title`} padding="lg">
      <div className={s.section} id={id}>
        <div className={s.head}>
          <span className={s.icon} aria-hidden="true">{icon}</span>
          <h2 id={`${id}-title`} className={s.title} tabIndex={-1}>{title}</h2>
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </Card>
  );
}

/** Inhaltsübersicht: springt ohne URL-Änderung zum Abschnitt und setzt den Fokus auf dessen Überschrift. */
export function LegalToc({ items }: { items: { id: string; label: string }[] }) {
  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = document.documentElement.getAttribute('data-motion') === 'reduce'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
  };
  return (
    <nav aria-label="Inhalt" className={s.toc}>
      {items.map((it) => (
        <button key={it.id} type="button" onClick={() => jump(it.id)}>{it.label}</button>
      ))}
    </nav>
  );
}
