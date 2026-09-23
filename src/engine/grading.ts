/**
 * Bewertung aller Übungstypen + didaktische Fehlererklärung (was / warum / Regel / richtig / vermeiden).
 *
 * Antwortformat je Übungstyp (siehe {@link AnswerMap}):
 * | Typ | Antwort |
 * |---|---|
 * | mc, listening, situation, minimalPair | `number` – Index der gewählten Option |
 * | dialogue | `number` (mit options) oder `string` (freie Eingabe, mit answers) |
 * | cloze | `string[]` – eine Eingabe je Lücke (bei einer Lücke auch `string`) |
 * | order | `string[]` – Tokens in der gewählten Reihenfolge |
 * | translate, dictation, fixError, conjugate, freeText | `string` |
 * | speak | `SpeechAnswer` – `{transcripts}` der Spracherkennung und/oder `{scorePct}` (Bewertung bzw. Selbsteinschätzung) |
 * | speakFree | `SpeechAnswer` oder `string` (getippter Text als Fallback) |
 * | imageMatch | `Record<emoji, word>` – Zuordnung |
 * | matchPairs | `Record<left, right>` – Zuordnung |
 * | aiChat | `ChatAnswer` – `{completed, userTurns, scorePct?}` |
 *
 * Toleranzen: Akzentfehler zählen als richtig mit Hinweis (außer `strictAccents`), kleine Tippfehler
 * (Levenshtein ≤ 1 bei Wörtern ≥ 6 Zeichen, nicht in den letzten zwei Buchstaben = Endung) ebenso –
 * außer bei `conjugate`, wo genau die Form geübt wird.
 */
import type { MistakeExplanation } from '../core/types';
import type { Exercise, ExerciseType } from '../content/types';
import {
  diffWords, displayWords, joinTokens, levenshtein, looseKey, normalize, singleEditPosition, stripAccents, tokenizeWords,
} from './text';

export interface ExerciseOutcome {
  correct: boolean;
  /** 0..1 (Teilpunkte, z. B. Lücken, Paare, Aussprache) */
  score: number;
  /** nur Akzente weichen ab (bei korrekt: Hinweis; bei strictAccents: Fehler) */
  accentOnly: boolean;
  userAnswer: string;
  expected: string;
  durationMs: number;
  explanation?: MistakeExplanation;
  /** freundlicher Hinweis bei richtiger, aber nicht exakter Antwort (Md) */
  hint?: string;
  /** richtig trotz kleinem Tippfehler */
  typo?: boolean;
  /** Teilergebnisse je Lücke/Paar */
  parts?: boolean[];
}

export interface SpeechAnswer {
  /** Erkennungsergebnisse (beste zuerst) */
  transcripts?: string[];
  /** 0–100: Verständlichkeit laut Spracherkennung bzw. Selbsteinschätzung */
  scorePct?: number;
  selfAssessed?: boolean;
}

export interface ChatAnswer {
  completed: boolean;
  userTurns: number;
  scorePct?: number;
}

/** Antwortformat je Übungstyp. */
export interface AnswerMap {
  mc: number;
  listening: number;
  situation: number;
  minimalPair: number;
  dialogue: number | string;
  cloze: string[] | string;
  order: string[];
  translate: string;
  dictation: string;
  fixError: string;
  conjugate: string;
  freeText: string;
  speak: SpeechAnswer;
  speakFree: SpeechAnswer | string;
  imageMatch: Record<string, string>;
  matchPairs: Record<string, string>;
  aiChat: ChatAnswer;
}
export type ExerciseAnswer = AnswerMap[ExerciseType] | null | undefined;

export interface GradeOptions {
  strictAccents?: boolean;
  durationMs?: number;
}

/** Ab diesem Wert (0–100) gilt eine Sprechaufgabe als bestanden. */
export const SPEAK_PASS_PCT = 60;

export const DEFAULT_INSTRUCTIONS: Record<ExerciseType, string> = {
  mc: 'Wähle die richtige Antwort.',
  cloze: 'Fülle die Lücke.',
  order: 'Bringe die Wörter in die richtige Reihenfolge.',
  translate: 'Übersetze.',
  freeText: 'Schreibe deine eigene Antwort.',
  listening: 'Hör genau hin und wähle die passende Antwort.',
  dictation: 'Schreibe, was du hörst.',
  speak: 'Sprich den Satz nach.',
  minimalPair: 'Welches Wort hörst du?',
  fixError: 'Finde und korrigiere den Fehler.',
  dialogue: 'Vervollständige den Dialog.',
  situation: 'Was sagst du in dieser Situation?',
  imageMatch: 'Ordne die Bilder den Wörtern zu.',
  matchPairs: 'Ordne die Paare zu.',
  conjugate: 'Bilde die richtige Verbform.',
  speakFree: 'Antworte frei und sprich laut.',
  aiChat: 'Führe ein kurzes Gespräch.',
};

// ───────────────────────── Text-Vergleich ─────────────────────────

export interface TextGrade {
  correct: boolean;
  accentOnly: boolean;
  typo: boolean;
  score: number;
  /** die am besten passende akzeptierte Lösung */
  matched: string;
  hint?: string;
}

export interface TextGradeOptions {
  strictAccents?: boolean;
  /** kleine Tippfehler tolerieren (Standard: true) */
  allowTypos?: boolean;
  /** Lösung ist Zielsprache (Hervorhebung als `Zielsprache` in Hinweisen). Standard: true */
  target?: boolean;
}

const quote = (text: string, target = true) => (target ? '`' + text.replace(/`/g, "'") + '`' : `„${text}“`);

function isSmallTypo(user: string, expected: string): boolean {
  const uw = user.split(' ');
  const ew = expected.split(' ');
  if (uw.length !== ew.length) return false;
  const maxTypos = ew.length <= 4 ? 1 : 2;
  let typos = 0;
  for (let i = 0; i < ew.length; i++) {
    if (uw[i] === ew[i]) continue;
    const e = ew[i];
    const u = uw[i];
    if (e.length < 6) return false;
    const pos = singleEditPosition(u, e);
    if (pos === null) return false;
    // Abweichungen in den letzten zwei Buchstaben betreffen meist die Endung (Person, Zahl, Geschlecht)
    if (pos >= Math.min(u.length, e.length) - 2) return false;
    if (++typos > maxTypos) return false;
  }
  return typos > 0;
}

/** Vergleicht eine Texteingabe mit akzeptierten Lösungen (normalisiert, akzent- und tippfehlertolerant). */
export function gradeText(input: string, accepted: readonly string[], opts: TextGradeOptions = {}): TextGrade {
  const list = accepted.filter((a) => normalize(a) !== '');
  const target = opts.target !== false;
  const fail = (matched: string): TextGrade => ({ correct: false, accentOnly: false, typo: false, score: 0, matched });
  if (!list.length) return fail('');
  const n = normalize(input ?? '');
  if (!n) return fail(list[0]);
  for (const a of list) if (normalize(a) === n) return { correct: true, accentOnly: false, typo: false, score: 1, matched: a };

  const ln = stripAccents(n);
  for (const a of list) {
    if (stripAccents(normalize(a)) !== ln) continue;
    if (opts.strictAccents && target) {
      return { correct: false, accentOnly: true, typo: false, score: 0.5, matched: a, hint: `Achte auf die Akzente: ${quote(a, target)}.` };
    }
    return { correct: true, accentOnly: true, typo: false, score: 0.9, matched: a, hint: `Richtig! Achte noch auf die Akzente: ${quote(a, target)}.` };
  }

  if (opts.allowTypos !== false) {
    for (const a of list) {
      if (isSmallTypo(ln, stripAccents(normalize(a)))) {
        return { correct: true, accentOnly: false, typo: true, score: 0.85, matched: a, hint: `Richtig – nur ein kleiner Tippfehler. So schreibt man es: ${quote(a, target)}.` };
      }
    }
  }

  let best = list[0];
  let bestD = Infinity;
  for (const a of list) {
    const d = levenshtein(ln, stripAccents(normalize(a)));
    if (d < bestD) { bestD = d; best = a; }
  }
  return fail(best);
}

/** Ähnlichkeit 0..1 zwischen Zieltext und Transkript (wortweise, bei Einzelwörtern zeichenweise). */
export function speechSimilarity(target: string, transcript: string): number {
  const t = tokenizeWords(target).map(stripAccents);
  const u = tokenizeWords(transcript).map(stripAccents);
  if (!t.length || !u.length) return 0;
  if (t.length === 1 && u.length <= 2) {
    const tw = t[0];
    return Math.max(...u.map((w) => 1 - levenshtein(w, tw) / Math.max(w.length, tw.length)));
  }
  const ops = diffWords(u, t);
  const same = ops.filter((o) => o.op === 'same' || o.op === 'accent').length;
  const extra = ops.filter((o) => o.op === 'extra').length;
  return Math.max(0, Math.min(1, same / t.length - Math.max(0, extra - 1) * 0.05));
}

// ───────────────────────── Bewertung je Typ ─────────────────────────

/** Zusatzdaten für eine präzise Fehlererklärung. */
export interface MistakeDetail {
  accentOnly?: boolean;
  chosenIndex?: number;
  gaps?: { index: number; user: string; expected: string; accentOnly: boolean }[];
  firstMismatch?: number;
  unmet?: string[];
  keywordsMissing?: string[];
  wrongPairs?: { left: string; chosen: string; correct: string }[];
  unchanged?: boolean;
  recognized?: string;
  selfScorePct?: number;
  targetIsGerman?: boolean;
}

interface CoreResult {
  correct: boolean;
  score: number;
  accentOnly?: boolean;
  typo?: boolean;
  hint?: string;
  userAnswer: string;
  expected: string;
  parts?: boolean[];
  detail?: MistakeDetail;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);

function choice(texts: string[], correctIdx: number, answer: unknown): CoreResult {
  const idx = typeof answer === 'number' && Number.isInteger(answer) ? answer : -1;
  const correct = idx === correctIdx;
  return {
    correct,
    score: correct ? 1 : 0,
    userAnswer: texts[idx] ?? '',
    expected: texts[correctIdx] ?? '',
    detail: { chosenIndex: idx },
  };
}

function fromText(g: TextGrade, input: string, extra: MistakeDetail = {}): CoreResult {
  return {
    correct: g.correct,
    score: g.score,
    accentOnly: g.accentOnly,
    typo: g.typo,
    hint: g.correct ? g.hint : undefined,
    userAnswer: (input ?? '').trim(),
    expected: g.matched,
    detail: { accentOnly: g.accentOnly, ...extra },
  };
}

const GAP = /_{3,}/;

/** Setzt Werte nacheinander in die Lücken („___“) eines Satzes ein. */
export function fillGaps(sentence: string, values: readonly string[]): string {
  const parts = sentence.split(GAP);
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) out += (values[i - 1]?.trim() || '___') + parts[i];
  return out;
}

export const countGaps = (sentence: string) => sentence.split(GAP).length - 1;

function gradeCore(ex: Exercise, answer: unknown, opts: GradeOptions): CoreResult {
  const strictAccents = !!opts.strictAccents;
  const str = typeof answer === 'string' ? answer : '';
  switch (ex.type) {
    case 'mc':
    case 'situation':
      return choice(ex.options.map((o) => o.text), ex.answer, answer);
    case 'listening':
    case 'minimalPair':
      return choice(ex.options, ex.answer, answer);

    case 'dialogue': {
      if (ex.options && typeof ex.answer === 'number' && typeof answer === 'number') return choice(ex.options, ex.answer, answer);
      const accepted = ex.answers?.length ? ex.answers : ex.options && typeof ex.answer === 'number' ? [ex.options[ex.answer]] : [];
      return fromText(gradeText(str, accepted, { strictAccents }), str);
    }

    case 'cloze': {
      const inputs = Array.isArray(answer) ? answer.map((a) => String(a ?? '')) : typeof answer === 'string' ? [answer] : [];
      const grades = ex.answers.map((acc, i) => gradeText(inputs[i] ?? '', acc, { strictAccents }));
      const parts = grades.map((g) => g.correct);
      const correct = parts.length > 0 && parts.every(Boolean);
      const accentOnly = correct ? grades.some((g) => g.accentOnly) : grades.every((g) => g.correct || g.accentOnly) && grades.some((g) => g.accentOnly);
      return {
        correct,
        score: parts.length ? parts.filter(Boolean).length / parts.length : 0,
        accentOnly,
        typo: grades.some((g) => g.typo),
        hint: correct ? grades.find((g) => g.hint)?.hint : undefined,
        userAnswer: fillGaps(ex.sentence, inputs),
        expected: fillGaps(ex.sentence, ex.answers.map((a) => a[0] ?? '')),
        parts,
        detail: {
          accentOnly,
          gaps: grades
            .map((g, i) => ({ index: i, user: (inputs[i] ?? '').trim(), expected: g.matched || ex.answers[i]?.[0] || '', accentOnly: g.accentOnly, ok: g.correct }))
            .filter((g) => !g.ok)
            .map(({ index, user, expected, accentOnly: a }) => ({ index, user, expected, accentOnly: a })),
        },
      };
    }

    case 'order': {
      const seq = Array.isArray(answer) ? answer.map((a) => String(a ?? '')) : [];
      const candidates = [ex.tokens, ...(ex.alternatives ?? [])];
      const key = (t: readonly string[]) => normalize(t.join(' '));
      const u = key(seq);
      // Richtig gelöst → die passende (redaktionell gesetzte) Fassung anzeigen: Kacheln mit
      // Satzzeichen/Großschreibung („salir.“, „Esta“) stehen in Alternativen sonst schief im Satz.
      const matched = seq.length > 0 ? candidates.find((c) => key(c) === u) : undefined;
      const correct = matched !== undefined;
      let best = 0;
      let firstMismatch = 0;
      for (const c of candidates) {
        let ok = 0;
        for (let i = 0; i < c.length; i++) if (normalize(seq[i] ?? '') === normalize(c[i])) ok++;
        const s = ok / Math.max(c.length, seq.length, 1);
        if (s > best) best = s;
      }
      while (firstMismatch < ex.tokens.length && normalize(seq[firstMismatch] ?? '') === normalize(ex.tokens[firstMismatch])) firstMismatch++;
      return {
        correct,
        score: correct ? 1 : best * 0.5,
        userAnswer: joinTokens(matched ?? seq),
        expected: joinTokens(ex.tokens),
        detail: { firstMismatch },
      };
    }

    case 'translate': {
      const target = ex.direction === 'toTarget';
      return fromText(gradeText(str, ex.answers, { strictAccents: target && strictAccents, target }), str, { targetIsGerman: !target });
    }
    case 'dictation':
      return fromText(gradeText(str, ex.answers, { strictAccents }), str);
    case 'fixError':
      return fromText(gradeText(str, ex.answers, { strictAccents }), str, {
        unchanged: !!str.trim() && looseKey(str) === looseKey(ex.sentence),
      });
    case 'conjugate':
      return fromText(gradeText(str, ex.answers, { strictAccents, allowTypos: false }), str);

    case 'freeText': {
      const text = str.trim();
      const loose = stripAccents(text);
      const unmet: string[] = [];
      let met = 0;
      for (const r of ex.requirements) {
        const ok = testPattern(r.pattern, text) || testPattern(stripAccents(r.pattern), loose);
        if (ok) met++; else unmet.push(r.hint);
      }
      const words = tokenizeWords(text).length;
      const wordsOk = !ex.minWords || words >= ex.minWords;
      if (!wordsOk) unmet.push(`mindestens ${ex.minWords} Wörter (bisher ${words})`);
      const total = ex.requirements.length + (ex.minWords ? 1 : 0);
      const correct = text.length > 0 && unmet.length === 0;
      const sample = ex.samples[0] ?? '';
      return {
        correct,
        score: text ? (total ? (met + (ex.minWords && wordsOk ? 1 : 0)) / total : 1) : 0,
        hint: correct && sample ? `Gut gemacht! Eine mögliche Musterlösung: ${quote(sample)}` : undefined,
        userAnswer: text,
        expected: sample,
        detail: { unmet },
      };
    }

    case 'speak': {
      const a = isObj(answer) ? (answer as SpeechAnswer) : {};
      const transcripts = (a.transcripts ?? []).filter((t) => typeof t === 'string' && t.trim());
      if (typeof a.scorePct === 'number' && Number.isFinite(a.scorePct)) {
        const pct = Math.max(0, Math.min(100, a.scorePct));
        return {
          correct: pct >= SPEAK_PASS_PCT,
          score: pct / 100,
          userAnswer: transcripts[0] ?? (a.selfAssessed ? `Selbsteinschätzung: ${Math.round(pct)} %` : ''),
          expected: ex.text,
          detail: { recognized: transcripts[0], selfScorePct: a.selfAssessed ? pct : undefined },
        };
      }
      let best = 0;
      let bestT = transcripts[0] ?? '';
      for (const t of transcripts) {
        const s = speechSimilarity(ex.text, t);
        if (s > best) { best = s; bestT = t; }
      }
      return {
        correct: best >= 0.7,
        score: best,
        userAnswer: bestT,
        expected: ex.text,
        detail: { recognized: bestT || undefined },
      };
    }

    case 'speakFree': {
      const a: SpeechAnswer = typeof answer === 'string' ? { transcripts: [answer] } : isObj(answer) ? (answer as SpeechAnswer) : {};
      const texts = (a.transcripts ?? []).filter((t) => typeof t === 'string' && t.trim());
      if (!texts.length && typeof a.scorePct === 'number') {
        const pct = Math.max(0, Math.min(100, a.scorePct));
        return {
          correct: pct >= SPEAK_PASS_PCT,
          score: pct / 100,
          userAnswer: `Selbsteinschätzung: ${Math.round(pct)} %`,
          expected: ex.sample,
          detail: { selfScorePct: pct },
        };
      }
      let bestFound: string[] = [];
      let bestText = texts[0] ?? '';
      for (const t of texts) {
        const hay = ` ${looseKey(t)} `;
        const found = ex.keywords.filter((k) => looseKey(k) && hay.includes(` ${looseKey(k)} `));
        if (found.length > bestFound.length) { bestFound = found; bestText = t; }
      }
      const need = Math.max(1, Math.min(ex.minMatch, ex.keywords.length));
      const correct = bestFound.length >= need;
      return {
        correct,
        score: Math.min(1, bestFound.length / need),
        userAnswer: bestText,
        expected: ex.sample,
        detail: { keywordsMissing: ex.keywords.filter((k) => !bestFound.includes(k)), recognized: bestText || undefined },
      };
    }

    case 'imageMatch':
    case 'matchPairs': {
      const map = isObj(answer) ? (answer as Record<string, unknown>) : {};
      const pairs = ex.type === 'imageMatch'
        ? ex.pairs.map((p) => ({ left: p.emoji, right: p.word }))
        : ex.pairs.map((p) => ({ left: p.left, right: p.right }));
      const chosen = (left: string) => (typeof map[left] === 'string' ? (map[left] as string) : '');
      const parts = pairs.map((p) => looseKey(chosen(p.left)) === looseKey(p.right));
      const correct = pairs.length > 0 && parts.every(Boolean);
      return {
        correct,
        score: pairs.length ? parts.filter(Boolean).length / pairs.length : 0,
        userAnswer: pairs.map((p) => `${p.left} → ${chosen(p.left) || '–'}`).join('; '),
        expected: pairs.map((p) => `${p.left} → ${p.right}`).join('; '),
        parts,
        detail: {
          wrongPairs: pairs.filter((_, i) => !parts[i]).map((p) => ({ left: p.left, chosen: chosen(p.left), correct: p.right })),
        },
      };
    }

    case 'aiChat': {
      const a = isObj(answer) ? (answer as unknown as ChatAnswer) : { completed: false, userTurns: 0 };
      const turns = Math.max(0, Number(a.userTurns) || 0);
      const correct = !!a.completed && turns >= 1;
      const score = typeof a.scorePct === 'number' ? a.scorePct / 100 : Math.min(1, turns / Math.max(1, ex.turns));
      return {
        correct,
        score: correct ? Math.max(score, 0.6) : Math.min(score, 0.5),
        userAnswer: `${turns} Gesprächsbeiträge`,
        expected: `${ex.turns} Gesprächsbeiträge – Ziel erreicht`,
      };
    }
  }
}

function testPattern(pattern: string, text: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(text);
  } catch {
    return true; // ungültiges Muster kann nicht geprüft werden (meldet die Inhaltsvalidierung)
  }
}

/** Bewertet eine Übung. Bei falscher Antwort ist `explanation` immer gesetzt. */
export function gradeExercise(exercise: Exercise, answer: ExerciseAnswer, opts: GradeOptions = {}): ExerciseOutcome {
  const r = gradeCore(exercise, answer, opts);
  const outcome: ExerciseOutcome = {
    correct: r.correct,
    score: clamp01(r.score),
    accentOnly: !!r.accentOnly,
    userAnswer: r.userAnswer,
    expected: r.expected,
    durationMs: Math.max(0, Math.round(opts.durationMs ?? 0)),
  };
  if (r.hint) outcome.hint = r.hint;
  if (r.typo && r.correct) outcome.typo = true;
  if (r.parts) outcome.parts = r.parts;
  if (!r.correct) outcome.explanation = explainMistake(exercise, r.userAnswer, r.expected, { ...r.detail, accentOnly: !!r.accentOnly });
  return outcome;
}

// ───────────────────────── Fehlererklärung ─────────────────────────

const CHOICE_TYPES: ExerciseType[] = ['mc', 'situation', 'listening', 'minimalPair'];

const ACCENT_WHY =
  'Akzente gehören zur Schreibweise: Sie zeigen die Betonung an und unterscheiden manchmal Wörter ' +
  '(z. B. `si` – wenn / `sí` – ja im Spanischen, `e` – und / `é` – ist im Portugiesischen). ' +
  'In deinen Einstellungen ist die strenge Akzentprüfung aktiv.';
const ACCENT_AVOID =
  'Sprich das Wort laut und achte auf die betonte Silbe – dort sitzt oft der Akzent. ' +
  'Auf dem iPhone: Buchstaben gedrückt halten (z. B. e → é, n → ñ).';

const DEFAULT_WHY: Partial<Record<ExerciseType, string>> & { default: string } = {
  default: 'Deine Antwort weicht von der erwarteten Lösung ab – die Regel unten zeigt, worauf es hier ankommt.',
  mc: 'Die gewählte Option passt inhaltlich oder grammatisch nicht zur Aufgabe.',
  situation: 'Die gewählte Äußerung passt nicht zur Situation – achte auf Anlass, Gegenüber und Höflichkeit.',
  listening: 'In der Aufnahme wurde etwas anderes gesagt als die gewählte Antwort.',
  minimalPair: 'Die beiden Wörter klingen ähnlich, unterscheiden sich aber in einem Laut – genau der verändert die Bedeutung.',
  order: 'Die Wortstellung folgt festen Regeln – eine andere Reihenfolge verändert den Satz oder macht ihn ungrammatisch.',
  speak: 'Die Spracherkennung konnte das Ziel nicht sicher erkennen. Das ist keine phonetische Analyse, aber ein guter Hinweis auf die Verständlichkeit.',
  speakFree: 'Deiner Antwort fehlten noch wichtige Wörter, die für die Aufgabe nötig sind.',
  freeText: 'Deine Antwort erfüllt noch nicht alle Anforderungen der Aufgabe.',
  matchPairs: 'Einige Zuordnungen stimmen noch nicht.',
  imageMatch: 'Einige Wörter wurden dem falschen Bild zugeordnet.',
  aiChat: 'Das Gesprächsziel wurde noch nicht erreicht.',
  conjugate: 'Die Verbform passt nicht zur verlangten Person oder Zeit.',
};

const DEFAULT_AVOID: Partial<Record<ExerciseType, string>> & { default: string } = {
  default: 'Sprich die richtige Lösung einmal laut – die Aufgabe kommt in deiner Wiederholung wieder, dann sitzt sie.',
  cloze: 'Frage dich zuerst: Wer handelt, welche Zeit, welches Geschlecht/welche Zahl? Dann die passende Form wählen.',
  conjugate: 'Bestimme erst die Person, dann die Zeit – und hänge die passende Endung an den Stamm.',
  order: 'Baue den Satz vom Verb aus: Wer? – tut was? – wen/was, wo, wann? Lies ihn danach laut.',
  translate: 'Übersetze den Sinn statt Wort für Wort und prüfe am Ende Artikel und Endungen.',
  dictation: 'Hör dir die Aufnahme langsam an und schreibe Wort für Wort mit – Pausen helfen.',
  speak: 'Hör dir das Vorbild langsam an, sprich Silbe für Silbe nach und dann im natürlichen Tempo.',
  speakFree: 'Plane deine Antwort kurz auf Deutsch und nutze dann die Schlüsselwörter der Aufgabe.',
  minimalPair: 'Hör dir beide Wörter mehrmals langsam an und sprich sie im Wechsel nach.',
  listening: 'Lies die Antwortmöglichkeiten vor dem Hören und achte auf Schlüsselwörter.',
  fixError: 'Prüfe Satz für Satz: Verbform, Artikel, Endungen und Wortstellung.',
  matchPairs: 'Beginne mit den Paaren, bei denen du dir sicher bist – der Rest ergibt sich leichter.',
  imageMatch: 'Sprich jedes Wort beim Zuordnen laut – so verknüpfst du Bild und Klang.',
  situation: 'Überlege zuerst, mit wem du sprichst (du oder Sie?) und was du erreichen willst.',
};

function describeTextDiff(user: string, expected: string, target: boolean): string {
  const q = (s: string) => quote(s, target);
  const ops = diffWords(displayWords(user), displayWords(expected)).filter((o) => o.op !== 'same');
  if (!ops.length) return `Deine Antwort ${q(user)} weicht nur in der Schreibweise ab.`;
  if (ops.every((o) => o.op === 'accent')) {
    return `Nur die Akzente stimmen nicht: ${ops.map((o) => (o.op === 'accent' ? `${q(o.user)} → ${q(o.expected)}` : '')).join(', ')}.`;
  }
  const same = tokenizeWords(expected).length - ops.filter((o) => o.op === 'missing' || o.op === 'wrong' || o.op === 'accent').length;
  if (same <= 0 && tokenizeWords(user).length > 1) return `Deine Antwort ${q(user)} passt noch nicht zur erwarteten Lösung.`;
  const parts = ops.slice(0, 3).map((o) => {
    switch (o.op) {
      case 'wrong': return `${q(o.expected)} statt ${q(o.user)}`;
      case 'missing': return `es fehlt ${q(o.expected)}`;
      case 'extra': return `${q(o.user)} ist hier überflüssig`;
      case 'accent': return `${q(o.expected)} mit Akzent`;
      default: return '';
    }
  });
  const more = ops.length > 3 ? ` (und ${ops.length - 3} weitere Abweichung${ops.length - 3 === 1 ? '' : 'en'})` : '';
  const text = parts.join('; ');
  return `In deiner Antwort: ${text}${more}.`;
}

function describeWhat(ex: Exercise, userAnswer: string, expected: string, d: MistakeDetail): string {
  const empty = !userAnswer.trim();
  if (CHOICE_TYPES.includes(ex.type) || (ex.type === 'dialogue' && typeof d.chosenIndex === 'number')) {
    if (empty) return 'Du hast keine Antwort ausgewählt.';
    if (ex.type === 'minimalPair') return `Du hast „${userAnswer}“ gewählt – gesprochen wurde „${expected}“.`;
    return `Du hast „${userAnswer}“ gewählt – richtig ist „${expected}“.`;
  }
  switch (ex.type) {
    case 'cloze': {
      const gaps = d.gaps ?? [];
      if (!gaps.length) return describeTextDiff(userAnswer, expected, true);
      const multi = ex.answers.length > 1;
      return gaps.slice(0, 3).map((g) => {
        const label = multi ? `Lücke ${g.index + 1}: ` : '';
        if (!g.user) return `${label}noch leer – richtig ist ${quote(g.expected)}`;
        if (g.accentOnly) return `${label}${quote(g.user)} braucht die Akzente: ${quote(g.expected)}`;
        return `${label}${quote(g.expected)} statt ${quote(g.user)}`;
      }).join('; ') + '.';
    }
    case 'order':
      if (empty) return 'Du hast noch keine Wörter angeordnet.';
      return `Die Reihenfolge stimmt noch nicht: „${userAnswer}“.` +
        (typeof d.firstMismatch === 'number' ? ` Ab Wort ${d.firstMismatch + 1} weicht sie von der Lösung ab.` : '');
    case 'freeText':
      if (empty) return 'Du hast noch nichts geschrieben.';
      return `Es fehlt noch: ${(d.unmet ?? []).join('; ')}.`;
    case 'speak':
      if (typeof d.selfScorePct === 'number') return `Du hast deine Aussprache mit ${Math.round(d.selfScorePct)} % eingeschätzt – übe den Satz noch ein paarmal.`;
      if (d.recognized) return `Die Spracherkennung hat „${d.recognized}“ verstanden (Ziel: ${quote(expected)}).`;
      return 'Die Spracherkennung hat dich noch nicht verstanden.';
    case 'speakFree':
      if (typeof d.selfScorePct === 'number') return `Du hast deine Antwort mit ${Math.round(d.selfScorePct)} % eingeschätzt.`;
      if (empty) return 'Es wurde noch keine Antwort erkannt.';
      return `Es fehlten Schlüsselwörter, z. B. ${(d.keywordsMissing ?? []).slice(0, 3).map((k) => quote(k)).join(', ')}.`;
    case 'imageMatch':
    case 'matchPairs': {
      const wrong = d.wrongPairs ?? [];
      const total = ex.pairs.length;
      return `${wrong.length} von ${total} Zuordnungen stimmen noch nicht: ` +
        wrong.slice(0, 3).map((w) => `${w.left} → „${w.chosen || '–'}“ (richtig: „${w.correct}“)`).join('; ') + '.';
    }
    case 'aiChat':
      return 'Das Gespräch wurde noch nicht bis zum Ziel geführt.';
    case 'fixError':
      if (d.unchanged) return 'Du hast den Satz unverändert übernommen – darin steckt aber ein Fehler.';
      if (empty) return 'Du hast noch keine Korrektur eingegeben.';
      return describeTextDiff(userAnswer, expected, true);
    default:
      if (empty) return 'Du hast noch keine Antwort eingegeben.';
      return describeTextDiff(userAnswer, expected, !d.targetIsGerman);
  }
}

/**
 * Erzeugt eine vollständige Fehlererklärung aus dem Feedback der Übung und einem Wort-Diff.
 * `detail` (optional) macht die Beschreibung präziser (Lücken, Paare, Anforderungen …).
 */
export function explainMistake(exercise: Exercise, userAnswer: string, expected: string, detail: MistakeDetail = {}): MistakeExplanation {
  const fb = exercise.feedback ?? { rule: '' };
  let optionWhy: string | undefined;
  if ((exercise.type === 'mc' || exercise.type === 'situation') && typeof detail.chosenIndex === 'number') {
    optionWhy = exercise.options[detail.chosenIndex]?.why;
  } else if ((exercise.type === 'mc' || exercise.type === 'situation') && userAnswer) {
    optionWhy = exercise.options.find((o) => normalize(o.text) === normalize(userAnswer))?.why;
  }
  const accent = !!detail.accentOnly;
  return {
    what: describeWhat(exercise, userAnswer ?? '', expected ?? '', detail),
    why: accent ? ACCENT_WHY : optionWhy || fb.why || DEFAULT_WHY[exercise.type] || DEFAULT_WHY.default,
    rule: fb.rule || 'Vergleiche deine Antwort mit der Lösung und lies sie einmal laut.',
    correct: expected ?? '',
    avoid: accent ? ACCENT_AVOID : fb.avoid || DEFAULT_AVOID[exercise.type] || DEFAULT_AVOID.default,
  };
}

// ───────────────────────── Hilfen für UI, Validierung und Archiv ─────────────────────────

/** Eine garantiert richtige Antwort (für „Lösung zeigen“ und die Inhaltsvalidierung). */
export function canonicalAnswer(ex: Exercise): ExerciseAnswer {
  switch (ex.type) {
    case 'mc': case 'situation': case 'listening': case 'minimalPair': return ex.answer;
    case 'dialogue': return ex.options && typeof ex.answer === 'number' ? ex.answer : ex.answers?.[0] ?? '';
    case 'cloze': return ex.answers.map((a) => a[0] ?? '');
    case 'order': return ex.tokens.slice();
    case 'translate': case 'dictation': case 'fixError': case 'conjugate': return ex.answers[0] ?? '';
    case 'freeText': return ex.samples[0] ?? '';
    case 'speak': return { transcripts: [ex.text] };
    case 'speakFree': return { transcripts: [ex.sample] };
    case 'imageMatch': return Object.fromEntries(ex.pairs.map((p) => [p.emoji, p.word]));
    case 'matchPairs': return Object.fromEntries(ex.pairs.map((p) => [p.left, p.right]));
    case 'aiChat': return { completed: true, userTurns: ex.turns };
  }
}

/** Lesbare richtige Lösung. */
export function expectedText(ex: Exercise): string {
  return gradeCore(ex, canonicalAnswer(ex), {}).expected;
}

/** Kurzer Aufgabentext (z. B. für das Fehlerarchiv). */
export function exercisePrompt(ex: Exercise): string {
  switch (ex.type) {
    case 'mc': return ex.prompt;
    case 'cloze': return ex.german ? `${ex.sentence} (${ex.german})` : ex.sentence;
    case 'order': return ex.german;
    case 'translate': return ex.source;
    case 'freeText': return ex.prompt;
    case 'listening': return ex.question;
    case 'dictation': return ex.german ? `Diktat: ${ex.german}` : 'Diktat';
    case 'speak': return ex.german ? `${ex.text} (${ex.german})` : ex.text;
    case 'minimalPair': return `${ex.options.join(' / ')}`;
    case 'fixError': return ex.sentence;
    case 'dialogue': {
      const prev = ex.lines[ex.gapIndex - 1] ?? ex.lines[ex.gapIndex + 1];
      return prev ? `Dialog: ${prev.speaker}: ${prev.text}` : 'Dialog vervollständigen';
    }
    case 'situation': return ex.scenario;
    case 'imageMatch': return 'Bilder zuordnen: ' + ex.pairs.map((p) => p.emoji).join(' ');
    case 'matchPairs': return 'Paare zuordnen: ' + ex.pairs.map((p) => p.left).join(', ');
    case 'conjugate': return `${ex.verb} – ${ex.person} (${ex.tense})${ex.sentence ? `: ${ex.sentence}` : ''}`;
    case 'speakFree': return ex.prompt;
    case 'aiChat': return ex.goal;
  }
}

export const instructionFor = (ex: Exercise) => ex.instruction || DEFAULT_INSTRUCTIONS[ex.type];
