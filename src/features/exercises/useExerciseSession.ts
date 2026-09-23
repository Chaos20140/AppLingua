/**
 * useExerciseSession – steuert eine Folge von Übungen (Lektion, Wiederholung, Grammatik, Songs …):
 * Variantenfilter, Speicherung jeder Antwort (recordAnswer inkl. Kombo/XP), Kombo/Bestkombo,
 * XP-Summe, Teilpunkte, Kompetenzen, optionale Wiederholungsrunde und Auswertung.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ExerciseContext } from '../../core/types';
import type { ExerciseOutcome } from '../../engine/grading';
import { recordAnswer } from '../../state/actions';
import type { ExerciseSession, SessionOptions } from './contract';
import { applyAnswer, filterByVariant, initSession, nextCombo, sessionKey, summarize, type SessionState } from './sessionLogic';

const NO_XP_CONTEXTS: ExerciseContext[] = ['exam', 'boss', 'placement'];

export function useExerciseSession(opts: SessionOptions): ExerciseSession {
  const { exercises: raw, variant } = opts;
  const exercises = useMemo(() => filterByVariant(raw, variant), [raw, variant]);
  const key = sessionKey(exercises, variant);

  const [state, setState] = useState<SessionState>(() => initSession(exercises, key, Date.now()));
  const stateRef = useRef(state);
  const optsRef = useRef(opts);
  useLayoutEffect(() => {
    optsRef.current = opts;
    stateRef.current = state;
  });

  // Neue Übungsliste → Sitzung neu beginnen (Muster „Zustand beim Rendern anpassen“)
  let current = state;
  if (state.key !== key) {
    current = initSession(exercises, key, Date.now());
    stateRef.current = current;
    setState(current);
  }

  const submit = useCallback((outcome: ExerciseOutcome) => {
    const s = stateRef.current;
    const exercise = s.queue[s.index];
    if (!exercise || s.finishedAt !== null) return;
    const o = optsRef.current;
    const combo = nextCombo(s, outcome);
    let xp = 0;
    try {
      const res = recordAnswer({
        courseId: o.courseId,
        exercise,
        outcome,
        context: o.context,
        refId: o.refId,
        combo,
        awardXp: o.awardXp ?? !NO_XP_CONTEXTS.includes(o.context),
      });
      xp = res.xp;
    } catch (err) {
      // Speichern fehlgeschlagen: Sitzung trotzdem fortsetzen (ehrlich: keine XP gezählt)
      console.error('Antwort konnte nicht gespeichert werden', err);
    }
    const next = applyAnswer(s, outcome, xp, { retryWrong: o.retryWrong, now: Date.now() });
    stateRef.current = next;
    setState(next);
  }, []);

  const restart = useCallback(() => {
    const s = stateRef.current;
    const fresh = initSession(s.queue.slice(0, s.base), s.key, Date.now());
    stateRef.current = fresh;
    setState(fresh);
  }, []);

  const finished = current.finishedAt !== null;
  const summary = useMemo(() => (finished ? summarize(current) : null), [finished, current]);
  const correctCount = useMemo(() => {
    const seen = new Set<string>();
    let n = 0;
    for (const r of current.results) {
      if (seen.has(r.exercise.id)) continue;
      seen.add(r.exercise.id);
      if (r.outcome.correct) n++;
    }
    return n;
  }, [current.results]);

  return {
    exercises,
    index: current.index,
    current: finished ? null : current.queue[current.index] ?? null,
    total: current.queue.length,
    combo: current.combo,
    bestCombo: current.bestCombo,
    correctCount,
    xp: current.xp,
    finished,
    submit,
    summary,
    restart,
  };
}
