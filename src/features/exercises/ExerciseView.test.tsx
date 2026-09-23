// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../content/types';
import type { ExerciseOutcome } from '../../engine/grading';
import ExerciseView from './ExerciseView';

const fb = { rule: 'Die **Regel**.', avoid: 'Merke dir das.' };
const base = { skills: ['grammar' as const], feedback: fb };

const ALL: Exercise[] = [
  { ...base, id: 'x.mc', type: 'mc', prompt: 'Was heißt `hola`?', options: [{ text: 'Hallo' }, { text: 'Tschüss' }], answer: 0 },
  { ...base, id: 'x.cloze', type: 'cloze', sentence: 'Me ___ Ana.', answers: [['llamo']] },
  { ...base, id: 'x.clozebank', type: 'cloze', sentence: '___ días, ___.', answers: [['Buenos'], ['señor']], bank: ['Buenos', 'señor', 'Buenas'] },
  { ...base, id: 'x.order', type: 'order', tokens: ['Me', 'llamo', 'Ana'], extra: ['soy'], german: 'Ich heiße Ana.' },
  { ...base, id: 'x.tr', type: 'translate', direction: 'toTarget', source: 'Guten Morgen', answers: ['Buenos días'], bank: ['Buenos', 'días', 'noches'] },
  { ...base, id: 'x.free', type: 'freeText', prompt: 'Stell dich vor.', requirements: [{ pattern: 'me llamo', hint: 'Nenne deinen Namen' }], samples: ['Me llamo Ana.'], minWords: 2 },
  { ...base, id: 'x.lis', type: 'listening', audio: 'Buenos días', question: 'Was hörst du?', options: ['Guten Morgen', 'Gute Nacht'], answer: 0 },
  { ...base, id: 'x.dict', type: 'dictation', audio: 'Hola', answers: ['Hola'], german: 'Hallo' },
  { ...base, id: 'x.speak', type: 'speak', text: 'Hola', german: 'Hallo', phonetic: 'O-la', ipa: 'ˈola' },
  { ...base, id: 'x.mp', type: 'minimalPair', options: ['pero', 'perro'], answer: 1, hint: 'RR rollen.' },
  { ...base, id: 'x.fix', type: 'fixError', sentence: 'Yo soy cansado.', answers: ['Yo estoy cansado.'] },
  { ...base, id: 'x.dlg', type: 'dialogue', lines: [{ speaker: 'Ana', text: '¿Qué tal?' }, { speaker: 'Du', text: 'Bien.' }], gapIndex: 1, options: ['Bien.', 'Adiós.'], answer: 0 },
  { ...base, id: 'x.dlg2', type: 'dialogue', lines: [{ speaker: 'Ana', text: '¿Qué tal?' }, { speaker: 'Du', text: 'Bien.', german: 'Gut.' }], gapIndex: 1, answers: ['Bien'] },
  { ...base, id: 'x.sit', type: 'situation', scenario: 'Du betrittst ein Café.', options: [{ text: 'Buenos días' }, { text: 'Adiós' }], answer: 0 },
  { ...base, id: 'x.img', type: 'imageMatch', pairs: [{ emoji: '🍎', word: 'manzana' }, { emoji: '🐱', word: 'gato' }] },
  { ...base, id: 'x.pairs', type: 'matchPairs', pairs: [{ left: 'hola', right: 'hallo' }, { left: 'adiós', right: 'tschüss' }] },
  { ...base, id: 'x.conj', type: 'conjugate', verb: 'hablar', tense: 'Präsens', person: 'yo', answers: ['hablo'], sentence: 'Yo ___ español.' },
  { ...base, id: 'x.sfree', type: 'speakFree', prompt: 'Wie heißt du?', keywords: ['llamo'], minMatch: 1, sample: 'Me llamo Ana.' },
  { ...base, id: 'x.ai', type: 'aiChat', scenarioId: 'es.sc.alltag', goal: 'Begrüße jemanden.', turns: 2 },
];

function renderEx(exercise: Exercise, extra: { examMode?: boolean } = {}) {
  const onDone = vi.fn<(o: ExerciseOutcome) => void>();
  const utils = render(
    <MemoryRouter>
      <ExerciseView exercise={exercise} courseId="es" variant="es-ES" context="lesson" onDone={onDone} {...extra} />
    </MemoryRouter>,
  );
  return { ...utils, onDone };
}

afterEach(() => cleanup());

describe('ExerciseView', { timeout: 15_000 }, () => {
  it.each(ALL.map((e) => [e.type + ' ' + e.id, e] as const))('rendert %s', async (_n, exercise) => {
    renderEx(exercise);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });

  it('mc: Prüfen erst nach Auswahl, falsche Antwort zeigt 5-teilige Erklärung, Weiter meldet Ergebnis', () => {
    const { onDone } = renderEx(ALL[0]);
    const check = screen.getByRole('button', { name: 'Prüfen' }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: /Tschüss/ }));
    expect(check.disabled).toBe(false);
    fireEvent.click(check);
    for (const t of ['Was war falsch', 'Warum', 'Regel', 'Richtige Lösung', 'So vermeidest du den Fehler']) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone.mock.calls[0][0].correct).toBe(false);
  });

  it('cloze: Enter im Feld prüft, richtige Antwort', () => {
    const { onDone } = renderEx(ALL[1]);
    const input = screen.getByLabelText('Lücke 1');
    fireEvent.change(input, { target: { value: 'llamo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));
    expect(onDone.mock.calls[0][0].correct).toBe(true);
  });

  it('order: Kacheln bauen den Satz', () => {
    const { onDone } = renderEx(ALL[3]);
    for (const w of ['Me', 'llamo', 'Ana']) fireEvent.click(screen.getByRole('button', { name: `„${w}“ hinzufügen` }));
    fireEvent.click(screen.getByRole('button', { name: 'Prüfen' }));
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));
    expect(onDone.mock.calls[0][0].correct).toBe(true);
  });

  it('matchPairs: Paare rasten ein und prüfen sich selbst', () => {
    vi.useFakeTimers();
    try {
      const { onDone } = renderEx(ALL[15]);
      fireEvent.click(screen.getByRole('button', { name: 'hola' }));
      fireEvent.click(screen.getByRole('button', { name: 'hallo' }));
      fireEvent.click(screen.getByRole('button', { name: 'adiós' }));
      fireEvent.click(screen.getByRole('button', { name: 'tschüss' }));
      act(() => { vi.advanceTimersByTime(500); });
      fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));
      expect(onDone.mock.calls[0][0].correct).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('examMode: Abgeben ohne Auflösung', () => {
    const { onDone } = renderEx(ALL[0], { examMode: true });
    fireEvent.click(screen.getByRole('radio', { name: /Tschüss/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Abgeben' }));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Was war falsch')).toBeNull();
  });
});
