/**
 * Akkord-Parser für die synthetisierte Begleitmusik der Demo-Lernlieder.
 * Unterstützt Dur, Moll, 7, maj7, m7, dim(7), m7b5, aug, sus2/sus4, 6, 9, add9 und Slash-Akkorde (C/G).
 * Unbekannte Zusätze fallen ehrlich auf den Dreiklang zurück (`known: false`).
 */

const NOTE_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };

export type ChordQuality =
  | 'major' | 'minor' | 'dom7' | 'maj7' | 'min7' | 'minMaj7' | 'dim' | 'dim7' | 'halfDim'
  | 'aug' | 'sus2' | 'sus4' | '7sus4' | 'maj6' | 'min6' | 'dom9' | 'add9' | 'min9' | 'maj9';

export const QUALITY_INTERVALS: Record<ChordQuality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  minMaj7: [0, 3, 7, 11],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  halfDim: [0, 3, 6, 10],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  maj6: [0, 4, 7, 9],
  min6: [0, 3, 7, 9],
  dom9: [0, 4, 7, 10, 14],
  add9: [0, 4, 7, 14],
  min9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
};

/** Zusatz (Groß-/Kleinschreibung beachten: „M7“ = maj7, „m7“ = Moll-7) → Qualität */
const SUFFIXES: Record<string, ChordQuality> = {
  '': 'major', maj: 'major', M: 'major', dur: 'major',
  m: 'minor', min: 'minor', '-': 'minor', mi: 'minor', moll: 'minor',
  '7': 'dom7', dom7: 'dom7',
  maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', ma7: 'maj7', j7: 'maj7',
  m7: 'min7', min7: 'min7', '-7': 'min7', mi7: 'min7',
  mmaj7: 'minMaj7', mM7: 'minMaj7', 'm(maj7)': 'minMaj7', minmaj7: 'minMaj7',
  dim: 'dim', '°': 'dim', o: 'dim', dim7: 'dim7', '°7': 'dim7', o7: 'dim7',
  m7b5: 'halfDim', 'm7-5': 'halfDim', 'ø': 'halfDim', 'ø7': 'halfDim', min7b5: 'halfDim',
  aug: 'aug', '+': 'aug', '#5': 'aug', '+5': 'aug',
  sus2: 'sus2', sus4: 'sus4', sus: 'sus4', '7sus4': '7sus4', '7sus': '7sus4',
  '6': 'maj6', maj6: 'maj6', m6: 'min6', min6: 'min6',
  '9': 'dom9', add9: 'add9', add2: 'add9', m9: 'min9', min9: 'min9', maj9: 'maj9', M9: 'maj9',
};

export interface ParsedChord {
  symbol: string;
  /** Grundton als Tonklasse 0–11 (C = 0) */
  root: number;
  quality: ChordQuality;
  /** Intervalle in Halbtönen ab Grundton */
  intervals: readonly number[];
  /** Basston (Slash-Akkord) als Tonklasse; sonst = root */
  bass: number;
  /** false = Zusatz unbekannt, Dreiklang als Rückfall */
  known: boolean;
}

/** Notenname (C, C#, Db, F♯, B♭ …) → Tonklasse 0–11 oder null */
export function pitchClass(name: string): number | null {
  const m = /^([A-Ha-h])([#♯b♭]*)$/.exec(name.trim());
  if (!m) return null;
  const base = NOTE_PC[m[1].toUpperCase()];
  if (base === undefined) return null;
  let pc = base;
  for (const ch of m[2]) pc += ch === '#' || ch === '♯' ? 1 : -1;
  return ((pc % 12) + 12) % 12;
}

function lookupQuality(suffix: string): ChordQuality | undefined {
  if (Object.hasOwn(SUFFIXES, suffix)) return SUFFIXES[suffix];
  const plain = suffix.replace(/[()]/g, '');
  if (Object.hasOwn(SUFFIXES, plain)) return SUFFIXES[plain];
  // Wortzusätze (Maj7, Sus4, Dim …) unabhängig von der Großschreibung
  const lowered = plain.replace(/^(maj|min|dim|sus|add|aug)/i, (w) => w.toLowerCase());
  return Object.hasOwn(SUFFIXES, lowered) ? SUFFIXES[lowered] : undefined;
}

/** Akkordsymbol → Grundton, Qualität, Intervalle und Basston; null bei unlesbarem Grundton */
export function parseChord(symbol: string): ParsedChord | null {
  const raw = (symbol ?? '').trim().replace(/\s+/g, '');
  const m = /^([A-H])([#♯b♭]?)(.*?)(?:\/([A-H][#♯b♭]?))?$/.exec(raw);
  if (!m) return null;
  const root = pitchClass(m[1] + m[2]);
  if (root === null) return null;
  const suffix = m[3];
  const quality = lookupQuality(suffix);
  const known = quality !== undefined;
  const q: ChordQuality = quality ?? (/^m(?!aj)/.test(suffix) ? 'minor' : 'major');
  const bass = m[4] ? pitchClass(m[4]) : root;
  return { symbol: raw, root, quality: q, intervals: QUALITY_INTERVALS[q], bass: bass ?? root, known };
}

/** Tonart („C“, „Am“, „F#m“) → Tonika-Akkord (Rückfall bei fehlenden Akkorden) */
export function keyChord(key: string): ParsedChord {
  return parseChord(key) ?? (parseChord('C') as ParsedChord);
}

/** Akkordfolge parsen; unlesbare Einträge werden durch den vorherigen (bzw. die Tonika) ersetzt. */
export function parseProgression(chords: readonly string[], key: string): ParsedChord[] {
  const tonic = keyChord(key);
  const out: ParsedChord[] = [];
  for (const c of chords) out.push(parseChord(c) ?? out[out.length - 1] ?? tonic);
  return out.length ? out : [tonic];
}

export const midiToFreq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Akkordtöne als MIDI-Noten in angenehmer Mittellage (Grundton zwischen E3 und D#4). */
export function chordVoicing(chord: ParsedChord, low = 52): number[] {
  let base = 48 + chord.root;
  while (base < low) base += 12;
  while (base >= low + 12) base -= 12;
  return chord.intervals.map((i) => base + i);
}

/** Basston (MIDI) zwischen C2 und B2; `interval` z. B. 7 = Quinte, 12 = Oktave */
export function bassNote(chord: ParsedChord, interval = 0): number {
  const pc = interval === 0 ? chord.bass : (chord.root + interval) % 12;
  const note = 36 + pc;
  return interval === 12 ? note + 12 : note;
}
