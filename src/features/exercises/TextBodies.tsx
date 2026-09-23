/** Text-Übungen: cloze, translate, dictation, fixError, conjugate, freeText. */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Circle, Eye, Keyboard, LayoutGrid, RotateCcw, X } from 'lucide-react';
import { RichText } from '../../ui';
import { joinTokens, stripAccents, tokenizeWords } from '../../engine/text';
import { ListenControls, SpeakButton, useSpeakFn } from './ListenControls';
import { TileBuilder } from './TileBodies';
import { cx } from './cx';
import { onEnter, scrollFieldIntoView, shuffleFor, targetInputProps, type BodyProps } from './shared';
import s from './ex.module.css';

// ───────────────────────── Eingabefeld ─────────────────────────

interface AnswerFieldProps {
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  lang: string;
  label: string;
  placeholder?: string;
  onSubmit: () => void;
  state?: 'ok' | 'bad' | null;
  /** Enter = neue Zeile (Prüfen mit ⌘/Strg+Enter) */
  multiline?: boolean;
  capitalize?: 'off' | 'sentences';
  minRows?: number;
}

export function AnswerField({ value, onChange, locked, lang, label, placeholder, onSubmit, state, multiline, capitalize = 'sentences', minRows = 1 }: AnswerFieldProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className={cx(s.field, state === 'ok' && s.fieldOk, state === 'bad' && s.fieldBad)}
      value={value}
      rows={minRows}
      readOnly={locked}
      aria-label={label}
      placeholder={placeholder ?? 'Deine Antwort …'}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
        if (multiline && !(e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        onSubmit();
      }}
      {...targetInputProps(lang, capitalize)}
      enterKeyHint={multiline ? 'enter' : 'done'}
    />
  );
}

const fieldState = (locked: boolean, outcome: BodyProps<'translate'>['outcome']) =>
  locked && outcome ? (outcome.correct ? 'ok' : 'bad') : null;

function ModeToggle({ bank, onChange }: { bank: boolean; onChange: (bank: boolean) => void }) {
  return (
    <div className={s.modeToggle} role="group" aria-label="Eingabeart">
      <button type="button" aria-pressed={bank} className={cx(s.modeBtn, bank && s.modeBtnOn)} onClick={() => onChange(true)}>
        <LayoutGrid aria-hidden /> Wortbank
      </button>
      <button type="button" aria-pressed={!bank} className={cx(s.modeBtn, !bank && s.modeBtnOn)} onClick={() => onChange(false)}>
        <Keyboard aria-hidden /> Tastatur
      </button>
    </div>
  );
}

// ───────────────────────── Lückentext ─────────────────────────

const GAP = /_{3,}/;

export function ClozeBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'cloze'>) {
  const segments = useMemo(() => ex.sentence.split(GAP), [ex.sentence]);
  const gaps = Math.max(0, segments.length - 1);
  const bankTiles = useMemo(() => (ex.bank?.length ? shuffleFor(ex.bank, ex.id) : null), [ex]);
  const [values, setValues] = useState<string[]>(() => Array(gaps).fill(''));
  const [bankSel, setBankSel] = useState<(number | null)[]>(() => Array(gaps).fill(null));
  const [active, setActive] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const parts = locked && outcome ? outcome.parts ?? null : null;

  const report = (vals: string[]) => setAnswer(vals.some((v) => v.trim()) ? vals : null);

  const setGap = (i: number, v: string) => {
    const next = values.slice();
    next[i] = v;
    setValues(next);
    report(next);
  };

  const pickBank = (bi: number) => {
    if (locked || !bankTiles) return;
    let target = bankSel[active] === null ? active : bankSel.findIndex((b) => b === null);
    if (target < 0) target = active;
    const sel = bankSel.slice();
    sel[target] = bi;
    const vals = sel.map((b) => (b === null ? '' : bankTiles[b]));
    setBankSel(sel);
    setValues(vals);
    report(vals);
    const nextEmpty = sel.findIndex((b) => b === null);
    setActive(nextEmpty >= 0 ? nextEmpty : target);
  };

  const clearBankGap = (i: number) => {
    if (locked) return;
    const sel = bankSel.slice();
    sel[i] = null;
    const vals = sel.map((b) => (b === null || !bankTiles ? '' : bankTiles[b]));
    setBankSel(sel);
    setValues(vals);
    report(vals);
    setActive(i);
  };

  const enter = (i: number) => {
    const nextEmpty = values.findIndex((v, j) => j > i && !v.trim());
    if (nextEmpty >= 0) inputs.current[nextEmpty]?.focus();
    else submit();
  };

  const width = (i: number) => {
    const longest = Math.max(3, ...(ex.answers[i] ?? []).map((a) => a.length));
    return `${Math.min(18, longest + 2)}ch`;
  };

  const out: ReactNode[] = [];
  segments.forEach((seg, i) => {
    if (seg) out.push(<span key={`t${i}`}>{seg}</span>);
    if (i >= gaps) return;
    const ok = parts ? parts[i] : null;
    const solution = ok === false ? ex.answers[i]?.[0] : null;
    if (bankTiles) {
      const b = bankSel[i];
      out.push(
        <span key={`g${i}`} className={s.gapWrap}>
          <button
            type="button"
            className={cx(s.gapSlot, active === i && !locked && s.gapActive, b !== null && s.gapFilled, ok === true && s.gapOk, ok === false && s.gapBad)}
            onClick={() => (b !== null ? clearBankGap(i) : setActive(i))}
            disabled={locked}
            aria-label={b !== null ? `Lücke ${i + 1}: „${bankTiles[b]}“ – antippen zum Entfernen` : `Lücke ${i + 1} auswählen`}
          >
            {b !== null ? bankTiles[b] : ' '}
          </button>
          {solution && <span className={s.gapSolution}>{solution}</span>}
        </span>,
      );
    } else {
      out.push(
        <span key={`g${i}`} className={s.gapWrap}>
          <input
            ref={(el) => { inputs.current[i] = el; }}
            className={cx(s.gapInput, ok === true && s.gapOk, ok === false && s.gapBad)}
            style={{ width: width(i) }}
            value={values[i] ?? ''}
            readOnly={locked}
            aria-label={`Lücke ${i + 1}`}
            onChange={(e) => setGap(i, e.target.value)}
            onKeyDown={onEnter(() => enter(i))}
            onFocus={(e) => { setActive(i); scrollFieldIntoView(e.currentTarget); }}
            {...targetInputProps(env.lang)}
            enterKeyHint={i < gaps - 1 ? 'next' : 'done'}
          />
          {solution && <span className={s.gapSolution}>{solution}</span>}
        </span>,
      );
    }
  });

  const usedBank = new Set(bankSel.filter((b): b is number => b !== null));
  return (
    <>
      <div className={s.promptCard}>
        <p className={s.clozeSentence} lang={env.lang}>{out}</p>
        {ex.german && <p className={s.promptSub}>{ex.german}</p>}
      </div>
      {bankTiles && (
        <div className={s.tilePool} role="group" aria-label="Wortbank">
          {bankTiles.map((t, i) => (usedBank.has(i) ? (
            <span key={i} className={cx(s.tile, s.tileGhost)} aria-hidden>{t}</span>
          ) : (
            <button key={i} type="button" className={s.tile} lang={env.lang} disabled={locked} data-enter-check onClick={() => pickBank(i)} aria-label={`„${t}“ einsetzen`}>
              {t}
            </button>
          )))}
        </div>
      )}
    </>
  );
}

// ───────────────────────── Übersetzen ─────────────────────────

export function TranslateBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'translate'>) {
  const toTarget = ex.direction === 'toTarget';
  const tiles = useMemo(() => (ex.bank?.length ? shuffleFor(ex.bank, ex.id) : null), [ex]);
  const [bank, setBank] = useState(!!tiles);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<number[]>([]);
  const langName = env.base === 'pt' ? 'Portugiesische' : 'Spanische';
  const inputLang = toTarget ? env.lang : 'de';

  const switchMode = (b: boolean) => {
    if (locked) return;
    setBank(b);
    if (b) setAnswer(chosen.length && tiles ? joinTokens(chosen.map((i) => tiles[i])) : null);
    else setAnswer(text.trim() ? text : null);
  };

  return (
    <>
      <div className={s.promptCard}>
        <span className={s.eyebrow}>{toTarget ? `Ins ${langName}` : 'Ins Deutsche'}</span>
        <p className={s.sourceLine}>
          <span className={s.sourceText} lang={toTarget ? 'de' : env.lang}>{ex.source}</span>
          {!toTarget && <SpeakButton text={ex.source} lang={env.lang} />}
        </p>
      </div>
      {tiles && !locked && <ModeToggle bank={bank} onChange={switchMode} />}
      {tiles && bank ? (
        <TileBuilder
          tiles={tiles} value={chosen} lang={inputLang} locked={locked} label="Deine Übersetzung"
          result={fieldState(locked, outcome)}
          onChange={(v) => { setChosen(v); setAnswer(v.length ? joinTokens(v.map((i) => tiles[i])) : null); }}
        />
      ) : (
        <AnswerField
          value={text} locked={locked} lang={inputLang} label="Deine Übersetzung"
          placeholder={toTarget ? `Auf ${langName.replace(/e$/, '')} …` : 'Auf Deutsch …'}
          state={fieldState(locked, outcome)} onSubmit={() => submit()}
          onChange={(v) => { setText(v); setAnswer(v.trim() ? v : null); }}
        />
      )}
    </>
  );
}

// ───────────────────────── Diktat ─────────────────────────

export function DictationBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'dictation'>) {
  const [text, setText] = useState('');
  const [showGerman, setShowGerman] = useState(false);
  return (
    <>
      <div className={cx(s.promptCard, s.center)}>
        <ListenControls text={ex.audio} lang={env.lang} autoPlay={env.autoplay} showCount revealFallback />
        {ex.german && (showGerman
          ? <p className={s.promptSub}>Bedeutung: {ex.german}</p>
          : <button type="button" className={s.linkBtn} onClick={() => setShowGerman(true)}><Eye aria-hidden /> Bedeutung zeigen</button>)}
      </div>
      <AnswerField
        value={text} locked={locked} lang={env.lang} label="Was hast du gehört?" placeholder="Schreibe, was du hörst …"
        state={fieldState(locked, outcome)} onSubmit={() => submit()}
        onChange={(v) => { setText(v); setAnswer(v.trim() ? v : null); }}
      />
    </>
  );
}

// ───────────────────────── Fehler finden ─────────────────────────

export function FixErrorBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'fixError'>) {
  const [text, setText] = useState(ex.sentence);
  const change = (v: string) => { setText(v); setAnswer(v.trim() ? v : null); };
  // vorausgefüllter Satz zählt als Antwort (unverändert abgeben erklärt die Bewertung)
  useEffect(() => { setAnswer(ex.sentence); }, [ex.sentence, setAnswer]);
  return (
    <>
      <div className={s.promptCard}>
        <span className={s.eyebrow}>Dieser Satz enthält einen Fehler</span>
        <p className={s.sourceText} lang={env.lang}>{ex.sentence}</p>
        {ex.german && <p className={s.promptSub}>Gemeint ist: {ex.german}</p>}
      </div>
      <div className={s.fieldWithAction}>
        <AnswerField
          value={text} locked={locked} lang={env.lang} label="Korrigierter Satz"
          state={fieldState(locked, outcome)} onSubmit={() => submit()} onChange={change}
        />
        {!locked && text !== ex.sentence && (
          <button type="button" className={s.linkBtn} onClick={() => change(ex.sentence)}>
            <RotateCcw aria-hidden /> Zurücksetzen
          </button>
        )}
      </div>
    </>
  );
}

// ───────────────────────── Verbform ─────────────────────────

export function ConjugateBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'conjugate'>) {
  const [text, setText] = useState('');
  const change = (v: string) => { setText(v); setAnswer(v.trim() ? v : null); };
  const state = fieldState(locked, outcome);
  const hasGap = !!ex.sentence && GAP.test(ex.sentence);
  const [before, after] = hasGap ? ex.sentence!.split(GAP) : ['', ''];

  const input = (
    <input
      className={cx(s.gapInput, s.conjInput, state === 'ok' && s.gapOk, state === 'bad' && s.gapBad)}
      value={text}
      readOnly={locked}
      aria-label={`Form von ${ex.verb} für ${ex.person} (${ex.tense})`}
      placeholder="…"
      onChange={(e) => change(e.target.value)}
      onKeyDown={onEnter(() => submit())}
      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
      {...targetInputProps(env.lang)}
    />
  );

  return (
    <>
      <div className={cx(s.promptCard, s.conjCard)}>
        <div className={s.conjVerb}>
          <span className={s.conjInf} lang={env.lang}>{ex.verb}</span>
          <SpeakButton text={ex.verb} lang={env.lang} />
        </div>
        <div className={s.conjMeta}>
          <span className={s.metaPill}>{ex.tense}</span>
          <span className={cx(s.metaPill, s.metaPillAccent)} lang={env.lang}>{ex.person}</span>
        </div>
      </div>
      {hasGap ? (
        <div className={s.promptCard}>
          <p className={s.clozeSentence} lang={env.lang}>
            {before}<span className={s.gapWrap}>{input}</span>{after}
          </p>
        </div>
      ) : (
        <div className={s.conjRow}>
          <span className={s.conjPerson} lang={env.lang}>{ex.person}</span>
          {input}
        </div>
      )}
      {!hasGap && ex.sentence && <p className={s.promptSub} lang={env.lang}>{ex.sentence}</p>}
    </>
  );
}

// ───────────────────────── Freies Schreiben ─────────────────────────

function requirementMet(pattern: string, text: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(text) || new RegExp(stripAccents(pattern), 'i').test(stripAccents(text));
  } catch {
    return true;
  }
}

export function FreeTextBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'freeText'>) {
  const [text, setText] = useState('');
  const speakFn = useSpeakFn(env.lang);
  const words = tokenizeWords(text).length;
  const checks = ex.requirements.map((r) => ({ hint: r.hint, ok: !!text.trim() && requirementMet(r.pattern, text) }));
  const showState = locked && !!outcome;

  return (
    <>
      <div className={s.promptCard}>
        <RichText md={ex.prompt} onSpeak={speakFn} targetLang={env.lang} className={s.promptText} />
      </div>
      <AnswerField
        value={text} locked={locked} lang={env.lang} label="Dein Text" placeholder="Schreibe hier …" multiline minRows={3}
        state={fieldState(locked, outcome)} onSubmit={() => submit()}
        onChange={(v) => { setText(v); setAnswer(v.trim() ? v : null); }}
      />
      {(ex.requirements.length > 0 || ex.minWords) && (
        <div className={s.checklist} aria-label="Anforderungen">
          <p className={s.checklistTitle}>Darauf kommt es an</p>
          <ul>
            {checks.map((c, i) => (
              <li key={i} className={cx(c.ok && s.checkOk, showState && !c.ok && s.checkBad)}>
                {c.ok ? <Check aria-hidden /> : showState ? <X aria-hidden /> : <Circle aria-hidden />}
                <span>{c.hint}</span>
                <span className="sr-only">{c.ok ? '(erfüllt)' : '(noch offen)'}</span>
              </li>
            ))}
            {ex.minWords ? (
              <li className={cx(words >= ex.minWords && s.checkOk, showState && words < ex.minWords && s.checkBad)}>
                {words >= ex.minWords ? <Check aria-hidden /> : showState ? <X aria-hidden /> : <Circle aria-hidden />}
                <span>Mindestens {ex.minWords} Wörter ({words})</span>
              </li>
            ) : null}
          </ul>
          {!locked && <p className={s.muted}>Tipp: Mit ⌘/Strg + Enter prüfen.</p>}
        </div>
      )}
      {showState && ex.samples.length > 0 && (
        <div className={s.infoCard}>
          <p className={s.checklistTitle}>{ex.samples.length > 1 ? 'Musterlösungen' : 'Musterlösung'}</p>
          <ul className={s.sampleList}>
            {ex.samples.map((smp, i) => (
              <li key={i}><span lang={env.lang}>{smp}</span><SpeakButton text={smp} lang={env.lang} /></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
