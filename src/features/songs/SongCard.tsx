/** Song-Cover und Song-Karten (Raster- und Listenform) für Songs-Start, Bibliothek, Favoriten und Playlists. */
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Song } from '../../content/types';
import { ProgressRing, Skeleton } from '../../ui';
import { toggleFavorite, VARIANT_FLAG, VARIANT_SHORT } from './songData';
import s from './SongCard.module.css';

export function SongCover({ song, size = 'md', className }: { song: Pick<Song, 'cover'>; size?: 'sm' | 'md' | 'lg' | 'fill'; className?: string }) {
  const style = { '--from': song.cover.from, '--to': song.cover.to } as CSSProperties;
  return (
    <div className={`${s.cover} ${s[`cover_${size}`]} ${className ?? ''}`} style={style} aria-hidden="true">
      <span className={s.coverEmoji}>{song.cover.emoji}</span>
    </div>
  );
}

export function FavoriteButton({ songId, active, title, className }: { songId: string; active: boolean; title: string; className?: string }) {
  return (
    <button
      type="button"
      className={`${s.heart} ${active ? s.heartOn : ''} ${className ?? ''}`}
      aria-pressed={active}
      aria-label={active ? `„${title}“ aus Favoriten entfernen` : `„${title}“ zu Favoriten hinzufügen`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(songId); }}
    >
      <Heart size={18} strokeWidth={2.2} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
    </button>
  );
}

export function MasteryRing({ value, size = 40 }: { value: number; size?: number }) {
  return (
    <ProgressRing value={value / 100} size={size} label="Song-Meisterschaft" valueText={`${value} % gemeistert`} tone={value >= 100 ? 'gold' : 'accent'}>
      <span className={s.ringText} style={{ fontSize: size < 44 ? 10 : 12 }}>{value}</span>
    </ProgressRing>
  );
}

export interface SongCardProps {
  song: Song;
  mastery: number;
  favorite: boolean;
  layout?: 'tile' | 'row';
  /** Ziel (Standard: Detailseite) */
  to?: string;
  /** Begründungen (Empfehlungen) */
  reasons?: string[];
  /** Fortschrittszeile (z. B. „Weiterhören“) */
  footer?: ReactNode;
  /** Treffer im Songtext (Suche) */
  matchedLine?: string;
  /** zusätzliche Aktionen rechts (nur Listenform) */
  trailing?: ReactNode;
  showFavorite?: boolean;
}

export function SongCard({ song, mastery, favorite, layout = 'tile', to, reasons, footer, matchedLine, trailing, showFavorite = true }: SongCardProps) {
  const href = to ?? `/songs/${encodeURIComponent(song.id)}`;
  const isUser = song.license.kind === 'user-private';
  const meta = (
    <span className={s.meta}>
      <span className={s.flag} role="img" aria-label={VARIANT_SHORT[song.variant]}>{VARIANT_FLAG[song.variant]}</span>
      <span className={s.level}>{isUser ? 'Eigener Text' : `empfohlen ab ${song.level}`}</span>
    </span>
  );

  if (layout === 'row') {
    return (
      <article className={s.row}>
        <SongCover song={song} size="sm" />
        <div className={s.rowBody}>
          <Link to={href} className={s.stretch}>
            <span className={s.title}>{song.title}</span>
          </Link>
          <span className={s.artist}>{song.artist || 'Unbekannt'}</span>
          {meta}
          {matchedLine && <span className={s.match}>„{matchedLine}“</span>}
        </div>
        <div className={s.rowSide}>
          {mastery > 0 && <MasteryRing value={mastery} size={40} />}
          {showFavorite && <FavoriteButton songId={song.id} active={favorite} title={song.title} />}
          {trailing}
        </div>
      </article>
    );
  }

  return (
    <article className={s.tile}>
      <div className={s.tileCover}>
        <SongCover song={song} size="fill" />
        {showFavorite && <FavoriteButton songId={song.id} active={favorite} title={song.title} className={s.tileHeart} />}
        {mastery > 0 && <div className={s.tileRing}><MasteryRing value={mastery} size={40} /></div>}
      </div>
      <div className={s.tileBody}>
        <Link to={href} className={s.stretch}>
          <span className={s.title}>{song.title}</span>
        </Link>
        <span className={s.artist}>{song.artist || 'Unbekannt'}</span>
        {meta}
        {matchedLine && <span className={s.match}>„{matchedLine}“</span>}
        {reasons && reasons.length > 0 && (
          <ul className={s.reasons} aria-label="Warum empfohlen">
            {reasons.slice(0, 2).map((r) => <li key={r} className={s.reason}>{r}</li>)}
          </ul>
        )}
        {footer}
      </div>
    </article>
  );
}

/** Platzhalter während des Ladens. */
export function SongCardSkeleton({ layout = 'tile' }: { layout?: 'tile' | 'row' }) {
  return (
    <div className={layout === 'tile' ? s.tileSkel : s.rowSkel} aria-hidden="true">
      <Skeleton className={s.skelCover} radius={layout === 'tile' ? 'var(--r-lg)' : 'var(--r-sm)'} height={layout === 'tile' ? undefined : 56} width={layout === 'tile' ? '100%' : 56} />
      <div className={s.skelText}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="50%" height={12} />
      </div>
    </div>
  );
}
