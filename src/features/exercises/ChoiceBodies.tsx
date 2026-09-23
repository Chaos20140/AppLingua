/** Auswahl-Übungen: mc, situation, listening, minimalPair und dialogue (Optionen oder freie Eingabe). */
import { useEffect, useRef, useState } from 'react';
import { Check, Eye, MapPin, X } from 'lucide-react';
import { RichText } from '../../ui';
import { ListenControls, SpeakButton, useSpeakFn } from './ListenControls';
import { cx } from './cx';
import { isTextInput, onEnter, scrollFieldIntoView, targetInputProps, type BodyProps, type ExEnv } from './shared';
import s from './ex.module.css';

const LETTERS = 'ABCDEFGHIJ';

interface OptionListProps {
  options: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  locked: boolean;
  /** Index der richtigen Option (nur nach dem Prüfen außerhalb des Prüfungsmodus) */
  correct: number | null;
  lang: string;
  /** Optionen sind Zielsprache (lang-Attribut) */
  target?: boolean;
  big?: boolean;
  /** nach dem Prüfen Lautsprecher je Option (Minimalpaare vergleichen) */
  speakAfter?: boolean;
  label: string;
}

export function OptionList({ options, selected, onSelect, locked, correct, lang, target = true, big, speakAfter, label }: OptionListProps) {
  // Zifferntasten 1–9 wählen eine Option (Tastatur/Desktop)
  const selectRef = useRef(onSelect);
  useEffect(() => { selectRef.current = onSelect; });
  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTextInput(e.target)) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault();
        selectRef.current(n - 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [locked, options.length]);

  return (
    <div className={cx(s.options, big && s.optionsBig)} role="radiogroup" aria-label={label}>
      {options.map((text, i) => {
        const isSel = selected === i;
        const state = locked && correct !== null
          ? (i === correct ? 'correct' : isSel ? 'wrong' : 'dim')
          : isSel ? 'selected' : 'idle';
        return (
          <div key={i} className={s.optionRow}>
            <button
              type="button"
              role="radio"
              aria-checked={isSel}
              aria-disabled={locked || undefined}
              data-enter-check
              className={cx(s.option, s[`opt_${state}`], big && s.optionBig)}
              onClick={() => { if (!locked) onSelect(i); }}
            >
              <span className={s.optionKey} aria-hidden>
                {state === 'correct' ? <Check /> : state === 'wrong' ? <X /> : LETTERS[i]}
              </span>
              <span className={s.optionText} lang={target ? lang : 'de'}>{text}</span>
            </button>
            {speakAfter && locked && <SpeakButton text={text} lang={lang} />}
          </div>
        );
      })}
    </div>
  );
}

function useChoice(setAnswer: (n: number | null) => void) {
  const [sel, setSel] = useState<number | null>(null);
  const select = (i: number) => { setSel(i); setAnswer(i); };
  return [sel, select] as const;
}

const correctIndex = (locked: boolean, outcome: BodyProps<'mc'>['outcome'], answer: number) => (locked && outcome ? answer : null);

export function McBody({ ex, env, locked, outcome, setAnswer }: BodyProps<'mc'>) {
  const [sel, select] = useChoice(setAnswer);
  const speakFn = useSpeakFn(env.lang);
  return (
    <>
      <div className={s.promptCard}>
        <RichText md={ex.prompt} onSpeak={speakFn} targetLang={env.lang} className={s.promptText} />
        {ex.audio && <ListenControls text={ex.audio} lang={env.lang} size="md" autoPlay={env.autoplay} revealFallback />}
      </div>
      <OptionList
        options={ex.options.map((o) => o.text)} selected={sel} onSelect={select} locked={locked}
        correct={correctIndex(locked, outcome, ex.answer)} lang={env.lang} label="Antwortmöglichkeiten"
      />
    </>
  );
}

export function SituationBody({ ex, env, locked, outcome, setAnswer }: BodyProps<'situation'>) {
  const [sel, select] = useChoice(setAnswer);
  const speakFn = useSpeakFn(env.lang);
  return (
    <>
      <div className={cx(s.promptCard, s.scenario)}>
        <span className={s.scenarioIcon} aria-hidden><MapPin /></span>
        <RichText md={ex.scenario} onSpeak={speakFn} targetLang={env.lang} className={s.promptText} />
      </div>
      <OptionList
        options={ex.options.map((o) => o.text)} selected={sel} onSelect={select} locked={locked}
        correct={correctIndex(locked, outcome, ex.answer)} lang={env.lang} label="Was sagst du?"
      />
    </>
  );
}

export function ListeningBody({ ex, env, locked, outcome, setAnswer }: BodyProps<'listening'>) {
  const [sel, select] = useChoice(setAnswer);
  const speakFn = useSpeakFn(env.lang);
  return (
    <>
      <div className={cx(s.promptCard, s.center)}>
        <ListenControls text={ex.audio} lang={env.lang} autoPlay={env.autoplay} showCount revealFallback />
        <RichText md={ex.question} onSpeak={speakFn} targetLang={env.lang} className={s.promptText} />
        {locked && outcome && <p className={s.transcript} lang={env.lang}>„{ex.audio}“</p>}
      </div>
      <OptionList
        options={ex.options} selected={sel} onSelect={select} locked={locked}
        correct={correctIndex(locked, outcome, ex.answer)} lang={env.lang} label="Antwortmöglichkeiten"
      />
    </>
  );
}

export function MinimalPairBody({ ex, env, locked, outcome, setAnswer }: BodyProps<'minimalPair'>) {
  const [sel, select] = useChoice(setAnswer);
  const speakFn = useSpeakFn(env.lang);
  const target = ex.options[ex.answer] ?? '';
  return (
    <>
      <div className={cx(s.promptCard, s.center)}>
        <ListenControls text={target} lang={env.lang} autoPlay={env.autoplay} showCount revealFallback label="Wort anhören" />
        <p className={s.muted}>Tippe danach auf das Wort, das du gehört hast.</p>
      </div>
      <OptionList
        options={ex.options} selected={sel} onSelect={select} locked={locked} big speakAfter={!!outcome}
        correct={correctIndex(locked, outcome, ex.answer)} lang={env.lang} label="Welches Wort hörst du?"
      />
      {locked && outcome && ex.hint && (
        <div className={s.infoCard}><RichText md={ex.hint} onSpeak={speakFn} targetLang={env.lang} /></div>
      )}
    </>
  );
}

// ───────────────────────── Dialog ─────────────────────────

export function DialogueBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'dialogue'>) {
  const withOptions = !!ex.options && typeof ex.answer === 'number';
  const [sel, setSel] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [showGerman, setShowGerman] = useState(false);
  const me = ex.lines[ex.gapIndex]?.speaker;

  const choose = (i: number) => { setSel(i); setAnswer(i); };
  const type = (v: string) => { setText(v); setAnswer(v.trim() ? v : null); };

  return (
    <>
      <div className={s.chat} aria-label="Dialog">
        {ex.lines.map((line, i) => {
          const mine = line.speaker === me;
          const isGap = i === ex.gapIndex;
          return (
            <div key={i} className={cx(s.bubbleRow, mine && s.bubbleRowMine)}>
              <div className={cx(s.bubble, mine && s.bubbleMine, isGap && s.bubbleGap, isGap && locked && outcome && (outcome.correct ? s.bubbleOk : s.bubbleBad))}>
                <span className={s.bubbleSpeaker}>{line.speaker}</span>
                {isGap ? (
                  withOptions ? (
                    <span className={s.bubbleText} lang={env.lang}>
                      {sel !== null ? ex.options![sel] : <span className={s.gapDots} aria-label="Lücke">…</span>}
                    </span>
                  ) : (
                    <DialogueInput value={text} onChange={type} locked={locked} env={env} onSubmit={() => submit()} german={line.german} />
                  )
                ) : (
                  <span className={s.bubbleLine}>
                    <span className={s.bubbleText} lang={env.lang}>{line.text}</span>
                    <SpeakButton text={line.text} lang={env.lang} />
                  </span>
                )}
                {showGerman && !isGap && line.german && <span className={s.bubbleGerman}>{line.german}</span>}
              </div>
            </div>
          );
        })}
      </div>
      {ex.lines.some((l, i) => i !== ex.gapIndex && l.german) && (
        <button type="button" className={s.linkBtn} onClick={() => setShowGerman((v) => !v)} aria-pressed={showGerman}>
          <Eye aria-hidden /> {showGerman ? 'Übersetzung ausblenden' : 'Übersetzung zeigen'}
        </button>
      )}
      {withOptions && (
        <OptionList
          options={ex.options!} selected={sel} onSelect={choose} locked={locked}
          correct={locked && outcome ? ex.answer! : null} lang={env.lang} label="Passende Antwort"
        />
      )}
    </>
  );
}

function DialogueInput({ value, onChange, locked, env, onSubmit, german }: {
  value: string; onChange: (v: string) => void; locked: boolean; env: ExEnv; onSubmit: () => void; german?: string;
}) {
  return (
    <span className={s.bubbleInputWrap}>
      {german && <span className={s.bubbleHint}>Sinngemäß: „{german}“</span>}
      <input
        className={s.bubbleInput}
        value={value}
        readOnly={locked}
        placeholder="Deine Antwort …"
        aria-label={german ? `Deine Antwort (sinngemäß: ${german})` : 'Deine Antwort'}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onEnter(onSubmit)}
        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
        {...targetInputProps(env.lang, 'sentences')}
      />
    </span>
  );
}
