/**
 * Reine Logik für Prüfungen: Beschriftungen, weicher Timer, Abschnitts-Zuordnung,
 * Aufgabentexte für die Fehlerliste und Lernempfehlungen aus dem Ergebnis.
 */
import type { Exam, Exercise, GrammarTopic } from '../../content/types';
import type { Skill } from '../../core/types';
import { SKILL_LABELS, SKILL_PRACTICE } from '../../engine/competence';

export type ExamKind = Exam['kind'];

export const EXAM_KIND_LABEL: Record<ExamKind, string> = {
  midterm: 'Zwischentest',
  final: 'Abschlussprüfung',
  boss: 'Endgegner',
};

/** 75 → „1:15“, 3725 → „1:02:05“ */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Dauer in Worten: 90 → „2 Min.“, 30 → „30 Sek.“ */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  if (s < 60) return `${s} Sek.`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} Min.`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} Std. ${rest} Min.` : `${h} Std.`;
}

export interface SoftTimer {
  /** verbleibende Sekunden (null ohne Zeitlimit) */
  remaining: number | null;
  /** Richtzeit überschritten – man darf trotzdem in Ruhe fertig machen */
  overtime: boolean;
  label: string;
  /** Anteil der verbrauchten Richtzeit 0..1 (0 ohne Zeitlimit) */
  used: number;
}

export function softTimer(elapsedSec: number, limitSec?: number): SoftTimer {
  const elapsed = Math.max(0, Math.floor(elapsedSec));
  if (!limitSec || limitSec <= 0) return { remaining: null, overtime: false, label: formatClock(elapsed), used: 0 };
  const remaining = limitSec - elapsed;
  if (remaining >= 0) return { remaining, overtime: false, label: formatClock(remaining), used: elapsed / limitSec };
  return { remaining: 0, overtime: true, label: `+${formatClock(-remaining)}`, used: 1 };
}

export interface SectionInfo {
  index: number;
  title: string;
  skill: Skill;
}

/** Übungs-ID → Abschnitt (für die Anzeige während der Prüfung). */
export function sectionMap(exam: Exam): Map<string, SectionInfo> {
  const map = new Map<string, SectionInfo>();
  exam.sections.forEach((s, index) => {
    for (const ex of s.exercises) map.set(ex.id, { index, title: s.title, skill: s.skill });
  });
  return map;
}

/** Übungen der Prüfung, die zur Variante passen (Einträge mit abweichender Variante entfallen). */
export function examExercises(exam: Exam, variant: string): Exercise[] {
  return exam.sections.flatMap((s) => s.exercises).filter((e) => !e.variant || e.variant === variant);
}

const clip = (s: string, n = 110) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Kurzer, lesbarer Aufgabentext (Markdown bleibt erhalten, wird von RichText gerendert). */
export function exercisePromptText(ex: Exercise): string {
  switch (ex.type) {
    case 'mc': return clip(ex.prompt);
    case 'cloze': return clip(ex.sentence);
    case 'order': return clip(`Satz bauen: ${ex.german}`);
    case 'translate': return clip(`Übersetze: ${ex.source}`);
    case 'freeText': return clip(ex.prompt);
    case 'listening': return clip(ex.question);
    case 'dictation': return ex.german ? clip(`Diktat: ${ex.german}`) : 'Diktat';
    case 'speak': return clip(`Sprich nach: ${ex.text}`);
    case 'minimalPair': return clip(ex.hint || 'Aussprachevergleich');
    case 'fixError': return clip(`Korrigiere: ${ex.sentence}`);
    case 'dialogue': {
      const before = ex.lines[ex.gapIndex - 1];
      return before ? clip(`Dialog: ${before.speaker}: ${before.text}`) : 'Dialog vervollständigen';
    }
    case 'situation': return clip(ex.scenario);
    case 'imageMatch': return 'Bilder und Wörter zuordnen';
    case 'matchPairs': return 'Paare zuordnen';
    case 'conjugate': return clip(`${ex.verb} – ${ex.person} (${ex.tense})`);
    case 'speakFree': return clip(ex.prompt);
    case 'aiChat': return clip(ex.goal);
    default: return 'Aufgabe';
  }
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  route: string;
}

/**
 * Empfehlungen nach der Prüfung: schwache Kompetenzen (unter der Bestehensgrenze),
 * Grammatikthemen aus den Fehlern und – bei Fehlern – die Wiederholung.
 */
export function examRecommendations(input: {
  perSkill: Partial<Record<Skill, number>>;
  passPct: number;
  mistakes: readonly { exercise: Exercise }[];
  grammar: readonly Pick<GrammarTopic, 'id' | 'title'>[];
  max?: number;
}): Recommendation[] {
  const out: Recommendation[] = [];
  const seenRoutes = new Set<string>();
  const push = (r: Recommendation) => {
    if (seenRoutes.has(r.route)) return;
    seenRoutes.add(r.route);
    out.push(r);
  };

  const weakSkills = (Object.entries(input.perSkill) as [Skill, number | undefined][])
    .filter(([, v]) => typeof v === 'number' && v < input.passPct)
    .sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0));

  // Grammatikthemen aus den Fehlern (häufigste zuerst)
  const topicCount = new Map<string, number>();
  for (const m of input.mistakes) for (const t of m.exercise.topicIds ?? []) topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  const titles = new Map(input.grammar.map((g) => [g.id, g.title]));
  const topics = [...topicCount.entries()].filter(([id]) => titles.has(id)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [id, n] of topics.slice(0, 2)) {
    push({
      id: `topic:${id}`,
      title: `Grammatik: ${titles.get(id)}`,
      description: n === 1 ? 'Ein Fehler hing mit diesem Thema zusammen – eine kurze Auffrischung lohnt sich.' : `${n} Fehler hingen mit diesem Thema zusammen.`,
      route: `/grammatik/${id}`,
    });
  }

  for (const [skill, v] of weakSkills) {
    const p = SKILL_PRACTICE[skill];
    push({
      id: `skill:${skill}`,
      title: `${SKILL_LABELS[skill]} stärken`,
      description: `${Math.round(v ?? 0)} % in diesem Bereich – üben im ${p.label}.`,
      route: p.route,
    });
  }

  if (input.mistakes.length) {
    push({
      id: 'review',
      title: 'Fehler wiederholen',
      description: 'Deine Fehler landen im Fehlerarchiv und in der Wiederholung – so sitzen sie beim nächsten Versuch.',
      route: '/wiederholung',
    });
  }
  if (!out.some((r) => r.route.startsWith('/grammatik')) && weakSkills.some(([s]) => s === 'grammar' || s === 'writing')) {
    push({ id: 'grammar', title: 'Grammatikzentrum', description: 'Regeln nachschlagen und gezielt üben.', route: '/grammatik' });
  }
  return out.slice(0, input.max ?? 4);
}

/** Ermutigende Überschrift + Text zum Ergebnis. */
export function resultMessage(passed: boolean, scorePct: number, passPct: number, kind: ExamKind): { title: string; text: string } {
  if (passed) {
    if (scorePct >= 95) return { title: 'Herausragend!', text: 'Fast fehlerfrei – das sitzt richtig gut.' };
    if (kind === 'boss') return { title: 'Endgegner besiegt!', text: 'Du hast gezeigt, dass du die ganze Etappe beherrschst.' };
    return { title: 'Bestanden!', text: 'Stark gemacht. Die Erklärungen unten helfen dir, auch die letzten Lücken zu schließen.' };
  }
  const gap = Math.max(1, Math.ceil(passPct - scorePct));
  if (gap <= 10) return { title: 'Ganz knapp!', text: `Dir fehlen nur ${gap} Prozentpunkte. Mit einer kurzen Wiederholung klappt es beim nächsten Versuch.` };
  return {
    title: 'Noch nicht ganz – aber du weißt jetzt, woran es liegt',
    text: `Zum Bestehen brauchst du ${passPct} %. Sieh dir die Erklärungen zu deinen Fehlern an und übe die empfohlenen Themen – du kannst jederzeit neu starten.`,
  };
}
