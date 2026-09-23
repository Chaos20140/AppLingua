/** Route /lektion/:lessonId – lädt Inhalte, prüft Freischaltung und startet den Lektionsablauf. */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, Lock, Map as MapIcon, SearchX } from 'lucide-react';
import { Button, EmptyState, ErrorState, Page, Skeleton } from '../../ui';
import type { CourseId } from '../../core/types';
import type { CourseContent, Lesson } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { orderedStageLessons } from '../../engine/unlock';
import { useLessonStatus } from '../../state/progress';
import { useActiveCourse, useVariant } from '../../state/settings';
import { LessonFlow } from './LessonFlow';
import s from './lesson.module.css';

const courseOf = (lessonId: string, fallback: CourseId): CourseId =>
  lessonId.startsWith('pt.') ? 'pt-BR' : lessonId.startsWith('es.') ? 'es' : fallback;

export default function LessonPage() {
  const { lessonId = '' } = useParams();
  const active = useActiveCourse();
  const courseId = courseOf(lessonId, active);
  const variant = useVariant(courseId);
  const { data: content, loading, error, retry } = useCourseContent(courseId);
  const status = useLessonStatus(courseId, content);
  const lesson = useMemo(() => content?.lessons.find((l) => l.id === lessonId) ?? null, [content, lessonId]);

  if (loading) return <LessonSkeleton />;
  if (error || !content) {
    return (
      <Page title="Lektion" back="/lernpfad">
        <ErrorState title="Lektion konnte nicht geladen werden" message={error ?? 'Die Inhalte sind gerade nicht erreichbar.'} onRetry={retry} />
      </Page>
    );
  }
  if (!lesson) {
    return (
      <Page title="Lektion" back="/lernpfad">
        <EmptyState
          icon={<SearchX />}
          title="Diese Lektion gibt es nicht"
          description="Vielleicht wurde der Link falsch kopiert. Im Lernpfad findest du alle Lektionen."
          action={<Button to="/lernpfad" icon={<MapIcon aria-hidden />}>Zum Lernpfad</Button>}
        />
      </Page>
    );
  }
  if (status[lesson.id] === 'locked') return <LockedLesson lesson={lesson} content={content} status={status} />;

  return <LessonFlow key={lesson.id} lesson={lesson} content={content} courseId={courseId} variant={variant} />;
}

function LockedLesson({ lesson, content, status }: { lesson: Lesson; content: CourseContent; status: Record<string, string> }) {
  const stage = content.stages.find((st) => st.id === lesson.stageId);
  const ordered = stage ? orderedStageLessons(content, stage) : [];
  const idx = ordered.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? ordered[idx - 1] : null;
  const prevOpen = prev && status[prev.id] !== 'completed';
  const firstOpen = ordered.find((l) => status[l.id] === 'available') ?? null;

  let description: string;
  if (stage && !stage.available) description = `Die Etappe „${stage.title}“ ist in Vorbereitung – die Inhalte folgen mit einem Update.`;
  else if (prevOpen && prev && status[prev.id] === 'available') description = `Schließe zuerst „${prev.title}“ ab. Danach geht es hier direkt weiter.`;
  else if (stage && firstOpen) description = `Lektionen bauen aufeinander auf. Schließe zuerst die Lektionen davor ab – als Nächstes ist „${firstOpen.title}“ dran.`;
  else if (stage) description = `Diese Lektion gehört zur Etappe „${stage.short}“. Sie wird frei, sobald du die vorherige Etappe abgeschlossen und ihre Prüfungen bestanden hast.`;
  else description = 'Diese Lektion wird freigeschaltet, sobald du die vorherigen Schritte im Lernpfad abgeschlossen hast.';

  const target = prevOpen && prev && status[prev.id] === 'available' ? prev : firstOpen;
  return (
    <Page title={lesson.title} back={`/lernpfad/${lesson.stageId}`} largeTitle={false}>
      <div className={s.locked}>
        <span className={s.lockedIcon} aria-hidden><Lock /></span>
        <span className={s.kicker}>{lesson.icon} Lektion {lesson.order}</span>
        <h2 className={s.phaseTitle}>Noch gesperrt – aber nicht mehr lange</h2>
        <p className={s.phaseSub}>{description}</p>
        <div className={s.lockedActions}>
          {target && (
            <Button size="lg" block to={`/lektion/${target.id}`} iconRight={<ArrowRight aria-hidden />}>
              Zu „{target.title}“
            </Button>
          )}
          <Button size="lg" block variant="secondary" to={`/lernpfad/${lesson.stageId}`} icon={<MapIcon aria-hidden />}>
            Zum Lernpfad
          </Button>
        </div>
      </div>
    </Page>
  );
}

function LessonSkeleton() {
  return (
    <Page title="Lektion" back="/lernpfad" largeTitle={false}>
      <div className={s.flow} aria-busy="true" aria-label="Lektion wird geladen">
        <Skeleton height={8} radius={4} />
        <Skeleton height={180} radius={20} />
        <Skeleton lines={3} />
        <Skeleton height={120} radius={20} />
      </div>
    </Page>
  );
}
