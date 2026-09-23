import { describe, expect, it } from 'vitest';
import type { SrsCard } from '../../core/types';
import { gradeText } from '../../engine/grading';
import { acceptedAnswers, cardStats, dueLabel, filterCards, gradeForText, pickPractice, sourceGroup } from './vocabUtils';

const now = new Date('2026-09-21T12:00:00Z');
const card = (p: Partial<SrsCard> & { itemId: string }): SrsCard => ({
  courseId: 'es', kind: 'vocab', front: p.itemId, back: 'x', source: { type: 'lesson' }, ease: 2.5, intervalDays: 0, reps: 0, lapses: 0,
  dueAt: '2026-09-20T12:00:00Z', createdAt: '2026-09-01T00:00:00Z', ...p,
});

describe('acceptedAnswers', () => {
  it('akzeptiert Varianten und ignoriert Klammerzusätze', () => {
    expect(acceptedAnswers('Encantado. / Encantada.')).toEqual(['Encantado. / Encantada.', 'Encantado.', 'Encantada.']);
    expect(acceptedAnswers('hablar (con)')).toEqual(['hablar (con)', 'hablar']);
    expect(gradeText('encantada', acceptedAnswers('Encantado. / Encantada.')).correct).toBe(true);
  });
});

describe('gradeForText', () => {
  it('ordnet Texteingaben SRS-Noten zu', () => {
    expect(gradeForText({ correct: true, typo: false, accentOnly: false })).toBe(2);
    expect(gradeForText({ correct: true, typo: false, accentOnly: true })).toBe(1);
    expect(gradeForText({ correct: true, typo: true, accentOnly: false })).toBe(1);
    expect(gradeForText({ correct: false, typo: false, accentOnly: false })).toBe(0);
  });
});

describe('Statistik, Filter, Fälligkeit', () => {
  const cards = [
    card({ itemId: 'hola', front: 'hola', back: 'hallo' }),
    card({ itemId: 'casa', front: 'la casa', back: 'das Haus', reps: 3, intervalDays: 30, dueAt: '2026-10-21T12:00:00Z', source: { type: 'song', label: 'Canción' } }),
    card({ itemId: 'u1', front: 'el árbol', back: 'der Baum', reps: 1, intervalDays: 1, dueAt: '2026-09-22T12:00:00Z', source: { type: 'user' } }),
    card({ itemId: 'p', front: 'perro', back: 'Hund', suspended: true, source: { type: 'error' } }),
    card({ itemId: 'g', front: 'ser', back: 'sein', source: { type: 'grammar' }, reps: 2 }),
  ];

  it('zählt gesamt, fällig, gelernt, gefestigt und Quellen', () => {
    const st = cardStats(cards, now);
    expect(st).toMatchObject({ total: 5, due: 2, fresh: 1, learned: 3, mature: 1, suspended: 1 });
    expect(st.bySource).toEqual({ lesson: 1, song: 1, user: 1, error: 1, other: 1 });
    expect(st.nextDueAt).toBe('2026-09-22T12:00:00Z');
  });

  it('filtert nach Quelle, Status und Suche (akzenttolerant)', () => {
    expect(filterCards(cards, '', 'due', now).map((c) => c.itemId)).toEqual(['hola', 'g']);
    expect(filterCards(cards, '', 'song', now).map((c) => c.itemId)).toEqual(['casa']);
    expect(filterCards(cards, '', 'suspended', now).map((c) => c.itemId)).toEqual(['p']);
    expect(filterCards(cards, 'arbol', 'all', now).map((c) => c.itemId)).toEqual(['u1']);
    expect(filterCards(cards, 'haus', 'all', now).map((c) => c.itemId)).toEqual(['casa']);
    expect(sourceGroup(cards[4])).toBe('other');
  });

  it('beschreibt die Fälligkeit', () => {
    expect(dueLabel(cards[0], now)).toBe('Neu');
    expect(dueLabel(cards[4], now)).toBe('Fällig');
    expect(dueLabel(cards[2], now)).toBe('morgen');
    expect(dueLabel(cards[3], now)).toBe('Pausiert');
    expect(dueLabel(cards[1], now)).toMatch(/^in /);
  });

  it('wählt für freies Üben aktive Karten, lange nicht gesehen zuerst', () => {
    const list = pickPractice([
      card({ itemId: 'a', lastReviewedAt: '2026-09-20T00:00:00Z' }),
      card({ itemId: 'b', lastReviewedAt: '2026-09-01T00:00:00Z' }),
      card({ itemId: 'c', suspended: true }),
    ], 5);
    expect(list.map((c) => c.itemId)).toEqual(['b', 'a']);
  });
});
