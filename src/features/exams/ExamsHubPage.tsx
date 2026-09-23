import { useMemo } from 'react';
import { Hourglass, Lock } from 'lucide-react';
import { useCourseContent } from '../../content/registry';
import type { Exam } from '../../content/types';
import type { ExamGate } from '../../engine/unlock';
import { Badge, Card, ErrorState, ListRow, Page, Skeleton } from '../../ui';
import { useUnlocks } from '../../state/progress';
import { useActiveCourse } from '../../state/settings';
import { CourseSwitcher } from '../dashboard/CourseSwitcher';
import { cx, Section } from '../dashboard/Section';
import { worldStyle, worldTheme } from '../path/worlds';
import { EXAM_KIND_LABEL } from './examLogic';
import s from './ExamsHub.module.css';

export default function ExamsHubPage() {
  const courseId = useActiveCourse();
  const content = useCourseContent(courseId);
  const unlock = useUnlocks(courseId, content.data);
  const examById = useMemo(() => new Map((content.data?.exams ?? []).map((e) => [e.id, e])), [content.data]);

  const stats = useMemo(() => {
    const gates = (unlock?.stages ?? []).flatMap((st) => [...st.midterms, st.final, st.boss].filter((g): g is ExamGate => !!g));
    return {
      passed: gates.filter((g) => g.passed).length,
      open: gates.filter((g) => g.unlocked && !g.passed).length,
      total: gates.length,
    };
  }, [unlock]);

  return (
    <Page title="Prüfungen & Boss" back="/ueben" actions={<CourseSwitcher />} gap="lg">
      <p className={s.intro}>
        Zwischentests prüfen ein Kapitel, die Abschlussprüfung die ganze Etappe. Der Endgegner ist die finale Herausforderung – erst
        beide zusammen bestätigen dein Sprachniveau. Wiederholen kannst du jederzeit.
      </p>

      {content.error ? (
        <ErrorState message={content.error} onRetry={content.retry} />
      ) : !content.data || !unlock ? (
        <>
          <Skeleton height={72} radius={16} />
          <Skeleton height={240} radius={20} />
        </>
      ) : (
        <>
          <div className={s.stats} role="group" aria-label="Überblick">
            <p className={s.stat}>
              <span className={s.statNum}>{stats.passed}</span>
              <span className={s.statLabel}>bestanden</span>
            </p>
            <p className={s.stat}>
              <span className={s.statNum}>{stats.open}</span>
              <span className={s.statLabel}>bereit</span>
            </p>
            <p className={s.stat}>
              <span className={s.statNum}>{stats.total}</span>
              <span className={s.statLabel}>insgesamt</span>
            </p>
          </div>

          {content.data.stages.map((stage, i) => {
            const st = unlock.stages.find((x) => x.stageId === stage.id);
            const theme = worldTheme(stage);
            const gates = st ? [...st.midterms, st.final, st.boss].filter((g): g is ExamGate => !!g) : [];
            return (
              <div key={stage.id} style={worldStyle(theme)}>
                <Section title={stage.title} eyebrow={`${theme.emoji} Welt ${i + 1}`}>
                  {!stage.available ? (
                    <p className={s.soon}>
                      <Hourglass aria-hidden="true" /> Die Prüfungen dieser Etappe erscheinen zusammen mit ihren Lektionen in einem Update.
                    </p>
                  ) : gates.length === 0 ? (
                    <p className={s.soon}>
                      <Hourglass aria-hidden="true" /> Für diese Etappe sind noch keine Prüfungen verfügbar.
                    </p>
                  ) : (
                    <Card padding="none" className={s.list}>
                      <ul>
                        {gates.map((g) => {
                          const exam = examById.get(g.examId);
                          return exam ? (
                            <li key={g.examId}>
                              <ExamRow exam={exam} gate={g} />
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </Card>
                  )}
                </Section>
              </div>
            );
          })}
        </>
      )}
    </Page>
  );
}

function ExamRow({ exam, gate }: { exam: Exam; gate: ExamGate }) {
  const isBoss = exam.kind === 'boss';
  const glyph = isBoss ? exam.boss?.emoji ?? '👑' : exam.kind === 'final' ? '🎓' : '📝';
  const meta: string[] = [EXAM_KIND_LABEL[exam.kind], `ab ${exam.passPct} %`];
  if (gate.bestPct != null) meta.push(`Bestwert ${Math.round(gate.bestPct)} %`);
  if (gate.attempts > 0) meta.push(`${gate.attempts} ${gate.attempts === 1 ? 'Versuch' : 'Versuche'}`);
  const subtitle = !gate.unlocked && gate.lockedReason ? `${meta.join(' · ')} – ${gate.lockedReason}` : meta.join(' · ');
  return (
    <ListRow
      leading={<span className={cx(s.glyph, !gate.unlocked && s.glyphLocked)}>{glyph}</span>}
      title={isBoss && exam.boss ? `${exam.boss.name}` : exam.title}
      subtitle={subtitle}
      trailing={
        gate.passed ? (
          <Badge tone="success">Bestanden</Badge>
        ) : gate.unlocked ? (
          <Badge tone={isBoss ? 'gold' : 'accent'}>Bereit</Badge>
        ) : (
          <Lock className={s.lock} aria-label="Gesperrt" />
        )
      }
      to={`/pruefung/${exam.id}`}
      tone={isBoss ? 'gold' : 'default'}
    />
  );
}
