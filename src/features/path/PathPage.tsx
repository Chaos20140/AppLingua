import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Check, Hourglass, Lock, Map as MapIcon, Star } from 'lucide-react';
import { useCourseContent } from '../../content/registry';
import type { Stage } from '../../content/types';
import type { StageState } from '../../engine/unlock';
import { Badge, Button, Card, ErrorState, Page, ProgressBar, RichText, Skeleton } from '../../ui';
import { useLessonProgress, useUnlocks } from '../../state/progress';
import { ttsLangFor, useActiveCourse, useVariant } from '../../state/settings';
import { CourseSwitcher, courseName } from '../dashboard/CourseSwitcher';
import { cx, SectionLink } from '../dashboard/Section';
import { EXAM_KIND_LABEL } from '../exams/examLogic';
import { prefersReducedMotion } from '../rewards/motion';
import { LockedSheet } from './LockedSheet';
import {
  buildPathModel, connectorPath, currentNodeId, lockInfo, offsetFor, progressIndex, worldNodes,
  type LockInfo, type PathNode, type WorldBlock,
} from './pathModel';
import { STAGE_STATE_LABEL, stageBadgeTone, TagList } from './pathUi';
import { worldStyle, worldTheme } from './worlds';
import s from './Path.module.css';

/** Horizontale Auslenkung der Knoten in px. */
const AMP = 60;
/** Zeilenhöhe eines Knotens in px; Kreismitte liegt bei ROW_CY. */
const ROW = 112;
const ROW_CY = 64;

interface SheetState {
  info: LockInfo;
  action: { label: string; to: string } | null;
}

export default function PathPage() {
  const courseId = useActiveCourse();
  const content = useCourseContent(courseId);
  const unlock = useUnlocks(courseId, content.data);
  const progress = useLessonProgress(courseId);
  const stars = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, p] of Object.entries(progress)) out[id] = p.stars;
    return out;
  }, [progress]);
  const worlds = useMemo(
    () => (content.data && unlock ? buildPathModel(content.data, unlock, stars) : null),
    [content.data, unlock, stars],
  );
  const [sheet, setSheet] = useState<SheetState | null>(null);

  // Automatisch zum aktuellen Knoten scrollen (einmal je Kurs)
  const currentRef = useRef<HTMLElement | null>(null);
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!worlds || scrolledFor.current === courseId) return;
    scrolledFor.current = courseId;
    const el = currentRef.current;
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }, 250);
    return () => window.clearTimeout(t);
  }, [worlds, courseId]);

  const currentAction = useMemo(() => {
    const step = unlock?.nextStep;
    if (step?.kind === 'lesson') return { label: `Zur aktuellen Lektion: ${step.lesson.title}`, to: `/lektion/${step.lesson.id}` };
    if (step?.kind === 'exam') return { label: `Zur Prüfung: ${step.exam.title}`, to: `/pruefung/${step.exam.id}` };
    return null;
  }, [unlock]);

  const openLock = (wIdx: number, node: PathNode | null) => {
    if (!worlds) return;
    setSheet({ info: lockInfo(worlds, wIdx, node), action: currentAction });
  };

  const totals = useMemo(() => {
    if (!unlock) return null;
    const open = unlock.stages.filter((st) => st.state !== 'coming-soon');
    return {
      done: open.reduce((n, st) => n + st.lessonsDone, 0),
      total: open.reduce((n, st) => n + st.lessonsTotal, 0),
    };
  }, [unlock]);

  return (
    <Page title="Lernpfad" actions={<CourseSwitcher />} gap="lg" subtitle={`${courseName(courseId)} – deine Reise in Welten und Etappen`}>
      {content.error ? (
        <ErrorState title="Lernpfad nicht geladen" message={content.error} onRetry={content.retry} />
      ) : !worlds ? (
        <PathSkeleton />
      ) : (
        <>
          {totals && totals.total > 0 && (
            <Card padding="md" className={s.summary}>
              <MapIcon className={s.summaryIcon} aria-hidden="true" />
              <div className={s.summaryText}>
                <p className={s.summaryTitle}>
                  {totals.done} von {totals.total} Lektionen geschafft
                </p>
                <ProgressBar value={totals.total ? totals.done / totals.total : 0} label="Fortschritt im Lernpfad" size="sm" />
              </div>
            </Card>
          )}

          {worlds.map((w, wIdx) => (
            <World
              key={w.stage.id}
              world={w}
              onLocked={(node) => openLock(wIdx, node)}
              currentRef={currentRef}
              currentId={currentNodeId(unlock)}
            />
          ))}

          <p className={s.footNote}>
            Neue Etappen und Lektionen kommen mit Updates dazu. Alles Freigeschaltete kannst du jederzeit wiederholen.
          </p>
        </>
      )}

      <LockedSheet info={sheet?.info ?? null} action={sheet?.action} onClose={() => setSheet(null)} />
    </Page>
  );
}

function PathSkeleton() {
  return (
    <div className={s.skeleton} aria-busy="true" aria-label="Lernpfad wird geladen">
      <Skeleton height={88} radius={20} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={s.skelRow} style={{ ['--x' as string]: `${offsetFor(i) * AMP}px` } as CSSProperties}>
          <Skeleton circle width={72} height={72} />
        </div>
      ))}
    </div>
  );
}

// ───────────────────────── Welt ─────────────────────────

function World({
  world, onLocked, currentRef, currentId,
}: {
  world: WorldBlock;
  onLocked: (node: PathNode | null) => void;
  currentRef: RefObject<HTMLElement | null>;
  currentId: string | null;
}) {
  const theme = worldTheme(world.stage);
  const st = world.status;
  const state: StageState = st?.state ?? (world.stage.available ? 'locked' : 'coming-soon');
  const comingSoon = state === 'coming-soon';
  const headId = `world-${world.stage.id}`;
  const hasCurrent = !!currentId && worldNodes(world).some((n) => n.id === currentId);

  return (
    <section className={cx(s.world, comingSoon && s.worldSoon)} style={worldStyle(theme)} aria-labelledby={headId}>
      <header className={s.worldHead}>
        <span className={s.worldEmoji} aria-hidden="true">
          {theme.emoji}
        </span>
        <div className={s.worldText}>
          <p className={s.worldEyebrow}>
            Welt {world.number} · {world.stage.short}
          </p>
          <h2 id={headId} className={s.worldTitle}>
            {theme.name}
          </h2>
          <div className={s.worldBadges}>
            <Badge tone={stageBadgeTone(state)}>{STAGE_STATE_LABEL[state]}</Badge>
            {st?.skipped && <Badge tone="info">Per Einstufung übersprungen</Badge>}
            {hasCurrent && <Badge tone="gold">Du bist hier</Badge>}
          </div>
        </div>
      </header>

      {!comingSoon && st && st.lessonsTotal > 0 && (
        <ProgressBar
          value={st.progress}
          label={`Fortschritt ${world.stage.short}`}
          showLabel
          valueText={`${st.lessonsDone} / ${st.lessonsTotal} Lektionen`}
          size="sm"
        />
      )}

      <div className={s.worldActions}>
        {state === 'locked' && (
          <Button variant="secondary" size="md" icon={<Lock />} onClick={() => onLocked(null)}>
            Was fehlt noch?
          </Button>
        )}
        <SectionLink to={`/lernpfad/${world.stage.id}`} label={`Details zu ${world.stage.title}`}>
          {comingSoon ? 'Kompletter Lehrplan' : 'Etappe im Detail'}
        </SectionLink>
      </div>

      {comingSoon ? (
        <Curriculum stage={world.stage} />
      ) : (
        <>
          {world.chapters.map((ch) => (
            <div key={ch.chapter.id} className={s.chapter}>
              <div className={s.chapterHead}>
                <p className={s.chapterNo}>
                  Kapitel {ch.number}
                  {ch.lessonsTotal > 0 && (
                    <span className={s.chapterCount}>
                      {' '}
                      · {ch.lessonsDone}/{ch.lessonsTotal}
                    </span>
                  )}
                </p>
                <h3 className={s.chapterTitle}>{ch.chapter.title}</h3>
                {ch.chapter.description && <p className={s.chapterDesc}>{ch.chapter.description}</p>}
              </div>
              {ch.planned ? (
                <p className={s.planned}>
                  <Hourglass aria-hidden="true" /> Dieses Kapitel ist geplant – die Lektionen folgen in einem Update.
                </p>
              ) : (
                <Track nodes={ch.nodes} onLocked={onLocked} currentRef={currentRef} />
              )}
            </div>
          ))}
          {world.finale.length > 0 && (
            <div className={s.chapter}>
              <div className={s.chapterHead}>
                <p className={s.chapterNo}>Etappenfinale</p>
                <h3 className={s.chapterTitle}>Abschlussprüfung & Endgegner</h3>
                <p className={s.chapterDesc}>Bestehe beide, um dein Sprachniveau nachzuweisen und die nächste Welt zu öffnen.</p>
              </div>
              <Track nodes={world.finale} onLocked={onLocked} currentRef={currentRef} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ───────────────────────── Pfad mit Knoten ─────────────────────────

function Track({
  nodes, onLocked, currentRef,
}: {
  nodes: PathNode[];
  onLocked: (node: PathNode) => void;
  currentRef: RefObject<HTMLElement | null>;
}) {
  const points = nodes.map((n, i) => ({ x: offsetFor(n.index) * AMP, y: i * ROW + ROW_CY }));
  const height = nodes.length * ROW;
  const pi = progressIndex(nodes);
  return (
    <ol className={s.track} style={{ height }}>
      <svg className={s.connector} width="2" height={height} aria-hidden="true" focusable="false">
        {nodes.length > 1 && <path d={connectorPath(points)} className={s.lineBase} />}
        {pi > 0 && <path d={connectorPath(points.slice(0, pi + 1))} className={s.lineDone} />}
      </svg>
      {nodes.map((n) => (
        <li key={n.id} className={s.row}>
          <NodeButton node={n} x={offsetFor(n.index) * AMP} onLocked={onLocked} currentRef={currentRef} />
        </li>
      ))}
    </ol>
  );
}

function nodeLabel(n: PathNode): { title: string; meta: string; aria: string; to: string } {
  const stateText = n.state === 'completed' ? 'abgeschlossen' : n.state === 'available' ? 'verfügbar' : 'gesperrt';
  if (n.kind === 'lesson') {
    const l = n.lesson;
    const meta = n.state === 'completed' ? 'Abgeschlossen' : n.state === 'locked' ? 'Gesperrt' : `ca. ${l.minutes} Min.`;
    const aria = `Lektion: ${l.title}. ${stateText}.` +
      (n.state === 'completed' ? ` ${n.stars} von 3 Sternen.` : '') +
      (n.current ? ' Hier geht es weiter.' : '') +
      (n.state === 'locked' ? ' Antippen zeigt, was noch fehlt.' : '');
    return { title: l.title, meta, aria, to: `/lektion/${l.id}` };
  }
  const kind = EXAM_KIND_LABEL[n.exam.kind];
  const best = n.gate.bestPct;
  const meta = n.state === 'completed'
    ? `Bestanden · ${Math.round(best ?? 0)} %`
    : n.state === 'locked'
      ? `${kind} · gesperrt`
      : best != null ? `${kind} · Bestwert ${Math.round(best)} %` : kind;
  const title = n.exam.kind === 'boss' && n.exam.boss ? n.exam.boss.name : n.exam.title;
  // Sichtbaren Titel verwenden (Label-in-Name) und die Art nicht doppeln („Zwischentest: Zwischentest: …“).
  const named = title.toLowerCase().startsWith(kind.toLowerCase()) ? title : `${kind}: ${title}`;
  const aria = `${named}. ${n.state === 'completed' ? 'bestanden' : stateText}.` +
    (best != null ? ` Bestwert ${Math.round(best)} Prozent.` : '') +
    (n.current ? ' Hier geht es weiter.' : '') +
    (n.state === 'locked' ? ' Antippen zeigt, was noch fehlt.' : '');
  return { title, meta, aria, to: `/pruefung/${n.exam.id}` };
}

function NodeButton({
  node, x, onLocked, currentRef,
}: {
  node: PathNode;
  x: number;
  onLocked: (node: PathNode) => void;
  currentRef: RefObject<HTMLElement | null>;
}) {
  const { title, meta, aria, to } = nodeLabel(node);
  const isExam = node.kind === 'exam';
  const isBoss = isExam && node.exam.kind === 'boss';
  const glyph = node.kind === 'lesson'
    ? node.lesson.icon
    : node.exam.kind === 'boss' ? node.exam.boss?.emoji ?? '👑' : node.exam.kind === 'final' ? '🎓' : '📝';
  const classes = cx(
    s.node,
    s[node.state],
    node.current && s.current,
    isExam && s.exam,
    isBoss && s.boss,
    x > 0 ? s.labelLeft : s.labelRight,
  );
  const style = { ['--x' as string]: `${x}px` } as CSSProperties;
  const setRef = (el: HTMLElement | null) => {
    if (node.current) currentRef.current = el;
  };

  const inner = (
    <>
      {node.current && (
        <span className={s.bubble} aria-hidden="true">
          {isExam ? 'Bereit!' : 'Weiter'}
        </span>
      )}
      <span className={s.circle} aria-hidden="true">
        <span className={s.glyph}>{glyph}</span>
        {node.state === 'completed' && (
          <span className={s.check}>
            <Check />
          </span>
        )}
        {node.state === 'locked' && (
          <span className={s.lock}>
            <Lock />
          </span>
        )}
      </span>
      <span className={s.label} aria-hidden="true">
        <span className={s.labelTitle}>{title}</span>
        <span className={s.labelMeta}>{meta}</span>
        {node.kind === 'lesson' && node.state === 'completed' && (
          <span className={s.stars}>
            {[1, 2, 3].map((i) => (
              <Star key={i} className={i <= node.stars ? s.starOn : s.starOff} />
            ))}
          </span>
        )}
      </span>
    </>
  );

  if (node.state === 'locked') {
    return (
      <button type="button" ref={setRef} className={classes} style={style} aria-label={aria} onClick={() => onLocked(node)}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to} ref={setRef} className={classes} style={style} aria-label={aria}>
      {inner}
    </Link>
  );
}

// ───────────────────────── Lehrplan (Etappe ohne Inhalte) ─────────────────────────

function Curriculum({ stage }: { stage: Stage }) {
  const variant = useVariant(stage.courseId);
  return (
    <Card tone="muted" padding="lg" className={s.curriculum}>
      <p className={s.soon}>
        <Hourglass aria-hidden="true" /> Lektionen folgen in einem Update
      </p>
      {stage.description && <RichText md={stage.description} targetLang={ttsLangFor(variant)} className={s.curDesc} />}
      {stage.goals.length > 0 && (
        <div className={s.curBlock}>
          <h3 className={s.curTitle}>Das wirst du können</h3>
          <ul className={s.curList}>
            {stage.goals.slice(0, 4).map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        </div>
      )}
      {stage.chapters.length > 0 && (
        <div className={s.curBlock}>
          <h3 className={s.curTitle}>Kapitel</h3>
          <ol className={s.curChapters}>
            {stage.chapters.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong>
                {c.description && <span> – {c.description}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {stage.grammarTopics.length > 0 && (
        <div className={s.curBlock}>
          <h3 className={s.curTitle}>Grammatik</h3>
          <TagList items={stage.grammarTopics} />
        </div>
      )}
      {stage.vocabFields.length > 0 && (
        <div className={s.curBlock}>
          <h3 className={s.curTitle}>Wortfelder</h3>
          <TagList items={stage.vocabFields} />
        </div>
      )}
    </Card>
  );
}
