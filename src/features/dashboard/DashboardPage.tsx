import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, Flame, Gift, GraduationCap, Info, Music2, RotateCcw, Sparkles, Sunrise, Target, Trophy,
} from 'lucide-react';
import type { CourseContent } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { SyncIndicator } from '../../app/SyncIndicator';
import { Badge, Button, Card, EmptyState, ErrorState, Page, ProgressBar, ProgressRing, Segmented, Skeleton, useToast } from '../../ui';
import { claimMission, useMissions, type MissionStatus } from '../../state/missions';
import { useDailyPlan } from '../../state/plan';
import {
  useCompetences, useDailyGoal, useLanguageLevel, useLevelInfo, useNextStep, useStreak, useWeekXp, type NextStep,
} from '../../state/progress';
import { useDueCards } from '../../state/review';
import { useActiveCourse, useProfile } from '../../state/settings';
import { useSongRecommendations } from '../../state/songs';
import { useAllSongs } from '../songs/catalog';
import { EXAM_KIND_LABEL } from '../exams/examLogic';
import { XpBarChart } from '../stats/charts';
import { SkillBars } from '../stats/SkillBars';
import { CourseSwitcher } from './CourseSwitcher';
import { dashboardSubline, greeting } from './greeting';
import { cx, Section, SectionLink } from './Section';
import s from './Dashboard.module.css';

export default function DashboardPage() {
  const courseId = useActiveCourse();
  const content = useCourseContent(courseId);
  const songsLookup = useAllSongs();
  const songs = songsLookup.loading || songsLookup.error ? null : songsLookup.songs;
  const profile = useProfile();
  const level = useLevelInfo();
  const goal = useDailyGoal();
  const streak = useStreak();
  const nextStep = useNextStep(courseId, content.data);
  const due = useDueCards(courseId);
  const plan = useDailyPlan(courseId, content.data, songs);
  const [hour] = useState(() => new Date().getHours());

  const title = greeting(hour, profile.displayName);
  const subline = dashboardSubline({
    hour, totalXp: level.totalXp, goalReached: goal.reached, goalXp: goal.goal, todayXp: goal.xp,
    streak: streak.current, todayDone: streak.todayDone,
  });

  return (
    <Page title="Start" largeTitle={false} actions={<CourseSwitcher />} gap="lg">
      <header className={s.greeting}>
        <p className={s.hello}>{title}</p>
        <p className={s.sub}>{subline}</p>
      </header>

      {plan?.comeback && (
        <Card tone="accent" className={s.comeback} aria-label="Willkommen zurück">
          <span className={s.comebackIcon} aria-hidden="true">
            <Sunrise />
          </span>
          <div className={s.comebackBody}>
            <p className={s.comebackTitle}>Willkommen zurück!</p>
            <p className={s.comebackText}>{plan.comeback.message}</p>
            <Button to={plan.items[0]?.route ?? '/wiederholung'} size="md" iconRight={<ArrowRight />}>
              Sanft wieder einsteigen
            </Button>
          </div>
        </Card>
      )}

      {content.error ? (
        <ErrorState title="Kursinhalte nicht geladen" message={content.error} onRetry={content.retry} />
      ) : content.loading || !content.data ? (
        <Skeleton height={196} radius={20} />
      ) : (
        <NextStepCard step={nextStep} content={content.data} />
      )}

      <TodayCard goal={goal} streak={streak} />

      <DueCard count={due.length} />

      <PlanSection plan={plan} loading={content.loading} failed={!!content.error} />

      <MissionsSection />

      <LevelSection courseId={courseId} />

      <WeekSection goalXp={goal.goal} />

      <CompetenceSection courseId={courseId} />

      <SongSection songs={songs} loading={songsLookup.loading} error={songsLookup.error} onRetry={songsLookup.retry} courseId={courseId} />

      <Section title="Speicherung & Sync">
        <div className={s.syncRow}>
          <SyncIndicator variant="compact" />
          <SectionLink to="/profil">Konto & Sync</SectionLink>
        </div>
      </Section>
    </Page>
  );
}

// ───────────────────────── Weiter lernen ─────────────────────────

function NextStepCard({ step, content }: { step: NextStep | null; content: CourseContent }) {
  if (!step) return <Skeleton height={196} radius={20} />;

  if (step.kind === 'lesson') {
    const l = step.lesson;
    const stage = content.stages.find((x) => x.id === step.stageId);
    const chapter = stage?.chapters.find((c) => c.lessonIds.includes(l.id));
    return (
      <Card tone="hero" padding="lg" className={s.hero} aria-label="Weiter lernen">
        <p className={s.heroEyebrow}>Weiter lernen · {stage?.short ?? ''}</p>
        <div className={s.heroMain}>
          <span className={s.heroIcon} aria-hidden="true">
            {l.icon}
          </span>
          <div className={s.heroText}>
            <h2 className={s.heroTitle}>{l.title}</h2>
            {l.subtitle && <p className={s.heroSub}>{l.subtitle}</p>}
          </div>
        </div>
        <p className={s.heroMeta}>
          {chapter ? `${chapter.title} · ` : ''}ca. {l.minutes} Min.
        </p>
        <Link to={`/lektion/${l.id}`} className={s.heroCta}>
          Lektion starten <ArrowRight aria-hidden="true" />
        </Link>
      </Card>
    );
  }

  if (step.kind === 'exam') {
    const e = step.exam;
    return (
      <Card tone="hero" padding="lg" className={s.hero} aria-label="Nächste Prüfung">
        <p className={s.heroEyebrow}>{EXAM_KIND_LABEL[e.kind]} bereit</p>
        <div className={s.heroMain}>
          <span className={s.heroIcon} aria-hidden="true">
            {e.boss?.emoji ?? (e.kind === 'final' ? '🎓' : '📝')}
          </span>
          <div className={s.heroText}>
            <h2 className={s.heroTitle}>{e.title}</h2>
            <p className={s.heroSub}>Bestehensgrenze {e.passPct} % · Wiederholen jederzeit möglich</p>
          </div>
        </div>
        <Link to={`/pruefung/${e.id}`} className={s.heroCta}>
          Zur Prüfung <ArrowRight aria-hidden="true" />
        </Link>
      </Card>
    );
  }

  return (
    <Card tone="success" padding="lg" className={s.doneCard} aria-label="Lernpfad-Status">
      <span className={s.doneIcon} aria-hidden="true">
        <Trophy />
      </span>
      <div>
        <h2 className={s.doneTitle}>Alles Verfügbare geschafft</h2>
        <p className={s.doneText}>{step.message}</p>
        <div className={s.btnRow}>
          <Button to="/wiederholung" size="md" icon={<RotateCcw />}>
            Wiederholen
          </Button>
          <Button to="/lernpfad" size="md" variant="secondary">
            Lernpfad ansehen
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ───────────────────────── Heute: Tagesziel & Serie ─────────────────────────

function TodayCard({ goal, streak }: { goal: ReturnType<typeof useDailyGoal>; streak: ReturnType<typeof useStreak> }) {
  return (
    <Card padding="lg" className={s.today} as="section" aria-label="Heute">
      <ProgressRing
        value={goal.ratio}
        size={104}
        label="Tagesziel"
        valueText={`${goal.xp} von ${goal.goal} XP`}
        tone={goal.reached ? 'success' : 'gold'}
      >
        <span className={s.ringInner}>
          <span className={s.ringValue}>{goal.xp}</span>
          <span className={s.ringUnit}>/ {goal.goal} XP</span>
        </span>
      </ProgressRing>
      <div className={s.todayText}>
        <p className={s.todayTitle}>{goal.reached ? 'Tagesziel erreicht' : 'Dein Tagesziel'}</p>
        <p className={s.todaySub}>
          {goal.reached ? 'Stark! Alles Weitere ist Bonus.' : `Noch ${Math.max(0, goal.goal - goal.xp)} XP – eine kurze Lektion bringt dich ein gutes Stück weiter.`}
        </p>
        <ul className={s.streaks}>
          <li className={cx(s.streak, streak.todayDone && s.streakOn)}>
            <Flame aria-hidden="true" />
            <span>
              <strong>{streak.current}</strong> {streak.current === 1 ? 'Tag' : 'Tage'} Serie
              <span className={s.streakHint}>{streak.todayDone ? ' · heute ✓' : streak.current > 0 ? ' · heute offen' : ''}</span>
            </span>
          </li>
          <li className={cx(s.streak, streak.songTodayDone && s.streakSong)}>
            <Music2 aria-hidden="true" />
            <span>
              <strong>{streak.songStreak}</strong> {streak.songStreak === 1 ? 'Tag' : 'Tage'} Song-Serie
            </span>
          </li>
        </ul>
        {streak.longest > 1 && <p className={s.record}>Rekord: {streak.longest} Tage</p>}
      </div>
    </Card>
  );
}

// ───────────────────────── Wiederholung ─────────────────────────

function DueCard({ count }: { count: number }) {
  if (count === 0) {
    return (
      <Card tone="muted" className={s.dueCard}>
        <span className={cx(s.dueIcon, s.dueIconDone)} aria-hidden="true">
          <Check />
        </span>
        <div className={s.dueText}>
          <p className={s.dueTitle}>Keine fälligen Wiederholungen</p>
          <p className={s.dueSub}>Neue Karten entstehen in Lektionen, Songs und aus deinen Fehlern.</p>
        </div>
      </Card>
    );
  }
  const minutes = Math.max(1, Math.round((count * 10) / 60));
  return (
    <Card to="/wiederholung" className={s.dueCard} aria-label={`${count} Wiederholungen fällig – jetzt wiederholen`}>
      <span className={s.dueIcon} aria-hidden="true">
        <RotateCcw />
      </span>
      <div className={s.dueText}>
        <p className={s.dueTitle}>
          {count} {count === 1 ? 'Karte' : 'Karten'} fällig
        </p>
        <p className={s.dueSub}>Jetzt auffrischen, bevor es verblasst – ca. {minutes} Min.</p>
      </div>
      <ArrowRight className={s.dueArrow} aria-hidden="true" />
    </Card>
  );
}

// ───────────────────────── Tagesplan ─────────────────────────

function PlanSection({ plan, loading, failed }: { plan: ReturnType<typeof useDailyPlan>; loading: boolean; failed: boolean }) {
  if (failed) return null;
  return (
    <Section
      title="Dein Plan für heute"
      action={plan ? <span className={s.planTime}>≈ {plan.totalMinutes} Min.</span> : undefined}
      description={plan?.headline}
    >
      {loading || !plan ? (
        <Skeleton height={64} lines={3} />
      ) : plan.items.length === 0 ? (
        <EmptyState compact icon={<Sparkles />} title="Heute ist alles erledigt" description="Du hast deinen Plan geschafft. Lust auf einen Song?" action={<Button to="/songs" variant="secondary">Songs entdecken</Button>} />
      ) : (
        <ol className={s.plan}>
          {plan.items.map((it, i) => (
            <li key={it.id}>
              <Link to={it.route} className={s.planItem}>
                <span className={s.planNum} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={s.planEmoji} aria-hidden="true">
                  {it.icon}
                </span>
                <span className={s.planText}>
                  <span className={s.planTitle}>{it.title}</span>
                  <span className={s.planSub}>{it.subtitle}</span>
                  <span className={s.planReason}>{it.reason}</span>
                </span>
                <span className={s.planMin}>{it.minutes} Min.</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

// ───────────────────────── Missionen ─────────────────────────

function MissionsSection() {
  const missions = useMissions();
  const toast = useToast();
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const items = period === 'daily' ? missions.daily : missions.weekly;
  const open = (list: MissionStatus[]) => list.filter((m) => m.completed && !m.claimed).length;

  const onClaim = (m: MissionStatus) => {
    const r = claimMission(m.id, m.periodKey);
    if (r.ok) toast(`Belohnung abgeholt: +${r.xp} XP`, { tone: 'success' });
    else toast(r.reason, { tone: 'error' });
  };

  const label = (text: string, n: number) => (n > 0 ? `${text} (${n})` : text);

  return (
    <Section
      title="Missionen"
      action={missions.claimable > 0 ? <Badge tone="gold" icon={<Gift />}>{missions.claimable} abholbereit</Badge> : undefined}
    >
      <Segmented
        label="Zeitraum der Missionen"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'daily', label: label('Täglich', open(missions.daily)) },
          { value: 'weekly', label: label('Wöchentlich', open(missions.weekly)) },
        ]}
      />
      <ul className={s.missions}>
        {items.map((m) => {
          const shown = Math.min(m.progress, m.target);
          return (
            <li key={m.rewardId} className={cx(s.mission, m.completed && s.missionDone, m.claimed && s.missionClaimed)}>
              <span className={s.mIcon} aria-hidden="true">
                {m.icon}
              </span>
              <div className={s.mBody}>
                <p className={s.mTitle}>{m.title}</p>
                <p className={s.mDesc}>{m.description}</p>
                <ProgressBar value={m.ratio} label={`${m.title}: ${shown} von ${m.target}`} size="sm" tone={m.completed ? 'success' : 'accent'} />
                <div className={s.mFoot}>
                  <span className={s.mMeta}>
                    {shown} / {m.target} · <span className={s.mXp}>+{m.xp} XP</span>
                  </span>
                  {m.claimed ? (
                    <span className={s.claimed}>
                      <Check aria-hidden="true" /> Abgeholt
                    </span>
                  ) : m.completed ? (
                    <Button size="md" icon={<Gift />} onClick={() => onClaim(m)}>
                      Belohnung abholen
                    </Button>
                  ) : (
                    <Link to={m.route} className={s.mGo} aria-label={`${m.title} – jetzt angehen`}>
                      Los <ArrowRight aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ───────────────────────── Spielerlevel & Sprachniveau ─────────────────────────

function LevelSection({ courseId }: { courseId: ReturnType<typeof useActiveCourse> }) {
  const level = useLevelInfo();
  const lang = useLanguageLevel(courseId);
  return (
    <Section title="Level & Niveau">
      <div className={s.levelGrid}>
        <Card to="/erfolge" className={s.levelCard} aria-label={`Spielerlevel ${level.level}, ${level.title}. Zur Level-Leiter`}>
          <p className={s.cardEyebrow}>
            <Sparkles aria-hidden="true" /> Spielerlevel
          </p>
          <p className={s.levelBig}>
            <span className={s.levelNum}>{level.level}</span>
            <span className={s.levelTitle}>{level.title}</span>
          </p>
          <ProgressBar
            value={level.progress}
            label="Fortschritt zum nächsten Level"
            valueText={level.maxed ? 'Maximallevel' : `${level.xpIntoLevel} / ${level.xpForLevel} XP`}
            tone="gold"
            size="sm"
          />
          <p className={s.levelHint}>
            {level.maxed ? 'Höchstes Level erreicht – Respekt!' : `Noch ${level.xpToNext} XP bis Level ${level.level + 1}`}
            {level.nextTitle && level.nextTitleLevel ? ` · ab Level ${level.nextTitleLevel}: „${level.nextTitle}“` : ''}
          </p>
        </Card>
        <Card to="/statistik" className={s.levelCard} aria-label={`Sprachniveau ${lang.level}${lang.provisional ? ', vorläufig' : ''}. Zur Statistik`}>
          <p className={s.cardEyebrow}>
            <GraduationCap aria-hidden="true" /> Sprachniveau
          </p>
          <p className={s.levelBig}>
            <span className={s.langNum}>{lang.level}</span>
            {lang.provisional && <Badge tone="warning">vorläufig</Badge>}
            {lang.isTrainingLevel && <Badge tone="info">Trainingsstufe</Badge>}
          </p>
          <p className={s.langBasis}>{lang.basis}</p>
        </Card>
      </div>
      <p className={s.explain}>
        <Info aria-hidden="true" />
        <span>
          <strong>Spielerlevel</strong> zeigt deinen Fleiß (gesammelte XP). <strong>Sprachniveau</strong> zeigt, was du in Prüfungen
          nachgewiesen hast – es steigt nur durch bestandene Abschlussprüfungen und Endgegner.
        </span>
      </p>
    </Section>
  );
}

// ───────────────────────── Woche ─────────────────────────

function WeekSection({ goalXp }: { goalXp: number }) {
  const week = useWeekXp();
  const total = week.reduce((n, d) => n + d.xp, 0);
  const goalDays = week.filter((d) => d.xp >= goalXp).length;
  return (
    <Section title="Diese Woche" action={<SectionLink to="/statistik">Statistik</SectionLink>}>
      <Card padding="md">
        <div className={s.weekHead}>
          <p className={s.weekTotal}>
            <strong>{total}</strong> XP in 7 Tagen
          </p>
          <p className={s.weekGoal}>
            <Target aria-hidden="true" /> Ziel an {goalDays} von 7 Tagen
          </p>
        </div>
        <XpBarChart data={week} goal={goalXp} title="XP der letzten 7 Tage" />
      </Card>
    </Section>
  );
}

// ───────────────────────── Kompetenzen ─────────────────────────

function CompetenceSection({ courseId }: { courseId: ReturnType<typeof useActiveCourse> }) {
  const comp = useCompetences(courseId);
  const hasData = Object.values(comp).some((c) => c.evidence > 0);
  return (
    <Section
      title="Deine Kompetenzen"
      action={<SectionLink to="/statistik" label="Kompetenzen im Detail">Details</SectionLink>}
      description={hasData ? undefined : 'Noch keine Daten – nach den ersten Übungen siehst du hier dein Kompetenzprofil.'}
    >
      <Card padding="lg">
        <SkillBars competences={comp} />
      </Card>
    </Section>
  );
}

// ───────────────────────── Song-Empfehlung ─────────────────────────

function SongSection({
  songs, loading, error, onRetry, courseId,
}: {
  songs: ReturnType<typeof useAllSongs>['songs'] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  courseId: ReturnType<typeof useActiveCourse>;
}) {
  const recs = useSongRecommendations(songs, courseId);
  const top = useMemo(() => recs[0] ?? null, [recs]);
  return (
    <Section title="Song-Tipp" action={<SectionLink to="/songs">Alle Songs</SectionLink>}>
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <Skeleton height={96} radius={20} />
      ) : !top ? (
        <EmptyState compact icon={<Music2 />} title="Noch keine passende Empfehlung" description="Stöbere in der Song-Bibliothek – Lernlieder passend zu deinem Niveau." action={<Button to="/songs" variant="secondary">Songs entdecken</Button>} />
      ) : (
        <Card to={`/songs/${top.song.id}`} padding="sm" className={s.song} aria-label={`Song-Tipp: ${top.song.title} von ${top.song.artist}`}>
          <span
            className={s.cover}
            style={{ background: `linear-gradient(135deg, ${top.song.cover.from}, ${top.song.cover.to})` }}
            aria-hidden="true"
          >
            {top.song.cover.emoji}
          </span>
          <span className={s.songText}>
            <span className={s.songTitle}>{top.song.title}</span>
            <span className={s.songArtist}>
              {top.song.artist} · {top.song.level}
            </span>
            {top.reasons[0] && <span className={s.songReason}>{top.reasons[0]}</span>}
          </span>
          <ArrowRight className={s.songArrow} aria-hidden="true" />
        </Card>
      )}
    </Section>
  );
}
