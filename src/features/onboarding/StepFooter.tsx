import type { ReactNode } from 'react';
import { cx } from '../../ui/internal/helpers';
import s from './Onboarding.module.css';

/**
 * Fixierte Aktionsleiste unten (über Safe-Area und Tastatur) + Platzhalter im Fluss,
 * damit nichts verdeckt wird.
 */
export function StepFooter({ children, tall = false }: { children: ReactNode; tall?: boolean }) {
  return (
    <>
      <div className={cx(s.footerSpacer, tall && s.footerSpacerTall)} aria-hidden="true" />
      <div className={s.footer}>
        <div className={s.footerInner}>{children}</div>
      </div>
    </>
  );
}
