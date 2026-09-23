/**
 * Tagesplan: nächster Schritt im Lernpfad, fällige Wiederholungen, schwächstes Grammatikthema,
 * Aussprache-Problem und optional ein Song. Nach ≥ 3 Tagen Pause: sanfter Wiedereinstieg.
 */
import type { CourseId, PronAttempt } from '../core/types';
import type { CourseContent, PronCategory, Song } from '../content/types';
import type { TopicMastery } from './competence';
import { weakTopics } from './competence';
import { diffDays, type DayKey } from './dates';
import { frequentPronIssues } from './review';
import type { UnlockResult } from './unlock';

export type PlanItemKind = 'lesson' | 'exam' | 'review' | 'grammar' | 'pronunciation' | 'song';

export interface PlanItem {
  id: string;
  kind: PlanItemKind;
  icon: string;
  title: string;
  subtitle: string;
  /** warum dieser Punkt heute im Plan steht */
  reason: string;
  route: string;
  minutes: number;
}

export interface DailyPlan {
  goalXp: number;
  todayXp: number;
  goalReached: boolean;
  headline: string;
  comeback: { daysAway: number; message: string } | null;
  items: PlanItem[];
  totalMinutes: number;
}

export interface PlanInput {
  courseId: CourseId;
  content: CourseContent;
  unlock: UnlockResult;
  dueCount: number;
  topicMastery: Record<string, TopicMastery>;
  pronAttempts: readonly PronAttempt[];
  /** optionale Song-Empfehlung (bereits gefiltert/sortiert) */
  song?: { song: Song; reason?: string } | null;
  /** letzter aktiver Tag vor heute (oder null bei neuen Nutzern) */
  lastActiveBefore: DayKey | null;
  today: DayKey;
  dailyGoalXp: number;
  todayXp: number;
  /** hat der Nutzer überhaupt schon etwas gelernt? */
  hasHistory: boolean;
}

export const COMEBACK_AFTER_DAYS = 3;

/** Kategorie des Aussprache-Labors zu einem Problem-Code. */
export function categoryForIssue(content: CourseContent, code: string): PronCategory | null {
  const itemCat = new Map(content.pronItems.map((p) => [p.id, p]));
  let best: PronCategory | null = null;
  let bestHits = 0;
  for (const c of content.pronCategories) {
    const hits = c.itemIds.filter((id) => itemCat.get(id)?.issueCodes.includes(code)).length;
    if (hits > bestHits) { best = c; bestHits = hits; }
  }
  return best;
}

const roundTo5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function buildDailyPlan(input: PlanInput): DailyPlan {
  const { content, unlock } = input;
  const daysAway = input.lastActiveBefore ? diffDays(input.lastActiveBefore, input.today) : 0;
  const comebackMode = input.hasHistory && daysAway >= COMEBACK_AFTER_DAYS;
  const goalXp = comebackMode ? Math.max(20, roundTo5(input.dailyGoalXp / 2)) : input.dailyGoalXp;
  const items: PlanItem[] = [];

  // Wiederholung
  let reviewItem: PlanItem | null = null;
  if (input.dueCount > 0) {
    const n = comebackMode ? Math.min(10, input.dueCount) : input.dueCount;
    reviewItem = {
      id: 'review', kind: 'review', icon: '🔁',
      title: comebackMode ? `Sanfte Wiederholung: ${n} ${n === 1 ? 'Karte' : 'Karten'}` : `${n} ${n === 1 ? 'Karte' : 'Karten'} wiederholen`,
      subtitle: comebackMode ? 'Ein leichter Einstieg nach deiner Pause' : 'Fällig laut deinem Wiederholungsplan',
      reason: 'Wiederholen im richtigen Moment festigt Wörter im Langzeitgedächtnis.',
      route: '/wiederholung',
      minutes: Math.min(15, Math.max(2, Math.ceil(n * 0.3))),
    };
  }

  // Nächster Schritt im Lernpfad
  let pathItem: PlanItem | null = null;
  const step = unlock.nextStep;
  if (step.kind === 'lesson') {
    const stage = content.stages.find((s) => s.id === step.stageId);
    pathItem = {
      id: `lesson:${step.lesson.id}`, kind: 'lesson', icon: step.lesson.icon || '📘',
      title: step.lesson.title,
      subtitle: `${stage?.short ?? ''}${stage ? ' · ' : ''}Lektion ${step.lesson.order}${step.lesson.subtitle ? ` · ${step.lesson.subtitle}` : ''}`,
      reason: input.hasHistory ? 'Dein nächster Schritt im Lernpfad.' : 'Dein Einstieg – kurz, verständlich und ohne Vorwissen.',
      route: `/lektion/${step.lesson.id}`,
      minutes: step.lesson.minutes,
    };
  } else if (step.kind === 'exam') {
    const e = step.exam;
    pathItem = {
      id: `exam:${e.id}`, kind: 'exam', icon: e.kind === 'boss' ? (e.boss?.emoji ?? '🐉') : '📝',
      title: e.title,
      subtitle: e.kind === 'boss' ? 'Endgegner der Etappe' : e.kind === 'final' ? 'Abschlussprüfung' : 'Zwischentest',
      reason: e.kind === 'midterm' ? 'Kapitel geschafft – prüfe, was sitzt.' : 'Zeig, was du kannst – damit bestätigst du dein Niveau.',
      route: `/pruefung/${e.id}`,
      minutes: e.timeLimitSec ? Math.ceil(e.timeLimitSec / 60) : 10,
    };
  }

  // Schwächstes Grammatikthema (nur Themen dieses Kurses)
  let grammarItem: PlanItem | null = null;
  const topicById = new Map(content.grammar.map((g) => [g.id, g]));
  const weakest = weakTopics(input.topicMastery, { threshold: 75 }).find((t) => topicById.has(t.topicId));
  if (weakest) {
    const topic = topicById.get(weakest.topicId)!;
    grammarItem = {
      id: `grammar:${topic.id}`, kind: 'grammar', icon: '🧩',
      title: `Grammatik auffrischen: ${topic.title}`,
      subtitle: topic.summary,
      reason: `Zuletzt ${weakest.mastery} % richtig – ein kurzer Blick lohnt sich.`,
      route: `/grammatik/${topic.id}`,
      minutes: 5,
    };
  }

  // Aussprache-Problem
  let pronItem: PlanItem | null = null;
  const issues = frequentPronIssues(input.pronAttempts, { courseId: input.courseId });
  for (const issue of issues) {
    if (issue.count < 2) break;
    const cat = categoryForIssue(content, issue.code);
    if (!cat) continue;
    pronItem = {
      id: `pron:${cat.id}`, kind: 'pronunciation', icon: cat.icon || '🗣️',
      title: `Aussprache: ${cat.title}`,
      subtitle: 'Gezielt im Aussprache-Labor üben',
      reason: 'Hier hatte die Spracherkennung zuletzt öfter Mühe (Verständlichkeit, keine phonetische Analyse).',
      route: `/aussprache/${cat.id}`,
      minutes: 4,
    };
    break;
  }

  // Song
  let songItem: PlanItem | null = null;
  if (input.song) {
    const s = input.song.song;
    songItem = {
      id: `song:${s.id}`, kind: 'song', icon: s.cover.emoji || '🎵',
      title: `Song: ${s.title}`,
      subtitle: `${s.artist} · ${s.genre} · ${s.level}`,
      reason: input.song.reason ?? 'Lernen mit Musik – passend zu deinem Niveau.',
      route: `/songs/${s.id}`,
      minutes: Math.max(3, Math.round(s.durationMs / 60000) + 2),
    };
  }

  if (comebackMode) {
    // Sanft: erst Wiederholung, dann eine Lektion – höchstens drei Punkte
    for (const it of [reviewItem, pathItem, songItem ?? grammarItem]) if (it) items.push(it);
  } else {
    for (const it of [pathItem, reviewItem, grammarItem, pronItem, songItem]) if (it) items.push(it);
  }

  const goalReached = input.todayXp >= goalXp;
  let headline: string;
  if (comebackMode) headline = 'Schön, dass du wieder da bist!';
  else if (!input.hasHistory) headline = 'Los geht’s mit deiner ersten Lektion';
  else if (goalReached) headline = 'Tagesziel erreicht – alles Weitere ist Bonus';
  else headline = `Noch ${goalXp - input.todayXp} XP bis zu deinem Tagesziel`;

  return {
    goalXp,
    todayXp: input.todayXp,
    goalReached,
    headline,
    comeback: comebackMode
      ? {
        daysAway,
        message: `${daysAway} Tage Pause sind kein Problem – dein Wissen ist nicht weg. Wir starten sanft mit einer kurzen Wiederholung; dein Tagesziel ist heute auf ${goalXp} XP reduziert.`,
      }
      : null,
    items,
    totalMinutes: items.reduce((n, i) => n + i.minutes, 0),
  };
}
