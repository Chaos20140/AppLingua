/**
 * Gemeinsame Renderer für Erklärungen und Beispiele (Vertrag – genutzt von Lektionen, Grammatik u. a.).
 * Alle Texte werden als Text gerendert (Md über <RichText>), nie als HTML.
 */
import { Fragment, useId, useState, type ReactNode } from 'react';
import { ChevronDown, CircleCheck, CircleX, Globe, Headphones, Lightbulb, MapPin, Volume2 } from 'lucide-react';
import type { Variant } from '../../core/types';
import type { ColoredPart, ConjugationRow, Example, ExplainBlock, Role } from '../../content/types';
import { Badge, RichText } from '../../ui';
import {
  htmlLangFor, isForVariant, ROLE_META, ROLE_ORDER, rolesIn, splitEnding, splitSpaces, targetLanguageName, VARIANT_SHORT,
} from './helpers';
import { SpeakButtons, SpeechNotice } from './SpeakButtons';
import { useSpeaker, type Speaker } from './useSpeaker';
import s from './ExplainBlocks.module.css';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const roleClass = (role: Role) => s[`r_${role}`];

// ───────────────────────── ExplainBlocks ─────────────────────────

export interface ExplainBlocksProps { blocks: ExplainBlock[]; variant: Variant }

/** Rendert alle ExplainBlock-Typen (text, tip, compare, mistake, table, conjugation, colored, variant, audio); filtert variant-Blöcke der anderen Variante; Zielsprache antippbar → Sprachausgabe. */
export function ExplainBlocks({ blocks, variant }: ExplainBlocksProps) {
  const sp = useSpeaker(variant);
  if (!blocks?.length) return null;
  return (
    <div className={s.blocks}>
      {blocks.map((b, i) => <Block key={i} block={b} variant={variant} sp={sp} />)}
      <SpeechNotice sp={sp} showUnavailable={false} showVoiceHelp={false} />
    </div>
  );
}

function Block({ block, variant, sp }: { block: ExplainBlock; variant: Variant; sp: Speaker }) {
  const onSpeak = sp.available ? (t: string) => sp.say(t) : undefined;
  const lang = htmlLangFor(variant);
  switch (block.type) {
    case 'text':
      return <RichText md={block.md} onSpeak={onSpeak} targetLang={lang} className={s.text} />;
    case 'tip':
      return (
        <aside className={s.tip} aria-label="Merksatz">
          <span className={s.tipIcon} aria-hidden="true"><Lightbulb size={18} /></span>
          <div className={s.tipBody}>
            <span className={s.eyebrow}>Merksatz</span>
            <RichText md={block.md} onSpeak={onSpeak} targetLang={lang} />
          </div>
        </aside>
      );
    case 'compare':
      return (
        <section className={s.compare} aria-label="Vergleich mit dem Deutschen">
          <div className={s.compareGrid}>
            <div className={s.compareCol}>
              <span className={s.eyebrow}>Deutsch</span>
              <p className={s.compareText} lang="de">{block.german}</p>
            </div>
            <div className={cx(s.compareCol, s.compareTarget)}>
              <span className={s.eyebrow}>{targetLanguageName(variant)}</span>
              <p className={s.compareText} lang={lang}>{block.target}</p>
              <SpeakButtons sp={sp} text={block.target} />
            </div>
          </div>
          {block.md && <RichText md={block.md} onSpeak={onSpeak} targetLang={lang} className={s.compareNote} />}
        </section>
      );
    case 'mistake':
      return <MistakeCard wrong={block.wrong} right={block.right} why={block.why} variant={variant} sp={sp} />;
    case 'table':
      return <TableBlock title={block.title} headers={block.headers} rows={block.rows} />;
    case 'conjugation':
      return <Conjugation verb={block.verb} translation={block.translation} tense={block.tense} rows={block.rows} variant={variant} sp={sp} />;
    case 'colored':
      return (
        <figure className={s.coloredBlock}>
          <div className={s.coloredTop}>
            <ColoredSentence parts={block.parts} lang={lang} />
            <SpeakButtons sp={sp} text={block.parts.map((p) => p.text).join('')} />
          </div>
          {block.german && <figcaption className={s.german} lang="de">{block.german}</figcaption>}
          <RoleLegend roles={rolesIn(block.parts)} compact />
        </figure>
      );
    case 'variant':
      return <VariantBlock block={block} variant={variant} onSpeak={onSpeak} lang={lang} />;
    case 'audio':
      return (
        <div className={s.audio}>
          <span className={s.audioIcon} aria-hidden="true"><Headphones size={20} /></span>
          <div className={s.audioBody}>
            {block.label && <span className={s.eyebrow}>{block.label}</span>}
            <p className={s.audioText} lang={lang}>{block.text}</p>
          </div>
          {sp.available ? <SpeakButtons sp={sp} text={block.text} size="md" /> : null}
        </div>
      );
    default:
      return null;
  }
}

/** Typischer Fehler: falsch durchgestrichen, richtig + warum. Auch für Grammatikthemen nutzbar. */
export function MistakeCard({ wrong, right, why, variant, sp }: { wrong: string; right: string; why: string; variant: Variant; sp?: Speaker }) {
  const lang = htmlLangFor(variant);
  const onSpeak = sp?.available ? (t: string) => sp.say(t) : undefined;
  return (
    <div className={s.mistake}>
      <p className={s.wrong}>
        <CircleX size={20} aria-hidden="true" className={s.wrongIcon} />
        <span className="sr-only">Falsch: </span>
        <del lang={lang}>{wrong}</del>
      </p>
      <p className={s.right}>
        <CircleCheck size={20} aria-hidden="true" className={s.rightIcon} />
        <span className="sr-only">Richtig: </span>
        <span lang={lang} className={s.rightText}>{right}</span>
        {sp && <SpeakButtons sp={sp} text={right} slow={false} />}
      </p>
      <div className={s.why}>
        <span className={s.eyebrow}>Warum?</span>
        <RichText md={why} onSpeak={onSpeak} targetLang={lang} />
      </div>
    </div>
  );
}

function TableBlock({ title, headers, rows }: { title?: string; headers: string[]; rows: string[][] }) {
  const id = useId();
  return (
    <figure className={s.tableFig}>
      {title && <figcaption id={id} className={s.tableTitle}>{title}</figcaption>}
      <div className={s.tableScroll} role="region" aria-labelledby={title ? id : undefined} aria-label={title ? undefined : 'Tabelle'} tabIndex={0}>
        <table className={s.table}>
          {headers.length > 0 && (
            <thead>
              <tr>{headers.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (ci === 0 ? <th key={ci} scope="row">{c}</th> : <td key={ci}>{c}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

function Conjugation({ verb, translation, tense, rows, variant, sp }: {
  verb: string; translation: string; tense: string; rows: ConjugationRow[]; variant: Variant; sp: Speaker;
}) {
  const lang = htmlLangFor(variant);
  const hasEndings = rows.some((r) => splitEnding(r.form, r.ending).ending);
  return (
    <section className={s.conj} aria-label={`Konjugation von ${verb}`}>
      <header className={s.conjHead}>
        <div>
          <p className={s.conjVerb}>
            <span lang={lang}>{verb}</span>
            <span className={s.conjTrans}> – {translation}</span>
          </p>
          <p className={s.conjTense}>{tense}</p>
        </div>
        <SpeakButtons sp={sp} text={verb} slow={false} />
      </header>
      <table className={s.conjTable}>
        <caption className="sr-only">{`${verb} (${translation}), ${tense}`}</caption>
        <thead className="sr-only">
          <tr><th scope="col">Person</th><th scope="col">Form</th><th scope="col">Hinweis</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const other = r.variant && variant !== 'pt-BR' && r.variant !== variant;
            const { stem, ending } = splitEnding(r.form, r.ending);
            return (
              <tr key={i} className={cx(other && s.conjOther)}>
                <th scope="row" className={s.conjPerson} lang={lang}>{r.person}</th>
                <td className={s.conjForm}>
                  <span lang={lang}>
                    {stem}
                    {ending && <span className={s.ending}>{ending}</span>}
                  </span>
                  {sp.available && (
                    <button type="button" className={s.formSpeak} onClick={() => sp.say(r.form)} aria-label={`Vorlesen: ${r.form}`} aria-pressed={sp.isSpeaking(r.form)}>
                      <Volume2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </td>
                <td className={s.conjNote}>
                  {r.variant && (other
                    ? <Badge tone="neutral" icon={<MapPin size={12} />}>nur {VARIANT_SHORT[r.variant]}</Badge>
                    : <Badge tone="info" icon={<MapPin size={12} />}>{VARIANT_SHORT[r.variant]}</Badge>)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hasEndings && <p className={s.conjLegend}><span className={s.endingSwatch} aria-hidden="true" /> Farbig: die Endung – sie verrät, wer handelt.</p>}
    </section>
  );
}

function VariantBlock({ block, variant, onSpeak, lang }: {
  block: Extract<ExplainBlock, { type: 'variant' }>; variant: Variant; onSpeak?: (t: string) => void; lang: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const own = block.variant === variant;
  if (own) {
    return (
      <aside className={cx(s.variant, s.variantOwn)} aria-label={`Hinweis für ${VARIANT_SHORT[block.variant]}`}>
        <span className={s.eyebrow}><MapPin size={14} aria-hidden="true" /> Deine Variante · {VARIANT_SHORT[block.variant]}</span>
        <RichText md={block.md} onSpeak={onSpeak} targetLang={lang} />
      </aside>
    );
  }
  return (
    <div className={s.variantOther}>
      <button type="button" className={s.disclosure} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Globe size={16} aria-hidden="true" />
        <span>{open ? 'Andere Variante ausblenden' : 'Andere Variante zeigen'} · {VARIANT_SHORT[block.variant]}</span>
        <ChevronDown size={16} aria-hidden="true" className={cx(s.chev, open && s.chevOpen)} />
      </button>
      <div id={id} hidden={!open} className={s.variant}>
        <RichText md={block.md} onSpeak={onSpeak} targetLang={htmlLangFor(block.variant)} />
      </div>
    </div>
  );
}

// ───────────────────────── ExampleList ─────────────────────────

export interface ExampleListProps {
  examples: Example[];
  variant: Variant;
  /** kompakte Darstellung (z. B. in Lektionen) */
  compact?: boolean;
}

/** Beispielsätze mit Vorlesen (normal/langsam), Übersetzung, optional wörtlich, farbigen Satzgliedern. */
export function ExampleList({ examples, variant, compact = false }: ExampleListProps) {
  const sp = useSpeaker(variant);
  const visible = (examples ?? []).filter((e) => isForVariant(e.variant, variant));
  if (!visible.length) return null;
  return (
    <div>
      <ul className={cx(s.examples, compact && s.examplesCompact)}>
        {visible.map((ex, i) => <ExampleItem key={`${i}:${ex.target}`} ex={ex} variant={variant} sp={sp} />)}
      </ul>
      <SpeechNotice sp={sp} showUnavailable={false} showVoiceHelp={false} />
    </div>
  );
}

function ExampleItem({ ex, variant, sp }: { ex: Example; variant: Variant; sp: Speaker }) {
  const [literal, setLiteral] = useState(false);
  const id = useId();
  const lang = htmlLangFor(variant);
  const partsOk = !!ex.parts?.length;
  return (
    <li className={s.example}>
      <div className={s.exTop}>
        <p className={s.exTarget}>
          {partsOk ? <ColoredSentence parts={ex.parts!} lang={lang} /> : <span lang={lang}>{ex.target}</span>}
        </p>
        <SpeakButtons sp={sp} text={ex.target} />
      </div>
      <p className={s.german} lang="de">{ex.german}</p>
      {(ex.literal || ex.variant) && (
        <div className={s.exMeta}>
          {ex.variant && <Badge tone="info" icon={<MapPin size={12} />}>{VARIANT_SHORT[ex.variant]}</Badge>}
          {ex.literal && (
            <button type="button" className={s.literalBtn} aria-expanded={literal} aria-controls={id} onClick={() => setLiteral((v) => !v)}>
              Wörtlich
              <ChevronDown size={14} aria-hidden="true" className={cx(s.chev, literal && s.chevOpen)} />
            </button>
          )}
        </div>
      )}
      {ex.literal && (
        <p id={id} hidden={!literal} className={s.literal}>
          <span className="sr-only">Wörtlich: </span>„{ex.literal}“
        </p>
      )}
      {ex.note && <RichText md={ex.note} onSpeak={sp.available ? (t) => sp.say(t) : undefined} targetLang={lang} className={s.exNote} />}
    </li>
  );
}

// ───────────────────────── Farbige Satzglieder ─────────────────────────

export interface ColoredSentenceProps {
  parts: ColoredPart[];
  /** BCP-47-Sprache des Satzes (optional) */
  lang?: string;
  /** false = nur farbig, ohne Antippen (z. B. in engen Listen). Standard: true */
  interactive?: boolean;
  className?: string;
}

/** Satz mit farbigen Satzgliedern. Rolle per Antippen (aria-live) – nicht nur über Farbe erkennbar. */
export function ColoredSentence({ parts, lang, interactive = true, className }: ColoredSentenceProps) {
  const [sel, setSel] = useState<number | null>(null);
  const selPart = sel !== null ? parts[sel] : undefined;
  const selRole = selPart?.role;
  let info: ReactNode = null;
  if (selPart && selRole) {
    const meta = ROLE_META[selRole];
    info = (
      <>
        <span className={cx(s.swatch, roleClass(selRole))} aria-hidden="true" />
        <span>„<span lang={lang}>{splitSpaces(selPart.text).core}</span>“ ist hier: <strong>{meta.label}</strong>{meta.hint ? ` – ${meta.hint}` : ''}</span>
      </>
    );
  }
  return (
    <span className={cx(s.coloredWrap, className)}>
      <span className={s.coloredLine} lang={lang}>
        {parts.map((p, i) => {
          if (!p.role || p.role === 'other') return <Fragment key={i}>{p.text}</Fragment>;
          const { lead, core, trail } = splitSpaces(p.text);
          const meta = ROLE_META[p.role];
          if (!interactive || !core) {
            return (
              <Fragment key={i}>
                {lead}<span className={cx(s.part, roleClass(p.role))} title={meta.label}>{core}<span className="sr-only"> ({meta.label})</span></span>{trail}
              </Fragment>
            );
          }
          return (
            <Fragment key={i}>
              {lead}
              <button
                type="button"
                className={cx(s.part, s.partBtn, roleClass(p.role), sel === i && s.partSel)}
                aria-label={`${core}: ${meta.label}`}
                aria-pressed={sel === i}
                onClick={() => setSel((cur) => (cur === i ? null : i))}
              >
                {core}
              </button>
              {trail}
            </Fragment>
          );
        })}
      </span>
      {interactive && (
        <span className={s.roleInfo} aria-live="polite">
          {info ?? <span className={s.roleHintIdle}>Tippe ein markiertes Wort an, um seine Rolle zu sehen.</span>}
        </span>
      )}
    </span>
  );
}

export interface RoleLegendProps {
  /** nur diese Rollen zeigen (Standard: alle) */
  roles?: Role[];
  compact?: boolean;
  className?: string;
}

/** Legende der Satzglied-Farben. */
export function RoleLegend({ roles, compact = false, className }: RoleLegendProps = {}) {
  const list = (roles ?? ROLE_ORDER).filter((r) => r !== 'other');
  if (!list.length) return null;
  return (
    <ul className={cx(s.legend, compact && s.legendCompact, className)} aria-label="Farblegende der Satzglieder">
      {list.map((r) => (
        <li key={r} className={s.legendItem}>
          <span className={cx(s.legendSample, roleClass(r))} aria-hidden="true">Abc</span>
          <span className={s.legendText}>
            <span className={s.legendLabel}>{ROLE_META[r].label}</span>
            {!compact && ROLE_META[r].hint && <span className={s.legendHint}>{ROLE_META[r].hint}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
