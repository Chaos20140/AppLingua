import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, Compass, HelpCircle, History, Info, X } from 'lucide-react';
import type { Skill, StageId } from '../../core/types';
import type { PlacementQuestion } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import type { ExerciseOutcome } from '../../engine/grading';
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, Page, ProgressBar, RichText, Skeleton,
  StatTile, useToast,
} from '../../ui';
import { cx } from '../../ui/internal/helpers';
import { nowIso } from '../../data/store';
import { recordAnswer, recordPlacement } from '../../state/actions';
import { useActiveCourse, useCourseState, useVariant } from '../../state/settings';
import ExerciseView from '../exercises/ExerciseView';
import { StepFooter } from './StepFooter';
import {
  STAGE_SHORT, evaluatePlacement, perSkillPct, shouldStopAfter, sortByStage, type PlacementAnswer,
} from './placementLogic';
import s from './Onboarding.module.css';

type Phase = 'intro' | 'quiz' | 'result';
interface Given { q: PlacementQuestion; outcome: ExerciseOutcome | null }

const scoreOf = (g: Given) => (g.outcome ? (g.outcome.correct ? 1 : Math.max(0, Math.min(1, g.outcome.score))) : 0);

export default function PlacementPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromOnboarding = params.get('from') === 'onboarding';
  const courseId = useActiveCourse();
  const variant = useVariant(courseId);
  const content = useCourseContent(courseId);
  const courseState = useCourseState(courseId);
  const toast = useToast();

  const [phase, setPhase] = useState<Phase>('intro');
  const [given, setGiven] = useState<Given[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [saving, setSaving] = useState(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const data = content.data;
  const questions = useMemo(
    () => (data ? sortByStage(data.placement.questions.filter((q) => !q.exercise.variant || q.exercise.variant === variant)) : []),
    [data, variant],
  );
  const availableStages = useMemo<StageId[]>(() => (data ? data.stages.filter((st) => st.available).map((st) => st.id) : []), [data]);
  const stageName = (id: StageId) => data?.stages.find((st) => st.id === id)?.short ?? STAGE_SHORT[id];

  const answers: PlacementAnswer[] = useMemo(() => given.map((g) => ({ level: g.q.level, score: scoreOf(g) })), [given]);
  const evaluation = useMemo(() => evaluatePlacement(answers, availableStages), [answers, availableStages]);

  useEffect(() => {
    if (phase === 'result') {
      window.scrollTo({ top: 0 });
      resultHeading.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  const leave = () => {
    if (fromOnboarding) { navigate('/onboarding?schritt=einstufung', { replace: true }); return; }
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate('/lernpfad', { replace: true });
  };

  const start = () => {
    setGiven([]);
    setStartedAt(Date.now());
    setPhase('quiz');
    window.scrollTo({ top: 0 });
  };

  const current = phase === 'quiz' ? questions[given.length] ?? null : null;

  const answer = (outcome: ExerciseOutcome | null) => {
    if (!current) return;
    const next = [...given, { q: current, outcome }];
    setGiven(next);
    const nextAnswers = next.map((g) => ({ level: g.q.level, score: scoreOf(g) }));
    if (shouldStopAfter(questions, next.length, nextAnswers)) setPhase('result');
    else window.scrollTo({ top: 0 });
  };

  const commit = (startStage: StageId) => {
    if (saving) return;
    setSaving(true);
    const refId = `${courseId}.placement`;
    for (const g of given) {
      if (g.outcome) recordAnswer({ courseId, exercise: g.q.exercise, outcome: g.outcome, context: 'placement', refId, awardXp: false });
    }
    const perSkill = perSkillPct(given.map((g) => ({ skills: g.q.exercise.skills, score: scoreOf(g) }))) as Partial<Record<Skill, number>>;
    const res = recordPlacement(
      courseId,
      { takenAt: nowIso(), skipped: false, scorePct: evaluation.scorePct, startStage },
      { perSkill, durationSec: Math.round((Date.now() - startedAt) / 1000) },
    );
    toast(`Einstufung gespeichert – du startest bei ${stageName(startStage)}.${res.xp > 0 ? ` +${res.xp} XP` : ''}`, { tone: 'success' });
    navigate(fromOnboarding ? '/onboarding?schritt=konto' : '/lernpfad', { replace: true });
  };

  const backTarget = fromOnboarding ? '/onboarding?schritt=einstufung' : true;

  // ───────── Laden / Fehler ─────────
  if (content.loading) {
    return (
      <Page title="Einstufung" back={backTarget}>
        <div className={s.actions} aria-busy="true" aria-live="polite">
          <span className="sr-only">Einstufungstest wird geladen …</span>
          <Skeleton height={180} radius={20} />
          <Skeleton lines={3} />
        </div>
      </Page>
    );
  }
  if (content.error || !data) {
    return (
      <Page title="Einstufung" back={backTarget}>
        <ErrorState message={content.error ?? 'Der Einstufungstest konnte nicht geladen werden.'} onRetry={content.retry} />
      </Page>
    );
  }
  if (questions.length === 0) {
    return (
      <Page title="Einstufung" back={backTarget}>
        <EmptyState
          icon={<Compass size={28} />}
          title="Noch kein Einstufungstest"
          description="Für diesen Kurs gibt es noch keinen Einstufungstest. Starte einfach bei Stufe 0 – du kommst schnell voran, wenn du schon etwas kannst."
          action={<Button onClick={leave}>Zurück</Button>}
        />
      </Page>
    );
  }

  const exitDialog = (
    <ConfirmDialog
      open={confirmExit}
      onClose={() => setConfirmExit(false)}
      onConfirm={() => { setConfirmExit(false); leave(); }}
      title={phase === 'result' ? 'Ergebnis verwerfen?' : 'Einstufung abbrechen?'}
      message={phase === 'result'
        ? 'Dein Ergebnis wird nicht gespeichert. Du kannst den Test später jederzeit wiederholen.'
        : 'Deine bisherigen Antworten werden nicht gespeichert. Du kannst den Test später jederzeit neu starten.'}
      confirmLabel={phase === 'result' ? 'Verwerfen' : 'Abbrechen'}
      cancelLabel="Weitermachen"
      tone="danger"
    />
  );
  const closeButton = (
    <IconButton
      label={phase === 'result' ? 'Schließen ohne zu speichern' : 'Einstufung abbrechen'}
      icon={<X size={22} />}
      onClick={() => setConfirmExit(true)}
    />
  );

  // ───────── Intro ─────────
  if (phase === 'intro') {
    const prev = courseState.placement && !courseState.placement.skipped ? courseState.placement : null;
    return (
      <Page title={`Einstufung ${data.meta.name}`} subtitle="Finde deinen idealen Einstieg" back={backTarget} gap="lg">
        <Card padding="lg">
          <RichText md={data.placement.intro} />
        </Card>
        <div className={s.facts}>
          <StatTile tone="neutral" value={`≤ ${questions.length}`} label="Fragen" />
          <StatTile tone="neutral" value="≈ 5" label="Minuten" />
          <StatTile tone="neutral" value="70 %" label="je Etappe nötig" />
        </div>
        <Card tone="muted">
          <div className={s.infoCard}>
            <span className={s.infoIcon} aria-hidden="true"><Info size={20} /></span>
            <div className={s.infoBody}>
              <p className={s.infoText}>
                Du siehst während des Tests keine Lösungen – das macht die Einschätzung genauer. „Weiß ich nicht“ zählt
                einfach als nicht gewusst. Sind die Fragen einer Etappe noch zu schwer, endet der Test automatisch.
              </p>
            </div>
          </div>
        </Card>
        {prev && (
          <Card tone="outline">
            <div className={s.infoCard}>
              <span className={s.infoIcon} aria-hidden="true"><History size={20} /></span>
              <div className={s.infoBody}>
                <p className={s.infoTitle}>Letzte Einstufung: Start bei {stageName(prev.startStage)}</p>
                <p className={s.infoText}>
                  Vom {new Date(prev.takenAt).toLocaleDateString('de-DE')}. Ein neues Ergebnis ersetzt das alte, dein
                  bisheriger Lernfortschritt bleibt erhalten.
                </p>
              </div>
            </div>
          </Card>
        )}
        <StepFooter tall>
          <Button size="lg" block onClick={start}>Test starten</Button>
          <Button variant="ghost" block onClick={leave}>{fromOnboarding ? 'Überspringen' : 'Jetzt nicht'}</Button>
        </StepFooter>
      </Page>
    );
  }

  // ───────── Test ─────────
  if (phase === 'quiz' && current) {
    const n = given.length + 1;
    return (
      <Page title="Einstufung" largeTitle={false} leading={closeButton}>
        <div className={s.quizTop}>
          <ProgressBar value={given.length / questions.length} label="Fortschritt im Einstufungstest" valueText={`Frage ${n} von höchstens ${questions.length}`} />
        </div>
        <div className={s.quizMeta}>
          <span>
            Frage {n} <span className={s.levelTag}>· Niveau {stageName(current.level)}</span>
          </span>
          <Button variant="ghost" icon={<HelpCircle size={18} />} onClick={() => answer(null)}>
            Weiß ich nicht
          </Button>
        </div>
        <p className="sr-only" aria-live="polite">Frage {n} von höchstens {questions.length}, Niveau {stageName(current.level)}</p>
        <div key={current.exercise.id} className={s.questionIn}>
          <ExerciseView
            exercise={current.exercise}
            courseId={courseId}
            variant={variant}
            context="placement"
            refId={`${courseId}.placement`}
            examMode
            onDone={(outcome) => answer(outcome)}
          />
        </div>
        {exitDialog}
      </Page>
    );
  }

  // ───────── Ergebnis ─────────
  const ev = evaluation;
  const startLabel = stageName(ev.startStage);
  const unknown = given.filter((g) => !g.outcome).length;
  return (
    <Page title="Dein Ergebnis" largeTitle={false} leading={closeButton} gap="lg">
      <div className={s.resultHero}>
        <div className={s.resultBadge} aria-hidden="true">{ev.startStage === 'stage0' ? '0' : startLabel}</div>
        <h2 ref={resultHeading} tabIndex={-1} className={s.resultTitle}>Dein Vorschlag: Start bei {startLabel}</h2>
        <Badge tone="info">vorläufig</Badge>
        <p className={s.lead} aria-live="polite">
          {ev.masteredStage
            ? `Stark! Du hast ${ev.masteredStage === 'stage0' ? 'die Grundlagen (Stufe 0)' : stageName(ev.masteredStage)} sicher gemeistert – mindestens 70 % richtig.`
            : 'Stufe 0 ist genau richtig für dich: Dort legst du ein solides Fundament – und kommst mit Vorwissen besonders schnell voran.'}
        </p>
      </div>

      {ev.capped && (
        <Card tone="gold">
          <div className={s.infoCard}>
            <span className={s.infoIcon} aria-hidden="true"><Info size={20} /></span>
            <div className={s.infoBody}>
              <p className={s.infoTitle}>Du bist schon weiter, als unsere Inhalte reichen</p>
              <p className={s.infoText}>
                Dein Ergebnis spricht für einen Einstieg bei {stageName(ev.recommendedStage)}. Dafür gibt es aber noch keine
                Lektionen – du startest deshalb bei {startLabel}. Weitere Etappen folgen mit Updates.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <h3 className={s.cardTitle}>Ergebnis je Etappe</h3>
        <ul className={s.stageList}>
          {ev.perStage.map((st) => (
            <li key={st.stageId} className={s.stageRow}>
              <span className={s.stageName}>{stageName(st.stageId)}</span>
              <ProgressBar value={st.pct / 100} label={`${stageName(st.stageId)}: ${st.pct} % richtig`} tone={st.passed ? 'success' : 'accent'} size="sm" />
              <span className={cx(s.stageIcon, st.passed ? s.stageOk : s.stageNo)} aria-hidden="true">
                {st.passed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
              </span>
            </li>
          ))}
        </ul>
        <p className={cx(s.note, s.spaced)}>
          {given.length} {given.length === 1 ? 'Frage' : 'Fragen'} beantwortet · gesamt {ev.scorePct} % richtig
          {unknown > 0 ? ` · ${unknown}× „Weiß ich nicht“` : ''}. Eine Etappe zählt ab 70 %.
        </p>
      </Card>

      <p className={s.note}>
        Das ist eine Einschätzung aus wenigen Fragen. Dein Sprachniveau bestätigst du mit den Abschlussprüfungen im Lernpfad –
        übersprungene Etappen kannst du jederzeit wiederholen.
      </p>

      <StepFooter tall={ev.startStage !== 'stage0'}>
        <Button size="lg" block loading={saving} onClick={() => commit(ev.startStage)}>
          Bei {startLabel} starten
        </Button>
        {ev.startStage !== 'stage0' && (
          <Button variant="ghost" block disabled={saving} onClick={() => commit('stage0')}>
            Doch bei Stufe 0 beginnen
          </Button>
        )}
      </StepFooter>
      {exitDialog}
    </Page>
  );
}
