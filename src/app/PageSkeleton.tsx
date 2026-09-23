import { Skeleton } from '../ui';
import s from './PageSkeleton.module.css';

/** Platzhalter, solange ein Seitenmodul (lazy) geladen wird. */
export default function PageSkeleton() {
  return (
    <div className={s.page} aria-busy="true">
      <span className="sr-only" role="status">
        Seite wird geladen …
      </span>
      <div className={s.bar} />
      <div className={s.content}>
        <Skeleton width="55%" height={34} radius={10} />
        <Skeleton height={148} radius={20} />
        <div className={s.grid}>
          <Skeleton height={104} radius={20} />
          <Skeleton height={104} radius={20} />
        </div>
        <Skeleton lines={3} height={14} />
      </div>
    </div>
  );
}
