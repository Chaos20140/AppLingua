import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Crown, Flame, Gauge, Lock, Sparkles, Star, Timer, Trophy, Zap } from 'lucide-react';
import { useCourseContent } from '../../content/registry';
import { MAX_LEVEL } from '../../engine/levels';
import type { BadgeCategory } from '../../engine/badges';
import { Card, EmptyState, Page, ProgressBar, ProgressRing, StatTile, Tabs } from '../../ui';
import { useBadges, type BadgeView } from '../../state/badges';
import { useLevelInfo, usePersonalRecords } from '../../state/progress';
import { useActiveCourse } from '../../state/settings';
import { cx, Section } from '../dashboard/Section';
import { formatClock } from '../exams/examLogic';
import { formatDate, formatDayKey } from '../stats/statsLogic';
import { prefersReducedMotion } from '../rewards/motion';
import { formatNumber, levelLadder } from './levelLadder';
import s from './Achievements.module.css';

type TabKey = 'badges' | 'records' | 'levels';

const CATEGORY_ORDER: BadgeCategory[] = ['Lernen', 'Serien', 'Level', 'Prüfungen', 'Aussprache', 'Wortschatz', 'Gespräche', 'Songs', 'Besonderes'];

export default function AchievementsPage() {
  const { badges, earnedCount, total } = useBadges();
  const level = useLevelInfo();
  const [tab, setTab] = useState<TabKey>('badges');

  return (
    <Page title="Erfolge" back gap="lg">
      <Card padding="lg" className={s.summary} as="section" aria-label="Überblick">
        <ProgressRing value={total ? earnedCount / total : 0} size={96} label="Abzeichen gesammelt" valueText={`${earnedCount} von ${total}`} tone="gold">
          <span className={s.ringInner}>
            <span className={s.ringValue}>{earnedCount}</span>
            <span className={s.ringUnit}>von {total}</span>
          </span>
        </ProgressRing>
        <div className={s.summaryText}>
          <p className={s.summaryTitle}>
            {earnedCount === 0 ? 'Deine Sammlung beginnt jetzt' : earnedCount === total ? 'Alle Abzeichen gesammelt!' : 'Abzeichen gesammelt'}
          </p>
          <p className={s.summarySub}>
            Level {level.level} · {level.title} · {formatNumber(level.totalXp)} XP
          </p>
        </div>
      </Card>

      <Tabs<TabKey>
        label="Bereich"
        idPrefix="erfolge"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'badges', label: 'Abzeichen' },
          { value: 'records', label: 'Rekorde' },
          { value: 'levels', label: 'Level-Leiter' },
        ]}
      />

      <div role="tabpanel" id={`erfolge-panel-${tab}`} aria-labelledby={`erfolge-tab-${tab}`} className={s.panel}>
        {tab === 'badges' && <BadgeGrid badges={badges} />}
        {tab === 'records' && <Records />}
        {tab === 'levels' && <LevelLadder current={level.level} totalXp={level.totalXp} />}
      </div>
    </Page>
  );
}

// ───────────────────────── Abzeichen ─────────────────────────

function BadgeGrid({ badges }: { badges: BadgeView[] }) {
  const groups = useMemo(() => {
    const map = new Map<BadgeCategory, BadgeView[]>();
    for (const b of badges) map.set(b.def.category, [...(map.get(b.def.category) ?? []), b]);
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, items: map.get(c)! }));
  }, [badges]);

  return (
    <div className={s.groups}>
      {groups.map((g) => {
        const earned = g.items.filter((b) => b.earned).length;
        return (
          <Section key={g.category} title={g.category} action={<span className={s.count}>{earned}/{g.items.length}</span>}>
            <ul className={s.badgeGrid}>
              {g.items.map((b) => (
                <BadgeTile key={b.def.id} badge={b} />
              ))}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}

function BadgeTile({ badge: b }: { badge: BadgeView }) {
  const { value, target, ratio } = b.progress;
  const shown = Math.min(value, target);
  return (
    <li className={cx(s.badge, b.earned ? s.badgeEarned : s.badgeLocked)}>
      <span className={s.badgeIcon} aria-hidden="true">
        <span className={s.badgeEmoji}>{b.def.icon}</span>
        {!b.earned && (
          <span className={s.badgeLock}>
            <Lock />
          </span>
        )}
      </span>
      <span className={s.badgeTitle}>{b.def.title}</span>
      <span className={s.badgeDesc}>
        {!b.earned && <span className="sr-only">Noch gesperrt: </span>}
        {b.def.description}
      </span>
      {b.earned ? (
        <span className={s.badgeDate}>
          <Check aria-hidden="true" /> {b.earnedAt ? `verdient am ${formatDate(b.earnedAt)}` : 'verdient'}
        </span>
      ) : (
        <span className={s.badgeProgress}>
          <ProgressBar value={ratio} label={`${b.def.title}: ${shown} von ${target}`} size="sm" tone="gold" />
          <span className={s.badgeProgText} aria-hidden="true">
            {shown} / {target}
          </span>
        </span>
      )}
    </li>
  );
}

// ───────────────────────── Rekorde ─────────────────────────

function Records() {
  const r = usePersonalRecords();
  const courseId = useActiveCourse();
  const content = useCourseContent(courseId);
  const fastestTitle = r.fastestLesson ? content.data?.lessons.find((l) => l.id === r.fastestLesson?.lessonId)?.title : undefined;
  const empty = !r.lessonsCompleted && !r.bestCombo && !r.mostXpDay && !r.longestStreak;

  if (empty) {
    return (
      <EmptyState
        icon={<Trophy />}
        title="Deine Rekorde entstehen beim Lernen"
        description="Schließe eine Lektion ab – dann siehst du hier deine längste Serie, deine beste Kombo und mehr."
      />
    );
  }

  return (
    <ul className={s.records}>
      <li>
        <StatTile label="Längste Serie" value={`${r.longestStreak} ${r.longestStreak === 1 ? 'Tag' : 'Tage'}`} icon={<Flame />} tone="accent" />
      </li>
      <li>
        <StatTile label="Beste Kombo" value={`${r.bestCombo}×`} icon={<Zap />} tone="gold" hint="richtige Antworten in Folge" />
      </li>
      <li>
        <StatTile
          label="Meiste XP an einem Tag"
          value={r.mostXpDay ? `${formatNumber(r.mostXpDay.xp)} XP` : '–'}
          icon={<Sparkles />}
          tone="gold"
          hint={r.mostXpDay ? formatDayKey(r.mostXpDay.day) : undefined}
        />
      </li>
      <li>
        <StatTile
          label="Schnellste Lektion"
          value={r.fastestLesson ? `${formatClock(r.fastestLesson.seconds)} Min.` : '–'}
          icon={<Timer />}
          tone="info"
          hint={fastestTitle}
        />
      </li>
      <li>
        <StatTile label="Perfekte Lektionen" value={r.perfectLessons} icon={<Star />} tone="success" hint="ohne einen Fehler" />
      </li>
      <li>
        <StatTile label="Lektionen abgeschlossen" value={r.lessonsCompleted} icon={<Gauge />} tone="neutral" />
      </li>
    </ul>
  );
}

// ───────────────────────── Level-Leiter ─────────────────────────

function LevelLadder({ current, totalXp }: { current: number; totalXp: number }) {
  const groups = useMemo(() => levelLadder(), []);
  const currentRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = currentRef.current;
    if (!el) return;
    const t = window.setTimeout(() => el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }), 120);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={s.ladder}>
      <p className={s.ladderIntro}>
        {MAX_LEVEL} Level, zwölf Titel. Level misst deinen Fleiß (XP) – dein Sprachniveau weist du separat in Prüfungen nach.
      </p>
      {groups.map((g) => {
        const isCurrent = current >= g.from && current <= g.to;
        const reached = current > g.to;
        return (
          <details key={g.from} className={cx(s.group, isCurrent && s.groupCurrent, reached && s.groupReached)} open={isCurrent}>
            <summary className={s.groupHead}>
              <span className={s.groupIcon} aria-hidden="true">
                {reached ? <Check /> : isCurrent ? <Crown /> : <Lock />}
              </span>
              <span className={s.groupText}>
                <span className={s.groupTitle}>{g.title}</span>
                <span className={s.groupRange}>
                  Level {g.from}–{g.to} · ab {formatNumber(g.steps[0].xp)} XP
                </span>
              </span>
              <span className={s.groupState}>{reached ? 'erreicht' : isCurrent ? 'aktuell' : ''}</span>
            </summary>
            <ol className={s.steps}>
              {g.steps.map((st) => {
                const done = st.level <= current;
                const here = st.level === current;
                return (
                  <li
                    key={st.level}
                    ref={here ? currentRef : undefined}
                    className={cx(s.step, done && s.stepDone, here && s.stepHere)}
                    aria-current={here ? 'step' : undefined}
                  >
                    <span className={s.stepLevel}>Level {st.level}</span>
                    <span className={s.stepXp}>{formatNumber(st.xp)} XP</span>
                    <span className={s.stepState}>
                      {here ? 'Du bist hier' : done ? <Check aria-label="erreicht" /> : `noch ${formatNumber(st.xp - totalXp)} XP`}
                    </span>
                  </li>
                );
              })}
            </ol>
          </details>
        );
      })}
    </div>
  );
}
