/**
 * Rhythmusmuster je Stil für die synthetisierte Begleitmusik (ein Takt, 16tel-Raster).
 * Bossa nova ist in halbem Tempo notiert: ein notierter Takt enthält zwei gespielte Takte
 * → 32 Schritte pro notiertem Takt.
 *
 * Zeichen: '.' Pause · 'x' Schlag · 'X' Akzent · Bass: 'R' Grundton (bzw. Slash-Bass), '5' Quinte,
 * 'O' Oktave, '3' Terz · Akkord: 'x' Anschlag (Dauer je nach `chordStyle`).
 */
import type { Song } from '../../../../content/types';

export type BackingStyle = Song['backing']['style'];
export type ChordStyle = 'pad' | 'stab' | 'arp' | 'strum' | 'pluck';

export interface Groove {
  kick: string;
  snare: string;
  hat: string;
  bass: string;
  chord: string;
  chordStyle: ChordStyle;
  /** Snare als Rimshot/Cross-Stick */
  rim?: boolean;
  /** Lautstärken 0..1 */
  mix: { drums: number; bass: number; chords: number };
}

export const stepsPerBar = (style: BackingStyle) => (style === 'bossa' ? 32 : 16);

export const GROOVES: Record<BackingStyle, Groove> = {
  pop: {
    kick: 'x.......x.x.....',
    snare: '....x.......x...',
    hat: 'x.x.x.x.x.x.x.x.',
    bass: 'R.....R.R...5.R.',
    chord: 'x.......x.......',
    chordStyle: 'pad',
    mix: { drums: 0.55, bass: 0.55, chords: 0.4 },
  },
  ballad: {
    kick: 'x.........x.....',
    snare: '....x.......x...',
    hat: 'x...x...x...x...',
    bass: 'R.......5.......',
    chord: 'x.x.x.x.x.x.x.x.',
    chordStyle: 'arp',
    rim: true,
    mix: { drums: 0.35, bass: 0.5, chords: 0.45 },
  },
  cumbia: {
    kick: 'x.......x.......',
    snare: '....x.......x...',
    hat: 'x.XX.xXx.xXX.xXx',
    bass: 'R.....5.R.....5.',
    chord: '..x...x...x...x.',
    chordStyle: 'stab',
    rim: true,
    mix: { drums: 0.5, bass: 0.6, chords: 0.38 },
  },
  bossa: {
    kick: 'x.....x.x.....x.x.....x.x.....x.',
    snare: 'x..x..x...x..x....x..x...x..x...',
    hat: 'x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.x.',
    bass: 'R.....5.R.....5.R.....5.R.....5.',
    chord: 'x..x..x...x..x....x..x...x..x...',
    chordStyle: 'pluck',
    rim: true,
    mix: { drums: 0.32, bass: 0.55, chords: 0.42 },
  },
  samba: {
    kick: 'x.......X.......',
    snare: 'x.x..x.x.x..x.x.',
    hat: 'XxxxXxxxXxxxXxxx',
    bass: 'R.....5.R.....5.',
    chord: '..x..x..x..x..x.',
    chordStyle: 'stab',
    rim: true,
    mix: { drums: 0.45, bass: 0.55, chords: 0.36 },
  },
  folk: {
    kick: 'x.......x.......',
    snare: '....x.......x...',
    hat: '................',
    bass: 'R.......5.......',
    chord: 'x...x.x...x.x.x.',
    chordStyle: 'strum',
    mix: { drums: 0.35, bass: 0.5, chords: 0.45 },
  },
  reggaeton: {
    kick: 'x...x...x...x...',
    snare: '...x..x....x..x.',
    hat: 'x.x.x.x.x.x.x.x.',
    bass: 'R.....R.R.....R.',
    chord: 'x...............',
    chordStyle: 'pad',
    mix: { drums: 0.55, bass: 0.6, chords: 0.32 },
  },
};
