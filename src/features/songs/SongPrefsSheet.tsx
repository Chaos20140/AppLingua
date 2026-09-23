/** Musik-Vorlieben für Empfehlungen (Genres, Künstler, Tempo, Umgangssprache, explizite Inhalte). */
import type { SongPrefs } from '../../core/types';
import type { Song } from '../../content/types';
import { BottomSheet, Button, Chip, Segmented, Toggle } from '../../ui';
import { updateSettings, useSettings } from '../../state/settings';
import { distinctValues } from './library';
import s from './SongsHome.module.css';

export default function SongPrefsSheet({ open, onClose, songs }: { open: boolean; onClose: () => void; songs: readonly Song[] }) {
  const prefs = useSettings().songs;
  const genres = distinctValues(songs, 'genre');
  const artists = distinctValues(songs, 'artist').filter(Boolean);
  const set = (patch: Partial<SongPrefs>) => updateSettings({ songs: patch });
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Deine Musik-Vorlieben"
      description="Wir berücksichtigen sie bei den Empfehlungen – zusammen mit deinem Niveau, deiner Variante und Themen, die dir noch schwerfallen."
      footer={<Button variant="primary" block onClick={onClose}>Fertig</Button>}
    >
      <div className={s.prefs}>
        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Lieblingsgenres</legend>
          <div className={s.chips}>
            {genres.map((g) => (
              <Chip key={g} selected={prefs.preferredGenres.includes(g)} onClick={() => set({ preferredGenres: toggle(prefs.preferredGenres, g) })}>{g}</Chip>
            ))}
          </div>
        </fieldset>
        {artists.length > 0 && (
          <fieldset className={s.fieldset}>
            <legend className={s.legend}>Künstler, die du magst</legend>
            <div className={s.chips}>
              {artists.map((a) => (
                <Chip key={a} selected={prefs.preferredArtists.includes(a)} onClick={() => set({ preferredArtists: toggle(prefs.preferredArtists, a) })}>{a}</Chip>
              ))}
            </div>
          </fieldset>
        )}
        <div className={s.fieldset}>
          <span className={s.legend} id="pref-speed">Sprechtempo</span>
          <Segmented
            label="Sprechtempo"
            value={prefs.speed}
            onChange={(v) => set({ speed: v })}
            options={[{ value: 'langsam', label: 'Langsam' }, { value: 'egal', label: 'Egal' }, { value: 'schnell', label: 'Schnell' }]}
          />
        </div>
        <div className={s.fieldset}>
          <span className={s.legend}>Umgangssprache</span>
          <Segmented
            label="Anteil Umgangssprache"
            value={prefs.colloquial}
            onChange={(v) => set({ colloquial: v })}
            options={[{ value: 'wenig', label: 'Wenig' }, { value: 'egal', label: 'Egal' }, { value: 'viel', label: 'Viel' }]}
          />
        </div>
        <Toggle
          checked={prefs.explicitFilter}
          onChange={(v) => set({ explicitFilter: v })}
          label="Explizite Inhalte ausblenden"
          description="Songs mit derber Sprache erscheinen dann weder in Empfehlungen noch in der Bibliothek."
        />
      </div>
    </BottomSheet>
  );
}
