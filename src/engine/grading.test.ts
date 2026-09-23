import { describe, expect, it } from 'vitest';
import type { Exercise, ExerciseType } from '../content/types';
import { EXERCISES as E } from './__fixtures__/course';
import {
  DEFAULT_INSTRUCTIONS, canonicalAnswer, explainMistake, exercisePrompt, expectedText, fillGaps, gradeExercise, gradeText, speechSimilarity,
} from './grading';

describe('gradeText', () => {
  it('exakt und normalisiert (Satzzeichen, Groß/Klein, Leerzeichen)', () => {
    expect(gradeText('  soy   ESTUDIANTE ', ['Soy estudiante.'])).toMatchObject({ correct: true, accentOnly: false, typo: false, score: 1 });
    expect(gradeText('¿como estas?', ['¿Cómo estás?']).correct).toBe(true);
  });
  it('Akzent-Toleranz: richtig mit Hinweis, außer strictAccents', () => {
    const lenient = gradeText('como estas', ['¿Cómo estás?']);
    expect(lenient).toMatchObject({ correct: true, accentOnly: true });
    expect(lenient.hint).toContain('Akzent');
    const strict = gradeText('como estas', ['¿Cómo estás?'], { strictAccents: true });
    expect(strict).toMatchObject({ correct: false, accentOnly: true });
    expect(gradeText('espanol', ['español']).accentOnly).toBe(true);
  });
  it('kleine Tippfehler bei langen Wörtern → richtig mit Hinweis', () => {
    const r = gradeText('Soy estudiente', ['Soy estudiante']);
    expect(r).toMatchObject({ correct: true, typo: true });
    expect(r.hint).toContain('Tippfehler');
  });
  it('keine Toleranz bei kurzen Wörtern, Endungen oder mehreren Fehlern', () => {
    expect(gradeText('pero', ['perro']).correct).toBe(false); // < 6 Zeichen
    expect(gradeText('ella tiene', ['ella tienes']).correct).toBe(false); // Endung
    expect(gradeText('estudiantes', ['estudiante']).correct).toBe(false); // Plural-Endung
    expect(gradeText('estudiente profesr', ['estudiante profesor']).correct).toBe(false); // zwei Fehler bei 2 Wörtern
    expect(gradeText('Soy estudiente', ['Soy estudiante'], { allowTypos: false }).correct).toBe(false);
  });
  it('leere Eingabe und nächstliegende Lösung', () => {
    expect(gradeText('', ['hola']).correct).toBe(false);
    expect(gradeText('yo soy', ['Estoy bien', 'Yo soy Ana']).matched).toBe('Yo soy Ana');
  });
});

describe('gradeExercise – jeder Übungstyp', () => {
  const types = Object.keys(E) as ExerciseType[];

  it.each(types)('%s: Musterlösung ist richtig', (t) => {
    const ex = E[t];
    const out = gradeExercise(ex, canonicalAnswer(ex), { strictAccents: true, durationMs: 1234 });
    expect(out.correct).toBe(true);
    expect(out.score).toBeGreaterThan(0.5);
    expect(out.durationMs).toBe(1234);
    expect(out.explanation).toBeUndefined();
    expect(expectedText(ex)).toBe(out.expected);
    expect(exercisePrompt(ex).length).toBeGreaterThan(0);
    expect(DEFAULT_INSTRUCTIONS[t]).toBeTruthy();
  });

  it.each(types)('%s: leere/ungültige Antwort ist falsch und erklärt', (t) => {
    const out = gradeExercise(E[t], null);
    expect(out.correct).toBe(false);
    const x = out.explanation!;
    for (const k of ['what', 'why', 'rule', 'correct', 'avoid'] as const) expect(x[k].length).toBeGreaterThan(0);
  });

  it('mc: falsche Option nutzt deren Begründung', () => {
    const out = gradeExercise(E.mc, 1);
    expect(out).toMatchObject({ correct: false, userAnswer: 'adiós', expected: 'hola' });
    expect(out.explanation!.what).toContain('adiós');
    expect(out.explanation!.why).toContain('tschüss');
    expect(out.explanation!.rule).toBe('Testregel.');
  });
  it('listening, minimalPair, situation, dialogue (Auswahl)', () => {
    expect(gradeExercise(E.listening, 0).correct).toBe(true);
    expect(gradeExercise(E.minimalPair, 0).explanation!.what).toContain('gesprochen wurde');
    expect(gradeExercise(E.situation, 1).explanation!.why).toBe('Das sagt man abends.');
    expect(gradeExercise(E.dialogue, 0).correct).toBe(true);
    expect(gradeExercise(E.dialogue, '¡hola').correct).toBe(true); // freie Eingabe als Fallback
  });
  it('dialogue mit freier Antwort', () => {
    const ex: Exercise = { id: 'd', type: 'dialogue', skills: ['speaking'], feedback: { rule: 'r' }, lines: [{ speaker: 'A', text: '¿Qué tal?' }, { speaker: 'B', text: '' }], gapIndex: 1, answers: ['Bien, gracias.'] };
    expect(gradeExercise(ex, 'bien gracias').correct).toBe(true);
    expect(gradeExercise(ex, 'mal').correct).toBe(false);
  });
  it('cloze: je Lücke bewertet, Teilpunkte und Akzent-Toleranz', () => {
    expect(gradeExercise(E.cloze, ['soy', 'eres']).correct).toBe(true);
    const half = gradeExercise(E.cloze, ['soy', 'es']);
    expect(half).toMatchObject({ correct: false, score: 0.5, parts: [true, false] });
    expect(half.explanation!.what).toContain('Lücke 2');
    expect(half.explanation!.what).toContain('`eres` statt `es`');
    expect(half.userAnswer).toBe('Yo soy estudiante y tú es profesor.');
    const single: Exercise = { id: 'c', type: 'cloze', skills: ['grammar'], feedback: { rule: 'r' }, sentence: 'Tomo un ___.', answers: [['café']] };
    expect(gradeExercise(single, 'cafe')).toMatchObject({ correct: true, accentOnly: true });
    expect(gradeExercise(single, 'cafe').hint).toContain('`café`');
    const strict = gradeExercise(single, 'cafe', { strictAccents: true });
    expect(strict).toMatchObject({ correct: false, accentOnly: true });
    expect(strict.explanation!.what).toContain('Akzente');
    expect(fillGaps('a ___ b ___', ['x'])).toBe('a x b ___');
  });
  it('order: Reihenfolge, Alternativen, Teilpunkte', () => {
    expect(gradeExercise(E.order, ['me', 'llamo', 'Ana', '.']).correct).toBe(true);
    const wrong = gradeExercise(E.order, ['Ana', 'me', 'llamo', '.']);
    expect(wrong.correct).toBe(false);
    expect(wrong.explanation!.what).toContain('Ab Wort 1');
    const alt: Exercise = { ...E.order, alternatives: [['Ana', 'me', 'llamo', '.']] } as Exercise;
    expect(gradeExercise(alt, ['Ana', 'me', 'llamo', '.']).correct).toBe(true);
    // Kacheln mit Satzzeichen in anderer Reihenfolge: Anzeige der redaktionellen Fassung
    const q: Exercise = { ...E.order, tokens: ['De', 'onde', 'você', 'é?'], alternatives: [['Você', 'é', 'de', 'onde?']] } as Exercise;
    const r = gradeExercise(q, ['você', 'é?', 'De', 'onde']);
    expect(r.correct).toBe(true);
    expect(r.userAnswer).toBe('Você é de onde?');
    expect(gradeExercise(q, ['onde', 'De', 'você', 'é?']).userAnswer).toBe('onde De você é?');
  });
  it('translate: Varianten, Akzente, Tippfehler, Diff-Erklärung', () => {
    expect(gradeExercise(E.translate, 'yo soy estudiante').correct).toBe(true);
    expect(gradeExercise(E.translate, 'Soy estudiente')).toMatchObject({ correct: true, typo: true });
    const out = gradeExercise(E.translate, 'Estoy estudiante');
    expect(out.correct).toBe(false);
    expect(out.explanation!.what).toContain('`Soy` statt `Estoy`');
    const toGerman: Exercise = { id: 't', type: 'translate', skills: ['reading'], feedback: { rule: 'r' }, direction: 'toGerman', source: 'Hola', answers: ['Hallo'] };
    expect(gradeExercise(toGerman, 'hallo').correct).toBe(true);
    expect(gradeExercise(toGerman, 'Tschüss').explanation!.what).toContain('„Hallo“ statt „Tschüss“');
  });
  it('dictation & fixError', () => {
    expect(gradeExercise(E.dictation, 'como estas')).toMatchObject({ correct: true, accentOnly: true });
    expect(gradeExercise(E.fixError, 'Yo estoy cansado').correct).toBe(true);
    const same = gradeExercise(E.fixError, 'Yo es cansado.');
    expect(same.correct).toBe(false);
    expect(same.explanation!.what).toContain('unverändert');
  });
  it('conjugate: keine Tippfehler-Toleranz (die Form ist das Lernziel)', () => {
    expect(gradeExercise(E.conjugate, 'hablamos').correct).toBe(true);
    expect(gradeExercise(E.conjugate, 'hablanos').correct).toBe(false);
    expect(gradeExercise(E.conjugate, 'hablámos')).toMatchObject({ correct: true, accentOnly: true });
  });
  it('freeText: Anforderungen und Mindestwörter', () => {
    expect(gradeExercise(E.freeText, 'Me llamo Tom y tengo 30 años').correct).toBe(true);
    expect(gradeExercise(E.freeText, 'Me llamo Tom y tengo 30 anos').correct).toBe(true); // Akzent-tolerant
    const miss = gradeExercise(E.freeText, 'Me llamo Tom, hola');
    expect(miss.correct).toBe(false);
    expect(miss.explanation!.what).toContain('dein Alter');
    expect(miss.score).toBeGreaterThan(0);
    expect(gradeExercise(E.freeText, 'Soy Tom años').explanation!.what).toContain('mindestens 4 Wörter');
  });
  it('speak: Transkript oder Punktzahl/Selbsteinschätzung', () => {
    expect(gradeExercise(E.speak, { transcripts: ['el perro corre'] }).correct).toBe(true);
    const bad = gradeExercise(E.speak, { transcripts: ['el pero come'] });
    expect(bad.correct).toBe(false);
    expect(bad.explanation!.what).toContain('el pero come');
    expect(gradeExercise(E.speak, { scorePct: 75 }).correct).toBe(true);
    const self = gradeExercise(E.speak, { scorePct: 40, selfAssessed: true });
    expect(self.correct).toBe(false);
    expect(self.explanation!.what).toContain('40 %');
    expect(speechSimilarity('perro', 'perro')).toBe(1);
  });
  it('speakFree: Schlüsselwörter (auch getippt)', () => {
    expect(gradeExercise(E.speakFree, { transcripts: ['quiero un cafe'] }).correct).toBe(true);
    const out = gradeExercise(E.speakFree, 'un té');
    expect(out.correct).toBe(false);
    expect(out.explanation!.what).toContain('`café`');
    expect(gradeExercise(E.speakFree, { scorePct: 80, selfAssessed: true }).correct).toBe(true);
  });
  it('imageMatch & matchPairs: Zuordnung als Record', () => {
    expect(gradeExercise(E.imageMatch, { '🐶': 'perro', '🐱': 'gato' }).correct).toBe(true);
    const m = gradeExercise(E.matchPairs, { hola: 'hallo', adiós: 'danke', gracias: 'tschüss' });
    expect(m).toMatchObject({ correct: false, parts: [true, false, false] });
    expect(m.score).toBeCloseTo(1 / 3);
    expect(m.explanation!.what).toContain('2 von 3');
  });
  it('aiChat: abgeschlossenes Gespräch', () => {
    expect(gradeExercise(E.aiChat, { completed: true, userTurns: 3 }).correct).toBe(true);
    expect(gradeExercise(E.aiChat, { completed: false, userTurns: 1 }).correct).toBe(false);
  });
});

describe('explainMistake', () => {
  it('nutzt Feedback (Regel, Warum, Vermeiden) und die richtige Lösung', () => {
    const x = explainMistake(E.translate, 'Estoy estudiante', 'Soy estudiante.');
    expect(x).toMatchObject({ rule: 'Testregel.', why: 'Testbegründung.', avoid: 'Testtipp.', correct: 'Soy estudiante.' });
  });
  it('Standardtexte, wenn why/avoid fehlen', () => {
    const ex: Exercise = { id: 'z', type: 'conjugate', skills: ['grammar'], feedback: { rule: 'Endung -amos' }, verb: 'hablar', tense: 'Präsens', person: 'nosotros', answers: ['hablamos'] };
    const x = gradeExercise(ex, 'hablan').explanation!;
    expect(x.why.length).toBeGreaterThan(10);
    expect(x.avoid).toContain('Person');
    expect(x.what).toContain('`hablamos` statt `hablan`');
  });
  it('fehlende und überflüssige Wörter werden benannt', () => {
    expect(explainMistake(E.translate, 'estudiante', 'Yo soy estudiante').what).toContain('es fehlt');
    expect(explainMistake(E.translate, 'Yo soy muy estudiante', 'Yo soy estudiante').what).toContain('überflüssig');
  });
});
