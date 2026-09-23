/**
 * Übungs-Panels unter der aktuellen Zeile (je Modus): Mikrofon (Mitsingen/Aussprache),
 * „Zeile für Zeile“ mit kurzem Check, Lückentext, Übersetzungs-Challenge, Aussprachetraining
 * sowie eine kleine Aktionsleiste für die übrigen Modi.
 */
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import {
  ArrowRight, BookOpen, Check, Eye, Headphones, Mic, NotebookPen, RotateCcw, Snail, Square, Volume2, X,
} from 'lucide-react';
import type { Song, SongLine } from '../../../content/types';
import { gradeText } from '../../../engine/grading';
import { SCORE_LABEL } from '../../../speech/pronunciationScore';
import { SELF_RATING_OPTIONS, usePronunciationCheck, type PronCheckResult } from '../../../speech/usePronunciationCheck';
import { useTts } from '../../../speech/tts';
import { Badge, Button, Spinner, TextArea, TextField, useToast } from '../../../ui';
import { saveNote } from '../songData';
import { contentScore, gapSolution, lineSeed, translationChoice, type LangBase } from './timeline';
import { cx } from './util';
import s from './player.module.css';

// ───────────────────────── Akzent-Leiste ─────────────────────────

const ACCENT_KEYS: Record<LangBase, string[]> = {
  es: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
  pt: ['á', 'â', 'ã', 'à', 'ç', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú'],
};

type Field = HTMLInputElement | HTMLTextAreaElement;

function insertAtCursor(el: Field, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + text + el.value.slice(end);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.focus({ preventScroll: true });
  try { el.setSelectionRange(start + text.length, start + text.length); } catch { /* egal */ }
}

export function AccentKeys({ base, targetRef }: { base: LangBase; targetRef: RefObject<Field | null> }) {
  return (
    <div className={s.accentBar} role="group" aria-label="Sonderzeichen einfügen">
      {ACCENT_KEYS[base].map((c) => (
        <button
          key={c}
          type="button"
          className={s.accentKey}
          // Fokus (und iPhone-Tastatur) im Eingabefeld behalten
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => { if (targetRef.current) insertAtCursor(targetRef.current, c); }}
          aria-label={`${c} einfügen`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────── Mikrofon (Mitsingen / Aussprache) ─────────────────────────

export interface LineMicProps {
  song: Song;
  line: SongLine;
  lineNo: number;
  lang: string;
  variant: 'bar' | 'panel';
  onResult: (line: SongLine, result: PronCheckResult) => void;
  onBusyChange?: (busy: boolean) => void;
}

export function LineMic({ song, line, lineNo, lang, variant, onResult, onBusyChange }: LineMicProps) {
  const pc = usePronunciationCheck(line.text, {
    lang,
    itemId: `${song.id}:${line.id}`,
    maxDurationMs: Math.min(14000, Math.max(6000, (line.endMs - line.startMs) * 2)),
    onResult: (r) => onResult(line, r),
  });
  const active = pc.status === 'listening' || pc.status === 'recording';
  const busy = active || pc.status === 'evaluating' || pc.status === 'self-rating';
  const noMic = pc.mode === 'listen-only';
  const busyRef = useRef(onBusyChange);
  busyRef.current = onBusyChange;
  useEffect(() => { busyRef.current?.(busy); }, [busy]);
  useEffect(() => () => busyRef.current?.(false), []);

  const startLabel = noMic ? 'Vorbild hören & selbst einschätzen' : pc.mode === 'recording' ? 'Aufnehmen' : variant === 'bar' ? `Zeile ${lineNo} mitsingen` : 'Nachsprechen';
  const result = pc.status === 'result' ? pc.result : null;

  const main = active ? (
    <Button variant="primary" icon={<Square size={16} aria-hidden="true" />} onClick={pc.stop}>Fertig</Button>
  ) : pc.status === 'evaluating' ? (
    <Spinner label="Wird ausgewertet …" />
  ) : pc.status === 'self-rating' ? null : (
    <Button
      variant="primary"
      icon={noMic ? <Volume2 size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
      onClick={() => { if (result || pc.status === 'error') pc.reset(); pc.start(); }}
    >
      {result || pc.status === 'error' ? 'Noch einmal' : startLabel}
    </Button>
  );

  return (
    <div className={cx(s.mic, variant === 'bar' ? s.micBar : s.micPanel)}>
      <div className={s.micRow}>
        {main}
        {active && (
          <div className={s.micLive} aria-hidden="true">
            <span className={s.micLevel} style={{ transform: `scaleX(${Math.max(0.06, pc.level)})` }} />
          </div>
        )}
        {active && <Button variant="ghost" onClick={pc.cancel}>Abbrechen</Button>}
        {result && (
          <Badge tone={result.scorePct >= 80 ? 'success' : result.scorePct >= 50 ? 'gold' : 'neutral'}>
            {result.scorePct} %
          </Badge>
        )}
      </div>
      <p className={s.micHint} aria-live="polite">
        {pc.error ?? (active && pc.interim ? `„${pc.interim}“` : result ? (result.method === 'speech-recognition' ? SCORE_LABEL : 'laut deiner Selbsteinschätzung') : pc.hint)}
      </p>
      {pc.status === 'self-rating' && (
        <div className={s.rateRow} role="group" aria-label="Wie nah warst du am Vorbild?">
          {pc.hasRecording && (
            <Button variant="secondary" icon={<Headphones size={16} aria-hidden="true" />} onClick={() => { void pc.playRecording(); }}>Meine Aufnahme</Button>
          )}
          {SELF_RATING_OPTIONS.map((o) => (
            <Button key={o.value} variant="secondary" onClick={() => pc.selfRate(o.value)}>{o.label}</Button>
          ))}
        </div>
      )}
      {variant === 'panel' && result && (
        <div className={s.micResult}>
          {result.method === 'speech-recognition' && result.words.length > 0 && (
            <p className={s.micWords} lang={lang}>
              {result.words.map((w, i) => (
                <span key={i} className={w.ok ? s.wordOk : s.wordMiss}>{w.text} </span>
              ))}
            </p>
          )}
          {result.summary && <p className={s.muted}>{result.summary}</p>}
          {result.notes.length > 0 && <ul className={s.tips}>{result.notes.slice(0, 2).map((t) => <li key={t}>{t}</li>)}</ul>}
          {result.tips.length > 0 && <ul className={s.tips}>{result.tips.slice(0, 3).map((t) => <li key={t}>{t}</li>)}</ul>}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── gemeinsame Aktionszeile ─────────────────────────

interface LineActionsProps {
  onRepeat?: () => void;
  onExplain: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  extra?: ReactNode;
}

export function LineActions({ onRepeat, onExplain, onContinue, continueLabel = 'Weiter', extra }: LineActionsProps) {
  return (
    <div className={s.actions}>
      {onRepeat && <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={onRepeat}>Wiederholen</Button>}
      <Button variant="secondary" icon={<BookOpen size={16} aria-hidden="true" />} onClick={onExplain}>Verstehen</Button>
      {extra}
      {onContinue && <Button variant="primary" iconRight={<ArrowRight size={16} aria-hidden="true" />} onClick={onContinue}>{continueLabel}</Button>}
    </div>
  );
}

// ───────────────────────── Zeile für Zeile: kurzer Check ─────────────────────────

export interface LearnPanelProps {
  song: Song;
  idx: number;
  base: LangBase;
  strictAccents: boolean;
  learned: boolean;
  isLast: boolean;
  onRepeat: () => void;
  onExplain: () => void;
  onContinue: () => void;
  /** meldet das Ergebnis (0–100) → recordSongActivity line-learned; true = als gelernt gezählt */
  onChecked: (lineId: string, scorePct: number) => boolean;
}

type CheckKind = 'choice' | 'gap';

export function LearnPanel(p: LearnPanelProps) {
  const line = p.song.lines[p.idx];
  const seed = lineSeed(p.song.id, line.id);
  const choice = useMemo(() => translationChoice(p.song.lines, p.idx, seed, 3), [p.song.lines, p.idx, seed]);
  const gapIdx = useMemo(() => {
    const ranked = line.tokens.map((t, i) => ({ i, sc: contentScore(t, p.base) })).filter((w) => w.sc >= 0).sort((a, b) => b.sc - a.sc);
    return ranked[0]?.i ?? -1;
  }, [line.tokens, p.base]);
  const firstKind: CheckKind | null = choice ? 'choice' : gapIdx >= 0 ? 'gap' : null;

  const [phase, setPhase] = useState<'idle' | 'check' | 'passed' | 'missed'>('idle');
  const [attempt, setAttempt] = useState(0);
  const [kind, setKind] = useState<CheckKind | null>(firstKind);
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = (correct: boolean) => {
    const score = correct ? (attempt === 0 ? 100 : 85) : 30;
    const learnedNow = p.onChecked(line.id, score);
    if (correct) {
      setPhase('passed');
      setFeedback(learnedNow || p.learned ? 'Richtig – die Zeile sitzt!' : 'Richtig!');
    } else {
      setPhase('missed');
      setFeedback('Noch nicht ganz. Hör dir die Zeile noch einmal an und versuch es dann erneut.');
    }
  };

  const retry = () => {
    setAttempt((a) => a + 1);
    // zweiter Versuch mit anderer Aufgabenart (falls möglich), damit Raten nicht reicht
    setKind(kind === 'choice' && gapIdx >= 0 ? 'gap' : kind);
    setPicked(null);
    setTyped('');
    setFeedback(null);
    setPhase('check');
  };

  const submitGap = (e: FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    const g = gradeText(typed, [gapSolution(line.tokens[gapIdx])], { strictAccents: p.strictAccents });
    finish(g.correct);
  };

  const heading = `Zeile ${p.idx + 1} von ${p.song.lines.length}`;

  return (
    <section className={s.panel} aria-label={`Übung zu ${heading}`}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>{heading}</span>
        {p.learned && <Badge tone="success" icon={<Check size={14} aria-hidden="true" />}>Gelernt</Badge>}
      </div>

      {phase === 'idle' && (
        <>
          <p className={s.muted}>Hör genau hin, lass dir die Zeile erklären – und zeig dann im kurzen Check, dass du sie verstanden hast.</p>
          <LineActions
            onRepeat={p.onRepeat}
            onExplain={p.onExplain}
            extra={firstKind ? (
              <Button variant="secondary" icon={<Check size={16} aria-hidden="true" />} onClick={() => { setPhase('check'); setKind(firstKind); }}>
                {p.learned ? 'Nochmal prüfen' : 'Gelernt? Kurz prüfen'}
              </Button>
            ) : null}
            onContinue={p.onContinue}
            continueLabel={p.isLast ? 'Abschließen' : 'Nächste Zeile'}
          />
        </>
      )}

      {phase === 'check' && kind === 'choice' && choice && (
        <div className={s.check}>
          <p className={s.checkQ}>Was bedeutet die Zeile?</p>
          <div className={s.options} role="group" aria-label="Übersetzung wählen">
            {choice.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={cx(s.option, picked === i && (i === choice.correct ? s.optionOk : s.optionMiss))}
                disabled={picked !== null}
                onClick={() => { setPicked(i); finish(i === choice.correct); }}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'check' && kind === 'gap' && gapIdx >= 0 && (
        <form className={s.check} onSubmit={submitGap}>
          <p className={s.checkQ}>Welches Wort fehlt?</p>
          <p className={s.checkLine} lang={p.base}>
            {line.tokens.map((t, i) => (i === gapIdx ? '＿＿＿' : t.t)).join(' ').replace(/ ([.,!?;:…])/g, '$1').replace(/([¿¡]) /g, '$1')}
          </p>
          <TextField
            ref={inputRef}
            label="Fehlendes Wort"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            autoFocus
          />
          <AccentKeys base={p.base} targetRef={inputRef} />
          <Button type="submit" variant="primary" disabled={!typed.trim()}>Prüfen</Button>
        </form>
      )}

      {(phase === 'passed' || phase === 'missed') && (
        <>
          <p className={cx(s.feedback, phase === 'passed' ? s.feedbackOk : s.feedbackMiss)} role="status">
            {phase === 'passed' ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />} {feedback}
          </p>
          {phase === 'missed' && (
            <p className={s.solution}>
              {kind === 'gap' ? <>Gesucht war: <strong lang={p.base}>{gapSolution(line.tokens[gapIdx])}</strong></> : <>Richtig wäre: <strong>{line.natural}</strong></>}
            </p>
          )}
          <LineActions
            onRepeat={p.onRepeat}
            onExplain={p.onExplain}
            extra={phase === 'missed' ? <Button variant="secondary" onClick={retry}>Nochmal prüfen</Button> : null}
            onContinue={p.onContinue}
            continueLabel={p.isLast ? 'Abschließen' : 'Nächste Zeile'}
          />
        </>
      )}
    </section>
  );
}

// ───────────────────────── Lückentext ─────────────────────────

export interface GapPanelProps {
  song: Song;
  idx: number;
  gaps: readonly number[];
  base: LangBase;
  strictAccents: boolean;
  result: Readonly<Record<number, boolean>> | undefined;
  isLast: boolean;
  onChecked: (lineId: string, result: Record<number, boolean>) => void;
  onRepeat: () => void;
  onExplain: () => void;
  onContinue: () => void;
}

export function GapPanel(p: GapPanelProps) {
  const line = p.song.lines[p.idx];
  const [values, setValues] = useState<string[]>(() => p.gaps.map(() => ''));
  const [accentHints, setAccentHints] = useState<number[]>([]);
  const lastFocused = useRef<HTMLInputElement | null>(null);
  const formId = useId();
  const checked = p.result !== undefined;

  if (!p.gaps.length) {
    return (
      <section className={s.panel} aria-label="Lückentext">
        <p className={s.muted}>In dieser Zeile gibt es keine Lücke – hör einfach zu.</p>
        <LineActions onRepeat={p.onRepeat} onExplain={p.onExplain} onContinue={p.onContinue} continueLabel={p.isLast ? 'Abschließen' : 'Nächste Zeile'} />
      </section>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (checked) return;
    const res: Record<number, boolean> = {};
    const accents: number[] = [];
    p.gaps.forEach((ti, k) => {
      const g = gradeText(values[k] ?? '', [gapSolution(line.tokens[ti])], { strictAccents: p.strictAccents });
      res[ti] = g.correct;
      if (g.accentOnly) accents.push(ti);
    });
    setAccentHints(accents);
    p.onChecked(line.id, res);
  };

  const correct = checked ? p.gaps.filter((ti) => p.result?.[ti]).length : 0;

  return (
    <section className={s.panel} aria-label={`Lückentext Zeile ${p.idx + 1}`}>
      <form id={formId} onSubmit={submit} className={s.gapForm}>
        <div className={s.gapFields}>
          {p.gaps.map((ti, k) => {
            const r = p.result?.[ti];
            return (
              <div key={ti} className={s.gapField}>
                <TextField
                  label={`Lücke ${k + 1}`}
                  value={values[k] ?? ''}
                  onChange={(e) => { const v = e.target.value; setValues((old) => old.map((x, j) => (j === k ? v : x))); }}
                  onFocus={(e) => { lastFocused.current = e.currentTarget; }}
                  disabled={checked}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={k === p.gaps.length - 1 ? 'done' : 'next'}
                  error={checked && r === false ? `Lösung: ${gapSolution(line.tokens[ti])}` : null}
                  hint={checked && r ? (accentHints.includes(ti) ? 'Richtig – achte noch auf den Akzent.' : 'Richtig!') : undefined}
                  inputClassName={cx(checked && (r ? s.inputOk : s.inputMiss))}
                  lang={p.base}
                />
              </div>
            );
          })}
        </div>
        {!checked && <AccentKeys base={p.base} targetRef={lastFocused} />}
        {!checked ? (
          <div className={s.actions}>
            <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={p.onRepeat}>Nochmal hören</Button>
            <Button type="submit" variant="primary" icon={<Check size={16} aria-hidden="true" />}>Prüfen</Button>
          </div>
        ) : (
          <>
            <p className={cx(s.feedback, correct === p.gaps.length ? s.feedbackOk : s.feedbackMiss)} role="status">
              {correct === p.gaps.length ? <Check size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              {correct === p.gaps.length ? ' Alles richtig – stark!' : ` ${correct} von ${p.gaps.length} richtig. Die Lösungen stehen jetzt im Text.`}
            </p>
            <LineActions onRepeat={p.onRepeat} onExplain={p.onExplain} onContinue={p.onContinue} continueLabel={p.isLast ? 'Abschließen' : 'Nächste Zeile'} />
          </>
        )}
      </form>
    </section>
  );
}

// ───────────────────────── Übersetzungs-Challenge ─────────────────────────

export interface TranslatePanelProps {
  song: Song;
  idx: number;
  result: boolean | undefined;
  isLast: boolean;
  onResult: (lineId: string, correct: boolean) => void;
  onRepeat: () => void;
  onExplain: () => void;
  onContinue: () => void;
}

export function TranslatePanel(p: TranslatePanelProps) {
  const toast = useToast();
  const line = p.song.lines[p.idx];
  const seed = lineSeed(p.song.id, line.id);
  const choice = useMemo(() => translationChoice(p.song.lines, p.idx, seed, 4), [p.song.lines, p.idx, seed]);
  const [free, setFree] = useState(!choice);
  const [picked, setPicked] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [revealed, setRevealed] = useState(false);
  const cont = <Button variant="primary" iconRight={<ArrowRight size={16} aria-hidden="true" />} onClick={p.onContinue}>{p.isLast ? 'Abschließen' : 'Nächste Zeile'}</Button>;

  // Eigene Texte ohne hinterlegte Übersetzung: ehrlich – nur eigene Notiz, keine Bewertung
  if (!line.natural) {
    return (
      <section className={s.panel} aria-label="Eigene Übersetzung">
        <p className={s.muted}>Für eigene Texte ist keine Übersetzung hinterlegt. Schreib deine eigene – sie wird als Notiz zu dieser Zeile gespeichert.</p>
        <TextArea
          label="Deine Übersetzung"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          autoGrow
        />
        <div className={s.actions}>
          <Button variant="secondary" icon={<BookOpen size={16} aria-hidden="true" />} onClick={p.onExplain}>Erklären lassen</Button>
          <Button
            variant="secondary"
            icon={<NotebookPen size={16} aria-hidden="true" />}
            disabled={!text.trim()}
            onClick={() => { saveNote(p.song.id, line.id, text.trim()); toast('Notiz gespeichert.', { tone: 'success' }); }}
          >
            Als Notiz speichern
          </Button>
          {cont}
        </div>
      </section>
    );
  }

  const done = p.result !== undefined;

  return (
    <section className={s.panel} aria-label={`Übersetzung Zeile ${p.idx + 1}`}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>Was bedeutet die Zeile?</span>
        {choice && (
          <button type="button" className={s.linkBtn} onClick={() => setFree((f) => !f)} disabled={done}>
            {free ? 'Auswahl zeigen' : 'Selbst formulieren'}
          </button>
        )}
      </div>

      {!free && choice && (
        <div className={s.options} role="group" aria-label="Übersetzung wählen">
          {choice.options.map((o, i) => (
            <button
              key={o}
              type="button"
              className={cx(s.option, picked !== null && i === choice.correct && s.optionOk, picked === i && i !== choice.correct && s.optionMiss)}
              disabled={done}
              onClick={() => { setPicked(i); p.onResult(line.id, i === choice.correct); }}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {free && (
        <form className={s.check} onSubmit={(e) => { e.preventDefault(); if (text.trim()) setRevealed(true); }}>
          <TextArea
            label="Deine Übersetzung (Deutsch)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) setRevealed(true); } }}
            rows={2}
            autoGrow
            disabled={revealed}
          />
          {!revealed && <Button type="submit" variant="primary" disabled={!text.trim()}>Vergleichen</Button>}
        </form>
      )}

      {(revealed || done) && (
        <div className={s.reference} aria-live="polite">
          <p><span className={s.refLabel}>Natürlich:</span> {line.natural}</p>
          {line.literal && <p><span className={s.refLabel}>Wörtlich:</span> {line.literal}</p>}
        </div>
      )}

      {free && revealed && !done && (
        <div className={s.actions} role="group" aria-label="Selbst einschätzen">
          <Button variant="secondary" icon={<X size={16} aria-hidden="true" />} onClick={() => p.onResult(line.id, false)}>Noch nicht</Button>
          <Button variant="primary" icon={<Check size={16} aria-hidden="true" />} onClick={() => p.onResult(line.id, true)}>Sinngemäß richtig</Button>
        </div>
      )}

      {done && (
        <p className={cx(s.feedback, p.result ? s.feedbackOk : s.feedbackMiss)} role="status">
          {p.result ? <><Check size={18} aria-hidden="true" /> Genau so!</> : <><X size={18} aria-hidden="true" /> Beim nächsten Durchgang sitzt es.</>}
        </p>
      )}

      <div className={s.actions}>
        <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={p.onRepeat}>Nochmal hören</Button>
        <Button variant="secondary" icon={<BookOpen size={16} aria-hidden="true" />} onClick={p.onExplain}>Erklären</Button>
        {done && cont}
      </div>
    </section>
  );
}

// ───────────────────────── Aussprachetraining ─────────────────────────

export interface PronPanelProps {
  song: Song;
  idx: number;
  lang: string;
  isLast: boolean;
  onResult: (line: SongLine, result: PronCheckResult) => void;
  onExplain: () => void;
  onContinue: () => void;
}

export function PronPanel(p: PronPanelProps) {
  const line = p.song.lines[p.idx];
  const tts = useTts();
  const help = tts.available ? tts.missingVoiceHelp(p.lang) : 'Dein Browser hat keine Sprachausgabe – nutze die Lautschrift als Vorbild.';
  const key = `pron:${p.song.id}:${line.id}`;
  return (
    <section className={s.panel} aria-label={`Aussprache Zeile ${p.idx + 1}`}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>1 · Hören</span>
      </div>
      <div className={s.actions}>
        <Button
          variant="secondary"
          icon={<Snail size={16} aria-hidden="true" />}
          disabled={!tts.available}
          onClick={() => { void tts.speak(line.text, { lang: p.lang, slow: true, key: `${key}:slow` }); }}
        >
          Langsam anhören
        </Button>
        <Button
          variant="secondary"
          icon={<Volume2 size={16} aria-hidden="true" />}
          disabled={!tts.available}
          onClick={() => { void tts.speak(line.text, { lang: p.lang, key }); }}
        >
          Normal
        </Button>
      </div>
      {(line.phonetic || line.ipa) && (
        <p className={s.phoneticBox}>
          {line.phonetic && <span>{line.phonetic}</span>}
          {line.ipa && <span className={s.ipa}>/{line.ipa}/</span>}
        </p>
      )}
      {(help || tts.error) && <p className={s.note}>{tts.error ?? help}</p>}
      <div className={s.panelHead}>
        <span className={s.panelTitle}>2 · Nachsprechen</span>
      </div>
      <LineMic key={line.id} song={p.song} line={line} lineNo={p.idx + 1} lang={p.lang} variant="panel" onResult={p.onResult} />
      <LineActions onExplain={p.onExplain} onContinue={p.onContinue} continueLabel={p.isLast ? 'Abschließen' : 'Nächste Zeile'} />
    </section>
  );
}
