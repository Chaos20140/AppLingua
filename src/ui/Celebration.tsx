import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Award, Sparkles, Star, Trophy } from 'lucide-react';
import { cx, prefersReducedMotion, useModal, usePresence } from './internal/helpers';
import { Button } from './Button';
import s from './Celebration.module.css';

export type CelebrationVariant = 'xp' | 'level-up' | 'badge' | 'success';

export interface CelebrationProps {
  open: boolean;
  onClose: () => void;
  variant?: CelebrationVariant;
  title: string;
  /** Kleine Überzeile (Standard je Variante, z. B. „Level-up“). */
  kicker?: string;
  message?: ReactNode;
  /** Verdiente XP (wird hochgezählt). */
  xp?: number;
  /** Neues Level (bei variant „level-up“ groß in der Medaille). */
  level?: number;
  /** Eigenes Icon in der Medaille. */
  icon?: ReactNode;
  /** Kennzahlen unter dem Text (z. B. Genauigkeit, Sterne, Zeit). */
  stats?: { label: string; value: ReactNode }[];
  primaryLabel?: string;
  /** Standard: schließen. */
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

const KICKER: Record<CelebrationVariant, string> = {
  xp: 'Stark gemacht',
  'level-up': 'Level-up',
  badge: 'Neues Abzeichen',
  success: 'Geschafft',
};

const CONFETTI_COLORS = ['var(--accent)', 'var(--accent-2)', '#FFD76E', '#2BC7A6', '#FFFFFF', '#FF9A7A'];

function useCountUp(target: number | undefined, active: boolean, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || target === undefined) return;
    if (prefersReducedMotion() || target <= 0) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now() + 250;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / durationMs));
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setValue(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, durationMs]);
  return value;
}

/**
 * Feier-Overlay für XP, Level-ups, Abzeichen und Abschlüsse. Modal (Fokusfalle, Esc, Tipp auf
 * den Hintergrund schließt), respektiert reduzierte Bewegung.
 */
export function Celebration({
  open,
  onClose,
  variant = 'xp',
  title,
  kicker,
  message,
  xp,
  level,
  icon,
  stats,
  primaryLabel = 'Weiter',
  onPrimary,
  secondaryLabel,
  onSecondary,
}: CelebrationProps) {
  const rendered = usePresence(open, 240);
  const cardRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();
  const shownXp = useCountUp(xp, open);

  useModal({ open, containerRef: cardRef, onEscape: onClose, initialFocusRef: primaryRef });

  const confetti = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        // deterministische „Zufallswerte“ – ruhiges, gleichmäßiges Bild
        const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
        return {
          '--x': `${Math.round(r(1) * 100)}%`,
          '--dx': `${Math.round((r(2) - 0.5) * 160)}px`,
          '--r': `${Math.round(r(3) * 720 - 360)}deg`,
          '--d': `${(1.8 + r(4) * 1.6).toFixed(2)}s`,
          '--delay': `${(r(5) * 0.5).toFixed(2)}s`,
          '--c': CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          '--w': `${6 + Math.round(r(6) * 5)}px`,
        } as CSSProperties;
      }),
    [],
  );

  if (!rendered) return null;

  const medalContent =
    variant === 'level-up' && level !== undefined ? (
      <span className={s.levelWrap}>
        <span className={s.levelCap}>Level</span>
        <span className={s.levelNum}>{level}</span>
      </span>
    ) : (
      icon ??
      (variant === 'badge' ? <Award /> : variant === 'success' ? <Trophy /> : variant === 'level-up' ? <Star /> : <Sparkles />)
    );

  return createPortal(
    <div className={s.root} data-state={open ? 'open' : 'closed'} data-variant={variant}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={s.confetti} aria-hidden="true">
        {confetti.map((style, i) => (
          <span key={i} className={s.piece} style={style} />
        ))}
      </div>
      <div
        ref={cardRef}
        className={s.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descId : undefined}
        tabIndex={-1}
      >
        <div className={s.stage} aria-hidden="true">
          <span className={s.rays} />
          <span className={s.glow} />
          <span className={s.medal}>{medalContent}</span>
        </div>
        <p className={s.kicker}>{kicker ?? KICKER[variant]}</p>
        <h2 id={titleId} className={s.title}>
          {title}
        </h2>
        {message && (
          <div id={descId} className={s.message}>
            {message}
          </div>
        )}
        {xp !== undefined && xp > 0 && (
          <p className={s.xp}>
            <span aria-hidden="true">+{shownXp} XP</span>
            <span className="sr-only">{`+${xp} XP verdient`}</span>
          </p>
        )}
        {stats && stats.length > 0 && (
          <dl className={s.stats}>
            {stats.map((st) => (
              <div key={st.label} className={s.stat}>
                <dt className={s.statLabel}>{st.label}</dt>
                <dd className={s.statValue}>{st.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className={s.actions}>
          <Button ref={primaryRef} size="lg" block onClick={onPrimary ?? onClose}>
            {primaryLabel}
          </Button>
          {secondaryLabel && onSecondary && (
            <button type="button" className={cx(s.secondary)} onClick={onSecondary}>
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
