import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ChevronDown, Clock, Flag, ListChecks, Lock, RotateCcw, Sparkles, Swords, Target, Trophy, X,
} from 'lucide-react';
import { useCourseContent } from '../../content/registry';
import type { CourseContent, Exam, Exercise } from '../../content/types';
import type { CourseId, Variant } from '../../core/types';
import { SKILL_LABELS } from '../../engine/competence';
import { explainMistake } from '../../engine/grading';
import { XP, examXp } from '../../engine/xp';
import {
  Badge, Button, Card, Celebration, ConfirmDialog, EmptyState, ErrorState, IconButton, Page, ProgressBar, ProgressRing, RichText, Skeleton, StatTile,
} from '../../ui';
import { recordExam, type RecordExamResult } from '../../state/actions';
import { useUnlocks } from '../../state/progress';
import { ttsLangFor, useActiveCourse, useVariant } from '../../state/settings';
import type { SessionResult, SessionSummary } from '../exercises/contract';
import ExerciseView from '../exercises/ExerciseView';
import { useExerciseSession } from '../exercises/useExerciseSession';
import { cx, Section } from '../dashboard/Section';
import {
  EXAM_KIND_LABEL, examExercises, examRecommendations, exercisePromptText, formatDuration, resultMessage, sectionMap, softTimer,
} from './examLogic';
import s from './Exam.module.css';

type Phase = 'intro' | 'running' | 'result';

interface Outcome {
  summary: SessionSummary;
  record: RecordExamResult | null;
  error: string | null;
}

const courseOfExam = (id: string): CourseId | null => (id.startsWith('pt.') ? 'pt-BR' : id.startsWith('es.') ? 'es' : null);

export default function ExamPage() {
  const { examId = '' } = useParams();
  const active = useActiveCourse();
  const courseId = courseOfExam(examId) ?? active;
  const content = useCourseContent(courseId);
  const variant = useVariant(courseId);
  const unlock = useUnlocks(courseId, content.data);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('intro');
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  const exam = content.data?.exams.find((e) => e.id === examId) ?? null;
  const stageStatus = exam ? unlock?.stages.find((st) => st.stageId === exam.stageId) ?? null : null;
  const gate = stageStatus
    ? [...stageStatus.midterms, stageStatus.final, stageStatus.boss].find((g) => g?.examId === examId) ?? null
    : null;

  const save = useCallback(
    (summary: SessionSummary) => {
      if (!exam || !content.data) return;
      try {
        const record = recordExam({
          courseId, exam, scorePct: summary.scorePct, perSkill: summary.perSkill, durationSec: summary.durationSec, content: content.data,
        });
        setOutcome({ summary, record, error: null });
        if (record.unlockedStage) setCelebrate(true);
      } catch (err) {
        console.error('[exam] Speichern fehlgeschlagen', err);
        setOutcome({ summary, record: null, error: 'Dein Ergebnis konnte nicht gespeichert werden. Du kannst es erneut versuchen.' });
      }
    },
    [exam, content.data, courseId],
  );

  const onFinish = useCallback(
    (summary: SessionSummary) => {
      save(summary);
      setPhase('result');
      window.scrollTo({ top: 0 });
    },
    [save],
  );

  const start = () => {
    setOutcome(null);
    setAttempt((n) => n + 1);
    setPhase('running');
    window.scrollTo({ top: 0 });
  };

  if (content.error) {
    return (
      <Page title="Prüfung" back="/pruefungen">
        <ErrorState message={content.error} onRetry={content.retry} />
      </Page>
    );
  }
  if (content.loading || !content.data || !unlock) {
    return (
      <Page title="Prüfung" back="/pruefungen">
        <Skeleton height={220} radius={24} />
        <Skeleton height={20} lines={3} />
      </Page>
    );
  }
  if (!exam) {
    return (
      <Page title="Prüfung" back="/pruefungen">
        <EmptyState
          icon={<Flag />}
          title="Diese Prüfung gibt es nicht"
          description="Der Link ist veraltet oder gehört zu einem anderen Kurs. Alle Prüfungen findest du in der Übersicht."
          action={<Button to="/pruefungen">Zu den Prüfungen</Button>}
        />
      </Page>
    );
  }

  if (phase === 'running') {
    return (
      <ExamRunner
        key={attempt}
        exam={exam}
        courseId={courseId}
        variant={variant}
        onFinish={onFinish}
        onAbort={() => setPhase('intro')}
      />
    );
  }

  const unlockedStage = outcome?.record?.unlockedStage
    ? content.data.stages.find((st) => st.id === outcome.record?.unlockedStage) ?? null
    : null;

  return (
    <>
      {phase === 'result' && outcome ? (
        <ExamResult
          exam={exam}
          content={content.data}
          variant={variant}
          outcome={outcome}
          unlockedStageTitle={unlockedStage?.title ?? null}
          unlockedStageId={unlockedStage?.id ?? null}
          onRetry={start}
          onRetrySave={() => save(outcome.summary)}
        />
      ) : (
        <ExamIntro
          exam={exam}
          variant={variant}
          gate={gate}
          stageMissing={stageStatus?.state === 'locked' ? stageStatus : null}
          onStart={start}
        />
      )}
      <Celebration
        open={celebrate}
        onClose={() => setCelebrate(false)}
        variant="success"
        kicker="Neue Etappe"
        title="Freigeschaltet!"
        message={unlockedStage ? `„${unlockedStage.title}“ wartet auf dich. Dein Sprachniveau ist jetzt durch Prüfungen bestätigt.` : undefined}
        primaryLabel="Zur neuen Etappe"
        onPrimary={() => {
          setCelebrate(false);
          if (unlockedStage) navigate(`/lernpfad/${unlockedStage.id}`);
        }}
        secondaryLabel="Ergebnis ansehen"
        onSecondary={() => setCelebrate(false)}
      />
    </>
  );
}

// ───────────────────────── Intro ─────────────────────────

function ExamIntro({
  exam, variant, gate, stageMissing, onStart,
}: {
  exam: Exam;
  variant: Variant;
  gate: { unlocked: boolean; passed: boolean; bestPct: number | null; attempts: number; lockedReason?: string } | null;
  stageMissing: { missing: string[] } | null;
  onStart: () => void;
}) {
  const lang = ttsLangFor(variant);
  const exercises = examExercises(exam, variant);
  const isBoss = exam.kind === 'boss';
  const locked = !gate || !gate.unlocked;
  const minutes = exam.timeLimitSec ? Math.round(exam.timeLimitSec / 60) : null;

  return (
    <Page title={EXAM_KIND_LABEL[exam.kind]} back={`/lernpfad/${exam.stageId}`} gap="lg">
      {isBoss && exam.boss ? (
        <section className={s.boss} aria-labelledby="exam-title">
          <div className={s.bossGlow} aria-hidden="true" />
          <span className={s.bossFigure} aria-hidden="true">
            {exam.boss.emoji}
          </span>
          <p className={s.bossKicker}>Endgegner</p>
          <h2 id="exam-title" className={s.bossName}>
            {exam.boss.name}
          </h2>
          <RichText md={exam.boss.intro} targetLang={lang} className={s.bossStory} />
        </section>
      ) : (
        <Card padding="lg" className={s.introCard} as="section" aria-labelledby="exam-title">
          <span className={s.introIcon} aria-hidden="true">
            {exam.kind === 'final' ? '🎓' : '📝'}
          </span>
          <h2 id="exam-title" className={s.introTitle}>
            {exam.title}
          </h2>
          <RichText md={exam.description} targetLang={lang} className={s.introDesc} />
        </Card>
      )}

      {isBoss && <RichText md={exam.description} targetLang={lang} className={s.introDesc} />}

      <div className={s.tiles}>
        <StatTile label="Aufgaben" value={exercises.length} icon={<ListChecks />} tone="info" />
        <StatTile label="Bestehen ab" value={`${exam.passPct} %`} icon={<Target />} tone="accent" />
        <StatTile label="Richtzeit" value={minutes ? `${minutes} Min.` : 'keine'} icon={<Clock />} tone="neutral" hint={minutes ? 'kein Abbruch' : undefined} />
        <StatTile
          label="Bestwert"
          value={gate?.bestPct != null ? `${Math.round(gate.bestPct)} %` : '–'}
          icon={<Trophy />}
          tone="gold"
          hint={gate && gate.attempts > 0 ? `${gate.attempts} ${gate.attempts === 1 ? 'Versuch' : 'Versuche'}` : 'noch kein Versuch'}
        />
      </div>

      {locked ? (
        <Card tone="muted" padding="lg" className={s.lockedCard} as="section" aria-label="Noch gesperrt">
          <p className={s.lockedTitle}>
            <Lock aria-hidden="true" /> Noch gesperrt
          </p>
          <ul className={s.lockedList}>
            {gate?.lockedReason && <li>{gate.lockedReason}</li>}
            {stageMissing?.missing.map((m) => <li key={m}>{m}</li>)}
            {!gate && <li>Diese Prüfung ist in deinem Lernpfad noch nicht erreichbar.</li>}
          </ul>
          <Button to={`/lernpfad/${exam.stageId}`} variant="secondary">
            Zur Etappe
          </Button>
        </Card>
      ) : exercises.length === 0 ? (
        <EmptyState
          title="Noch keine Aufgaben für deine Variante"
          description="Diese Prüfung wird gerade für deine Sprachvariante vorbereitet."
          action={<Button to="/pruefungen" variant="secondary">Andere Prüfungen</Button>}
        />
      ) : (
        <>
          <Section title="Abschnitte">
            <ol className={s.sections}>
              {exam.sections.map((sec, i) => {
                const n = sec.exercises.filter((e) => !e.variant || e.variant === variant).length;
                if (!n) return null;
                return (
                  <li key={`${sec.title}-${i}`} className={s.sectionItem}>
                    <span className={s.sectionNo} aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className={s.sectionText}>
                      <span className={s.sectionTitle}>{sec.title}</span>
                      <span className={s.sectionMeta}>
                        {SKILL_LABELS[sec.skill]} · {n} {n === 1 ? 'Aufgabe' : 'Aufgaben'}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Card tone="muted" padding="md" as="aside" aria-label="So läuft die Prüfung">
            <ul className={s.rules}>
              <li>Lösungen und Erklärungen siehst du erst in der Auswertung – mit einer Erklärung zu jedem Fehler.</li>
              {minutes && <li>Die Richtzeit ist ein Orientierungswert. Läuft sie ab, machst du einfach in Ruhe fertig.</li>}
              <li>
                Bestehen bringt {examXp(exam.kind)} XP (einmalig). Für einen ernsthaften Versuch gibt es {XP.examEffort} XP Anerkennung (einmal pro Tag).
              </li>
              <li>Du kannst die Prüfung beliebig oft wiederholen – es zählt dein bester Versuch.</li>
            </ul>
          </Card>

          <div className={s.bottomBar}>
            <Button size="lg" block onClick={onStart} icon={isBoss ? <Swords /> : <Flag />}>
              {isBoss ? 'Herausforderung annehmen' : gate?.attempts ? 'Neuer Versuch' : 'Prüfung starten'}
            </Button>
          </div>
        </>
      )}
    </Page>
  );
}

// ───────────────────────── Durchführung ─────────────────────────

function ExamRunner({
  exam, courseId, variant, onFinish, onAbort,
}: {
  exam: Exam;
  courseId: CourseId;
  variant: Variant;
  onFinish: (summary: SessionSummary) => void;
  onAbort: () => void;
}) {
  const exercises = useMemo(() => exam.sections.flatMap((x) => x.exercises), [exam]);
  const context = exam.kind === 'boss' ? 'boss' : 'exam';
  const session = useExerciseSession({ courseId, variant, context, refId: exam.id, exercises, awardXp: false });
  const sections = useMemo(() => sectionMap(exam), [exam]);
  const [confirm, setConfirm] = useState(false);

  // weicher Timer
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, []);
  const timer = softTimer(elapsed, exam.timeLimitSec);
  const [announce, setAnnounce] = useState('');
  const announced = useRef(false);
  useEffect(() => {
    if (timer.overtime && !announced.current) {
      announced.current = true;
      setAnnounce('Die Richtzeit ist abgelaufen. Kein Problem – mach in Ruhe fertig.');
    }
  }, [timer.overtime]);

  // Ende → Auswertung (genau einmal)
  const finished = useRef(false);
  useEffect(() => {
    if (session.finished && session.summary && !finished.current) {
      finished.current = true;
      onFinish(session.summary);
    }
  }, [session.finished, session.summary, onFinish]);

  const cur = session.current;
  const sec = cur ? sections.get(cur.id) : undefined;
  const total = session.total;
  const pos = Math.min(session.index + 1, Math.max(1, total));
  const low = !timer.overtime && timer.remaining !== null && timer.remaining <= 60;

  return (
    <Page
      title={exam.title}
      largeTitle={false}
      leading={<IconButton label="Prüfung verlassen" icon={<X />} onClick={() => setConfirm(true)} />}
      gap="md"
    >
      <div className={s.runHead}>
        <div className={s.runMeta}>
          <span className={s.runSection}>
            {sec ? `Abschnitt ${sec.index + 1}/${exam.sections.length} · ${sec.title}` : EXAM_KIND_LABEL[exam.kind]}
          </span>
          <span
            className={cx(s.timer, low && s.timerLow, timer.overtime && s.timerOver)}
            role="timer"
            aria-label={timer.remaining === null ? `Bisherige Zeit ${timer.label}` : timer.overtime ? `Richtzeit überschritten um ${timer.label.slice(1)}` : `Richtzeit: noch ${timer.label}`}
          >
            <Clock aria-hidden="true" /> {timer.label}
          </span>
        </div>
        <ProgressBar value={total ? session.index / total : 0} label="Prüfungsfortschritt" valueText={`Aufgabe ${pos} von ${total}`} />
        {timer.overtime && <p className={s.overtime}>Richtzeit vorbei – kein Abbruch. Mach in Ruhe fertig.</p>}
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>

      {cur ? (
        <ExerciseView
          key={`${session.index}:${cur.id}`}
          exercise={cur}
          courseId={courseId}
          variant={variant}
          context={context}
          refId={exam.id}
          examMode
          onDone={session.submit}
        />
      ) : (
        <Skeleton height={240} radius={20} />
      )}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onAbort();
        }}
        title="Prüfung verlassen?"
        message="Dieser Versuch wird nicht gewertet. Du kannst die Prüfung jederzeit neu starten."
        confirmLabel="Verlassen"
        cancelLabel="Weitermachen"
        tone="danger"
      />
    </Page>
  );
}

// ───────────────────────── Auswertung ─────────────────────────

function ExamResult({
  exam, content, variant, outcome, unlockedStageTitle, unlockedStageId, onRetry, onRetrySave,
}: {
  exam: Exam;
  content: CourseContent;
  variant: Variant;
  outcome: Outcome;
  unlockedStageTitle: string | null;
  unlockedStageId: string | null;
  onRetry: () => void;
  onRetrySave: () => void;
}) {
  const { summary, record, error } = outcome;
  const lang = ttsLangFor(variant);
  const passed = record?.passed ?? summary.scorePct >= exam.passPct;
  const msg = resultMessage(passed, summary.scorePct, exam.passPct, exam.kind);
  const recs = useMemo(
    () => examRecommendations({ perSkill: summary.perSkill, passPct: exam.passPct, mistakes: summary.mistakes, grammar: content.grammar }),
    [summary, exam.passPct, content.grammar],
  );
  const skills = Object.entries(summary.perSkill).filter(([, v]) => typeof v === 'number') as [keyof typeof SKILL_LABELS, number][];

  return (
    <Page title="Auswertung" back={`/lernpfad/${exam.stageId}`} gap="lg">
      <p className="sr-only" aria-live="polite">
        {`${passed ? 'Bestanden' : 'Noch nicht bestanden'} mit ${summary.scorePct} Prozent.`}
      </p>

      {exam.kind === 'boss' && exam.boss ? (
        <section className={cx(s.boss, passed ? s.bossWin : s.bossLose)} aria-label={passed ? 'Sieg' : 'Noch nicht besiegt'}>
          <div className={s.bossGlow} aria-hidden="true" />
          <span className={cx(s.bossFigure, passed && s.bossBow)} aria-hidden="true">
            {exam.boss.emoji}
          </span>
          <p className={s.bossKicker}>{passed ? 'Sieg' : 'Noch nicht besiegt'}</p>
          <h2 className={s.bossName}>{exam.boss.name}</h2>
          <RichText md={passed ? exam.boss.victory : exam.boss.defeat} targetLang={lang} className={s.bossStory} />
        </section>
      ) : null}

      <Card padding="lg" className={cx(s.scoreCard, passed ? s.scorePass : s.scoreFail)} as="section" aria-label="Ergebnis">
        <ProgressRing value={summary.scorePct / 100} size={128} label="Prüfungsergebnis" valueText={`${summary.scorePct} Prozent`} tone={passed ? 'success' : 'gold'}>
          <span className={s.scoreInner}>
            <span className={s.scoreValue}>{summary.scorePct}</span>
            <span className={s.scoreUnit}>%</span>
          </span>
        </ProgressRing>
        <div className={s.scoreText}>
          <Badge tone={passed ? 'success' : 'warning'}>{passed ? 'Bestanden' : 'Noch nicht bestanden'}</Badge>
          <h2 className={s.scoreTitle}>{msg.title}</h2>
          <p className={s.scoreMsg}>{msg.text}</p>
          <p className={s.scoreMeta}>
            {summary.correct} von {summary.total} richtig · Bestehen ab {exam.passPct} % · {formatDuration(summary.durationSec)}
          </p>
          {record && record.xp > 0 && <p className={s.xp}>+{record.xp} XP</p>}
          {record?.firstPass && <p className={s.firstPass}>Erstmals bestanden – das bleibt dir.</p>}
        </div>
      </Card>

      {error && (
        <Card tone="muted" padding="md" className={s.saveError}>
          <p>
            <AlertTriangle aria-hidden="true" /> {error}
          </p>
          <Button variant="secondary" onClick={onRetrySave}>
            Erneut speichern
          </Button>
        </Card>
      )}

      {unlockedStageTitle && unlockedStageId && (
        <Card tone="gold" padding="lg" className={s.unlocked} as="section" aria-label="Neue Etappe freigeschaltet">
          <Sparkles aria-hidden="true" />
          <div>
            <p className={s.unlockedTitle}>Neue Etappe freigeschaltet</p>
            <p className={s.unlockedText}>„{unlockedStageTitle}“ ist jetzt offen.</p>
          </div>
          <Button to={`/lernpfad/${unlockedStageId}`}>Ansehen</Button>
        </Card>
      )}

      {skills.length > 0 && (
        <Section title="Ergebnis nach Kompetenz">
          <Card padding="lg">
            <ul className={s.skillList}>
              {skills.map(([sk, v]) => (
                <li key={sk}>
                  <div className={s.skillRow}>
                    <span>{SKILL_LABELS[sk]}</span>
                    <span className={cx(s.skillPct, v < exam.passPct && s.skillWeak)}>{Math.round(v)} %</span>
                  </div>
                  <ProgressBar value={v / 100} label={`${SKILL_LABELS[sk]}: ${Math.round(v)} Prozent`} size="sm" tone={v >= exam.passPct ? 'success' : 'gold'} />
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {summary.mistakes.length > 0 ? (
        <Section
          title={`Deine Fehler (${summary.mistakes.length})`}
          description="Fehler sind Lernchancen: Tippe eine Aufgabe an, um die Erklärung zu sehen."
        >
          <ol className={s.mistakes}>
            {summary.mistakes.map((m, i) => (
              <MistakeItem key={`${m.exercise.id}-${i}`} result={m} n={i + 1} lang={lang} />
            ))}
          </ol>
        </Section>
      ) : (
        <Card tone="success" padding="md" className={s.noMistakes}>
          <Trophy aria-hidden="true" /> Keine Fehler – makellos!
        </Card>
      )}

      {recs.length > 0 && (
        <Section title="Empfehlungen">
          <ul className={s.recs}>
            {recs.map((r) => (
              <li key={r.id}>
                <Card to={r.route} padding="md" className={s.rec}>
                  <span className={s.recTitle}>{r.title}</span>
                  <span className={s.recDesc}>{r.description}</span>
                </Card>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className={s.resultActions}>
        <Button size="lg" block icon={<RotateCcw />} onClick={onRetry} variant={passed ? 'secondary' : 'primary'}>
          Nochmal versuchen
        </Button>
        <Button size="lg" block to={`/lernpfad/${exam.stageId}`} variant={passed ? 'primary' : 'secondary'}>
          Zur Etappe
        </Button>
        <Button block variant="ghost" to="/pruefungen">
          Alle Prüfungen
        </Button>
      </div>
    </Page>
  );
}

function MistakeItem({ result, n, lang }: { result: SessionResult; n: number; lang: string }) {
  const ex: Exercise = result.exercise;
  const o = result.outcome;
  const e = o.explanation ?? explainMistake(ex, o.userAnswer, o.expected);
  const skill = ex.skills[0];
  return (
    <li className={s.mistake}>
      <details>
        <summary className={s.mSummary}>
          <span className={s.mNo} aria-hidden="true">
            {n}
          </span>
          <span className={s.mHead}>
            <RichText md={exercisePromptText(ex)} inline targetLang={lang} className={s.mPrompt} />
            {skill && <span className={s.mSkill}>{SKILL_LABELS[skill]}</span>}
          </span>
          <ChevronDown className={s.mChevron} aria-hidden="true" />
        </summary>
        <dl className={s.explain}>
          <div>
            <dt>Deine Antwort</dt>
            <dd className={s.wrong}>{o.userAnswer?.trim() ? o.userAnswer : '– (keine Antwort)'}</dd>
          </div>
          <div>
            <dt>Was war falsch?</dt>
            <dd>
              <RichText md={e.what} targetLang={lang} />
            </dd>
          </div>
          <div>
            <dt>Warum?</dt>
            <dd>
              <RichText md={e.why} targetLang={lang} />
            </dd>
          </div>
          <div>
            <dt>Die Regel</dt>
            <dd>
              <RichText md={e.rule} targetLang={lang} />
            </dd>
          </div>
          <div>
            <dt>Richtig ist</dt>
            <dd className={s.right}>
              <RichText md={e.correct} targetLang={lang} />
            </dd>
          </div>
          <div>
            <dt>So vermeidest du den Fehler</dt>
            <dd>
              <RichText md={e.avoid} targetLang={lang} />
            </dd>
          </div>
        </dl>
      </details>
    </li>
  );
}
