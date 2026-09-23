import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CircleCheck, Layers, MessageCircle, Mic, Music, RotateCcw, Sparkles, Target, Timer, TriangleAlert, X,
} from 'lucide-react';
import type { CourseId, SrsCard } from '../../core/types';
import type { CourseContent, Exercise } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { exercisePrompt, type ExerciseOutcome } from '../../engine/grading';
import { cardId, type SrsGrade } from '../../engine/srs';
import { useList } from '../../data/store';
import { buildReviewSession, completeReviewSession, reviewCard, type ReviewSession } from '../../state/review';
import { useNextLesson } from '../../state/progress';
import { ttsLangFor, useActiveCourse, useVariant } from '../../state/settings';
import ExerciseView from '../exercises/ExerciseView';
import { useExerciseSession } from '../exercises/useExerciseSession';
import { Flashcard } from '../vocab/Flashcard';
import { cardStats, formatDueDate } from '../vocab/vocabUtils';
import { Badge, Button, Card, ConfirmDialog, ErrorState, IconButton, ListRow, Page, ProgressBar, ProgressRing, Skeleton } from '../../ui';
import s from './ReviewPage.module.css';

type Step = { kind: 'card'; card: SrsCard } | { kind: 'exercise'; index: number };

/** Karten und Übungen abwechselnd mischen (Interleaving): nach je 3 Karten eine Übung. */
function interleave(cards: readonly SrsCard[], exerciseCount: number): Step[] {
  const steps: Step[] = [];
  let e = 0;
  cards.forEach((card, i) => {
    steps.push({ kind: 'card', card });
    if ((i + 1) % 3 === 0 && e < exerciseCount) steps.push({ kind: 'exercise', index: e++ });
  });
  while (e < exerciseCount) steps.push({ kind: 'exercise', index: e++ });
  return steps;
}

export default function ReviewPage() {
  const courseId = useActiveCourse();
  const content = useCourseContent(courseId);
  const [params] = useSearchParams();
  const quick = params.get('schnell') === '1';
  const gentle = params.get('sanft') === '1';
  const title = quick ? '5-Minuten-Runde' : 'Wiederholung';
  const [round, setRound] = useState(0);

  if (content.loading) {
    return (
      <Page title={title} back>
        <div className={s.skeleton} aria-busy="true" aria-label="Wiederholung wird vorbereitet">
          <Skeleton height={148} radius={24} />
          <Skeleton lines={3} />
          <Skeleton height={56} radius={16} />
        </div>
      </Page>
    );
  }
  if (content.error || !content.data) {
    return (
      <Page title={title} back>
        <ErrorState message={content.error ?? 'Inhalte konnten nicht geladen werden.'} onRetry={content.retry} />
      </Page>
    );
  }
  return (
    <Review
      key={`${courseId}:${quick}:${gentle}:${round}`}
      courseId={courseId}
      content={content.data}
      quick={quick}
      gentle={gentle}
      title={title}
      onRestart={() => { setRound((r) => r + 1); window.scrollTo({ top: 0 }); }}
    />
  );
}

interface ReviewProps { courseId: CourseId; content: CourseContent; quick: boolean; gentle: boolean; title: string; onRestart: () => void }

function Review({ courseId, content, quick, gentle, title, onRestart }: ReviewProps) {
  const navigate = useNavigate();
  const variant = useVariant(courseId);
  const lang = ttsLangFor(variant);
  // einmal je Runde zusammenstellen (Schnappschuss; neue Runde = neuer Schlüssel)
  const [session] = useState<ReviewSession & { sessionId: string }>(
    () => buildReviewSession(courseId, content, quick ? { maxCards: 8, maxExercises: 3, gentle } : { gentle }),
  );

  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [exitOpen, setExitOpen] = useState(false);

  const ex = useExerciseSession({ courseId, variant, context: 'review', exercises: session.exercises, refId: session.sessionId });
  const steps = useMemo(() => interleave(session.cards, ex.total), [session.cards, ex.total]);

  const [stepIndex, setStepIndex] = useState(0);
  const [cardResults, setCardResults] = useState<{ card: SrsCard; grade: SrsGrade }[]>([]);
  const [exResults, setExResults] = useState<{ exercise: Exercise; outcome: ExerciseOutcome; label?: string }[]>([]);
  const [reward, setReward] = useState<{ xp: number; bonus: number } | null>(null);
  const completed = useRef(false);

  const labelFor = useMemo(() => new Map(session.items.map((i) => [i.exercise.id, i.label])), [session.items]);

  const finish = useCallback((cardsDone: typeof cardResults, exDone: typeof exResults) => {
    setPhase('done');
    window.scrollTo({ top: 0 });
    if (completed.current) return;
    const total = cardsDone.length + exDone.length;
    if (!total) return;
    completed.current = true;
    const correct = cardsDone.filter((c) => c.grade >= 1).length + exDone.filter((e) => e.outcome.correct).length;
    const res = completeReviewSession({ courseId, sessionId: session.sessionId, correct, total });
    setReward({ xp: res.xp, bonus: res.bonus });
  }, [courseId, session.sessionId]);

  const advance = (nextCards: typeof cardResults, nextEx: typeof exResults) => {
    const next = stepIndex + 1;
    if (next >= steps.length) finish(nextCards, nextEx);
    else setStepIndex(next);
  };

  const onGrade = (card: SrsCard, grade: SrsGrade) => {
    reviewCard(cardId(card.courseId, card.itemId), grade);
    const next = [...cardResults, { card, grade }];
    setCardResults(next);
    advance(next, exResults);
  };

  const onExerciseDone = (outcome: ExerciseOutcome) => {
    const current = ex.current;
    ex.submit(outcome);
    const next = current ? [...exResults, { exercise: current, outcome, label: labelFor.get(current.id) }] : exResults;
    setExResults(next);
    advance(cardResults, next);
  };

  // Schutz: falls die Übungssitzung früher endet (z. B. gefilterte Varianten), Übungsschritte überspringen
  const step = steps[stepIndex];
  useEffect(() => {
    if (phase === 'run' && step?.kind === 'exercise' && !ex.current) advance(cardResults, exResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, step, ex.current]);

  const leave = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1); else navigate('/dashboard');
  };

  if (phase === 'intro' && session.empty) return <AllDone courseId={courseId} content={content} title={title} />;

  if (phase === 'intro') {
    const minutes = Math.max(1, Math.round(session.cards.length * 0.25 + session.exercises.length * 0.75));
    const reasons = [
      { n: session.counts.cards, icon: <Layers size={18} />, label: session.counts.cards === 1 ? 'fällige Karte' : 'fällige Karten' },
      { n: session.counts.errors, icon: <TriangleAlert size={18} />, label: session.counts.errors === 1 ? 'Aufgabe aus deinem Fehlerarchiv' : 'Aufgaben aus deinem Fehlerarchiv' },
      { n: session.counts.weakTopics, icon: <Target size={18} />, label: session.counts.weakTopics === 1 ? 'Übung zu einem schwächeren Thema' : 'Übungen zu schwächeren Themen' },
      { n: session.counts.pronunciation, icon: <Mic size={18} />, label: session.counts.pronunciation === 1 ? 'Ausspracheübung' : 'Ausspracheübungen' },
    ].filter((r) => r.n > 0);
    return (
      <Page title={title} back subtitle={quick ? 'Kurz, knackig, wirksam – ideal für zwischendurch.' : 'Gemischt aus Karten und Übungen – so bleibt Gelerntes hängen.'}>
        <Card tone="hero" className={s.introCard}>
          <div className={s.introTop}>
            <span className={s.introIcon} aria-hidden="true">{quick ? <Timer size={26} /> : <RotateCcw size={26} />}</span>
            <div>
              <p className={s.introValue}>{steps.length || session.cards.length + session.exercises.length} Aufgaben</p>
              <p className={s.introSub}>ca. {minutes} {minutes === 1 ? 'Minute' : 'Minuten'}</p>
            </div>
          </div>
          <Button size="lg" variant="secondary" block iconRight={<ArrowRight size={18} />} onClick={() => { setPhase('run'); window.scrollTo({ top: 0 }); }}>
            Los geht’s
          </Button>
        </Card>
        <section aria-labelledby="review-contents" className={s.section}>
          <h2 id="review-contents" className={s.h2}>Das erwartet dich</h2>
          <Card padding="none">
            {reasons.map((r) => (
              <ListRow key={r.label} leading={r.icon} title={`${r.n} ${r.label}`} />
            ))}
          </Card>
          {gentle && <p className={s.hint}>Sanfter Wiedereinstieg: etwas weniger Aufgaben als sonst.</p>}
        </section>
      </Page>
    );
  }

  if (phase === 'done') {
    const total = cardResults.length + exResults.length;
    const correct = cardResults.filter((c) => c.grade >= 1).length + exResults.filter((e) => e.outcome.correct).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const mistakes = exResults.filter((e) => !e.outcome.correct);
    const again = cardResults.filter((c) => c.grade === 0);
    const xp = (reward?.xp ?? 0) + ex.xp;
    return (
      <Page title={title} back="/dashboard">
        <div className={s.doneHead}>
          <ProgressRing value={total ? correct / total : 0} label="Richtig" size={120} tone={pct >= 90 ? 'success' : 'accent'}>
            <span className={s.ringValue}>{pct}&nbsp;%</span>
          </ProgressRing>
          <h2 className={s.doneTitle}>{pct >= 90 ? 'Meisterhaft!' : pct >= 60 ? 'Runde geschafft!' : 'Gut, dass du drangeblieben bist!'}</h2>
          <p className={s.doneText}>{correct} von {total} richtig · {cardResults.length} Karten · {exResults.length} Übungen</p>
          {xp > 0 && (
            <Badge tone="gold" solid icon={<Sparkles size={14} />}>
              +{xp} XP{reward && reward.bonus > 0 ? ' inkl. Wiederholungsbonus' : ''}
            </Badge>
          )}
          {reward && reward.bonus === 0 && total >= 5 && pct < 90 && (
            <p className={s.hint}>Ab 90 % richtig gibt es einen Wiederholungsbonus – beim nächsten Mal!</p>
          )}
        </div>

        {(mistakes.length > 0 || again.length > 0) && (
          <section aria-labelledby="review-mistakes" className={s.section}>
            <h2 id="review-mistakes" className={s.h2}>Daran bleibst du dran</h2>
            <p className={s.hint}>Fehler sind Lernchancen – diese Punkte kommen in den nächsten Runden wieder.</p>
            <Card padding="none">
              {again.map((c) => (
                <ListRow key={`c:${c.card.itemId}`} leading={<Layers size={18} />} title={<span lang={lang}>{c.card.front}</span>} subtitle={c.card.back} />
              ))}
              {mistakes.map((m) => (
                <ListRow
                  key={`e:${m.exercise.id}`}
                  leading={<TriangleAlert size={18} />}
                  title={<span lang={lang}>{m.outcome.expected || exercisePrompt(m.exercise)}</span>}
                  subtitle={m.outcome.explanation?.rule ?? m.label ?? 'Übung'}
                />
              ))}
            </Card>
          </section>
        )}

        <div className={s.doneActions}>
          <Button block size="lg" icon={<RotateCcw size={18} />} onClick={onRestart}>Weitere Runde</Button>
          <Button block variant="secondary" to="/dashboard">Zum Dashboard</Button>
        </div>
      </Page>
    );
  }

  // Lauf
  const progress = steps.length ? stepIndex / steps.length : 0;
  return (
    <Page
      title={title}
      largeTitle={false}
      leading={<IconButton label="Runde verlassen" icon={<X size={22} />} onClick={() => (cardResults.length + exResults.length ? setExitOpen(true) : leave())} />}
    >
      <div className={s.runHead}>
        <ProgressBar value={progress} label="Fortschritt der Wiederholung" size="md" />
        <span className={s.counter} aria-hidden="true">{Math.min(stepIndex + 1, steps.length)} / {steps.length}</span>
      </div>
      {step?.kind === 'card' && (
        <>
          <p className={s.stepLabel}><Layers size={14} aria-hidden="true" /> Karteikarte</p>
          <Flashcard key={`card:${step.card.itemId}:${stepIndex}`} card={step.card} lang={lang} onGrade={(g) => onGrade(step.card, g)} />
        </>
      )}
      {step?.kind === 'exercise' && ex.current && (
        <>
          {labelFor.get(ex.current.id) && <p className={s.stepLabel}><Target size={14} aria-hidden="true" /> {labelFor.get(ex.current.id)}</p>}
          <ExerciseView
            key={`ex:${ex.current.id}:${stepIndex}`}
            exercise={ex.current}
            courseId={courseId}
            variant={variant}
            context="review"
            refId={session.sessionId}
            onDone={onExerciseDone}
          />
        </>
      )}
      <ConfirmDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onConfirm={() => { setExitOpen(false); leave(); }}
        title="Runde verlassen?"
        message="Deine bisherigen Antworten sind gespeichert. Die Rundenbelohnung gibt es aber nur, wenn du bis zum Ende durchhältst."
        confirmLabel="Verlassen"
        cancelLabel="Weitermachen"
      />
    </Page>
  );
}

function AllDone({ courseId, content, title }: { courseId: CourseId; content: CourseContent; title: string }) {
  const next = useNextLesson(courseId, content);
  const list = useList('vocabCards');
  const stats = useMemo(() => cardStats(list.map((r) => r.data).filter((c) => c.courseId === courseId)), [list, courseId]);
  return (
    <Page title={title} back>
      <div className={s.allDone}>
        <span className={s.allDoneIcon} aria-hidden="true"><CircleCheck size={40} /></span>
        <h2 className={s.doneTitle}>Alles wiederholt</h2>
        <p className={s.doneText}>
          Gerade ist nichts fällig – dein Gedächtnis ist auf dem neuesten Stand.
          {stats.nextDueAt ? ` Nächste Karte: ${formatDueDate(stats.nextDueAt)}.` : ''}
        </p>
      </div>
      <section aria-labelledby="review-next" className={s.section}>
        <h2 id="review-next" className={s.h2}>Wie wär’s stattdessen mit …</h2>
        <Card padding="none">
          {next && (
            <ListRow
              leading={<span aria-hidden="true">{next.icon}</span>}
              title={`Nächste Lektion: ${next.title}`}
              subtitle={`ca. ${next.minutes} Minuten · Neues lernen`}
              to={`/lektion/${encodeURIComponent(next.id)}`}
            />
          )}
          <ListRow leading={<MessageCircle size={18} />} title="Sprachpartner" subtitle="Ein kurzes Gespräch üben" to="/partner" />
          <ListRow leading={<Mic size={18} />} title="Aussprache-Labor" subtitle="Klang und Betonung trainieren" to="/aussprache" />
          <ListRow leading={<Music size={18} />} title="Songs" subtitle="Mit Musik lernen" to="/songs" />
          <ListRow leading={<BookOpen size={18} />} title="Vokabeln frei üben" subtitle={stats.total ? `${stats.total} Karten in deiner Sammlung` : 'Eigene Karten anlegen'} to="/vokabeln" />
        </Card>
      </section>
    </Page>
  );
}
