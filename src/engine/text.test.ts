import { describe, expect, it } from 'vitest';
import { diffWords, hashString, joinTokens, levenshtein, normalize, seededShuffle, singleEditPosition, stripAccents, tokenizeWords } from './text';

describe('normalize', () => {
  it('entfernt Satzzeichen inkl. ¿¡, Großschreibung und Mehrfach-Leerzeichen', () => {
    expect(normalize('  ¿Cómo   estás?  ')).toBe('cómo estás');
    expect(normalize('¡Hola, amigo!')).toBe('hola amigo');
    expect(normalize('Sí; claro: vale.')).toBe('sí claro vale');
  });
  it('vereinheitlicht typografische Apostrophe', () => {
    expect(normalize('d’água')).toBe("d'água");
    expect(normalize('d‘água')).toBe("d'água");
  });
  it('behält Akzente, stripAccents entfernt sie (inkl. ñ, ç)', () => {
    expect(normalize('ESPAÑOL')).toBe('español');
    expect(stripAccents('español coração pingüino')).toBe('espanol coracao pinguino');
  });
  it('tokenizeWords', () => {
    expect(tokenizeWords('¿Qué tal, Ana?')).toEqual(['qué', 'tal', 'ana']);
    expect(tokenizeWords('   ')).toEqual([]);
  });
});

describe('levenshtein & singleEditPosition', () => {
  it('berechnet Distanzen', () => {
    expect(levenshtein('perro', 'pero')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
  it('findet die Position genau einer Bearbeitung', () => {
    expect(singleEditPosition('estudiente', 'estudiante')).toBe(6);
    expect(singleEditPosition('tiene', 'tienes')).toBe(5);
    expect(singleEditPosition('abc', 'abc')).toBeNull();
    expect(singleEditPosition('abc', 'xyz')).toBeNull();
  });
});

describe('diffWords', () => {
  it('erkennt falsche, fehlende und überflüssige Wörter', () => {
    expect(diffWords(['yo', 'es', 'cansado'], ['yo', 'estoy', 'cansado'])).toEqual([
      { op: 'same', word: 'yo' }, { op: 'wrong', user: 'es', expected: 'estoy' }, { op: 'same', word: 'cansado' },
    ]);
    expect(diffWords(['soy', 'estudiante'], ['yo', 'soy', 'estudiante'])[0]).toEqual({ op: 'missing', expected: 'yo' });
    expect(diffWords(['soy', 'muy', 'alto'], ['soy', 'alto'])[1]).toEqual({ op: 'extra', user: 'muy' });
  });
  it('markiert reine Akzentabweichungen', () => {
    expect(diffWords(['cafe'], ['café'])).toEqual([{ op: 'accent', user: 'cafe', expected: 'café' }]);
  });
});

describe('Hilfen', () => {
  it('joinTokens setzt Satzzeichen korrekt', () => {
    expect(joinTokens(['¿', 'Cómo', 'estás', '?'])).toBe('¿Cómo estás?');
    expect(joinTokens(['Hola', ',', 'Ana', '.'])).toBe('Hola, Ana.');
  });
  it('hash und Mischen sind deterministisch', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
    const a = seededShuffle([1, 2, 3, 4, 5, 6], 'seed');
    expect(seededShuffle([1, 2, 3, 4, 5, 6], 'seed')).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
