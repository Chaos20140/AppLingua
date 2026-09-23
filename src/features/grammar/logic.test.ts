import { describe, expect, it } from 'vitest';
import type { Exercise, GrammarTopic } from '../../content/types';
import { groupTopics, levelInfos, masteryLabel, recommendTopic, searchTopics, solvedExerciseIds } from './logic';

const ex = (id: string, variant?: Exercise['variant']): Exercise => ({
  id, type: 'mc', skills: ['grammar'], prompt: 'x', options: [{ text: 'a' }, { text: 'b' }], answer: 0, feedback: { rule: 'r' }, variant,
});

const topic = (id: string, over: Partial<GrammarTopic> = {}): GrammarTopic => ({
  id, courseId: 'es', stageId: 'stage0', order: 1, category: 'Verben', title: id, summary: '', keywords: [],
  explanation: [], examples: [], germanComparison: [], mistakes: [], mnemonic: '', levels: [], ...over,
});

const T = [
  topic('es.g.ser', { title: 'Ser – wer du bist', order: 5, keywords: ['sein', 'soy'], examples: [{ target: 'Soy de Alemania.', german: 'Ich komme aus Deutschland.' }] }),
  topic('es.g.estar', { title: 'Estar – wie und wo', order: 6, summary: 'Zustand und Ort' }),
  topic('es.g.articles', { title: 'Artikel', order: 8, category: 'Artikel & Nomen', keywords: ['el', 'la'] }),
  topic('es.g.gustar', { title: 'Gustar', stageId: 'a1', order: 1, summary: 'Me gusta el café – Vorlieben ausdrücken' }),
];

describe('searchTopics', () => {
  it('findet akzent- und groß/kleinunabhängig in Titel, Keywords, Beispielen', () => {
    expect(searchTopics(T, 'SOY').map((t) => t.id)).toEqual(['es.g.ser']);
    expect(searchTopics(T, 'alemania').map((t) => t.id)).toEqual(['es.g.ser']);
    expect(searchTopics(T, 'cafe').map((t) => t.id)).toEqual(['es.g.gustar']);
    expect(searchTopics(T, 'Café').map((t) => t.id)).toEqual(['es.g.gustar']);
  });
  it('verlangt alle Wörter und sortiert Titeltreffer nach vorn', () => {
    expect(searchTopics(T, 'zustand ort').map((t) => t.id)).toEqual(['es.g.estar']);
    expect(searchTopics(T, 'zustand xyz')).toEqual([]);
    const r = searchTopics([topic('a', { title: 'Zahlen', summary: 'Artikel' }), topic('b', { title: 'Artikel' })], 'artikel');
    expect(r.map((t) => t.id)).toEqual(['b', 'a']);
  });
  it('leere Suche liefert alles', () => {
    expect(searchTopics(T, '  ')).toHaveLength(4);
  });
});

describe('groupTopics', () => {
  it('gruppiert nach Etappe und Kategorie in Lernpfad-Reihenfolge', () => {
    const g = groupTopics([T[3], T[2], T[1], T[0]]);
    expect(g.map((x) => x.stageId)).toEqual(['stage0', 'a1']);
    expect(g[0].categories.map((c) => c.category)).toEqual(['Verben', 'Artikel & Nomen']);
    expect(g[0].categories[0].topics.map((t) => t.id)).toEqual(['es.g.ser', 'es.g.estar']);
    expect(g[0].count).toBe(3);
  });
});

describe('levelInfos', () => {
  const levels: GrammarTopic['levels'] = [
    { level: 2, title: 'B', exercises: [ex('t.L2.01'), ex('t.L2.02')] },
    { level: 1, title: 'A', exercises: [ex('t.L1.01'), ex('t.L1.02'), ex('t.L1.03'), ex('t.L1.04'), ex('t.L1.05', 'es-LA')] },
    { level: 3, title: 'C', exercises: [ex('t.L3.01')] },
  ];
  it('markiert abgeschlossen (≥ 80 %) und die erste offene als empfohlen', () => {
    const solved = solvedExerciseIds([
      { exerciseId: 't.L1.01', correct: true }, { exerciseId: 't.L1.02', correct: true },
      { exerciseId: 't.L1.03', correct: true }, { exerciseId: 't.L1.04', correct: false },
      { exerciseId: 't.L1.04', correct: true },
    ]);
    const info = levelInfos(levels, solved, 'es-ES');
    expect(info.map((i) => i.level)).toEqual([1, 2, 3]);
    expect(info[0]).toMatchObject({ state: 'done', solved: 4, total: 4 });
    expect(info[1].state).toBe('recommended');
    expect(info[2].state).toBe('open');
  });
  it('zählt Übungen anderer Varianten nicht mit', () => {
    const info = levelInfos(levels, new Set(), 'es-LA');
    expect(info[0].total).toBe(5);
    expect(info[0].state).toBe('recommended');
  });
});

describe('recommendTopic', () => {
  it('liefert das schwächste Thema mit genug Belegen', () => {
    const r = recommendTopic(T, { 'es.g.ser': { mastery: 40, evidence: 5 }, 'es.g.estar': { mastery: 20, evidence: 2 }, 'es.g.articles': { mastery: 55, evidence: 4 } });
    expect(r).toMatchObject({ kind: 'weak', mastery: 40 });
    expect(r && r.topic.id).toBe('es.g.ser');
  });
  it('fällt auf das nächste unbearbeitete Thema zurück', () => {
    const r = recommendTopic(T, { 'es.g.ser': { mastery: 90, evidence: 6 } });
    expect(r).toMatchObject({ kind: 'next' });
    expect(r && r.topic.id).toBe('es.g.estar');
  });
  it('null, wenn alles bearbeitet und nichts schwach ist', () => {
    const all = Object.fromEntries(T.map((t) => [t.id, { mastery: 95, evidence: 5 }]));
    expect(recommendTopic(T, all)).toBeNull();
  });
});

describe('masteryLabel', () => {
  it('ordnet ein', () => {
    expect(masteryLabel(undefined).label).toBe('Neu');
    expect(masteryLabel({ mastery: 90, evidence: 1 }).label).toBe('Begonnen');
    expect(masteryLabel({ mastery: 90, evidence: 5 }).tone).toBe('success');
    expect(masteryLabel({ mastery: 30, evidence: 5 }).tone).toBe('danger');
  });
});
