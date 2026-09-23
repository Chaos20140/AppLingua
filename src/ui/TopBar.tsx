import type { ReactNode, Ref } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cx } from './internal/helpers';
import { IconButton } from './IconButton';
import s from './TopBar.module.css';

export interface TopBarProps {
  title?: ReactNode;
  /** true = zurück im Verlauf (Fallback /dashboard), string = Ziel-Pfad. */
  back?: boolean | string;
  /** Eigene Aktion für „Zurück“ (überschreibt `back`-Navigation). */
  onBack?: () => void;
  /** Eigenes Element links (z. B. Schließen-Button in Vollbild-Routen). */
  leading?: ReactNode;
  /** Rechts ausgerichtete Aktionen (IconButtons). */
  actions?: ReactNode;
  /** Titel nur visuell ausblenden (z. B. solange der große Seitentitel sichtbar ist). */
  titleHidden?: boolean;
  /** Titel als Überschrift (h1) auszeichnen. Standard: true. false = rein visuelle Wiederholung (für Screenreader verborgen). */
  titleIsHeading?: boolean;
  /** Hintergrund mit Blur und Trennlinie (beim Scrollen). */
  elevated?: boolean;
  className?: string;
  ref?: Ref<HTMLElement>;
}

/** Hook für konsistentes „Zurück“-Verhalten. */
export function useBackNavigation(back: boolean | string | undefined, fallback = '/dashboard') {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (typeof back === 'string') navigate(back);
    else if (location.key !== 'default') navigate(-1);
    else navigate(fallback, { replace: true });
  };
}

export function TopBar({
  title,
  back,
  onBack,
  leading,
  actions,
  titleHidden = false,
  titleIsHeading = true,
  elevated = false,
  className,
  ref,
}: TopBarProps) {
  const goBack = useBackNavigation(back);
  const TitleTag = titleIsHeading ? 'h1' : 'div';
  const showBack = Boolean(back) || onBack !== undefined;
  return (
    <header ref={ref} className={cx(s.bar, className)} data-elevated={elevated || undefined}>
      <div className={s.inner}>
        <div className={s.lead}>
          {leading ??
            (showBack && (
              <IconButton label="Zurück" icon={<ChevronLeft />} onClick={onBack ?? goBack} className={s.back} />
            ))}
        </div>
        {title !== undefined && title !== null ? (
          <TitleTag className={s.title} data-hidden={titleHidden || undefined} aria-hidden={titleHidden || !titleIsHeading || undefined}>
            {title}
          </TitleTag>
        ) : (
          <span />
        )}
        <div className={s.actions}>{actions}</div>
      </div>
    </header>
  );
}
