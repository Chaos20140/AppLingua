// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../../content/types';
import type { ExerciseOutcome } from '../../engine/grading';
import type { SessionOptions } from './contract';
import { applyAnswer, filterByVariant, initSession, summarize } from './sessionLogic';

const { recordAnswer } = vi.hoisted(() => ({
  recordAnswer: vi.fn((input: { combo?: number; awardXp?: boolean; outcome: { correct: boolean } }) => ({
    answerId: 'a', xp: input.outcome.correct && input.awardXp !== false ? 10 + (input.combo ?? 0) : 0, levelUp: null, error: null, newBadges: [],
  })),
}));
vi.mock('../../state/actions', () => ({ recordAnswer }));

const { useExerciseSession } = await import('./useExerciseSession');

const fb = { rule: 'Regel' };
const mc = (id: string, extra: Partial<Exercise> = {}): Exercise =>
  ({ id, type: 'mc', skills: ['grammar'], feedback: fb, prompt: 'P', options: [{ text: 'a' }, { text: 'b' }], answer: 0, ...extra }) as Exercise;
const ok = (score = 1): ExerciseOutcome => ({ correct: true, score, accentOnly: false, userAnswer: 'a', expected: 'a', durationMs: 1000 });
const bad = (score = 0): ExerciseOutcome => ({ correct: false, score, accentOnly: false, userAnswer: 'b', expected: 'a', durationMs: 1000 });

const base = (exercises: Exercise[], extra: Partial<SessionOptions> = {}): SessionOptions => ({
  courseId: 'es', variant: 'es-ES', context: 'lesson', refId: 'es.s0.l01', exercises, ...extra,
});

beforeEach(() => { recordAnswer.mockClear(); });

describe('sessionLogic', () => {
  it('filtert abweichende Varianten', () => {
    const list = [mc('a'), mc('b', { variant: 'es-LA' }), mc('c', { variant: 'es-ES' })];
    expect(filterByVariant(list, 'es-ES').map((e) => e.id)).toEqual(['a', 'c']);
  });

  it('zählt Kombo, Bestkombo, XP und Teilpunkte', () => {
    const list = [mc('a', { skills: ['grammar', 'reading'] }), mc('b'), mc('c', { skills: ['vocabulary'] }), mc('d')];
    let s = initSession(list, 'k', 0);
    s = applyAnswer(s, ok(), 10, { now: 1 });
    s = applyAnswer(s, ok(), 11, { now: 2 });
    s = applyAnswer(s, bad(0.5), 0, { now: 3 });
    expect(s.combo).toBe(0);
    s = applyAnswer(s, ok(), 10, { now: 42_000 });
    expect(s.finishedAt).toBe(42_000);
    const sum = summarize(s);
    expect(sum.bestCombo).toBe(2);
    expect(sum.xp).toBe(31);
    expect(sum.correct).toBe(3);
    expect(sum.scorePct).toBe(88); // (1+1+0.5+1)/4
    expect(sum.perSkill).toEqual({ grammar: 100, reading: 100, vocabulary: 50 });
    expect(sum.mistakes.map((m) => m.exercise.id)).toEqual(['c']);
    expect(sum.durationSec).toBe(42);
  });

  it('stellt falsche Übungen einmal erneut, ohne die Punktzahl zu verbessern', () => {
    let s = initSession([mc('a'), mc('b')], 'k', 0);
    s = applyAnswer(s, bad(), 0, { retryWrong: true, now: 1 });
    s = applyAnswer(s, ok(), 10, { retryWrong: true, now: 2 });
    expect(s.queue.map((e) => e.id)).toEqual(['a', 'b', 'a']);
    expect(s.finishedAt).toBeNull();
    s = applyAnswer(s, bad(), 0, { retryWrong: true, now: 3 });
    expect(s.queue).toHaveLength(3); // nur eine Wiederholung
    expect(s.finishedAt).toBe(3);
    const sum = summarize(s);
    expect(sum.total).toBe(2);
    expect(sum.correct).toBe(1);
    expect(sum.scorePct).toBe(50);
    expect(sum.results).toHaveLength(3);
  });

  it('leere Liste ist sofort beendet', () => {
    const s = initSession([], 'k', 5);
    expect(s.finishedAt).toBe(5);
    expect(summarize(s).scorePct).toBe(0);
  });
});

describe('useExerciseSession', () => {
  it('speichert jede Antwort mit Kombo und vergibt XP', () => {
    const list = [mc('a'), mc('b', { variant: 'es-LA' }), mc('c'), mc('d')];
    const { result } = renderHook(() => useExerciseSession(base(list)));
    expect(result.current.total).toBe(3);
    expect(result.current.current?.id).toBe('a');

    act(() => result.current.submit(ok()));
    act(() => result.current.submit(ok()));
    expect(recordAnswer).toHaveBeenCalledTimes(2);
    expect(recordAnswer.mock.calls[1][0]).toMatchObject({ combo: 2, awardXp: true, context: 'lesson', refId: 'es.s0.l01' });
    expect(result.current.combo).toBe(2);
    expect(result.current.xp).toBe(23);
    expect(result.current.current?.id).toBe('d');

    act(() => result.current.submit(bad()));
    expect(result.current.finished).toBe(true);
    expect(result.current.current).toBeNull();
    expect(result.current.summary).toMatchObject({ total: 3, correct: 2, bestCombo: 2, xp: 23, scorePct: 67 });

    // weitere Aufrufe nach dem Ende werden ignoriert
    act(() => result.current.submit(ok()));
    expect(recordAnswer).toHaveBeenCalledTimes(3);
  });

  it('vergibt in Prüfungen standardmäßig keine XP', () => {
    const { result } = renderHook(() => useExerciseSession(base([mc('a')], { context: 'exam' })));
    act(() => result.current.submit(ok()));
    expect(recordAnswer.mock.calls[0][0]).toMatchObject({ awardXp: false });
    expect(result.current.summary?.xp).toBe(0);
  });

  it('Wiederholungsrunde und Neustart', () => {
    const { result } = renderHook(() => useExerciseSession(base([mc('a'), mc('b')], { retryWrong: true })));
    act(() => result.current.submit(bad()));
    act(() => result.current.submit(ok()));
    expect(result.current.total).toBe(3);
    expect(result.current.current?.id).toBe('a');
    act(() => result.current.submit(ok()));
    expect(result.current.finished).toBe(true);
    expect(result.current.summary?.mistakes).toHaveLength(1);

    act(() => result.current.restart());
    expect(result.current.finished).toBe(false);
    expect(result.current.total).toBe(2);
    expect(result.current.index).toBe(0);
    expect(result.current.xp).toBe(0);
  });

  it('beginnt neu, wenn sich die Übungsliste ändert', () => {
    const { result, rerender } = renderHook((p: SessionOptions) => useExerciseSession(p), { initialProps: base([mc('a'), mc('b')]) });
    act(() => result.current.submit(ok()));
    expect(result.current.index).toBe(1);
    rerender(base([mc('x'), mc('y'), mc('z')]));
    expect(result.current.index).toBe(0);
    expect(result.current.total).toBe(3);
    expect(result.current.current?.id).toBe('x');
  });

  it('bleibt stabil bei neuer Array-Identität mit gleichen IDs', () => {
    const { result, rerender } = renderHook((p: SessionOptions) => useExerciseSession(p), { initialProps: base([mc('a'), mc('b')]) });
    act(() => result.current.submit(ok()));
    rerender(base([mc('a'), mc('b')]));
    expect(result.current.index).toBe(1);
  });
});
