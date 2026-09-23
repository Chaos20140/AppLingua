import { memo, useMemo, type ReactNode } from 'react';
import { Volume2 } from 'lucide-react';
import type { Md } from '../content/types';
import { cx } from './internal/helpers';
import { parseBlocks, parseInline, type Inline } from './internal/markup';
import s from './RichText.module.css';

interface RenderCtx {
  onSpeak?: (text: string) => void;
  targetLang?: string;
}

function renderInline(nodes: Inline[], ctx: RenderCtx, keyBase: string): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${keyBase}.${i}`;
    if (typeof n === 'string') return n;
    if (n.t !== 'target') {
      const children = renderInline(n.c, ctx, key);
      return n.t === 'b' ? <strong key={key}>{children}</strong> : <em key={key}>{children}</em>;
    }
    const { onSpeak, targetLang } = ctx;
    if (onSpeak) {
      return (
        <button key={key} type="button" className={cx(s.target, s.speak)} lang={targetLang} onClick={() => onSpeak(n.text)}>
          {n.text}
          <Volume2 className={s.speakIcon} aria-hidden="true" />
          <span className="sr-only" lang="de">
            {' '}
            (vorlesen)
          </span>
        </button>
      );
    }
    return (
      <span key={key} className={s.target} lang={targetLang}>
        {n.text}
      </span>
    );
  });
}

function renderLines(lines: string[], ctx: RenderCtx, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push(<br key={`${keyBase}.br${i}`} />);
    out.push(...renderInline(parseInline(line), ctx, `${keyBase}.${i}`));
  });
  return out;
}

export interface RichTextProps {
  md: Md;
  /** Macht `Zielsprache`-Stellen antippbar (z. B. `(t) => speak(t, { lang })`). Nur nach Nutzer-Geste aufgerufen. */
  onSpeak?: (text: string) => void;
  /** BCP-47-Sprache der Zielsprachen-Stellen (z. B. 'es-ES', 'pt-BR') für korrekte Screenreader-Aussprache. */
  targetLang?: string;
  /** Inline rendern (ohne Absätze/Listen; Zeilenumbrüche bleiben). */
  inline?: boolean;
  className?: string;
}

function RichTextImpl({ md, onSpeak, targetLang, inline = false, className }: RichTextProps) {
  const blocks = useMemo(() => parseBlocks(md ?? ''), [md]);
  const ctx: RenderCtx = { onSpeak, targetLang };

  if (inline) {
    const lines = blocks.flatMap((b) => (b.t === 'p' ? b.lines : b.items));
    return <span className={cx(s.rich, s.inline, className)}>{renderLines(lines, ctx, 'l')}</span>;
  }

  return (
    <div className={cx(s.rich, className)}>
      {blocks.map((b, bi) => {
        const key = `b${bi}`;
        if (b.t === 'p') return <p key={key}>{renderLines(b.lines, ctx, key)}</p>;
        const List = b.t;
        return (
          <List key={key}>
            {b.items.map((item, ii) => (
              <li key={`${key}.${ii}`}>{renderInline(parseInline(item), ctx, `${key}.${ii}`)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

/** Rendert Inhalts-Markup (`Md`) sicher als React-Elemente. */
export const RichText = memo(RichTextImpl);
