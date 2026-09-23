/**
 * Reine Zeit- und Textlogik des Song-Players (ohne React/DOM):
 * aktuelle Zeile, Wort-Fortschritt (nach Silben geschätzt), Abschnitte, Lücken- und Hinweisauswahl,
 * Übersetzungs-Auswahl und Zeitformat.
 */
import type { Song, SongLine, SongToken } from '../../../content/types';
import { hashString, seededShuffle } from '../../../engine/text';

export type LangBase = 'es' | 'pt';

/** Zeile gilt so viele ms vor ihrem Start schon als aktuell (Lesen braucht Vorlauf). */
export const LINE_LEAD_MS = 250;
/** Sprung zu einer Zeile landet so viele ms vor ihrem Start (weicher Einstieg). */
export const LINE_PREROLL_MS = 200;
/** Fortsetzen erst ab dieser Position anbieten */
export const RESUME_MIN_MS = 5000;

type TimedLine = Pick<SongLine, 'startMs' | 'endMs'>;

/** Index der aktuellen Zeile (letzte mit startMs − Vorlauf ≤ t); −1 vor der ersten Zeile. */
export function lineIndexAt(lines: readonly TimedLine[], t: number, lead = LINE_LEAD_MS): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].startMs - lead <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Startposition für einen Sprung zu Zeile `i` */
export const seekTargetFor = (lines: readonly TimedLine[], i: number) =>
  Math.max(0, (lines[Math.max(0, Math.min(lines.length - 1, i))]?.startMs ?? 0) - LINE_PREROLL_MS);

// ───────────────────────── Silben & Wort-Fortschritt ─────────────────────────

const STRONG = 'aeoáéóàâêôãõíú';
const WEAK = 'iuüy';

/**
 * Silbenzahl (Näherung für Spanisch/Portugiesisch): Vokalgruppen; zwei starke Vokale (a, e, o,
 * betonte Vokale) bilden einen Hiat und zählen doppelt, schwache (i, u) verschmelzen zum Diphthong.
 */
export function syllableCount(word: string): number {
  const w = word.toLowerCase().normalize('NFC').replace(/[^a-zà-ÿãõç]/g, '');
  if (!w) return 0;
  let count = 0;
  let prev: 'strong' | 'weak' | null = null;
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const isY = ch === 'y';
    // „y“ ist nur am Wortende bzw. allein ein Vokal („muy“, „y“)
    const vowelY = isY && (i === w.length - 1) && (w.length === 1 || !(STRONG + WEAK).includes(w[i - 1] ?? ''));
    const kind: 'strong' | 'weak' | null = STRONG.includes(ch) ? 'strong' : WEAK.includes(ch) && (!isY || vowelY) ? 'weak' : null;
    if (kind) {
      if (prev === null || (prev === 'strong' && kind === 'strong')) count += 1;
      prev = kind;
    } else {
      prev = null;
    }
  }
  return Math.max(1, count);
}

export interface WordSpan {
  /** Index in line.tokens */
  tokenIndex: number;
  startMs: number;
  endMs: number;
}

/** Durchschnittliche Silbendauer der Sprachausgabe bei Rate 1 (ms) */
export const TTS_SYLLABLE_MS = 185;

/**
 * Geschätzte Wortzeiten einer Zeile: gewichtet nach Silben (+ kurze Wortgrenze).
 * `syllableMs` (optional) begrenzt den gesungenen Teil auf die Sprechdauer der Sprachausgabe;
 * sonst wird der Text über 92 % der Zeilendauer verteilt.
 */
export function wordSpans(line: Pick<SongLine, 'startMs' | 'endMs' | 'tokens'>, syllableMs?: number): WordSpan[] {
  const words = line.tokens
    .map((t, i) => ({ i, t }))
    .filter(({ t }) => !t.p && /[\p{L}\p{N}]/u.test(t.t));
  if (!words.length) return [];
  const weights = words.map(({ t }) => syllableCount(t.t) + 0.35);
  const total = weights.reduce((a, b) => a + b, 0);
  const dur = Math.max(1, line.endMs - line.startMs);
  const sung = syllableMs && syllableMs > 0
    ? Math.min(dur * 0.97, weights.reduce((a, w) => a + (w - 0.35), 0) * syllableMs + words.length * syllableMs * 0.25)
    : dur * 0.92;
  let cursor = line.startMs;
  return words.map(({ i }, k) => {
    const len = (weights[k] / total) * sung;
    const span = { tokenIndex: i, startMs: Math.round(cursor), endMs: Math.round(cursor + len) };
    cursor += len;
    return span;
  });
}

/** Wortfortschritt zur Zeit t: Index in `spans` (−1 = noch keins) und Anteil 0..1 des aktuellen Worts */
export function wordProgressAt(spans: readonly WordSpan[], t: number): { index: number; frac: number } {
  if (!spans.length || t < spans[0].startMs) return { index: -1, frac: 0 };
  for (let k = spans.length - 1; k >= 0; k--) {
    const s = spans[k];
    if (t >= s.startMs) {
      if (t >= s.endMs) return { index: k, frac: 1 };
      return { index: k, frac: Math.max(0, Math.min(1, (t - s.startMs) / Math.max(1, s.endMs - s.startMs))) };
    }
  }
  return { index: -1, frac: 0 };
}

// ───────────────────────── Zeit & Abschnitte ─────────────────────────

/** 83 500 → „1:23“ */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor((Number.isFinite(ms) ? ms : 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Sprechbare Zeitangabe für Screenreader: „1 Minute 23 Sekunden“ */
export function spokenTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (m) parts.push(`${m} ${m === 1 ? 'Minute' : 'Minuten'}`);
  parts.push(`${s} ${s === 1 ? 'Sekunde' : 'Sekunden'}`);
  return parts.join(' ');
}

export interface SectionRange {
  id: string;
  label: string;
  firstIdx: number;
  lastIdx: number;
  startMs: number;
  endMs: number;
}

/** Abschnitte in Reihenfolge ihres ersten Auftretens (Wiederholungen desselben Abschnitts einzeln). */
export function sectionRanges(song: Pick<Song, 'sections' | 'lines'>): SectionRange[] {
  const labels = new Map(song.sections.map((s) => [s.id, s.label]));
  const out: SectionRange[] = [];
  song.lines.forEach((l, i) => {
    const last = out[out.length - 1];
    if (last && last.id === l.sectionId && last.lastIdx === i - 1) {
      last.lastIdx = i;
      last.endMs = l.endMs;
    } else {
      out.push({ id: l.sectionId, label: labels.get(l.sectionId) ?? 'Abschnitt', firstIdx: i, lastIdx: i, startMs: l.startMs, endMs: l.endMs });
    }
  });
  // gleiche Labels durchnummerieren („Refrain“, „Refrain 2“)
  const seen = new Map<string, number>();
  for (const r of out) {
    const n = (seen.get(r.label) ?? 0) + 1;
    seen.set(r.label, n);
    if (n > 1) r.label = `${r.label} ${n}`;
  }
  return out;
}

/** Fortsetzen anbieten? (nicht ganz am Anfang, nicht kurz vor Ende) */
export function shouldOfferResume(positionMs: number | undefined, durationMs: number): boolean {
  if (!positionMs || !Number.isFinite(positionMs)) return false;
  return positionMs >= RESUME_MIN_MS && positionMs < durationMs - 8000;
}

/** Position auf den Beginn der dort laufenden Zeile zurücksetzen (Lernfreundlicher Wiedereinstieg). */
export function resumeTarget(lines: readonly TimedLine[], positionMs: number): number {
  const i = lineIndexAt(lines, positionMs, 0);
  return i < 0 ? 0 : seekTargetFor(lines, i);
}

// ───────────────────────── Lücken & Hinweise ─────────────────────────

const STOPWORDS: Record<LangBase, ReadonlySet<string>> = {
  es: new Set(('el la los las lo un una unos unas y e o u ni de del a al en que con por para se me te le les nos os ' +
    'mi mis tu tus su sus es son no si sí ya muy más pero como cuando donde yo tú él ella ellos ellas usted ' +
    'este esta esto ese esa eso hay qué cómo quién sin sobre entre hasta desde').split(' ')),
  pt: new Set(('o a os as um uma uns umas e ou de do da dos das em no na nos nas que com por para pra se me te ' +
    'lhe lhes eu tu ele ela eles elas você é são não sim já muito mais mas como quando onde meu minha seu sua ' +
    'este esta isto esse essa isso há sem sobre entre até desde num numa').split(' ')),
};

export const GAP_LEVELS = [0, 25, 50, 100] as const;
export type GapPct = (typeof GAP_LEVELS)[number];

const bareWord = (t: string) => t.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}'’-]/gu, '');

/** Inhaltswort-Gewicht: Funktionswörter 0, sonst höher für Glossar-Wörter und längere Wörter */
export function contentScore(token: SongToken, base: LangBase): number {
  const w = bareWord(token.t);
  if (!w || token.p) return -1;
  if (STOPWORDS[base].has(w)) return 0;
  return 1 + (token.g ? 0.6 : 0) + Math.min(w.length, 9) / 18;
}

/**
 * Wählt die Lücken einer Zeile (Token-Indizes, aufsteigend). Anteil 0/25/50/100 % der Wörter,
 * bei > 0 % mindestens eine Lücke; Inhaltswörter werden bevorzugt, Gleichstand deterministisch
 * nach `seed` (z. B. Song-ID + Zeilen-ID) gemischt.
 */
export function chooseGaps(tokens: readonly SongToken[], pct: number, base: LangBase, seed: string): number[] {
  const words = tokens.map((t, i) => ({ i, score: contentScore(t, base) })).filter((w) => w.score >= 0);
  if (!words.length || pct <= 0) return [];
  if (pct >= 100) return words.map((w) => w.i);
  const count = Math.max(1, Math.round((words.length * pct) / 100));
  const shuffled = seededShuffle(words, seed);
  const ranked = shuffled.sort((a, b) => b.score - a.score);
  return ranked.slice(0, count).map((w) => w.i).sort((a, b) => a - b);
}

/** Karaoke-Hinweis: nur der Wortanfang bleibt sichtbar („quiero“ → „q·····“, „¿Dónde“ → „¿D····“) */
export function hintWord(word: string): string {
  const chars = Array.from(word);
  const firstLetter = chars.findIndex((c) => /\p{L}|\p{N}/u.test(c));
  if (firstLetter < 0) return word;
  return chars.map((c, i) => (i <= firstLetter || !/\p{L}|\p{N}/u.test(c) ? c : '·')).join('');
}

/** Akzeptierte Lösung für eine Lücke (ohne umgebende Satzzeichen) */
export const gapSolution = (token: SongToken) => token.t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

// ───────────────────────── Übersetzungs-Auswahl ─────────────────────────

export interface TranslationChoice {
  options: string[];
  correct: number;
}

/**
 * Mehrfachauswahl für die Übersetzung einer Zeile: richtige natürliche Übersetzung + bis zu
 * `count − 1` verschiedene Übersetzungen anderer Zeilen. null, wenn die Zeile keine Übersetzung hat
 * oder es keine Ablenker gibt.
 */
export function translationChoice(lines: readonly Pick<SongLine, 'id' | 'natural'>[], index: number, seed: string, count = 3): TranslationChoice | null {
  const line = lines[index];
  const correct = line?.natural?.trim();
  if (!correct) return null;
  const norm = (s: string) => s.trim().toLowerCase();
  const pool = [...new Set(lines.map((l) => l.natural?.trim() ?? '').filter((n) => n && norm(n) !== norm(correct)))];
  if (!pool.length) return null;
  const distractors = seededShuffle(pool, `${seed}:d`).slice(0, Math.max(1, count - 1));
  const options = seededShuffle([correct, ...distractors], `${seed}:o`);
  return { options, correct: options.indexOf(correct) };
}

/** Stabiler Seed für eine Zeile */
export const lineSeed = (songId: string, lineId: string) => String(hashString(`${songId}:${lineId}`));
