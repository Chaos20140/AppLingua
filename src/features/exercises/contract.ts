/**
 * Vertrag der gemeinsamen Übungs-Komponenten (genutzt von Lektion, Prüfung, Einstufung,
 * Grammatik, Wiederholung, Vokabeln, Aussprache und Song-Übungen).
 */
import type { CourseId, ExerciseContext, Variant } from '../../core/types';
import type { Exercise } from '../../content/types';
import type { ExerciseOutcome } from '../../engine/grading';

export interface ExerciseViewProps {
  exercise: Exercise;
  courseId: CourseId;
  variant: Variant;
  context: ExerciseContext;
  refId?: string;
  /**
   * Prüfungsmodus: nach „Abgeben“ kein Lösungs-/Erklärungs-Feedback (nur neutral weiter);
   * die Erklärungen zeigt die Auswertung am Ende (outcome.explanation).
   */
  examMode?: boolean;
  /** Wird aufgerufen, wenn der Nutzer nach dem Feedback auf „Weiter“ tippt (bzw. im examMode nach Abgabe). */
  onDone: (outcome: ExerciseOutcome) => void;
}

export interface SessionOptions {
  courseId: CourseId;
  variant: Variant;
  context: ExerciseContext;
  refId?: string;
  /** Übungen; Einträge mit abweichender `variant` werden automatisch herausgefiltert */
  exercises: Exercise[];
  /** Standard: Lektion/Wiederholung/Grammatik/Vokabeln/Songs ja, Prüfung/Einstufung nein */
  awardXp?: boolean;
  /** Falsch beantwortete Übungen am Ende noch einmal stellen (Standard: false) */
  retryWrong?: boolean;
}

export interface SessionResult {
  exercise: Exercise;
  outcome: ExerciseOutcome;
}

export interface SessionSummary {
  total: number;
  correct: number;
  scorePct: number;           // 0–100 (Teilpunkte berücksichtigt)
  bestCombo: number;
  xp: number;                 // in der Sitzung vergebene XP
  durationSec: number;
  perSkill: Partial<Record<import('../../core/types').Skill, number>>; // 0–100
  results: SessionResult[];
  mistakes: SessionResult[];
}

export interface ExerciseSession {
  exercises: Exercise[];      // gefiltert
  index: number;
  current: Exercise | null;
  total: number;
  combo: number;
  bestCombo: number;
  correctCount: number;
  xp: number;
  finished: boolean;
  /** vom ExerciseView.onDone aufrufen: speichert Antwort (recordAnswer), vergibt XP/Kombo, geht weiter */
  submit: (outcome: ExerciseOutcome) => void;
  summary: SessionSummary | null;
  restart: () => void;
}
