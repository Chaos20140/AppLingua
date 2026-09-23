import { useMemo, useState } from 'react';
import { Music4 } from 'lucide-react';
import type { SongPrefs } from '../../core/types';
import type { SongGenre } from '../../content/types';
import { useSongs } from '../../content/registry';
import { Button, Chip, Segmented, Skeleton, Toggle, useToast } from '../../ui';
import { useAuth } from '../../data/auth';
import { setUserTextsSync } from '../../data/sync';
import { updateSettings, useSettings } from '../../state/settings';
import { Item, ItemHead, Section } from './SettingsParts';
import s from './Profile.module.css';

const GENRES: SongGenre[] = [
  'Pop', 'Ballade', 'Cumbia', 'Reggaeton', 'Rock', 'Bossa Nova', 'Samba', 'Forró', 'MPB', 'Flamenco-Pop', 'Folk', 'Bolero', 'Salsa', 'Kinderlied',
];

const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Song-Einstellungen: Filter, Vorlieben, Anzeige, Synchronisierung eigener Texte. */
export function SongSettings() {
  const settings = useSettings();
  const prefs = settings.songs;
  const songs = useSongs();
  const auth = useAuth();
  const toast = useToast();
  const [syncBusy, setSyncBusy] = useState(false);

  const artists = useMemo(
    () => (songs.data ? Array.from(new Set(songs.data.map((x) => x.artist))).sort((a, b) => a.localeCompare(b, 'de')) : []),
    [songs.data],
  );

  const set = (patch: Partial<SongPrefs>) => updateSettings({ songs: patch });

  const onSyncTexts = async (enabled: boolean) => {
    setSyncBusy(true);
    try {
      await setUserTextsSync(enabled);
      toast(enabled
        ? auth.status === 'signed-in' ? 'Eigene Texte werden jetzt in deinem Konto gesichert.' : 'Gespeichert – wirkt, sobald du angemeldet bist.'
        : 'Eigene Texte bleiben ab jetzt nur auf diesem Gerät.', { tone: 'success' });
    } catch {
      toast('Die Einstellung konnte nicht übernommen werden. Bitte versuche es erneut.', { tone: 'error' });
    } finally {
      setSyncBusy(false);
    }
  };

  const syncDescription = !auth.available
    ? 'Nur mit Konto möglich – Konten sind in dieser Installation nicht eingerichtet. Deine Texte bleiben auf diesem Gerät.'
    : auth.status === 'signed-in'
      ? 'Aus: Eigene Songtexte bleiben nur auf diesem Gerät (Standard). An: Sie werden privat in deinem Konto gespeichert.'
      : 'Wirkt, sobald du angemeldet bist. Bis dahin bleiben eigene Texte nur auf diesem Gerät.';

  return (
    <Section id="set-songs" title="Songs" icon={<Music4 size={14} />}>
      <Item tight>
        <Toggle
          label="Explizite Inhalte ausblenden"
          checked={prefs.explicitFilter}
          onChange={(v) => set({ explicitFilter: v })}
        />
      </Item>
      <Item>
        <ItemHead label="Lieblingsgenres" description="Für bessere Empfehlungen – mehrere möglich." id="genres-label" />
        <div className={s.chips} role="group" aria-labelledby="genres-label">
          {GENRES.map((g) => (
            <Chip key={g} size="sm" selected={prefs.preferredGenres.includes(g)} onClick={() => set({ preferredGenres: toggleIn(prefs.preferredGenres, g) })}>
              {g}
            </Chip>
          ))}
        </div>
      </Item>
      <Item>
        <ItemHead label="Lieblingskünstler:innen" description="Aus den Lernliedern in AppLingua." id="artists-label" />
        {songs.loading ? (
          <Skeleton height={36} width="70%" radius={18} />
        ) : songs.error ? (
          <div className={s.inlineRow}>
            <span className={s.warnText}>Die Liste konnte nicht geladen werden.</span>
            <Button variant="ghost" onClick={songs.retry}>Erneut versuchen</Button>
          </div>
        ) : artists.length === 0 ? (
          <span className={s.desc}>Noch keine Lernlieder verfügbar.</span>
        ) : (
          <div className={s.chips} role="group" aria-labelledby="artists-label">
            {artists.map((a) => (
              <Chip key={a} size="sm" selected={prefs.preferredArtists.includes(a)} onClick={() => set({ preferredArtists: toggleIn(prefs.preferredArtists, a) })}>
                {a}
              </Chip>
            ))}
          </div>
        )}
      </Item>
      <Item>
        <ItemHead label="Tempo" />
        <Segmented<SongPrefs['speed']>
          label="Bevorzugtes Song-Tempo"
          value={prefs.speed}
          onChange={(v) => set({ speed: v })}
          options={[{ value: 'langsam', label: 'Langsam' }, { value: 'egal', label: 'Egal' }, { value: 'schnell', label: 'Schnell' }]}
        />
      </Item>
      <Item>
        <ItemHead label="Umgangssprache" description="Wie viel Slang und Alltagssprache darf es sein?" />
        <Segmented<SongPrefs['colloquial']>
          label="Anteil Umgangssprache"
          value={prefs.colloquial}
          onChange={(v) => set({ colloquial: v })}
          options={[{ value: 'wenig', label: 'Wenig' }, { value: 'egal', label: 'Egal' }, { value: 'viel', label: 'Viel' }]}
        />
      </Item>
      <Item tight>
        <Toggle label="Übersetzung anzeigen" checked={prefs.showTranslation} onChange={(v) => set({ showTranslation: v })} />
      </Item>
      <Item tight>
        <Toggle label="Lautschrift anzeigen" checked={prefs.showPhonetic} onChange={(v) => set({ showPhonetic: v })} />
      </Item>
      <Item tight>
        <Toggle
          label="Eigene Texte synchronisieren"
          description={syncDescription}
          checked={prefs.syncUserTexts}
          disabled={!auth.available || syncBusy}
          onChange={onSyncTexts}
        />
      </Item>
    </Section>
  );
}
