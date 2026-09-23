/**
 * Bausteine für die Demo-Lernlieder: Tokenisierung, Zeitraster, Glossar-Helfer und `buildSong`.
 *
 * ── Token-Regel (Text ⇄ Tokens) ─────────────────────────────────────────────
 * `joinTokens` setzt Tokens so zusammen, dass exakt `line.text` entsteht:
 * - Wörter werden durch ein Leerzeichen getrennt.
 * - Satzzeichen-Tokens (`p: true`) folgen OHNE vorangehendes Leerzeichen (`,` `.` `!` `?` `:` `;` `…`).
 * - Ausnahme: öffnende Zeichen `¿` `¡` (auch `«` `(` `“`) bekommen ein Leerzeichen davor (außer am
 *   Zeilenanfang), dafür hängt das folgende Wort direkt an ihnen.
 *   Beispiel: [¿][Cómo][estás][?][¿][Qué][tal][?] → „¿Cómo estás? ¿Qué tal?“
 *
 * ── Quelltext-Syntax für Zeilen (`LineDraft.src`) ───────────────────────────
 * Ganz normaler Liedtext. Jedes Wort bekommt automatisch den Glossar-Schlüssel „Wort in
 * Kleinbuchstaben“ (Akzente bleiben erhalten: `está` ≠ `esta`). Abweichender Schlüssel per
 * `Wort{schlüssel}` – z. B. `Buenos{buenos-dias} días{buenos-dias}` für feste Wendungen oder
 * `que{que.causal}` für eine bestimmte Bedeutung. `Wort{-}` = ohne Glossar-Eintrag.
 * Die Validierung (`validateSongs`) meldet jeden fehlenden Glossar-Schlüssel.
 *
 * ── Zeitraster ──────────────────────────────────────────────────────────────
 * Begleitmusik im 4/4-Takt, Taktdauer = 240000 / bpm ms. Ablauf: 2 Takte Intro → Zeilen →
 * 1 Takt Pause zwischen Abschnitten → 2 Takte Outro (`durationMs`). Jede Zeile beginnt auf einem
 * Taktanfang. Die Sprachausgabe (ttsRate 0.9) braucht ≈ 450 ms pro Wort + 600 ms; eine Zeile
 * bekommt 1 Takt, wenn sie in 80 % eines Taktes passt, sonst 2 Takte (bzw. so viele, bis sie
 * sicher hineinpasst). `LineDraft.bars` überschreibt die Automatik (nie unter das Minimum).
 *
 * ── Abgeleitete Kennzahlen ──────────────────────────────────────────────────
 * `wordsPerMinute` = Wörter aller Zeilen / gesungene Zeit (Summe der Zeilendauern).
 * `colloquialPct`  = Anteil der Zeilen mit umgangssprachlichem Element (`colloquial` gesetzt).
 */
import type { GlossEntry, LineExplanation, Md, Song, SongLine, SongToken } from '../types';

export const INTRO_BARS = 2;
export const SECTION_GAP_BARS = 1;
export const OUTRO_BARS = 2;
export const MS_PER_WORD = 450;
export const MS_LINE_OVERHEAD = 600;

export const ORIGINAL_LICENSE: Song['license'] = {
  kind: 'original',
  note: 'Originales Lernlied, erstellt für AppLingua – frei nutzbar in der App',
};

const OPENING = new Set(['¿', '¡', '«', '(', '“']);
const LEADING_RE = /^[¿¡«(“]+/;
const TRAILING_RE = /[.,;:!?…»)”]+$/;

/** Setzt Tokens nach der oben beschriebenen Leerzeichen-Regel zum Zeilentext zusammen. */
export function joinTokens(tokens: SongToken[]): string {
  let out = '';
  tokens.forEach((tok, i) => {
    const prev = tokens[i - 1];
    const glued = i === 0 || (tok.p && !OPENING.has(tok.t)) || (prev?.p && OPENING.has(prev.t));
    out += (glued ? '' : ' ') + tok.t;
  });
  return out;
}

/** Zerlegt eine Quellzeile (siehe Syntax oben) in Tokens. */
export function tokenize(src: string): SongToken[] {
  const tokens: SongToken[] = [];
  for (const chunk of src.trim().split(/\s+/)) {
    const lead = chunk.match(LEADING_RE)?.[0] ?? '';
    const rest = chunk.slice(lead.length);
    const trail = rest.match(TRAILING_RE)?.[0] ?? '';
    const core = rest.slice(0, rest.length - trail.length);
    for (const ch of lead) tokens.push({ t: ch, p: true });
    if (core) {
      const m = core.match(/^(.+?)(?:\{([^}]*)\})?$/);
      const word = m?.[1] ?? core;
      const key = m?.[2];
      if (key === '-') tokens.push({ t: word });
      else tokens.push({ t: word, g: key || word.toLowerCase() });
    }
    for (const ch of trail) tokens.push({ t: ch, p: true });
  }
  return tokens;
}

export const wordCount = (tokens: SongToken[]) => tokens.filter((t) => !t.p).length;

/** Benötigte Sprechzeit einer Zeile bei ttsRate 0.9. */
export const speechMs = (words: number) => words * MS_PER_WORD + MS_LINE_OVERHEAD;

/** Anzahl Takte für eine Zeile (Automatik, `requested` als Wunsch – nie kürzer als nötig). */
export function barsFor(words: number, barMs: number, requested?: number): number {
  const need = speechMs(words);
  let bars = requested ?? (need <= 0.8 * barMs ? 1 : 2);
  while (bars * barMs < need) bars++;
  return bars;
}

/** Kompakter Glossar-Eintrag. `extra` ergänzt form, grammar, colloquial, ipa, literal, register. */
export function gl(
  lemma: string,
  pos: string,
  meaning: string,
  phonetic: string,
  examples: [target: string, german: string][],
  everyday: Md,
  extra: Partial<Omit<GlossEntry, 'lemma' | 'pos' | 'meaning' | 'phonetic' | 'examples' | 'everyday'>> = {},
): GlossEntry {
  return {
    lemma,
    pos,
    meaning,
    phonetic,
    examples: examples.map(([target, german]) => ({ target, german })),
    everyday,
    register: 'neutral',
    ...extra,
  };
}

export interface LineDraft {
  /** Liedtext mit optionalen Glossar-Schlüsseln `Wort{key}` */
  src: string;
  natural: string;
  literal: string;
  phonetic: string;
  ipa?: string;
  difficulty: 1 | 2 | 3;
  summary: Md;
  grammar: [title: string, md: Md, topicId?: string][];
  idioms?: [phrase: string, meaning: string, md?: Md][];
  colloquial?: Md;
  culture?: Md;
  ambiguity?: Md;
  alternatives: [target: string, german: string, note?: string][];
  everyday: Md;
  verbs?: [form: string, infinitive: string, analysis: string][];
  /** Takte erzwingen (sonst Automatik) */
  bars?: number;
}

export interface SectionDraft {
  id: string;
  label: string;
  lines: LineDraft[];
}

export type SongDraft = Omit<
  Song,
  'durationMs' | 'sections' | 'lines' | 'glossary' | 'wordsPerMinute' | 'colloquialPct' | 'license' | 'explicit'
> & {
  sections: SectionDraft[];
  /** eigene Einträge des Songs */
  glossary: Record<string, GlossEntry>;
  /** gemeinsame Einträge (Funktionswörter); übernommen wird nur, was der Song benutzt */
  common?: Record<string, GlossEntry>;
};

function explanationOf(d: LineDraft): LineExplanation {
  const ex: LineExplanation = {
    summary: d.summary,
    grammar: d.grammar.map(([title, md, topicId]) => (topicId ? { title, md, topicId } : { title, md })),
    alternatives: d.alternatives.map(([target, german, note]) => (note ? { target, german, note } : { target, german })),
    everyday: d.everyday,
  };
  if (d.idioms?.length) ex.idioms = d.idioms.map(([phrase, meaning, md]) => (md ? { phrase, meaning, md } : { phrase, meaning }));
  if (d.colloquial) ex.colloquial = d.colloquial;
  if (d.culture) ex.culture = d.culture;
  if (d.ambiguity) ex.ambiguity = d.ambiguity;
  return ex;
}

/** Baut aus Abschnitts-Entwürfen einen vollständigen Song mit konsistentem Zeitraster. */
export function buildSong(draft: SongDraft): Song {
  const { sections: sectionDrafts, glossary: own, common = {}, ...meta } = draft;
  const barMs = 240000 / meta.backing.bpm;
  const at = (bar: number) => Math.round(bar * barMs);

  const lines: SongLine[] = [];
  let bar = INTRO_BARS;
  let words = 0;
  let sungMs = 0;
  sectionDrafts.forEach((section, si) => {
    if (si > 0) bar += SECTION_GAP_BARS;
    for (const d of section.lines) {
      const tokens = tokenize(d.src);
      const n = wordCount(tokens);
      const bars = barsFor(n, barMs, d.bars);
      const startMs = at(bar);
      const endMs = at(bar + bars);
      bar += bars;
      words += n;
      sungMs += endMs - startMs;
      const line: SongLine = {
        id: `l${String(lines.length + 1).padStart(2, '0')}`,
        sectionId: section.id,
        startMs,
        endMs,
        text: joinTokens(tokens),
        tokens,
        natural: d.natural,
        literal: d.literal,
        phonetic: d.phonetic,
        difficulty: d.difficulty,
        explanation: explanationOf(d),
      };
      if (d.ipa) line.ipa = d.ipa;
      if (d.verbs?.length) line.verbs = d.verbs.map(([form, infinitive, analysis]) => ({ form, infinitive, analysis }));
      lines.push(line);
    }
  });

  const glossary: Record<string, GlossEntry> = {};
  for (const line of lines) {
    for (const t of line.tokens) {
      if (!t.g || glossary[t.g]) continue;
      const entry = own[t.g] ?? common[t.g];
      if (entry) glossary[t.g] = entry;
    }
  }
  // eigene Einträge, die (noch) keine Zeile nutzt, bleiben erhalten – nichts geht verloren
  for (const [k, v] of Object.entries(own)) if (!glossary[k]) glossary[k] = v;

  const colloquialLines = lines.filter((l) => l.explanation.colloquial).length;
  return {
    ...meta,
    license: ORIGINAL_LICENSE,
    explicit: false,
    wordsPerMinute: Math.round(words / (sungMs / 60000)),
    colloquialPct: Math.round((100 * colloquialLines) / lines.length),
    durationMs: at(bar + OUTRO_BARS),
    sections: sectionDrafts.map(({ id, label }) => ({ id, label })),
    lines,
    glossary,
  };
}
