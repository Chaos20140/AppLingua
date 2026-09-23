/** Songs-Start: Bibliothek (Suche + Filter), Favoriten und Playlists. */
import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Heart, ListMusic, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { Song } from '../../content/types';
import {
  BottomSheet, Button, Chip, ConfirmDialog, EmptyState, IconButton, Select, TextField, Toggle, useToast,
} from '../../ui';
import { updateSettings, useActiveCourse, useSettings } from '../../state/settings';
import type { HomeCtx } from './SongsHomePage';
import {
  activeFilterCount, colloquialBucket, distinctValues, EMPTY_FILTERS, searchLibrary, type LangFilter, type LibraryFilters,
} from './library';
import { createPlaylist, deletePlaylist, renamePlaylist, SPEED_LABEL, useFavorites, usePlaylists, type PlaylistView } from './songData';
import { SongCard, SongCardSkeleton, SongCover } from './SongCard';
import { PlaylistNameDialog } from './PlaylistDialogs';
import { SONG_LEVELS } from './userText';
import sh from './shared.module.css';
import s from './SongsHome.module.css';

const LANG_OPTIONS: { value: LangFilter; label: string }[] = [
  { value: 'all', label: 'Alle Sprachen' },
  { value: 'es', label: 'Spanisch (alle)' },
  { value: 'es-ES', label: '🇪🇸 Spanisch (Spanien)' },
  { value: 'es-LA', label: '🌎 Spanisch (Lateinamerika)' },
  { value: 'pt-BR', label: '🇧🇷 Portugiesisch (Brasilien)' },
];

// ───────────────────────── Bibliothek ─────────────────────────
export function LibraryTab({ songs, loading, favIds, masteryOf }: HomeCtx) {
  const courseId = useActiveCourse();
  const prefs = useSettings().songs;
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const [filters, setFilters] = useState<LibraryFilters>({ ...EMPTY_FILTERS, lang: courseId });
  const [sheet, setSheet] = useState(false);
  const hits = useMemo(() => searchLibrary(songs, deferred, filters, prefs.explicitFilter), [songs, deferred, filters, prefs.explicitFilter]);
  const count = activeFilterCount(filters);
  const hiddenExplicit = prefs.explicitFilter ? songs.filter((x) => x.explicit).length : 0;
  const reset = () => { setFilters({ ...EMPTY_FILTERS, lang: filters.lang }); setQuery(''); };

  return (
    <>
      <div className={s.searchBar} role="search">
        <TextField
          label="Songs durchsuchen"
          hideLabel
          type="text"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Titel, Künstler oder Textzeile"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search size={18} aria-hidden="true" />}
          trailing={query ? <IconButton label="Suche leeren" icon={<X size={18} />} size="sm" onClick={() => setQuery('')} /> : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className={s.filterRow}>
          <Select
            label="Sprache"
            hideLabel
            value={filters.lang}
            onChange={(v) => setFilters((f) => ({ ...f, lang: v }))}
            options={LANG_OPTIONS}
            className={s.langSelect}
          />
          <Button variant="secondary" icon={<Filter size={18} />} onClick={() => setSheet(true)} aria-label={`Filter${count ? ` (${count} aktiv)` : ''}`}>
            Filter{count ? ` · ${count}` : ''}
          </Button>
        </div>
        {count > 0 && (
          <div className={s.activeChips} aria-label="Aktive Filter">
            {filters.artist !== 'all' && <Chip size="sm" onClick={() => setFilters((f) => ({ ...f, artist: 'all' }))} icon={<X size={12} />} aria-label={`Filter Künstler ${filters.artist} entfernen`}>{filters.artist}</Chip>}
            {filters.level !== 'all' && <Chip size="sm" onClick={() => setFilters((f) => ({ ...f, level: 'all' }))} icon={<X size={12} />} aria-label={`Filter Niveau ${filters.level} entfernen`}>ab {filters.level}</Chip>}
            {filters.genre !== 'all' && <Chip size="sm" onClick={() => setFilters((f) => ({ ...f, genre: 'all' }))} icon={<X size={12} />} aria-label={`Filter Genre ${filters.genre} entfernen`}>{filters.genre}</Chip>}
            {filters.speed !== 'all' && <Chip size="sm" onClick={() => setFilters((f) => ({ ...f, speed: 'all' }))} icon={<X size={12} />} aria-label="Filter Tempo entfernen">Tempo: {SPEED_LABEL[filters.speed]}</Chip>}
            {filters.colloquial !== 'all' && <Chip size="sm" onClick={() => setFilters((f) => ({ ...f, colloquial: 'all' }))} icon={<X size={12} />} aria-label="Filter Umgangssprache entfernen">Umgangssprache: {filters.colloquial}</Chip>}
          </div>
        )}
      </div>

      <p className={sh.muted} role="status" aria-live="polite">
        {loading ? 'Songs werden geladen …' : `${hits.length} ${hits.length === 1 ? 'Song' : 'Songs'}${hiddenExplicit ? ` · ${hiddenExplicit} explizite ausgeblendet` : ''}`}
      </p>

      {loading && hits.length === 0 ? (
        <ul className={sh.grid}>{[0, 1, 2, 3].map((i) => <li key={i}><SongCardSkeleton /></li>)}</ul>
      ) : hits.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title="Nichts gefunden"
          description={query ? `Kein Song passt zu „${query}“ mit diesen Filtern.` : 'Mit diesen Filtern gibt es keine Songs.'}
          action={<Button variant="secondary" onClick={reset}>Suche & Filter zurücksetzen</Button>}
        />
      ) : (
        <ul className={sh.grid}>
          {hits.map((h) => (
            <li key={h.song.id}>
              <SongCard song={h.song} mastery={masteryOf(h.song)} favorite={favIds.has(h.song.id)} matchedLine={h.matchedLine} />
            </li>
          ))}
        </ul>
      )}

      <FilterSheet open={sheet} onClose={() => setSheet(false)} songs={songs} filters={filters} setFilters={setFilters} />
    </>
  );
}

function FilterSheet({ open, onClose, songs, filters, setFilters }: {
  open: boolean; onClose: () => void; songs: Song[]; filters: LibraryFilters; setFilters: (f: LibraryFilters) => void;
}) {
  const prefs = useSettings().songs;
  const artists = distinctValues(songs, 'artist').filter(Boolean);
  const genres = distinctValues(songs, 'genre');
  const set = <K extends keyof LibraryFilters>(k: K, v: LibraryFilters[K]) => setFilters({ ...filters, [k]: v });
  const colloquialCounts = useMemo(() => {
    const c = { wenig: 0, mittel: 0, viel: 0 };
    for (const x of songs) c[colloquialBucket(x.colloquialPct)] += 1;
    return c;
  }, [songs]);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filter"
      footer={
        <div className={s.sheetFooter}>
          <Button variant="ghost" onClick={() => setFilters({ ...EMPTY_FILTERS, lang: filters.lang })}>Zurücksetzen</Button>
          <Button variant="primary" onClick={onClose}>Anwenden</Button>
        </div>
      }
    >
      <div className={sh.formStack}>
        <Select label="Künstler" value={filters.artist} onChange={(v) => set('artist', v)} options={[{ value: 'all', label: 'Alle Künstler' }, ...artists.map((a) => ({ value: a, label: a }))]} />
        <Select label="Empfohlenes Niveau" value={filters.level} onChange={(v) => set('level', v)} options={[{ value: 'all', label: 'Alle Niveaus' }, ...SONG_LEVELS.map((l) => ({ value: l, label: `ab ${l}` }))]} />
        <Select label="Genre" value={filters.genre} onChange={(v) => set('genre', v)} options={[{ value: 'all', label: 'Alle Genres' }, ...genres.map((g) => ({ value: g, label: g }))]} />
        <Select
          label="Sprechtempo"
          value={filters.speed}
          onChange={(v) => set('speed', v)}
          options={[{ value: 'all', label: 'Jedes Tempo' }, { value: 'langsam', label: 'Langsam' }, { value: 'mittel', label: 'Mittel' }, { value: 'schnell', label: 'Schnell' }]}
        />
        <Select
          label="Umgangssprache"
          value={filters.colloquial}
          onChange={(v) => set('colloquial', v)}
          options={[
            { value: 'all', label: 'Egal' },
            { value: 'wenig', label: `Wenig (unter 20 %) · ${colloquialCounts.wenig}` },
            { value: 'mittel', label: `Mittel (20–40 %) · ${colloquialCounts.mittel}` },
            { value: 'viel', label: `Viel (über 40 %) · ${colloquialCounts.viel}` },
          ]}
        />
        <Toggle
          checked={prefs.explicitFilter}
          onChange={(v) => updateSettings({ songs: { explicitFilter: v } })}
          label="Explizite Inhalte ausblenden"
          description="Gilt auch für Empfehlungen."
        />
      </div>
    </BottomSheet>
  );
}

// ───────────────────────── Favoriten ─────────────────────────
export function FavoritesTab({ songs, loading, favIds, masteryOf, setTab }: HomeCtx) {
  const favorites = useFavorites();
  const byId = useMemo(() => new Map(songs.map((x) => [x.id, x])), [songs]);
  const list = favorites.map((f) => byId.get(f.songId)).filter((x): x is Song => Boolean(x));
  if (loading && list.length === 0 && favorites.length > 0) {
    return <ul className={sh.stack}>{favorites.slice(0, 3).map((f) => <li key={f.songId}><SongCardSkeleton layout="row" /></li>)}</ul>;
  }
  if (!list.length) {
    return (
      <EmptyState
        icon={<Heart size={28} />}
        title="Noch keine Favoriten"
        description="Tippe bei einem Song auf das Herz – hier hast du deine Lieblingslieder dann immer griffbereit."
        action={<Button variant="secondary" onClick={() => setTab('bibliothek')}>Bibliothek öffnen</Button>}
      />
    );
  }
  return (
    <ul className={sh.stack}>
      {list.map((song) => (
        <li key={song.id}><SongCard layout="row" song={song} mastery={masteryOf(song)} favorite={favIds.has(song.id)} /></li>
      ))}
    </ul>
  );
}

// ───────────────────────── Playlists ─────────────────────────
export function PlaylistsTab({ songs }: HomeCtx) {
  const playlists = usePlaylists();
  const toast = useToast();
  const byId = useMemo(() => new Map(songs.map((x) => [x.id, x])), [songs]);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<PlaylistView | null>(null);
  const [deleting, setDeleting] = useState<PlaylistView | null>(null);

  return (
    <>
      <div className={sh.sectionHead}>
        <p className={sh.muted}>{playlists.length ? `${playlists.length} ${playlists.length === 1 ? 'Playlist' : 'Playlists'}` : 'Stell dir eigene Song-Sammlungen zusammen.'}</p>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setCreating(true)}>Neue Playlist</Button>
      </div>
      {playlists.length === 0 ? (
        <EmptyState
          icon={<ListMusic size={28} />}
          title="Noch keine Playlists"
          description="Zum Beispiel „Für unterwegs“ oder „Zum Mitsingen“ – Songs fügst du auf ihrer Detailseite hinzu."
        />
      ) : (
        <ul className={sh.stack}>
          {playlists.map((p) => {
            const covers = p.songIds.map((id) => byId.get(id)).filter((x): x is Song => Boolean(x)).slice(0, 4);
            return (
              <li key={p.id}>
                <div className={s.playlistRow}>
                  <div className={s.mosaic} aria-hidden="true">
                    {covers.length ? covers.map((c) => <SongCover key={c.id} song={c} size="fill" className={s.mosaicTile} />) : <span className={s.mosaicEmpty}><ListMusic size={22} /></span>}
                  </div>
                  <div className={s.playlistBody}>
                    <Link to={`/songs/playlist/${encodeURIComponent(p.id)}`} className={s.playlistLink}>{p.name}</Link>
                    <span className={s.playlistMeta}>{p.songIds.length} {p.songIds.length === 1 ? 'Song' : 'Songs'}</span>
                  </div>
                  <div className={s.playlistActions}>
                    <IconButton label={`„${p.name}“ umbenennen`} icon={<Pencil size={18} />} onClick={() => setRenaming(p)} />
                    <IconButton label={`„${p.name}“ löschen`} icon={<Trash2 size={18} />} onClick={() => setDeleting(p)} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PlaylistNameDialog
        open={creating}
        onClose={() => setCreating(false)}
        title="Neue Playlist"
        confirmLabel="Anlegen"
        onSubmit={(name) => { createPlaylist(name); setCreating(false); toast(`Playlist „${name}“ angelegt.`, { tone: 'success' }); }}
      />
      <PlaylistNameDialog
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Playlist umbenennen"
        confirmLabel="Speichern"
        initial={renaming?.name ?? ''}
        onSubmit={(name) => { if (renaming) renamePlaylist(renaming.id, name); setRenaming(null); toast('Name gespeichert.', { tone: 'success' }); }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting) { deletePlaylist(deleting.id); toast(`„${deleting.name}“ gelöscht.`, { tone: 'info' }); } setDeleting(null); }}
        title="Playlist löschen?"
        message={deleting ? `„${deleting.name}“ wird gelöscht. Die Songs selbst bleiben erhalten.` : undefined}
        confirmLabel="Löschen"
        tone="danger"
      />
    </>
  );
}
