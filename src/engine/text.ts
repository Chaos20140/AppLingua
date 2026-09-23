/**
 * Textwerkzeuge für die Bewertung von Antworten (rein, ohne React).
 */

const APOSTROPHES = /[‘’‛ʼ´`]/g;
const DASHES = /[‐-―]/g;
/** Satzzeichen, die beim Vergleich keine Rolle spielen (Apostroph ' bleibt erhalten, z. B. pt. „d'água“). */
const PUNCT = /[¿¡.,!?;:"“”„«»‹›…()[\]{}]/g;
const INVISIBLE = /[​-‍﻿]/g;

/**
 * Normalisiert eine Antwort für den Vergleich: Kleinschreibung, typografische Apostrophe → ',
 * Satzzeichen (¿¡.,!?;: usw.) entfernen, Mehrfach-Leerzeichen zusammenfassen, trimmen.
 * Akzente bleiben erhalten (siehe {@link stripAccents}).
 */
export function normalize(s: string): string {
  return (s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(INVISIBLE, '')
    .replace(APOSTROPHES, "'")
    .replace(DASHES, ' ')
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Entfernt diakritische Zeichen (á→a, ñ→n, ç→c, ü→u, ã→a). */
export function stripAccents(s: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

/** Normalisiert und entfernt Akzente – Vergleichsschlüssel für tolerante Vergleiche. */
export const looseKey = (s: string) => stripAccents(normalize(s));

/** Klassische Levenshtein-Distanz (Einfügen/Löschen/Ersetzen je 1). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let cur = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= b.length; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/**
 * Prüft, ob sich a und b um genau eine Bearbeitung unterscheiden, und liefert die Position
 * der Abweichung (Index des ersten unterschiedlichen Zeichens). null = gleich oder > 1 Bearbeitung.
 */
export function singleEditPosition(a: string, b: string): number | null {
  if (a === b || Math.abs(a.length - b.length) > 1) return null;
  if (levenshtein(a, b) !== 1) return null;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Zerlegt Text in normalisierte Wörter. */
export function tokenizeWords(s: string): string[] {
  const n = normalize(s);
  return n ? n.split(' ') : [];
}

/** Wörter ohne Satzzeichen, aber mit Originalschreibung (für Anzeigen/Erklärungen). */
export function displayWords(s: string): string[] {
  const n = (s ?? '')
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(APOSTROPHES, "'")
    .replace(DASHES, ' ')
    .replace(PUNCT, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return n ? n.split(' ') : [];
}

/** Fügt Tokens lesbar zusammen (kein Leerzeichen vor .,!?;: und nach ¿¡). */
export function joinTokens(tokens: string[]): string {
  let out = '';
  for (const t of tokens) {
    if (!out) { out = t; continue; }
    if (/^[.,!?;:…)\]»”]/.test(t) || /[¿¡(«“„[]$/.test(out)) out += t;
    else out += ' ' + t;
  }
  return out;
}

export type WordDiff =
  | { op: 'same'; word: string }
  | { op: 'accent'; user: string; expected: string }
  | { op: 'wrong'; user: string; expected: string }
  | { op: 'missing'; expected: string }
  | { op: 'extra'; user: string };

/**
 * Wortweiser Vergleich (LCS auf akzentfreien Wörtern). Benachbarte fehlende/überflüssige
 * Wörter werden zu „falsches Wort“ zusammengefasst.
 */
export function diffWords(user: string[], expected: string[]): WordDiff[] {
  const u = user.map((w) => stripAccents(w.toLowerCase()));
  const e = expected.map((w) => stripAccents(w.toLowerCase()));
  const n = u.length, m = e.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = u[i] === e[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const raw: WordDiff[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (u[i] === e[j]) {
      raw.push(user[i].toLowerCase() === expected[j].toLowerCase() ? { op: 'same', word: expected[j] } : { op: 'accent', user: user[i], expected: expected[j] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ op: 'extra', user: user[i++] });
    } else {
      raw.push({ op: 'missing', expected: expected[j++] });
    }
  }
  while (i < n) raw.push({ op: 'extra', user: user[i++] });
  while (j < m) raw.push({ op: 'missing', expected: expected[j++] });

  // Läufe aus extra/missing paarweise zu „wrong“ zusammenfassen
  const out: WordDiff[] = [];
  let k = 0;
  while (k < raw.length) {
    const op = raw[k].op;
    if (op !== 'extra' && op !== 'missing') { out.push(raw[k++]); continue; }
    const extras: string[] = [];
    const missing: string[] = [];
    while (k < raw.length && (raw[k].op === 'extra' || raw[k].op === 'missing')) {
      const r = raw[k++];
      if (r.op === 'extra') extras.push(r.user);
      else if (r.op === 'missing') missing.push(r.expected);
    }
    const pairs = Math.min(extras.length, missing.length);
    for (let p = 0; p < pairs; p++) out.push({ op: 'wrong', user: extras[p], expected: missing[p] });
    for (let p = pairs; p < missing.length; p++) out.push({ op: 'missing', expected: missing[p] });
    for (let p = pairs; p < extras.length; p++) out.push({ op: 'extra', user: extras[p] });
  }
  return out;
}

/** Deterministischer 32-Bit-Hash (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministischer Zufallsgenerator (mulberry32) für reproduzierbare Auswahl. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministisches Mischen (Fisher-Yates) anhand eines Seeds. */
export function seededShuffle<T>(items: readonly T[], seed: string | number): T[] {
  const rnd = seededRandom(typeof seed === 'number' ? seed : hashString(seed));
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
