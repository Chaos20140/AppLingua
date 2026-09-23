/**
 * Lernpfad-Modell (reine Logik): Etappen → Kapitel → Knoten (Lektionen, Zwischentests,
 * Abschlussprüfung, Endgegner) inkl. Zustand, Sternen, aktuellem Knoten und Pfad-Geometrie.
 */
import type { Chapter, CourseContent, Exam, Lesson, Stage } from '../../content/types';
import { STAGE_ORDER, type StageId } from '../../core/types';
import type { ExamGate, LessonState, StageStatus, UnlockResult } from '../../engine/unlock';
import { orderedStageLessons } from '../../engine/unlock';

export type NodeState = 'locked' | 'available' | 'completed';

export interface LessonNode {
  kind: 'lesson';
  id: string;
  lesson: Lesson;
  state: NodeState;
  stars: number;
  current: boolean;
  /** laufende Nummer innerhalb der Etappe (für die Pfad-Kurve) */
  index: number;
}

export interface ExamNode {
  kind: 'exam';
  id: string;
  exam: Exam;
  gate: ExamGate;
  state: NodeState;
  current: boolean;
  index: number;
}

export type PathNode = LessonNode | ExamNode;

export interface ChapterBlock {
  chapter: Chapter;
  number: number;
  nodes: PathNode[];
  /** Kapitel ohne Lektionen: Inhalte folgen in einem Update */
  planned: boolean;
  lessonsDone: number;
  lessonsTotal: number;
}

export interface WorldBlock {
  stage: Stage;
  status: StageStatus | null;
  /** 1-basiert */
  number: number;
  chapters: ChapterBlock[];
  /** Abschlussprüfung + Endgegner */
  finale: ExamNode[];
}

const gateState = (g: ExamGate): NodeState => (g.passed ? 'completed' : g.unlocked ? 'available' : 'locked');

export function currentNodeId(unlock: UnlockResult | null): string | null {
  const step = unlock?.nextStep;
  if (!step) return null;
  if (step.kind === 'lesson') return step.lesson.id;
  if (step.kind === 'exam') return step.exam.id;
  return null;
}

export function buildPathModel(
  content: CourseContent,
  unlock: UnlockResult,
  stars: Readonly<Record<string, number | undefined>> = {},
): WorldBlock[] {
  const examById = new Map(content.exams.map((e) => [e.id, e]));
  const current = currentNodeId(unlock);
  const stages = content.stages.slice().sort((a, b) => STAGE_ORDER.indexOf(a.id) - STAGE_ORDER.indexOf(b.id));

  return stages.map((stage, sIdx) => {
    const status = unlock.stages.find((s) => s.stageId === stage.id) ?? null;
    const ordered = orderedStageLessons(content, stage);
    const byId = new Map(ordered.map((l) => [l.id, l]));
    const inChapter = new Set(stage.chapters.flatMap((c) => c.lessonIds));
    const extra = ordered.filter((l) => !inChapter.has(l.id));
    const chapters: Chapter[] = extra.length
      ? [...stage.chapters, { id: `${stage.id}.extra`, title: 'Weitere Lektionen', description: '', lessonIds: extra.map((l) => l.id) }]
      : stage.chapters;

    let index = 0;
    const lessonNode = (l: Lesson): LessonNode => {
      const st: LessonState = unlock.lessons[l.id] ?? 'locked';
      return { kind: 'lesson', id: l.id, lesson: l, state: st, stars: stars[l.id] ?? 0, current: current === l.id, index: index++ };
    };
    const examNode = (gate: ExamGate | null | undefined): ExamNode | null => {
      if (!gate) return null;
      const exam = examById.get(gate.examId);
      if (!exam) return null;
      return { kind: 'exam', id: exam.id, exam, gate, state: gateState(gate), current: current === exam.id, index: index++ };
    };

    const blocks: ChapterBlock[] = chapters.map((chapter, cIdx) => {
      const lessons = chapter.lessonIds.map((id) => byId.get(id)).filter((l): l is Lesson => !!l);
      const nodes: PathNode[] = lessons.map(lessonNode);
      const mid = examNode(status?.midterms.find((g) => g.chapterId === chapter.id));
      if (mid) nodes.push(mid);
      const lessonsDone = lessons.filter((l) => unlock.lessons[l.id] === 'completed').length;
      return { chapter, number: cIdx + 1, nodes, planned: lessons.length === 0, lessonsDone, lessonsTotal: lessons.length };
    });

    const finale: ExamNode[] = [];
    const fin = examNode(status?.final);
    if (fin) finale.push(fin);
    const boss = examNode(status?.boss);
    if (boss) finale.push(boss);
    return { stage, status, number: sIdx + 1, chapters: blocks, finale };
  });
}

/** Alle Knoten einer Welt in Lernreihenfolge. */
export const worldNodes = (w: WorldBlock): PathNode[] => [...w.chapters.flatMap((c) => c.nodes), ...w.finale];

// ───────────────────────── Sperr-Hinweise ─────────────────────────

export interface LockInfo {
  title: string;
  /** optionale Einleitung vor der Liste */
  intro?: string;
  reasons: string[];
}

/** Was fehlt noch, damit ein Knoten (oder eine ganze Welt) frei wird? */
export function lockInfo(worlds: readonly WorldBlock[], worldIdx: number, node: PathNode | null): LockInfo {
  const world = worlds[worldIdx];
  const prev = worldIdx > 0 ? worlds[worldIdx - 1] : null;
  const state = world?.status?.state;
  const name = node ? (node.kind === 'lesson' ? node.lesson.title : node.exam.title) : world?.stage.title ?? '';

  if (!world || state === 'coming-soon' || !world.stage.available) {
    return { title: name, reasons: ['Die Lektionen dieser Etappe folgen in einem Update. Den Lehrplan kannst du dir schon ansehen.'] };
  }
  if (state === 'locked') {
    const missing = prev?.status?.missing?.length ? prev.status.missing : ['Schließe zuerst die vorherige Etappe ab.'];
    const prevName = prev ? `„${prev.stage.short}“` : 'die vorherige Etappe';
    return { title: name, intro: `Diese Etappe öffnet sich, sobald ${prevName} gemeistert ist. Dafür fehlt noch:`, reasons: missing };
  }
  if (!node) return { title: name, reasons: world.status?.missing ?? [] };
  if (node.kind === 'exam') {
    return { title: name, reasons: [node.gate.lockedReason ?? 'Diese Prüfung ist noch gesperrt.'] };
  }
  const nodes = worldNodes(world).filter((n): n is LessonNode => n.kind === 'lesson');
  const pos = nodes.findIndex((n) => n.id === node.id);
  const before = pos > 0 ? nodes[pos - 1] : null;
  if (before && before.state !== 'completed') {
    return { title: name, reasons: [`Schließe zuerst die Lektion „${before.lesson.title}“ ab – die Lektionen bauen aufeinander auf.`] };
  }
  return { title: name, reasons: ['Schließe zuerst die vorherigen Lektionen dieser Etappe ab.'] };
}

// ───────────────────────── Geometrie ─────────────────────────

/** Relative Auslenkung (−1 … 1) der Knoten – ergibt eine sanft geschwungene Linie. */
const OFFSETS = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6];

export const offsetFor = (index: number): number => OFFSETS[((index % OFFSETS.length) + OFFSETS.length) % OFFSETS.length];

/** SVG-Pfad (kubische Bézierkurven) durch die Punkte. */
export function connectorPath(points: readonly { x: number; y: number }[]): string {
  if (!points.length) return '';
  const r = (n: number) => Math.round(n * 10) / 10;
  let d = `M ${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const my = (b.y - a.y) / 2;
    d += ` C ${r(a.x)} ${r(a.y + my)}, ${r(b.x)} ${r(b.y - my)}, ${r(b.x)} ${r(b.y)}`;
  }
  return d;
}

/** Index des letzten Knotens, bis zu dem der Pfad „begangen“ ist (abgeschlossen oder aktuell), sonst −1. */
export function progressIndex(nodes: readonly PathNode[]): number {
  let last = -1;
  nodes.forEach((n, i) => {
    if (n.state === 'completed' || n.current) last = i;
  });
  return last;
}

export const isStageId = (s: string | undefined): s is StageId => !!s && (STAGE_ORDER as string[]).includes(s);
