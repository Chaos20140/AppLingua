/** Ablauf einer Lektion: 8 Phasen mit Stepper, Kombo-Anzeige, Aussprache, Ergebnis. */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Clock, Flame, Languages, ListChecks, Sparkles, X } from 'lucide-react';
import { BottomSheet, Button, Card, ConfirmDialog, IconButton, Page, RichText, Skeleton, useToast } from '../../ui';
import type { CourseId, PronAttempt, Variant } from '../../core/types';
import type { CourseContent, Lesson } from '../../content/types';
import type { ExerciseOutcome } from '../../engine/grading';
import { completeLesson, type CompleteLessonResult } from '../../state/actions';
import { useLessonProgress } from '../../state/progress';
import { ttsLangFor, updateCourseState } from '../../state/settings';
import { ExampleList, ExplainBlocks } from '../content/ExplainBlocks';
import ExerciseView from '../exercises/ExerciseView';
import { SpeakButton, useSpeakFn } from '../exercises/ListenControls';
import { useExerciseSession } from '../exercises/useExerciseSession';
import { LessonResult } from './LessonResult';
import { isExercisePhase, lastExercisePhase, PHASE_META, planLesson, type ExercisePhase } from './phases';
import s from './lesson.module.css';

const PronPractice = lazy(() => import('../pronunciation/PronPractice'));

interface Props {
  lesson: Lesson;
  content: CourseContent;
  courseId: CourseId;
  variant: Variant;
}

export function LessonFlow({ lesson, content, courseId, variant }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const plan = useMemo(() => planLesson(lesson, content, variant), [lesson, content, variant]);
  const session = useExerciseSession({ courseId, variant, context: 'lesson', refId: lesson.id, exercises: plan.exercises });
  const progress = useLessonProgress(courseId)[lesson.id];

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [pronAttempts, setPronAttempts] = useState(0);
  const [completion, setCompletion] = useState<CompleteLessonResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  /** richtig/falsch je Übung (Index wie in der Sitzung) – für die Zwischenbilanz je Phase */
  const [marks, setMarks] = useState<boolean[]>([]);
  const onExerciseDone = useCallback((o: ExerciseOutcome) => {
    setMarks((m) => [...m, o.correct]);
    session.submit(o);
  }, [session]);
  const completedRun = useRef(-1);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const phase = plan.phases[phaseIdx];
  const total = plan.phases.length;

  // Beim Start: aktuelle Lektion merken
  useEffect(() => {
    try {
      updateCourseState(courseId, { currentLessonId: lesson.id, lastActivityAt: new Date().toISOString() });
    } catch (err) {
      console.error(err);
    }
  }, [courseId, lesson.id]);

  const goNext = useCallback(() => setPhaseIdx((i) => Math.min(i + 1, plan.phases.length - 1)), [plan.phases.length]);

  // Phasenwechsel / neue Übung: nach oben, Fokus auf die Überschrift (Screenreader)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0 });
  }, [phaseIdx, session.index]);
  useEffect(() => {
    if (phaseIdx > 0) headingRef.current?.focus({ preventScroll: true });
  }, [phaseIdx]);

  // Letzte Übungsphase beendet → direkt zum Ergebnis
  const lastEx = lastExercisePhase(plan.phases);
  useEffect(() => {
    if (session.finished && phase === lastEx) goNext();
  }, [session.finished, phase, lastEx, goNext]);

  // Ergebnis speichern (einmal je Durchlauf)
  const save = useCallback(() => {
    const sum = session.summary;
    if (!sum) return;
    try {
      const res = completeLesson({
        courseId, lesson,
        scorePct: sum.total ? sum.scorePct : 100,
        bestCombo: sum.bestCombo,
        durationSec: sum.durationSec,
      });
      setCompletion(res);
      setSaveError(null);
    } catch (err) {
      console.error(err);
      setSaveError('Dein Ergebnis konnte nicht gespeichert werden. Bitte versuche es noch einmal.');
    }
  }, [courseId, lesson, session.summary]);

  useEffect(() => {
    if (phase !== 'result' || completedRun.current === run || !session.summary) return;
    completedRun.current = run;
    save();
  }, [phase, run, session.summary, save]);

  const restart = () => {
    session.restart();
    setCompletion(null);
    setSaveError(null);
    setPronAttempts(0);
    setMarks([]);
    setRun((r) => r + 1);
    setPhaseIdx(0);
  };

  const leave = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(`/lernpfad/${lesson.stageId}`, { replace: true });
  };

  const exRange = isExercisePhase(phase) ? plan.ranges[phase] : null;
  const phaseFill = (i: number) => {
    if (i < phaseIdx) return 1;
    if (i > phaseIdx) return 0;
    if (phase === 'result') return 1;
    if (exRange) {
      const len = exRange[1] - exRange[0];
      return len ? Math.min(1, Math.max(0.06, (session.index - exRange[0]) / len)) : 1;
    }
    return 0.5;
  };

  const showCombo = !!exRange && session.combo >= 2;
  const speakFn = useSpeakFn(ttsLangFor(variant));

  return (
    <Page
      title={lesson.title}
      largeTitle={false}
      leading={
        <IconButton
          label={phase === 'result' ? 'Lektion schließen' : 'Lektion beenden'}
          icon={<X />}
          onClick={() => (phase === 'result' ? leave() : setConfirmClose(true))}
        />
      }
      actions={phaseIdx > 1 && phase !== 'result' && lesson.explanation.length > 0
        ? <IconButton label="Erklärung nachlesen" icon={<BookOpen />} onClick={() => setExplainOpen(true)} />
        : undefined}
    >
      <div className={s.flow}>
        <div className={s.progressHead}>
          <ol className={s.stepper} aria-label="Fortschritt der Lektion">
            {plan.phases.map((p, i) => (
              <li key={p} className={s.step}>
                <span className={s.stepFill} style={{ transform: `scaleX(${phaseFill(i)})` }} />
                <span className="sr-only">
                  {PHASE_META[p].label}: {i < phaseIdx ? 'erledigt' : i === phaseIdx ? 'aktuell' : 'offen'}
                </span>
              </li>
            ))}
          </ol>
          <div className={s.stepMeta}>
            <span className={s.stepLabel}>
              Schritt {phaseIdx + 1} von {total} · <strong>{PHASE_META[phase].label}</strong>
              {exRange && session.index < exRange[1] && (
                <span className={s.stepCount}> · Übung {session.index - exRange[0] + 1}/{exRange[1] - exRange[0]}</span>
              )}
            </span>
            {showCombo && (
              <span key={session.combo} className={s.combo} aria-live="polite">
                <Flame aria-hidden /> {session.combo}er-Kombo
              </span>
            )}
          </div>
        </div>

        <div key={`${run}:${phase}`} className={s.phase}>
          {phase === 'goal' && (
            <GoalPhase lesson={lesson} plan={plan} headingRef={headingRef} speakFn={speakFn} lang={ttsLangFor(variant)}
              best={progress ? { pct: progress.bestScorePct, stars: progress.stars } : null} onNext={goNext} />
          )}

          {phase === 'explain' && (
            <>
              <PhaseHeading refObj={headingRef} kicker="Verstehen" title="So funktioniert’s" />
              <ExplainBlocks blocks={lesson.explanation} variant={variant} />
              <PhaseBar><Button size="lg" block onClick={goNext} iconRight={<ArrowRight aria-hidden />}>Weiter zu den Beispielen</Button></PhaseBar>
            </>
          )}

          {phase === 'examples' && (
            <>
              <PhaseHeading refObj={headingRef} kicker="Sehen & hören" title="Beispiele" sub="Tippe auf einen Satz, um ihn anzuhören – auch langsam." />
              {plan.examples.length > 0 && <ExampleList examples={plan.examples} variant={variant} />}
              {plan.vocab.length > 0 && (
                <section className={s.section} aria-labelledby="lesson-vocab">
                  <h3 id="lesson-vocab" className={s.sectionTitle}><Languages aria-hidden /> Neue Wörter</h3>
                  <ul className={s.vocabGrid}>
                    {plan.vocab.map((v) => (
                      <li key={v.id} className={s.vocabItem}>
                        {v.emoji && <span className={s.vocabEmoji} aria-hidden>{v.emoji}</span>}
                        <span className={s.vocabText}>
                          <span className={s.vocabTarget} lang={ttsLangFor(variant)}>{v.target}</span>
                          <span className={s.vocabGerman}>{v.german}</span>
                        </span>
                        <SpeakButton text={v.target} lang={ttsLangFor(variant)} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <PhaseBar><Button size="lg" block onClick={goNext} iconRight={<ArrowRight aria-hidden />}>Jetzt üben</Button></PhaseBar>
            </>
          )}

          {isExercisePhase(phase) && (
            <ExercisePhaseView
              phase={phase}
              range={plan.ranges[phase]}
              session={session}
              marks={marks}
              onDone={onExerciseDone}
              courseId={courseId}
              variant={variant}
              lessonId={lesson.id}
              headingRef={headingRef}
              isLast={phase === lastEx}
              nextLabel={PHASE_META[plan.phases[phaseIdx + 1] ?? 'result'].label}
              onNext={goNext}
            />
          )}

          {phase === 'pron' && (
            <>
              <PhaseHeading
                refObj={headingRef} kicker="Sprechen" title="Aussprache"
                sub="Hör dir das Vorbild an und sprich nach. Gemessen wird die Verständlichkeit laut Spracherkennung – keine phonetische Analyse."
              />
              <div className={s.pronList}>
                <Suspense fallback={<><Skeleton height={180} radius={20} /><Skeleton height={180} radius={20} /></>}>
                  {plan.pronItems.map((item) => (
                    <PronPractice
                      key={item.id} item={item} courseId={courseId} variant={variant} context="lesson" refId={lesson.id} compact
                      onAttempt={(_a: PronAttempt) => setPronAttempts((n) => n + 1)}
                    />
                  ))}
                </Suspense>
              </div>
              {pronAttempts === 0 && <p className={s.barHint}>Probier mindestens ein Wort – oder übe später im Aussprache-Labor.</p>}
              <PhaseBar>
                <Button
                  variant="secondary" size="lg"
                  onClick={() => {
                    toast('Kein Problem – du findest die Übungen jederzeit im Aussprache-Labor.', { tone: 'info' });
                    goNext();
                  }}
                >
                  Später üben
                </Button>
                <Button size="lg" disabled={pronAttempts === 0} onClick={goNext} iconRight={<ArrowRight aria-hidden />}>
                  Weiter
                </Button>
              </PhaseBar>
            </>
          )}

          {phase === 'result' && (
            session.summary ? (
              <LessonResult
                lesson={lesson}
                content={content}
                courseId={courseId}
                variant={variant}
                vocab={plan.vocab}
                summary={session.summary}
                completion={completion}
                saveError={saveError}
                onRetrySave={save}
                onRestart={restart}
                headingRef={headingRef}
              />
            ) : (
              <Skeleton height={240} radius={20} />
            )
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={leave}
        title="Lektion beenden?"
        message="Deine bisherigen Antworten bleiben gespeichert, aber die Lektion gilt erst nach dem letzten Schritt als abgeschlossen."
        confirmLabel="Beenden"
        cancelLabel="Weiterlernen"
      />
      <BottomSheet open={explainOpen} onClose={() => setExplainOpen(false)} title="Erklärung">
        <ExplainBlocks blocks={lesson.explanation} variant={variant} />
      </BottomSheet>
    </Page>
  );
}

// ───────────────────────── Bausteine ─────────────────────────

function PhaseHeading({ refObj, kicker, title, sub }: { refObj: RefObject<HTMLHeadingElement | null>; kicker: string; title: string; sub?: string }) {
  return (
    <header className={s.phaseHead}>
      <span className={s.kicker}>{kicker}</span>
      <h2 ref={refObj} tabIndex={-1} className={s.phaseTitle}>{title}</h2>
      {sub && <p className={s.phaseSub}>{sub}</p>}
    </header>
  );
}

function PhaseBar({ children }: { children: ReactNode }) {
  return <div className={s.phaseBar}>{children}</div>;
}

function GoalPhase({ lesson, plan, headingRef, speakFn, lang, best, onNext }: {
  lesson: Lesson;
  plan: ReturnType<typeof planLesson>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  speakFn: (t: string) => void;
  lang: string;
  best: { pct: number; stars: number } | null;
  onNext: () => void;
}) {
  return (
    <>
      <div className={s.hero}>
        <span className={s.heroIcon} aria-hidden>{lesson.icon}</span>
        <div className={s.heroText}>
          <span className={s.kicker}>Lektion {lesson.order}</span>
          <h2 ref={headingRef} tabIndex={-1} className={s.heroTitle}>{lesson.title}</h2>
          {lesson.subtitle && <p className={s.heroSub}>{lesson.subtitle}</p>}
        </div>
        <ul className={s.heroMeta}>
          <li><Clock aria-hidden /> ca. {lesson.minutes} Min.</li>
          {plan.exercises.length > 0 && <li><ListChecks aria-hidden /> {plan.exercises.length} Übungen</li>}
          {plan.vocab.length > 0 && <li><Languages aria-hidden /> {plan.vocab.length} neue Wörter</li>}
        </ul>
        {best && (
          <p className={s.heroBest}>
            <Sparkles aria-hidden /> Bereits abgeschlossen · Bestwert {best.pct} % · {'★'.repeat(best.stars)}{'☆'.repeat(3 - best.stars)}
          </p>
        )}
      </div>
      <Card>
        <h3 className={s.sectionTitle}>Dein Lernziel</h3>
        <RichText md={lesson.goal} onSpeak={speakFn} targetLang={lang} className={s.goalText} />
      </Card>
      {lesson.canDo.length > 0 && (
        <Card tone="muted">
          <h3 className={s.sectionTitle}>Danach kannst du …</h3>
          <ul className={s.canDo}>
            {lesson.canDo.map((c, i) => (
              <li key={i}><span className={s.canDoIcon} aria-hidden><Check /></span>{c}</li>
            ))}
          </ul>
        </Card>
      )}
      <PhaseBar>
        <Button size="lg" block onClick={onNext} iconRight={<ArrowRight aria-hidden />}>
          {best ? 'Lektion wiederholen' : 'Los geht’s'}
        </Button>
      </PhaseBar>
    </>
  );
}

function ExercisePhaseView({ phase, range, session, marks, onDone, courseId, variant, lessonId, headingRef, isLast, nextLabel, onNext }: {
  phase: ExercisePhase;
  range: [number, number];
  session: ReturnType<typeof useExerciseSession>;
  marks: boolean[];
  onDone: (o: ExerciseOutcome) => void;
  courseId: CourseId;
  variant: Variant;
  lessonId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isLast: boolean;
  nextLabel: string;
  onNext: () => void;
}) {
  const [start, end] = range;
  const inPhase = session.index < end && session.current;
  if (inPhase && session.current) {
    return (
      <>
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">{PHASE_META[phase].label}</h2>
        <ExerciseView
          key={`${session.current.id}:${session.index}`}
          exercise={session.current}
          courseId={courseId}
          variant={variant}
          context="lesson"
          refId={lessonId}
          onDone={onDone}
        />
      </>
    );
  }
  if (isLast) return <Skeleton height={200} radius={20} />; // Übergang zum Ergebnis
  const phaseMarks = marks.slice(start, end);
  const correct = phaseMarks.length === end - start ? phaseMarks.filter(Boolean).length : null;
  return (
    <div className={s.phaseDone}>
      <span className={s.phaseDoneIcon} aria-hidden><Check /></span>
      <h2 ref={headingRef} tabIndex={-1} className={s.phaseTitle}>{PHASE_META[phase].label} geschafft!</h2>
      <p className={s.phaseSub}>
        {correct !== null ? `${correct} von ${end - start} auf Anhieb richtig. ` : ''}
        {phase === 'guided' ? 'Die Grundlagen sitzen – jetzt geht es weiter.' : 'Stark durchgezogen – gleich hast du es.'}
      </p>
      <PhaseBar>
        <Button size="lg" block onClick={onNext} iconRight={<ArrowRight aria-hidden />}>Weiter: {nextLabel}</Button>
      </PhaseBar>
    </div>
  );
}
