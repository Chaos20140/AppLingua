/** Ergebnis einer Lektion: Punktzahl, Sterne, XP, Bestkombo, Zeit, Kompetenzen, Fehler (+ wiederholen), Vokabeln, nächste Schritte. */
import { useMemo, useState, type RefObject } from 'react';
import {
  ArrowRight, BookOpen, Clock, Flame, GraduationCap, Map as MapIcon, RotateCcw, Star, Target, Trophy, Zap,
} from 'lucide-react';
import { Badge, Button, Card, ErrorState, ProgressBar, ProgressRing, Skeleton } from '../../ui';
import type { CourseId, Skill, Variant } from '../../core/types';
import type { CourseContent, Lesson } from '../../content/types';
import { exercisePrompt } from '../../engine/grading';
import { orderedStageLessons } from '../../engine/unlock';
import type { CompleteLessonResult } from '../../state/actions';
import { useLessonStatus } from '../../state/progress';
import { ttsLangFor } from '../../state/settings';
import type { SessionSummary } from '../exercises/contract';
import ExerciseView from '../exercises/ExerciseView';
import { SpeakButton } from '../exercises/ListenControls';
import { useExerciseSession } from '../exercises/useExerciseSession';
import { formatDuration } from './phases';
import s from './lesson.module.css';

/** Md grob in Klartext (Lücken als „…“, Hervorhebungen entfernt). */
const plain = (md: string) => md
  .replace(/_{3,}/g, '…')
  .replace(/\*\*|`/g, '')
  .replace(/(^|[\s(„"])_([^_]+)_(?=$|[\s.,;:!?)“"])/g, '$1$2');

const VOCAB_PREVIEW = 6;

const SKILL_LABEL: Record<Skill, string> = {
  grammar: 'Grammatik', pronunciation: 'Aussprache', listening: 'Hören', speaking: 'Sprechen',
  reading: 'Lesen', writing: 'Schreiben', vocabulary: 'Wortschatz',
};

function headline(pct: number) {
  if (pct >= 100) return { title: 'Fehlerfrei – perfekt!', sub: 'Jede Antwort saß. Genau so bleibt Gelerntes hängen.' };
  if (pct >= 80) return { title: 'Starke Leistung!', sub: 'Du hast die Lektion souverän gemeistert.' };
  if (pct >= 50) return { title: 'Gut gemacht!', sub: 'Die Basis steht. Mit den Fehlern unten wird es noch runder.' };
  return { title: 'Geschafft – dranbleiben lohnt sich!', sub: 'Schau dir die Erklärungen an und wiederhole die Fehler – beim zweiten Mal sitzt es.' };
}

interface Props {
  lesson: Lesson;
  content: CourseContent;
  courseId: CourseId;
  variant: Variant;
  vocab: Lesson['vocab'];
  summary: SessionSummary;
  completion: CompleteLessonResult | null;
  saveError: string | null;
  onRetrySave: () => void;
  onRestart: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

export function LessonResult({ lesson, content, courseId, variant, vocab, summary, completion, saveError, onRetrySave, onRestart, headingRef }: Props) {
  const [replay, setReplay] = useState(false);
  const [allVocab, setAllVocab] = useState(false);
  const status = useLessonStatus(courseId, content);
  const lang = ttsLangFor(variant);
  const scorePct = summary.total ? summary.scorePct : 100;
  const head = headline(scorePct);

  const next = useMemo(() => {
    const stage = content.stages.find((st) => st.id === lesson.stageId);
    if (!stage) return { lesson: null, examId: null as string | null };
    const ordered = orderedStageLessons(content, stage);
    const idx = ordered.findIndex((l) => l.id === lesson.id);
    const chapter = stage.chapters.find((c) => c.lessonIds.includes(lesson.id));
    const lastOfChapter = chapter ? chapter.lessonIds[chapter.lessonIds.length - 1] === lesson.id : false;
    return {
      lesson: idx >= 0 ? ordered[idx + 1] ?? null : null,
      examId: lastOfChapter && chapter?.examId && content.exams.some((e) => e.id === chapter.examId) ? chapter.examId : null,
    };
  }, [content, lesson]);

  if (replay) {
    return <MistakeReplay summary={summary} courseId={courseId} variant={variant} lessonId={lesson.id} onBack={() => setReplay(false)} />;
  }

  const stars = completion?.stars ?? 0;
  const skills = (Object.entries(summary.perSkill) as [Skill, number][]).sort((a, b) => b[1] - a[1]);
  const nextOpen = next.lesson && status[next.lesson.id] !== 'locked';

  return (
    <div className={s.result}>
      <section className={s.resultHero} aria-labelledby="lesson-result-title">
        <div className={s.stars} aria-label={completion ? `${stars} von 3 Sternen` : 'Sterne werden berechnet'}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? s.starOn : s.starOff} style={{ animationDelay: `${n * 140}ms` }} aria-hidden>
              <Star />
            </span>
          ))}
        </div>
        <h2 id="lesson-result-title" ref={headingRef} tabIndex={-1} className={s.resultTitle}>{head.title}</h2>
        <p className={s.resultSub}>{head.sub}</p>
        <ProgressRing value={scorePct / 100} label="Punktzahl" valueText={`${scorePct} Prozent`} size={132} stroke={11} tone={scorePct >= 80 ? 'success' : 'accent'}>
          <span className={s.ringValue}>{scorePct}<small>%</small></span>
        </ProgressRing>
        {completion?.firstTime && <Badge tone="gold" solid icon={<Trophy aria-hidden />}>Neu abgeschlossen</Badge>}
      </section>

      {saveError && <ErrorState title="Speichern fehlgeschlagen" message={saveError} onRetry={onRetrySave} />}

      <div className={s.statGrid}>
        <div className={s.stat}>
          <Zap aria-hidden className={s.statIconGold} />
          <span className={s.statValue}>{completion ? `+${summary.xp + completion.xp}` : <Skeleton width={48} height={24} />}</span>
          <span className={s.statLabel}>XP{completion && completion.xp > 0 ? ` (inkl. ${completion.xp} Lektion)` : ''}</span>
        </div>
        <div className={s.stat}>
          <Target aria-hidden className={s.statIconAccent} />
          <span className={s.statValue}>{summary.correct}/{summary.total}</span>
          <span className={s.statLabel}>auf Anhieb richtig</span>
        </div>
        <div className={s.stat}>
          <Flame aria-hidden className={s.statIconAccent} />
          <span className={s.statValue}>{summary.bestCombo}</span>
          <span className={s.statLabel}>Bestkombo</span>
        </div>
        <div className={s.stat}>
          <Clock aria-hidden className={s.statIconInfo} />
          <span className={s.statValue}>{formatDuration(summary.durationSec)}</span>
          <span className={s.statLabel}>Dauer</span>
        </div>
      </div>

      {skills.length > 0 && (
        <Card>
          <h3 className={s.sectionTitle}>Deine Kompetenzen in dieser Lektion</h3>
          <div className={s.skillList}>
            {skills.map(([sk, pct]) => (
              <ProgressBar key={sk} value={pct / 100} label={SKILL_LABEL[sk]} showLabel valueText={`${pct} %`} size="sm" tone={pct >= 80 ? 'success' : 'accent'} />
            ))}
          </div>
        </Card>
      )}

      {summary.mistakes.length > 0 && (
        <Card>
          <div className={s.sectionHeadRow}>
            <h3 className={s.sectionTitle}>Deine Fehler – deine Lernchancen</h3>
            <Badge tone="danger">{summary.mistakes.length}</Badge>
          </div>
          <ul className={s.mistakes}>
            {summary.mistakes.map(({ exercise, outcome }) => (
              <li key={exercise.id}>
                <details className={s.mistake}>
                  <summary>
                    <span className={s.mistakePrompt}>{plain(exercisePrompt(exercise))}</span>
                    <span className={s.mistakeCorrect} lang={lang}>{outcome.expected}</span>
                  </summary>
                  <dl className={s.mistakeBody}>
                    {outcome.userAnswer && (<><dt>Deine Antwort</dt><dd className={s.mistakeWrong}>{outcome.userAnswer}</dd></>)}
                    <dt>Richtig</dt>
                    <dd className={s.mistakeRight}><span lang={lang}>{outcome.expected}</span></dd>
                    {outcome.explanation && (
                      <>
                        <dt>Regel</dt><dd>{plain(outcome.explanation.rule)}</dd>
                        <dt>So vermeidest du den Fehler</dt><dd>{plain(outcome.explanation.avoid)}</dd>
                      </>
                    )}
                  </dl>
                </details>
              </li>
            ))}
          </ul>
          <Button variant="secondary" block icon={<RotateCcw aria-hidden />} onClick={() => setReplay(true)}>
            Fehler wiederholen
          </Button>
        </Card>
      )}

      {vocab.length > 0 && (
        <Card>
          <div className={s.sectionHeadRow}>
            <h3 className={s.sectionTitle}>Neue Vokabeln</h3>
            {completion && (
              <Badge tone="success">{completion.newCards > 0 ? `${completion.newCards} neu im Trainer` : 'im Trainer'}</Badge>
            )}
          </div>
          <ul className={s.vocabList}>
            {(allVocab ? vocab : vocab.slice(0, VOCAB_PREVIEW)).map((v) => (
              <li key={v.id}>
                {v.emoji && <span className={s.vocabEmoji} aria-hidden>{v.emoji}</span>}
                <span className={s.vocabText}>
                  <span className={s.vocabTarget} lang={lang}>{v.target}</span>
                  <span className={s.vocabGerman}>{v.german}</span>
                </span>
                <SpeakButton text={v.target} lang={lang} />
              </li>
            ))}
          </ul>
          {vocab.length > VOCAB_PREVIEW && (
            <button type="button" className={s.textBtn} onClick={() => setAllVocab((v) => !v)} aria-expanded={allVocab}>
              {allVocab ? 'Weniger anzeigen' : `Alle ${vocab.length} Wörter anzeigen`}
            </button>
          )}
          <p className={s.note}>Die Wörter wiederholst du im Vokabeltrainer – genau dann, wenn du sie sonst vergessen würdest.</p>
          <Button variant="ghost" to="/vokabeln" icon={<BookOpen aria-hidden />}>Zum Vokabeltrainer</Button>
        </Card>
      )}

      <div className={s.nextActions}>
        {next.examId && (
          <Button size="lg" block variant={next.lesson ? 'secondary' : 'primary'} to={`/pruefung/${next.examId}`} icon={<GraduationCap aria-hidden />}>
            Kapiteltest starten
          </Button>
        )}
        {next.lesson && nextOpen && (
          <Button size="lg" block to={`/lektion/${next.lesson.id}`} replace iconRight={<ArrowRight aria-hidden />}>
            Weiter: {next.lesson.title}
          </Button>
        )}
        <Button size="lg" block variant="secondary" to={`/lernpfad/${lesson.stageId}`} icon={<MapIcon aria-hidden />}>
          Zum Lernpfad
        </Button>
        <Button variant="ghost" block onClick={onRestart} icon={<RotateCcw aria-hidden />}>Lektion wiederholen</Button>
      </div>
    </div>
  );
}

// ───────────────────────── Fehler wiederholen ─────────────────────────

function MistakeReplay({ summary, courseId, variant, lessonId, onBack }: {
  summary: SessionSummary; courseId: CourseId; variant: Variant; lessonId: string; onBack: () => void;
}) {
  const exercises = useMemo(() => summary.mistakes.map((m) => m.exercise), [summary]);
  const session = useExerciseSession({ courseId, variant, context: 'lesson', refId: lessonId, exercises });

  if (session.finished && session.summary) {
    const r = session.summary;
    const all = r.correct === r.total;
    return (
      <div className={s.phaseDone}>
        <span className={s.phaseDoneIcon} aria-hidden>{all ? <Trophy /> : <RotateCcw />}</span>
        <h2 className={s.phaseTitle} tabIndex={-1}>{all ? 'Alle Fehler ausgebügelt!' : `${r.correct} von ${r.total} sitzen jetzt`}</h2>
        <p className={s.phaseSub}>
          {all
            ? 'Stark – aus Fehlern gelernt. Im Fehlerarchiv gelten sie nach zwei richtigen Antworten als erledigt.'
            : 'Die übrigen landen im Fehlerarchiv und kommen in der Wiederholung wieder.'}
          {r.xp > 0 ? ` +${r.xp} XP.` : ''}
        </p>
        <div className={s.phaseBar}>
          <Button size="lg" block onClick={onBack}>Zurück zum Ergebnis</Button>
        </div>
      </div>
    );
  }
  if (!session.current) return null;
  return (
    <div className={s.replay}>
      <div className={s.replayHead}>
        <span className={s.kicker}>Fehler wiederholen · {Math.min(session.index + 1, session.total)} von {session.total}</span>
        <button type="button" className={s.textBtn} onClick={onBack}>Abbrechen</button>
      </div>
      <ExerciseView
        key={`${session.current.id}:${session.index}`}
        exercise={session.current}
        courseId={courseId}
        variant={variant}
        context="lesson"
        refId={lessonId}
        onDone={session.submit}
      />
    </div>
  );
}
