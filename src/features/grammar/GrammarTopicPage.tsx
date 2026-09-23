/**
 * Grammatikthema: Erklärung, Beispiele, Vergleich mit Deutsch, typische Fehler, Merksatz,
 * Übungen Stufe 1–3 (empfohlen/abgeschlossen, nie gesperrt), verwandte Themen.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BookOpen, CircleAlert, CircleCheck, Dumbbell, GraduationCap, Languages, Lightbulb, Link2, Lock, MessageSquareQuote, X,
} from 'lucide-react';
import type { GrammarTopic } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { useList } from '../../data/store';
import { useLessonStatus, useTopicMastery } from '../../state/progress';
import { useActiveCourse, useVariant } from '../../state/settings';
import {
  Badge, Button, Card, Chip, EmptyState, ErrorState, IconButton, ListRow, Page, ProgressBar, Skeleton,
} from '../../ui';
import { ExampleList, ExplainBlocks, MistakeCard } from '../content/ExplainBlocks';
import { courseOfId } from '../content/helpers';
import { SessionRunner } from '../content/SessionRunner';
import { SpeechNotice } from '../content/SpeakButtons';
import { useSpeaker } from '../content/useSpeaker';
import { levelInfos, masteryLabel, solvedExerciseIds, type LevelInfo } from './logic';
import s from './grammar.module.css';

const LEVEL_HINT: Record<1 | 2 | 3, string> = {
  1: 'Erkennen & verstehen',
  2: 'Anwenden',
  3: 'Frei & sicher',
};

const SECTIONS = [
  { id: 'erklaerung', label: 'Erklärung' },
  { id: 'beispiele', label: 'Beispiele' },
  { id: 'deutsch', label: 'Vergleich' },
  { id: 'fehler', label: 'Typische Fehler' },
  { id: 'merksatz', label: 'Merksatz' },
  { id: 'ueben', label: 'Üben' },
] as const;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  const h = el.querySelector('h2');
  if (h instanceof HTMLElement) h.focus({ preventScroll: true });
}

export default function GrammarTopicPage() {
  const { topicId = '' } = useParams();
  const active = useActiveCourse();
  const courseId = courseOfId(topicId) ?? active;
  const { data, loading, error, retry } = useCourseContent(courseId);

  if (loading) {
    return (
      <Page title="Grammatik" back="/grammatik">
        <Skeleton width="40%" height={20} />
        <Skeleton lines={3} />
        <Skeleton height={160} radius={20} />
        <Skeleton height={120} radius={20} />
      </Page>
    );
  }
  if (error || !data) {
    return (
      <Page title="Grammatik" back="/grammatik">
        <ErrorState message={error ?? 'Das Thema konnte nicht geladen werden.'} onRetry={retry} />
      </Page>
    );
  }
  const topic = data.grammar.find((t) => t.id === topicId);
  if (!topic) {
    return (
      <Page title="Thema nicht gefunden" back="/grammatik">
        <EmptyState
          icon={<BookOpen size={28} />}
          title="Dieses Thema gibt es (noch) nicht"
          description="Vielleicht wurde der Link falsch kopiert oder das Thema gehört zu einem anderen Kurs."
          action={<Button to="/grammatik">Zum Grammatikzentrum</Button>}
        />
      </Page>
    );
  }
  return <TopicView key={topic.id} topic={topic} content={data} />;
}

function TopicView({ topic, content }: { topic: GrammarTopic; content: NonNullable<ReturnType<typeof useCourseContent>['data']> }) {
  const courseId = topic.courseId;
  const variant = useVariant(courseId);
  const sp = useSpeaker(variant);
  const mastery = useTopicMastery(courseId);
  const lessonStatus = useLessonStatus(courseId, content);
  const answers = useList('answers');
  const [activeLevel, setActiveLevel] = useState<1 | 2 | 3 | null>(null);
  const [runKey, setRunKey] = useState(0);

  const solved = useMemo(
    () => solvedExerciseIds(answers.map((a) => a.data).filter((a) => a.courseId === courseId)),
    [answers, courseId],
  );
  const infos = useMemo(() => levelInfos(topic.levels ?? [], solved, variant), [topic, solved, variant]);
  const m = mastery[topic.id];
  const ml = masteryLabel(m);
  const stage = content.stages.find((st) => st.id === topic.stageId);
  const related = useMemo(
    () => (topic.related ?? []).map((id) => content.grammar.find((t) => t.id === id)).filter((t): t is GrammarTopic => !!t),
    [topic, content],
  );
  const lessons = useMemo(() => content.lessons.filter((l) => l.topicIds?.includes(topic.id)), [content, topic]);
  const recommended = infos.find((i) => i.state === 'recommended');
  const [practiceVisible, setPracticeVisible] = useState(false);

  // Sticky-Aktion ausblenden, solange der Übungsbereich selbst sichtbar ist (keine doppelten Buttons)
  useEffect(() => {
    if (activeLevel || typeof IntersectionObserver === 'undefined') return;
    const el = document.getElementById('ueben');
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPracticeVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [activeLevel]);

  const start = useCallback((level: 1 | 2 | 3) => {
    setActiveLevel(level);
    setRunKey((k) => k + 1);
    window.scrollTo({ top: 0 });
  }, []);
  const exit = useCallback(() => {
    setActiveLevel(null);
    requestAnimationFrame(() => scrollToId('ueben'));
  }, []);

  // ── Übungsmodus ──
  if (activeLevel) {
    const lvl = topic.levels.find((l) => l.level === activeLevel);
    const nextInfo = infos.find((i) => i.level > activeLevel && i.total > 0);
    return (
      <Page
        title={topic.title}
        largeTitle={false}
        leading={<IconButton label="Übung beenden" icon={<X size={22} />} onClick={exit} />}
      >
        {lvl ? (
          <SessionRunner
            key={runKey}
            courseId={courseId}
            variant={variant}
            context="grammar"
            refId={topic.id}
            exercises={lvl.exercises}
            label={`Stufe ${lvl.level} · ${lvl.title}`}
            onExit={exit}
            next={nextInfo ? { label: `Weiter mit Stufe ${nextInfo.level}`, onClick: () => start(nextInfo.level) } : undefined}
          />
        ) : (
          <EmptyState title="Diese Stufe gibt es nicht" action={<Button onClick={exit}>Zurück zum Thema</Button>} />
        )}
      </Page>
    );
  }

  const hasComparison = topic.germanComparison?.length > 0;
  const hasMistakes = topic.mistakes?.length > 0;
  const hasExamples = (topic.examples ?? []).some((e) => !e.variant || e.variant === variant);
  const sections = SECTIONS.filter((x) =>
    (x.id !== 'deutsch' || hasComparison) && (x.id !== 'fehler' || hasMistakes) && (x.id !== 'beispiele' || hasExamples)
    && (x.id !== 'merksatz' || !!topic.mnemonic));

  return (
    <Page title={topic.title} back="/grammatik" gap="lg">
      <div className={s.topicHead}>
        <div className={s.badges}>
          <Badge tone="accent">{stage?.short ?? topic.stageId}</Badge>
          <Badge>{topic.category}</Badge>
          <Badge tone={ml.tone}>{ml.label}</Badge>
        </div>
        <p className={s.summary}>{topic.summary}</p>
        {m?.evidence ? (
          <div className={s.masteryRow}>
            <ProgressBar value={m.mastery / 100} label="Beherrschung" showLabel valueText={`${m.mastery} %`} tone={ml.tone === 'success' ? 'success' : ml.tone === 'gold' ? 'gold' : 'accent'} />
            <p className={s.muted}>Aus {m.evidence} {m.evidence === 1 ? 'Antwort' : 'Antworten'} berechnet.</p>
          </div>
        ) : (
          <p className={s.muted}>Noch nicht geübt – starte mit Stufe 1, sobald du die Erklärung gelesen hast.</p>
        )}
        <nav aria-label="Abschnitte" className={s.jump}>
          {sections.map((x) => (
            <Chip key={x.id} onClick={() => scrollToId(x.id)}>{x.label}</Chip>
          ))}
        </nav>
        <SpeechNotice sp={sp} />
      </div>

      <section id="erklaerung" className={s.section} aria-labelledby="h-erklaerung">
        <h2 id="h-erklaerung" tabIndex={-1} className={`${s.h2} ${s.h2Icon}`}><BookOpen size={20} aria-hidden="true" /> Erklärung</h2>
        <ExplainBlocks blocks={topic.explanation ?? []} variant={variant} />
      </section>

      {hasExamples && (
        <section id="beispiele" className={s.section} aria-labelledby="h-beispiele">
          <h2 id="h-beispiele" tabIndex={-1} className={`${s.h2} ${s.h2Icon}`}><MessageSquareQuote size={20} aria-hidden="true" /> Beispiele</h2>
          <ExampleList examples={topic.examples} variant={variant} />
        </section>
      )}

      {hasComparison && (
        <section id="deutsch" className={s.section} aria-labelledby="h-deutsch">
          <h2 id="h-deutsch" tabIndex={-1} className={`${s.h2} ${s.h2Icon}`}><Languages size={20} aria-hidden="true" /> Vergleich mit dem Deutschen</h2>
          <ExplainBlocks blocks={topic.germanComparison} variant={variant} />
        </section>
      )}

      {hasMistakes && (
        <section id="fehler" className={s.section} aria-labelledby="h-fehler">
          <h2 id="h-fehler" tabIndex={-1} className={`${s.h2} ${s.h2Icon}`}><CircleAlert size={20} aria-hidden="true" /> Typische Fehler</h2>
          <p className={s.muted}>Diese Fehler machen Deutschsprachige besonders oft – wer sie kennt, vermeidet sie.</p>
          <div className={s.mistakes}>
            {topic.mistakes.map((mi, i) => <MistakeCard key={i} wrong={mi.wrong} right={mi.right} why={mi.why} variant={variant} sp={sp} />)}
          </div>
        </section>
      )}

      {topic.mnemonic && (
        <section id="merksatz" className={s.section} aria-labelledby="h-merksatz">
          <h2 id="h-merksatz" tabIndex={-1} className={`${s.h2} ${s.h2Icon}`}><Lightbulb size={20} aria-hidden="true" /> Merksatz</h2>
          <ExplainBlocks blocks={[{ type: 'tip', md: topic.mnemonic }]} variant={variant} />
        </section>
      )}

      <section id="ueben" className={s.section} aria-labelledby="h-ueben">
        <h2 id="h-ueben" tabIndex={-1} className={`${s.h2} ${s.h2Icon}`}><Dumbbell size={20} aria-hidden="true" /> Üben</h2>
        <p className={s.muted}>Drei Stufen mit steigendem Anspruch. Du kannst jede Stufe jederzeit wählen – die Markierung zeigt dir den sinnvollsten nächsten Schritt.</p>
        <LevelList topic={topic} infos={infos} onStart={start} />
      </section>

      {(related.length > 0 || lessons.length > 0) && (
        <section className={s.section} aria-labelledby="h-related">
          <h2 id="h-related" className={`${s.h2} ${s.h2Icon}`}><Link2 size={20} aria-hidden="true" /> Passt dazu</h2>
          {related.length > 0 && (
            <Card padding="none">
              <ul className={s.list} aria-label="Verwandte Themen">
                {related.map((t) => {
                  const rl = masteryLabel(mastery[t.id]);
                  return (
                    <li key={t.id}>
                      <ListRow to={`/grammatik/${t.id}`} leading={<GraduationCap size={20} />} title={t.title} subtitle={t.summary} trailing={<Badge tone={rl.tone}>{rl.label}</Badge>} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          {lessons.length > 0 && (
            <>
              <h3 className={s.h3}>In diesen Lektionen</h3>
              <Card padding="none">
                <ul className={s.list} aria-label="Lektionen zu diesem Thema">
                  {lessons.map((l) => {
                    const st = lessonStatus[l.id];
                    const locked = st === 'locked';
                    return (
                      <li key={l.id}>
                        <ListRow
                          to={locked ? undefined : `/lektion/${l.id}`}
                          leading={<span aria-hidden="true">{l.icon}</span>}
                          title={l.title}
                          subtitle={locked ? 'Wird im Lernpfad freigeschaltet' : `${l.minutes} Min.`}
                          trailing={st === 'completed'
                            ? <Badge tone="success" icon={<CircleCheck size={12} />}>Erledigt</Badge>
                            : locked ? <Badge icon={<Lock size={12} />}>Gesperrt</Badge> : undefined}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </>
          )}
        </section>
      )}

      {recommended && (
        <>
          <div className={s.ctaSpacer} aria-hidden="true" />
          <div className={s.ctaBar} hidden={practiceVisible}>
            <div className={s.ctaInner}>
              <Button size="lg" block icon={<Dumbbell size={18} />} onClick={() => start(recommended.level)}>
                {`Stufe ${recommended.level} üben`}
              </Button>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

function LevelList({ topic, infos, onStart }: { topic: GrammarTopic; infos: LevelInfo[]; onStart: (l: 1 | 2 | 3) => void }) {
  if (!infos.length) {
    return <EmptyState compact title="Übungen folgen" description="Für dieses Thema gibt es noch keine Übungsstufen." />;
  }
  return (
    <ol className={s.levels}>
      {infos.map((info) => {
        const lvl = topic.levels.find((l) => l.level === info.level);
        if (!lvl) return null;
        const cls = [s.level, info.state === 'recommended' && s.levelRecommended, info.state === 'done' && s.levelDone].filter(Boolean).join(' ');
        return (
          <li key={info.level} className={cls}>
            <span className={s.levelNum} aria-hidden="true">
              {info.state === 'done' ? <CircleCheck size={24} /> : info.level}
            </span>
            <div className={s.levelBody}>
              <p className={s.levelTitle}>Stufe {info.level}: {lvl.title}</p>
              <div className={s.levelMeta}>
                <span>{LEVEL_HINT[info.level]}</span>
                <span aria-hidden="true">·</span>
                <span>{info.total ? `${info.solved}/${info.total} gelöst` : 'keine Übungen für deine Variante'}</span>
                {info.state === 'done' && <Badge tone="success">Abgeschlossen</Badge>}
                {info.state === 'recommended' && <Badge tone="accent">Empfohlen</Badge>}
              </div>
            </div>
            {info.total > 0 && (
              <div className={s.levelAction}>
                <Button
                  variant={info.state === 'recommended' ? 'primary' : 'secondary'}
                  onClick={() => onStart(info.level)}
                  aria-label={`Stufe ${info.level} ${info.state === 'done' ? 'wiederholen' : 'starten'}: ${lvl.title}`}
                >
                  {info.state === 'done' ? 'Wiederholen' : info.solved > 0 ? 'Weiter üben' : 'Starten'}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
