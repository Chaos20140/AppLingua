import { describe, expect, it } from 'vitest';
import type { PronAttempt } from '../../core/types';
import type { PronItem } from '../../content/types';
import { aggregateIssues, categoryForIssue, issueLabel, pickPairRound, recentAttempts, statsByItem } from './issues';

const att = (itemId: string, at: string, scorePct: number, issues: string[] = [], courseId: PronAttempt['courseId'] = 'es'): PronAttempt => ({
  at, courseId, itemId, context: 'pronunciation', target: itemId, method: 'speech-recognition', scorePct, issues,
});

const item = (id: string, categoryId: string, issueCodes: string[]): PronItem => ({
  id, courseId: 'es', categoryId, text: id, german: '', helper: '', ipa: '', syllables: [id], stress: 0, mouth: '',
  mistakes: [], tips: [], issueCodes, level: 1,
});

describe('statsByItem', () => {
  it('bester, letzter Wert und Anzahl je Item, nur aktueller Kurs', () => {
    const m = statsByItem([
      att('perro', '2026-09-01T10:00:00Z', 40, ['rr']),
      att('perro', '2026-09-03T10:00:00Z', 90),
      att('perro', '2026-09-02T10:00:00Z', 60, ['rr']),
      att('pão', '2026-09-02T10:00:00Z', 30, ['nasal'], 'pt-BR'),
    ], 'es');
    expect(m.size).toBe(1);
    expect(m.get('perro')).toMatchObject({ attempts: 3, best: 90, last: 90, lastIssues: [] });
  });
});

describe('aggregateIssues', () => {
  it('zählt nur Probleme des jeweils letzten Versuchs je Item', () => {
    const list = [
      att('perro', '2026-09-01T10:00:00Z', 40, ['rr']),
      att('perro', '2026-09-03T10:00:00Z', 95),
      att('carro', '2026-09-04T10:00:00Z', 50, ['rr']),
      att('jamon', '2026-09-04T11:00:00Z', 50, ['j', 'stress']),
      att('gente', '2026-09-05T11:00:00Z', 45, ['j']),
    ];
    const r = aggregateIssues(list, 'es');
    expect(r.map((x) => [x.code, x.items])).toEqual([['j', 2], ['stress', 1], ['rr', 1]]);
    expect(r[2].itemIds).toEqual(['carro']);
    expect(aggregateIssues(list, 'es', 1)).toHaveLength(1);
    expect(aggregateIssues(list, 'pt-BR')).toEqual([]);
  });
});

describe('categoryForIssue', () => {
  it('wählt die Kategorie mit den meisten passenden Items', () => {
    const items = [item('a', 'es.pc.r', ['rr']), item('b', 'es.pc.r', ['rr', 'r']), item('c', 'es.pc.syllables', ['rr'])];
    expect(categoryForIssue('rr', items)).toBe('es.pc.r');
    expect(categoryForIssue('nasal', items)).toBeNull();
  });
});

describe('recentAttempts / labels / pickPairRound', () => {
  it('neueste zuerst und begrenzt', () => {
    const list = [att('x', '2026-09-01T00:00:00Z', 10), att('x', '2026-09-03T00:00:00Z', 30), att('x', '2026-09-02T00:00:00Z', 20), att('y', '2026-09-04T00:00:00Z', 1)];
    expect(recentAttempts(list, 'x', 'es', 2).map((a) => a.scorePct)).toEqual([30, 20]);
  });
  it('deutsche Bezeichnungen je Sprache', () => {
    expect(issueLabel('rr', 'es')).toBe('Gerolltes rr');
    expect(issueLabel('r', 'pt-BR')).toBe('R-Laute');
    expect(issueLabel('unbekannt', 'es')).toBe('unbekannt');
  });
  it('zieht ein Paar und eine Lösung', () => {
    const seq = [0.9, 0.2];
    const r = pickPairRound([['pero', 'perro'], ['caro', 'carro']], () => seq.shift() ?? 0);
    expect(r).toEqual({ pair: ['caro', 'carro'], answer: 0 });
    expect(pickPairRound([])).toBeNull();
  });
});
