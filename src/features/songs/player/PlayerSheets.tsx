/**
 * Bottom-Sheets des Song-Players: Anzeige & Übung, Abschnitt-Schleife, Moduswahl, Warteschlange.
 */
import { Check, ListMusic, Minus, Plus, Timer } from 'lucide-react';
import type { Song } from '../../../content/types';
import { BottomSheet, Button, IconButton, Segmented, Toggle } from '../../../ui';
import { SONG_MODES, type SongModeKey } from '../modes';
import type { DisplayMode } from './LyricsView';
import { GAP_LEVELS, formatTime, type GapPct, type SectionRange } from './timeline';
import { cx } from './util';
import s from './player.module.css';

export type SourceChoice = 'synth' | 'youtube' | 'spotify' | 'apple';

export const SOURCE_LABEL: Record<SourceChoice, string> = {
  synth: 'Vorlesen (im Browser)',
  youtube: 'YouTube',
  spotify: 'Spotify',
  apple: 'Apple Music',
};

export const FONT_SCALES = [0.85, 1, 1.15, 1.3, 1.5] as const;

export interface DisplaySheetProps {
  open: boolean;
  onClose: () => void;
  hasTranslation: boolean;
  hasPhonetic: boolean;
  fontScale: number;
  onFontScale: (v: number) => void;
  display: DisplayMode;
  onDisplay: (v: DisplayMode) => void;
  phonetic: boolean;
  onPhonetic: (v: boolean) => void;
  gapPct: GapPct;
  onGapPct: (v: GapPct) => void;
  clock: boolean;
  pauseAfterLine: boolean;
  onPauseAfterLine: (v: boolean) => void;
  tempo: number;
  rates: number[];
  tempoReason?: string;
  onTempo: (v: number) => void;
  vocals?: boolean;
  onVocals?: (v: boolean) => void;
  // Quelle (eigene Texte)
  sources: SourceChoice[];
  source: SourceChoice;
  onSource: (v: SourceChoice) => void;
  stepMode: boolean;
  stepForced: boolean;
  onStepMode: (v: boolean) => void;
  onTapSync?: () => void;
}

const pct = (v: number) => `${Math.round(v * 100)} %`;

export function DisplaySheet(p: DisplaySheetProps) {
  const fi = FONT_SCALES.findIndex((f) => Math.abs(f - p.fontScale) < 0.001);
  const idx = fi < 0 ? 1 : fi;
  return (
    <BottomSheet open={p.open} onClose={p.onClose} title="Anzeige & Übung">
      <div className={s.sheet}>
        <div className={s.sheetRow}>
          <span className={s.sheetLabel} id="pl-font">Schriftgröße</span>
          <div className={s.fontCtl} role="group" aria-labelledby="pl-font">
            <IconButton label="Schrift kleiner (A−)" icon={<Minus size={18} />} variant="tonal" disabled={idx <= 0} onClick={() => p.onFontScale(FONT_SCALES[idx - 1])} />
            <span className={s.fontValue} aria-live="polite">{pct(FONT_SCALES[idx])}</span>
            <IconButton label="Schrift größer (A+)" icon={<Plus size={18} />} variant="tonal" disabled={idx >= FONT_SCALES.length - 1} onClick={() => p.onFontScale(FONT_SCALES[idx + 1])} />
          </div>
        </div>

        <div className={s.sheetBlock}>
          <span className={s.sheetLabel}>Text</span>
          <Segmented<DisplayMode>
            label="Text anzeigen"
            value={p.hasTranslation ? p.display : 'original'}
            onChange={p.onDisplay}
            options={[
              { value: 'original', label: 'Original' },
              { value: 'translation', label: 'Übersetzung', disabled: !p.hasTranslation },
              { value: 'both', label: 'Beides', disabled: !p.hasTranslation },
            ]}
          />
          {!p.hasTranslation && <p className={s.note}>Für diesen Text ist keine Übersetzung hinterlegt – tippe auf eine Zeile, um sie erklären zu lassen.</p>}
        </div>

        <Toggle
          checked={p.phonetic && p.hasPhonetic}
          onChange={p.onPhonetic}
          disabled={!p.hasPhonetic}
          label="Lautschrift"
          description={p.hasPhonetic ? 'Deutsche Aussprachehilfe unter jeder Zeile' : 'Für diesen Text nicht verfügbar'}
        />

        <div className={s.sheetBlock}>
          <span className={s.sheetLabel}>Lückentext-Anteil</span>
          <Segmented<string>
            label="Lückentext-Anteil"
            value={String(p.gapPct)}
            onChange={(v) => p.onGapPct(Number(v) as GapPct)}
            options={GAP_LEVELS.map((g) => ({ value: String(g), label: `${g} %` }))}
          />
          <p className={s.note}>Inhaltswörter werden bevorzugt verdeckt. Im Lückentext-Modus füllst du sie aus, sonst deckst du sie per Tippen auf.</p>
        </div>

        {p.clock && (
          <div className={s.sheetBlock}>
            <span className={s.sheetLabel}><Timer size={16} aria-hidden="true" /> Wiedergabe</span>
            <Segmented<string>
              label="Tempo"
              value={String(p.tempo)}
              onChange={(v) => p.onTempo(Number(v))}
              options={[0.5, 0.75, 0.9, 1].map((r) => ({
                value: String(r),
                label: `${r.toLocaleString('de-DE')}×`,
                disabled: !p.rates.includes(r),
              }))}
            />
            {p.tempoReason && <p className={s.note}>{p.tempoReason}</p>}
            <Toggle checked={p.pauseAfterLine} onChange={p.onPauseAfterLine} label="Pause nach jeder Zeile" description="Zeit zum Nachsprechen, Verstehen oder Ausfüllen" />
            {p.onVocals && (
              <Toggle checked={!!p.vocals} onChange={p.onVocals} label="Gesang (Sprachausgabe)" description="Aus = nur Begleitmusik (Instrumental)" />
            )}
          </div>
        )}

        {(p.sources.length > 1 || p.onTapSync || !p.stepForced) && (
          <div className={s.sheetBlock}>
            <span className={s.sheetLabel}>Quelle & Zeiten</span>
            {p.sources.length > 1 && (
              <Segmented<SourceChoice>
                label="Wiedergabequelle"
                value={p.source}
                onChange={p.onSource}
                options={p.sources.map((v) => ({ value: v, label: SOURCE_LABEL[v] }))}
              />
            )}
            <Toggle
              checked={p.stepMode}
              onChange={p.onStepMode}
              disabled={p.stepForced}
              label="Schritt-Modus"
              description={p.stepForced ? 'Für diese Quelle nötig – Zeilen per Hand weiterschalten' : 'Zeilen per Hand weiterschalten statt nach Zeit'}
            />
            {p.onTapSync && (
              <Button variant="secondary" icon={<Timer size={16} aria-hidden="true" />} onClick={p.onTapSync}>Zeiten per Tippen erstellen</Button>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export function LoopSheet({ open, onClose, sections, value, onChange }: {
  open: boolean;
  onClose: () => void;
  sections: SectionRange[];
  value: number | null;
  onChange: (firstIdx: number | null) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Abschnitt-Schleife" description="Der gewählte Abschnitt wiederholt sich, bis du die Schleife beendest.">
      <div className={s.choiceList} role="radiogroup" aria-label="Abschnitt wählen">
        <button type="button" role="radio" aria-checked={value === null} className={cx(s.choice, value === null && s.choiceOn)} onClick={() => onChange(null)}>
          <span>Keine Schleife</span>{value === null && <Check size={18} aria-hidden="true" />}
        </button>
        {sections.map((r) => (
          <button
            key={r.firstIdx}
            type="button"
            role="radio"
            aria-checked={value === r.firstIdx}
            className={cx(s.choice, value === r.firstIdx && s.choiceOn)}
            onClick={() => onChange(r.firstIdx)}
          >
            <span>{r.label}<span className={s.choiceMeta}> · Zeile {r.firstIdx + 1}–{r.lastIdx + 1} · {formatTime(r.startMs)}</span></span>
            {value === r.firstIdx && <Check size={18} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

export function ModeSheet({ open, onClose, value, onChange }: {
  open: boolean;
  onClose: () => void;
  value: SongModeKey;
  onChange: (k: SongModeKey) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Lernmodus wählen">
      <div className={s.choiceList} role="radiogroup" aria-label="Lernmodus">
        {SONG_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={value === m.key}
            className={cx(s.choice, s.choiceTall, value === m.key && s.choiceOn)}
            onClick={() => onChange(m.key)}
          >
            <span className={s.modeNr} aria-hidden="true">{m.nr}</span>
            <span className={s.choiceText}>
              <span className={s.choiceTitle}>{m.title}</span>
              <span className={s.choiceMeta}>{m.description}</span>
            </span>
            {value === m.key && <Check size={18} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}

export function QueueSheet({ open, onClose, name, songs, currentId, onPick }: {
  open: boolean;
  onClose: () => void;
  name: string;
  songs: { id: string; song: Song | null }[];
  currentId: string;
  onPick: (songId: string) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={name || 'Warteschlange'} description={`${songs.length} Songs`}>
      <ol className={s.choiceList} aria-label="Warteschlange">
        {songs.map(({ id, song }, i) => (
          <li key={`${id}-${i}`}>
            <button
              type="button"
              className={cx(s.choice, id === currentId && s.choiceOn)}
              onClick={() => onPick(id)}
              disabled={!song}
              aria-current={id === currentId ? 'true' : undefined}
            >
              <span className={s.modeNr} aria-hidden="true">{id === currentId ? <ListMusic size={16} /> : i + 1}</span>
              <span className={s.choiceText}>
                <span className={s.choiceTitle}>{song?.title ?? 'Nicht mehr verfügbar'}</span>
                {song?.artist && <span className={s.choiceMeta}>{song.artist}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </BottomSheet>
  );
}
