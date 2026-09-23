import { describe, expect, it } from 'vitest';
import { parseBlocks, parseInline } from './markup';

describe('parseInline', () => {
  it('erkennt fett, kursiv und Zielsprache', () => {
    expect(parseInline('**Achtung:** sag `hola` _laut_')).toEqual([
      { t: 'b', c: ['Achtung:'] },
      ' sag ',
      { t: 'target', text: 'hola' },
      ' ',
      { t: 'i', c: ['laut'] },
    ]);
  });

  it('verschachtelt Zielsprache in fett', () => {
    expect(parseInline('**`me llamo`**')).toEqual([{ t: 'b', c: [{ t: 'target', text: 'me llamo' }] }]);
  });

  it('lässt Unterstriche in Wörtern und offene Marker stehen', () => {
    expect(parseInline('snake_case und **offen')).toEqual(['snake_case und **offen']);
    expect(parseInline('ein `offener Code')).toEqual(['ein `offener Code']);
  });

  it('unterstützt Escapes', () => {
    expect(parseInline('\\*\\*kein fett\\*\\*')).toEqual(['**kein fett**']);
  });

  it('rendert HTML nie als Markup', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual(['<img src=x onerror=alert(1)>']);
  });
});

describe('parseBlocks', () => {
  it('trennt Absätze, Zeilenumbrüche und Listen', () => {
    expect(parseBlocks('Zeile 1\nZeile 2\n\n- a\n- b\n1. eins\nSchluss')).toEqual([
      { t: 'p', lines: ['Zeile 1', 'Zeile 2'] },
      { t: 'ul', items: ['a', 'b'] },
      { t: 'ol', items: ['eins'] },
      { t: 'p', lines: ['Schluss'] },
    ]);
  });

  it('behandelt **fett** am Zeilenanfang nicht als Liste', () => {
    expect(parseBlocks('**Tipp:** los')).toEqual([{ t: 'p', lines: ['**Tipp:** los'] }]);
  });
});
