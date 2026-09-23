/**
 * Kompetenzen (7 Skills) und Themen-Beherrschung – berechnet aus Ereignissen.
 * Gewichteter, gleitender Mittelwert (neuere Belege zählen mehr) mit Vertrauensfaktor:
 * Erst mit ausreichend Belegen erreicht ein Skill seinen vollen Wert (0–100).
 */
import { SKILLS, type AnswerEvent, type CourseId, type ExamResult, type ExerciseContext, type PronAttempt, type Skill } from '../core/types';

export const SKILL_LABELS: Record<Skill, string> = {
  grammar: 'Grammatik',
  pronunciation: 'Aussprache',
  listening: 'Hörverstehen',
  speaking: 'Sprechen',
  reading: 'Leseverstehen',
  writing: 'Schreiben',
  vocabulary: 'Wortschatz',
};

/** Übungsvorschlag je Skill (Route + Text) für Schwächen. */
export const SKILL_PRACTICE: Record<Skill, { label: string; route: string }> = {
  grammar: { label: 'Grammatikzentrum', route: '/grammatik' },
  pronunciation: { label: 'Aussprache-Labor', route: '/aussprache' },
  listening: { label: 'Hörübungen in der Wiederholung', route: '/wiederholung' },
  speaking: { label: 'KI-Sprachpartner', route: '/partner' },
  reading: { label: 'Lektionen & Songs', route: '/lernpfad' },
  writing: { label: 'Fehlerarchiv & freie Antworten', route: '/fehlerarchiv' },
  vocabulary: { label: 'Vokabeltrainer', route: '/vokabeln' },
};

export interface SkillScore {
  /** 0–100 (inkl. Vertrauensfaktor) */
  score: number;
  /** Anzahl Belege */
  evidence: number;
  /** 0–100 gewichtete Trefferquote ohne Vertrauensfaktor */
  accuracy: number;
}

export type Competences = Record<Skill, SkillScore>;

export interface CompetenceInput {
  answers: readonly AnswerEvent[];
  pronAttempts?: readonly PronAttempt[];
  examResults?: readonly ExamResult[];
}

/** Gewichtung je Kontext (Prüfungen zählen stärker). */
const CONTEXT_WEIGHT: Record<ExerciseContext, number> = {
  lesson: 1, review: 1, grammar: 1, vocab: 1, pronunciation: 1, partner: 1,
  song: 0.8, exam: 1.5, boss: 1.5, placement: 1.2,
};

/** Gedächtnisfaktor je Beleg (≈ die letzten 50 Belege prägen den Wert). */
const DECAY = 0.98;
/** Summe der Gewichte, ab der ein Skill voll zählt. */
const FULL_CONFIDENCE_WEIGHT = 15;

interface Obs { at: string; skill: Skill; value: number; weight: number }

const answerValue = (a: AnswerEvent) =>
  100 * (typeof a.score === 'number' ? Math.max(0, Math.min(1, a.score)) : a.correct ? 1 : 0);

function observations(input: CompetenceInput, courseId?: CourseId): Obs[] {
  const obs: Obs[] = [];
  for (const a of input.answers) {
    if (courseId && a.courseId !== courseId) continue;
    const w = CONTEXT_WEIGHT[a.context] ?? 1;
    const value = answerValue(a);
    const skills = a.skills?.length ? a.skills : [];
    skills.forEach((skill, i) => {
      if (SKILLS.includes(skill)) obs.push({ at: a.at, skill, value, weight: i === 0 ? w : w * 0.5 });
    });
  }
  for (const p of input.pronAttempts ?? []) {
    if (courseId && p.courseId !== courseId) continue;
    const self = p.method === 'self-assessment';
    const value = Math.max(0, Math.min(100, p.scorePct));
    obs.push({ at: p.at, skill: 'pronunciation', value, weight: self ? 0.6 : 1 });
    obs.push({ at: p.at, skill: 'speaking', value, weight: self ? 0.3 : 0.5 });
  }
  for (const r of input.examResults ?? []) {
    if (courseId && r.courseId !== courseId) continue;
    if (r.kind === 'song-boss') continue;
    const w = r.kind === 'placement' ? 2 : 3;
    for (const [skill, v] of Object.entries(r.perSkill ?? {}) as [Skill, number][]) {
      if (SKILLS.includes(skill) && typeof v === 'number') obs.push({ at: r.at, skill, value: Math.max(0, Math.min(100, v)), weight: w });
    }
  }
  obs.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return obs;
}

export function emptyCompetences(): Competences {
  return Object.fromEntries(SKILLS.map((s) => [s, { score: 0, evidence: 0, accuracy: 0 }])) as Competences;
}

/** Kompetenzen 0–100 je Skill (optional nur für einen Kurs). */
export function computeCompetences(input: CompetenceInput, courseId?: CourseId): Competences {
  const acc = Object.fromEntries(SKILLS.map((s) => [s, { num: 0, den: 0, total: 0, n: 0 }])) as Record<Skill, { num: number; den: number; total: number; n: number }>;
  for (const o of observations(input, courseId)) {
    const a = acc[o.skill];
    a.num = a.num * DECAY + o.weight * o.value;
    a.den = a.den * DECAY + o.weight;
    a.total += o.weight;
    a.n += 1;
  }
  const out = emptyCompetences();
  for (const s of SKILLS) {
    const a = acc[s];
    if (!a.n || a.den <= 0) continue;
    const accuracy = a.num / a.den;
    const confidence = Math.min(1, a.total / FULL_CONFIDENCE_WEIGHT);
    out[s] = { score: Math.round(accuracy * confidence), evidence: a.n, accuracy: Math.round(accuracy) };
  }
  return out;
}

// ───────────────────────── Themen ─────────────────────────

export interface TopicMastery {
  topicId: string;
  /** 0–100 gleitende Trefferquote */
  mastery: number;
  evidence: number;
  correct: number;
  lastAt: string;
}

/** Beherrschung je Grammatik-/Themen-ID aus Antworten. */
export function computeTopicMastery(answers: readonly AnswerEvent[], courseId?: CourseId): Record<string, TopicMastery> {
  const sorted = answers
    .filter((a) => (!courseId || a.courseId === courseId) && a.topicIds?.length)
    .slice()
    .sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  const acc = new Map<string, { num: number; den: number; n: number; correct: number; lastAt: string }>();
  for (const a of sorted) {
    const v = answerValue(a);
    for (const t of a.topicIds) {
      const cur = acc.get(t) ?? { num: 0, den: 0, n: 0, correct: 0, lastAt: a.at };
      cur.num = cur.num * 0.9 + v;
      cur.den = cur.den * 0.9 + 1;
      cur.n += 1;
      if (a.correct) cur.correct += 1;
      cur.lastAt = a.at;
      acc.set(t, cur);
    }
  }
  const out: Record<string, TopicMastery> = {};
  for (const [topicId, a] of acc) {
    out[topicId] = { topicId, mastery: Math.round(a.num / a.den), evidence: a.n, correct: a.correct, lastAt: a.lastAt };
  }
  return out;
}

/** Schwache Themen (genügend Belege, Beherrschung unter Schwelle), schwächste zuerst. */
export function weakTopics(mastery: Record<string, TopicMastery>, opts: { minEvidence?: number; threshold?: number } = {}): TopicMastery[] {
  const minEvidence = opts.minEvidence ?? 3;
  const threshold = opts.threshold ?? 70;
  return Object.values(mastery)
    .filter((t) => t.evidence >= minEvidence && t.mastery < threshold)
    .sort((a, b) => a.mastery - b.mastery || b.evidence - a.evidence || a.topicId.localeCompare(b.topicId));
}

export interface StrengthsWeaknesses {
  strengths: Skill[];
  weaknesses: Skill[];
  /** Skills mit zu wenigen Belegen für eine Aussage */
  untested: Skill[];
  weakTopics: string[];
  strongTopics: string[];
}

export function strengthsAndWeaknesses(comp: Competences, topics: Record<string, TopicMastery> = {}): StrengthsWeaknesses {
  const tested = SKILLS.filter((s) => comp[s].evidence >= 5);
  const untested = SKILLS.filter((s) => comp[s].evidence < 5);
  const byScore = tested.slice().sort((a, b) => comp[b].score - comp[a].score || SKILLS.indexOf(a) - SKILLS.indexOf(b));
  const strengths = byScore.filter((s) => comp[s].score >= 60).slice(0, 3);
  const weaknesses = byScore
    .slice()
    .reverse()
    .filter((s) => comp[s].score < 60 && !strengths.includes(s))
    .slice(0, 3);
  const strongTopics = Object.values(topics)
    .filter((t) => t.evidence >= 3 && t.mastery >= 85)
    .sort((a, b) => b.mastery - a.mastery || a.topicId.localeCompare(b.topicId))
    .map((t) => t.topicId);
  return { strengths, weaknesses, untested, weakTopics: weakTopics(topics).map((t) => t.topicId), strongTopics };
}
