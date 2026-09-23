/**
 * Übungsdurchlauf (Grammatik-Stufen, Fehler-Training): Fortschritt, ExerciseView, Auswertung.
 * Zeigt nur die eigenen Ergebnisse der Sitzung – Level-Up/Abzeichen zeigt das RewardCenter global.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { CircleCheck, CircleX, Flame, RotateCcw, Sparkles, Timer, Trophy } from 'lucide-react';
import type { CourseId, ExerciseContext, Variant } from '../../core/types';
import type { Exercise } from '../../content/types';
import ExerciseView from '../exercises/ExerciseView';
import { useExerciseSession } from '../exercises/useExerciseSession';
import { Badge, Button, Card, EmptyState, ProgressBar, ProgressRing, RichText } from '../../ui';
import s from './SessionRunner.module.css';

export interface SessionRunnerProps {
  courseId: CourseId;
  variant: Variant;
  context: ExerciseContext;
  refId?: string;
  exercises: Exercise[];
  /** kurze Überschrift, z. B. „Stufe 2 · Anwenden“ */
  label: string;
  onExit: () => void;
  exitLabel?: string;
  /** optionale Hauptaktion nach dem Ende (z. B. „Weiter zu Stufe 3“) */
  next?: { label: string; onClick: () => void };
  retryWrong?: boolean;
  /** Zusatzinhalt in der Auswertung */
  summaryExtra?: ReactNode;
  /** wird einmal nach Abschluss mit dem Ergebnis aufgerufen */
  onFinished?: (scorePct: number) => void;
}

function praise(pct: number): { title: string; text: string } {
  if (pct >= 100) return { title: 'Makellos!', text: 'Alles richtig – diese Stufe sitzt.' };
  if (pct >= 80) return { title: 'Stark gemacht!', text: 'Du hast das Thema gut im Griff.' };
  if (pct >= 50) return { title: 'Guter Fortschritt', text: 'Schau dir die Fehler unten an – sie sind deine nächsten Lernschritte.' };
  return { title: 'Dranbleiben lohnt sich', text: 'Fehler gehören dazu. Lies die Erklärungen und versuch es gleich noch einmal.' };
}

export function SessionRunner({
  courseId, variant, context, refId, exercises, label, onExit, exitLabel = 'Zurück zum Thema', next, retryWrong, summaryExtra, onFinished,
}: SessionRunnerProps) {
  const session = useExerciseSession({ courseId, variant, context, refId, exercises, retryWrong });
  const reported = useRef(false);
  const headRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (session.finished && session.summary && !reported.current) {
      reported.current = true;
      onFinished?.(session.summary.scorePct);
      headRef.current?.focus();
    }
    if (!session.finished) reported.current = false;
  }, [session.finished, session.summary, onFinished]);

  if (session.total === 0) {
    return (
      <EmptyState
        title="Hier gibt es für deine Variante noch keine Übungen"
        description="Die Übungen dieser Auswahl gelten nur für eine andere Sprachvariante."
        action={<Button variant="secondary" onClick={onExit}>{exitLabel}</Button>}
      />
    );
  }

  if (session.finished && session.summary) {
    const sum = session.summary;
    const p = praise(sum.scorePct);
    return (
      <section className={s.summary} aria-labelledby="session-summary-title">
        <Card tone="hero" padding="lg" className={s.hero}>
          <ProgressRing value={sum.scorePct / 100} label="Ergebnis" valueText={`${sum.scorePct} Prozent`} size={96} tone="gold">
            <span className={s.ringValue}>{sum.scorePct}%</span>
          </ProgressRing>
          <div className={s.heroText}>
            <h2 id="session-summary-title" ref={headRef} tabIndex={-1} className={s.heroTitle}>{p.title}</h2>
            <p className={s.heroSub}>{p.text}</p>
          </div>
        </Card>
        <div className={s.stats}>
          <div className={s.stat}><CircleCheck size={18} aria-hidden="true" /><span><strong>{sum.correct}</strong> von {sum.total} richtig</span></div>
          {sum.xp > 0 && <div className={s.stat}><Sparkles size={18} aria-hidden="true" /><span><strong>+{sum.xp}</strong> XP</span></div>}
          {sum.bestCombo >= 3 && <div className={s.stat}><Flame size={18} aria-hidden="true" /><span>Beste Serie: <strong>{sum.bestCombo}</strong></span></div>}
          {sum.durationSec > 0 && <div className={s.stat}><Timer size={18} aria-hidden="true" /><span>{fmtDuration(sum.durationSec)}</span></div>}
        </div>

        {sum.mistakes.length > 0 ? (
          <div className={s.mistakes}>
            <h3 className={s.h3}>Daraus lernst du</h3>
            <ul className={s.mistakeList}>
              {sum.mistakes.map(({ exercise, outcome }, i) => (
                <li key={`${exercise.id}:${i}`} className={s.mistake}>
                  <p className={s.mRow}>
                    <CircleX size={16} aria-hidden="true" className={s.bad} />
                    <span className="sr-only">Deine Antwort: </span>
                    <del>{outcome.userAnswer || '(keine Antwort)'}</del>
                  </p>
                  <p className={s.mRow}>
                    <CircleCheck size={16} aria-hidden="true" className={s.good} />
                    <span className="sr-only">Richtig: </span>
                    <strong>{outcome.expected}</strong>
                  </p>
                  {(outcome.explanation?.rule || exercise.feedback?.rule) && (
                    <RichText md={outcome.explanation?.rule || exercise.feedback.rule} className={s.rule} />
                  )}
                  {outcome.explanation?.avoid && <RichText md={`**Tipp:** ${outcome.explanation.avoid}`} className={s.rule} />}
                </li>
              ))}
            </ul>
            <p className={s.archiveHint}>Diese Fehler landen im Fehlerarchiv – nach zwei richtigen Antworten gelten sie als behoben.</p>
          </div>
        ) : (
          <p className={s.clean}><Trophy size={18} aria-hidden="true" /> Keine Fehler in dieser Runde.</p>
        )}

        {summaryExtra}

        <div className={s.actions}>
          {next && <Button size="lg" block onClick={next.onClick}>{next.label}</Button>}
          <Button size="lg" block variant={next ? 'secondary' : 'primary'} icon={<RotateCcw size={18} />} onClick={session.restart}>
            Nochmal üben
          </Button>
          <Button block variant="ghost" onClick={onExit}>{exitLabel}</Button>
        </div>
      </section>
    );
  }

  const cur = session.current;
  return (
    <section className={s.run} aria-label={label}>
      <div className={s.head}>
        <div className={s.headRow}>
          <span className={s.label}>{label}</span>
          <span className={s.count}>
            {session.combo >= 3 && <Badge tone="gold" icon={<Flame size={12} />}>{session.combo}er-Serie</Badge>}
            <span aria-live="polite">Aufgabe {Math.min(session.index + 1, session.total)} von {session.total}</span>
          </span>
        </div>
        <ProgressBar value={session.total ? session.index / session.total : 0} label="Fortschritt der Übung" size="sm" />
      </div>
      {cur && (
        <div className={s.exercise} key={`${cur.id}:${session.index}`}>
          <ExerciseView
            exercise={cur}
            courseId={courseId}
            variant={variant}
            context={context}
            refId={refId}
            onDone={session.submit}
          />
        </div>
      )}
    </section>
  );
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  return m > 0 ? `${m} min ${r.toString().padStart(2, '0')} s` : `${r} s`;
}
