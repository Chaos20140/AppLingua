import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AudioLines, BookOpen, ChevronRight, GraduationCap, Sparkles, Star, TrendingDown, TrendingUp } from 'lucide-react';
import { useCourseContent } from '../../content/registry';
import type { CourseContent } from '../../content/types';
import type { CourseId, ExamResult } from '../../core/types';
import { useList } from '../../data/store';
import { SKILL_LABELS, SKILL_PRACTICE } from '../../engine/competence';
import { categoryForIssue } from '../../engine/plan';
import { Badge, Button, Card, EmptyState, ListRow, Page, ProgressBar, Skeleton } from '../../ui';
import {
  useActivityDays, useCompetences, useDailyGoal, useLanguageLevel, useLessonProgress, useLevelInfo, useStrengthsWeaknesses, useTopicMastery,
} from '../../state/progress';
import { useActiveCourse } from '../../state/settings';
import { useToday } from '../../state/today';
import { CourseSwitcher } from '../dashboard/CourseSwitcher';
import { cx, Section, SectionLink } from '../dashboard/Section';
import { EXAM_KIND_LABEL } from '../exams/examLogic';
import { formatNumber } from '../achievements/levelLadder';
import { ActivityCalendar, XpBarChart, type BarDatum } from './charts';
import { SkillBars } from './SkillBars';
import { formatDate, pronIssueSummary } from './statsLogic';
import s from './Stats.module.css';

export default function StatsPage() {
  const courseId = useActiveCourse();
  const content = useCourseContent(courseId);

  return (
    <Page title="Statistik" back actions={<CourseSwitcher />} gap="lg">
      <LevelExplainer courseId={courseId} />
      <CompetenceSection courseId={courseId} />
      <StrengthSection courseId={courseId} content={content.data} />
      <XpHistory />
      <ActivitySection />
      <TopicSection courseId={courseId} content={content.data} loading={content.loading} />
      <ExamHistory courseId={courseId} content={content.data} />
      <PronSection courseId={courseId} content={content.data} />
      <LessonSection courseId={courseId} content={content.data} loading={content.loading} />
    </Page>
  );
}

// ───────────────────────── Spielerlevel vs. Sprachniveau ─────────────────────────

function LevelExplainer({ courseId }: { courseId: CourseId }) {
  const level = useLevelInfo();
  const lang = useLanguageLevel(courseId);
  return (
    <Section title="Zwei Arten von Fortschritt">
      <div className={s.twoCards}>
        <Card padding="md" className={s.explainCard}>
          <p className={s.eyebrow}>
            <Sparkles aria-hidden="true" /> Spielerlevel
          </p>
          <p className={s.big}>
            <span className={s.gold}>{level.level}</span> <span className={s.bigSub}>{level.title}</span>
          </p>
          <p className={s.small}>
            {formatNumber(level.totalXp)} XP gesammelt. Zeigt deinen Fleiß – jede Übung zählt, auch Wiederholungen.
          </p>
        </Card>
        <Card padding="md" className={s.explainCard}>
          <p className={s.eyebrow}>
            <GraduationCap aria-hidden="true" /> Sprachniveau
          </p>
          <p className={s.big}>
            <span className={s.accent}>{lang.level}</span>
            {lang.provisional && <Badge tone="warning">vorläufig</Badge>}
            {lang.isTrainingLevel && <Badge tone="info">Trainingsstufe</Badge>}
          </p>
          <p className={s.small}>{lang.basis} Steigt nur durch bestandene Abschlussprüfungen und Endgegner.</p>
        </Card>
      </div>
    </Section>
  );
}

// ───────────────────────── Kompetenzen ─────────────────────────

function CompetenceSection({ courseId }: { courseId: CourseId }) {
  const comp = useCompetences(courseId);
  return (
    <Section
      title="Kompetenzen"
      description="Werte von 0 bis 100 aus deinen Antworten, Ausspracheversuchen und Prüfungen. Neuere Ergebnisse zählen mehr; mit wenigen Belegen bleibt ein Wert bewusst vorsichtig."
    >
      <Card padding="lg">
        <SkillBars competences={comp} detailed />
      </Card>
    </Section>
  );
}

// ───────────────────────── Stärken & Schwächen ─────────────────────────

function StrengthSection({ courseId, content }: { courseId: CourseId; content: CourseContent | null }) {
  const sw = useStrengthsWeaknesses(courseId);
  const titles = useMemo(() => new Map((content?.grammar ?? []).map((g) => [g.id, g.title])), [content]);
  const weakTopics = sw.weakTopics.filter((id) => titles.has(id)).slice(0, 4);
  const nothing = !sw.strengths.length && !sw.weaknesses.length && !weakTopics.length;

  return (
    <Section title="Stärken & Schwächen">
      {nothing ? (
        <Card tone="muted" padding="md">
          <p className={s.small}>
            Für eine verlässliche Aussage brauchen wir je Kompetenz mindestens fünf Belege. Lerne ein paar Lektionen – dann siehst du hier, was dir liegt
            und wo sich Übung lohnt.
          </p>
        </Card>
      ) : (
        <div className={s.twoCards}>
          <Card padding="md" className={s.swCard}>
            <p className={cx(s.swHead, s.swGood)}>
              <TrendingUp aria-hidden="true" /> Das liegt dir
            </p>
            {sw.strengths.length ? (
              <ul className={s.swList}>
                {sw.strengths.map((k) => (
                  <li key={k}>{SKILL_LABELS[k]}</li>
                ))}
              </ul>
            ) : (
              <p className={s.small}>Noch keine klare Stärke – bleib dran!</p>
            )}
          </Card>
          <Card padding="md" className={s.swCard}>
            <p className={cx(s.swHead, s.swWeak)}>
              <TrendingDown aria-hidden="true" /> Hier lohnt sich Übung
            </p>
            {sw.weaknesses.length || weakTopics.length ? (
              <ul className={s.swLinks}>
                {sw.weaknesses.map((k) => (
                  <li key={k}>
                    <ListRow title={SKILL_LABELS[k]} subtitle={SKILL_PRACTICE[k].label} to={SKILL_PRACTICE[k].route} />
                  </li>
                ))}
                {weakTopics.map((id) => (
                  <li key={id}>
                    <ListRow title={titles.get(id)} subtitle="Grammatikthema" to={`/grammatik/${id}`} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.small}>Keine auffälligen Schwächen – stark!</p>
            )}
          </Card>
        </div>
      )}
      {sw.untested.length > 0 && (
        <p className={s.note}>Noch zu wenige Belege: {sw.untested.map((k) => SKILL_LABELS[k]).join(', ')}.</p>
      )}
    </Section>
  );
}

// ───────────────────────── XP & Aktivität ─────────────────────────

function XpHistory() {
  const days = useActivityDays(30);
  const today = useToday();
  const { goal } = useDailyGoal();
  const data: BarDatum[] = useMemo(
    () => days.map((d) => ({ day: d.day, xp: d.xp, label: `${Number(d.day.slice(8))}.`, isToday: d.day === today })),
    [days, today],
  );
  const total = days.reduce((n, d) => n + d.xp, 0);
  const avg = Math.round(total / Math.max(1, days.length));
  return (
    <Section title="XP-Verlauf" description={`Letzte 30 Tage · ${formatNumber(total)} XP · im Schnitt ${avg} XP pro Tag`}>
      <Card padding="md">
        <XpBarChart data={data} goal={goal} title="XP der letzten 30 Tage" showValues={false} labelEvery={5} height={180} />
      </Card>
    </Section>
  );
}

function ActivitySection() {
  const days = useActivityDays(84);
  const today = useToday();
  const { goal } = useDailyGoal();
  return (
    <Section title="Aktivitätskalender" description="Je kräftiger die Farbe, desto mehr XP an diesem Tag (gemessen an deinem Tagesziel).">
      <Card padding="md">
        <ActivityCalendar days={days} goal={goal} today={today} />
      </Card>
    </Section>
  );
}

// ───────────────────────── Themen ─────────────────────────

function TopicSection({ courseId, content, loading }: { courseId: CourseId; content: CourseContent | null; loading: boolean }) {
  const mastery = useTopicMastery(courseId);
  const [all, setAll] = useState(false);
  const rows = useMemo(() => {
    const titles = new Map((content?.grammar ?? []).map((g) => [g.id, g.title]));
    return Object.values(mastery)
      .filter((t) => titles.has(t.topicId))
      .map((t) => ({ ...t, title: titles.get(t.topicId)! }))
      .sort((a, b) => a.mastery - b.mastery || b.evidence - a.evidence);
  }, [mastery, content]);
  const shown = all ? rows : rows.slice(0, 8);

  return (
    <Section title="Themen-Beherrschung" action={<SectionLink to="/grammatik">Grammatik</SectionLink>}>
      {loading ? (
        <Skeleton height={48} lines={4} />
      ) : rows.length === 0 ? (
        <EmptyState compact icon={<BookOpen />} title="Noch keine Themen geübt" description="Sobald du Grammatikaufgaben löst, siehst du hier, wie sicher du jedes Thema beherrschst." />
      ) : (
        <Card padding="none">
          <ul className={s.topics}>
            {shown.map((t) => (
              <li key={t.topicId}>
                <Link to={`/grammatik/${t.topicId}`} className={s.topic}>
                  <span className={s.topicHead}>
                    <span className={s.topicTitle}>{t.title}</span>
                    <span className={s.topicPct}>{t.mastery} %</span>
                  </span>
                  <span className={s.topicBar} aria-hidden="true">
                    <span
                      className={cx(s.topicFill, t.mastery >= 85 ? s.fillGood : t.mastery >= 60 ? s.fillMid : s.fillLow)}
                      style={{ width: `${Math.max(2, t.mastery)}%` }}
                    />
                  </span>
                  <span className={s.topicMeta}>
                    {t.evidence} {t.evidence === 1 ? 'Antwort' : 'Antworten'} · {t.mastery >= 85 ? 'sicher' : t.mastery >= 60 ? 'auf gutem Weg' : 'üben lohnt sich'}
                  </span>
                  <ChevronRight className={s.topicChevron} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          {rows.length > 8 && (
            <div className={s.more}>
              <Button variant="ghost" onClick={() => setAll((v) => !v)} aria-expanded={all}>
                {all ? 'Weniger anzeigen' : `Alle ${rows.length} Themen anzeigen`}
              </Button>
            </div>
          )}
        </Card>
      )}
    </Section>
  );
}

// ───────────────────────── Prüfungen ─────────────────────────

const RESULT_KIND_LABEL: Record<ExamResult['kind'], string> = {
  ...EXAM_KIND_LABEL,
  placement: 'Einstufungstest',
  'song-boss': 'Song-Boss',
};

function ExamHistory({ courseId, content }: { courseId: CourseId; content: CourseContent | null }) {
  const rowsRaw = useList('examResults');
  const rows = useMemo(
    () => rowsRaw.map((r) => ({ id: r.id, ...r.data })).filter((r) => r.courseId === courseId).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15),
    [rowsRaw, courseId],
  );
  const titles = useMemo(() => new Map((content?.exams ?? []).map((e) => [e.id, e.title])), [content]);

  return (
    <Section title="Prüfungshistorie" action={<SectionLink to="/pruefungen">Prüfungen</SectionLink>}>
      {rows.length === 0 ? (
        <EmptyState compact icon={<GraduationCap />} title="Noch keine Prüfung abgelegt" description="Zwischentests und Abschlussprüfungen findest du im Lernpfad und in der Prüfungsübersicht." />
      ) : (
        <Card padding="none">
          <ul className={s.history}>
            {rows.map((r) => (
              <li key={r.id} className={s.historyRow}>
                <span className={s.historyText}>
                  <span className={s.historyTitle}>{titles.get(r.examId) ?? RESULT_KIND_LABEL[r.kind]}</span>
                  <span className={s.historyMeta}>
                    {RESULT_KIND_LABEL[r.kind]} · {formatDate(r.at)}
                  </span>
                </span>
                <span className={s.historyScore}>{Math.round(r.scorePct)} %</span>
                <Badge tone={r.passed ? 'success' : 'neutral'}>{r.passed ? 'bestanden' : 'nicht bestanden'}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}

// ───────────────────────── Aussprache ─────────────────────────

function PronSection({ courseId, content }: { courseId: CourseId; content: CourseContent | null }) {
  const list = useList('pronAttempts');
  const { attempts, issues } = useMemo(() => {
    const a = list.map((r) => r.data).filter((x) => x.courseId === courseId);
    return { attempts: a.length, issues: pronIssueSummary(a, courseId).slice(0, 6) };
  }, [list, courseId]);

  return (
    <Section
      title="Aussprache-Baustellen"
      action={<SectionLink to="/aussprache">Labor</SectionLink>}
      description="Grundlage ist die Verständlichkeit laut Spracherkennung bzw. deine Selbsteinschätzung – keine phonetische Analyse."
    >
      {attempts === 0 ? (
        <EmptyState compact icon={<AudioLines />} title="Noch keine Ausspracheversuche" description="Im Aussprache-Labor übst du Laute gezielt – danach siehst du hier deine Baustellen." action={<Button to="/aussprache" variant="secondary">Zum Labor</Button>} />
      ) : issues.length === 0 ? (
        <Card tone="success" padding="md">
          <p className={s.small}>Aktuell keine offenen Baustellen in deinen letzten Versuchen. Sehr gut!</p>
        </Card>
      ) : (
        <Card padding="none">
          <ul className={s.history}>
            {issues.map((i) => {
              const cat = content ? categoryForIssue(content, i.code) : null;
              return (
                <li key={i.code}>
                  <ListRow
                    leading={<span className={s.emoji}>{cat?.icon ?? '🗣️'}</span>}
                    title={cat?.title ?? `Problemstelle „${i.code}“`}
                    subtitle={`${i.count}× aufgefallen · Ø ${i.avgScore} % Verständlichkeit`}
                    to={cat ? `/aussprache/${cat.id}` : '/aussprache'}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </Section>
  );
}

// ───────────────────────── Lektionen ─────────────────────────

function LessonSection({ courseId, content, loading }: { courseId: CourseId; content: CourseContent | null; loading: boolean }) {
  const progress = useLessonProgress(courseId);
  const stats = useMemo(() => {
    const list = Object.values(progress).filter((p) => p.attempts > 0);
    const stars = list.reduce((n, p) => n + p.stars, 0);
    const perfect = list.filter((p) => p.bestScorePct >= 100).length;
    const avg = list.length ? Math.round(list.reduce((n, p) => n + p.bestScorePct, 0) / list.length) : 0;
    return { done: list.length, stars, perfect, avg };
  }, [progress]);
  const total = content?.lessons.length ?? 0;

  return (
    <Section title="Lektionen" action={<SectionLink to="/lernpfad">Lernpfad</SectionLink>}>
      {loading ? (
        <Skeleton height={96} radius={20} />
      ) : (
        <Card padding="lg" className={s.lessons}>
          <p className={s.lessonsBig}>
            <strong>{stats.done}</strong> von {total} verfügbaren Lektionen abgeschlossen
          </p>
          <ProgressBar value={total ? Math.min(1, stats.done / total) : 0} label="Abgeschlossene Lektionen" size="sm" />
          <ul className={s.lessonStats}>
            <li>
              <Star aria-hidden="true" /> {stats.stars} von {stats.done * 3} Sternen
            </li>
            <li>{stats.perfect} perfekt</li>
            <li>Ø Bestwert {stats.avg} %</li>
          </ul>
          {stats.done === 0 && (
            <Button to="/lernpfad" variant="secondary" iconRight={<ArrowRight />}>
              Erste Lektion starten
            </Button>
          )}
        </Card>
      )}
    </Section>
  );
}
