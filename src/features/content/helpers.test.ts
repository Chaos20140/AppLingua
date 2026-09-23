import { describe, expect, it } from 'vitest';
import { courseOfId, htmlLangFor, isForVariant, rolesIn, splitEnding, splitSpaces } from './helpers';

describe('content helpers', () => {
  it('splitEnding markiert nur passende Endungen', () => {
    expect(splitEnding('hablo', 'o')).toEqual({ stem: 'habl', ending: 'o' });
    expect(splitEnding('habláis', 'áis')).toEqual({ stem: 'habl', ending: 'áis' });
    expect(splitEnding('soy', 'o')).toEqual({ stem: 'soy', ending: '' });
    expect(splitEnding('es')).toEqual({ stem: 'es', ending: '' });
    expect(splitEnding('a', 'abc')).toEqual({ stem: 'a', ending: '' });
  });
  it('splitSpaces trennt Leerzeichen ab', () => {
    expect(splitSpaces(' de ')).toEqual({ lead: ' ', core: 'de', trail: ' ' });
    expect(splitSpaces('Soy')).toEqual({ lead: '', core: 'Soy', trail: '' });
  });
  it('rolesIn liefert benutzte Rollen in Legendenreihenfolge ohne other', () => {
    expect(rolesIn([{ text: 'de', role: 'preposition' }, { text: 'Soy', role: 'verb' }, { text: ', ' }, { text: 'x', role: 'other' }, { text: 'yo', role: 'subject' }]))
      .toEqual(['subject', 'verb', 'preposition']);
  });
  it('Varianten, Sprache und Kurs aus ID', () => {
    expect(isForVariant(undefined, 'es-ES')).toBe(true);
    expect(isForVariant('es-LA', 'es-ES')).toBe(false);
    expect(htmlLangFor('es-LA')).toBe('es-419');
    expect(courseOfId('pt.pc.r')).toBe('pt-BR');
    expect(courseOfId('es.g.ser')).toBe('es');
    expect(courseOfId('song.es.x')).toBeNull();
  });
});
