/**
 * Song-Übungsgenerator (rein, ohne React, deterministisch per Seed).
 *
 * Erzeugt aus einem Song gültige `Exercise`-Objekte für die gemeinsame ExerciseView:
 * Lückentext, Anordnen (Wörter einer Zeile / Zeilen eines Abschnitts), gehörte Wörter, Übersetzungen
 * zuordnen, Verbformen, Grammatikfragen, Redewendungen, Diktat, Aussprache, Alltagsdialoge sowie
 * die Wiederholung schwieriger Textstellen, gemischte Runden und die Boss-Challenge.
 *
 * - IDs sind stabil und inhaltsbezogen: `<songId>.x.<typ>.<n>` (n aus Zeilen-/Token-/Abschnittsindex),
 *   damit Fehlerarchiv und Statistik dieselbe Aufgabe wiedererkennen. Der Seed wählt nur aus und mischt.
 * - Feedback (rule/why/avoid) stammt aus den geprüften Song-Erklärungen (Glossar, Zeilen-Erklärung).
 * - Eigene Texte (license 'user-private') haben weder Übersetzung noch Glossar: dort gibt es nur
 *   Lückentext, Anordnen, Diktat, gehörte Wörter und Aussprache.
 * - Jede Übung wird vor der Ausgabe geprüft (`checkExercise`): Struktur wie in src/content/validate.ts
 *   und die Musterlösung muss von `gradeExercise` als richtig erkannt werden.
 */
import type { Exercise, Feedback, GlossEntry, Md, Song, SongLine, SongToken } from '../../../content/types';
import { canonicalAnswer, countGaps, gradeExercise } from '../../../engine/grading';
import { hashString, looseKey, normalize, seededRandom, stripAccents } from '../../../engine/text';
import { joinLyricTokens } from '../userText';

// ───────────────────────── Öffentliche Typen ─────────────────────────

export type SongExKind =
  | 'cloze' | 'order' | 'heard' | 'match' | 'verbs' | 'grammar' | 'idioms' | 'dictation' | 'speak' | 'dialogue';

/** Auswahl auf der Übungsseite: einzelne Art, gemischte Runde oder Wiederholung schwieriger Stellen. */
export type SongExMode = SongExKind | 'mixed' | 'review';

export interface SongExKindMeta {
  key: SongExKind;
  label: string;
  description: string;
  /** braucht geprüfte Übersetzungen/Erklärungen (nicht für eigene Texte) */
  needsAnnotations: boolean;
}

export const SONG_EX_KINDS: SongExKindMeta[] = [
  { key: 'cloze', label: 'Lückentext', description: 'Fehlende Wörter im Liedtext einsetzen', needsAnnotations: false },
  { key: 'order', label: 'Richtig anordnen', description: 'Wörter einer Zeile und Zeilen eines Abschnitts sortieren', needsAnnotations: false },
  { key: 'heard', label: 'Gehörte Wörter', description: 'Zeile anhören und das Wort finden, das vorkam', needsAnnotations: false },
  { key: 'match', label: 'Übersetzungen zuordnen', description: 'Liedzeilen mit ihrer Bedeutung verbinden', needsAnnotations: true },
  { key: 'verbs', label: 'Verbformen erkennen', description: 'Grundform finden und Formen selbst bilden', needsAnnotations: true },
  { key: 'grammar', label: 'Grammatikfragen', description: 'Welche Regel steckt in der Zeile?', needsAnnotations: true },
  { key: 'idioms', label: 'Redewendungen', description: 'Wendungen und Umgangssprache verstehen', needsAnnotations: true },
  { key: 'dictation', label: 'Diktat', description: 'Zeile hören und aufschreiben', needsAnnotations: false },
  { key: 'speak', label: 'Aussprache', description: 'Zeilen nachsprechen – mit Rückmeldung', needsAnnotations: false },
  { key: 'dialogue', label: 'Im Alltag sagen', description: 'Formulierungen aus dem Song in Alltagsdialogen', needsAnnotations: true },
];

export const kindMeta = (k: SongExKind): SongExKindMeta => SONG_EX_KINDS.find((m) => m.key === k) as SongExKindMeta;

/** Standardgrößen der Runden */
export const MIXED_ROUND = 10;
export const KIND_ROUND = 8;
export const REVIEW_ROUND = 10;

/** Fortschritt je Zeile zur Gewichtung (aus songProgress und Fehlerarchiv) */
export interface LineFocus {
  lineScores?: Record<string, number>;
  pronScores?: Record<string, number>;
  /** Zeilen mit offenen Fehlern im Fehlerarchiv */
  errorLineIds?: readonly string[];
}

export interface GenerateOptions {
  seed?: string | number;
  count?: number;
  focus?: LineFocus;
}

/** Vokabel/Wendung, die zu einer Aufgabe gehört („Zur Vokabelliste“ bei Fehlern) */
export interface VocabFocus {
  /** wie im LyricActionSheet: `song:<songId>:<schlüssel>` */
  itemId: string;
  kind: 'vocab' | 'phrase';
  front: string;
  back: string;
  hint?: string;
}

export interface SongExercise {
  exercise: Exercise;
  /** Übungsart ('boss' = Frage der Boss-Challenge) */
  kind: SongExKind | 'boss';
  /** betroffene Zeilen (für Gewichtung und Fehlerzuordnung) */
  lineIds: string[];
  vocab: VocabFocus[];
}

// ───────────────────────── Sprache & Wortlisten ─────────────────────────

type Lang = 'es' | 'pt';
const langOf = (song: Pick<Song, 'courseId'>): Lang => (song.courseId === 'pt-BR' ? 'pt' : 'es');

const STOPWORDS: Record<Lang, Set<string>> = {
  es: new Set(('a al ante bajo con contra de del desde en entre hacia hasta para por segun sin sobre tras el la lo los las un una unos unas ' +
    'y e o u ni pero sino que si no ya como cuando donde quien cual muy mas tan tanto yo tu vos el ella usted nosotros ' +
    'nosotras vosotros ellos ellas ustedes me te se nos os le les mi mis tu tus su sus nuestro nuestra este esta esto ' +
    'ese esa eso aquel aquella es son soy eres fue hay ha he mas aqui ahi alli oh ay eh uh la la').split(' ')),
  pt: new Set(('a o os as um uma uns umas de do da dos das em no na nos nas num numa por pelo pela pelos pelas para pra pro ' +
    'com sem sob sobre ate e ou mas nem que se nao ja como quando onde quem qual muito mais tao eu tu voce ele ela nos ' +
    'vos eles elas voces me te lhe lhes meu minha meus minhas teu tua seu sua seus suas nosso nossa este esta isto esse ' +
    'essa isso aquele aquela e sou foi ha oh ai eh uh la').split(' ')),
};

/** Häufige Inhaltswörter als Ablenker, falls der Song zu wenige eigene hat */
const FALLBACK_WORDS: Record<Lang, string[]> = {
  es: ['casa', 'tiempo', 'noche', 'camino', 'mañana', 'ciudad', 'corazón', 'amigo', 'playa', 'cielo', 'verano', 'fuego', 'luna', 'puerta', 'ventana', 'canción'],
  pt: ['casa', 'tempo', 'noite', 'caminho', 'amanhã', 'cidade', 'coração', 'amigo', 'praia', 'céu', 'verão', 'fogo', 'lua', 'porta', 'janela', 'canção'],
};

const FALLBACK_VERBS: Record<Lang, string[]> = {
  es: ['ser', 'estar', 'tener', 'ir', 'hacer', 'querer', 'poder', 'decir', 'ver', 'dar', 'saber', 'venir', 'salir', 'hablar', 'vivir', 'comer'],
  pt: ['ser', 'estar', 'ter', 'ir', 'fazer', 'querer', 'poder', 'dizer', 'ver', 'dar', 'saber', 'vir', 'sair', 'falar', 'viver', 'comer'],
};

/** Gesprächsrahmen für Alltagsdialoge: neutral genug für jede Aussage */
const DIALOGUE_FRAME: Record<Lang, { openers: [string, string][]; reactions: [string, string][] }> = {
  es: {
    openers: [['¿Y qué me cuentas?', 'Und, was erzählst du?'], ['Cuéntame, ¿qué tal?', 'Erzähl mal, wie ist es?'], ['Oye, ¿y tú qué dices?', 'Hey, und was sagst du?']],
    reactions: [['Ah, ya veo.', 'Ah, verstehe.'], ['Claro, te entiendo.', 'Klar, ich verstehe dich.'], ['¡Qué interesante!', 'Wie interessant!']],
  },
  pt: {
    openers: [['E aí, me conta!', 'Na, erzähl mal!'], ['Oi! E você, o que diz?', 'Hi! Und was sagst du?'], ['Fala aí, tudo certo?', 'Erzähl, alles klar?']],
    reactions: [['Ah, entendi.', 'Ah, verstehe.'], ['Claro, faz sentido.', 'Klar, das ergibt Sinn.'], ['Que interessante!', 'Wie interessant!']],
  },
};

const PARTNER_NAME: Record<Song['variant'], string> = { 'es-ES': 'Lucía', 'es-LA': 'Mateo', 'pt-BR': 'Bia' };

// ───────────────────────── Kleine Helfer ─────────────────────────

/** Md-Steuerzeichen aus fremdem Text entfernen (Nutzertexte bleiben reiner Text). */
const plain = (s: string) => (s ?? '').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim();
/** Übersetzung/Zeile ohne hängendes Komma o. Ä. (Zeilenumbrüche im Lied) */
const tidy = (s: string) => plain(s).replace(/[\s,;:–-]+$/u, '');
/** Zielsprache in Md (antippbar zum Vorlesen) */
const q = (s: string) => `\`${tidy(s).replace(/`/g, "'")}\``;
/** Alltagshinweis aus dem Glossar nur, wenn er wirklich etwas erklärt */
const everydayHint = (md: Md | undefined, fallback?: Md): Md | undefined =>
  md && plain(md).length >= 20 ? `Im Alltag: ${md}` : fallback;
const words = (s: string) => normalize(s).split(' ').filter(Boolean);
const lowerFirst = (s: string) => (s ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s);

/** grobe Klangähnlichkeit (b/v, s/z/c, ll/y, stummes h …), damit Ablenker nicht gleich klingen */
function soundKey(s: string): string {
  return stripAccents(normalize(s))
    .replace(/h/g, '')
    .replace(/v/g, 'b')
    .replace(/qu/g, 'k')
    .replace(/c([ei])/g, 's$1')
    .replace(/[zç]/g, 's')
    .replace(/c/g, 'k')
    .replace(/ll/g, 'y')
    .replace(/ss/g, 's')
    .replace(/(.)\1+/g, '$1');
}

function rngFor(seed: string | number | undefined, salt: string): () => number {
  return seededRandom(hashString(`${seed ?? 0}|${salt}`));
}

function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** bis zu n eindeutige Einträge (nach looseKey), ohne ausgeschlossene */
function pickDistinct(pool: readonly string[], n: number, exclude: (s: string) => boolean, taken: string[] = []): string[] {
  const seen = new Set(taken.map(looseKey));
  const out: string[] = [];
  for (const p of pool) {
    const k = looseKey(p);
    if (!k || seen.has(k) || exclude(p)) continue;
    seen.add(k);
    out.push(p);
    if (out.length >= n) break;
  }
  return out;
}

function withOptions(correct: string, distractors: string[], rnd: () => number): { options: string[]; answer: number } {
  const options = shuffle([correct, ...distractors], rnd);
  return { options, answer: options.indexOf(correct) };
}

const fb = (rule: Md, why?: Md, avoid?: Md): Feedback => {
  const f: Feedback = { rule };
  if (why && why.trim()) f.why = why;
  if (avoid && avoid.trim()) f.avoid = avoid;
  return f;
};

type PosClass = 'verb' | 'noun' | 'adj' | 'adv' | 'phrase' | 'name' | 'other';
function posClass(pos: string): PosClass {
  const p = pos.toLowerCase();
  if (p.startsWith('verb')) return 'verb';
  if (p.startsWith('nomen')) return 'noun';
  if (p.startsWith('adjektiv')) return 'adj';
  if (p.startsWith('adverb')) return 'adv';
  if (p.startsWith('wendung')) return 'phrase';
  if (p.startsWith('eigenname')) return 'name';
  return 'other';
}
const CONTENT: PosClass[] = ['verb', 'noun', 'adj', 'adv', 'phrase'];

// ───────────────────────── Song-Analyse ─────────────────────────

/** Hat der Song geprüfte Übersetzungen/Erklärungen? (Eigene Texte: nein) */
export function isAnnotated(song: Song): boolean {
  return song.license.kind !== 'user-private' && song.lines.some((l) => Boolean(l.natural?.trim()));
}

interface Word {
  lineIdx: number;
  tokIdx: number;
  text: string;
  key: string;
  gloss?: GlossEntry;
  glossKey?: string;
  cls: PosClass;
  /** Inhaltswort, das allein als Lücke/Hörwort taugt */
  content: boolean;
}

interface Ctx {
  song: Song;
  lang: Lang;
  annotated: boolean;
  seed: string | number;
  words: Word[];
  /** Zeilen-Index nach ID */
  lineIndex: Map<string, number>;
}

const glossOf = (song: Song, tok: SongToken): GlossEntry | undefined => (tok.g ? song.glossary[tok.g] : undefined);

function analyze(song: Song, seed: string | number): Ctx {
  const lang = langOf(song);
  const annotated = isAnnotated(song);
  const out: Word[] = [];
  song.lines.forEach((line, lineIdx) => {
    const keyCount = new Map<string, number>();
    for (const t of line.tokens) if (!t.p && t.g) keyCount.set(t.g, (keyCount.get(t.g) ?? 0) + 1);
    let firstWord = true;
    line.tokens.forEach((tok, tokIdx) => {
      if (tok.p) return;
      const key = looseKey(tok.t);
      const gloss = glossOf(song, tok);
      const cls: PosClass = gloss ? posClass(gloss.pos) : 'other';
      let content: boolean;
      if (gloss) {
        content = CONTENT.includes(cls) && (keyCount.get(tok.g as string) ?? 0) === 1;
      } else {
        const letters = /^[\p{L}'’-]+$/u.test(tok.t);
        const capitalMid = !firstWord && /^\p{Lu}/u.test(tok.t);
        content = !annotated && letters && key.length >= 3 && !STOPWORDS[lang].has(key) && !capitalMid;
      }
      if (content && countGaps(tok.t) > 0) content = false;
      out.push({ lineIdx, tokIdx, text: tok.t, key, gloss, glossKey: tok.g, cls, content });
      firstWord = false;
    });
  });
  return { song, lang, annotated, seed, words: out, lineIndex: new Map(song.lines.map((l, i) => [l.id, i])) };
}

const wordTokens = (line: SongLine) => line.tokens.filter((t) => !t.p);
const lineTopics = (line: SongLine) => [...new Set(line.explanation.grammar.map((g) => g.topicId).filter((t): t is string => Boolean(t)))];
const naturalOf = (ctx: Ctx, line: SongLine) => (ctx.annotated ? tidy(line.natural) : '');
const exId = (ctx: Ctx, typ: string, n: number) => `${ctx.song.id}.x.${typ}.${n}`;

function wordVocab(ctx: Ctx, w: Word): VocabFocus[] {
  if (!ctx.annotated || !w.gloss || !w.glossKey) return [];
  const front = w.tokIdx === firstWordIdx(ctx.song.lines[w.lineIdx]) && w.cls !== 'name' ? lowerFirst(w.text) : w.text;
  const v: VocabFocus = { itemId: `song:${ctx.song.id}:${w.glossKey.toLowerCase()}`, kind: 'vocab', front, back: plain(w.gloss.meaning) };
  if (w.gloss.lemma && looseKey(w.gloss.lemma) !== looseKey(front)) v.hint = `Grundform: ${w.gloss.lemma}`;
  return [v];
}

function lineVocab(ctx: Ctx, line: SongLine): VocabFocus[] {
  const back = naturalOf(ctx, line);
  return back ? [{ itemId: `song:${ctx.song.id}:${line.id}`, kind: 'phrase', front: line.text, back }] : [];
}

function firstWordIdx(line: SongLine): number {
  return line.tokens.findIndex((t) => !t.p);
}

/** Anzeigeform eines Worts in Auswahl/Wortbank (Satzanfang klein, Eigennamen unverändert) */
function displayWord(ctx: Ctx, w: Word): string {
  const line = ctx.song.lines[w.lineIdx];
  return w.tokIdx === firstWordIdx(line) && w.cls !== 'name' && (ctx.annotated || /^\p{Lu}\p{Ll}*$/u.test(w.text)) ? lowerFirst(w.text) : w.text;
}

// ───────────────────────── Validierung ─────────────────────────

/**
 * Prüft eine Übung wie src/content/validate.ts (Struktur je Typ) und verlangt, dass die Musterlösung
 * von der echten Bewertung als richtig erkannt wird. Leeres Ergebnis = gültig.
 */
export function checkExercise(ex: Exercise): string[] {
  const errs: string[] = [];
  const err = (m: string) => errs.push(`${ex.id}: ${m}`);
  if (!ex.id) err('id fehlt');
  if (!ex.skills?.length) err('skills fehlt');
  if (!ex.feedback?.rule?.trim()) err('feedback.rule fehlt');
  const idxOk = (i: number | undefined, n: number) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < n;
  switch (ex.type) {
    case 'mc':
      if (ex.options.length < 2) err('mindestens 2 Optionen nötig');
      if (!idxOk(ex.answer, ex.options.length)) err('answer außerhalb der Optionen');
      if (new Set(ex.options.map((o) => looseKey(o.text))).size !== ex.options.length) err('doppelte Optionen');
      if (ex.options.some((o) => !o.text.trim())) err('leere Option');
      break;
    case 'listening':
      if (ex.options.length < 2) err('mindestens 2 Optionen nötig');
      if (!idxOk(ex.answer, ex.options.length)) err('answer außerhalb der Optionen');
      if (!ex.audio.trim()) err('audio fehlt');
      if (new Set(ex.options.map(looseKey)).size !== ex.options.length) err('doppelte Optionen');
      break;
    case 'dialogue':
      if (!idxOk(ex.gapIndex, ex.lines.length)) err('gapIndex außerhalb der Zeilen');
      if (!ex.options || !idxOk(ex.answer, ex.options.length)) err('answer außerhalb der Optionen');
      else if (new Set(ex.options.map(looseKey)).size !== ex.options.length) err('doppelte Optionen');
      break;
    case 'cloze': {
      const gaps = countGaps(ex.sentence);
      if (gaps === 0) err('Satz ohne Lücke');
      if (gaps !== ex.answers.length) err(`${gaps} Lücken, aber ${ex.answers.length} Antwortlisten`);
      ex.answers.forEach((a, i) => { if (!a.length || a.some((x) => !x.trim())) err(`leere Lösung für Lücke ${i + 1}`); });
      if (ex.bank) {
        const bank = new Set(ex.bank.map((b) => b.trim().toLowerCase()));
        if (bank.size !== ex.bank.length) err('doppelte Einträge in der Wortbank');
        ex.answers.forEach((a, i) => { if (!a.some((x) => bank.has(x.trim().toLowerCase()))) err(`Wortbank ohne Lösung für Lücke ${i + 1}`); });
      }
      break;
    }
    case 'order': {
      if (ex.tokens.length < 2) err('mindestens 2 Tokens nötig');
      if (ex.tokens.some((t) => !t.trim())) err('leeres Token');
      const tokenSet = new Set(ex.tokens.map((t) => t.trim().toLowerCase()));
      for (const x of ex.extra ?? []) if (tokenSet.has(x.trim().toLowerCase())) err(`Ablenker „${x}“ ist Teil der Lösung`);
      break;
    }
    case 'dictation':
    case 'conjugate':
      if (!ex.answers.length || ex.answers.some((a) => !a.trim())) err('answers leer');
      break;
    case 'speak':
      if (!ex.text.trim()) err('text fehlt');
      break;
    case 'matchPairs': {
      if (ex.pairs.length < 2) err('mindestens 2 Paare nötig');
      if (new Set(ex.pairs.map((p) => p.left)).size !== ex.pairs.length) err('linke Seite nicht eindeutig');
      if (new Set(ex.pairs.map((p) => looseKey(p.right))).size !== ex.pairs.length) err('rechte Seite nicht eindeutig');
      break;
    }
    default:
      break;
  }
  try {
    const outcome = gradeExercise(ex, canonicalAnswer(ex), { strictAccents: true });
    if (!outcome.correct) err('Musterlösung wird nicht als richtig erkannt');
  } catch (e) {
    err(`Bewertung wirft einen Fehler (${(e as Error).message})`);
  }
  return errs;
}

const isValid = (se: SongExercise) => checkExercise(se.exercise).length === 0;

// ───────────────────────── Generatoren je Art ─────────────────────────

function contentPool(ctx: Ctx, w: Word): string[] {
  const rnd = rngFor(ctx.seed, `pool:${w.lineIdx}:${w.tokIdx}`);
  const lineKeys = new Set(ctx.words.filter((x) => x.lineIdx === w.lineIdx).map((x) => x.key));
  const others = ctx.words.filter((x) => x.content && x.key !== w.key && !lineKeys.has(x.key));
  const same = shuffle(others.filter((x) => x.cls === w.cls), rnd).map((x) => displayWord(ctx, x));
  const rest = shuffle(others.filter((x) => x.cls !== w.cls), rnd).map((x) => displayWord(ctx, x));
  return [...same, ...rest, ...shuffle(FALLBACK_WORDS[ctx.lang], rnd)];
}

function clozeCandidates(ctx: Ctx): SongExercise[] {
  const out: SongExercise[] = [];
  const { song } = ctx;
  for (const w of ctx.words) {
    if (!w.content) continue;
    const line = song.lines[w.lineIdx];
    const lineWords = ctx.words.filter((x) => x.lineIdx === w.lineIdx);
    if (lineWords.length < 3 || lineWords.filter((x) => x.key === w.key).length > 1) continue;
    const rnd = rngFor(ctx.seed, `cloze:${w.lineIdx}:${w.tokIdx}`);
    const sentence = joinLyricTokens(line.tokens.map((t, j) => (j === w.tokIdx ? { t: '___' } : t)));
    const shown = displayWord(ctx, w);
    const distractors = pickDistinct(contentPool(ctx, w), 3, (s) => soundKey(s) === soundKey(shown), [shown]);
    if (distractors.length < 2) continue;
    const bank = shuffle([shown, ...distractors], rnd);
    const natural = naturalOf(ctx, line);
    const g = w.gloss;
    const feedback = g && ctx.annotated
      ? fb(
        `${q(w.text)} = ${plain(g.meaning)}${g.form ? ` (${plain(g.form)})` : ''}.`,
        g.grammar ?? g.colloquial ?? line.explanation.summary,
        everydayHint(g.everyday, 'Sprich die ganze Zeile einmal laut – im Zusammenhang bleibt das Wort besser hängen.'),
      )
      : fb(
        `In der Zeile steht ${q(w.text)}: ${q(line.text)}`,
        undefined,
        'Hör dir die Zeile im Player an und sing sie mit – so bleibt das Wort im Ohr.',
      );
    const ex: Exercise = {
      id: exId(ctx, 'cloze', (w.lineIdx + 1) * 100 + w.tokIdx),
      type: 'cloze',
      skills: ['vocabulary', 'reading'],
      difficulty: line.difficulty,
      instruction: 'Welches Wort fehlt in der Liedzeile?',
      sentence,
      answers: [[w.text]],
      bank,
      feedback,
    };
    if (natural) ex.german = natural;
    out.push({ exercise: ex, kind: 'cloze', lineIds: [line.id], vocab: wordVocab(ctx, w) });
  }
  return out;
}

function orderCandidates(ctx: Ctx): SongExercise[] {
  const out: SongExercise[] = [];
  const { song } = ctx;
  // a) Wörter einer Zeile
  song.lines.forEach((line, i) => {
    const toks = ctx.words.filter((w) => w.lineIdx === i);
    if (toks.length < 3 || toks.length > 10 || new Set(toks.map((w) => w.key)).size < 2) return;
    const tokens = toks.map((w, j) => (j === 0 ? displayWord(ctx, w) : w.text));
    const natural = naturalOf(ctx, line);
    const g = ctx.annotated ? line.explanation.grammar[0] : undefined;
    const topics = ctx.annotated ? lineTopics(line) : [];
    const ex: Exercise = {
      id: exId(ctx, 'order', i + 1),
      type: 'order',
      skills: ['grammar', 'reading'],
      difficulty: line.difficulty,
      instruction: 'Bringe die Wörter in die Reihenfolge der Liedzeile.',
      tokens,
      german: natural || `Zeile ${i + 1} aus „${plain(song.title)}“`,
      feedback: fb(
        `Die Zeile lautet: ${q(line.text)}${g ? `\n\n**${plain(g.title)}:** ${g.md}` : ''}`,
        ctx.annotated && line.literal ? `Wörtlich: „${plain(line.literal)}“ – daran siehst du, wie der Satz gebaut ist.` : undefined,
        'Such zuerst das Verb und baue den Satz darum herum auf.',
      ),
    };
    if (topics.length) ex.topicIds = topics;
    out.push({ exercise: ex, kind: 'order', lineIds: [line.id], vocab: lineVocab(ctx, line) });
  });
  // b) Zeilen eines Abschnitts
  song.sections.forEach((sec, sIdx) => {
    const lines = song.lines.filter((l) => l.sectionId === sec.id);
    if (lines.length < 3) return;
    const windows: SongLine[][] = [];
    for (let start = 0; start < lines.length; start += 4) {
      const w = lines.slice(start, start + 4);
      if (w.length >= 3) windows.push(w);
      else if (lines.length > 4) windows.push(lines.slice(-4));
    }
    windows.forEach((win, wIdx) => {
      if (new Set(win.map((l) => looseKey(l.text))).size < 3) return;
      const ex: Exercise = {
        id: exId(ctx, 'orderlines', (sIdx + 1) * 10 + wIdx),
        type: 'order',
        skills: ['reading', 'listening'],
        difficulty: 2,
        instruction: 'Bringe die Zeilen in die Reihenfolge des Songs.',
        tokens: win.map((l) => l.text),
        german: `Abschnitt „${plain(sec.label)}“`,
        feedback: fb(
          `Reihenfolge im Abschnitt „${plain(sec.label)}“:\n${win.map((l) => `- ${q(l.text)}`).join('\n')}`,
          undefined,
          'Achte auf Handlung und Reim: Was passiert zuerst, was folgt daraus?',
        ),
      };
      out.push({ exercise: ex, kind: 'order', lineIds: win.map((l) => l.id), vocab: [] });
    });
  });
  return out;
}

function heardCandidates(ctx: Ctx): SongExercise[] {
  const out: SongExercise[] = [];
  const { song } = ctx;
  song.lines.forEach((line, i) => {
    const toks = ctx.words.filter((w) => w.lineIdx === i);
    if (toks.length < 3) return;
    const rnd = rngFor(ctx.seed, `heard:${i}`);
    const content = toks.filter((w) => w.content);
    const pool = content.length ? content : toks.filter((w) => w.key.length >= 3 && w.cls !== 'name');
    if (!pool.length) return;
    const target = pool[Math.floor(rnd() * pool.length)];
    const shown = displayWord(ctx, target);
    const lineSounds = new Set(toks.map((w) => soundKey(w.text)));
    const lineKeys = new Set(toks.map((w) => w.key));
    const len = shown.length;
    const others = shuffle(ctx.words.filter((w) => w.lineIdx !== i && w.key.length >= 3 && !lineKeys.has(w.key)), rnd)
      .sort((a, b) => Math.abs(a.text.length - len) - Math.abs(b.text.length - len))
      .slice(0, 10);
    const candidates = [...shuffle(others, rnd).map((w) => displayWord(ctx, w)), ...shuffle(FALLBACK_WORDS[ctx.lang], rnd)];
    const distractors = pickDistinct(candidates, 3, (s) => lineKeys.has(looseKey(s)) || lineSounds.has(soundKey(s)) || words(s).length !== 1, [shown]);
    if (distractors.length < 2) return;
    const { options, answer } = withOptions(shown, distractors, rnd);
    const natural = naturalOf(ctx, line);
    const ex: Exercise = {
      id: exId(ctx, 'heard', i + 1),
      type: 'listening',
      skills: ['listening'],
      difficulty: line.difficulty,
      instruction: 'Hör dir die Zeile an.',
      audio: line.text,
      question: 'Welches dieser Wörter kommt in der Zeile vor?',
      options,
      answer,
      feedback: fb(
        `Du hörst ${q(target.text)} – in ${q(line.text)}`,
        natural ? `Die Zeile bedeutet: „${natural}“` : undefined,
        'Hör ruhig mehrmals hin – beim zweiten Mal gern langsam (Schnecken-Symbol).',
      ),
    };
    out.push({ exercise: ex, kind: 'heard', lineIds: [line.id], vocab: wordVocab(ctx, target) });
  });
  return out;
}

function matchCandidates(ctx: Ctx): SongExercise[] {
  if (!ctx.annotated) return [];
  const eligible = ctx.song.lines.filter((l) => l.natural.trim() && l.text.length <= 80);
  const groups: SongLine[][] = [];
  let cur: SongLine[] = [];
  const fits = (g: SongLine[], l: SongLine) =>
    !g.some((x) => looseKey(x.text) === looseKey(l.text) || looseKey(x.natural) === looseKey(l.natural));
  for (const l of eligible) {
    if (!fits(cur, l)) continue;
    cur.push(l);
    if (cur.length === 4) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length >= 3) groups.push(cur);
  else if (cur.length > 0 && groups.length) {
    // Rest mit Zeilen vom Ende auffüllen (stabil)
    const fill = [...cur];
    for (const l of [...eligible].reverse()) {
      if (fill.length >= 4) break;
      if (!fill.includes(l) && fits(fill, l)) fill.push(l);
    }
    if (fill.length >= 3) groups.push(ctx.song.lines.filter((l) => fill.includes(l)));
  }
  return groups.map((g, gi) => {
    const ex: Exercise = {
      id: exId(ctx, 'match', gi + 1),
      type: 'matchPairs',
      skills: ['reading', 'vocabulary'],
      difficulty: Math.max(...g.map((l) => l.difficulty)) as 1 | 2 | 3,
      instruction: 'Verbinde jede Liedzeile mit ihrer Bedeutung.',
      pairs: g.map((l) => ({ left: l.text, right: tidy(l.natural) })),
      feedback: fb(
        g.map((l) => `- ${q(l.text)} → ${plain(l.natural)}`).join('\n'),
        'Übersetze nicht Wort für Wort – achte auf Schlüsselwörter wie Verben und Nomen.',
        'Lies die Zeile laut und frag dich: Wer tut was, wo, wann?',
      ),
    };
    return { exercise: ex, kind: 'match' as const, lineIds: g.map((l) => l.id), vocab: g.flatMap((l) => lineVocab(ctx, l)) };
  });
}

const PERSONS: Record<Lang, Record<string, string>> = {
  es: { '1S': 'yo', '2S': 'tú', '3S': 'él/ella/usted', '1P': 'nosotros', '2P': 'vosotros', '3P': 'ellos/ellas/ustedes' },
  pt: { '1S': 'eu', '2S': 'tu', '3S': 'ele/ela/você', '1P': 'nós', '2P': 'vocês', '3P': 'eles/elas/vocês' },
};
const PRONOUN_RE = /\((yo|tú|vos|él\/ella|él|ella|usted|nosotros|nosotras|vosotros|ustedes|ellos|eu|você|ele\/ela|nós|vocês|eles)\)/;

/** Zeitform und Person aus der Verb-Analyse (z. B. „Präsens, 3. Person Singular – …“) */
export function parseVerbAnalysis(analysis: string, lang: Lang, variant: Song['variant']): { tense: string; person: string } | null {
  if (/reflexiv|kurzform|umgangssprach|imperativ|befehlsform|gerundium|infinitiv|unpersönlich/i.test(analysis)) return null;
  const tenseMatch = analysis.match(/^(Präsens|Presente|Indefinido|Imperfekt|Imperfecto|Futur)/i);
  if (!tenseMatch) return null;
  const t = tenseMatch[1].toLowerCase();
  const tense = t === 'presente' || t === 'präsens' ? 'Präsens' : t === 'indefinido' ? 'Indefinido' : t.startsWith('imperf') ? 'Imperfekt' : 'Futur';
  const pm = analysis.match(/([123])\.\s*Person\s+(Singular|Plural)/i);
  if (!pm) return null;
  const code = `${pm[1]}${pm[2].toLowerCase().startsWith('s') ? 'S' : 'P'}`;
  const paren = analysis.match(PRONOUN_RE)?.[1];
  let person = paren ?? PERSONS[lang][code];
  if (!paren && lang === 'es' && code === '2P' && variant === 'es-LA') person = 'ustedes';
  return person ? { tense, person } : null;
}

function verbCandidates(ctx: Ctx): SongExercise[] {
  if (!ctx.annotated) return [];
  const out: SongExercise[] = [];
  const { song, lang } = ctx;
  const infinitives = [
    ...song.lines.flatMap((l) => (l.verbs ?? []).map((v) => v.infinitive)),
    ...Object.values(song.glossary).filter((g) => posClass(g.pos) === 'verb').map((g) => g.lemma),
  ];
  const baseOf = (inf: string) => looseKey(inf).replace(/se$/, '');
  song.lines.forEach((line, i) => {
    (line.verbs ?? []).forEach((v, k) => {
      if (looseKey(v.form) === looseKey(v.infinitive)) return;
      const rnd = rngFor(ctx.seed, `verb:${i}:${k}`);
      const lineToks = ctx.words.filter((w) => w.lineIdx === i);
      const formTok = lineToks.filter((w) => w.key === looseKey(v.form));
      const gloss = formTok[0]?.gloss;
      const pool = [...shuffle(infinitives, rnd), ...shuffle(FALLBACK_VERBS[lang], rnd)];
      const distractors = pickDistinct(pool, 3, (s) => baseOf(s) === baseOf(v.infinitive) || words(s).length !== 1, [v.infinitive]);
      const mentions = (t: string) => [v.form, v.infinitive].some((x) => looseKey(t).split(' ').includes(looseKey(x)));
      const topics = [...new Set(line.explanation.grammar
        .filter((g) => g.topicId && (mentions(g.title) || mentions(g.md)))
        .map((g) => g.topicId as string))];
      const vocab: VocabFocus[] = formTok[0] ? wordVocab(ctx, formTok[0]) : [];
      if (distractors.length >= 2) {
        const { options, answer } = withOptions(v.infinitive, distractors, rnd);
        const ex: Exercise = {
          id: exId(ctx, 'verb', (i + 1) * 100 + k),
          type: 'mc',
          skills: ['grammar', 'vocabulary'],
          difficulty: line.difficulty,
          instruction: 'Finde die Grundform (Infinitiv).',
          prompt: `Welcher Infinitiv steckt in ${q(v.form)}?\n\n${q(line.text)}`,
          options: options.map((text) => ({ text })),
          answer,
          feedback: fb(
            `${q(v.form)} kommt von ${q(v.infinitive)}: ${plain(v.analysis)}.`,
            gloss?.grammar ?? gloss?.form ?? undefined,
            `Lerne Form und Grundform als Paar: ${q(v.form)} ← ${q(v.infinitive)}.`,
          ),
        };
        if (topics.length) ex.topicIds = topics;
        out.push({ exercise: ex, kind: 'verbs', lineIds: [line.id], vocab });
      }
      const parsed = words(v.form).length === 1 ? parseVerbAnalysis(v.analysis, lang, song.variant) : null;
      if (parsed) {
        const sentence = formTok.length === 1
          ? joinLyricTokens(line.tokens.map((t, j) => (j === formTok[0].tokIdx ? { t: '___' } : t)))
          : undefined;
        const ex: Exercise = {
          id: exId(ctx, 'conj', (i + 1) * 100 + k),
          type: 'conjugate',
          skills: ['grammar', 'writing'],
          difficulty: Math.min(3, line.difficulty + 1) as 1 | 2 | 3,
          instruction: 'Bilde die Verbform, die im Song steht.',
          verb: v.infinitive,
          tense: parsed.tense,
          person: parsed.person,
          answers: [v.form],
          feedback: fb(
            `${q(v.infinitive)} → ${q(v.form)} (${plain(v.analysis)})`,
            gloss?.grammar,
            `Sprich die Form laut mit dem Pronomen: ${q(`${parsed.person.split('/')[0]} ${v.form}`)}.`,
          ),
        };
        if (sentence && countGaps(sentence) === 1) ex.sentence = sentence;
        if (topics.length) ex.topicIds = topics;
        out.push({ exercise: ex, kind: 'verbs', lineIds: [line.id], vocab });
      }
    });
  });
  return out;
}

/** Enthält die Zeile ein Schlüsselwort des Regeltitels? (dann wäre der Ablenker ebenfalls richtig) */
function titleConflicts(title: string, lineWordKeys: Set<string>): boolean {
  const parts = stripAccents(title.toLowerCase()).split(/[\s+/=,;:()„“"'…→]+/).filter(Boolean);
  for (const p of parts) {
    if (p.startsWith('-') && p.length > 1) {
      const suf = p.slice(1);
      for (const w of lineWordKeys) if (w.length > suf.length + 1 && w.endsWith(suf)) return true;
    } else if (p.length >= 2 && lineWordKeys.has(p)) return true;
  }
  return false;
}

function grammarCandidates(ctx: Ctx): SongExercise[] {
  if (!ctx.annotated) return [];
  const out: SongExercise[] = [];
  const { song } = ctx;
  const all = song.lines.flatMap((l, li) => l.explanation.grammar.map((g) => ({ g, li })));
  song.lines.forEach((line, i) => {
    const own = new Set(line.explanation.grammar.map((g) => looseKey(g.title)));
    const topics = new Set(lineTopics(line));
    const lineKeys = new Set(ctx.words.filter((w) => w.lineIdx === i).map((w) => w.key));
    line.explanation.grammar.forEach((g, k) => {
      const rnd = rngFor(ctx.seed, `grammar:${i}:${k}`);
      const others = shuffle(all.filter(({ g: o, li }) =>
        li !== i && !own.has(looseKey(o.title)) && !(o.topicId && topics.has(o.topicId)) &&
        looseKey(song.lines[li].text) !== looseKey(line.text) && !titleConflicts(o.title, lineKeys)), rnd);
      const picked: { title: string; li: number }[] = [];
      const seen = new Set([looseKey(g.title)]);
      for (const o of others) {
        const key = looseKey(o.g.title);
        if (seen.has(key)) continue;
        seen.add(key);
        picked.push({ title: plain(o.g.title), li: o.li });
        if (picked.length >= 3) break;
      }
      if (picked.length < 2) return;
      const correct = plain(g.title);
      const { options, answer } = withOptions(correct, picked.map((p) => p.title), rnd);
      const ex: Exercise = {
        id: exId(ctx, 'grammar', (i + 1) * 100 + k),
        type: 'mc',
        skills: ['grammar', 'reading'],
        difficulty: line.difficulty,
        instruction: 'Welche Regel steckt in dieser Zeile?',
        prompt: `Welche Grammatik-Erklärung passt zu dieser Zeile?\n\n${q(line.text)}`,
        options: options.map((text) => {
          const p = picked.find((x) => x.title === text);
          return p ? { text, why: `Diese Regel gehört zu einer anderen Zeile: ${q(song.lines[p.li].text)}` } : { text };
        }),
        answer,
        feedback: fb(
          `**${correct}:** ${g.md}`,
          'Die anderen Erklärungen gehören zu anderen Zeilen des Songs.',
          line.explanation.everyday || undefined,
        ),
      };
      const tIds = g.topicId ? [g.topicId] : [...topics];
      if (tIds.length) ex.topicIds = tIds;
      out.push({ exercise: ex, kind: 'grammar', lineIds: [line.id], vocab: [] });
    });
  });
  return out;
}

interface Idiom { li: number; n: number; phrase: string; meaning: string; md?: Md; everyday?: Md; itemKey: string }

function idiomsOf(ctx: Ctx): Idiom[] {
  if (!ctx.annotated) return [];
  const { song } = ctx;
  const out: Idiom[] = [];
  const seen = new Set<string>();
  song.lines.forEach((line, li) => {
    (line.explanation.idioms ?? []).forEach((id, k) => {
      const key = looseKey(id.phrase);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ li, n: (li + 1) * 100 + k, phrase: plain(id.phrase), meaning: plain(id.meaning), md: id.md, itemKey: id.phrase.toLowerCase() });
    });
    // Wendungen/Umgangssprache aus dem Glossar
    const byKey = new Map<string, number[]>();
    line.tokens.forEach((t, j) => { if (!t.p && t.g) byKey.set(t.g, [...(byKey.get(t.g) ?? []), j]); });
    let k2 = 0;
    for (const [gk, idxs] of byKey) {
      const g = song.glossary[gk];
      if (!g || !(posClass(g.pos) === 'phrase' || g.register === 'umgangssprachlich')) continue;
      const phrase = idxs.map((j) => line.tokens[j].t).join(' ');
      const key = looseKey(phrase);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ li, n: (li + 1) * 100 + 20 + k2++, phrase, meaning: plain(g.meaning), md: g.colloquial ?? g.grammar, everyday: g.everyday, itemKey: gk.toLowerCase() });
    }
  });
  return out;
}

function idiomCandidates(ctx: Ctx): SongExercise[] {
  const idioms = idiomsOf(ctx);
  if (!idioms.length) return [];
  const { song } = ctx;
  const glossMeanings = Object.values(song.glossary).filter((g) => CONTENT.includes(posClass(g.pos))).map((g) => plain(g.meaning));
  const overlaps = (a: string, b: string) => {
    const x = looseKey(a);
    const y = looseKey(b);
    return x === y || x.includes(y) || y.includes(x);
  };
  return idioms.flatMap((id): SongExercise[] => {
    const rnd = rngFor(ctx.seed, `idiom:${id.n}`);
    const line = song.lines[id.li];
    const pool = [...shuffle(idioms.filter((o) => o !== id).map((o) => o.meaning), rnd), ...shuffle(glossMeanings, rnd)];
    const distractors = pickDistinct(pool, 3, (s) => overlaps(s, id.meaning), [id.meaning]);
    if (distractors.length < 2) return [];
    const { options, answer } = withOptions(id.meaning, distractors, rnd);
    const showLine = looseKey(line.text) !== looseKey(id.phrase);
    const ex: Exercise = {
      id: exId(ctx, 'idiom', id.n),
      type: 'mc',
      skills: ['vocabulary', 'reading'],
      difficulty: line.difficulty,
      instruction: 'Was bedeutet die Wendung im Song?',
      prompt: `Was bedeutet ${q(id.phrase)} hier?${showLine ? `\n\n${q(line.text)}` : ''}`,
      options: options.map((text) => ({ text })),
      answer,
      feedback: fb(
        `${q(id.phrase)} bedeutet hier: ${id.meaning}.`,
        id.md,
        everydayHint(id.everyday, 'Lerne Wendungen als Ganzes – Wort für Wort übersetzt ergeben sie oft keinen Sinn.'),
      ),
    };
    const vocab: VocabFocus[] = [{ itemId: `song:${song.id}:${id.itemKey}`, kind: 'phrase', front: id.phrase, back: id.meaning }];
    return [{ exercise: ex, kind: 'idioms', lineIds: [line.id], vocab }];
  });
}

function dictationCandidates(ctx: Ctx): SongExercise[] {
  return ctx.song.lines.flatMap((line, i): SongExercise[] => {
    const n = wordTokens(line).length;
    if (n < 3 || n > 12) return [];
    const natural = naturalOf(ctx, line);
    const ex: Exercise = {
      id: exId(ctx, 'dictation', i + 1),
      type: 'dictation',
      skills: ['listening', 'writing'],
      difficulty: line.difficulty,
      instruction: 'Hör zu und schreib die Liedzeile auf.',
      audio: line.text,
      answers: [line.text],
      feedback: fb(
        `Die Zeile lautet: ${q(line.text)}${ctx.annotated && line.phonetic ? `\n\nAussprachehilfe: ${plain(line.phonetic)}` : ''}`,
        natural ? `Bedeutung: „${natural}“` : undefined,
        'Hör zuerst ganz zu, dann langsam (Schnecken-Symbol) – und schreib Wort für Wort mit.',
      ),
    };
    if (natural) ex.german = natural;
    return [{ exercise: ex, kind: 'dictation', lineIds: [line.id], vocab: lineVocab(ctx, line) }];
  });
}

function speakCandidates(ctx: Ctx): SongExercise[] {
  return ctx.song.lines.flatMap((line, i): SongExercise[] => {
    const n = wordTokens(line).length;
    if (n < 2 || n > 14) return [];
    const natural = naturalOf(ctx, line);
    const phon = ctx.annotated ? plain(line.phonetic) : '';
    const ex: Exercise = {
      id: exId(ctx, 'speak', i + 1),
      type: 'speak',
      skills: ['pronunciation', 'speaking'],
      difficulty: line.difficulty,
      instruction: 'Sprich die Liedzeile nach.',
      text: line.text,
      german: natural || 'Zeile aus deinem eigenen Text',
      feedback: fb(
        phon ? `So klingt die Zeile: ${phon}` : 'Sprich ruhig und deutlich – Silbe für Silbe, im Rhythmus des Songs.',
        'Bewertet wird die Verständlichkeit laut Spracherkennung – das ist keine phonetische Analyse.',
        phon
          ? 'Erst anhören, dann im gleichen Tempo nachsprechen. GROSS geschriebene Silben betonen.'
          : 'Erst anhören, dann im gleichen Tempo nachsprechen.',
      ),
    };
    if (phon) ex.phonetic = phon;
    if (ctx.annotated && line.ipa) ex.ipa = line.ipa;
    return [{ exercise: ex, kind: 'speak', lineIds: [line.id], vocab: [] }];
  });
}

interface Phrase { li: number; k: number; target: string; german: string }

/** Alltagstaugliche Formulierungen einer Zeile: Beispiele aus `everyday` und `alternatives`. */
function phrasesOf(ctx: Ctx): Phrase[] {
  if (!ctx.annotated) return [];
  const out: Phrase[] = [];
  const seen = new Set<string>();
  ctx.song.lines.forEach((line, li) => {
    const found: { target: string; german: string }[] = [];
    const re = /`([^`]+)`\s*\(([^)]+)\)/g;
    for (const m of (line.explanation.everyday ?? '').matchAll(re)) found.push({ target: m[1], german: m[2] });
    for (const a of line.explanation.alternatives) found.push({ target: a.target, german: a.german });
    let k = 0;
    for (const f of found) {
      const target = plain(f.target);
      const german = plain(f.german);
      const n = words(target).length;
      if (n < 2 || n > 12 || !german || seen.has(looseKey(target))) continue;
      seen.add(looseKey(target));
      out.push({ li, k: k++, target, german });
    }
  });
  return out;
}

function dialogueCandidates(ctx: Ctx): SongExercise[] {
  const phrases = phrasesOf(ctx);
  if (phrases.length < 3) return [];
  const { song, lang } = ctx;
  const frame = DIALOGUE_FRAME[lang];
  const partner = PARTNER_NAME[song.variant] ?? 'Alex';
  return phrases.flatMap((p): SongExercise[] => {
    const rnd = rngFor(ctx.seed, `dialogue:${p.li}:${p.k}`);
    const line = song.lines[p.li];
    const others = shuffle(phrases.filter((o) => o.li !== p.li && looseKey(o.german) !== looseKey(p.german)), rnd)
      .sort((a, b) => Math.abs(a.target.length - p.target.length) - Math.abs(b.target.length - p.target.length))
      .slice(0, 6);
    const distractors = pickDistinct(shuffle(others, rnd).map((o) => o.target), 3, () => false, [p.target]);
    if (distractors.length < 2) return [];
    const { options, answer } = withOptions(p.target, distractors, rnd);
    const [opener, openerDe] = frame.openers[Math.floor(rnd() * frame.openers.length)];
    const [reaction, reactionDe] = frame.reactions[Math.floor(rnd() * frame.reactions.length)];
    const ex: Exercise = {
      id: exId(ctx, 'dialogue', (p.li + 1) * 100 + p.k),
      type: 'dialogue',
      skills: ['vocabulary', 'reading'],
      difficulty: line.difficulty,
      instruction: `Du möchtest sagen: „${p.german}“ – welche Formulierung passt?`,
      lines: [
        { speaker: partner, text: opener, german: openerDe },
        { speaker: 'Du', text: p.target, german: p.german },
        { speaker: partner, text: reaction, german: reactionDe },
      ],
      gapIndex: 1,
      options,
      answer,
      feedback: fb(
        `${q(p.target)} – „${p.german}“${line.explanation.everyday ? `\n\n${line.explanation.everyday}` : ''}`,
        'Die anderen Sätze stammen aus anderen Stellen des Songs und bedeuten etwas anderes.',
        'Sprich die Formulierung ein paarmal laut – dann ist sie im Gespräch sofort da.',
      ),
    };
    const vocab: VocabFocus[] = [{ itemId: `song:${song.id}:alt:${looseKey(p.target).slice(0, 80)}`, kind: 'phrase', front: p.target, back: p.german }];
    return [{ exercise: ex, kind: 'dialogue', lineIds: [line.id], vocab }];
  });
}

const GENERATORS: Record<SongExKind, (ctx: Ctx) => SongExercise[]> = {
  cloze: clozeCandidates,
  order: orderCandidates,
  heard: heardCandidates,
  match: matchCandidates,
  verbs: verbCandidates,
  grammar: grammarCandidates,
  idioms: idiomCandidates,
  dictation: dictationCandidates,
  speak: speakCandidates,
  dialogue: dialogueCandidates,
};

// ───────────────────────── Pool, Gewichtung, Runden ─────────────────────────

export type SongExercisePool = Record<SongExKind, SongExercise[]>;

/** Alle gültigen Aufgaben des Songs je Art (Seed bestimmt nur Ablenker/Mischung). */
export function buildPool(song: Song, seed: string | number = 0): SongExercisePool {
  const ctx = analyze(song, seed);
  const pool = {} as SongExercisePool;
  for (const meta of SONG_EX_KINDS) {
    pool[meta.key] = meta.needsAnnotations && !ctx.annotated ? [] : GENERATORS[meta.key](ctx).filter(isValid);
  }
  return pool;
}

/** Verfügbare Arten mit Anzahl der Aufgaben pro Runde (höchstens KIND_ROUND). */
export function availableKinds(pool: SongExercisePool): { kind: SongExKind; available: number; roundSize: number }[] {
  return SONG_EX_KINDS
    .map((m) => ({ kind: m.key, available: pool[m.key].length, roundSize: Math.min(KIND_ROUND, pool[m.key].length) }))
    .filter((k) => k.available > 0);
}

/** Schwäche je Zeile (0 = sicher, > 100 = mit offenen Fehlern): niedrige Werte, Fehler und Schwierigkeit. */
export function lineWeakness(song: Song, focus: LineFocus = {}): Map<string, number> {
  const errors = new Set(focus.errorLineIds ?? []);
  const out = new Map<string, number>();
  for (const line of song.lines) {
    const scores = [focus.lineScores?.[line.id], focus.pronScores?.[line.id]].filter((x): x is number => typeof x === 'number');
    let w = scores.length ? 100 - scores.reduce((a, b) => a + b, 0) / scores.length : 30 + line.difficulty * 10;
    if (errors.has(line.id)) w += 35;
    out.set(line.id, Math.max(0, Math.min(135, w)));
  }
  return out;
}

export const WEAK_THRESHOLD = 40;

/** Schwierige Zeilen (schwächste zuerst, Wiederholungen des Refrains nur einmal). */
export function weakLines(song: Song, focus: LineFocus = {}, max = 5): SongLine[] {
  const weak = lineWeakness(song, focus);
  const seen = new Set<string>();
  return song.lines
    .map((l, i) => ({ l, i, w: weak.get(l.id) ?? 0 }))
    .filter((x) => x.w >= WEAK_THRESHOLD)
    .sort((a, b) => b.w - a.w || a.i - b.i)
    .filter((x) => {
      const k = looseKey(x.l.text);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, max)
    .map((x) => x.l);
}

function weightOf(se: SongExercise, weak: Map<string, number>): number {
  const ws = se.lineIds.map((id) => weak.get(id) ?? 0);
  return ws.length ? Math.max(...ws) / 100 : 0.4;
}

/** gewichtete Zufallsreihenfolge: schwache Zeilen eher vorn, aber nie starr */
function prioritize(items: SongExercise[], weak: Map<string, number>, rnd: () => number): SongExercise[] {
  return items
    .map((se) => ({ se, s: weightOf(se, weak) * 0.6 + rnd() }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.se);
}

/** Gleiche Art nicht direkt hintereinander (soweit möglich). */
function spreadKinds(items: SongExercise[]): SongExercise[] {
  const rest = items.slice();
  const out: SongExercise[] = [];
  while (rest.length) {
    const prev = out[out.length - 1];
    const idx = rest.findIndex((x) => !prev || x.kind !== prev.kind || x.exercise.type !== prev.exercise.type);
    out.push(rest.splice(idx >= 0 ? idx : 0, 1)[0]);
  }
  return out;
}

/** Runde einer einzelnen Art */
export function generateKind(song: Song, kind: SongExKind, opts: GenerateOptions = {}): SongExercise[] {
  const seed = opts.seed ?? 0;
  const pool = buildPool(song, seed)[kind];
  const rnd = rngFor(seed, `kind:${kind}`);
  return prioritize(pool, lineWeakness(song, opts.focus), rnd).slice(0, opts.count ?? KIND_ROUND);
}

const MIXED_CAPS: Partial<Record<SongExKind, number>> = { speak: 2, match: 1, dialogue: 2, dictation: 2 };

/** Gemischte Runde: alle verfügbaren Arten im Wechsel, schwache Zeilen bevorzugt. */
export function generateMixed(song: Song, opts: GenerateOptions = {}): SongExercise[] {
  const seed = opts.seed ?? 0;
  const count = opts.count ?? MIXED_ROUND;
  const pool = buildPool(song, seed);
  const weak = lineWeakness(song, opts.focus);
  const rnd = rngFor(seed, 'mixed');
  const kinds = shuffle(SONG_EX_KINDS.map((m) => m.key).filter((k) => pool[k].length > 0), rnd);
  const queues = new Map(kinds.map((k) => [k, prioritize(pool[k], weak, rnd)]));
  const used = new Map<SongExKind, number>();
  const out: SongExercise[] = [];
  const usedLines = new Map<string, number>();
  let progressed = true;
  while (out.length < count && progressed) {
    progressed = false;
    for (const k of kinds) {
      if (out.length >= count) break;
      if ((used.get(k) ?? 0) >= (MIXED_CAPS[k] ?? Infinity)) continue;
      const q2 = queues.get(k) as SongExercise[];
      // dieselbe Zeile höchstens zweimal pro Runde
      const idx = q2.findIndex((se) => se.lineIds.every((id) => (usedLines.get(id) ?? 0) < 2));
      if (idx < 0) continue;
      const [se] = q2.splice(idx, 1);
      out.push(se);
      used.set(k, (used.get(k) ?? 0) + 1);
      se.lineIds.forEach((id) => usedLines.set(id, (usedLines.get(id) ?? 0) + 1));
      progressed = true;
    }
  }
  return spreadKinds(out);
}

const REVIEW_PREFERENCE: SongExKind[] = ['dictation', 'cloze', 'order', 'heard', 'speak', 'verbs', 'idioms', 'grammar', 'dialogue'];

/** Wiederholung schwieriger Textstellen: je schwacher Zeile bis zu zwei verschiedene Aufgaben. */
export function generateReview(song: Song, opts: GenerateOptions = {}): SongExercise[] {
  const seed = opts.seed ?? 0;
  const count = opts.count ?? REVIEW_ROUND;
  const pool = buildPool(song, seed);
  const rnd = rngFor(seed, 'review');
  const out: SongExercise[] = [];
  for (const line of weakLines(song, opts.focus, count)) {
    if (out.length >= count) break;
    const perLine = REVIEW_PREFERENCE
      .flatMap((k, rank) => pool[k]
        .filter((se) => se.lineIds.length === 1 && se.lineIds[0] === line.id)
        .map((se) => ({ se, s: rank + rnd() * 4 })))
      .sort((a, b) => a.s - b.s)
      .map((x) => x.se);
    const kinds = new Set<SongExercise['kind']>();
    for (const se of perLine) {
      if (out.length >= count || kinds.size >= 2) break;
      if (kinds.has(se.kind)) continue;
      kinds.add(se.kind);
      out.push(se);
    }
  }
  return spreadKinds(out);
}

/** Übungsrunde für eine Auswahl der Übungsseite */
export function generateRound(song: Song, mode: SongExMode, opts: GenerateOptions = {}): SongExercise[] {
  if (mode === 'mixed') return generateMixed(song, opts);
  if (mode === 'review') return generateReview(song, opts);
  return generateKind(song, mode, opts);
}

/** Zeilen, zu denen die angegebenen Übungs-IDs gehören (z. B. offene Fehler im Fehlerarchiv). */
export function lineIdsForExercises(song: Song, exerciseIds: Iterable<string>): string[] {
  const ids = new Set(exerciseIds);
  if (!ids.size) return [];
  const pool = buildPool(song, 0);
  const lines = new Set<string>();
  for (const k of SONG_EX_KINDS) for (const se of pool[k.key]) if (ids.has(se.exercise.id)) se.lineIds.forEach((l) => lines.add(l));
  return song.lines.filter((l) => lines.has(l.id)).map((l) => l.id);
}

// ───────────────────────── Boss-Challenge ─────────────────────────

export interface BossSection { id: string; label: string; lineIds: string[] }

/** Abschnitte, die sich für die Boss-Challenge eignen (mind. 2 Zeilen mit Übersetzung). */
export function bossSections(song: Song): BossSection[] {
  if (!isAnnotated(song)) return [];
  return song.sections
    .map((s) => ({
      id: s.id,
      label: s.label,
      lineIds: song.lines.filter((l) => l.sectionId === s.id && l.natural.trim()).map((l) => l.id),
    }))
    .filter((s) => new Set(s.lineIds.map((id) => looseKey(song.lines.find((l) => l.id === id)?.text ?? ''))).size >= 2);
}

export const BOSS_MAX_LINES = 6;
export const BOSS_MAX_WORDS = 3;

/**
 * Boss-Fragen zu einem Abschnitt – ohne Hilfen: je Zeile „Was bedeutet die gehörte Zeile?“ (mc mit Audio,
 * ohne Text) und bis zu drei Schlüsselwörter übersetzen.
 */
export function generateBoss(song: Song, sectionId: string, opts: { seed?: string | number } = {}): SongExercise[] {
  const seed = opts.seed ?? 0;
  const section = bossSections(song).find((s) => s.id === sectionId);
  if (!section) return [];
  const ctx = analyze(song, seed);
  const lineIdx = (id: string) => ctx.lineIndex.get(id) as number;
  const seen = new Set<string>();
  const lines = section.lineIds.map((id) => song.lines[lineIdx(id)]).filter((l) => {
    const k = looseKey(l.text);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, BOSS_MAX_LINES);

  const out: SongExercise[] = [];
  const annotatedLines = song.lines.filter((l) => l.natural.trim());
  for (const line of lines) {
    const i = lineIdx(line.id);
    const rnd = rngFor(seed, `boss-line:${i}`);
    const differs = (o: SongLine) => looseKey(o.text) !== looseKey(line.text) && looseKey(o.natural) !== looseKey(line.natural);
    const sameSection = shuffle(annotatedLines.filter((o) => o.sectionId === line.sectionId && differs(o)), rnd);
    const rest = shuffle(annotatedLines.filter((o) => o.sectionId !== line.sectionId && differs(o)), rnd);
    const picked: SongLine[] = [];
    const keys = new Set([looseKey(line.natural)]);
    for (const o of [...sameSection.slice(0, 2), ...rest, ...sameSection.slice(2)]) {
      if (keys.has(looseKey(o.natural))) continue;
      keys.add(looseKey(o.natural));
      picked.push(o);
      if (picked.length >= 3) break;
    }
    if (picked.length < 2) continue;
    const correct = tidy(line.natural);
    const { options, answer } = withOptions(correct, picked.map((o) => tidy(o.natural)), rnd);
    const ex: Exercise = {
      id: exId(ctx, 'bossline', i + 1),
      type: 'mc',
      skills: ['listening', 'reading'],
      difficulty: line.difficulty,
      instruction: 'Hör die Zeile an – was bedeutet sie?',
      prompt: 'Was bedeutet die Zeile, die du hörst?',
      audio: line.text,
      options: options.map((text) => {
        const o = picked.find((x) => tidy(x.natural) === text);
        return o ? { text, why: `Das ist die Bedeutung von ${q(o.text)}.` } : { text };
      }),
      answer,
      feedback: fb(
        `${q(line.text)} bedeutet: „${correct}“`,
        line.explanation.summary,
        'Achte beim Hören auf die Schlüsselwörter – Verben und Nomen tragen die Bedeutung.',
      ),
    };
    out.push({ exercise: ex, kind: 'boss', lineIds: [line.id], vocab: lineVocab(ctx, line) });
  }

  // Schlüsselwörter des Abschnitts
  const rndW = rngFor(seed, `boss-words:${sectionId}`);
  const inSection = new Set(lines.map((l) => lineIdx(l.id)));
  const seenGloss = new Set<string>();
  const candidates = shuffle(ctx.words.filter((w) => inSection.has(w.lineIdx) && w.content && w.gloss && w.cls !== 'phrase'), rndW)
    .filter((w) => {
      const k = w.glossKey as string;
      if (seenGloss.has(k)) return false;
      seenGloss.add(k);
      return true;
    });
  const allGloss = Object.entries(song.glossary).filter(([, g]) => CONTENT.includes(posClass(g.pos)));
  let added = 0;
  for (const w of candidates) {
    if (added >= BOSS_MAX_WORDS) break;
    const g = w.gloss as GlossEntry;
    const rnd = rngFor(seed, `boss-word:${w.lineIdx}:${w.tokIdx}`);
    const meaning = plain(g.meaning);
    const same = shuffle(allGloss.filter(([k, o]) => k !== w.glossKey && posClass(o.pos) === w.cls).map(([, o]) => plain(o.meaning)), rnd);
    const other = shuffle(allGloss.filter(([k, o]) => k !== w.glossKey && posClass(o.pos) !== w.cls).map(([, o]) => plain(o.meaning)), rnd);
    const overlaps = (s: string) => {
      const a = looseKey(s);
      const b = looseKey(meaning);
      return a === b || a.includes(b) || b.includes(a);
    };
    const distractors = pickDistinct([...same, ...other], 3, overlaps, [meaning]);
    if (distractors.length < 2) continue;
    const { options, answer } = withOptions(meaning, distractors, rnd);
    const shown = displayWord(ctx, w);
    const ex: Exercise = {
      id: exId(ctx, 'bossword', (w.lineIdx + 1) * 100 + w.tokIdx),
      type: 'mc',
      skills: ['vocabulary'],
      difficulty: song.lines[w.lineIdx].difficulty,
      instruction: 'Übersetze das Schlüsselwort.',
      prompt: `Was heißt ${q(shown)} in diesem Abschnitt?`,
      options: options.map((text) => ({ text })),
      answer,
      feedback: fb(
        `${q(shown)} = ${meaning}${g.form ? ` (${plain(g.form)})` : ''}.`,
        g.grammar,
        everydayHint(g.everyday),
      ),
    };
    const se: SongExercise = { exercise: ex, kind: 'boss', lineIds: [song.lines[w.lineIdx].id], vocab: wordVocab(ctx, w) };
    if (!isValid(se)) continue;
    out.push(se);
    added++;
  }
  return out.filter(isValid);
}

/** Wörter/Wendungen zu den angegebenen Aufgaben (z. B. falsch gelöste), eindeutig je Karte */
export function vocabFor(items: readonly SongExercise[], exerciseIds: Iterable<string>): VocabFocus[] {
  const byId = new Map(items.map((i) => [i.exercise.id, i]));
  const out = new Map<string, VocabFocus>();
  for (const id of exerciseIds) for (const v of byId.get(id)?.vocab ?? []) if (!out.has(v.itemId)) out.set(v.itemId, v);
  return [...out.values()];
}

/** Übungen einer Runde in der Form, die useExerciseSession erwartet */
export const exercisesOf = (items: readonly SongExercise[]): Exercise[] => items.map((x) => x.exercise);
