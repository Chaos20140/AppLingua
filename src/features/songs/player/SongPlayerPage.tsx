/**
 * /songs/:songId/spielen?modus=…&playlist=… – Vollbild-Song-Player.
 * Lädt den Song (Demo-Lernlied oder eigener Text) und zeigt Lade-, Fehler- und Leerzustände.
 */
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Music } from 'lucide-react';
import { Button, EmptyState, ErrorState, Page, Skeleton } from '../../../ui';
import { useSongById } from '../catalog';
import { isSongMode, type SongModeKey } from '../modes';
import PlayerScreen from './PlayerScreen';
import s from './player.module.css';

function PlayerSkeleton() {
  return (
    <Page title="Song wird geladen" back="/songs" largeTitle={false} gap="none">
      <div className={s.hero} aria-busy="true" aria-label="Song wird geladen">
        <Skeleton width={72} height={72} radius={18} />
        <div className={s.heroText}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={14} />
          <Skeleton width={140} height={32} radius={999} />
        </div>
      </div>
      <div className={s.skeletonLines}>
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} width={`${60 + ((i * 17) % 35)}%`} height={26} />
        ))}
      </div>
    </Page>
  );
}

export default function SongPlayerPage() {
  const { songId = '' } = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const modusParam = search.get('modus');
  const mode: SongModeKey = isSongMode(modusParam) ? modusParam : 'hoeren';
  const playlistId = search.get('playlist');
  const { song, loading, error, isUser, retry } = useSongById(songId);
  const autoplay = Boolean((location.state as { autoplay?: boolean } | null)?.autoplay);

  if (!song && loading) return <PlayerSkeleton />;

  if (!song && error) {
    return (
      <Page title="Song-Player" back="/songs" largeTitle={false}>
        <ErrorState title="Song konnte nicht geladen werden" message={error} onRetry={retry} />
      </Page>
    );
  }

  if (!song) {
    return (
      <Page title="Song nicht gefunden" back="/songs" largeTitle={false}>
        <EmptyState
          icon={<Music size={28} aria-hidden="true" />}
          title="Diesen Song gibt es hier nicht (mehr)"
          description="Vielleicht wurde der eigene Text gelöscht oder der Link ist veraltet. In der Bibliothek findest du alle Lieder."
          action={<Button to="/songs">Zu den Songs</Button>}
        />
      </Page>
    );
  }

  return <PlayerScreen key={song.id} song={song} isUser={isUser} mode={mode} playlistId={playlistId} autoplay={autoplay} />;
}
