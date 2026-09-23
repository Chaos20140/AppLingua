import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Circle, Hourglass, Lock, MessageCircle, Mic, Star } from 'lucide-react';
import { useCourseContent } from '../../content/registry';
import type { Skill } from '../../core/types';
import { SKILL_LABELS } from '../../engine/competence';
import type { StageState } from '../../engine/unlock';
import { Badge, Button, Card, EmptyState, ErrorState, ListRow, Page, ProgressBar, RichText, Skeleton } from '../../ui';
import { useCompetences, useLessonProgress, useUnlocks } from '../../state/progress';
import { ttsLangFor, useActiveCourse, useVariant } from '../../state/settings';
import { cx, Section } from '../dashboard/Section';
import { EXAM_KIND_LABEL } from '../exams/examLogic';
import { LockedSheet } from './LockedSheet';
import { buildPathModel, isStageId, lockInfo, type ExamNode, type LockInfo, type PathNode } from './pathModel';
import { STAGE_STATE_LABEL, stageBadgeTone, TagList } from './pathUi';
import { worldStyle, worldTheme } from './worlds';
import s from './Stage.module.css';

export default function StagePage() {
  const { stageId } = useParams();
  const courseId = useActiveCourse();
  const variant = useVariant(courseId);
  const content = useCourseContent(courseId);
  const unlock = useUnlocks(courseId, content.data);
  const progress = useLessonProgress(courseId);
  const comp = useCompetences(courseId);
  const [sheet, setSheet] = useState<LockInfo | null>(null);

  const stars = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, p] of Object.entries(progress)) out[id] = p.stars;
    return out;
  }, [progress]);
  const worlds = useMemo(
    () => (content.data && unlock ? buildPathModel(content.data, unlock, stars) : null),
    [content.data, unlock, stars],
  );

  if (content.error) {
    return (
      <Page title="Etappe" back="/lernpfad">
        <ErrorState message={content.error} onRetry={content.retry} />
      </Page>
    );
  }
  if (!worlds) {
    return (
      <Page title="Etappe" back="/lernpfad">
        <Skeleton height={180} radius={24} />
        <Skeleton height={20} lines={4} />
        <Skeleton height={220} radius={20} />
      </Page>
    );
  }

  const wIdx = isStageId(stageId) ? worlds.findIndex((w) => w.stage.id === stageId) : -1;
  const world = wIdx >= 0 ? worlds[wIdx] : null;
  if (!world) {
    return (
      <Page title="Etappe" back="/lernpfad">
        <EmptyState
          title="Diese Etappe gibt es hier nicht"
          description="Vielleicht gehört der Link zu einem anderen Kurs. Im Lernpfad findest du alle Etappen deines aktiven Kurses."
          action={<Button to="/lernpfad">Zum Lernpfad</Button>}
        />
      </Page>
    );
  }

  const stage = world.stage;
  const st = world.status;
  const theme = worldTheme(stage);
  const state: StageState = st?.state ?? (stage.available ? 'locked' : 'coming-soon');
  const lang = ttsLangFor(variant);
  const openLock = (node: PathNode | null) => setSheet(lockInfo(worlds, wIdx, node));

  const exams: ExamNode[] = [
    ...world.chapters.flatMap((c) => c.nodes.filter((n): n is ExamNode => n.kind === 'exam')),
    ...world.finale,
  ];
  const finalNode = world.finale.find((n) => n.exam.kind === 'final');
  const bossNode = world.finale.find((n) => n.exam.kind === 'boss');
  const skillReqs = Object.entries(stage.mastery.minSkills ?? {}) as [Skill, number][];

  return (
    <Page title={stage.short} back="/lernpfad" gap="lg">
      <div style={worldStyle(theme)}>
      <Card padding="lg" className={s.hero} as="section" aria-labelledby="stage-title">
        <div className={s.heroHead}>
          <span className={s.heroEmoji} aria-hidden="true">
            {theme.emoji}
          </span>
          <div className={s.heroText}>
            <p className={s.eyebrow}>Welt {world.number}</p>
            <h2 id="stage-title" className={s.heroTitle}>
              {stage.title}
            </h2>
            <div className={s.badges}>
              <Badge tone={stageBadgeTone(state)}>{STAGE_STATE_LABEL[state]}</Badge>
              {st?.skipped && <Badge tone="info">Per Einstufung übersprungen</Badge>}
            </div>
          </div>
        </div>
        {st && st.lessonsTotal > 0 && (
          <ProgressBar value={st.progress} label="Lektionsfortschritt" showLabel valueText={`${st.lessonsDone} / ${st.lessonsTotal} Lektionen`} size="sm" />
        )}
        {stage.description && <RichText md={stage.description} targetLang={lang} className={s.desc} />}
        {state === 'coming-soon' && (
          <p className={s.soon}>
            <Hourglass aria-hidden="true" /> Die Lektionen dieser Etappe folgen in einem Update. Den Lehrplan siehst du schon hier.
          </p>
        )}
        {state === 'locked' && (
          <Button variant="secondary" icon={<Lock />} onClick={() => openLock(null)}>
            Was fehlt noch?
          </Button>
        )}
      </Card>
      </div>

      {stage.goals.length > 0 && (
        <Section title="Das wirst du können">
          <ul className={s.goals}>
            {stage.goals.map((g) => (
              <li key={g}>
                <CheckCircle2 aria-hidden="true" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(stage.grammarTopics.length > 0 || stage.vocabFields.length > 0) && (
        <div className={s.twoCol}>
          {stage.grammarTopics.length > 0 && (
            <Section title="Grammatikthemen">
              <TagList items={stage.grammarTopics} max={40} />
            </Section>
          )}
          {stage.vocabFields.length > 0 && (
            <Section title="Wortfelder">
              <TagList items={stage.vocabFields} max={40} />
            </Section>
          )}
        </div>
      )}

      {(stage.pronFocus.length > 0 || stage.dialogues.length > 0) && (
        <div className={s.twoCol}>
          {stage.pronFocus.length > 0 && (
            <Section title="Aussprache-Fokus">
              <ul className={s.iconList}>
                {stage.pronFocus.map((p) => (
                  <li key={p}>
                    <Mic aria-hidden="true" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {stage.dialogues.length > 0 && (
            <Section title="Dialoge & Situationen">
              <ul className={s.iconList}>
                {stage.dialogues.map((d) => (
                  <li key={d}>
                    <MessageCircle aria-hidden="true" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      <Section title="Kapitel & Lektionen">
        {world.chapters.length === 0 && <p className={s.muted}>Die Kapitel dieser Etappe werden gerade ausgearbeitet.</p>}
        <div className={s.chapters}>
          {world.chapters.map((ch) => (
            <Card key={ch.chapter.id} padding="none" className={s.chapter} as="section" aria-label={`Kapitel ${ch.number}: ${ch.chapter.title}`}>
              <div className={s.chapterHead}>
                <p className={s.eyebrow}>
                  Kapitel {ch.number}
                  {ch.lessonsTotal > 0 && ` · ${ch.lessonsDone}/${ch.lessonsTotal} erledigt`}
                </p>
                <h3 className={s.chapterTitle}>{ch.chapter.title}</h3>
                {ch.chapter.description && <p className={s.chapterDesc}>{ch.chapter.description}</p>}
              </div>
              {ch.planned ? (
                <p className={s.planned}>
                  <Hourglass aria-hidden="true" /> Lektionen folgen in einem Update.
                </p>
              ) : (
                <ul className={s.rows}>
                  {ch.nodes.map((n) => (
                    <li key={n.id}>
                      <NodeRow node={n} onLocked={openLock} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </Section>

      {exams.length > 0 && (
        <Section title="Prüfungen" description="Prüfungen kannst du so oft wiederholen, wie du willst – es zählt dein bester Versuch.">
          <Card padding="none">
            <ul className={s.rows}>
              {exams.map((n) => (
                <li key={n.id}>
                  <NodeRow node={n} onLocked={openLock} detailed />
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {stage.available && (
        <Section
          title="Meisterschaft"
          description="Diese Voraussetzungen öffnen die nächste Etappe und bestätigen dein Sprachniveau."
        >
          <Card padding="lg">
            <ul className={s.reqs}>
              <Requirement
                met={!!finalNode && finalNode.gate.passed && (finalNode.gate.bestPct ?? 0) >= stage.mastery.finalPct}
                text={`Abschlussprüfung mit mindestens ${Math.max(stage.mastery.finalPct, finalNode?.exam.passPct ?? 0)} %`}
                detail={finalNode ? (finalNode.gate.bestPct != null ? `Bestwert ${Math.round(finalNode.gate.bestPct)} %` : 'noch nicht versucht') : 'folgt in einem Update'}
              />
              <Requirement
                met={!!bossNode && bossNode.gate.passed && (bossNode.gate.bestPct ?? 0) >= stage.mastery.bossPct}
                text={`Endgegner${bossNode?.exam.boss ? ` „${bossNode.exam.boss.name}“` : ''} mit mindestens ${Math.max(stage.mastery.bossPct, bossNode?.exam.passPct ?? 0)} %`}
                detail={bossNode ? (bossNode.gate.bestPct != null ? `Bestwert ${Math.round(bossNode.gate.bestPct)} %` : 'noch nicht versucht') : 'folgt in einem Update'}
              />
              {skillReqs.map(([skill, min]) => {
                const cur = Math.round(comp[skill]?.score ?? 0);
                return (
                  <Requirement
                    key={skill}
                    met={cur >= min}
                    text={`${SKILL_LABELS[skill]}: mindestens ${min} Punkte`}
                    detail={`aktuell ${cur}`}
                  />
                );
              })}
            </ul>
            {st?.masteryMet && <p className={s.mastered}>Alle Voraussetzungen erfüllt – großartig!</p>}
          </Card>
        </Section>
      )}

      <LockedSheet info={sheet} onClose={() => setSheet(null)} />
    </Page>
  );
}

function Requirement({ met, text, detail }: { met: boolean; text: string; detail: string }) {
  return (
    <li className={cx(s.req, met && s.reqMet)}>
      {met ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
      <span>
        <span className={s.reqText}>{text}</span>
        <span className={s.reqDetail}>
          {met ? 'Erfüllt · ' : 'Offen · '}
          {detail}
        </span>
      </span>
    </li>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className={s.stars} aria-label={`${n} von 3 Sternen`} role="img">
      {[1, 2, 3].map((i) => (
        <Star key={i} className={i <= n ? s.starOn : s.starOff} aria-hidden="true" />
      ))}
    </span>
  );
}

function NodeRow({ node, onLocked, detailed = false }: { node: PathNode; onLocked: (n: PathNode) => void; detailed?: boolean }) {
  if (node.kind === 'lesson') {
    const l = node.lesson;
    const status = node.state === 'completed' ? 'Abgeschlossen' : node.state === 'available' ? (node.current ? 'Als Nächstes dran' : 'Verfügbar') : 'Gesperrt';
    return (
      <ListRow
        leading={<span className={cx(s.emoji, node.state === 'locked' && s.emojiLocked)}>{l.icon}</span>}
        title={l.title}
        subtitle={`ca. ${l.minutes} Min. · ${status}`}
        trailing={node.state === 'completed' ? <Stars n={node.stars} /> : node.state === 'locked' ? <Lock className={s.lockIcon} aria-hidden="true" /> : node.current ? <Badge tone="accent">Weiter</Badge> : undefined}
        to={node.state === 'locked' ? undefined : `/lektion/${l.id}`}
        onClick={node.state === 'locked' ? () => onLocked(node) : undefined}
        chevron={node.state !== 'locked'}
        aria-label={`${l.title}, ${status}${node.state === 'locked' ? ' – antippen zeigt, was noch fehlt' : ''}`}
      />
    );
  }
  const e = node.exam;
  const g = node.gate;
  const kind = EXAM_KIND_LABEL[e.kind];
  const glyph = e.kind === 'boss' ? e.boss?.emoji ?? '👑' : e.kind === 'final' ? '🎓' : '📝';
  const bits: string[] = [kind];
  if (g.passed) bits.push('bestanden');
  else if (!g.unlocked) bits.push('gesperrt');
  if (g.bestPct != null) bits.push(`Bestwert ${Math.round(g.bestPct)} %`);
  if (detailed && g.attempts > 0) bits.push(`${g.attempts} ${g.attempts === 1 ? 'Versuch' : 'Versuche'}`);
  if (detailed && !g.unlocked && g.lockedReason) bits.push(g.lockedReason);
  return (
    <ListRow
      leading={<span className={cx(s.emoji, !g.unlocked && s.emojiLocked)}>{glyph}</span>}
      title={e.kind === 'boss' && e.boss ? `${e.boss.name}` : e.title}
      subtitle={bits.join(' · ')}
      trailing={g.passed ? <Badge tone="success">Bestanden</Badge> : g.unlocked ? <Badge tone={e.kind === 'boss' ? 'gold' : 'accent'}>Offen</Badge> : <Lock className={s.lockIcon} aria-hidden="true" />}
      to={`/pruefung/${e.id}`}
      tone={e.kind === 'boss' ? 'gold' : 'default'}
    />
  );
}
