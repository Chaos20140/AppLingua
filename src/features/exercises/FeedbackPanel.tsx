/**
 * Rückmeldung nach dem Prüfen. Richtig: abwechslungsreiches Lob + Hinweise (Akzent/Tippfehler).
 * Falsch: 5-teilige Erklärung – Was war falsch · Warum · Regel · Richtige Lösung (mit Anhören) · So vermeidest du den Fehler.
 */
import type { Ref } from 'react';
import { BookOpen, CircleAlert, CircleCheck, CircleHelp, Lightbulb, Sparkles } from 'lucide-react';
import { RichText } from '../../ui';
import type { Exercise } from '../../content/types';
import { explainMistake, type ExerciseOutcome } from '../../engine/grading';
import { SpeakButton, useSpeakFn } from './ListenControls';
import { cx } from './cx';
import { solutionIsTarget } from './shared';
import s from './ex.module.css';

/** Typen, deren „Was war falsch“ die Antwort bereits vollständig beschreibt */
const NO_ECHO: Exercise['type'][] = ['imageMatch', 'matchPairs', 'aiChat'];

export interface FeedbackPanelProps {
  outcome: ExerciseOutcome;
  exercise: Exercise;
  lang: string;
  /** Überschrift (Lob bzw. Ermutigung) */
  title: string;
  ref?: Ref<HTMLDivElement>;
}

export function FeedbackPanel({ outcome, exercise, lang, title, ref }: FeedbackPanelProps) {
  const speakFn = useSpeakFn(lang);
  const target = solutionIsTarget(exercise);

  if (outcome.correct) {
    const note = outcome.hint
      ?? (outcome.accentOnly ? `Achte auf die Akzente: richtig geschrieben ist \`${outcome.expected}\`.` : undefined)
      ?? (outcome.typo ? `Kleiner Tippfehler – richtig geschrieben: \`${outcome.expected}\`.` : undefined);
    // Ohne Hinweis genügt die Statusleiste („Richtig!“) – keine doppelte Meldung
    if (!note) return null;
    return (
      <div ref={ref} className={cx(s.feedback, s.feedbackOk)} tabIndex={-1}>
        <p className={s.feedbackTitle}>
          <span className={s.feedbackIcon} aria-hidden><CircleCheck /></span>
          {outcome.accentOnly || outcome.typo ? 'Richtig – mit kleinem Hinweis' : title}
        </p>
        <div className={s.feedbackNote}>
          <Sparkles aria-hidden />
          <RichText md={note} onSpeak={speakFn} targetLang={lang} />
        </div>
      </div>
    );
  }

  const exp = outcome.explanation ?? explainMistake(exercise, outcome.userAnswer, outcome.expected);
  const partial = outcome.score > 0 && outcome.score < 1 ? Math.round(outcome.score * 100) : null;
  return (
    <div ref={ref} className={cx(s.feedback, s.feedbackBad)} tabIndex={-1}>
      <p className={s.feedbackTitle}>
        <span className={s.feedbackIcon} aria-hidden><CircleAlert /></span>
        {title}
      </p>
      {partial !== null && <p className={s.partial}>Teilweise richtig – {partial} % der Punkte.</p>}
      <ol className={s.explain}>
        <li>
          <span className={s.explainHead}><CircleAlert aria-hidden /> Was war falsch</span>
          <RichText md={exp.what} onSpeak={speakFn} targetLang={lang} />
          {outcome.userAnswer && !NO_ECHO.includes(exercise.type) && !exp.what.includes(outcome.userAnswer) && (
            <p className={s.yourAnswer}>Deine Antwort: <span lang={target ? lang : undefined}>{outcome.userAnswer}</span></p>
          )}
        </li>
        <li>
          <span className={s.explainHead}><CircleHelp aria-hidden /> Warum</span>
          <RichText md={exp.why} onSpeak={speakFn} targetLang={lang} />
        </li>
        <li>
          <span className={s.explainHead}><BookOpen aria-hidden /> Regel</span>
          <RichText md={exp.rule} onSpeak={speakFn} targetLang={lang} />
        </li>
        <li className={s.explainSolution}>
          <span className={s.explainHead}><CircleCheck aria-hidden /> Richtige Lösung</span>
          <p className={s.solutionLine}>
            <span className={s.solutionText} lang={target ? lang : undefined}>{exp.correct || outcome.expected}</span>
            {target && <SpeakButton text={exp.correct || outcome.expected} lang={lang} label="Richtige Lösung anhören" />}
          </p>
        </li>
        <li>
          <span className={s.explainHead}><Lightbulb aria-hidden /> So vermeidest du den Fehler</span>
          <RichText md={exp.avoid} onSpeak={speakFn} targetLang={lang} />
        </li>
      </ol>
    </div>
  );
}
