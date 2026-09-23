/**
 * „Verständlichkeit laut Spracherkennung“ – KEINE phonetische Analyse.
 *
 * Vergleicht den Zieltext mit den Hypothesen der Spracherkennung (alle Alternativen):
 * 1. Normalisierung (Kleinschreibung, Satzzeichen, Zahlen → Wörter, Akzente),
 * 2. gewichtete Wortausrichtung (LCS) – gleich klingende Schreibungen zählen als erkannt
 *    (z. B. b/v, ll/y, stummes h im Spanischen; -l/-u im brasilianischen Portugiesisch),
 * 3. Heuristik für typische Problemlaute aus den Unterschieden erkannter vs. Zielwörter,
 * 4. konkrete deutsche Tipps je Problem-Code.
 * Stimme, Klangfarbe oder Gesang werden nie bewertet – nur, ob die Erkennung dich versteht.
 */

export const SCORE_LABEL = 'Verständlichkeit laut Spracherkennung';
export const SCORE_DISCLAIMER =
  'Gemessen wird nur, wie gut die Spracherkennung deines Geräts dich versteht – keine phonetische Analyse und keine Bewertung deiner Stimme.';

export interface PronWord {
  /** Wort wie im Zieltext (inkl. anhängender Satzzeichen) */
  text: string;
  ok: boolean;
  /** was die Erkennung stattdessen verstanden hat (falls abweichend) */
  heard?: string;
}

export type PronRating = 'excellent' | 'good' | 'partial' | 'poor';

export interface PronScore {
  /** 0–100 */
  scorePct: number;
  words: PronWord[];
  /** Problem-Codes (max. 3), z. B. 'rr', 'j', 'nasal', 'stress' */
  issues: string[];
  /** konkrete deutsche Tipps (je Code, ggf. allgemeiner Hinweis) */
  tips: string[];
  /** Hinweise wie „„perro“ wurde als „pero“ verstanden.“ */
  notes: string[];
  /** die am besten passende Hypothese */
  transcript: string;
  rating: PronRating;
  /** kurze deutsche Einordnung */
  summary: string;
}

export interface ScoreOptions {
  /** 'es-ES' | 'es-MX' | 'es-LA' | 'pt-BR' … */
  lang: string;
  /** Problem-Codes des Items, die bei schlechter Erkennung vermutet werden */
  issueCodes?: string[];
}

type Base = 'es' | 'pt';

export const ISSUE_CODES: Record<Base, readonly string[]> = {
  es: ['rr', 'r', 'j', 'g', 'll-y', 'ny', 'b-v', 'c-z', 'h', 'stress', 'vowels'],
  pt: ['nasal', 'ao', 'lh', 'nh', 'r', 'd-t', 'l-final', 'open-closed', 'stress'],
};

const baseOf = (lang: string): Base => (lang.trim().toLowerCase().startsWith('pt') ? 'pt' : 'es');
const isLatAm = (lang: string) => /^es[-_](?!es\b)/i.test(lang.trim());

// ───────────────────────── Normalisierung ─────────────────────────
const MARK = /[̀-ͯ]/;

/** Kleinschreibung ohne Akzente; behält ñ (es) bzw. ã/õ/ç (pt). */
export function foldWord(s: string, base: Base): string {
  const d = s.toLowerCase().normalize('NFD');
  let out = '';
  for (const ch of d) {
    if (MARK.test(ch)) {
      const prev = out[out.length - 1];
      if (ch === '̃' && ((base === 'es' && prev === 'n') || (base === 'pt' && (prev === 'a' || prev === 'o')))) out += ch;
      else if (ch === '̧' && base === 'pt' && prev === 'c') out += ch;
      continue;
    }
    out += ch;
  }
  return out.normalize('NFC');
}

function splitTokens(text: string): string[] {
  return text.toLowerCase().normalize('NFC').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// Zahlen (0–100) → Wörter, weil die Erkennung oft Ziffern schreibt
const ES_UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const ES_TENS: Record<number, string> = { 3: 'treinta', 4: 'cuarenta', 5: 'cincuenta', 6: 'sesenta', 7: 'setenta', 8: 'ochenta', 9: 'noventa' };
const PT_UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const PT_TENS: Record<number, string> = { 2: 'vinte', 3: 'trinta', 4: 'quarenta', 5: 'cinquenta', 6: 'sessenta', 7: 'setenta', 8: 'oitenta', 9: 'noventa' };
/** Formvarianten: passt eine davon zum Zieltext, wird sie verwendet (1 → una, 2 → duas …) */
const NUM_VARIANTS: Record<string, string[]> = {
  uno: ['un', 'una'], veintiuno: ['veintiún', 'veintiuna'],
  um: ['uma'], dois: ['duas'], catorze: ['quatorze'],
};

function numberWords(n: number, base: Base): string[] | null {
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  if (base === 'es') {
    if (n < 30) return [ES_UNITS[n]];
    if (n === 100) return ['cien'];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u ? [ES_TENS[t], 'y', ES_UNITS[u]] : [ES_TENS[t]];
  }
  if (n < 20) return [PT_UNITS[n]];
  if (n === 100) return ['cem'];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u ? [PT_TENS[t], 'e', PT_UNITS[u]] : [PT_TENS[t]];
}

interface Tok {
  /** klein, mit Akzenten */
  raw: string;
  /** ohne Akzente (ñ/ã/õ/ç bleiben) */
  f: string;
  /** Lautschlüssel (gleich klingende Schreibungen → gleicher Schlüssel) */
  k: string;
}

function makeTok(raw: string, base: Base): Tok {
  const f = foldWord(raw, base);
  return { raw, f, k: base === 'es' ? keyEs(f) : keyPt(f) };
}

function expandTokens(words: string[], base: Base, targetRaw: Set<string>): string[] {
  const out: string[] = [];
  for (const w of words) {
    if (/^\d+$/.test(w)) {
      const nw = numberWords(parseInt(w, 10), base);
      if (nw) {
        for (const x of nw) {
          const alt = [x, ...(NUM_VARIANTS[x] ?? [])].find((v) => targetRaw.has(v));
          out.push(alt ?? x);
        }
        continue;
      }
    }
    out.push(w);
  }
  return out;
}

// ───────────────────────── Lautschlüssel ─────────────────────────
function keyEs(f: string): string {
  let w = f.replace(/x/g, 'ks').replace(/ü/g, 'u');
  w = w.replace(/ch/g, 'C');
  w = w.replace(/qu(?=[ei])/g, 'k').replace(/gu(?=[ei])/g, 'G');
  w = w.replace(/g(?=[ei])/g, 'x').replace(/j/g, 'x').replace(/G/g, 'g');
  w = w.replace(/c(?=[ei])/g, 's').replace(/z/g, 's').replace(/[cqk]/g, 'k');
  w = w.replace(/h/g, '').replace(/v/g, 'b').replace(/w/g, 'u');
  w = w.replace(/ll/g, 'y').replace(/y(?![aeiou])/g, 'i');
  w = w.replace(/ñ/g, 'N');
  w = w.replace(/rr/g, 'R').replace(/^r/, 'R').replace(/([nls])r/g, '$1R');
  return w.replace(/(.)\1+/g, '$1');
}

const NASAL: Record<string, string> = { a: 'ã', e: 'ẽ', i: 'ĩ', o: 'õ', u: 'ũ' };

function keyPt(f: string): string {
  let w = f.replace(/ü/g, 'u');
  w = w.replace(/ch/g, 'X').replace(/lh/g, 'L').replace(/nh/g, 'N');
  w = w.replace(/qu(?=[ei])/g, 'k').replace(/gu(?=[ei])/g, 'G');
  w = w.replace(/g(?=[ei])/g, 'J').replace(/j/g, 'J').replace(/G/g, 'g');
  w = w.replace(/ç/g, 's').replace(/c(?=[ei])/g, 's').replace(/[cqk]/g, 'k');
  w = w.replace(/ss/g, 's').replace(/([aeiouãõ])s(?=[aeiouãõ])/g, '$1z').replace(/z$/, 's');
  w = w.replace(/x/g, 'X').replace(/h/g, '');
  w = w.replace(/rr/g, 'R').replace(/^r/, 'R').replace(/([nls])r/g, '$1R');
  w = w.replace(/ão/g, 'ãu').replace(/am$/, 'ãu').replace(/ens$/, 'ẽis').replace(/em$/, 'ẽi').replace(/ãe/g, 'ãi').replace(/õe/g, 'õi');
  w = w.replace(/([aeiou])[mn](?=[^aeiouãõẽĩũ]|$)/g, (_, v: string) => NASAL[v] ?? v);
  w = w.replace(/l(?=[^aeiouãõẽĩũ]|$)/g, 'u');
  w = w.replace(/o(s?)$/, 'u$1').replace(/e(s?)$/, 'i$1');
  w = w.replace(/t(?=i)/g, 'C').replace(/d(?=i)/g, 'D');
  return w.replace(/(.)\1+/g, '$1');
}

// ───────────────────────── Distanz & Ausrichtung ─────────────────────────
function lev<T>(a: ArrayLike<T>, b: ArrayLike<T>): number {
  const m = b.length;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[m];
}

type Op = { t: string | null; h: string | null; ti: number };

/** Einheiten-Ausrichtung (Levenshtein mit Rückverfolgung) → nur die Abweichungen. */
function diffUnits(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  const ops: Op[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] !== b[j - 1]) ops.push({ t: a[i - 1], h: b[j - 1], ti: i - 1 });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ t: a[i - 1], h: null, ti: i - 1 });
      i--;
    } else {
      ops.push({ t: null, h: b[j - 1], ti: i });
      j--;
    }
  }
  return ops.reverse();
}

interface Match {
  w: number;
  ok: boolean;
  near?: boolean;
  accent?: 'stress' | 'open-closed';
}

const ACCENT_MARKS = new Set(['́', '̂']); // Akut, Zirkumflex (Gravis/Tilde zählen nicht)

function accentSig(raw: string): Map<number, string> {
  const sig = new Map<number, string>();
  let idx = -1;
  for (const ch of raw.normalize('NFD')) {
    if (MARK.test(ch)) {
      if (ACCENT_MARKS.has(ch)) sig.set(idx, ch);
    } else idx++;
  }
  return sig;
}

function accentDiff(t: string, h: string, base: Base): 'stress' | 'open-closed' | null {
  const a = accentSig(t);
  const b = accentSig(h);
  if (a.size === b.size && [...a].every(([i, m]) => b.get(i) === m)) return null;
  if (base === 'pt' && a.size === 1 && b.size === 1) {
    const [[ia, ma]] = [...a];
    const [[ib, mb]] = [...b];
    if (ia === ib && ma !== mb) return 'open-closed';
  }
  return 'stress';
}

function compare(t: Tok, h: Tok, base: Base, strictAccents: boolean): Match {
  if (t.f === h.f) {
    if (strictAccents && t.raw !== h.raw) {
      const acc = accentDiff(t.raw, h.raw, base);
      if (acc) return { w: 0.5, ok: false, accent: acc };
    }
    return { w: 1, ok: true };
  }
  if (t.k === h.k) return { w: 1, ok: true };
  const L = Math.max(t.k.length, h.k.length);
  if (L < 3) return { w: 0, ok: false };
  const sim = 1 - lev(t.k, h.k) / L;
  if (sim >= 0.5) return { w: 0.6 * sim, ok: false, near: true };
  return { w: 0, ok: false };
}

interface Alignment {
  score: number;
  /** je Zieltoken: Match + Index des gehörten Tokens (oder -1) */
  per: { m: Match; hi: number }[];
  heard: Tok[];
}

function align(T: Tok[], H: Tok[], base: Base, strictAccents: boolean): Alignment {
  const n = T.length;
  const m = H.length;
  const M: Match[][] = T.map((t) => H.map((h) => compare(t, h, base, strictAccents)));
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const w = M[i - 1][j - 1].w;
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], w > 0 ? dp[i - 1][j - 1] + w : 0);
    }
  }
  const per: { m: Match; hi: number }[] = T.map(() => ({ m: { w: 0, ok: false }, hi: -1 }));
  let i = n;
  let j = m;
  const EPS = 1e-9;
  while (i > 0 && j > 0) {
    const w = M[i - 1][j - 1].w;
    if (w > 0 && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + w)) < EPS) {
      per[i - 1] = { m: M[i - 1][j - 1], hi: j - 1 };
      i--;
      j--;
    } else if (Math.abs(dp[i][j] - dp[i - 1][j]) < EPS) i--;
    else j--;
  }
  const matched = dp[n][m];
  const recall = n ? matched / n : 0;
  const precision = m ? Math.min(1, matched / m) : 0;
  const score = m ? 100 * (0.85 * recall + 0.15 * precision) : 0;
  return { score, per, heard: H };
}

// ───────────────────────── Laut-Einheiten & Heuristik ─────────────────────────
const V = 'aeiou';
const isV = (c: string | undefined) => !!c && V.includes(c);

function unitsEs(f: string): string[] {
  const u: string[] = [];
  const s = f.replace(/ü/g, 'u');
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    const two = s.slice(i, i + 2);
    const next = s[i + 2] ?? '';
    if (two === 'rr') { u.push('R'); i += 2; continue; }
    if (two === 'll') { u.push('y'); i += 2; continue; }
    if (two === 'ch') { u.push('ch'); i += 2; continue; }
    if ((two === 'qu' || two === 'gu') && /[ei]/.test(next)) { u.push(two === 'qu' ? 'k' : 'g'); i += 2; continue; }
    const n1 = s[i + 1];
    if (c === 'r') u.push(i === 0 || /[nls]/.test(s[i - 1]) ? 'R' : 'r');
    else if (c === 'g') u.push(n1 && /[ei]/.test(n1) ? 'x' : 'g');
    else if (c === 'j') u.push('x');
    else if (c === 'c') u.push(n1 && /[ei]/.test(n1) ? 'z' : 'k');
    else if (c === 'q' || c === 'k') u.push('k');
    else if (c === 'v') u.push('b');
    else if (c === 'y') u.push(isV(n1) ? 'y' : 'i');
    else u.push(c);
    i++;
  }
  return u;
}

function unitsPt(f: string): string[] {
  const u: string[] = [];
  const s = f.replace(/ü/g, 'u');
  const isVp = (c: string | undefined) => !!c && 'aeiouãõ'.includes(c);
  for (let i = 0; i < s.length; ) {
    const c = s[i];
    const two = s.slice(i, i + 2);
    const n1 = s[i + 1];
    const n2 = s[i + 2] ?? '';
    if (two === 'lh' || two === 'nh' || two === 'ch') { u.push(two); i += 2; continue; }
    if (two === 'rr') { u.push('R'); i += 2; continue; }
    if (two === 'ss') { u.push('s'); i += 2; continue; }
    if ((two === 'qu' || two === 'gu') && /[ei]/.test(n2)) { u.push(two === 'qu' ? 'k' : 'g'); i += 2; continue; }
    if (two === 'ão' || two === 'ãe' || two === 'õe') { u.push(two); i += 2; continue; }
    if (isV(c) && (n1 === 'm' || n1 === 'n') && !isVp(n2) && n2 !== 'h') {
      // Nasalvokal: -am am Wortende klingt wie -ão
      u.push(c === 'a' && n1 === 'm' && i + 2 === s.length ? 'ão' : `${c}~`);
      i += 2;
      continue;
    }
    if (c === 'r') u.push(i === 0 || /[nls]/.test(s[i - 1]) ? 'R' : 'r');
    else if (c === 'l') u.push(isVp(n1) ? 'l' : 'L');
    else if (c === 'ç') u.push('s');
    else if (c === 'c') u.push(n1 && /[ei]/.test(n1) ? 's' : 'k');
    else if (c === 'g') u.push(n1 && /[ei]/.test(n1) ? 'j' : 'g');
    else if (c === 'q' || c === 'k') u.push('k');
    else if (c === 's') u.push(i > 0 && isVp(s[i - 1]) && isVp(n1) ? 'z' : 's');
    else if (c === 'h') { /* stumm */ }
    else u.push(c);
    i++;
  }
  return u;
}

const isNasalUnit = (x: string | null) => !!x && (x.includes('~') || /[ãõ]/.test(x));

function codesForOp(op: Op, tu: string[], base: Base): string[] {
  const { t, h } = op;
  const out: string[] = [];
  if (base === 'es') {
    if (t === 'R' && h !== 'R') out.push('rr');
    else if (t === 'r' && h !== 'r') out.push('r');
    else if (t === 'x' && h !== 'x') out.push('j');
    else if (t === 'g' && h !== 'g') out.push('g');
    else if (t === 'y' && h !== 'y') out.push('ll-y');
    else if (t === 'ñ') out.push('ny');
    else if (t === 'b' && h && ['f', 'w', 'p', 'u'].includes(h)) out.push('b-v');
    else if (t === 'z' && h !== 's' && h !== 'z') out.push('c-z');
    else if (t === 'h' && h && ['x', 'g', 'k'].includes(h)) out.push('h');
    else if (t === 'ch') out.push('h');
    else if (t && isV(t) && (h === null || isV(h))) out.push('vowels');
    else if (t === null && h === 'x' && tu[op.ti] === 'h') out.push('h');
    return out;
  }
  // Portugiesisch (Brasilien)
  if (t === 'ão' && h !== 'ão') out.push('ao');
  else if (isNasalUnit(t) && h !== t) out.push('nasal');
  else if (!isNasalUnit(t) && isNasalUnit(h)) out.push(h === 'ão' ? 'ao' : 'nasal');
  else if (t === 'lh') out.push('lh');
  else if (t === 'nh') out.push('nh');
  else if (t === 'R' || t === 'r') out.push('r');
  else if (t === 'L' && h !== 'u') out.push('l-final');
  else if ((t === 't' || t === 'd') && op.ti + 1 < tu.length) {
    const nx = tu[op.ti + 1];
    const last = op.ti + 2 === tu.length || (op.ti + 3 === tu.length && tu[op.ti + 2] === 's');
    if (nx === 'i' || (nx === 'e' && last)) out.push('d-t');
  } else if ((t === 'e' || t === 'o') && h && isV(h)) {
    const atEnd = op.ti >= tu.length - 2;
    const reduction = atEnd && ((t === 'e' && h === 'i') || (t === 'o' && h === 'u'));
    if (!reduction) out.push('open-closed');
  }
  return out;
}

function diffCodes(t: Tok, heard: string, base: Base): string[] {
  const units = base === 'es' ? unitsEs : unitsPt;
  const tu = units(t.f);
  const hu = units(foldWord(heard, base));
  const codes: string[] = [];
  for (const op of diffUnits(tu, hu)) codes.push(...codesForOp(op, tu, base));
  return codes;
}

/** Merkmale im Wort, die zu einem Problem-Code passen (für vermutete Probleme bei nicht erkannten Wörtern). */
const FEATURES: Record<Base, Record<string, RegExp>> = {
  es: {
    rr: /rr|^r|[nls]r/,
    r: /[aeiouáéíóú]r(?!r)|[bcdfgkpt]r/,
    j: /j|g[eiéí]/,
    g: /g[aouáóúlr]|gu[eiéí]/,
    'll-y': /ll|y[aeiouáéíóú]/,
    ny: /ñ/,
    'b-v': /[bv]/,
    'c-z': /z|c[eiéí]/,
    h: /h/,
    stress: /[aeiouáéíóú][^aeiouáéíóú]+[aeiouáéíóú]/,
    vowels: /[aeiouáéíóú]/,
  },
  pt: {
    nasal: /[ãõ]|[aeiouáéíóúâêô][mn](?![aeiouáéíóúâêôãõh])/,
    ao: /ão|am$/,
    lh: /lh/,
    nh: /nh/,
    r: /r/,
    'd-t': /[dt]i|[dt]es?$/,
    'l-final': /l(?![aeiouáéíóúâêôãõh])/,
    'open-closed': /[éêóô]|[eo]/,
    stress: /[aeiouáéíóúâêôãõ][^aeiouáéíóúâêôãõ]+[aeiouáéíóúâêôãõ]/,
  },
};

// ───────────────────────── Tipps ─────────────────────────
function tipFor(code: string, lang: string): string | null {
  const la = isLatAm(lang);
  const es: Record<string, string> = {
    rr: 'Gerolltes RR (auch R am Wortanfang und nach n, l, s): Zungenspitze locker an den Zahndamm hinter den oberen Schneidezähnen legen und mit kräftigem Luftstrom mehrmals flattern lassen – wie ein Motor „trrr“. Übe „tr-tr-trrr“, dann „pe-rro“. Nicht hinten im Rachen wie das deutsche R.',
    r: 'Einfaches R zwischen Vokalen: Die Zungenspitze tippt nur EINMAL ganz kurz hinter die oberen Zähne – fast wie ein schnelles „d“ in „Ruder“. Nicht rollen und nicht im Rachen: „pe-ro“ (aber) vs. „pe-rro“ (Hund).',
    j: la
      ? 'J (und G vor E/I): In Lateinamerika ein weicher, gehauchter Laut – wie ein kräftiges deutsches „h“ („julio“ ≈ „hulio“). Nicht wie das deutsche „j“ in „ja“.'
      : 'J (und G vor E/I): Rauer Reibelaut hinten im Rachen wie das „ch“ in „Bach“ – nicht wie in „ich“ und nicht wie das deutsche „j“: „jamón“ ≈ „chamón“ mit Bach-ch.',
    g: 'Hartes G vor A, O, U und in GUE/GUI wie in „Gabel“; zwischen Vokalen weicher, fast ohne Verschluss („agua“). In „guitarra“ und „guerra“ bleibt das U stumm.',
    'll-y': la
      ? 'LL und Y: wie das deutsche „j“ in „ja“, etwas kräftiger – „calle“ ≈ „ka-je“, nicht „ka-le“. (In Argentinien/Uruguay klingt es wie „sch“.)'
      : 'LL und Y: wie das deutsche „j“ in „ja“, etwas kräftiger – „calle“ ≈ „ka-je“, nicht „ka-le“.',
    ny: 'Ñ: „n“ und „j“ zu EINEM Laut verschmolzen wie in „Champagner“ – Zungenmitte an den Gaumen drücken: „España“ ≈ „es-pa-nja“, „año“ (Jahr) ist nicht „ano“.',
    'b-v': 'B und V klingen im Spanischen gleich: am Wortanfang wie deutsches „b“, zwischen Vokalen ein weiches „b“, bei dem sich die Lippen kaum berühren. Nie wie deutsches „w“ oder „f“: „vaca“ ≈ „baka“.',
    'c-z': la
      ? 'Z und C vor E/I: In Lateinamerika ein scharfes „s“ – „gracias“ ≈ „gra-sjas“, „cinco“ ≈ „sin-ko“. Nie wie das deutsche „z“ (ts).'
      : 'Z und C vor E/I: In Spanien wie das englische „th“ in „think“ – Zungenspitze leicht zwischen die Zähne: „cinco“ ≈ „θin-ko“. Nie wie das deutsche „z“ (ts).',
    h: 'H ist im Spanischen immer stumm: „hola“ ≈ „ola“, „hablar“ ≈ „ablar“. Nur CH spricht man – wie „tsch“ in „Matsch“: „chico“ ≈ „tschi-ko“.',
    stress: 'Betonung: Endet das Wort auf Vokal, -n oder -s, wird die vorletzte Silbe betont („HA-blo“), sonst die letzte („ciu-DAD“). Ein Akzent markiert Ausnahmen: „ha-BLÓ“, „ca-FÉ“. Die betonte Silbe deutlich länger und kräftiger sprechen.',
    vowels: 'Vokale: Spanisch hat nur fünf kurze, klare Vokale – a, e, i, o, u klingen immer gleich, auch unbetont. Nicht verschlucken, nicht zu „ə“ abschwächen, keine langen deutschen Vokale, kein „ö/ü“.',
  };
  const pt: Record<string, string> = {
    nasal: 'Nasalvokale (ã, õ, am, em, im, om, um): Luft gleichzeitig durch Mund UND Nase – wie im französischen „bon“. Das M/N am Silbenende nicht als eigenen Laut sprechen: „bom“ ≈ „bõ“, „sim“ ≈ „sĩ“.',
    ao: '-ÃO: ein nasales „au“ – Mund wie bei „au“, Luft durch die Nase, am Ende kein „m“ oder „n“: „não“ ≈ „nãu“, „pão“ ≈ „pãu“. Auch -am am Wortende („falam“) klingt so.',
    lh: 'LH: „l“ und „j“ zu EINEM Laut verschmolzen (wie italienisch „gli“): „filho“ ≈ „fi-ljo“. Zungenmitte an den Gaumen – nicht „fi-lo“.',
    nh: 'NH: wie „nj“ in „Champagner“, ein einziger weicher Laut: „vinho“ ≈ „vi-njo“, „amanhã“ ≈ „a-ma-njã“.',
    r: 'R im brasilianischen Portugiesisch: am Wortanfang und bei RR ein gehauchtes „ch/h“ („Rio“ ≈ „Hiu“, „carro“ ≈ „ka-hu“); zwischen Vokalen ein kurz getipptes Zungen-R („caro“). Tippen (caro) und Hauchen (carro) unterscheiden Wörter.',
    'd-t': 'D und T vor I (und vor unbetontem End-E): In Brasilien wie „dsch“ bzw. „tsch“ – „dia“ ≈ „dschi-a“, „leite“ ≈ „lej-tschi“, „cidade“ ≈ „si-da-dschi“.',
    'l-final': 'L am Silbenende klingt in Brasilien wie „u“: „Brasil“ ≈ „bra-ziu“, „alto“ ≈ „au-tu“. Kein deutsches „l“ halten.',
    'open-closed': 'Offene und geschlossene Vokale: é/ó offen (wie „ä“ in „Bär“, „o“ in „Sonne“), ê/ô geschlossen (wie „e“ in „See“, „o“ in „Sohn“): „avó“ (Oma) vs. „avô“ (Opa). Unbetontes -o am Wortende klingt wie „u“, -e wie „i“.',
    stress: 'Betonung: Wörter auf -a, -e, -o (auch mit -s), -am, -em werden meist auf der vorletzten Silbe betont, andere auf der letzten; Akzente (á, ê, ô …) markieren Ausnahmen: „ca-FÉ“, „vo-CÊ“. Die betonte Silbe klar länger sprechen.',
  };
  return (baseOf(lang) === 'es' ? es : pt)[code] ?? null;
}

/** Deutscher Tipp zu einem Problem-Code (für UI-Listen, z. B. Aussprache-Labor). */
export function issueTip(code: string, lang: string): string | null {
  return tipFor(code, lang);
}

function ratingOf(score: number): { rating: PronRating; summary: string } {
  if (score >= 90) return { rating: 'excellent', summary: 'Sehr gut verständlich – die Spracherkennung hat alles verstanden.' };
  if (score >= 70) return { rating: 'good', summary: 'Gut verständlich – nur kleine Unsicherheiten.' };
  if (score >= 40) return { rating: 'partial', summary: 'Teilweise verstanden – schau dir die markierten Wörter an.' };
  return { rating: 'poor', summary: 'Noch schwer verständlich – hör dir das Vorbild an und versuch es langsam noch einmal.' };
}

// ───────────────────────── Hauptfunktion ─────────────────────────
interface DisplayWord {
  text: string;
  toks: number[];
}

function displayWords(target: string, base: Base, targetRaw: Set<string>): { words: DisplayWord[]; toks: Tok[] } {
  const words: DisplayWord[] = [];
  const toks: Tok[] = [];
  for (const piece of target.trim().split(/\s+/).filter(Boolean)) {
    const sub = expandTokens(splitTokens(piece), base, targetRaw);
    if (!sub.length) {
      // reine Satzzeichen an das vorige Wort hängen
      if (words.length) words[words.length - 1].text += ` ${piece}`;
      continue;
    }
    const idx = sub.map((s) => {
      toks.push(makeTok(s, base));
      return toks.length - 1;
    });
    words.push({ text: piece, toks: idx });
  }
  return { words, toks };
}

/**
 * Bewertet die Verständlichkeit von `target` anhand der Erkennungs-Hypothesen `transcripts`.
 * Liefert immer ein Ergebnis (bei leerer Erkennung 0 %).
 */
export function scorePronunciation(target: string, transcripts: string[], opts: ScoreOptions): PronScore {
  const base = baseOf(opts.lang);
  const known = ISSUE_CODES[base];
  const itemCodes = (opts.issueCodes ?? []).filter((c) => known.includes(c));
  const targetRaw = new Set(splitTokens(target));
  const { words: dWords, toks: T } = displayWords(target, base, targetRaw);
  const strictAccents = T.length === 1 || itemCodes.includes('stress') || itemCodes.includes('open-closed');

  const hyps = transcripts
    .map((t) => (t ?? '').trim())
    .filter(Boolean)
    .map((t) => ({ text: t, toks: expandTokens(splitTokens(t), base, targetRaw).map((x) => makeTok(x, base)) }))
    .filter((h) => h.toks.length > 0);

  if (!T.length) {
    return { scorePct: 0, words: [], issues: [], tips: [], notes: [], transcript: hyps[0]?.text ?? '', ...ratingOf(0) };
  }

  let best: { a: Alignment; text: string } | null = null;
  for (const h of hyps) {
    const a = align(T, h.toks, base, strictAccents);
    if (!best || a.score > best.a.score + 1e-9) best = { a, text: h.text };
  }

  const scorePct = best ? Math.max(0, Math.min(100, Math.round(best.a.score))) : 0;
  const per = best?.a.per ?? T.map(() => ({ m: { w: 0, ok: false } as Match, hi: -1 }));
  const heard = best?.a.heard ?? [];

  // Lücken: nicht zugeordnete Ziel- und Hörwörter zwischen zwei Ankern paaren (für die Heuristik)
  const gapHeard = new Map<number, string>();
  if (best) {
    let lastT = -1;
    let lastH = -1;
    const flush = (tEnd: number, hEnd: number) => {
      const tIdx: number[] = [];
      for (let i = lastT + 1; i < tEnd; i++) if (per[i].hi < 0) tIdx.push(i);
      const hs = heard.slice(lastH + 1, hEnd).map((x) => x.raw);
      if (!tIdx.length || !hs.length) return;
      if (tIdx.length === hs.length) tIdx.forEach((ti, k) => gapHeard.set(ti, hs[k]));
      else if (tIdx.length === 1) gapHeard.set(tIdx[0], hs.join(''));
    };
    per.forEach((p, i) => {
      if (p.hi >= 0) {
        flush(i, p.hi);
        lastT = i;
        lastH = p.hi;
      }
    });
    flush(T.length, heard.length);
  }

  // Problem-Codes aus den Unterschieden
  const counts = new Map<string, number>();
  const bump = (c: string) => counts.set(c, (counts.get(c) ?? 0) + 1);
  const notes: string[] = [];
  const tokHeard: (string | undefined)[] = T.map(() => undefined);

  T.forEach((t, i) => {
    const p = per[i];
    if (p.m.ok) return;
    if (p.m.accent) {
      bump(p.m.accent);
      tokHeard[i] = heard[p.hi]?.raw;
      return;
    }
    let h: string | undefined;
    if (p.hi >= 0) h = heard[p.hi].raw;
    else if (gapHeard.has(i)) {
      const g = gapHeard.get(i)!;
      const gk = base === 'es' ? keyEs(foldWord(g, base)) : keyPt(foldWord(g, base));
      const L = Math.max(gk.length, t.k.length);
      if (L && 1 - lev(gk, t.k) / L >= 0.34) h = g;
    }
    if (h) {
      tokHeard[i] = h;
      for (const c of new Set(diffCodes(t, h, base))) if (known.includes(c)) bump(c);
    }
  });

  const words: PronWord[] = dWords.map((w) => {
    const ok = w.toks.every((i) => per[i].m.ok);
    const hs = w.toks.map((i) => tokHeard[i]).filter((x): x is string => !!x);
    const word: PronWord = { text: w.text, ok };
    if (!ok && hs.length) word.heard = hs.join(' ');
    return word;
  });

  for (const w of words) {
    if (notes.length >= 3) break;
    if (!w.ok && w.heard) notes.push(`„${w.text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')}“ wurde als „${w.heard}“ verstanden.`);
  }
  const missed = words.filter((w) => !w.ok && !w.heard).length;
  if (hyps.length && missed && notes.length < 3) {
    notes.push(missed === 1 ? 'Ein Wort wurde gar nicht erkannt.' : `${missed} Wörter wurden gar nicht erkannt.`);
  }

  // Reihenfolge: erkannte Codes (Item-Codes zuerst, dann nach Häufigkeit), danach vermutete Item-Codes
  const detected = [...counts.entries()]
    .sort((a, b) => Number(itemCodes.includes(b[0])) - Number(itemCodes.includes(a[0])) || b[1] - a[1])
    .map(([c]) => c);
  const issues = detected.slice(0, 3);
  if (scorePct < 85 && issues.length < 3 && itemCodes.length) {
    const missedRaw = dWords.filter((_, i) => !words[i].ok).map((w) => w.text.toLowerCase());
    for (const c of itemCodes) {
      if (issues.length >= 3) break;
      if (issues.includes(c)) continue;
      const re = FEATURES[base][c];
      const fits = !hyps.length || !missedRaw.length || !re || missedRaw.some((w) => re.test(w));
      if (fits && (missedRaw.length || scorePct < 60)) issues.push(c);
    }
  }

  const tips: string[] = [];
  if (!hyps.length) {
    tips.push('Die Spracherkennung hat nichts verstanden. Tippe auf „Sprechen“, warte kurz und sprich dann deutlich in normalem Tempo – nah am Mikrofon, möglichst ohne Hintergrundgeräusche.');
  }
  for (const c of issues) {
    const t = tipFor(c, opts.lang);
    if (t) tips.push(t);
  }
  if (hyps.length && scorePct < 70 && !issues.length) {
    tips.push('Sprich ruhig und deutlich, Wort für Wort, und höre dir vorher das Vorbild (auch langsam) an. Kurze Pausen zwischen den Wörtern helfen der Erkennung.');
  }

  return {
    scorePct,
    words,
    issues,
    tips,
    notes,
    transcript: best?.text ?? '',
    ...ratingOf(scorePct),
  };
}
