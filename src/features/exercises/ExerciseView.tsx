/**
 * ExerciseView – rendert jede der 17 Übungsarten, bewertet mit gradeExercise und zeigt das Feedback.
 * Vertrag: ./contract.ts (ExerciseViewProps). „Prüfen“ (bzw. im Prüfungsmodus „Abgeben“) ist ohne
 * Antwort deaktiviert; Enter prüft. Danach FeedbackPanel und „Weiter“ → onDone(outcome).
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react';
import {
  ArrowRight, AudioLines, Blocks, Bot, CircleAlert, CircleCheck, Ear, Image as ImageIcon, Keyboard, Languages,
  Link2, ListChecks, MapPin, MessagesSquare, Mic, MicVocal, PencilLine, SpellCheck, Table, TextCursorInput,
} from 'lucide-react';
import { Button, Skeleton } from '../../ui';
import type { ExerciseType } from '../../content/types';
import { gradeExercise, instructionFor, type ExerciseAnswer, type ExerciseOutcome } from '../../engine/grading';
import { sfx } from '../../speech/sfx';
import { stopSpeaking } from '../../speech/tts';
import { ttsLangFor, useSettings } from '../../state/settings';
import { AccentBar } from './AccentBar';
import { DialogueBody, ListeningBody, McBody, MinimalPairBody, SituationBody } from './ChoiceBodies';
import type { ExerciseViewProps } from './contract';
import { cx } from './cx';
import { FeedbackPanel } from './FeedbackPanel';
import { MatchBody } from './MatchBody';
import { SpeakBody, SpeakFreeBody } from './SpeakBodies';
import {
  ENCOURAGE, hasUserGesture, isTextInput, needsAccentBar, PRAISE, prefersReducedMotion, TYPE_LABEL,
  type BodyProps, type ExEnv,
} from './shared';
import { ClozeBody, ConjugateBody, DictationBody, FixErrorBody, FreeTextBody, TranslateBody } from './TextBodies';
import { OrderBody } from './TileBodies';
import s from './ex.module.css';

const AiChatExercise = lazy(() => import('../partner/AiChatExercise'));

const TYPE_ICON: Record<ExerciseType, typeof Mic> = {
  mc: ListChecks, cloze: TextCursorInput, order: Blocks, translate: Languages, freeText: PencilLine, listening: Ear,
  dictation: Keyboard, speak: Mic, minimalPair: AudioLines, fixError: SpellCheck, dialogue: MessagesSquare,
  situation: MapPin, imageMatch: ImageIcon, matchPairs: Link2, conjugate: Table, speakFree: MicVocal, aiChat: Bot,
};

/** Typen ohne „Prüfen“-Knopf im Übungsmodus (prüfen sich selbst) */
const SELF_CHECKING: ExerciseType[] = ['aiChat', 'imageMatch', 'matchPairs'];

export default function ExerciseView(props: ExerciseViewProps) {
  // Neu aufbauen bei neuer Übung – und nach „Weiter“, falls dieselbe Übung erneut gestellt wird.
  const [round, setRound] = useState(0);
  const { onDone } = props;
  const done = useCallback((o: ExerciseOutcome) => {
    setRound((r) => r + 1);
    onDone(o);
  }, [onDone]);
  return <Runner key={`${props.exercise.id}:${round}`} {...props} onDone={done} />;
}

function Runner({ exercise, courseId, variant, context, refId, examMode = false, onDone }: ExerciseViewProps) {
  const settings = useSettings();
  const [answer, setAnswerState] = useState<ExerciseAnswer>(null);
  const [outcome, setOutcome] = useState<ExerciseOutcome | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [title, setTitle] = useState('');
  const [typing, setTyping] = useState(false);
  const [live, setLive] = useState('');

  const startedAt = useRef(Date.now());
  const answerRef = useRef<ExerciseAnswer>(null);
  const finalRef = useRef(false);
  const doneRef = useRef(false);
  const rootRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const strictRef = useRef(settings.strictAccents);
  strictRef.current = settings.strictAccents;

  const env = useMemo<ExEnv>(() => ({
    courseId, variant, context, refId, examMode,
    lang: ttsLangFor(variant),
    base: courseId === 'pt-BR' ? 'pt' : 'es',
    autoplay: settings.autoplayAudio && hasUserGesture(),
    showIpa: settings.showIPA,
  // Autoplay nur beim Aufbau entscheiden
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [courseId, variant, context, refId, examMode, settings.showIPA]);

  const setAnswer = useCallback((a: ExerciseAnswer) => {
    if (finalRef.current) return;
    answerRef.current = a;
    setAnswerState(a);
  }, []);

  const check = useCallback((override?: ExerciseAnswer) => {
    if (finalRef.current) return;
    const a = override !== undefined ? override : answerRef.current;
    if (a === null || a === undefined) return;
    finalRef.current = true;
    const o = gradeExercise(exercise, a, { strictAccents: strictRef.current, durationMs: Date.now() - startedAt.current });
    const active = document.activeElement;
    if (isTextInput(active)) active.blur();
    setTyping(false);
    if (examMode) {
      setSubmitted(true);
      setLive('Antwort abgegeben.');
      doneRef.current = true;
      onDone(o);
      return;
    }
    const t = o.correct ? PRAISE[Math.floor(Math.random() * PRAISE.length)] : ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)];
    setTitle(t);
    setOutcome(o);
    setLive(o.correct ? t : `${t}. Richtige Lösung: ${o.expected}`);
    if (o.correct) sfx.correct(); else sfx.wrong();
  }, [exercise, examMode, onDone]);

  const next = useCallback(() => {
    if (!outcome || doneRef.current) return;
    doneRef.current = true;
    stopSpeaking();
    onDone(outcome);
  }, [outcome, onDone]);

  // Nach dem Prüfen: Rückmeldung zeigen, Fokus auf „Weiter“ (Enter = weiter)
  useEffect(() => {
    if (!outcome) return;
    continueRef.current?.focus({ preventScroll: true });
    const t = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, 60);
    return () => window.clearTimeout(t);
  }, [outcome]);

  // Enter prüft (auf Optionen/Kacheln oder ohne Fokus); Textfelder behandeln Enter selbst
  const checkRef = useRef(check);
  checkRef.current = check;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented || finalRef.current) return;
      const t = e.target as HTMLElement | null;
      const neutral = !t || t === document.body || t.id === 'main' || t === rootRef.current || t.hasAttribute?.('data-enter-check');
      if (!neutral || (t && t !== document.body && t.id !== 'main' && !rootRef.current?.contains(t))) return;
      if (answerRef.current === null || answerRef.current === undefined) return;
      e.preventDefault();
      checkRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  const onFocus = (e: FocusEvent<HTMLElement>) => {
    if (isTextInput(e.target)) {
      fieldRef.current = e.target;
      if (!finalRef.current) setTyping(true);
    }
  };
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    const to = e.relatedTarget as HTMLElement | null;
    if (to && (isTextInput(to) || to.closest('[data-accent-bar]')) && rootRef.current?.contains(to)) return;
    if (isTextInput(e.target) || (e.target as HTMLElement).closest?.('[data-accent-bar]')) setTyping(false);
  };

  const locked = finalRef.current || !!outcome || submitted;
  const bodyProps = { env, locked, outcome: examMode ? null : outcome, setAnswer, submit: check } as unknown as BodyProps<ExerciseType>;
  const Icon = TYPE_ICON[exercise.type];
  const showAccents = typing && !locked && needsAccentBar(exercise);
  const selfChecking = SELF_CHECKING.includes(exercise.type) && !(examMode && exercise.type !== 'aiChat');
  const hasAnswer = answer !== null && answer !== undefined;
  const headingId = `ex-${exercise.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  return (
    <section ref={rootRef} className={s.view} aria-labelledby={headingId} onFocus={onFocus} onBlur={onBlur}>
      <header className={s.head}>
        <span className={s.kind}><Icon aria-hidden /> {TYPE_LABEL[exercise.type]}</span>
        <h2 id={headingId} className={s.instruction}>{instructionFor(exercise)}</h2>
      </header>

      <div className={s.body}>{renderBody(exercise, bodyProps)}</div>

      {outcome && !examMode && (
        <FeedbackPanel ref={panelRef} outcome={outcome} exercise={exercise} lang={env.lang} title={title} />
      )}

      <p className="sr-only" aria-live="polite" role="status">{live}</p>

      {(outcome || submitted || !selfChecking) && (
        <div className={cx(s.bar, outcome && (outcome.correct ? s.barOk : s.barBad))}>
          {showAccents && <AccentBar base={env.base} targetRef={fieldRef} />}
          <div className={s.barRow}>
            {outcome && !examMode ? (
              <>
                <p className={s.barStatus} aria-hidden>
                  {outcome.correct ? <CircleCheck /> : <CircleAlert />}
                  <span>{outcome.correct ? title : 'Nicht ganz'}</span>
                </p>
                <Button ref={continueRef} size="lg" onClick={next} iconRight={<ArrowRight aria-hidden />} className={s.barBtn}>
                  Weiter
                </Button>
              </>
            ) : submitted ? (
              <p className={s.barStatus}><CircleCheck aria-hidden /> <span>Abgegeben</span></p>
            ) : (
              <Button size="lg" block disabled={!hasAnswer} onClick={() => check()}>
                {examMode ? 'Abgeben' : 'Prüfen'}
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function renderBody(ex: ExerciseViewProps['exercise'], p: BodyProps<ExerciseType>) {
  const P = <T extends ExerciseType>() => ({ ...p, ex }) as unknown as BodyProps<T>;
  switch (ex.type) {
    case 'mc': return <McBody {...P<'mc'>()} />;
    case 'situation': return <SituationBody {...P<'situation'>()} />;
    case 'listening': return <ListeningBody {...P<'listening'>()} />;
    case 'minimalPair': return <MinimalPairBody {...P<'minimalPair'>()} />;
    case 'dialogue': return <DialogueBody {...P<'dialogue'>()} />;
    case 'cloze': return <ClozeBody {...P<'cloze'>()} />;
    case 'order': return <OrderBody {...P<'order'>()} />;
    case 'translate': return <TranslateBody {...P<'translate'>()} />;
    case 'dictation': return <DictationBody {...P<'dictation'>()} />;
    case 'fixError': return <FixErrorBody {...P<'fixError'>()} />;
    case 'conjugate': return <ConjugateBody {...P<'conjugate'>()} />;
    case 'freeText': return <FreeTextBody {...P<'freeText'>()} />;
    case 'speak': return <SpeakBody {...P<'speak'>()} />;
    case 'speakFree': return <SpeakFreeBody {...P<'speakFree'>()} />;
    case 'imageMatch': return <MatchBody {...P<'imageMatch'>()} />;
    case 'matchPairs': return <MatchBody {...P<'matchPairs'>()} />;
    case 'aiChat': return <AiChatBody {...P<'aiChat'>()} />;
  }
}

function AiChatBody({ ex, env, submit }: BodyProps<'aiChat'>) {
  // bleibt nach dem Gesprächsende sichtbar; weitere Antworten ignoriert der Runner
  return (
    <Suspense fallback={<div className={s.chatSkeleton} aria-busy="true" aria-label="Gespräch wird geladen"><Skeleton height={56} /><Skeleton height={56} width="70%" /><Skeleton height={48} /></div>}>
      <AiChatExercise exercise={ex} courseId={env.courseId} variant={env.variant} onAnswer={(a) => submit(a)} />
    </Suspense>
  );
}
