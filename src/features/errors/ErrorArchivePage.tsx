/**
 * Fehlerarchiv: offene/behobene Fehler, Filter nach Kompetenz/Thema, Detail mit 5-teiliger Erklärung,
 * „Jetzt üben“ (Übung per ID im Kursinhalt), Link zum Grammatikthema, häufigste Fehlerthemen.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive, BarChart3, BookOpen, ChevronRight, CircleCheck, CircleX, Dumbbell, Filter, PartyPopper, Repeat, X,
} from 'lucide-react';
import type { CourseContent, Exercise } from '../../content/types';
import type { Skill, Variant } from '../../core/types';
import { useCourseContent } from '../../content/registry';
import { useList } from '../../data/store';
import { useOpenErrors } from '../../state/review';
import { useActiveCourse, useVariant } from '../../state/settings';
import {
  Badge, BottomSheet, Button, Card, Chip, EmptyState, ErrorState, IconButton, Page, RichText, Segmented, Select, Skeleton,
} from '../../ui';
import { htmlLangFor } from '../content/helpers';
import { SessionRunner } from '../content/SessionRunner';
import { useSpeaker } from '../content/useSpeaker';
import { findExercise, SOURCE_LABEL } from './lookup';
import {
  CONTEXT_LABELS, filterErrors, relativeDay, SKILL_LABELS, skillsIn, sortErrors, topErrorTopics, topicsIn, type ErrorItem,
} from './stats';
import s from './errors.module.css';

type Tab = 'open' | 'resolved';
const PRACTICE_MAX = 10;

interface Practice {
  exercises: Exercise[];
  label: string;
  ids: string[];
}

export default function ErrorArchivePage() {
  const courseId = useActiveCourse();
  const variant = useVariant(courseId);
  const { data: content, loading, error, retry } = useCourseContent(courseId);
  const open = useOpenErrors(courseId) as ErrorItem[];
  const all = useList('errorEntries');
  const resolved = useMemo(
    () => all.filter((r) => r.data.courseId === courseId && r.data.resolvedAt).map((r) => ({ id: r.id, ...r.data }) as ErrorItem),
    [all, courseId],
  );
  const [tab, setTab] = useState<Tab>('open');
  const [skill, setSkill] = useState<Skill | 'all'>('all');
  const [topic, setTopic] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [runKey, setRunKey] = useState(0);

  const topicTitle = useMemo(() => {
    const map = new Map((content?.grammar ?? []).map((t) => [t.id, t.title] as const));
    return (id: string) => map.get(id) ?? prettyTopic(id);
  }, [content]);
  const isGrammarTopic = (id: string) => !!content?.grammar.some((t) => t.id === id);

  const base = tab === 'open' ? open : resolved;
  const skills = useMemo(() => skillsIn(base), [base]);
  const topics = useMemo(() => topicsIn(base), [base]);
  const effSkill = skill !== 'all' && !skills.includes(skill) ? 'all' : skill;
  const effTopic = topic !== 'all' && !topics.includes(topic) ? 'all' : topic;
  const shown = useMemo(() => sortErrors(filterErrors(base, { skill: effSkill, topicId: effTopic }), tab), [base, effSkill, effTopic, tab]);
  const top = useMemo(() => topErrorTopics(open, 3), [open]);
  const selected = selectedId ? [...open, ...resolved].find((e) => e.id === selectedId) ?? null : null;

  const practicable = useMemo(
    () => (content ? shown.filter((e) => tab === 'open' && findExercise(content, e.exerciseId)) : []),
    [content, shown, tab],
  );

  const startPractice = (items: ErrorItem[], label: string) => {
    if (!content) return;
    const exercises: Exercise[] = [];
    const ids: string[] = [];
    for (const e of items) {
      const src = findExercise(content, e.exerciseId);
      if (!src) continue;
      exercises.push(src.exercise);
      if (!e.resolvedAt) ids.push(e.id);
      if (exercises.length >= PRACTICE_MAX) break;
    }
    if (!exercises.length) return;
    setSelectedId(null);
    setPractice({ exercises, label, ids });
    setRunKey((k) => k + 1);
    window.scrollTo({ top: 0 });
  };

  if (practice) {
    return (
      <Page
        title="Fehler-Training"
        largeTitle={false}
        leading={<IconButton label="Training beenden" icon={<X size={22} />} onClick={() => setPractice(null)} />}
      >
        <SessionRunner
          key={runKey}
          courseId={courseId}
          variant={variant}
          context="review"
          refId="fehlerarchiv"
          exercises={practice.exercises}
          label={practice.label}
          exitLabel="Zurück zum Fehlerarchiv"
          onExit={() => setPractice(null)}
          summaryExtra={<ResolvedSummary ids={practice.ids} />}
        />
      </Page>
    );
  }

  if (loading) {
    return (
      <Page title="Fehlerarchiv" back>
        <Skeleton height={44} radius={12} />
        <Skeleton height={120} radius={20} />
        <Skeleton height={88} radius={16} />
        <Skeleton height={88} radius={16} />
      </Page>
    );
  }
  if (error || !content) {
    return (
      <Page title="Fehlerarchiv" back>
        <ErrorState message={error ?? 'Die Kursinhalte konnten nicht geladen werden.'} onRetry={retry} />
      </Page>
    );
  }

  const nothingYet = open.length === 0 && resolved.length === 0;

  return (
    <Page
      title="Fehlerarchiv"
      back
      subtitle="Jeder Fehler ist eine Lernchance – hier findest du sie gesammelt und erklärt."
      gap="lg"
    >
      {nothingYet ? (
        <EmptyState
          icon={<Archive size={28} />}
          title="Noch keine Fehler gesammelt"
          description="Sobald dir in Lektionen, Grammatik oder Prüfungen etwas danebengeht, landet es hier – mit Erklärung und der Möglichkeit, es gezielt zu wiederholen."
          action={<Button to="/lernpfad">Zum Lernpfad</Button>}
        />
      ) : (
        <>
          <div className={s.tiles}>
            <div className={s.tile}>
              <span className={s.tileValue}>{open.length}</span>
              <span className={s.tileLabel}>offen</span>
            </div>
            <div className={`${s.tile} ${s.tileGood}`}>
              <span className={s.tileValue}>{resolved.length}</span>
              <span className={s.tileLabel}>behoben</span>
            </div>
          </div>

          {top.length > 0 && (
            <Card padding="md" className={s.statsCard}>
              <h2 className={s.cardTitle}><BarChart3 size={18} aria-hidden="true" /> Häufigste Fehlerthemen</h2>
              <ol className={s.bars}>
                {top.map((t) => (
                  <li key={t.topicId}>
                    {(() => {
                      const body = (
                        <>
                          <span className={s.barHead}>
                            <span className={s.barLabel}>{topicTitle(t.topicId)}</span>
                            <span className={s.barValue}>{t.mistakes}× falsch</span>
                            {isGrammarTopic(t.topicId) && <ChevronRight size={16} aria-hidden="true" className={s.barChev} />}
                          </span>
                          <span className={s.barTrack} aria-hidden="true">
                            <span className={s.barFill} style={{ transform: `scaleX(${t.mistakes / top[0].mistakes})` }} />
                          </span>
                        </>
                      );
                      return isGrammarTopic(t.topicId)
                        ? <Link to={`/grammatik/${t.topicId}`} className={`${s.barRow} ${s.barLinkRow}`} aria-label={`${topicTitle(t.topicId)}: ${t.mistakes}× falsch – Thema öffnen`}>{body}</Link>
                        : <div className={s.barRow}>{body}</div>;
                    })()}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <div className={s.listHead}>
            <Segmented
              label="Fehler anzeigen"
              value={tab}
              onChange={(v) => { setTab(v); setSkill('all'); setTopic('all'); }}
              options={[
                { value: 'open', label: `Offen (${open.length})` },
                { value: 'resolved', label: `Behoben (${resolved.length})` },
              ]}
            />
            {(skills.length > 1 || topics.length > 1) && (
              <div className={s.filters} role="group" aria-label="Filter">
                {skills.length > 1 && (
                  <div className={s.chips}>
                    <Filter size={16} aria-hidden="true" className={s.filterIcon} />
                    <Chip selected={effSkill === 'all'} onClick={() => setSkill('all')}>Alle</Chip>
                    {skills.map((k) => (
                      <Chip key={k} selected={effSkill === k} onClick={() => setSkill(k)}>{SKILL_LABELS[k]}</Chip>
                    ))}
                  </div>
                )}
                {topics.length > 1 && (
                  <Select
                    label="Thema"
                    value={effTopic}
                    onChange={setTopic}
                    options={[{ value: 'all', label: 'Alle Themen' }, ...topics.map((t) => ({ value: t, label: topicTitle(t) }))]}
                  />
                )}
              </div>
            )}
          </div>

          {tab === 'open' && practicable.length > 0 && (
            <Card tone="accent" padding="md" className={s.trainCard}>
              <div className={s.trainText}>
                <strong>Fehler-Training</strong>
                <span className={s.muted}>
                  {Math.min(practicable.length, PRACTICE_MAX)} {practicable.length === 1 ? 'Übung' : 'Übungen'} aus deiner Auswahl. Zwei richtige Antworten in Folge beheben einen Fehler.
                </span>
              </div>
              <Button icon={<Dumbbell size={18} />} onClick={() => startPractice(practicable, 'Fehler-Training')}>Jetzt üben</Button>
            </Card>
          )}

          <section aria-label={tab === 'open' ? 'Offene Fehler' : 'Behobene Fehler'} aria-live="polite">
            {shown.length === 0 ? (
              tab === 'open' ? (
                <EmptyState
                  compact
                  icon={<PartyPopper size={28} />}
                  title={open.length ? 'Keine Treffer für diesen Filter' : 'Alles behoben!'}
                  description={open.length ? 'Wähle einen anderen Filter.' : 'Du hast keine offenen Fehler. Stark – neue Fehler erscheinen hier automatisch.'}
                  action={open.length ? <Button variant="secondary" onClick={() => { setSkill('all'); setTopic('all'); }}>Filter zurücksetzen</Button> : undefined}
                />
              ) : (
                <EmptyState compact icon={<CircleCheck size={28} />} title="Noch nichts behoben" description="Beantworte eine Übung aus dem Archiv zweimal richtig – dann wandert sie hierher." />
              )
            ) : (
              <ul className={s.list}>
                {shown.map((e) => (
                  <li key={e.id}>
                    <button type="button" className={s.item} onClick={() => setSelectedId(e.id)} aria-haspopup="dialog">
                      <span className={s.itemTop}>
                        <Badge tone={tab === 'open' ? 'danger' : 'success'}>{SKILL_LABELS[e.skill] ?? e.skill}</Badge>
                        <span className={s.itemMeta}>
                          {tab === 'open' ? `${e.count}× falsch · ${relativeDay(e.lastAt)}` : `behoben ${relativeDay(e.resolvedAt ?? e.lastAt)}`}
                        </span>
                      </span>
                      <span className={s.prompt}>{e.prompt}</span>
                      <span className={s.answers}>
                        <span className={s.ansWrong}>
                          <CircleX size={16} aria-hidden="true" />
                          <span className="sr-only">Deine Antwort: </span>
                          <del>{e.userAnswer || '(keine Antwort)'}</del>
                        </span>
                        <span className={s.ansRight}>
                          <CircleCheck size={16} aria-hidden="true" />
                          <span className="sr-only">Richtig: </span>
                          {e.correctAnswer}
                        </span>
                      </span>
                      {tab === 'open' && e.correctSince > 0 && (
                        <span className={s.progressNote}>Noch {Math.max(0, 2 - e.correctSince)}× richtig bis behoben</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ErrorDetailSheet
        entry={selected}
        content={content}
        variant={variant}
        topicTitle={topicTitle}
        isGrammarTopic={isGrammarTopic}
        onClose={() => setSelectedId(null)}
        onPractice={(e) => startPractice([e], 'Fehler wiederholen')}
      />
    </Page>
  );
}

function ErrorDetailSheet({ entry, content, variant, topicTitle, isGrammarTopic, onClose, onPractice }: {
  entry: ErrorItem | null;
  variant: Variant;
  content: CourseContent;
  topicTitle: (id: string) => string;
  isGrammarTopic: (id: string) => boolean;
  onClose: () => void;
  onPractice: (e: ErrorItem) => void;
}) {
  const src = entry ? findExercise(content, entry.exerciseId) : null;
  const grammarTopics = entry ? (entry.topicIds ?? []).filter(isGrammarTopic) : [];
  const ex = entry?.explanation;
  const steps = ex ? [
    { n: 1, title: 'Was war falsch?', md: ex.what },
    { n: 2, title: 'Warum?', md: ex.why },
    { n: 3, title: 'Die Regel', md: ex.rule },
    { n: 4, title: 'So ist es richtig', md: ex.correct },
    { n: 5, title: 'So vermeidest du den Fehler', md: ex.avoid },
  ].filter((x) => x.md?.trim()) : [];
  const resolvedEntry = !!entry?.resolvedAt;
  const sp = useSpeaker(variant);
  const onSpeak = sp.available ? (x: string) => sp.say(x) : undefined;

  let fallback: ReactNode = null;
  if (entry && !src) {
    if (entry.context === 'song' && entry.refId) {
      fallback = <Button block variant="secondary" to={`/songs/${entry.refId}/uebungen`} icon={<Repeat size={18} />}>In den Song-Übungen wiederholen</Button>;
    } else if (entry.context === 'partner') {
      fallback = <Button block variant="secondary" to="/partner">Zum KI-Sprachpartner</Button>;
    } else if (entry.context === 'review' || entry.context === 'vocab') {
      fallback = <Button block variant="secondary" to="/wiederholung">Zur Wiederholung</Button>;
    }
  }

  return (
    <BottomSheet
      open={!!entry}
      onClose={onClose}
      title={resolvedEntry ? 'Behobener Fehler' : 'Fehler verstehen'}
      footer={entry ? (
        <div className={s.sheetActions}>
          {src ? (
            <Button block size="lg" icon={<Dumbbell size={18} />} onClick={() => onPractice(entry)}>
              {resolvedEntry ? 'Nochmal üben' : 'Jetzt üben'}
            </Button>
          ) : fallback}
          {grammarTopics[0] && (
            <Button block variant="secondary" icon={<BookOpen size={18} />} to={`/grammatik/${grammarTopics[0]}`}>
              Zum Thema: {topicTitle(grammarTopics[0])}
            </Button>
          )}
        </div>
      ) : undefined}
    >
      {entry && (
        <div className={s.sheet}>
          <div className={s.sheetMeta}>
            <Badge tone={resolvedEntry ? 'success' : 'danger'}>{SKILL_LABELS[entry.skill] ?? entry.skill}</Badge>
            <span className={s.muted}>
              {src ? `${SOURCE_LABEL[src.kind]}: ${src.title}` : CONTEXT_LABELS[entry.context] ?? ''}
              {' · '}{entry.count}× falsch · zuletzt {relativeDay(entry.lastAt)}
            </span>
          </div>

          <div className={s.promptBox}>
            <span className={s.eyebrow}>Aufgabe</span>
            <p className={s.promptText}>{entry.prompt}</p>
          </div>

          <div className={s.compare}>
            <p className={s.ansWrong}>
              <CircleX size={18} aria-hidden="true" />
              <span><span className={s.eyebrowInline}>Deine Antwort</span><del>{entry.userAnswer || '(keine Antwort)'}</del></span>
            </p>
            <p className={s.ansRight}>
              <CircleCheck size={18} aria-hidden="true" />
              <span><span className={s.eyebrowInline}>Richtig</span>{entry.correctAnswer}</span>
            </p>
          </div>

          {steps.length > 0 && (
            <ol className={s.steps} aria-label="Erklärung in fünf Schritten">
              {steps.map((st) => (
                <li key={st.n} className={s.step}>
                  <span className={s.stepNum} aria-hidden="true">{st.n}</span>
                  <div className={s.stepBody}>
                    <h3 className={s.stepTitle}>{st.title}</h3>
                    <RichText md={st.md} onSpeak={onSpeak} targetLang={htmlLangFor(variant)} />
                  </div>
                </li>
              ))}
            </ol>
          )}

          {!resolvedEntry && (
            <div className={s.resolveBox}>
              <div className={s.dots} aria-hidden="true">
                {[0, 1].map((i) => <span key={i} className={i < entry.correctSince ? s.dotOn : s.dot} />)}
              </div>
              <span className={s.muted}>
                {entry.correctSince > 0
                  ? `Schon ${entry.correctSince}× richtig – noch ${Math.max(0, 2 - entry.correctSince)}× und der Fehler ist behoben.`
                  : 'Zweimal hintereinander richtig beantworten, dann gilt der Fehler als behoben.'}
              </span>
            </div>
          )}

          {!src && !fallback && (
            <p className={s.muted}>Diese Übung ist im aktuellen Kursinhalt nicht mehr enthalten. Die Erklärung bleibt dir hier erhalten.</p>
          )}

          {grammarTopics.length > 1 && (
            <div className={s.moreTopics}>
              <span className={s.eyebrow}>Weitere Themen</span>
              <div className={s.chips}>
                {grammarTopics.slice(1).map((t) => (
                  <Button key={t} variant="ghost" to={`/grammatik/${t}`} icon={<BookOpen size={16} />}>{topicTitle(t)}</Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

/** Ehrliche Bilanz nach dem Training: wie viele der geübten Fehler sind jetzt behoben? */
function ResolvedSummary({ ids }: { ids: string[] }) {
  const all = useList('errorEntries');
  const { fixed, progress } = useMemo(() => {
    const byId = new Map(all.map((r) => [r.id, r.data] as const));
    let f = 0;
    let p = 0;
    for (const id of ids) {
      const e = byId.get(id);
      if (!e) continue;
      if (e.resolvedAt) f += 1;
      else if (e.correctSince > 0) p += 1;
    }
    return { fixed: f, progress: p };
  }, [all, ids]);
  if (!fixed && !progress) return null;
  return (
    <div className={s.resolvedSummary} role="status">
      {fixed > 0 && <p><PartyPopper size={18} aria-hidden="true" /> {fixed === 1 ? '1 Fehler ist jetzt behoben.' : `${fixed} Fehler sind jetzt behoben.`}</p>}
      {progress > 0 && <p><Repeat size={18} aria-hidden="true" /> {progress === 1 ? '1 Fehler braucht noch eine richtige Antwort.' : `${progress} Fehler brauchen noch eine richtige Antwort.`}</p>}
    </div>
  );
}

function prettyTopic(id: string): string {
  const last = id.split('.').pop() ?? id;
  return last.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
