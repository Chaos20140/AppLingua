/**
 * Songtext im Player: Listenansicht (ganzer Text, Abschnitte, Auto-Scroll zur Mitte) oder
 * Fokusansicht (nur aktuelle + nächste Zeile). Wort-Fortschritt der aktuellen Zeile wird per
 * requestAnimationFrame direkt am DOM gesetzt (keine React-Renderlast pro Frame).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { ArrowDownToLine, Music2 } from 'lucide-react';
import type { Song, SongLine, SongToken } from '../../../content/types';
import { gapSolution, hintWord, sectionRanges, wordProgressAt, wordSpans } from './timeline';
import { cx, prefersReducedMotion } from './util';
import s from './player.module.css';

export type DisplayMode = 'original' | 'translation' | 'both';

export interface LyricsViewProps {
  song: Song;
  lang: string;
  lineIdx: number;
  focus: boolean;
  display: DisplayMode;
  showPhonetic: boolean;
  fontScale: number;
  /** Zeile → verdeckte Token-Indizes (Lückentext) */
  masks: ReadonlyMap<number, readonly number[]> | null;
  /** Lückentext-Modus: Lücken sind Leerstellen (Eingabe im Panel), Ergebnisse farbig */
  gapInputMode: boolean;
  gapResults: Readonly<Record<string, Readonly<Record<number, boolean>>>>;
  /** Karaoke: nur Wortanfänge */
  hints: boolean;
  revealedLines: ReadonlySet<number>;
  revealedWords: ReadonlySet<string>;
  onRevealWord: (key: string) => void;
  playing: boolean;
  clock: boolean;
  getTime: () => number;
  /** Silbendauer der Sprachausgabe (nur Demo-Quelle) für realistischeren Wort-Fortschritt */
  syllableMs?: number;
  onWord: (lineIdx: number, tokenIdx?: number) => void;
  onJump: (lineIdx: number) => void;
  renderPanel?: (lineIdx: number) => ReactNode;
  lineBadge?: (lineIdx: number) => ReactNode;
}

const NO_SPACE_BEFORE = /^[.,!?;:…)\]»”]/;
const NO_SPACE_AFTER = /[¿¡(«“„[]$/;

function spaced(tokens: readonly SongToken[]): boolean[] {
  return tokens.map((t, i) => i > 0 && !NO_SPACE_BEFORE.test(t.t) && !NO_SPACE_AFTER.test(tokens[i - 1].t));
}

interface LineTextProps {
  line: SongLine;
  lineIdx: number;
  lang: string;
  mask: readonly number[] | undefined;
  gapInputMode: boolean;
  results: Readonly<Record<number, boolean>> | undefined;
  hints: boolean;
  revealedWords: ReadonlySet<string>;
  onRevealWord: (key: string) => void;
  onWord: (lineIdx: number, tokenIdx?: number) => void;
  className?: string;
}

function LineText({ line, lineIdx, lang, mask, gapInputMode, results, hints, revealedWords, onRevealWord, onWord, className }: LineTextProps) {
  const spaces = spaced(line.tokens);
  let gapNo = 0;
  return (
    <p className={cx(s.target, className)} lang={lang}>
      {line.tokens.map((tok, ti) => {
        const sp = spaces[ti] ? ' ' : '';
        if (tok.p) return <span key={ti} className={s.punct}>{sp}{tok.t}</span>;
        const masked = mask?.includes(ti);
        if (masked && gapInputMode) {
          gapNo += 1;
          const r = results?.[ti];
          return (
            <span key={ti}>
              {sp}
              {r === undefined ? (
                <span className={s.blank} data-ti={ti} aria-label={`Lücke ${gapNo}`} style={{ minWidth: `${Math.max(3, gapSolution(tok).length)}ch` }}>
                  <span aria-hidden="true">{gapNo}</span>
                </span>
              ) : (
                <span className={cx(s.blankDone, r ? s.blankOk : s.blankMiss)} data-ti={ti}>{tok.t}</span>
              )}
            </span>
          );
        }
        const key = `${line.id}:${ti}`;
        if (masked && !revealedWords.has(key)) {
          return (
            <span key={ti}>
              {sp}
              <button
                type="button"
                className={s.masked}
                data-ti={ti}
                style={{ minWidth: `${Math.max(3, gapSolution(tok).length)}ch` }}
                onClick={() => onRevealWord(key)}
                aria-label="Verdecktes Wort – tippen zum Aufdecken"
              />
            </span>
          );
        }
        const text = hints ? hintWord(tok.t) : tok.t;
        return (
          <span key={ti}>
            {sp}
            <button
              type="button"
              className={s.word}
              data-ti={ti}
              onClick={() => onWord(lineIdx, ti)}
              aria-label={hints ? `Wort ${ti + 1}, beginnt mit „${text.replace(/·/g, '')}“ – Details` : undefined}
            >
              {text}
            </button>
          </span>
        );
      })}
    </p>
  );
}

/** Setzt data-state (sung/now) + --wp an den Wort-Elementen der aktuellen Zeile. */
function useWordProgress(
  rootRef: RefObject<HTMLElement | null>,
  line: SongLine | undefined,
  lineIdx: number,
  active: boolean,
  playing: boolean,
  getTime: () => number,
  syllableMs: number | undefined,
) {
  const spans = useMemo(() => (line ? wordSpans(line, syllableMs) : []), [line, syllableMs]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !line || !active) return;
    const lineEl = root.querySelector<HTMLElement>(`[data-line="${lineIdx}"] .${s.target}`);
    if (!lineEl) return;
    const els = new Map<number, HTMLElement>();
    lineEl.querySelectorAll<HTMLElement>('[data-ti]').forEach((el) => els.set(Number(el.dataset.ti), el));
    const states: string[] = [];
    const apply = () => {
      const { index, frac } = wordProgressAt(spans, getTime());
      spans.forEach((sp, k) => {
        const el = els.get(sp.tokenIndex);
        if (!el) return;
        const st = k < index || (k === index && frac >= 1) ? 'sung' : k === index ? 'now' : '';
        if (st === 'now') el.style.setProperty('--wp', `${Math.round(frac * 100)}%`);
        if (states[k] !== st) {
          states[k] = st;
          if (st) el.dataset.state = st;
          else delete el.dataset.state;
        }
      });
    };
    apply();
    let raf = 0;
    if (playing) {
      const loop = () => {
        apply();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => cancelAnimationFrame(raf);
  }, [rootRef, line, lineIdx, active, playing, getTime, spans]);

  // Beim Zeilenwechsel alte Markierungen entfernen
  useEffect(() => {
    const root = rootRef.current;
    return () => {
      root?.querySelectorAll<HTMLElement>(`[data-line="${lineIdx}"] [data-state]`).forEach((el) => { delete el.dataset.state; });
    };
  }, [rootRef, lineIdx]);
}

export default function LyricsView(p: LyricsViewProps) {
  const { song, lineIdx, focus } = p;
  const rootRef = useRef<HTMLDivElement>(null);
  const cur = lineIdx;
  const line = cur >= 0 ? song.lines[cur] : undefined;
  const sections = useMemo(() => sectionRanges(song), [song]);
  const firstOfSection = useMemo(() => new Map(sections.map((r) => [r.firstIdx, r.label])), [sections]);
  const showOriginal = p.display !== 'translation' || !song.lines.some((l) => l.natural);

  useWordProgress(rootRef, line, cur, p.clock && showOriginal && !p.hints, p.playing, p.getTime, p.syllableMs);

  // ── Auto-Scroll zur Bildschirmmitte (pausiert, solange der Nutzer selbst scrollt) ──
  const userScrollAt = useRef(0);
  const [detached, setDetached] = useState(false);

  useEffect(() => {
    const mark = () => { userScrollAt.current = Date.now(); };
    window.addEventListener('wheel', mark, { passive: true });
    window.addEventListener('touchmove', mark, { passive: true });
    return () => {
      window.removeEventListener('wheel', mark);
      window.removeEventListener('touchmove', mark);
    };
  }, []);

  const scrollToCurrent = (force = false) => {
    if (focus) return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-line="${Math.max(0, cur)}"]`);
    if (!el) return;
    if (!force && Date.now() - userScrollAt.current < 6000) return;
    const bar = document.querySelector<HTMLElement>('[data-player-bar]');
    const bottom = bar && bar.offsetParent !== null ? bar.getBoundingClientRect().top : window.innerHeight;
    const top = 64;
    const rect = el.getBoundingClientRect();
    const target = (top + bottom) / 2;
    // hohe Zeilen (mit Panel) oben ausrichten, damit das Panel sichtbar bleibt
    const delta = rect.height > (bottom - top) * 0.6 ? rect.top - top - 12 : rect.top + rect.height / 2 - target;
    if (Math.abs(delta) < 8) return;
    window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    setDetached(false);
  };

  useEffect(() => {
    scrollToCurrent();
  }, [cur, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  // „Zur aktuellen Zeile“ anbieten, wenn sie aus dem Blick gescrollt wurde
  useEffect(() => {
    if (focus || cur < 0 || typeof IntersectionObserver === 'undefined') return;
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-line="${cur}"]`);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      setDetached(!e.isIntersecting && Date.now() - userScrollAt.current < 6000);
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [cur, focus]);

  const style = { '--lyric-scale': String(p.fontScale) } as CSSProperties;

  const renderMeta = (l: SongLine, i: number) => (
    <>
      {p.showPhonetic && l.phonetic && <p className={s.phonetic}>{l.phonetic}</p>}
      {p.display !== 'original' && showOriginal && l.natural && <p className={s.translation}>{l.natural}</p>}
      {p.lineBadge?.(i)}
    </>
  );

  const renderTarget = (l: SongLine, i: number, className?: string) =>
    showOriginal ? (
      <LineText
        line={l}
        lineIdx={i}
        lang={p.lang}
        mask={p.masks?.get(i)}
        gapInputMode={p.gapInputMode}
        results={p.gapResults[l.id]}
        hints={p.hints && !p.revealedLines.has(i)}
        revealedWords={p.revealedWords}
        onRevealWord={p.onRevealWord}
        onWord={p.onWord}
        className={className}
      />
    ) : (
      <p className={cx(s.target, s.translationMain, className)}>
        <button type="button" className={s.word} onClick={() => p.onWord(i)}>{l.natural}</button>
      </p>
    );

  if (focus) {
    const next = song.lines[cur + 1] ?? (cur < 0 ? song.lines[0] : undefined);
    const prev = cur > 0 ? song.lines[cur - 1] : undefined;
    return (
      <div ref={rootRef} className={s.focus} style={style}>
        <p className={s.focusPrev} aria-hidden="true">{prev ? (p.hints ? prev.tokens.map((t) => (t.p ? t.t : hintWord(t.t))).join(' ') : prev.text) : ' '}</p>
        <div className={s.focusCurrent} aria-live="polite">
          {line ? (
            <div key={line.id} className={s.focusIn} data-line={cur}>
              {renderTarget(line, cur, s.focusTarget)}
              {renderMeta(line, cur)}
            </div>
          ) : (
            <p className={s.intro}><Music2 size={22} aria-hidden="true" /> Intro – gleich geht’s los</p>
          )}
        </div>
        {next && <p className={s.focusNext}><span className={s.nextLabel}>Als Nächstes</span>{p.hints ? next.tokens.map((t) => (t.p ? t.t : hintWord(t.t))).join(' ') : next.text}</p>}
        {line && p.renderPanel?.(cur)}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={s.lyrics} style={style}>
      <ol className={s.lineList} aria-label="Songtext">
        {song.lines.map((l, i) => {
          const isCur = i === cur;
          const label = firstOfSection.get(i);
          return (
            <li
              key={l.id}
              data-line={i}
              className={cx(s.line, isCur && s.current, cur >= 0 && i < cur && s.past)}
              aria-current={isCur ? 'true' : undefined}
            >
              {label && <p className={s.sectionLabel}>{label}</p>}
              <div className={s.lineRow}>
                <button type="button" className={s.lineNo} onClick={() => p.onJump(i)} aria-label={`Zu Zeile ${i + 1} springen`}>
                  {i + 1}
                </button>
                <div className={s.lineBody}>
                  {renderTarget(l, i)}
                  {renderMeta(l, i)}
                </div>
              </div>
              {isCur && p.renderPanel?.(i)}
            </li>
          );
        })}
      </ol>
      {detached && cur >= 0 && (
        <button type="button" className={s.backToLine} onClick={() => { userScrollAt.current = 0; scrollToCurrent(true); }}>
          <ArrowDownToLine size={16} aria-hidden="true" /> Zur aktuellen Zeile
        </button>
      )}
    </div>
  );
}
