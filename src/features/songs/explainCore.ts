/**
 * Erklärungen zu Songtexten – reine Logik ohne React/Netzwerk:
 * Offline-Erklärungen aus Glossar + Zeilenerklärung, niveaugerechte Aufbereitung,
 * Aussprachetipps und das (gekürzte) ID-Schema für gespeicherte Erklärungen.
 */
import type { Explanation, ExplainAction, LanguageLevel, Variant } from '../../core/types';
import type { GlossEntry, Song, SongLine } from '../../content/types';
import { hashString } from '../../engine/text';

// ───────────────────────── Aktionen ─────────────────────────
export const EXPLAIN_ACTIONS: { key: ExplainAction; label: string; short: string }[] = [
  { key: 'meaning', label: 'Was bedeutet das?', short: 'Bedeutung' },
  { key: 'explain-line', label: 'Erkläre mir diese Zeile', short: 'Zeile erklärt' },
  { key: 'literal', label: 'Übersetze wörtlich', short: 'Wörtlich' },
  { key: 'natural', label: 'Übersetze natürlich', short: 'Natürlich' },
  { key: 'grammar', label: 'Welche Grammatik wird hier verwendet?', short: 'Grammatik' },
  { key: 'colloquial', label: 'Ist das Umgangssprache?', short: 'Umgangssprache' },
  { key: 'pronunciation', label: 'Wie spricht man das aus?', short: 'Aussprache' },
  { key: 'examples', label: 'Gib mir weitere Beispiele', short: 'Beispiele' },
];
export const explainActionLabel = (a: ExplainAction) => EXPLAIN_ACTIONS.find((x) => x.key === a)?.label ?? a;

/** Einsteiger und A1 bekommen einfache Sprache, erklärte Fachbegriffe und Details hinter „Mehr“. */
export const isBeginnerLevel = (level: LanguageLevel) => level === 'Einsteiger' || level === 'A1';

// ───────────────────────── Ausschnitt & ID ─────────────────────────
/** Markierter Ausschnitt: ein Wort (tokenIndex) oder die ganze Zeile. */
export function spanOf(line: SongLine, tokenIndex?: number): string {
  if (tokenIndex === undefined) return line.text;
  const tok = line.tokens[tokenIndex];
  return tok && !tok.p ? tok.t : line.text;
}

/**
 * ID für songExplanations: `${songId}:${lineId}:${span}:${action}` – der Ausschnitt wird
 * normalisiert und ab 32 Zeichen gekürzt + gehasht (stabile, kurze IDs).
 */
export function explanationId(songId: string, lineId: string, span: string, action: ExplainAction): string {
  const key = span.normalize('NFC').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  const short = key.length > 32 ? `${key.slice(0, 20)}~${hashString(key).toString(36)}` : key;
  return `${songId}:${lineId}:${short || 'x'}:${action}`;
}

// ───────────────────────── Einfache Sprache ─────────────────────────
const TERM_HINTS: [RegExp, string][] = [
  [/\bPräsens\b/, 'Gegenwart'],
  [/\bInfinitiv\b/, 'Grundform des Verbs'],
  [/\bKonjugation\b/, 'Beugung des Verbs nach Person'],
  [/\bSubjekt\b/, 'wer oder was etwas tut'],
  [/\bObjekt\b/, 'wen oder was'],
  [/\bAdjektiv\b/, 'Eigenschaftswort'],
  [/\bAdverb\b/, 'Umstandswort: wie, wann, wo'],
  [/\bArtikel\b/, 'Begleiter wie „der“ oder „ein“'],
  [/\bPronomen\b/, 'Fürwort wie „ich“ oder „dich“'],
  [/\bNomen\b/, 'Hauptwort'],
  [/\bPräposition\b/, 'Verhältniswort wie „in“ oder „mit“'],
  [/\bImperativ\b/, 'Befehlsform'],
  [/\bSingular\b/, 'Einzahl'],
  [/\bPlural\b/, 'Mehrzahl'],
  [/\bDiminutiv\b/, 'Verkleinerungsform'],
  [/\breflexiv\b/, 'rückbezüglich, mit „sich“'],
  [/\bSubjuntivo\b/, 'Möglichkeitsform'],
  [/\bKonjunktiv\b/, 'Möglichkeitsform'],
  [/\bGerundium\b/, '„gerade dabei“-Form'],
  [/\bPartizip\b/, 'Mittelwort, z. B. „gemacht“'],
  [/\bIndefinido\b/, 'abgeschlossene Vergangenheit'],
  [/\bImperfe(?:kt|cto)\b/, 'Vergangenheit für Gewohnheiten und Hintergrund'],
  [/\bFutur\b/, 'Zukunft'],
  [/\bKonjunktion\b/, 'Bindewort wie „und“ oder „aber“'],
];

/**
 * Für Einsteiger/A1: Fachbegriffe beim ersten Vorkommen kurz in Klammern erklären.
 * Code-Stellen (`…`, Zielsprache) bleiben unangetastet. Ab A2 unverändert.
 */
export function explainTerms(md: string, level: LanguageLevel): string {
  if (!md || !isBeginnerLevel(level)) return md;
  const done = new Set<number>();
  return md
    .split(/(`[^`]*`)/)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let out = part;
      TERM_HINTS.forEach(([re, hint], idx) => {
        if (done.has(idx)) return;
        const m = re.exec(out);
        if (!m) return;
        done.add(idx);
        const end = m.index + m[0].length;
        if (/^\s*\(/.test(out.slice(end))) return; // bereits erklärt
        out = `${out.slice(0, end)} (${hint})${out.slice(end)}`;
      });
      return out;
    })
    .join('');
}

/** Wortart verständlich (für Einsteiger ohne Abkürzungen). */
export function friendlyPos(pos: string, level: LanguageLevel): string {
  if (!isBeginnerLevel(level)) return pos;
  const s = pos
    .replace(/\bm\.\s*Sg\./g, 'männlich, Einzahl')
    .replace(/\bf\.\s*Sg\./g, 'weiblich, Einzahl')
    .replace(/\bm\.\s*Pl\./g, 'männlich, Mehrzahl')
    .replace(/\bf\.\s*Pl\./g, 'weiblich, Mehrzahl')
    .replace(/\(m\)/g, '(männlich)')
    .replace(/\(f\)/g, '(weiblich)')
    .replace(/\bSg\./g, 'Einzahl')
    .replace(/\bPl\./g, 'Mehrzahl');
  return explainTerms(s, level);
}

// ───────────────────────── Aussprachetipps ─────────────────────────
/** Kurze, variantengerechte Tipps anhand der Buchstaben im Ausschnitt (max. 4). */
export function pronunciationTips(text: string, variant: Variant): string[] {
  const t = ` ${text.toLowerCase().normalize('NFC')} `;
  const tips: string[] = [];
  const add = (cond: boolean, tip: string) => { if (cond && tips.length < 4) tips.push(tip); };
  if (variant === 'pt-BR') {
    add(/ão|õe|ãe|[ãõ]|[aeiou][mn](?=[\s.,!?])/.test(t), 'Nasale (ão, ã, õ, am, em): Luft auch durch die Nase – wie bei französisch „Chanson“.');
    add(/lh/.test(t), 'lh klingt wie „lj“ in „Familie“.');
    add(/nh/.test(t), 'nh klingt wie „nj“ in „Champignon“.');
    add(/t[ie]|d[ie]/.test(t), 'ti/di (und te/de am Wortende) klingen in Brasilien wie „tschi“/„dschi“.');
    add(/\sr|rr/.test(t), 'r am Wortanfang und rr: wie ein gehauchtes „h“ oder „ch“ – nicht rollen.');
    add(/[^\s]e(?=[\s.,!?])/.test(t), 'Unbetontes e am Wortende klingt wie „i“: „noite“ ≈ „noitschi“.');
    add(/[^\s]o(?=[\s.,!?])/.test(t), 'Unbetontes o am Wortende klingt wie „u“: „tudo“ ≈ „tudu“.');
    add(/ç/.test(t), 'ç ist immer ein stimmloses „s“.');
    add(/x/.test(t), 'x klingt meist wie „sch“.');
    add(true, 'Betonte Silbe deutlich sprechen, unbetonte Vokale leicht und kurz.');
    return tips;
  }
  add(/rr|\sr/.test(t), 'rr und r am Wortanfang: kräftig mit der Zungenspitze rollen.');
  add(/[aeiouáéíóú]r[aeiouáéíóú]/.test(t), 'Einfaches r zwischen Vokalen: nur ein kurzer Zungenschlag – fast wie ein schnelles d.');
  add(/j|g[eéií]/.test(t), 'j (und g vor e/i): rau im Rachen wie „ch“ in „Bach“.');
  add(/ll|y/.test(t), variant === 'es-ES'
    ? 'll und y: wie ein weiches „j“ in „ja“.'
    : 'll und y: wie „j“ in „ja“ – in Argentinien und Uruguay eher wie „sch“.');
  add(/ñ/.test(t), 'ñ klingt wie „nj“ in „Champignon“ – ein einziger Laut.');
  add(/z|c[eéií]/.test(t), variant === 'es-ES'
    ? 'z und c vor e/i: in Spanien wie englisches „th“ in „think“.'
    : 'z und c vor e/i: in Lateinamerika ein stimmloses „s“.');
  add(/v/.test(t), 'v klingt wie b – kein deutsches „w“.');
  add(/(^|[^c])h/.test(t), 'h ist stumm: „hola“ klingt wie „ola“.');
  add(/qu/.test(t), 'qu klingt wie „k“ – das u bleibt stumm.');
  add(/[áéíóú]/.test(t), 'Der Akzent markiert die betonte Silbe – dort etwas lauter und länger.');
  add(true, 'Vokale kurz und klar: a, e, i, o, u – nie verschleifen.');
  return tips;
}

// ───────────────────────── Offline-Erklärungen ─────────────────────────
const clean = (e: Explanation): Explanation => {
  const out: Explanation = { source: e.source };
  for (const [k, v] of Object.entries(e) as [keyof Explanation, unknown][]) {
    if (k === 'source' || v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    (out as unknown as Record<string, unknown>)[k] = v;
  }
  return out;
};

const lc = (s: string) => s.toLowerCase().normalize('NFC');
const mentions = (text: string | undefined, word: string) =>
  Boolean(text) && new RegExp(`(^|[^\\p{L}])${lc(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'u').test(lc(text as string));

function registerText(g: GlossEntry): string {
  switch (g.register) {
    case 'umgangssprachlich': return `Ja – das ist umgangssprachlich.${g.colloquial ? ` ${g.colloquial}` : ''}`;
    case 'formell': return `Nein – das klingt eher formell.${g.colloquial ? ` ${g.colloquial}` : ''}`;
    case 'poetisch': return `Eher poetisch – typisch für Liedtexte, im Alltag seltener.${g.colloquial ? ` ${g.colloquial}` : ''}`;
    default: return g.colloquial ?? 'Nein – das ist neutrale Standardsprache und passt in fast jede Situation.';
  }
}

function wordByWord(song: Song, line: SongLine): string {
  const parts = line.tokens
    .filter((t) => !t.p && t.g && song.glossary[t.g])
    .map((t) => `\`${t.t}\` = ${(song.glossary[t.g as string] as GlossEntry).literal ?? (song.glossary[t.g as string] as GlossEntry).meaning}`);
  return parts.length ? `Wort für Wort: ${parts.join(' · ')}` : '';
}

/** Hat der Song eingebaute Erklärungen? (Eigene Texte haben kein Glossar und keine Übersetzungen.) */
export const hasOfflineContent = (song: Song) => song.license.kind !== 'user-private' && song.lines.some((l) => Boolean(l.natural));

/**
 * Offline-Erklärung aus Glossar/Zeilenerklärung, niveaugerecht formuliert.
 * null = offline nichts Verlässliches vorhanden (z. B. eigener Text, Wort ohne Glossar).
 */
export function offlineExplanation(
  song: Song, line: SongLine, tokenIndex: number | undefined, action: ExplainAction, level: LanguageLevel, variant: Variant,
): Explanation | null {
  const L = (md: string | undefined) => (md ? explainTerms(md, level) : undefined);
  const span = spanOf(line, tokenIndex);
  const tips = pronunciationTips(span, variant);
  const tok = tokenIndex !== undefined ? line.tokens[tokenIndex] : undefined;
  const isWord = Boolean(tok && !tok.p);

  if (!hasOfflineContent(song) || !line.natural) {
    // Eigene Texte: offline nur allgemeine Aussprachetipps – alles andere liefert die KI.
    return action === 'pronunciation' ? { source: 'offline', pronunciation: { phonetic: '', tips } } : null;
  }

  const ex = line.explanation;
  const lineGrammar = ex.grammar.map((g) => `**${g.title}:** ${L(g.md)}`);
  const verbs = (line.verbs ?? []).map((v) => `\`${v.form}\` → Grundform \`${v.infinitive}\`: ${L(v.analysis)}`);
  const idioms = (ex.idioms ?? []).map((i) => `„${i.phrase}“ – ${i.meaning}${i.md ? `. ${L(i.md)}` : ''}`);
  const alternatives = ex.alternatives.map((a) => `\`${a.target}\` – ${a.german}${a.note ? ` (${a.note})` : ''}`);
  const contextLine = `Im Song: „${line.text}“ – ${line.natural}`;

  if (isWord && action !== 'explain-line') {
    const t = tok as NonNullable<typeof tok>;
    const g = t.g ? song.glossary[t.g] : undefined;
    if (!g) {
      return action === 'pronunciation' ? { source: 'offline', pronunciation: { phonetic: '', tips } } : null;
    }
    const wordIdioms = (ex.idioms ?? []).filter((i) => mentions(i.phrase, t.t)).map((i) => `„${i.phrase}“ – ${i.meaning}`);
    const verb = (line.verbs ?? []).find((v) => lc(v.form) === lc(t.t));
    const grammar = [
      `${friendlyPos(g.pos, level)}${lc(g.lemma) !== lc(t.t) ? ` · Grundform: \`${g.lemma}\`` : ''}`,
      g.form ? `Form: ${L(g.form)}` : undefined,
      verb ? `\`${verb.form}\` → \`${verb.infinitive}\`: ${L(verb.analysis)}` : undefined,
      L(g.grammar),
    ].filter((x): x is string => Boolean(x));
    const base = { source: 'offline' as const };
    switch (action) {
      case 'meaning':
        return clean({
          ...base,
          natural: g.meaning,
          literal: g.literal,
          context: contextLine,
          grammar,
          idioms: wordIdioms,
          colloquial: registerText(g),
          ambiguity: mentions(ex.ambiguity, t.t) ? L(ex.ambiguity) : undefined,
          culture: mentions(ex.culture, t.t) ? L(ex.culture) : undefined,
          everyday: g.everyday,
          examples: g.examples,
        });
      case 'literal':
        return clean({ ...base, literal: g.literal ?? g.meaning, natural: g.meaning, context: g.form ? `Form: ${L(g.form)}` : contextLine });
      case 'natural':
        return clean({ ...base, natural: g.meaning, context: contextLine, everyday: g.everyday });
      case 'grammar':
        return clean({ ...base, grammar, context: contextLine });
      case 'colloquial':
        return clean({ ...base, colloquial: registerText(g), idioms: wordIdioms, everyday: g.everyday });
      case 'pronunciation':
        return { source: 'offline', pronunciation: { phonetic: g.phonetic, ...(g.ipa ? { ipa: g.ipa } : {}), tips } };
      case 'examples':
        return clean({ ...base, examples: g.examples, natural: g.meaning });
      default:
        return null;
    }
  }

  // ── ganze Zeile ──
  const base = { source: 'offline' as const };
  switch (action) {
    case 'meaning':
    case 'explain-line':
      return clean({
        ...base,
        natural: line.natural,
        literal: line.literal,
        context: L(ex.summary),
        grammar: lineGrammar,
        idioms,
        colloquial: L(ex.colloquial),
        ambiguity: L(ex.ambiguity),
        culture: L(ex.culture),
        alternatives,
        everyday: L(ex.everyday),
      });
    case 'literal':
      return clean({ ...base, literal: line.literal, natural: line.natural, context: wordByWord(song, line) });
    case 'natural':
      return clean({ ...base, natural: line.natural, everyday: L(ex.everyday), alternatives });
    case 'grammar':
      return clean({ ...base, grammar: [...lineGrammar, ...verbs], context: L(ex.summary) });
    case 'colloquial': {
      const casual = line.tokens
        .filter((t) => t.g && song.glossary[t.g]?.register === 'umgangssprachlich')
        .map((t) => `\`${t.t}\``);
      const colloquial = ex.colloquial
        ? L(ex.colloquial)
        : casual.length
          ? `Teilweise: ${casual.join(', ')} ${casual.length === 1 ? 'ist' : 'sind'} umgangssprachlich.`
          : 'Nein – die Zeile ist neutrale Standardsprache.';
      return clean({ ...base, colloquial, idioms, everyday: L(ex.everyday) });
    }
    case 'pronunciation':
      return { source: 'offline', pronunciation: { phonetic: line.phonetic, ...(line.ipa ? { ipa: line.ipa } : {}), tips } };
    case 'examples': {
      const seen = new Set<string>();
      const examples: { target: string; german: string }[] = [];
      for (const a of ex.alternatives) {
        if (!seen.has(a.target)) { seen.add(a.target); examples.push({ target: a.target, german: a.german }); }
      }
      for (const t of line.tokens) {
        const g = t.g ? song.glossary[t.g] : undefined;
        if (!g || /Artikel|Präposition|Konjunktion/.test(g.pos)) continue;
        for (const e of g.examples.slice(0, 1)) {
          if (!seen.has(e.target) && examples.length < 8) { seen.add(e.target); examples.push(e); }
        }
      }
      return clean({ ...base, examples, natural: line.natural });
    }
    default:
      return null;
  }
}

// ───────────────────────── Darstellung ─────────────────────────
export type SectionKey = Exclude<keyof Explanation, 'source'>;

export const SECTION_TITLES: Record<SectionKey, string> = {
  natural: 'Natürliche Bedeutung',
  literal: 'Wörtlich',
  context: 'Im Song-Kontext',
  grammar: 'Grammatik',
  idioms: 'Redewendungen',
  colloquial: 'Umgangssprache?',
  ambiguity: 'Doppeldeutigkeiten',
  culture: 'Kultur',
  alternatives: 'Alternativen',
  everyday: 'Alltagstauglich?',
  examples: 'Beispiele',
  pronunciation: 'Aussprache',
};

/** Reihenfolge wie bei „Was bedeutet das?“. */
const ORDER: SectionKey[] = [
  'natural', 'literal', 'context', 'grammar', 'idioms', 'colloquial', 'ambiguity', 'culture',
  'alternatives', 'everyday', 'examples', 'pronunciation',
];

const FOCUS: Record<ExplainAction, SectionKey[]> = {
  meaning: ['natural', 'literal', 'context', 'grammar', 'idioms', 'colloquial', 'ambiguity', 'culture', 'alternatives', 'everyday', 'examples'],
  'explain-line': ['context', 'natural', 'literal', 'grammar', 'idioms', 'colloquial', 'ambiguity', 'culture', 'alternatives', 'everyday'],
  literal: ['literal', 'context', 'natural'],
  natural: ['natural', 'context', 'everyday', 'alternatives'],
  grammar: ['grammar', 'context'],
  colloquial: ['colloquial', 'idioms', 'everyday'],
  pronunciation: ['pronunciation'],
  examples: ['examples', 'alternatives'],
};

/** Kernfelder für Einsteiger – alles andere steht hinter „Mehr“. */
const BEGINNER_CORE: Partial<Record<ExplainAction, SectionKey[]>> = {
  meaning: ['natural', 'literal', 'context', 'everyday'],
  'explain-line': ['context', 'natural', 'literal', 'everyday'],
  grammar: ['grammar'],
  colloquial: ['colloquial', 'everyday'],
};

export interface ExplanationLayout {
  primary: SectionKey[];
  more: SectionKey[];
}

/** Welche Abschnitte sofort sichtbar sind und welche hinter „Mehr“ stehen (niveauabhängig). */
export function layoutExplanation(e: Explanation, action: ExplainAction, level: LanguageLevel): ExplanationLayout {
  const present = (k: SectionKey) => {
    const v = e[k];
    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
  };
  const focus = FOCUS[action].filter(present);
  const core = isBeginnerLevel(level) ? BEGINNER_CORE[action] : undefined;
  const primary = core ? core.filter(present) : focus;
  // Einsteiger-Kern leer (z. B. KI lieferte andere Felder) → Fokusfelder bzw. erste vorhandene zeigen
  const shown = primary.length ? primary : focus.length ? focus : ORDER.filter(present).slice(0, 2);
  return { primary: shown, more: ORDER.filter((k) => present(k) && !shown.includes(k)) };
}
