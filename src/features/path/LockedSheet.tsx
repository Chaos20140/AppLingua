import { useState } from 'react';
import { CircleDashed } from 'lucide-react';
import { BottomSheet, Button } from '../../ui';
import type { LockInfo } from './pathModel';
import s from './LockedSheet.module.css';

export interface LockedSheetProps {
  info: LockInfo | null;
  onClose: () => void;
  /** echte Navigation, z. B. zum aktuellen Schritt */
  action?: { label: string; to: string } | null;
}

/** „Was fehlt noch?“ – erklärt ehrlich, warum etwas gesperrt ist. */
export function LockedSheet({ info, onClose, action }: LockedSheetProps) {
  // Inhalt während der Schließ-Animation behalten
  const [kept, setKept] = useState<{ info: LockInfo; action?: LockedSheetProps['action'] } | null>(null);
  if (info && kept?.info !== info) setKept({ info, action });
  const shown = info ? { info, action } : kept;

  return (
    <BottomSheet
      open={!!info}
      onClose={onClose}
      title="Was fehlt noch?"
      description={shown?.info.title}
      footer={
        <div className={s.footer}>
          {shown?.action && (
            <Button to={shown.action.to} block onClick={onClose}>
              {shown.action.label}
            </Button>
          )}
          <Button variant="secondary" block onClick={onClose}>
            Verstanden
          </Button>
        </div>
      }
    >
      {shown?.info.intro && <p className={s.intro}>{shown.info.intro}</p>}
      <ul className={s.reasons}>
        {shown?.info.reasons.map((r, i) => (
          <li key={i}>
            <CircleDashed aria-hidden="true" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <p className={s.note}>Kein Druck: Alles, was du schon freigeschaltet hast, kannst du jederzeit wiederholen.</p>
    </BottomSheet>
  );
}
