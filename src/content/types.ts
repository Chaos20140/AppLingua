/**
 * AppLingua – Inhaltsschema (Kurse, Lektionen, Übungen, Grammatik, Aussprache, Songs).
 * Alle Inhalte sind statische TS-Module, werden pro Kurs per dynamic import geladen
 * und vom Service Worker offline vorgehalten.
 *
 * Konventionen:
 * - Alle Erklärtexte auf Deutsch. Markup in `Md`-Feldern: **fett**, _kursiv_, `Zielsprache`
 *   (wird hervorgehoben + antippbar zum Vorlesen), Zeilenumbruch mit \n, Listen mit "- ".
 * - IDs sind global eindeutig und stabil (werden gespeichert!): z. B. 'es.s0.l04.e03'.
 * - `variant` weglassen = gilt für alle Varianten des Kurses.
 * - Antworten (answers) werden normalisiert verglichen (Groß/Klein, Satzzeichen, ¿¡, Leerzeichen);
 *   Akzentfehler zählen nur bei settings.strictAccents als Fehler (sonst Hinweis).
 */
import type { CourseId, EsVariant, Skill, StageId, Variant } from '../core/types';

export type Md = string;

/** Satzglied-Rollen für farbliche Hervorhebung (Legende im Grammatikzentrum). */
export type Role =
  | 'subject' | 'verb' | 'object' | 'article' | 'noun' | 'adjective' | 'adverb'
  | 'preposition' | 'pronoun' | 'negation' | 'question' | 'ending' | 'other';

export interface ColoredPart { text: string; role?: Role }

export interface Example {
  target: string;
  german: string;
  literal?: string;
  /** optionale farbige Satzglieder; Konkatenation der texts muss `target` ergeben */
  parts?: ColoredPart[];
  variant?: Variant;
  note?: Md;
}

export interface ConjugationRow {
  person: string;        // 'yo', 'tú', 'vos', 'él/ella/usted', …
  form: string;          // 'hablo'
  ending?: string;       // 'o' (wird farbig markiert)
  variant?: EsVariant;   // z. B. vosotros nur es-ES
}

export type ExplainBlock =
  | { type: 'text'; md: Md }
  | { type: 'tip'; md: Md }                                               // Merksatz
  | { type: 'compare'; target: string; german: string; md?: Md }          // Vergleich mit Deutsch
  | { type: 'mistake'; wrong: string; right: string; why: Md }            // typischer Fehler Deutschsprachiger
  | { type: 'table'; title?: string; headers: string[]; rows: string[][] }
  | { type: 'conjugation'; verb: string; translation: string; tense: string; rows: ConjugationRow[] }
  | { type: 'colored'; parts: ColoredPart[]; german?: string }
  | { type: 'variant'; variant: Variant; md: Md }                        // Spanien vs. Lateinamerika
  | { type: 'audio'; text: string; label?: string };                    // vorlesbares Beispiel

// ───────────────────────── Übungen ─────────────────────────
/** Zusatzinfos für die Fehlererklärung (was/warum/Regel/richtig/vermeiden). */
export interface Feedback {
  rule: Md;          // welche Regel gilt
  why?: Md;          // warum typische falsche Antworten falsch sind
  avoid?: Md;        // Merkhilfe, um den Fehler künftig zu vermeiden
}

interface ExBase {
  id: string;
  /** erste Kompetenz = Hauptkompetenz */
  skills: Skill[];
  topicIds?: string[];
  difficulty?: 1 | 2 | 3;
  variant?: Variant;
  /** deutsche Arbeitsanweisung (sonst Standardtext je Typ) */
  instruction?: string;
  feedback: Feedback;
}

export type Exercise =
  | (ExBase & { type: 'mc'; prompt: Md; audio?: string; options: { text: string; why?: Md }[]; answer: number })
  /** sentence mit "___" je Lücke; answers[i] = akzeptierte Lösungen für Lücke i; bank = Wortbank (optional) */
  | (ExBase & { type: 'cloze'; sentence: string; answers: string[][]; bank?: string[]; german?: string })
  /** tokens in korrekter Reihenfolge; extra = Ablenker; alternatives = weitere korrekte Reihenfolgen */
  | (ExBase & { type: 'order'; tokens: string[]; extra?: string[]; alternatives?: string[][]; german: string })
  | (ExBase & { type: 'translate'; direction: 'toTarget' | 'toGerman'; source: string; answers: string[]; bank?: string[] })
  /** requirements: Regex (case-insensitive) die erfüllt sein müssen; samples = Musterlösungen */
  | (ExBase & { type: 'freeText'; prompt: Md; requirements: { pattern: string; hint: string }[]; samples: string[]; minWords?: number })
  | (ExBase & { type: 'listening'; audio: string; question: Md; options: string[]; answer: number })
  | (ExBase & { type: 'dictation'; audio: string; answers: string[]; german?: string })
  /** Nachsprechen */
  | (ExBase & { type: 'speak'; text: string; german: string; phonetic?: string; ipa?: string; pronItemId?: string })
  /** Aussprachevergleich / Minimalpaare: TTS spricht options[answer], Nutzer wählt */
  | (ExBase & { type: 'minimalPair'; options: string[]; answer: number; hint: Md })
  | (ExBase & { type: 'fixError'; sentence: string; answers: string[]; german?: string })
  /** Dialog vervollständigen: Zeile gapIndex fehlt; entweder options/answer oder answers (frei) */
  | (ExBase & { type: 'dialogue'; lines: { speaker: string; text: string; german?: string }[]; gapIndex: number; options?: string[]; answer?: number; answers?: string[] })
  /** Situation: passende Äußerung wählen */
  | (ExBase & { type: 'situation'; scenario: Md; options: { text: string; why?: Md }[]; answer: number })
  | (ExBase & { type: 'imageMatch'; pairs: { emoji: string; word: string }[] })
  | (ExBase & { type: 'matchPairs'; pairs: { left: string; right: string }[] })
  /** Grammatik-Challenge: Verbform bilden */
  | (ExBase & { type: 'conjugate'; verb: string; tense: string; person: string; answers: string[]; sentence?: string })
  /** freie Sprachaufgabe: Transkript muss minMatch der keywords enthalten */
  | (ExBase & { type: 'speakFree'; prompt: Md; keywords: string[]; minMatch: number; sample: string })
  /** kurzes KI-Gespräch (offline: geskripteter Dialog des Szenarios) */
  | (ExBase & { type: 'aiChat'; scenarioId: string; goal: Md; turns: number });

export type ExerciseType = Exercise['type'];

// ───────────────────────── Kursstruktur ─────────────────────────
export interface VocabItem {
  id: string;                 // 'es.v.hola'
  target: string;
  german: string;
  pos: 'noun' | 'verb' | 'adj' | 'adv' | 'phrase' | 'pron' | 'prep' | 'num' | 'other';
  gender?: 'm' | 'f' | 'm/f';
  plural?: string;
  emoji?: string;
  example?: { target: string; german: string };
  variant?: Variant;
  field: string;              // Wortfeld, z. B. 'Begrüßung'
  stageId: StageId;
  lessonId?: string;
}

export interface Lesson {
  id: string;                 // 'es.s0.l01'
  courseId: CourseId;
  stageId: StageId;
  chapterId: string;
  order: number;
  title: string;
  subtitle?: string;
  icon: string;               // Emoji
  minutes: number;            // 5–15
  goal: Md;                   // 1. Lernziel
  canDo: string[];            // „Ich kann …“
  topicIds: string[];         // Grammatikthemen
  vocab: VocabItem[];         // eingeführter Wortschatz
  explanation: ExplainBlock[];// 2. Erklärung
  examples: Example[];        // 3. Beispiele
  guided: Exercise[];         // 4. geführte Übungen (5–8)
  pronunciation: string[];    // 5. Aussprache: PronItem-IDs (1–3)
  application: Exercise[];    // 6. aktive Anwendung (2–4)
  review: Exercise[];         // 7. kurze Wiederholung (2–4)
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  lessonIds: string[];        // leer = Kapitel ist geplant, Inhalte folgen
  /** Zwischentest am Kapitelende */
  examId?: string;
}

export interface Stage {
  id: StageId;
  courseId: CourseId;
  title: string;              // 'Stufe 0 – Grundlagen & erste Laute'
  short: string;              // 'Stufe 0', 'A1' …
  description: Md;
  goals: string[];
  grammarTopics: string[];    // Titel (auch geplante)
  vocabFields: string[];
  pronFocus: string[];
  dialogues: string[];
  chapters: Chapter[];
  finalExamId?: string;
  bossExamId?: string;
  /** Freischaltung der NÄCHSTEN Etappe: Abschlussprüfung + Boss bestanden + Mindestkompetenzen */
  mastery: { finalPct: number; bossPct: number; minSkills: Partial<Record<Skill, number>> };
  /** false = Etappe ist im Lernpfad sichtbar, Lektionen folgen in einem Update */
  available: boolean;
}

export interface ExamSection { title: string; skill: Skill; exercises: Exercise[] }

export interface Exam {
  id: string;
  courseId: CourseId;
  stageId: StageId;
  kind: 'midterm' | 'final' | 'boss';
  title: string;
  description: Md;
  passPct: number;
  timeLimitSec?: number;
  sections: ExamSection[];
  boss?: { name: string; emoji: string; intro: Md; defeat: Md; victory: Md };
}

export interface PlacementQuestion { level: StageId; exercise: Exercise }
export interface PlacementTest { courseId: CourseId; intro: Md; questions: PlacementQuestion[] }

// ───────────────────────── Grammatikzentrum ─────────────────────────
export interface GrammarTopic {
  id: string;                  // 'es.g.ser'
  courseId: CourseId;
  stageId: StageId;
  order: number;
  category: string;            // 'Verben', 'Artikel & Nomen', …
  title: string;
  summary: string;
  keywords: string[];          // Suche
  explanation: ExplainBlock[];
  examples: Example[];
  germanComparison: ExplainBlock[];
  mistakes: { wrong: string; right: string; why: Md }[];
  mnemonic: Md;                // Merksatz
  /** Übungen mit steigendem Schwierigkeitsgrad */
  levels: { level: 1 | 2 | 3; title: string; exercises: Exercise[] }[];
  related?: string[];
}

// ───────────────────────── Aussprache-Labor ─────────────────────────
export interface PronItem {
  id: string;                  // 'es.p.rr.perro'
  courseId: CourseId;
  categoryId: string;
  text: string;                // Wort oder Satz
  german: string;              // Bedeutung
  helper: string;              // einfache deutsche Aussprachehilfe, z. B. „PÄ-rro (Zungen-R rollen)“
  ipa: string;
  syllables: string[];
  stress: number;              // Index der betonten Silbe
  mouth: Md;                   // Zunge, Lippen, Mund
  mistakes: string[];          // typische Fehler Deutschsprachiger
  tips: string[];              // konkrete Verbesserungsvorschläge
  /** Problem-Codes, die bei schlechter Erkennung vermutet werden */
  issueCodes: string[];
  variant?: Variant;
  variantNotes?: { variant: Variant; note: Md }[];
  level: 1 | 2 | 3;
}

export interface PronCategory {
  id: string;                  // 'es.pc.r'
  courseId: CourseId;
  title: string;               // 'Einfaches R und gerolltes RR'
  icon: string;
  description: Md;
  itemIds: string[];
  minimalPairs?: [string, string][];
}

// ───────────────────────── KI-Sprachpartner ─────────────────────────
export interface ScriptNode {
  id: string;
  partner: string;             // Äußerung des Partners (Zielsprache)
  partnerGerman: string;
  /** erwartete Antworten; erste passende gewinnt (keywords: normalisiert, mind. eines) */
  expect: { keywords: string[]; next: string; reaction?: string }[];
  fallbackNext: string;        // wenn nichts passt (Partner hilft freundlich weiter)
  hint: string;                // Formulierungshilfe (Deutsch)
  sample: string;              // Beispielantwort (Zielsprache)
  end?: boolean;
}

export interface Scenario {
  id: string;                  // 'es.sc.restaurant'
  courseId: CourseId;
  key: string;                 // 'restaurant'
  title: string;
  emoji: string;
  description: string;
  partnerRole: string;
  userRole: string;
  goals: string[];
  phrases: { target: string; german: string }[];
  /** typisches Register der Situation (Voreinstellung im Setup) */
  register: 'formell' | 'informell';
  /**
   * Geskriptete Offline-Variante (5–8 Knoten, erster Knoten = Start). Mindestens eine Fassung;
   * fehlt die gewünschte, nutzt die UI die andere und weist darauf hin.
   */
  script: { formal?: ScriptNode[]; informal?: ScriptNode[] };
}

// ───────────────────────── Songs ─────────────────────────
export type SongGenre =
  | 'Pop' | 'Ballade' | 'Cumbia' | 'Reggaeton' | 'Rock' | 'Bossa Nova' | 'Samba' | 'Forró'
  | 'MPB' | 'Flamenco-Pop' | 'Folk' | 'Bolero' | 'Salsa' | 'Kinderlied';

export interface SongToken {
  t: string;                   // Oberfläche (Wort oder Satzzeichen)
  g?: string;                  // Schlüssel in Song.glossary
  p?: true;                    // Satzzeichen (nicht antippbar)
}

export interface GlossEntry {
  lemma: string;
  pos: string;                 // deutsch: 'Verb', 'Nomen (f)', …
  meaning: string;             // natürliche deutsche Bedeutung
  literal?: string;
  form?: string;               // z. B. „1. Person Singular Präsens von querer“
  grammar?: Md;
  colloquial?: Md;             // Umgangssprache?
  register: 'neutral' | 'umgangssprachlich' | 'formell' | 'poetisch';
  phonetic: string;            // deutsche Lautschrift-Hilfe
  ipa?: string;
  examples: { target: string; german: string }[];
  everyday: Md;                // im Alltag natürlich verwendbar?
}

export interface LineExplanation {
  summary: Md;                 // Bedeutung im Kontext des Songs
  grammar: { title: string; md: Md; topicId?: string }[];
  idioms?: { phrase: string; meaning: string; md?: Md }[];
  colloquial?: Md;
  culture?: Md;
  ambiguity?: Md;
  alternatives: { target: string; german: string; note?: string }[];
  everyday: Md;
}

export interface SongLine {
  id: string;                  // 'l01'
  sectionId: string;
  startMs: number;
  endMs: number;
  text: string;
  tokens: SongToken[];
  natural: string;             // natürliche Übersetzung
  literal: string;             // wörtliche Übersetzung
  phonetic: string;            // Aussprachehilfe (deutsch)
  ipa?: string;
  difficulty: 1 | 2 | 3;
  explanation: LineExplanation;
  /** Verbformen in der Zeile (für Übung „Verbformen erkennen“) */
  verbs?: { form: string; infinitive: string; analysis: string }[];
}

export interface Song {
  id: string;                  // 'song.es.la-plaza'
  courseId: CourseId;
  variant: Variant;
  title: string;
  artist: string;
  cover: { from: string; to: string; emoji: string };
  genre: SongGenre;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  speed: 'langsam' | 'mittel' | 'schnell';
  wordsPerMinute: number;
  colloquialPct: number;       // 0–100
  explicit: boolean;
  themes: string[];
  grammarTags: string[];       // GrammarTopic-IDs
  /** 'user-private' = privat eingegebener Text des Nutzers (nur private Analyse, nie geteilt) */
  license: { kind: 'original' | 'public-domain' | 'user-private'; note: string };
  /** offizielle Einbettungen (nur bei eigenen Songs, nach Einwilligung) */
  media?: { youtubeId?: string; spotifyUri?: string; appleMusicUrl?: string };
  /** true = Zeilen haben noch keine echten Zeiten (eigener Text ohne Tap-Sync) */
  untimed?: boolean;
  /** Begleitmusik wird im Browser synthetisiert (Web Audio), Gesang per Sprachausgabe */
  backing: { bpm: number; style: 'pop' | 'ballad' | 'cumbia' | 'bossa' | 'samba' | 'reggaeton' | 'folk'; key: string; chords: string[] };
  durationMs: number;
  sections: { id: string; label: string }[];
  lines: SongLine[];
  glossary: Record<string, GlossEntry>;
}

// ───────────────────────── Kurs-Paket ─────────────────────────
export interface CourseMeta {
  id: CourseId;
  name: string;                // 'Spanisch'
  nativeName: string;          // 'Español'
  flag: string;
  variants: { id: Variant; label: string; description: string; ttsLang: string }[];
}

export interface CourseContent {
  meta: CourseMeta;
  stages: Stage[];
  lessons: Lesson[];
  exams: Exam[];
  placement: PlacementTest;
  grammar: GrammarTopic[];
  pronCategories: PronCategory[];
  pronItems: PronItem[];
  scenarios: Scenario[];
}
