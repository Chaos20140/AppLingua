import type { StageState } from '../../engine/unlock';
import type { BadgeTone } from '../../ui';
import { cx } from '../dashboard/Section';
import s from './Tags.module.css';

export const STAGE_STATE_LABEL: Record<StageState, string> = {
  locked: 'Gesperrt',
  available: 'Freigeschaltet',
  completed: 'Gemeistert',
  'coming-soon': 'In Vorbereitung',
};

export const stageBadgeTone = (st: StageState): BadgeTone =>
  st === 'completed' ? 'success' : st === 'available' ? 'accent' : st === 'coming-soon' ? 'info' : 'neutral';

/** Nicht interaktive Schlagwort-Liste (Grammatik, Wortfelder). */
export function TagList({ items, max = 12 }: { items: readonly string[]; max?: number }) {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <ul className={s.tags}>
      {shown.map((t) => (
        <li key={t} className={s.tag}>
          {t}
        </li>
      ))}
      {rest > 0 && <li className={cx(s.tag, s.tagMore)}>+{rest} weitere</li>}
    </ul>
  );
}
