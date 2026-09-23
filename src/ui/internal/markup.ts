/**
 * Parser für Inhalts-Markup (`Md`) – erzeugt eine Baumstruktur, die RichText als React-Elemente
 * rendert (nie innerHTML).
 *   **fett**, _kursiv_, `Zielsprache`, Zeilen mit "- " / "• " → Aufzählung, "1. " → nummerierte Liste,
 *   Zeilenumbruch → <br>, Leerzeile → neuer Absatz, \* \_ \` → wörtliche Zeichen.
 */

export type Inline = string | { t: 'b' | 'i'; c: Inline[] } | { t: 'target'; text: string };
export type Block = { t: 'p'; lines: string[] } | { t: 'ul' | 'ol'; items: string[] };

const MAX_DEPTH = 4;
const WORD = /[\p{L}\p{N}]/u;

function findClosingTick(src: string, from: number): number {
  const end = src.indexOf('`', from);
  return end > from ? end : -1;
}

function isUnderscoreOpen(src: string, i: number): boolean {
  const prev = i > 0 ? src[i - 1] : '';
  const next = src[i + 1] ?? '';
  return (prev === '' || !WORD.test(prev)) && next !== '' && !/\s/.test(next) && next !== '_';
}

function findClosingUnderscore(src: string, from: number): number {
  for (let j = from; j < src.length; j++) {
    const ch = src[j];
    if (ch === '\\') {
      j++;
      continue;
    }
    if (ch === '`') {
      const end = findClosingTick(src, j + 1);
      if (end > 0) j = end;
      continue;
    }
    if (ch === '_' && j > from && !/\s/.test(src[j - 1]) && !WORD.test(src[j + 1] ?? '')) return j;
  }
  return -1;
}

function findClosingBold(src: string, from: number): number {
  for (let j = from; j < src.length - 1; j++) {
    const ch = src[j];
    if (ch === '\\') {
      j++;
      continue;
    }
    if (ch === '`') {
      const end = findClosingTick(src, j + 1);
      if (end > 0) j = end;
      continue;
    }
    if (ch === '*' && src[j + 1] === '*' && j > from) return j;
  }
  return -1;
}

export function parseInline(src: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => {
    if (buf) out.push(buf);
    buf = '';
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length && '*_`\\'.includes(src[i + 1])) {
      buf += src[i + 1];
      i += 2;
      continue;
    }
    if (ch === '`') {
      const end = findClosingTick(src, i + 1);
      if (end > 0) {
        const text = src.slice(i + 1, end).trim();
        if (text) {
          flush();
          out.push({ t: 'target', text });
          i = end + 1;
          continue;
        }
      }
    } else if (ch === '*' && src[i + 1] === '*' && depth < MAX_DEPTH) {
      const end = findClosingBold(src, i + 2);
      if (end > 0) {
        flush();
        out.push({ t: 'b', c: parseInline(src.slice(i + 2, end), depth + 1) });
        i = end + 2;
        continue;
      }
    } else if (ch === '_' && depth < MAX_DEPTH && isUnderscoreOpen(src, i)) {
      const end = findClosingUnderscore(src, i + 1);
      if (end > 0) {
        flush();
        out.push({ t: 'i', c: parseInline(src.slice(i + 1, end), depth + 1) });
        i = end + 1;
        continue;
      }
    }
    buf += ch;
    i++;
  }
  flush();
  return out;
}

export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  for (const raw of md.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      cur = null;
      continue;
    }
    const ul = /^[-•–]\s+(.*)$/.exec(line);
    const ol = /^\d{1,3}[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (!cur || cur.t !== kind) {
        cur = { t: kind, items: [] };
        blocks.push(cur);
      }
      (cur as { items: string[] }).items.push((ul ?? ol)![1]);
      continue;
    }
    if (!cur || cur.t !== 'p') {
      cur = { t: 'p', lines: [] };
      blocks.push(cur);
    }
    cur.lines.push(line);
  }
  return blocks;
}
