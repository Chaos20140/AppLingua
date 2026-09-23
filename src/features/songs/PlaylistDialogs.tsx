/** Dialoge rund um Playlists: Name eingeben (anlegen/umbenennen) und Song zu Playlist hinzufügen. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ListPlus, Plus } from 'lucide-react';
import { BottomSheet, Button, Dialog, EmptyState, TextField, useToast } from '../../ui';
import { addToPlaylist, cleanPlaylistName, createPlaylist, PLAYLIST_NAME_MAX, removeFromPlaylist, usePlaylists } from './songData';
import s from './SongsHome.module.css';

export function PlaylistNameDialog({
  open, onClose, onSubmit, title, initial = '', confirmLabel,
}: { open: boolean; onClose: () => void; onSubmit: (name: string) => void; title: string; initial?: string; confirmLabel: string }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setName(initial); setError(null); } }, [open, initial]);
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const n = cleanPlaylistName(name);
    if (!n) { setError('Bitte gib einen Namen ein.'); return; }
    onSubmit(n);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      initialFocusRef={inputRef}
      actions={<>
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        <Button variant="primary" onClick={() => submit()}>{confirmLabel}</Button>
      </>}
    >
      <form onSubmit={submit} noValidate>
        <TextField
          ref={inputRef}
          label="Name der Playlist"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          maxLength={PLAYLIST_NAME_MAX}
          placeholder="z. B. Sommer-Vibes"
          enterKeyHint="done"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          error={error}
        />
      </form>
    </Dialog>
  );
}

/** Song zu einer oder mehreren Playlists hinzufügen (oder neue anlegen). */
export function AddToPlaylistSheet({ open, onClose, songId, songTitle }: { open: boolean; onClose: () => void; songId: string; songTitle: string }) {
  const playlists = usePlaylists();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <BottomSheet
        open={open && !creating}
        onClose={onClose}
        title="Zu Playlist hinzufügen"
        description={`„${songTitle}“`}
        footer={<Button variant="secondary" icon={<Plus size={18} />} block onClick={() => setCreating(true)}>Neue Playlist</Button>}
      >
        {playlists.length === 0 ? (
          <EmptyState compact icon={<ListPlus size={28} />} title="Noch keine Playlists" description="Leg deine erste Playlist an – der Song kommt direkt hinein." />
        ) : (
          <ul className={s.pickList}>
            {playlists.map((p) => {
              const inList = p.songIds.includes(songId);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className={s.pick}
                    aria-pressed={inList}
                    onClick={() => {
                      if (inList) { removeFromPlaylist(p.id, songId); toast(`Aus „${p.name}“ entfernt.`, { tone: 'info' }); }
                      else { addToPlaylist(p.id, songId); toast(`Zu „${p.name}“ hinzugefügt.`, { tone: 'success' }); }
                    }}
                  >
                    <span className={s.pickName}>{p.name}</span>
                    <span className={s.pickCount}>{p.songIds.length} {p.songIds.length === 1 ? 'Song' : 'Songs'}</span>
                    <span className={`${s.pickCheck} ${inList ? s.pickCheckOn : ''}`} aria-hidden="true">{inList && <Check size={16} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </BottomSheet>
      <PlaylistNameDialog
        open={open && creating}
        onClose={() => setCreating(false)}
        title="Neue Playlist"
        confirmLabel="Anlegen"
        onSubmit={(name) => {
          createPlaylist(name, [songId]);
          toast(`Playlist „${name}“ angelegt – „${songTitle}“ ist drin.`, { tone: 'success' });
          setCreating(false);
        }}
      />
    </>
  );
}
