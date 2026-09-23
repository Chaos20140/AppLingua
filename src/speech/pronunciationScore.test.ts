import { describe, expect, it } from 'vitest';
import { foldWord, scorePronunciation } from './pronunciationScore';

const es = { lang: 'es-ES' };
const la = { lang: 'es-MX' };
const pt = { lang: 'pt-BR' };

describe('scorePronunciation – Grundlagen', () => {
  it('perfekte Erkennung → 100, alle Wörter ok, keine Probleme', () => {
    const r = scorePronunciation('Me llamo Ana.', ['me llamo Ana'], es);
    expect(r.scorePct).toBe(100);
    expect(r.words.map((w) => w.ok)).toEqual([true, true, true]);
    expect(r.words.map((w) => w.text)).toEqual(['Me', 'llamo', 'Ana.']);
    expect(r.issues).toEqual([]);
    expect(r.rating).toBe('excellent');
  });

  it('ignoriert Groß-/Kleinschreibung, Satzzeichen und ¿¡', () => {
    const r = scorePronunciation('¿Cómo te llamas?', ['Como te llamas'], es);
    expect(r.scorePct).toBe(100);
  });

  it('leere Erkennung → 0 und vermutete Item-Codes mit Tipps', () => {
    const r = scorePronunciation('perro', [], { lang: 'es-ES', issueCodes: ['rr'] });
    expect(r.scorePct).toBe(0);
    expect(r.words).toEqual([{ text: 'perro', ok: false }]);
    expect(r.issues).toEqual(['rr']);
    expect(r.tips.length).toBeGreaterThanOrEqual(2);
    expect(r.rating).toBe('poor');
  });

  it('wählt die beste Alternative', () => {
    const r = scorePronunciation('perro', ['pero', 'perro'], es);
    expect(r.scorePct).toBe(100);
    expect(r.transcript).toBe('perro');
  });

  it('Ziffern der Erkennung zählen als Zahlwörter', () => {
    expect(scorePronunciation('Tengo tres gatos', ['tengo 3 gatos'], es).scorePct).toBe(100);
    expect(scorePronunciation('Tengo una hermana', ['tengo 1 hermana'], es).scorePct).toBe(100);
    expect(scorePronunciation('Treinta y dos', ['32'], es).scorePct).toBe(100);
    expect(scorePronunciation('Tenho duas irmãs', ['tenho 2 irmãs'], pt).scorePct).toBe(100);
  });

  it('fehlendes Wort senkt den Wert und wird markiert', () => {
    const r = scorePronunciation('Me llamo Ana', ['me llamo'], es);
    expect(r.scorePct).toBeGreaterThan(50);
    expect(r.scorePct).toBeLessThan(80);
    expect(r.words[2]).toEqual({ text: 'Ana', ok: false });
    expect(r.notes.some((n) => n.includes('nicht erkannt'))).toBe(true);
  });

  it('zusätzliche Wörter kosten nur wenig', () => {
    const r = scorePronunciation('hola', ['hola hola qué tal'], es);
    expect(r.scorePct).toBeGreaterThan(85);
    expect(r.scorePct).toBeLessThan(100);
  });

  it('Wert bleibt immer zwischen 0 und 100', () => {
    for (const t of [['x'], ['perro perro perro perro'], ['   '], ['¿?']]) {
      const s = scorePronunciation('Buenos días', t, es).scorePct;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('foldWord behält ñ bzw. ã/õ/ç', () => {
    expect(foldWord('Mañana', 'es')).toBe('mañana');
    expect(foldWord('Canción', 'es')).toBe('cancion');
    expect(foldWord('Não', 'pt')).toBe('não');
    expect(foldWord('Faço', 'pt')).toBe('faço');
    expect(foldWord('Você', 'pt')).toBe('voce');
  });
});

describe('Spanisch – gleich klingende Schreibungen sind verständlich', () => {
  it('b/v', () => expect(scorePronunciation('vaca', ['baca'], es).scorePct).toBe(100));
  it('ll/y (Yeísmo)', () => expect(scorePronunciation('se cayó', ['se calló'], es).scorePct).toBe(100));
  it('stummes h', () => expect(scorePronunciation('hola', ['ola'], es).scorePct).toBe(100));
  it('Seseo (c/z/s)', () => expect(scorePronunciation('cocer', ['coser'], la).scorePct).toBe(100));
});

describe('Spanisch – Problem-Codes', () => {
  const issuesOf = (target: string, heard: string, lang = 'es-ES', issueCodes?: string[]) =>
    scorePronunciation(target, [heard], { lang, issueCodes });

  it('rr → r erkannt', () => {
    const r = issuesOf('perro', 'pero');
    expect(r.issues).toContain('rr');
    expect(r.words[0]).toEqual({ text: 'perro', ok: false, heard: 'pero' });
    expect(r.notes[0]).toContain('„perro“ wurde als „pero“ verstanden');
    expect(r.scorePct).toBeLessThan(70);
    expect(r.tips[0]).toMatch(/RR/);
  });
  it('r → rr erkannt', () => expect(issuesOf('pero', 'perro').issues).toContain('r'));
  it('R am Wortanfang', () => expect(issuesOf('rosa', 'dosa').issues).toContain('rr'));
  it('ñ → n', () => expect(issuesOf('año', 'ano').issues).toContain('ny'));
  it('j fehlt', () => expect(issuesOf('julio', 'ulio').issues).toContain('j'));
  it('hartes g', () => expect(issuesOf('gato', 'cato').issues).toContain('g'));
  it('ll → l', () => expect(issuesOf('calle', 'cale').issues).toContain('ll-y'));
  it('v wie f', () => expect(issuesOf('vino', 'fino').issues).toContain('b-v'));
  it('c vor i wie k', () => expect(issuesOf('cinco', 'kinko').issues).toContain('c-z'));
  it('h gehaucht', () => expect(issuesOf('hola', 'jola').issues).toContain('h'));
  it('Vokal vertauscht', () => expect(issuesOf('mesa', 'misa').issues).toContain('vowels'));
  it('Betonung bei Einzelwörtern', () => {
    const r = issuesOf('habló', 'hablo');
    expect(r.issues).toContain('stress');
    expect(r.words[0].ok).toBe(false);
    expect(r.scorePct).toBeLessThan(70);
  });
  it('Akzent-Abweichung im Satz ohne Betonungsfokus bleibt ok', () => {
    expect(scorePronunciation('esta casa es bonita', ['está casa es bonita'], es).scorePct).toBe(100);
  });
  it('Variante: Lateinamerika-Tipp für c-z nennt „s“', () => {
    const r = issuesOf('cinco', 'kinko', 'es-MX');
    expect(r.tips.join(' ')).toMatch(/scharfes „s“/);
  });
});

describe('Portugiesisch (Brasilien)', () => {
  const issuesOf = (target: string, heard: string, issueCodes?: string[]) =>
    scorePronunciation(target, [heard], { lang: 'pt-BR', issueCodes });

  it('Nasal -ão', () => expect(issuesOf('não', 'nau').issues).toContain('ao'));
  it('Nasal allgemein', () => expect(issuesOf('bom', 'bo').issues).toContain('nasal'));
  it('lh', () => expect(issuesOf('filho', 'filo').issues).toContain('lh'));
  it('nh', () => expect(issuesOf('vinho', 'vino').issues).toContain('nh'));
  it('r getippt vs. gehaucht', () => expect(issuesOf('caro', 'carro').issues).toContain('r'));
  it('l am Silbenende', () => expect(issuesOf('mal', 'mar').issues).toContain('l-final'));
  it('offen/geschlossen', () => expect(issuesOf('avó', 'avô').issues).toContain('open-closed'));
  it('d/t vor i', () => expect(issuesOf('dia', 'lia').issues).toContain('d-t'));
  it('mal/mau sind in Brasilien gleich', () => expect(scorePronunciation('mal', ['mau'], pt).scorePct).toBe(100));
  it('ganzer Satz korrekt', () => {
    const r = scorePronunciation('Eu não falo português.', ['eu não falo português'], pt);
    expect(r.scorePct).toBe(100);
    expect(r.issues).toEqual([]);
  });
  it('vermutete Codes nur bei passenden Merkmalen', () => {
    const r = scorePronunciation('Eu moro no Brasil', ['eu moro no'], { lang: 'pt-BR', issueCodes: ['l-final', 'lh'] });
    expect(r.issues).toContain('l-final');
    expect(r.issues).not.toContain('lh');
  });
  it('unbekannte Codes werden ignoriert', () => {
    const r = scorePronunciation('filho', [], { lang: 'pt-BR', issueCodes: ['rr', 'lh'] });
    expect(r.issues).toEqual(['lh']);
  });
});
