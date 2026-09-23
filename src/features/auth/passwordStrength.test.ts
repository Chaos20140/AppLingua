import { describe, expect, it } from 'vitest';
import { passwordStrength } from './passwordStrength';

describe('passwordStrength', () => {
  it('leer → 0, zu kurz oder bekannt → schwach', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(1);
    expect(passwordStrength('Passwort123!')).toBe(1);
    expect(passwordStrength('aaaaaaaaaa')).toBe(1);
  });
  it('steigt mit Länge und Zeichenvielfalt', () => {
    expect(passwordStrength('sonnenhut')).toBe(1);
    expect(passwordStrength('Sonnenhut7')).toBe(2);
    expect(passwordStrength('Sonnenhut7!x')).toBe(4);
    expect(passwordStrength('blauer himmel über berlin')).toBe(4);
  });
  it('bleibt im Bereich 0..4', () => {
    for (const pw of ['x', 'Xy1!Xy1!Xy1!Xy1!Xy1!', '12345678']) {
      const s = passwordStrength(pw);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(4);
    }
  });
});
