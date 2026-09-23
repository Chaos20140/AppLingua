import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AudioLines, BarChart3, BookOpen, Bot, BookMarked, Medal, NotebookPen, RotateCcw, Swords, Zap,
} from 'lucide-react';
import { useAiStatus } from '../../ai/client';
import { useCourseContent } from '../../content/registry';
import { useList } from '../../data/store';
import { weakTopics } from '../../engine/competence';
import type { ExamGate } from '../../engine/unlock';
import { Page } from '../../ui';
import { useBadges } from '../../state/badges';
import { useLanguageLevel, useTopicMastery, useUnlocks } from '../../state/progress';
import { useCards, useDueCards, useOpenErrors } from '../../state/review';
import { useActiveCourse } from '../../state/settings';
import { CourseSwitcher } from '../dashboard/CourseSwitcher';
import { cx } from '../dashboard/Section';
import { pronIssueSummary } from '../stats/statsLogic';
import s from './Practice.module.css';

type Tone = 'accent' | 'info' | 'success' | 'gold' | 'warning' | 'danger' | 'neutral';

interface TileDef {
  id: string;
  to: string;
  title: string;
  icon: ReactNode;
  tone: Tone;
  /** große Kennzahl oder kurzer Text */
  value: string;
  valueIsText?: boolean;
  caption: string;
  /** hervorheben (z. B. wenn etwas ansteht) */
  attention?: boolean;
}

export default function PracticeHubPage() {
  const courseId = useActiveCourse();
  const content = useCourseContent(courseId);
  const unlock = useUnlocks(courseId, content.data);
  const due = useDueCards(courseId);
  const cards = useCards(courseId);
  const mastery = useTopicMastery(courseId);
  const errors = useOpenErrors(courseId);
  const pronRows = useList('pronAttempts');
  const ai = useAiStatus();
  const lang = useLanguageLevel(courseId);
  const { earnedCount, total: badgeTotal } = useBadges();

  const pron = useMemo(() => {
    const attempts = pronRows.map((r) => r.data).filter((a) => a.courseId === courseId);
    return { attempts: attempts.length, issues: pronIssueSummary(attempts, courseId).length };
  }, [pronRows, courseId]);

  const weakest = useMemo(() => {
    const w = weakTopics(mastery)[0];
    if (!w) return null;
    const topic = content.data?.grammar.find((g) => g.id === w.topicId);
    return topic ? { id: topic.id, title: topic.title, mastery: w.mastery } : null;
  }, [mastery, content.data]);

  const exams = useMemo(() => {
    const gates = (unlock?.stages ?? []).flatMap((st) => [...st.midterms, st.final, st.boss].filter((g): g is ExamGate => !!g));
    return { open: gates.filter((g) => g.unlocked && !g.passed).length, passed: gates.filter((g) => g.passed).length };
  }, [unlock]);

  const grammarCount = content.data?.grammar.length ?? 0;
  const dueMin = Math.max(1, Math.round((due.length * 10) / 60));

  const tiles: TileDef[] = [
    {
      id: 'review', to: '/wiederholung', title: 'Wiederholung', icon: <RotateCcw />, tone: 'info',
      value: String(due.length), caption: due.length ? `fällig · ca. ${dueMin} Min.` : 'alles wiederholt – stark!', attention: due.length > 0,
    },
    {
      id: 'vocab', to: '/vokabeln', title: 'Vokabeltrainer', icon: <BookMarked />, tone: 'success',
      value: String(cards.length), caption: cards.length === 1 ? 'Karte in deiner Sammlung' : 'Karten in deiner Sammlung',
    },
    weakest
      ? {
          id: 'grammar', to: `/grammatik/${weakest.id}`, title: 'Grammatik', icon: <BookOpen />, tone: 'accent',
          value: weakest.title, valueIsText: true, caption: `schwächstes Thema · ${weakest.mastery} %`, attention: true,
        }
      : {
          id: 'grammar', to: '/grammatik', title: 'Grammatik', icon: <BookOpen />, tone: 'accent',
          value: grammarCount ? String(grammarCount) : '–', caption: grammarCount ? 'Themen mit Erklärung & Übungen' : 'Themen werden geladen',
        },
    {
      id: 'pron', to: '/aussprache', title: 'Aussprache-Labor', icon: <AudioLines />, tone: 'gold',
      value: pron.attempts ? String(pron.issues) : '–',
      caption: !pron.attempts ? 'noch nicht getestet' : pron.issues === 1 ? 'offene Baustelle' : pron.issues ? 'offene Baustellen' : 'keine offenen Baustellen',
      attention: pron.issues > 0,
    },
    {
      id: 'partner', to: '/partner', title: 'KI-Sprachpartner', icon: <Bot />, tone: 'info',
      value: ai.available ? 'Bereit' : 'Offline-Modus', valueIsText: true,
      caption: ai.available ? 'freie Gespräche mit Feedback' : 'geführte Übungsdialoge ohne KI',
    },
    {
      id: 'exams', to: '/pruefungen', title: 'Prüfungen & Boss', icon: <Swords />, tone: 'danger',
      value: String(exams.open), caption: `bereit · ${exams.passed} bestanden`, attention: exams.open > 0,
    },
    {
      id: 'errors', to: '/fehlerarchiv', title: 'Fehlerarchiv', icon: <NotebookPen />, tone: 'warning',
      value: String(errors.length), caption: errors.length === 1 ? 'offener Fehler' : errors.length ? 'offene Fehler' : 'nichts offen',
    },
    {
      id: 'stats', to: '/statistik', title: 'Statistik', icon: <BarChart3 />, tone: 'neutral',
      value: lang.level, valueIsText: true, caption: lang.provisional ? 'Sprachniveau · vorläufig' : 'Sprachniveau',
    },
    {
      id: 'badges', to: '/erfolge', title: 'Erfolge', icon: <Medal />, tone: 'gold',
      value: `${earnedCount}/${badgeTotal}`, caption: 'Abzeichen gesammelt',
    },
  ];

  return (
    <Page title="Üben" actions={<CourseSwitcher />} gap="lg" subtitle="Gezielt stärken, was dich weiterbringt.">
      <Link to="/wiederholung?schnell=1" className={s.quick} aria-label="Schnelle Runde, 5 Minuten: gemischte Wiederholung starten">
        <span className={s.quickIcon} aria-hidden="true">
          <Zap />
        </span>
        <span className={s.quickText}>
          <span className={s.quickTitle}>Schnelle Runde · 5&nbsp;Min.</span>
          <span className={s.quickSub}>Fällige Karten, Fehler und schwache Themen – gemischt für zwischendurch.</span>
        </span>
        <span className={s.quickGo} aria-hidden="true">
          Los
        </span>
      </Link>

      <ul className={s.grid}>
        {tiles.map((t, i) => (
          <li key={t.id} style={{ animationDelay: `${i * 35}ms` }} className={s.cell}>
            <Link to={t.to} className={cx(s.tile, s[t.tone], t.attention && s.attention)} aria-label={`${t.title}: ${t.value} ${t.caption}`}>
              <span className={s.tileIcon} aria-hidden="true">
                {t.icon}
              </span>
              <span className={s.tileTitle} aria-hidden="true">
                {t.title}
              </span>
              <span className={cx(s.tileValue, t.valueIsText && s.tileValueText)} aria-hidden="true">
                {t.value}
              </span>
              <span className={s.tileCaption} aria-hidden="true">
                {t.caption}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}
