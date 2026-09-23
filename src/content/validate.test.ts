import { describe, expect, it } from 'vitest';
import type { CourseContent, Exercise, Song } from './types';
import { COURSE, SONG } from '../engine/__fixtures__/course';
import { loadCourse, loadSongs } from './registry';
import { validateCourse, validateSongs } from './validate';

const clone = <T,>(x: T): T => structuredClone(x);

describe('Validator (Testkurs)', () => {
  it('gültiger Kurs und Song ohne Fehler', () => {
    expect(validateCourse(COURSE)).toEqual([]);
    expect(validateSongs([SONG], { es: COURSE })).toEqual([]);
  });
  it('erkennt kaputte Inhalte', () => {
    const c: CourseContent = clone(COURSE);
    const l = c.lessons[0];
    const mc = l.guided[0] as Extract<Exercise, { type: 'mc' }>;
    mc.answer = 5;
    const cloze = l.guided[1] as Extract<Exercise, { type: 'cloze' }>;
    cloze.answers = [['soy']];
    l.application.push({ ...l.application[0] }); // doppelte ID
    l.topicIds.push('es.g.gibt-es-nicht');
    l.pronunciation.push('es.p.fehlt');
    c.lessons[1].chapterId = 'es.s0.c2';
    c.stages[0].bossExamId = 'es.exam.s0.mid';
    const order = c.lessons[0].application[0] as Extract<Exercise, { type: 'order' }>;
    order.extra = ['Ana'];
    c.lessons[3].application[0] = { ...(c.lessons[3].application[0] as Extract<Exercise, { type: 'aiChat' }>), scenarioId: 'es.sc.nix' };
    const errors = validateCourse(c).join('\n');
    expect(errors).toContain('answer-Index 5');
    expect(errors).toContain('1 Antwortlisten');
    expect(errors).toContain('Doppelte ID „es.s0.l01.a01“');
    expect(errors).toContain('topicId „es.g.gibt-es-nicht“');
    expect(errors).toContain('Aussprache-Element „es.p.fehlt“');
    expect(errors).toContain('chapterId es.s0.c2 ≠ Kapitel es.s0.c1');
    expect(errors).toContain('erwartet boss');
    expect(errors).toContain('Ablenker „Ana“');
    expect(errors).toContain('scenarioId „es.sc.nix“');
  });
  it('erkennt unerfüllbare freie Aufgaben', () => {
    const c: CourseContent = clone(COURSE);
    const free = c.lessons[1].application[0] as Extract<Exercise, { type: 'freeText' }>;
    free.samples = ['Hola'];
    free.requirements.push({ pattern: '(', hint: 'kaputt' });
    const errors = validateCourse(c).join('\n');
    expect(errors).toContain('ungültiges Muster');
    expect(errors).toContain('es.s0.l02.a01: Musterlösung wird von der Bewertung nicht als richtig erkannt');
  });
  it('erkennt Song-Fehler (Zeiten, Tokens, Glossar, Tags)', () => {
    const s: Song = clone(SONG);
    s.lines[1].startMs = 1000;
    s.lines[1].tokens = s.lines[1].tokens.slice(1);
    s.lines[0].tokens[1].g = 'fehlt';
    s.grammarTags = ['es.g.nix'];
    const errors = validateSongs([s, clone(SONG)], { es: COURSE }).join('\n');
    expect(errors).toContain('überlappt');
    expect(errors).toContain('Tokens ergeben nicht den Text');
    expect(errors).toContain('Glossar-Schlüssel „fehlt“');
    expect(errors).toContain('grammarTag „es.g.nix“');
    expect(errors).toContain('doppelte ID');
  });
});

// Echte Inhalte: Laden + Prüfen aller Lektionen dauert unter CPU-Last (volle Suite, E2E parallel)
// deutlich länger als die 5-s-Standardgrenze → eigenes Timeout.
describe('Kursinhalte', { timeout: 30_000 }, () => {
  it('Spanisch ist konsistent', async () => {
    const es = await loadCourse('es');
    expect(validateCourse(es)).toEqual([]);
  });
  it('Portugiesisch ist konsistent', async () => {
    const pt = await loadCourse('pt-BR');
    expect(validateCourse(pt)).toEqual([]);
  });
  it('Songs sind konsistent', async () => {
    const [es, pt, songs] = await Promise.all([loadCourse('es'), loadCourse('pt-BR'), loadSongs()]);
    expect(songs.length).toBeGreaterThan(0);
    expect(validateSongs(songs, { es, 'pt-BR': pt })).toEqual([]);
  });
});
