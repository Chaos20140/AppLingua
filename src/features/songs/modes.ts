/** Die acht Song-Lernmodi (gemeinsam für Detailseite und Player). URL: /songs/:songId/spielen?modus=<key> */
export type SongModeKey =
  | 'hoeren' | 'mitlesen' | 'mitsingen' | 'zeilen' | 'karaoke' | 'luecken' | 'aussprache' | 'uebersetzung';

export interface SongMode {
  key: SongModeKey;
  nr: number;
  title: string;
  description: string;
  /** Mikrofon wird genutzt (Fallback ohne Mikrofon muss es trotzdem geben) */
  usesMic: boolean;
}

export const SONG_MODES: SongMode[] = [
  { key: 'hoeren', nr: 1, title: 'Normal anhören', description: 'Einfach genießen – die aktuelle Zeile wird groß angezeigt.', usesMic: false },
  { key: 'mitlesen', nr: 2, title: 'Mitlesen', description: 'Ganzer Text mit Hervorhebung, Übersetzung und Lautschrift auf Wunsch.', usesMic: false },
  { key: 'mitsingen', nr: 3, title: 'Mitsingen', description: 'Karaoke mit Mikrofon – bewertet wird nur die Aussprache, nie deine Stimme.', usesMic: true },
  { key: 'zeilen', nr: 4, title: 'Zeile für Zeile', description: 'Pause nach jeder Zeile, wiederholen, verstehen, als gelernt markieren.', usesMic: false },
  { key: 'karaoke', nr: 5, title: 'Karaoke ohne vollständigen Text', description: 'Nur Wortanfänge sichtbar – wie gut kennst du den Text?', usesMic: false },
  { key: 'luecken', nr: 6, title: 'Lückentext-Challenge', description: 'Fehlende Wörter hören und ergänzen.', usesMic: false },
  { key: 'aussprache', nr: 7, title: 'Aussprachetraining', description: 'Jede Zeile langsam hören, nachsprechen und Tipps bekommen.', usesMic: true },
  { key: 'uebersetzung', nr: 8, title: 'Übersetzungs-Challenge', description: 'Was bedeutet die Zeile? Wähle oder schreibe die Übersetzung.', usesMic: false },
];

export const isSongMode = (k: string | null | undefined): k is SongModeKey => SONG_MODES.some((m) => m.key === k);
