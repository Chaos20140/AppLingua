/**
 * Lernkarten-Bausteine (auch von der Wiederholung genutzt):
 * `Flashcard` – umdrehen & selbst bewerten; `TypeCard` – Schreiben (Deutsch → Zielsprache) bzw. Hören & Tippen.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Eye, Headphones, RotateCcw, Square, Turtle, Volume2, X } from 'lucide-react';
import type { SrsCard } from '../../core/types';
import { gradeText, type TextGrade } from '../../engine/grading';
import { GRADE_LABELS, previewIntervals, type SrsGrade } from '../../engine/srs';
import { useTts } from '../../speech/tts';
import { Button, IconButton, RichText } from '../../ui';
import { acceptedAnswers, gradeForText, sourceText } from './vocabUtils';
import s from './Flashcard.module.css';

const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(' ');
const GRADES: SrsGrade[] = [0, 1, 2, 3];
const GRADE_CLASS: Record<SrsGrade, string> = { 0: s.again, 1: s.hard, 2: s.good, 3: s.easy };

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

function SpeakButton({ text, lang, slow, className }: { text: string; lang: string; slow?: boolean; className?: string }) {
  const tts = useTts();
  if (!tts.available) return null;
  const key = `card:${slow ? 'slow:' : ''}${text}`;
  const active = tts.speakingKey === key;
  return (
    <IconButton
      className={className}
      variant="tonal"
      label={active ? 'Wiedergabe stoppen' : slow ? 'Langsam anhören' : 'Anhören'}
      icon={active ? <Square size={16} /> : slow ? <Turtle size={20} /> : <Volume2 size={20} />}
      onClick={(e) => { e.stopPropagation(); if (active) tts.stop(); else void tts.speak(text, { lang, slow, key }); }}
    />
  );
}

// ───────────────────────── Karteikarte ─────────────────────────

export interface FlashcardProps {
  card: SrsCard;
  /** BCP-47 für die Sprachausgabe */
  lang: string;
  onGrade: (grade: SrsGrade) => void;
  /** Intervalle an den Bewertungsknöpfen zeigen (nur, wenn wirklich eingeplant wird) */
  showIntervals?: boolean;
}

export function Flashcard({ card, lang, onGrade, showIntervals = true }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const gradeRef = useRef<HTMLDivElement>(null);
  const intervals = showIntervals ? previewIntervals(card) : null;

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!flipped && (e.key === ' ' || e.key === 'Enter') && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        onGrade((Number(e.key) - 1) as SrsGrade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onGrade]);

  useEffect(() => {
    if (flipped) gradeRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [flipped]);

  return (
    <div className={s.wrap}>
      <div className={s.scene}>
        <div className={cx(s.card, flipped && s.flipped)}>
          <button
            type="button"
            className={cx(s.face, s.front)}
            onClick={() => setFlipped(true)}
            aria-hidden={flipped}
            inert={flipped}
            aria-label={`${card.front} – Antwort zeigen`}
          >
            <span className={s.source}>{sourceText(card)}</span>
            <span className={s.frontText} lang={lang}>{card.front}</span>
            <span className={s.tapHint}><RotateCcw size={14} aria-hidden="true" /> Tippen zum Umdrehen</span>
          </button>
          <div className={cx(s.face, s.back)} aria-hidden={!flipped} inert={!flipped}>
            <span className={s.source}>{sourceText(card)}</span>
            <span className={s.backFront} lang={lang}>{card.front}</span>
            <span className={s.divider} aria-hidden="true" />
            <span className={s.backText}>{card.back}</span>
            {card.hint && <span className={s.extra}>{card.hint}</span>}
            {card.note && <span className={s.note}>Notiz: {card.note}</span>}
          </div>
        </div>
        <div className={s.speak}><SpeakButton text={card.front} lang={lang} /></div>
      </div>

      <div aria-live="polite" className={s.srOnly}>{flipped ? `Antwort: ${card.back}` : ''}</div>

      {flipped ? (
        <div ref={gradeRef} className={s.grades} role="group" aria-label="Wie gut wusstest du es?">
          {GRADES.map((g) => (
            <button key={g} type="button" className={cx(s.grade, GRADE_CLASS[g])} onClick={() => onGrade(g)}>
              <span className={s.gradeLabel}>{GRADE_LABELS[g]}</span>
              {intervals && <span className={s.gradeInterval}>{intervals[g]}</span>}
              <span className={s.srOnly}>(Taste {g + 1})</span>
            </button>
          ))}
        </div>
      ) : (
        <Button block size="lg" variant="secondary" icon={<Eye size={18} />} onClick={() => setFlipped(true)}>
          Antwort zeigen
        </Button>
      )}
    </div>
  );
}

// ───────────────────────── Schreiben / Hören ─────────────────────────

export interface TypeCardProps {
  card: SrsCard;
  lang: string;
  mode: 'write' | 'listen';
  strictAccents: boolean;
  /** nach „Weiter“: vorgeschlagene SRS-Note */
  onDone: (grade: SrsGrade, correct: boolean) => void;
  showIntervals?: boolean;
}

export function TypeCard({ card, lang, mode, strictAccents, onDone, showIntervals = true }: TypeCardProps) {
  const tts = useTts();
  const [value, setValue] = useState('');
  const [result, setResult] = useState<TextGrade | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const done = result !== null || gaveUp;
  const grade: SrsGrade = gaveUp || !result ? 0 : gradeForText(result);
  const correct = !gaveUp && !!result?.correct;
  const intervals = showIntervals ? previewIntervals(card) : null;

  useEffect(() => {
    if (done) nextRef.current?.focus({ preventScroll: true });
  }, [done]);

  const check = () => {
    if (done || !value.trim()) return;
    setResult(gradeText(value, acceptedAnswers(card.front), { strictAccents }));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); check(); }
  };

  return (
    <div className={s.wrap}>
      <div className={s.prompt}>
        <span className={s.source}>{sourceText(card)}</span>
        {mode === 'write' ? (
          <>
            <p className={s.instruction}>Wie heißt das in der Zielsprache?</p>
            <p className={s.germanPrompt}>{card.back}</p>
            {card.hint && <p className={s.extra}>{card.hint}</p>}
          </>
        ) : (
          <>
            <p className={s.instruction}>Hör zu und schreib, was du hörst.</p>
            <div className={s.listenRow}>
              <Button
                size="lg"
                icon={<Headphones size={20} />}
                onClick={() => void tts.speak(card.front, { lang, key: `listen:${card.itemId}` })}
                loading={tts.speakingKey === `listen:${card.itemId}`}
              >
                Anhören
              </Button>
              <SpeakButton text={card.front} lang={lang} slow />
            </div>
            {tts.error && <p className={s.error} role="alert">{tts.error}</p>}
          </>
        )}
      </div>

      <label className={s.inputLabel}>
        <span className={s.srOnly}>Deine Antwort</span>
        <input
          ref={inputRef}
          className={cx(s.input, done && (correct ? s.inputOk : s.inputBad))}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          readOnly={done}
          placeholder="Deine Antwort …"
          lang={lang}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
        />
      </label>

      <div aria-live="polite" className={s.feedbackWrap}>
        {done && (
          <div className={cx(s.feedback, correct ? s.feedbackOk : s.feedbackBad)}>
            <span className={s.feedbackIcon} aria-hidden="true">{correct ? <Check size={20} /> : <X size={20} />}</span>
            <div className={s.feedbackBody}>
              <p className={s.feedbackTitle}>
                {gaveUp ? 'Kein Problem – so heißt es:' : correct ? (result?.typo || result?.accentOnly ? 'Fast perfekt!' : 'Richtig!') : 'Nicht ganz – richtig ist:'}
              </p>
              {correct && result?.hint ? (
                <RichText md={result.hint} targetLang={lang} className={s.feedbackText} />
              ) : (
                <p className={s.feedbackAnswer} lang={lang}>{card.front}</p>
              )}
              {mode === 'listen' && <p className={s.feedbackGerman}>{card.back}</p>}
            </div>
            <SpeakButton text={card.front} lang={lang} />
          </div>
        )}
      </div>

      {done ? (
        <Button ref={nextRef} block size="lg" onClick={() => onDone(grade, correct)}>
          Weiter{intervals ? ` · ${GRADE_LABELS[grade]} (${intervals[grade]})` : ''}
        </Button>
      ) : (
        <div className={s.actions}>
          <Button block size="lg" onClick={check} disabled={!value.trim()}>Prüfen</Button>
          <Button block variant="ghost" onClick={() => setGaveUp(true)}>Weiß ich nicht</Button>
        </div>
      )}
    </div>
  );
}
