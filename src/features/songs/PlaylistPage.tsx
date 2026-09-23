/** /songs/playlist/:playlistId – Songs einer Playlist: abspielen, sortieren, entfernen, umbenennen, löschen. */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ListMusic, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import type { Song } from '../../content/types';
import { BottomSheet, Button, ConfirmDialog, EmptyState, ErrorState, IconButton, Page, Skeleton, useToast } from '../../ui';
import { useDataReady, useRecord } from '../../data/store';
import { useAllSongProgress } from '../../state/songs';
import { songMastery } from '../../engine/songs';
import { useAllSongs } from './catalog';
import { addToPlaylist, deletePlaylist, movePlaylistSong, removeFromPlaylist, renamePlaylist, useFavoriteIds } from './songData';
import { PlaylistNameDialog } from './PlaylistDialogs';
import { SongCard, SongCover } from './SongCard';
import { compareSongs } from './library';
import sh from './shared.module.css';
import s from './Playlist.module.css';

export default function PlaylistPage() {
  const { playlistId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const playlist = useRecord('playlists', playlistId);
  const { songs, loading, error, retry } = useAllSongs();
  const progress = useAllSongProgress();
  const favIds = useFavoriteIds();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  const byId = useMemo(() => new Map(songs.map((x) => [x.id, x])), [songs]);
  const ready = useDataReady();

  if (!playlist && !ready) {
    return (
      <Page title="Playlist" back="/songs?tab=playlists">
        <div className={sh.stack} aria-busy="true"><Skeleton height={132} width={132} radius="var(--r-xl)" /><Skeleton height={72} radius="var(--r-lg)" /></div>
      </Page>
    );
  }
  if (!playlist) {
    return (
      <Page title="Playlist" back="/songs?tab=playlists">
        <EmptyState
          icon={<ListMusic size={28} />}
          title="Playlist nicht gefunden"
          description="Sie wurde gelöscht oder existiert nur auf einem anderen Gerät."
          action={<Button variant="primary" to="/songs?tab=playlists">Zu deinen Playlists</Button>}
        />
      </Page>
    );
  }

  const ids = playlist.songIds ?? [];
  const available = ids.map((id) => byId.get(id)).filter((x): x is Song => Boolean(x));
  const first = available[0];
  const totalMs = available.reduce((n, x) => n + x.durationMs, 0);
  const minutes = Math.max(1, Math.round(totalMs / 60000));

  return (
    <Page
      title={playlist.name}
      subtitle={`${ids.length} ${ids.length === 1 ? 'Song' : 'Songs'}${available.length ? ` · ca. ${minutes} Min.` : ''}`}
      back="/songs?tab=playlists"
      gap="lg"
      actions={<>
        <IconButton label="Playlist umbenennen" icon={<Pencil size={20} />} onClick={() => setRenaming(true)} />
        <IconButton label="Playlist löschen" icon={<Trash2 size={20} />} onClick={() => setDeleting(true)} />
      </>}
    >
      <div className={s.head}>
        <div className={s.mosaic} aria-hidden="true">
          {available.slice(0, 4).map((x) => <SongCover key={x.id} song={x} size="fill" className={s.tile} />)}
          {!available.length && <span className={s.empty}><ListMusic size={36} /></span>}
        </div>
        <div className={s.headActions}>
          <Button
            variant="primary"
            size="lg"
            icon={<Play size={18} />}
            disabled={!first}
            to={first ? `/songs/${encodeURIComponent(first.id)}/spielen?modus=hoeren&playlist=${encodeURIComponent(playlistId)}` : undefined}
          >
            Abspielen
          </Button>
          <Button variant="secondary" size="lg" icon={<Plus size={18} />} onClick={() => setAdding(true)}>Songs hinzufügen</Button>
        </div>
      </div>

      {error && <ErrorState title="Songs konnten nicht geladen werden" message={error} onRetry={retry} />}

      {loading && ids.length > 0 ? (
        <ul className={sh.stack} aria-busy="true">{ids.slice(0, 4).map((id) => <li key={id}><Skeleton height={72} radius="var(--r-lg)" /></li>)}</ul>
      ) : ids.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={28} />}
          title="Noch leer"
          description="Füge Songs hinzu – hier oder über „Zu Playlist hinzufügen“ auf einer Song-Seite."
          action={<Button variant="secondary" icon={<Plus size={18} />} onClick={() => setAdding(true)}>Songs hinzufügen</Button>}
        />
      ) : (
        <ol className={sh.stack} aria-label="Songs in dieser Playlist">
          {ids.map((id, i) => {
            const song = byId.get(id);
            const order = (
              <div className={s.order}>
                <IconButton label={`Nach oben${song ? `: ${song.title}` : ''}`} icon={<ArrowUp size={18} />} size="sm" disabled={i === 0} onClick={() => movePlaylistSong(playlistId, i, -1)} />
                <IconButton label={`Nach unten${song ? `: ${song.title}` : ''}`} icon={<ArrowDown size={18} />} size="sm" disabled={i === ids.length - 1} onClick={() => movePlaylistSong(playlistId, i, 1)} />
                <IconButton
                  label={`${song ? `„${song.title}“` : 'Eintrag'} aus Playlist entfernen`}
                  icon={<X size={18} />}
                  size="sm"
                  onClick={() => {
                    removeFromPlaylist(playlistId, id);
                    toast(song ? `„${song.title}“ entfernt.` : 'Eintrag entfernt.', { tone: 'info', action: { label: 'Rückgängig', onClick: () => { addToPlaylist(playlistId, id); movePlaylistSong(playlistId, ids.length - 1, i - (ids.length - 1)); } } });
                  }}
                />
              </div>
            );
            return (
              <li key={id}>
                {song ? (
                  <SongCard layout="row" song={song} mastery={songMastery(progress[song.id], song).total} favorite={favIds.has(song.id)} showFavorite={false} trailing={order} />
                ) : (
                  <div className={s.missing}>
                    <span>Nicht mehr verfügbar{id.startsWith('user.') ? ' (eigener Text auf einem anderen Gerät oder gelöscht)' : ''}</span>
                    {order}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <AddSongsSheet open={adding} onClose={() => setAdding(false)} songs={songs} playlistId={playlistId} inList={new Set(ids)} />
      <PlaylistNameDialog
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Playlist umbenennen"
        confirmLabel="Speichern"
        initial={playlist.name}
        onSubmit={(name) => { renamePlaylist(playlistId, name); setRenaming(false); toast('Name gespeichert.', { tone: 'success' }); }}
      />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => {
          deletePlaylist(playlistId);
          setDeleting(false);
          toast(`„${playlist.name}“ gelöscht.`, { tone: 'info' });
          navigate('/songs?tab=playlists', { replace: true });
        }}
        title="Playlist löschen?"
        message={`„${playlist.name}“ wird gelöscht. Die Songs selbst bleiben erhalten.`}
        confirmLabel="Löschen"
        tone="danger"
      />
    </Page>
  );
}

function AddSongsSheet({ open, onClose, songs, playlistId, inList }: { open: boolean; onClose: () => void; songs: Song[]; playlistId: string; inList: Set<string> }) {
  const toast = useToast();
  const candidates = useMemo(() => songs.filter((x) => !inList.has(x.id)).sort(compareSongs), [songs, inList]);
  return (
    <BottomSheet open={open} onClose={onClose} title="Songs hinzufügen" footer={<Button variant="primary" block onClick={onClose}>Fertig</Button>}>
      {candidates.length === 0 ? (
        <EmptyState compact icon={<ListMusic size={28} />} title="Alle Songs sind schon drin" />
      ) : (
        <ul className={s.addList}>
          {candidates.map((x) => (
            <li key={x.id}>
              <button type="button" className={s.addRow} onClick={() => { addToPlaylist(playlistId, x.id); toast(`„${x.title}“ hinzugefügt.`, { tone: 'success' }); }}>
                <SongCover song={x} size="sm" />
                <span className={s.addText}>
                  <span className={s.addTitle}>{x.title}</span>
                  <span className={s.addArtist}>{x.artist || 'Eigener Text'} · {x.level}</span>
                </span>
                <Plus size={20} aria-hidden="true" className={s.addIcon} />
                <span className={sh.srOnly}>hinzufügen</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}
