/**
 * AppLingua – zentrale Domänentypen (Vertrag für alle Module).
 * Änderungen hier betreffen Speicherung, Sync und alle Features.
 */

// ───────────────────────── Grundbegriffe ─────────────────────────
export type CourseId = 'es' | 'pt-BR';
export type EsVariant = 'es-ES' | 'es-LA';
/** Konkrete Sprachvariante (bestimmt Inhalte, Stimme, Aussprachehinweise). */
export type Variant = EsVariant | 'pt-BR';
export type StageId = 'stage0' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2' | 'native';
export const STAGE_ORDER: StageId[] = ['stage0', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native'];

/** Die sieben Kompetenzen (getrennt vom XP-Level). */
export type Skill = 'grammar' | 'pronunciation' | 'listening' | 'speaking' | 'reading' | 'writing' | 'vocabulary';
export const SKILLS: Skill[] = ['grammar', 'pronunciation', 'listening', 'speaking', 'reading', 'writing', 'vocabulary'];

/** Nachgewiesenes Sprachniveau (nur durch Prüfungen/Boss, nie durch XP). */
export type LanguageLevel = 'Einsteiger' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native Mastery';

export type ExerciseContext =
  | 'lesson' | 'review' | 'exam' | 'boss' | 'grammar' | 'pronunciation' | 'vocab'
  | 'placement' | 'song' | 'partner';

export type XpReason =
  | 'exercise' | 'combo' | 'lesson' | 'perfect' | 'review' | 'review-bonus' | 'pronunciation'
  | 'exam' | 'boss' | 'mission' | 'placement' | 'streak' | 'partner' | 'grammar' | 'vocab'
  | 'song-line' | 'song-complete' | 'song-perfect-sing' | 'song-exercise' | 'song-boss' | 'song-play';

// ───────────────────────── Gespeicherte Daten ─────────────────────────
// Jede Sammlung wird lokal (IndexedDB) und – falls Cloud eingerichtet – in Supabase
// (Tabelle user_records) gespeichert. Mutable Sammlungen: Last-Write-Wins per Datensatz
// (+ optionale Merge-Funktion). Event-Sammlungen: nur anhängen (konfliktfrei).

export interface Profile {
  displayName: string;
  createdAt: string;
  onboardingDone: boolean;
  /** Warum lernt der Nutzer? (Onboarding) */
  motivation?: string;
  /** Frühere Kenntnisse laut Onboarding */
  priorKnowledge?: 'none' | 'some' | 'good';
}

export interface PartnerPrefs {
  level: LanguageLevel;
  formal: boolean;
  speed: 'langsam' | 'normal' | 'schnell';
  correction: 'sofort' | 'danach';
  translations: boolean;
}

export interface SongPrefs {
  explicitFilter: boolean;
  preferredGenres: string[];
  preferredArtists: string[];
  speed: 'langsam' | 'egal' | 'schnell';
  colloquial: 'wenig' | 'egal' | 'viel';
  showTranslation: boolean;
  showPhonetic: boolean;
  /** Eigene Songtexte im Konto synchronisieren (Standard: nur auf diesem Gerät). */
  syncUserTexts: boolean;
}

export interface Settings {
  activeCourse: CourseId;
  esVariant: EsVariant;
  theme: 'system' | 'light' | 'dark';
  /** Tagesziel in XP */
  dailyGoalXp: number;
  ttsRate: number;       // natürliche Sprechgeschwindigkeit (0.8–1.1)
  ttsSlowRate: number;   // langsame Wiedergabe (0.5–0.8)
  showIPA: boolean;
  autoplayAudio: boolean;
  soundEffects: boolean;
  reducedMotion: 'system' | 'on' | 'off';
  /** Akzentfehler (é vs e) als Fehler werten */
  strictAccents: boolean;
  /** Ausdrückliche Zustimmung zum Speichern von Sprachaufnahmen (nur lokal auf dem Gerät). */
  storeRecordings: boolean;
  /** Einwilligung für externe Einbettungen (Zwei-Klick-Lösung, DSGVO) */
  embedConsent: { youtube: boolean; spotify: boolean; appleMusic: boolean };
  partner: PartnerPrefs;
  songs: SongPrefs;
}

export interface PlacementResult {
  takenAt: string;
  skipped: boolean;
  scorePct: number;
  /** empfohlene Startetappe */
  startStage: StageId;
}

/** Zustand eines Kurses (id = CourseId). */
export interface CourseState {
  courseId: CourseId;
  placement?: PlacementResult;
  currentStageId: StageId;
  currentLessonId?: string;
  lastActivityAt?: string;
  /** Etappen, die per Einstufungstest übersprungen wurden */
  skippedStages?: StageId[];
}

/** id = `${courseId}:${lessonId}` */
export interface LessonProgress {
  courseId: CourseId;
  lessonId: string;
  bestScorePct: number;
  stars: 0 | 1 | 2 | 3;
  attempts: number;
  firstCompletedAt: string;
  lastCompletedAt: string;
  bestCombo: number;
  bestDurationSec?: number;
}

/** Spaced-Repetition-Karte. id = `${courseId}:${itemId}` */
export interface SrsCard {
  courseId: CourseId;
  itemId: string;
  kind: 'vocab' | 'phrase' | 'grammar' | 'pronunciation' | 'error';
  front: string;       // Zielsprache
  back: string;        // Deutsch
  hint?: string;
  source: { type: 'lesson' | 'song' | 'user' | 'error' | 'grammar' | 'pronunciation'; ref?: string; label?: string };
  ease: number;        // SM-2 Ease-Faktor (1.3–3.0)
  intervalDays: number;
  reps: number;
  lapses: number;
  dueAt: string;
  lastReviewedAt?: string;
  createdAt: string;
  suspended?: boolean;
  note?: string;
}

/** Erklärung bei falscher Antwort (Pflicht laut Didaktik-Konzept). */
export interface MistakeExplanation {
  what: string;     // was falsch war
  why: string;      // warum es falsch war
  rule: string;     // welche Regel gilt
  correct: string;  // richtige Lösung
  avoid: string;    // wie man den Fehler künftig vermeidet
}

/** Fehlerarchiv. id = `${courseId}:${exerciseId}` */
export interface ErrorEntry {
  courseId: CourseId;
  exerciseId: string;
  context: ExerciseContext;
  refId?: string;
  skill: Skill;
  topicIds: string[];
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: MistakeExplanation;
  count: number;
  firstAt: string;
  lastAt: string;
  /** Anzahl richtiger Antworten seit dem letzten Fehler; ab 2 gilt der Fehler als behoben */
  correctSince: number;
  resolvedAt?: string;
}

/** id = badgeId (deterministisch → keine Doppelvergabe über Geräte) */
export interface BadgeEarned {
  badgeId: string;
  earnedAt: string;
}

// ── Event-Sammlungen (append-only) ──
export interface XpEvent {
  at: string;
  amount: number;
  reason: XpReason;
  courseId?: CourseId;
  /** Referenz (lessonId, examId, songId, missionId …) */
  ref?: string;
}

export interface AnswerEvent {
  at: string;
  courseId: CourseId;
  exerciseId: string;
  exerciseType: string;
  context: ExerciseContext;
  refId?: string;
  skills: Skill[];
  topicIds: string[];
  correct: boolean;
  /** 0..1 für Teilpunkte (z. B. Aussprache) */
  score?: number;
  accentOnly?: boolean;
  userAnswer?: string;
  durationMs?: number;
}

export interface ExamResult {
  at: string;
  courseId: CourseId;
  examId: string;
  kind: 'placement' | 'midterm' | 'final' | 'boss' | 'song-boss';
  stageId?: StageId;
  scorePct: number;
  passed: boolean;
  perSkill: Partial<Record<Skill, number>>;
  durationSec: number;
}

export interface PronAttempt {
  at: string;
  courseId: CourseId;
  itemId: string;
  context: ExerciseContext;
  target: string;
  method: 'speech-recognition' | 'self-assessment';
  transcript?: string;
  /** 0–100 Verständlichkeit laut Spracherkennung bzw. Selbsteinschätzung */
  scorePct: number;
  /** Problem-Codes, z. B. 'rr', 'j', 'nasal', 'stress' */
  issues: string[];
}

export interface PartnerSession {
  at: string;
  courseId: CourseId;
  scenarioId: string;
  mode: 'ai' | 'offline';
  prefs: PartnerPrefs;
  turns: { role: 'partner' | 'user'; text: string; translation?: string; correction?: string }[];
  evaluation?: PartnerEvaluation;
}

export interface PartnerEvaluation {
  summary: string;
  grammarErrors: { original: string; corrected: string; explanation: string }[];
  unnatural: { original: string; better: string; explanation: string }[];
  vocabulary: { used: string[]; suggestions: string[] };
  pronunciation?: string;
  alternatives: string[];
  goodAnswers: string[];
  recommendedExercises: { label: string; route: string }[];
  scores: Partial<Record<Skill, number>>;
  source: 'ai' | 'offline';
}

// ── Songs ──
/** id = songId */
export interface SongFavorite { songId: string; addedAt: string }

/** id = uuid */
export interface Playlist { name: string; description?: string; songIds: string[]; createdAt: string }

/** id = songId */
export interface SongProgress {
  songId: string;
  courseId: CourseId;
  lastPositionMs: number;
  learnedLineIds: string[];
  /** beste Punktzahl je Zeile (0–100), Zeile gilt ab 80 als gelernt */
  lineScores: Record<string, number>;
  /** beste Aussprachewertung je Zeile (0–100) */
  pronScores: Record<string, number>;
  playCount: number;
  lastPlayedAt: string;
  modesUsed: string[];
  exercisesDone: number;
  exerciseAccuracy: number; // 0–100 gleitend
  bossPassedAt?: string;
  flawlessSingAt?: string;
  completedAt?: string;
}

/** id = `${songId}:${lineId|'song'}` */
export interface SongNote { songId: string; lineId?: string; text: string }

/** id = `${songId}:${lineId}:${tokenIndex}` */
export interface SongMarkedWord { songId: string; lineId: string; tokenIndex: number; text: string }

/** Gespeicherte Erklärung/Übersetzung. id = `${songId}:${lineId}:${span}:${action}` (gekürzt/gehasht) */
export interface SongExplanationRecord {
  songId: string;
  lineId?: string;
  span: string;
  action: ExplainAction;
  level: LanguageLevel;
  result: Explanation;
  createdAt: string;
}

export type ExplainAction =
  | 'meaning' | 'explain-line' | 'literal' | 'natural' | 'grammar'
  | 'colloquial' | 'pronunciation' | 'examples';

export interface Explanation {
  natural?: string;
  literal?: string;
  context?: string;
  grammar?: string[];
  idioms?: string[];
  colloquial?: string;
  ambiguity?: string;
  culture?: string;
  alternatives?: string[];
  everyday?: string;
  examples?: { target: string; german: string }[];
  pronunciation?: { phonetic: string; ipa?: string; tips?: string[] };
  source: 'ai' | 'offline';
}

/** Privat eingegebener Songtext. id = uuid. localOnly=true → wird nie hochgeladen. */
export interface UserSongText {
  title: string;
  artist: string;
  courseId: CourseId;
  variant: Variant;
  genre?: string;
  lyrics: string;
  /** optionale Zeiten je Zeile (ms), per Tap-Sync erstellt */
  timings?: number[];
  media?: { youtubeId?: string; spotifyUri?: string; appleMusicUrl?: string };
  createdAt: string;
  /** vom Nutzer bestätigt: nur private Analyse */
  privateUseConfirmed: boolean;
}

export interface SongExerciseResult {
  at: string;
  songId: string;
  exerciseType: string;
  correct: number;
  total: number;
}

// ───────────────────────── Sammlungen ─────────────────────────
export interface CollectionData {
  profile: Profile;
  settings: Settings;
  courseState: CourseState;
  lessonProgress: LessonProgress;
  vocabCards: SrsCard;
  errorEntries: ErrorEntry;
  badges: BadgeEarned;
  xpEvents: XpEvent;
  answers: AnswerEvent;
  examResults: ExamResult;
  pronAttempts: PronAttempt;
  partnerSessions: PartnerSession;
  songFavorites: SongFavorite;
  playlists: Playlist;
  songProgress: SongProgress;
  songNotes: SongNote;
  songMarkedWords: SongMarkedWord;
  songExplanations: SongExplanationRecord;
  songUserTexts: UserSongText;
  songExerciseResults: SongExerciseResult;
}

export type CollectionName = keyof CollectionData;

export const COLLECTIONS: CollectionName[] = [
  'profile', 'settings', 'courseState', 'lessonProgress', 'vocabCards', 'errorEntries', 'badges',
  'xpEvents', 'answers', 'examResults', 'pronAttempts', 'partnerSessions',
  'songFavorites', 'playlists', 'songProgress', 'songNotes', 'songMarkedWords',
  'songExplanations', 'songUserTexts', 'songExerciseResults',
];

/** Nur-anhängen-Sammlungen (konfliktfrei beim Sync). */
export const EVENT_COLLECTIONS: CollectionName[] = [
  'xpEvents', 'answers', 'examResults', 'pronAttempts', 'partnerSessions', 'songExerciseResults',
];

/** Lokal gespeicherter Datensatz inkl. Sync-Metadaten. */
export interface StoredRecord<C extends CollectionName = CollectionName> {
  collection: C;
  id: string;
  data: CollectionData[C];
  /** ISO-Zeitstempel der letzten lokalen Änderung (Last-Write-Wins) */
  updatedAt: string;
  deleted?: boolean;
  /** true → wird nie in die Cloud übertragen */
  localOnly?: boolean;
}

// ───────────────────────── Sync & Konto ─────────────────────────
export type SyncStatus =
  | { state: 'local-only'; reason: 'not-configured' | 'guest' }
  | { state: 'idle'; lastSyncedAt?: string }
  | { state: 'syncing' }
  | { state: 'pending'; count: number; offline: boolean }
  | { state: 'error'; message: string; count: number };

export interface AuthUser {
  id: string;
  email?: string;
  provider: 'email' | 'apple' | 'other';
}
