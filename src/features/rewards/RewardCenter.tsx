/**
 * Globales Belohnungs-Zentrum: hört auf onReward (Level-ups, neue Abzeichen) und zeigt sie
 * nacheinander als Celebration. Während Lektionen, Prüfungen und anderen Fokus-Abläufen wird
 * gesammelt und erst danach gefeiert. XP-Ereignisse werden nicht einzeln gezeigt.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BADGES_BY_ID } from '../../engine/badges';
import { Celebration } from '../../ui';
import { onReward } from '../../state/rewards';
import { enqueueReward, initialRewardQueue, isFocusRoute, type RewardItem, type RewardQueueState } from './rewardQueue';
import s from './RewardCenter.module.css';

const isKnownBadge = (id: string) => BADGES_BY_ID.has(id);
/** kurze Pause zwischen zwei Feiern bzw. nach einem Seitenwechsel */
const GAP_MS = 450;
/** Dauer der Schließ-Animation der Celebration */
const EXIT_MS = 280;

export default function RewardCenter() {
  const location = useLocation();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<RewardQueueState>(initialRewardQueue);
  const [current, setCurrent] = useState<RewardItem | null>(null);
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => onReward((e) => setQueue((q) => enqueueReward(q, e, isKnownBadge))), []);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const deferred = isFocusRoute(location.pathname);
  const next = queue.queue[0] ?? null;

  useEffect(() => {
    if (current || deferred || !next) return;
    const t = window.setTimeout(() => {
      setQueue((q) => ({ ...q, queue: q.queue.slice(1) }));
      setCurrent(next);
      setOpen(true);
    }, GAP_MS);
    return () => window.clearTimeout(t);
  }, [current, deferred, next]);

  const close = () => {
    setOpen(false);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setCurrent(null), EXIT_MS);
  };

  const goTo = (path: string) => {
    close();
    navigate(path);
  };

  if (!current) return null;

  if (current.kind === 'level-up') {
    return (
      <Celebration
        open={open}
        onClose={close}
        variant="level-up"
        kicker="Level-up"
        level={current.level}
        title={`Level ${current.level} erreicht!`}
        message={
          <p>
            Dein Titel: <strong>{current.title}</strong>. Weiter so – jede Übung bringt dich voran.
          </p>
        }
        primaryLabel="Weiter"
        secondaryLabel="Level-Leiter ansehen"
        onSecondary={() => goTo('/erfolge')}
      />
    );
  }

  const defs = current.badgeIds.map((id) => BADGES_BY_ID.get(id)).filter((d): d is NonNullable<typeof d> => !!d);
  if (!defs.length) return null;
  const single = defs.length === 1 ? defs[0] : null;

  return (
    <Celebration
      open={open}
      onClose={close}
      variant="badge"
      kicker={single ? 'Neues Abzeichen' : 'Neue Abzeichen'}
      icon={<span className={s.emoji} aria-hidden="true">{defs[0].icon}</span>}
      title={single ? single.title : `${defs.length} neue Abzeichen`}
      message={
        single ? (
          <p>{single.description}</p>
        ) : (
          <ul className={s.list}>
            {defs.map((d) => (
              <li key={d.id}>
                <span className={s.itemIcon} aria-hidden="true">
                  {d.icon}
                </span>
                <span>
                  <strong>{d.title}</strong> – {d.description}
                </span>
              </li>
            ))}
          </ul>
        )
      }
      primaryLabel="Weiter"
      secondaryLabel="Alle Erfolge"
      onSecondary={() => goTo('/erfolge')}
    />
  );
}
