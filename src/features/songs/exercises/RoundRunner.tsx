/**
 * Laufende Song-Runde: Fortschritt, gemeinsame ExerciseView (Vertrag) und Abbrechen mit Rückfrage.
 * Speichert jede Antwort über useExerciseSession; das Ergebnis meldet onFinish genau einmal.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Flame, X } from 'lucide-react';
import type { ExerciseContext } from '../../../core/types';
import type { Song } from '../../../content/types';
import type { SessionSummary } from '../../exercises/contract';
import ExerciseView from '../../exercises/ExerciseView';
import { useExerciseSession } from '../../exercises/useExerciseSession';
import { Badge, Button, ConfirmDialog, EmptyState, IconButton, Page, ProgressBar } from '../../../ui';
import { exercisesOf, kindMeta, type SongExercise } from './generator';
import { KIND_ICON } from './kindIcons';
import s from './SongExercises.module.css';

export interface RoundRunnerProps {
  song: Song;
  items: SongExercise[];
  title: string;
  context: Extract<ExerciseContext, 'song' | 'boss'>;
  /** Prüfungsmodus (Boss): kein Feedback während der Runde */
  examMode?: boolean;
  onFinish: (summary: SessionSummary) => void;
  onCancel: () => void;
}

export function RoundRunner({ song, items, title, context, examMode = false, onFinish, onCancel }: RoundRunnerProps) {
  const exercises = useMemo(() => exercisesOf(items), [items]);
  const kindById = useMemo(() => new Map(items.map((i) => [i.exercise.id, i.kind])), [items]);
  const session = useExerciseSession({
    courseId: song.courseId,
    variant: song.variant,
    context,
    refId: song.id,
    exercises,
    awardXp: context === 'song',
  });
  const [confirm, setConfirm] = useState(false);
  const reported = useRef(false);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; });

  useEffect(() => {
    if (session.finished && session.summary && !reported.current) {
      reported.current = true;
      finishRef.current(session.summary);
    }
  }, [session.finished, session.summary]);

  const close = () => (session.index > 0 && !session.finished ? setConfirm(true) : onCancel());
  const cur = session.current;
  const kind = cur ? kindById.get(cur.id) : undefined;
  const KindIcon = kind && kind !== 'boss' ? KIND_ICON[kind] : Crown;
  const kindLabel = kind && kind !== 'boss' ? kindMeta(kind).label : 'Boss-Frage';

  return (
    <Page
      title={title}
      largeTitle={false}
      leading={<IconButton label="Runde beenden" icon={<X size={20} />} onClick={close} />}
    >
      {session.total === 0 ? (
        <EmptyState
          title="Keine Aufgaben in dieser Runde"
          description="Für diese Auswahl ließen sich gerade keine passenden Aufgaben erzeugen."
          action={<Button onClick={onCancel}>Zurück zur Auswahl</Button>}
        />
      ) : (
        <>
          <div className={s.runHead}>
            <div className={s.runRow}>
              <span className={s.runKind}>
                <KindIcon size={16} aria-hidden="true" /> {kindLabel}
              </span>
              <span className={s.runCount}>
                {!examMode && session.combo >= 3 && (
                  <Badge tone="gold" icon={<Flame size={12} aria-hidden="true" />}>{session.combo}er-Serie</Badge>
                )}{' '}
                <span aria-live="polite">Aufgabe {Math.min(session.index + 1, session.total)} von {session.total}</span>
              </span>
            </div>
            <ProgressBar value={session.index / session.total} label="Fortschritt der Runde" size="sm" />
          </div>
          {cur && (
            <div className={s.runBody} key={`${cur.id}:${session.index}`}>
              <ExerciseView
                exercise={cur}
                courseId={song.courseId}
                variant={song.variant}
                context={context}
                refId={song.id}
                examMode={examMode}
                onDone={session.submit}
              />
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { setConfirm(false); onCancel(); }}
        title="Runde beenden?"
        message={examMode
          ? 'Die Challenge wird nicht gewertet. Du kannst sie jederzeit neu starten.'
          : 'Deine bisherigen Antworten bleiben gespeichert, die Runde wird aber nicht ausgewertet.'}
        confirmLabel="Beenden"
        cancelLabel="Weitermachen"
      />
    </Page>
  );
}
