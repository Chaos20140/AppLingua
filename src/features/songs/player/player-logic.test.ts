import { describe, expect, it } from 'vitest';
import type { SongToken } from '../../../content/types';
import { bassNote, chordVoicing, midiToFreq, parseChord, parseProgression, pitchClass } from './chords';
import {
  chooseGaps, formatTime, hintWord, lineIndexAt, resumeTarget, sectionRanges, seekTargetFor, shouldOfferResume,
  syllableCount, translationChoice, wordProgressAt, wordSpans,
} from './timeline';
import { GROOVES, stepsPerBar } from './sources/grooves';

describe('Akkord-Parser', () => {
  it('liest Grundton mit Vorzeichen', () => {
    expect(pitchClass('C')).toBe(0);
    expect(pitchClass('F#')).toBe(6);
    expect(pitchClass('Bb')).toBe(10);
    expect(pitchClass('Cb')).toBe(11);
    expect(pitchClass('X')).toBeNull();
  });

  it('erkennt Dur, Moll und Septakkorde', () => {
    expect(parseChord('C')).toMatchObject({ root: 0, quality: 'major', intervals: [0, 4, 7], known: true });
    expect(parseChord('Am')).toMatchObject({ root: 9, quality: 'minor', intervals: [0, 3, 7] });
    expect(parseChord('G7')).toMatchObject({ root: 7, quality: 'dom7', intervals: [0, 4, 7, 10] });
    expect(parseChord('Cmaj7')).toMatchObject({ quality: 'maj7', intervals: [0, 4, 7, 11] });
    expect(parseChord('CM7')?.quality).toBe('maj7');
    expect(parseChord('Dm7')).toMatchObject({ root: 2, quality: 'min7' });
    expect(parseChord('F#m')).toMatchObject({ root: 6, quality: 'minor' });
    expect(parseChord('Bbmaj7')).toMatchObject({ root: 10, quality: 'maj7' });
  });

  it('erkennt dim, sus, aug, 6/9 und Schreibvarianten', () => {
    expect(parseChord('Bdim')?.intervals).toEqual([0, 3, 6]);
    expect(parseChord('C#dim7')?.quality).toBe('dim7');
    expect(parseChord('B°')?.quality).toBe('dim');
    expect(parseChord('Bm7b5')?.quality).toBe('halfDim');
    expect(parseChord('Dsus4')?.intervals).toEqual([0, 5, 7]);
    expect(parseChord('Dsus2')?.intervals).toEqual([0, 2, 7]);
    expect(parseChord('Asus')?.quality).toBe('sus4');
    expect(parseChord('G7sus4')?.quality).toBe('7sus4');
    expect(parseChord('Caug')?.quality).toBe('aug');
    expect(parseChord('C+')?.quality).toBe('aug');
    expect(parseChord('Am(maj7)')?.quality).toBe('minMaj7');
    expect(parseChord('CMaj7')?.quality).toBe('maj7');
    expect(parseChord('Cadd9')?.intervals).toEqual([0, 4, 7, 14]);
  });

  it('versteht Slash-Akkorde (Basston)', () => {
    const c = parseChord('C/G');
    expect(c).toMatchObject({ root: 0, bass: 7, quality: 'major' });
    const am = parseChord('Am7/G');
    expect(am).toMatchObject({ root: 9, bass: 7, quality: 'min7' });
    expect(parseChord('D/F#')?.bass).toBe(6);
  });

  it('fällt bei unbekanntem Zusatz auf den Dreiklang zurück', () => {
    expect(parseChord('C13#11')).toMatchObject({ quality: 'major', known: false });
    expect(parseChord('Cm11')).toMatchObject({ quality: 'minor', known: false });
    expect(parseChord('xyz')).toBeNull();
    expect(parseChord('')).toBeNull();
  });

  it('ersetzt unlesbare Akkorde in einer Folge', () => {
    const p = parseProgression(['C', '??', 'G'], 'C');
    expect(p.map((c) => c.root)).toEqual([0, 0, 7]);
    expect(parseProgression([], 'Am')[0]).toMatchObject({ root: 9, quality: 'minor' });
  });

  it('berechnet Lage und Frequenzen', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
    const v = chordVoicing(parseChord('C') as NonNullable<ReturnType<typeof parseChord>>);
    expect(v[0]).toBeGreaterThanOrEqual(52);
    expect(v[0]).toBeLessThan(64);
    expect(v.map((n) => n % 12)).toEqual([0, 4, 7]);
    const slash = parseChord('C/G') as NonNullable<ReturnType<typeof parseChord>>;
    expect(bassNote(slash) % 12).toBe(7);
    expect(bassNote(slash, 7) % 12).toBe(7);
    expect(bassNote(parseChord('A') as NonNullable<ReturnType<typeof parseChord>>, 7) % 12).toBe(4);
  });
});

describe('Grooves', () => {
  it('alle Muster passen zur Schrittzahl des Stils (Bossa halbes Tempo notiert → 32 Schritte)', () => {
    for (const [style, g] of Object.entries(GROOVES)) {
      const steps = stepsPerBar(style as keyof typeof GROOVES);
      for (const key of ['kick', 'snare', 'hat', 'bass', 'chord'] as const) {
        expect(g[key].length, `${style}.${key}`).toBe(steps);
      }
    }
    expect(stepsPerBar('bossa')).toBe(32);
    expect(stepsPerBar('pop')).toBe(16);
  });
});

const line = (startMs: number, endMs: number) => ({ startMs, endMs });

describe('Zeitberechnung', () => {
  const lines = [line(2000, 4000), line(4500, 7000), line(8000, 10000)];

  it('findet die aktuelle Zeile (mit Vorlauf)', () => {
    expect(lineIndexAt(lines, 0)).toBe(-1);
    expect(lineIndexAt(lines, 1800)).toBe(0); // 250 ms Vorlauf
    expect(lineIndexAt(lines, 1700)).toBe(-1);
    expect(lineIndexAt(lines, 4300)).toBe(1);
    expect(lineIndexAt(lines, 7500)).toBe(1); // Pause zwischen Zeilen → vorherige bleibt aktuell
    expect(lineIndexAt(lines, 99999)).toBe(2);
    expect(lineIndexAt(lines, 4400, 0)).toBe(0);
    expect(lineIndexAt([], 1000)).toBe(-1);
  });

  it('springt knapp vor den Zeilenbeginn', () => {
    expect(seekTargetFor(lines, 1)).toBe(4300);
    expect(seekTargetFor(lines, 0)).toBe(1800);
    expect(seekTargetFor(lines, 9)).toBe(7800);
    expect(lineIndexAt(lines, seekTargetFor(lines, 2))).toBe(2);
  });

  it('zählt Silben (Diphthong, Hiat, y)', () => {
    expect(syllableCount('casa')).toBe(2);
    expect(syllableCount('quiero')).toBe(2);
    expect(syllableCount('día')).toBe(2);
    expect(syllableCount('poeta')).toBe(3);
    expect(syllableCount('canción')).toBe(2);
    expect(syllableCount('muy')).toBe(1);
    expect(syllableCount('y')).toBe(1);
    expect(syllableCount('ayer')).toBe(2);
    expect(syllableCount('¿Dónde')).toBe(2);
    expect(syllableCount('...')).toBe(0);
  });

  const tok = (t: string, p?: true): SongToken => (p ? { t, p } : { t });
  const l = { startMs: 1000, endMs: 3000, tokens: [tok('Hola'), tok(','), tok('mi'), tok('corazón'), tok('.', true)] };

  it('verteilt Wortzeiten nach Silben', () => {
    const spans = wordSpans(l);
    expect(spans.map((s) => s.tokenIndex)).toEqual([0, 2, 3]);
    expect(spans[0].startMs).toBe(1000);
    // „corazón“ (3 Silben) länger als „mi“ (1 Silbe)
    expect(spans[2].endMs - spans[2].startMs).toBeGreaterThan(spans[1].endMs - spans[1].startMs);
    expect(spans[2].endMs).toBeLessThanOrEqual(3000);
    for (let k = 1; k < spans.length; k++) expect(spans[k].startMs).toBeGreaterThanOrEqual(spans[k - 1].endMs - 1);
  });

  it('begrenzt die Wortzeiten auf die Sprechdauer der Sprachausgabe', () => {
    const tts = wordSpans(l, 150);
    expect(tts[tts.length - 1].endMs).toBeLessThan(wordSpans(l)[2].endMs);
    const slow = wordSpans(l, 10000);
    expect(slow[slow.length - 1].endMs).toBeLessThanOrEqual(1000 + 2000 * 0.97 + 1);
  });

  it('liefert Wortfortschritt', () => {
    const spans = wordSpans(l);
    expect(wordProgressAt(spans, 500)).toEqual({ index: -1, frac: 0 });
    expect(wordProgressAt(spans, 1000).index).toBe(0);
    const mid = wordProgressAt(spans, (spans[1].startMs + spans[1].endMs) / 2);
    expect(mid.index).toBe(1);
    expect(mid.frac).toBeGreaterThan(0.4);
    expect(mid.frac).toBeLessThan(0.6);
    expect(wordProgressAt(spans, 5000)).toEqual({ index: 2, frac: 1 });
    expect(wordProgressAt([], 5000)).toEqual({ index: -1, frac: 0 });
  });

  it('formatiert Zeiten und bietet Fortsetzen sinnvoll an', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(83500)).toBe('1:23');
    expect(formatTime(-5)).toBe('0:00');
    expect(shouldOfferResume(83000, 150000)).toBe(true);
    expect(shouldOfferResume(2000, 150000)).toBe(false);
    expect(shouldOfferResume(147000, 150000)).toBe(false);
    expect(shouldOfferResume(undefined, 150000)).toBe(false);
    expect(resumeTarget(lines, 9000)).toBe(7800);
    expect(resumeTarget(lines, 500)).toBe(0);
  });

  it('bildet Abschnitte mit nummerierten Wiederholungen', () => {
    const song = {
      sections: [{ id: 'v1', label: 'Strophe' }, { id: 'c', label: 'Refrain' }],
      lines: [
        { sectionId: 'v1', startMs: 0, endMs: 1 }, { sectionId: 'c', startMs: 2, endMs: 3 },
        { sectionId: 'c', startMs: 4, endMs: 5 }, { sectionId: 'v1', startMs: 6, endMs: 7 }, { sectionId: 'c', startMs: 8, endMs: 9 },
      ],
    } as unknown as Parameters<typeof sectionRanges>[0];
    const r = sectionRanges(song);
    expect(r.map((x) => x.label)).toEqual(['Strophe', 'Refrain', 'Strophe 2', 'Refrain 2']);
    expect(r[1]).toMatchObject({ firstIdx: 1, lastIdx: 2, startMs: 2, endMs: 5 });
  });
});

describe('Lücken & Hinweise', () => {
  const toks = (s: string): SongToken[] => s.split(' ').map((t) => (/^[.,!?]$/.test(t) ? { t, p: true } : { t }));

  it('bevorzugt Inhaltswörter', () => {
    const t = toks('Yo quiero bailar en la plaza contigo .');
    const one = chooseGaps(t, 25, 'es', 'seed');
    expect(one.length).toBe(2); // 7 Wörter × 25 % ≈ 2
    for (const i of one) expect(['quiero', 'bailar', 'plaza', 'contigo']).toContain(t[i].t);
  });

  it('beachtet 0 / 50 / 100 % und ist deterministisch', () => {
    const t = toks('Yo quiero bailar en la plaza contigo .');
    expect(chooseGaps(t, 0, 'es', 'x')).toEqual([]);
    expect(chooseGaps(t, 100, 'es', 'x')).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const half = chooseGaps(t, 50, 'es', 'x');
    expect(half.length).toBe(4);
    expect(chooseGaps(t, 50, 'es', 'x')).toEqual(half);
    expect([...half].sort((a, b) => a - b)).toEqual(half);
    expect(half).not.toContain(7); // Satzzeichen nie
  });

  it('setzt bei kurzen Zeilen mindestens eine Lücke, auch in PT', () => {
    const t = toks('Bom dia !');
    expect(chooseGaps(t, 25, 'pt', 's').length).toBe(1);
    expect(chooseGaps(toks('o a de'), 25, 'pt', 's').length).toBe(1);
    expect(chooseGaps(toks('.'), 50, 'es', 's')).toEqual([]);
  });

  it('zeigt nur Wortanfänge', () => {
    expect(hintWord('quiero')).toBe('q·····');
    expect(hintWord('¿Dónde')).toBe('¿D····');
    expect(hintWord('a')).toBe('a');
    expect(hintWord('...')).toBe('...');
  });

  it('baut eine Übersetzungs-Auswahl mit Ablenkern', () => {
    const ls = [
      { id: 'l1', natural: 'Guten Morgen' }, { id: 'l2', natural: 'Ich liebe dich' },
      { id: 'l3', natural: 'Guten Morgen' }, { id: 'l4', natural: 'Komm tanzen' }, { id: 'l5', natural: '' },
    ];
    const c = translationChoice(ls, 0, 'seed');
    expect(c).not.toBeNull();
    expect(c?.options.length).toBe(3);
    expect(c?.options[c.correct]).toBe('Guten Morgen');
    expect(new Set(c?.options).size).toBe(3);
    expect(translationChoice(ls, 4, 'seed')).toBeNull();
    expect(translationChoice([{ id: 'x', natural: 'A' }], 0, 's')).toBeNull();
  });
});
