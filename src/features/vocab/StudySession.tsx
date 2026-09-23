/** Lernrunde im Vokabeltrainer: Karteikarten, Schreiben oder Hören – mit Zusammenfassung. */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, Sparkles } from 'lucide-react';
import type { CourseId, SrsCard } from '../../core/types';
import { cardId, type SrsGrade } from '../../engine/srs';
import { uid } from '../../data/store';
import { completeReviewSession, reviewCard } from '../../state/actions';
import { Badge, Button, ProgressBar, ProgressRing } from '../../ui';
import { Flashcard, TypeCard } from './Flashcard';
import type { StudyMode } from './vocabUtils';
import s from './Study.module.css';

export const MODE_LABEL: Record<StudyMode, string> = { flash: 'Karteikarten', write: 'Schreiben', listen: 'Hören' };

export interface StudySessionProps {
  courseId: CourseId;
  mode: StudyMode;
  cards: SrsCard[];
  /** true = fällige Karten, Bewertungen werden eingeplant (reviewCard); false = freies Üben */
  schedule: boolean;
  lang: string;
  strictAccents: boolean;
  onExit: () => void;
  /** neue Runde (z. B. mit weiteren fälligen Karten) */
  onRestart: () => void;
}

interface Attempt { card: SrsCard; grade: SrsGrade }

export function StudySession({ courseId, mode, cards, schedule, lang, strictAccents, onExit, onRestart }: StudySessionProps) {
  const [queue, setQueue] = useState<SrsCard[]>(cards);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [finished, setFinished] = useState(false);
  const [reward, setReward] = useState<{ xp: number; bonus: number } | null>(null);
  const requeued = useRef(new Set<string>());
  const sessionId = useMemo(() => uid(), []);
  const completed = useRef(false);

  const current = queue[index] ?? null;

  const finish = useCallback((list: Attempt[]) => {
    setFinished(true);
    if (!schedule || completed.current || !list.length) return;
    completed.current = true;
    const correct = list.filter((a) => a.grade >= 1).length;
    const res = completeReviewSession({ courseId, sessionId, correct, total: list.length });
    setReward({ xp: res.xp, bonus: res.bonus });
  }, [courseId, schedule, sessionId]);

  const grade = useCallback((g: SrsGrade) => {
    if (!current) return;
    const key = current.itemId;
    const isRepeat = requeued.current.has(key);
    let nextQueue = queue;
    let nextAttempts = attempts;
    if (!isRepeat) {
      if (schedule) reviewCard(cardId(current.courseId, current.itemId), g);
      nextAttempts = [...attempts, { card: current, grade: g }];
      setAttempts(nextAttempts);
      if (g === 0) {
        // „Nochmal“: am Ende dieser Runde noch einmal üben (ohne erneute Einplanung)
        requeued.current.add(key);
        nextQueue = [...queue, current];
        setQueue(nextQueue);
      }
    }
    const nextIndex = index + 1;
    if (nextIndex >= nextQueue.length) finish(nextAttempts);
    else setIndex(nextIndex);
  }, [attempts, current, finish, index, queue, schedule]);

  if (finished || !current) {
    const total = attempts.length;
    const known = attempts.filter((a) => a.grade >= 1).length;
    const again = attempts.filter((a) => a.grade === 0);
    const pct = total ? Math.round((known / total) * 100) : 0;
    return (
      <div className={s.summary}>
        <div className={s.summaryHead}>
          <ProgressRing value={total ? known / total : 0} label="Gewusst" size={112} tone={pct >= 80 ? 'success' : 'accent'}>
            <span className={s.ringValue}>{pct}&nbsp;%</span>
          </ProgressRing>
          <h2 className={s.summaryTitle}>{pct >= 90 ? 'Hervorragend!' : pct >= 60 ? 'Starke Runde!' : 'Dranbleiben lohnt sich!'}</h2>
          <p className={s.summaryText}>
            {total} {total === 1 ? 'Karte' : 'Karten'} · {known} gewusst · {again.length} nochmal
          </p>
          {reward && reward.xp > 0 && (
            <Badge tone="gold" solid icon={<Sparkles size={14} />}>
              +{reward.xp} XP{reward.bonus > 0 ? ' inkl. Genauigkeitsbonus' : ''}
            </Badge>
          )}
          {!schedule && <p className={s.muted}>Freies Üben – dein Wiederholungsplan bleibt unverändert.</p>}
        </div>

        {again.length > 0 && (
          <section aria-labelledby="study-again" className={s.againBox}>
            <h3 id="study-again" className={s.h3}>Diese Karten kommen bald wieder</h3>
            <ul className={s.againList}>
              {again.map((a) => (
                <li key={a.card.itemId}>
                  <span lang={lang} className={s.againFront}>{a.card.front}</span>
                  <span className={s.againBack}>{a.card.back}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={s.summaryActions}>
          <Button block size="lg" icon={<RotateCcw size={18} />} onClick={onRestart}>Weitere Runde</Button>
          <Button block variant="secondary" icon={<Check size={18} />} onClick={onExit}>Zur Übersicht</Button>
        </div>
      </div>
    );
  }

  const repeatRound = requeued.current.has(current.itemId) && index >= cards.length;
  return (
    <div className={s.session}>
      <div className={s.progressRow}>
        <ProgressBar value={index / queue.length} label="Fortschritt der Runde" size="sm" />
        <span className={s.counter} aria-hidden="true">{Math.min(index + 1, queue.length)} / {queue.length}</span>
      </div>
      {repeatRound && <p className={s.repeatNote}>Noch einmal – diesmal klappt’s!</p>}
      {mode === 'flash' ? (
        <Flashcard key={`${current.itemId}:${index}`} card={current} lang={lang} onGrade={grade} showIntervals={schedule && !repeatRound} />
      ) : (
        <TypeCard
          key={`${current.itemId}:${index}`}
          card={current}
          lang={lang}
          mode={mode}
          strictAccents={strictAccents}
          onDone={(g) => grade(g)}
          showIntervals={schedule && !repeatRound}
        />
      )}
    </div>
  );
}
