/**
 * /songs – Entdecken (Empfehlungen, Weiterhören, Musik-Missionen, Song-Serie, eigene Texte),
 * Bibliothek (Suche + Filter), Favoriten und Playlists.
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Flame, Music2, Plus, Radio, SlidersHorizontal, Sparkles, Trophy } from 'lucide-react';
import type { Song } from '../../content/types';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Page, ProgressBar, Tabs, useToast } from '../../ui';
import { useActiveCourse, useSettings, variantOf, VARIANT_LABELS } from '../../state/settings';
import { useLanguageLevel, useStreak } from '../../state/progress';
import { useAllSongProgress, useSongRecommendations } from '../../state/songs';
import { claimMission, useMissions, type MissionStatus } from '../../state/missions';
import { songMastery } from '../../engine/songs';
import type { SongProgress } from '../../core/types';
import { useAllSongs } from './catalog';
import { isSongMode } from './modes';
import { useFavoriteIds } from './songData';
import { SongCard, SongCardSkeleton } from './SongCard';
import SongPrefsSheet from './SongPrefsSheet';
import { FavoritesTab, LibraryTab, PlaylistsTab } from './HomeTabs';
import sh from './shared.module.css';
import s from './SongsHome.module.css';

type Tab = 'entdecken' | 'bibliothek' | 'favoriten' | 'playlists';
const TABS: Tab[] = ['entdecken', 'bibliothek', 'favoriten', 'playlists'];
const isTab = (v: string | null): v is Tab => TABS.includes(v as Tab);

export default function SongsHomePage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = isTab(params.get('tab')) ? (params.get('tab') as Tab) : 'entdecken';
  const setTab = (t: Tab) => setParams(t === 'entdecken' ? {} : { tab: t }, { replace: true });
  const { songs, loading, error, retry } = useAllSongs();
  const progress = useAllSongProgress();
  const favIds = useFavoriteIds();
  const masteryOf = useMemo(() => {
    const cache = new Map<string, number>();
    return (song: Song) => {
      let m = cache.get(song.id);
      if (m === undefined) { m = songMastery(progress[song.id], song).total; cache.set(song.id, m); }
      return m;
    };
  }, [progress]);

  const ctx: HomeCtx = { songs, loading, error, retry, progress, favIds, masteryOf, setTab };

  return (
    <Page
      title="Songs"
      subtitle="Lernen mit Musik: verstehen, mitsingen, meistern."
      actions={<IconButton label="Eigenen Text hinzufügen" icon={<Plus size={22} />} to="/songs/eigener-text" variant="tonal" />}
      gap="lg"
    >
      <Tabs
        idPrefix="songs"
        label="Songs-Bereiche"
        className={s.tabs}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'entdecken', label: 'Entdecken' },
          { value: 'bibliothek', label: 'Bibliothek' },
          { value: 'favoriten', label: 'Favoriten' },
          { value: 'playlists', label: 'Playlists' },
        ]}
      />
      <div role="tabpanel" id={`songs-panel-${tab}`} aria-labelledby={`songs-tab-${tab}`} key={tab} className={sh.panel}>
        {error && songs.length === 0 ? (
          <ErrorState title="Songs konnten nicht geladen werden" message={error} onRetry={retry} />
        ) : (
          <>
            {error && <ErrorState title="Demo-Songs fehlen gerade" message={error} onRetry={retry} />}
            {tab === 'entdecken' && <DiscoverTab {...ctx} />}
            {tab === 'bibliothek' && <LibraryTab {...ctx} />}
            {tab === 'favoriten' && <FavoritesTab {...ctx} />}
            {tab === 'playlists' && <PlaylistsTab {...ctx} />}
          </>
        )}
      </div>
    </Page>
  );
}

export interface HomeCtx {
  songs: Song[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  progress: Record<string, SongProgress>;
  favIds: Set<string>;
  masteryOf: (song: Song) => number;
  setTab: (t: Tab) => void;
}

const playerUrl = (song: Song, p?: SongProgress) => {
  const last = p?.modesUsed[p.modesUsed.length - 1];
  return `/songs/${encodeURIComponent(song.id)}/spielen?modus=${isSongMode(last) ? last : 'hoeren'}`;
};

function DiscoverTab({ songs, loading, progress, favIds, masteryOf }: HomeCtx) {
  const courseId = useActiveCourse();
  const settings = useSettings();
  const variant = variantOf(settings, courseId);
  const { level } = useLanguageLevel(courseId);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const demoSongs = useMemo(() => songs.filter((x) => x.license.kind !== 'user-private'), [songs]);
  const userSongs = useMemo(() => songs.filter((x) => x.license.kind === 'user-private'), [songs]);
  const recs = useSongRecommendations(demoSongs, courseId);

  const continueList = useMemo(() => songs
    .map((song) => ({ song, p: progress[song.id] }))
    .filter((x): x is { song: Song; p: SongProgress } => Boolean(x.p && (x.p.playCount > 0 || x.p.learnedLineIds.length > 0)))
    .filter((x) => masteryOf(x.song) < 100)
    .sort((a, b) => b.p.lastPlayedAt.localeCompare(a.p.lastPlayedAt))
    .slice(0, 8), [songs, progress, masteryOf]);

  const courseSongs = demoSongs.filter((x) => x.courseId === courseId);
  const hiddenExplicit = settings.songs.explicitFilter ? courseSongs.filter((x) => x.explicit).length : 0;

  return (
    <>
      <StreakHero songs={songs} progress={progress} />

      {(loading || continueList.length > 0) && (
        <section className={sh.section} aria-labelledby="songs-continue">
          <div className={sh.sectionHead}>
            <div>
              <h2 id="songs-continue" className={sh.h2}>Weiterhören</h2>
              <p className={sh.sub}>Da, wo du aufgehört hast.</p>
            </div>
          </div>
          {loading && continueList.length === 0 ? (
            <ul className={sh.scroller}>{[0, 1].map((i) => <li key={i}><SongCardSkeleton /></li>)}</ul>
          ) : (
            <ul className={sh.scroller}>
              {continueList.map(({ song, p }) => {
                const m = songMastery(p, song);
                return (
                  <li key={song.id}>
                    <SongCard
                      song={song}
                      mastery={m.total}
                      favorite={favIds.has(song.id)}
                      to={playerUrl(song, p)}
                      footer={
                        <div className={s.continueFoot}>
                          <ProgressBar value={m.totalLines ? m.learnedLines / m.totalLines : 0} label={`Gelernte Zeilen in ${song.title}`} size="sm" />
                          <span className={s.continueMeta}>{m.learnedLines}/{m.totalLines} Zeilen gelernt</span>
                        </div>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section className={sh.section} aria-labelledby="songs-recs">
        <div className={sh.sectionHead}>
          <div>
            <h2 id="songs-recs" className={sh.h2}>Für dich empfohlen</h2>
            <p className={sh.sub}>Passend zu {level === 'Einsteiger' ? 'deinem Einstieg' : `deinem Niveau ${level}`} · {VARIANT_LABELS[variant]}</p>
          </div>
          <Button variant="ghost" icon={<SlidersHorizontal size={18} />} onClick={() => setPrefsOpen(true)}>Vorlieben</Button>
        </div>
        {loading ? (
          <ul className={sh.grid}>{[0, 1, 2, 3].map((i) => <li key={i}><SongCardSkeleton /></li>)}</ul>
        ) : recs.length === 0 ? (
          <EmptyState
            compact
            icon={<Music2 size={28} />}
            title="Gerade keine Empfehlungen"
            description={hiddenExplicit > 0
              ? `${hiddenExplicit} Song(s) sind durch den Filter für explizite Inhalte ausgeblendet.`
              : 'Für diese Sprache gibt es noch keine Lernlieder. Füge einen eigenen Text hinzu oder wechsle den Kurs.'}
            action={<Button variant="secondary" to="/songs/eigener-text" icon={<Plus size={18} />}>Eigenen Text hinzufügen</Button>}
          />
        ) : (
          <ul className={sh.grid}>
            {recs.slice(0, 6).map((r) => (
              <li key={r.song.id}>
                <SongCard song={r.song} mastery={r.mastery} favorite={favIds.has(r.song.id)} reasons={r.reasons} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <MusicMissions />

      <section className={sh.section} aria-labelledby="songs-own">
        <div className={sh.sectionHead}>
          <div>
            <h2 id="songs-own" className={sh.h2}>Deine eigenen Texte</h2>
            <p className={sh.sub}>Privat analysieren: Erklärungen, Vokabeln und Übungen zu Songs, die du liebst.</p>
          </div>
        </div>
        {userSongs.length > 0 && (
          <ul className={sh.stack}>
            {userSongs.slice(0, 5).map((song) => (
              <li key={song.id}>
                <SongCard layout="row" song={song} mastery={masteryOf(song)} favorite={favIds.has(song.id)} />
              </li>
            ))}
          </ul>
        )}
        <Card tone="accent" className={s.ctaCard}>
          <div className={s.ctaIcon} aria-hidden="true"><Sparkles size={22} /></div>
          <div className={s.ctaText}>
            <strong>Eigenen Songtext hinzufügen</strong>
            <span>Nur für dich – der Text wird nicht veröffentlicht. Standardmäßig bleibt er auf diesem Gerät.</span>
          </div>
          <Button variant="primary" to="/songs/eigener-text" icon={<Plus size={18} />}>Hinzufügen</Button>
        </Card>
      </section>

      <div className={sh.infoCard}>
        <span className={sh.infoIcon} aria-hidden="true"><Radio size={18} /></span>
        <div className={sh.infoText}>
          <strong>Und die Originalaufnahmen?</strong>
          <p>
            Die Demo-Lernlieder sind Originale von AppLingua – die Begleitmusik entsteht direkt in deinem Browser, gesungen
            wird per Sprachausgabe. Bei eigenen Texten kannst du YouTube, Spotify oder Apple Music verknüpfen; abgespielt
            wird nur über deren offizielle Einbettung und erst, nachdem du zugestimmt hast.
          </p>
        </div>
      </div>

      <SongPrefsSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} songs={courseSongs.length ? courseSongs : demoSongs} />
    </>
  );
}

function StreakHero({ songs, progress }: { songs: Song[]; progress: Record<string, SongProgress> }) {
  const streak = useStreak();
  const stats = useMemo(() => {
    let lines = 0;
    let mastered = 0;
    for (const song of songs) {
      const m = songMastery(progress[song.id], song);
      lines += m.learnedLines;
      if (m.total >= 100) mastered += 1;
    }
    return { lines, mastered };
  }, [songs, progress]);
  const active = streak.songStreak > 0;
  return (
    <Card tone="hero" className={s.hero} aria-label="Deine Song-Serie">
      <div className={s.heroMain}>
        <span className={`${s.flame} ${active ? s.flameOn : ''}`} aria-hidden="true"><Flame size={28} /></span>
        <div className={s.heroText}>
          <span className={s.heroValue}>{streak.songStreak} {streak.songStreak === 1 ? 'Tag' : 'Tage'}</span>
          <span className={s.heroLabel}>Song-Serie{streak.songLongest > streak.songStreak ? ` · Rekord ${streak.songLongest}` : ''}</span>
        </div>
      </div>
      <p className={s.heroHint}>
        {streak.songTodayDone
          ? 'Heute schon Musik gemacht – stark! Deine Serie ist sicher.'
          : active
            ? 'Hör heute einen Song oder lern eine Zeile, damit deine Serie weiterläuft.'
            : 'Ein Song am Tag startet deine Serie. Schon eine Zeile zählt.'}
      </p>
      <dl className={s.heroStats}>
        <div><dt>Gelernte Zeilen</dt><dd>{stats.lines}</dd></div>
        <div><dt>Gemeisterte Songs</dt><dd>{stats.mastered}</dd></div>
      </dl>
    </Card>
  );
}

function MusicMissions() {
  const missions = useMissions();
  const toast = useToast();
  const list: MissionStatus[] = [...missions.daily, ...missions.weekly].filter((m) => m.category.startsWith('song-'));
  if (!list.length) return null;
  const claim = (m: MissionStatus) => {
    const r = claimMission(m.id, m.periodKey);
    if (r.ok) toast(`Mission geschafft: +${r.xp} XP`, { tone: 'success' });
    else toast(r.reason, { tone: 'error' });
  };
  return (
    <section className={sh.section} aria-labelledby="songs-missions">
      <div className={sh.sectionHead}>
        <div>
          <h2 id="songs-missions" className={sh.h2}>Musik-Missionen</h2>
          <p className={sh.sub}>Kleine Ziele mit Extra-XP.</p>
        </div>
      </div>
      <ul className={sh.stack}>
        {list.map((m) => (
          <li key={`${m.period}:${m.id}`}>
            <div className={`${s.mission} ${m.completed ? s.missionDone : ''}`}>
              <span className={s.missionIcon} aria-hidden="true">{m.icon}</span>
              <div className={s.missionBody}>
                <div className={s.missionTop}>
                  <strong>{m.title}</strong>
                  <Badge tone={m.period === 'daily' ? 'info' : 'gold'}>{m.period === 'daily' ? 'Heute' : 'Woche'}</Badge>
                </div>
                <ProgressBar value={m.ratio} label={m.title} valueText={`${Math.min(m.progress, m.target)} von ${m.target}`} size="sm" tone={m.completed ? 'success' : 'accent'} />
                <span className={s.missionMeta}>{Math.min(m.progress, m.target)}/{m.target} · +{m.xp} XP</span>
              </div>
              {m.claimed ? (
                <Badge tone="success" icon={<Trophy size={12} />}>Erledigt</Badge>
              ) : m.completed ? (
                <Button variant="primary" onClick={() => claim(m)}>Abholen</Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
