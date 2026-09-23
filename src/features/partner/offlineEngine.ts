/**
 * Geführter Offline-Dialog (rein, ohne React): spielt `Scenario.script` ab und erstellt eine
 * einfache, regelbasierte Auswertung (`PartnerEvaluation`, source 'offline').
 *
 * Abgleich wortweise nach Normalisierung (wie speakFree in grading.ts): kurze Schlüsselwörter wie
 * „no“ oder „si“ zählen nur als ganzes Wort („nombre“ enthält kein „no“).
 */
import type { CourseId, PartnerEvaluation, Skill } from '../../core/types';
import type { Scenario, ScriptNode } from '../../content/types';
import { displayWords, looseKey, normalize } from '../../engine/text';

export type Register = 'formal' | 'informal';

export interface OfflineScript {
  scenarioId: string;
  /** tatsächlich verwendete Fassung */
  register: Register;
  /** gewünschte Fassung */
  requested: Register;
  /** true = gewünschte Fassung fehlt, die andere wird verwendet */
  fallback: boolean;
  /** deutscher Hinweis bei Fallback, sonst null */
  notice: string | null;
  nodes: ScriptNode[];
}

export interface OfflineTurnLog {
  nodeId: string;
  text: string;
  matched: boolean;
  keywords: string[];
  voice?: boolean;
}

export interface OfflineState {
  nodeId: string;
  ended: boolean;
  /** Knoten, die der Partner gesprochen hat (ohne Duplikate, in Reihenfolge) */
  visited: string[];
  log: OfflineTurnLog[];
  /** Wiederholungen je Knoten (Antwort passte nicht und der Partner fragt erneut) */
  repeats: Record<string, number>;
}

export interface PartnerLine {
  kind: 'reaction' | 'node';
  text: string;
  /** deutsche Übersetzung (nur bei Knoten vorhanden) */
  german?: string;
  nodeId?: string;
  /** Partner wiederholt die Frage */
  repeat?: boolean;
}

export interface OfflineStep {
  state: OfflineState;
  /** Antwort passte zu einer Erwartung */
  matched: boolean;
  /** gefundene Schlüsselwörter (normalisiert) */
  keywords: string[];
  /** Partner-Äußerungen in Reihenfolge: Reaktion zuerst, dann nächster Knoten */
  lines: PartnerLine[];
  /** der gerade beantwortete Knoten (für Tipp/Beispielantwort) */
  answered: ScriptNode;
  /** Partner stellt denselben Knoten erneut */
  repeated: boolean;
  ended: boolean;
}

const REGISTER_LABEL: Record<Register, string> = { formal: 'formellen', informal: 'informellen' };

/** Wählt die passende Skriptfassung (Fallback auf die vorhandene mit Hinweis). */
export function pickScript(scenario: Pick<Scenario, 'id' | 'script'>, formal: boolean): OfflineScript | null {
  const requested: Register = formal ? 'formal' : 'informal';
  const other: Register = formal ? 'informal' : 'formal';
  const wanted = scenario.script[requested];
  if (wanted && wanted.length) {
    return { scenarioId: scenario.id, register: requested, requested, fallback: false, notice: null, nodes: wanted };
  }
  const alt = scenario.script[other];
  if (alt && alt.length) {
    return {
      scenarioId: scenario.id,
      register: other,
      requested,
      fallback: true,
      notice: `Für diese Situation gibt es den geführten Dialog nur in der ${REGISTER_LABEL[other]} Fassung – er läuft deshalb ${other === 'formal' ? 'formell' : 'informell'}.`,
      nodes: alt,
    };
  }
  return null;
}

export function findNode(script: OfflineScript, id: string): ScriptNode | null {
  return script.nodes.find((n) => n.id === id) ?? null;
}

export function currentNode(script: OfflineScript, state: OfflineState): ScriptNode | null {
  return findNode(script, state.nodeId);
}

/** Gefundene Schlüsselwörter – ganze Wörter/Wortgruppen nach Normalisierung, akzenttolerant. */
export function keywordHits(text: string, keywords: readonly string[]): string[] {
  const hay = ` ${looseKey(text)} `;
  if (!hay.trim()) return [];
  const out: string[] = [];
  for (const k of keywords) {
    const kk = looseKey(k);
    if (kk && hay.includes(` ${kk} `) && !out.includes(kk)) out.push(kk);
  }
  return out;
}

/** Erste Partneräußerung (erster Knoten = Start). */
export function startOffline(script: OfflineScript): { state: OfflineState; lines: PartnerLine[] } {
  const first = script.nodes[0];
  const state: OfflineState = { nodeId: first?.id ?? '', ended: !first, visited: first ? [first.id] : [], log: [], repeats: {} };
  return { state, lines: first ? [nodeLine(first)] : [] };
}

const nodeLine = (node: ScriptNode, repeat = false): PartnerLine => ({ kind: 'node', text: node.partner, german: node.partnerGerman, nodeId: node.id, ...(repeat ? { repeat } : {}) });

/** Wie oft derselbe Knoten höchstens wiederholt wird, bevor der Partner freundlich weitermacht. */
export const MAX_REPEATS = 2;

/** Verarbeitet eine Nutzerantwort: Reaktion (falls vorhanden), dann nächster Knoten. */
export function respondOffline(script: OfflineScript, state: OfflineState, text: string, opts: { voice?: boolean; maxRepeats?: number } = {}): OfflineStep {
  const node = currentNode(script, state);
  if (!node || state.ended) {
    const answered = node ?? script.nodes[0];
    return { state: { ...state, ended: true }, matched: false, keywords: [], lines: [], answered, repeated: false, ended: true };
  }
  const trimmed = text.trim();
  const maxRepeats = opts.maxRepeats ?? MAX_REPEATS;

  // Endknoten: freie Antwort (z. B. Verabschiedung) beendet das Gespräch
  if (node.end) {
    const matched = trimmed.length > 0 && !looksGerman(trimmed);
    const log: OfflineTurnLog = { nodeId: node.id, text: trimmed, matched, keywords: [], ...(opts.voice ? { voice: true } : {}) };
    return {
      state: { ...state, ended: true, log: [...state.log, log] },
      matched, keywords: [], lines: [], answered: node, repeated: false, ended: true,
    };
  }

  let nextId = node.fallbackNext;
  let reaction: string | undefined;
  let matched = false;
  let keywords: string[] = [];
  // Die spezifischste Gruppe gewinnt (längster Treffer in Wörtern), bei Gleichstand die erste:
  // „Sí, pero no puedo“ → „no puedo“ (NEIN) statt „si“; „No muy bien“ → „no muy bien“ statt „bien“.
  let best = 0;
  for (const e of node.expect) {
    const hits = keywordHits(trimmed, e.keywords);
    const weight = Math.max(0, ...hits.map((h) => h.split(' ').length));
    if (weight > best) {
      best = weight;
      nextId = e.next;
      reaction = e.reaction;
      matched = true;
      keywords = hits;
    }
  }

  const repeats = { ...state.repeats };
  let repeated = nextId === node.id;
  if (repeated) {
    repeats[node.id] = (repeats[node.id] ?? 0) + 1;
    if (repeats[node.id] > maxRepeats) {
      // nicht endlos dieselbe Frage: freundlich zum nächsten Schritt
      const escape = node.expect.map((e) => e.next).find((id) => id !== node.id && findNode(script, id));
      if (escape) { nextId = escape; repeated = false; }
    }
  }

  const log: OfflineTurnLog = { nodeId: node.id, text: trimmed, matched, keywords, ...(opts.voice ? { voice: true } : {}) };
  const next = findNode(script, nextId);
  if (!next || (repeated && (repeats[node.id] ?? 0) > maxRepeats)) {
    // Inhaltsfehler (unbekannter Knoten) oder kein Ausweg: Gespräch sauber beenden
    const lines: PartnerLine[] = reaction ? [{ kind: 'reaction', text: reaction }] : [];
    return { state: { ...state, ended: true, repeats, log: [...state.log, log] }, matched, keywords, lines, answered: node, repeated: false, ended: true };
  }

  const lines: PartnerLine[] = [];
  if (reaction) lines.push({ kind: 'reaction', text: reaction });
  lines.push(nodeLine(next, repeated));
  const visited = state.visited.includes(next.id) ? state.visited : [...state.visited, next.id];
  return {
    state: { nodeId: next.id, ended: false, visited, log: [...state.log, log], repeats },
    matched, keywords, lines, answered: node, repeated, ended: false,
  };
}

/** Anteil passender Antworten in Prozent (null ohne Antworten). */
export function offlineScorePct(state: OfflineState): number | null {
  if (!state.log.length) return null;
  return Math.round((state.log.filter((l) => l.matched).length / state.log.length) * 100);
}

// ───────────────────────── Fehlerdetektoren ─────────────────────────

const ES_QUESTION_WORDS: Record<string, string> = {
  que: 'qué', como: 'cómo', donde: 'dónde', adonde: 'adónde', cuando: 'cuándo', cuanto: 'cuánto', cuanta: 'cuánta',
  cuantos: 'cuántos', cuantas: 'cuántas', cual: 'cuál', cuales: 'cuáles', quien: 'quién', quienes: 'quiénes',
};
const CLOSE_CHECK = new Set(['donde', 'adonde', 'cuando', 'quien', 'quienes', 'cual', 'cuales']);
const ES_LEAD_WORDS = new Set(['y', 'de', 'a', 'en', 'con', 'para', 'por', 'desde', 'hasta', 'e', 'pero']);

export interface QuestionIssue {
  original: string;
  corrected: string;
  explanation: string;
}

/** Zerlegt Text in Sätze (Satzzeichen bleiben am Satz). */
function sentences(text: string): string[] {
  return (text.match(/[^.!?…]+[.!?…]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

const core = (w: string) => w.replace(/^[¿¡"„“«(]+/, '').replace(/[.,!?;:"“”»)…]+$/, '');

function withCase(original: string, replacement: string): string {
  return original[0] && original[0] !== original[0].toLowerCase() ? replacement[0].toUpperCase() + replacement.slice(1) : replacement;
}

/**
 * Fragen-Rechtschreibung: fehlendes „¿“ bzw. „?“ und fehlende Akzente bei Fragewörtern (Spanisch),
 * „por quê“/„o quê“ am Fragesatzende (Portugiesisch).
 */
export function detectQuestionIssues(text: string, courseId: CourseId): QuestionIssue[] {
  const out: QuestionIssue[] = [];
  for (const s of sentences(text)) {
    if (courseId === 'es') {
      const words = s.split(/\s+/);
      // Kandidaten für den Fragebeginn: Satzanfang oder nach einem Komma
      const starts = [0, ...words.map((w, i) => (w.endsWith(',') ? i + 1 : -1)).filter((i) => i > 0 && i < words.length)];
      const hasQ = s.includes('?');
      const hasOpen = s.includes('¿');
      let qIndex = -1;       // Index des Fragewortes
      let clauseStart = -1;  // Index, vor dem „¿“ stehen müsste
      for (const st of starts) {
        for (const offset of [0, 1]) {
          const i = st + offset;
          const w = words[i];
          if (!w) continue;
          const key = looseKey(core(w));
          if (offset === 1 && !ES_LEAD_WORDS.has(looseKey(core(words[st])))) continue;
          if (ES_QUESTION_WORDS[key]) { qIndex = i; clauseStart = st; break; }
        }
        if (qIndex >= 0) break;
      }
      const qWord = qIndex >= 0 ? core(words[qIndex]) : '';
      const accentMissing = qIndex >= 0 && hasQ && normalize(qWord) === looseKey(qWord) && ES_QUESTION_WORDS[looseKey(qWord)] !== looseKey(qWord);
      const accented = qIndex >= 0 && !accentMissing && normalize(qWord) !== looseKey(qWord);
      // „¿Y tu?“ → „¿Y tú?“
      const tuFix = hasQ && /(^|\s|¿)y tu\?/i.test(s);
      const openMissing = hasQ && !hasOpen;
      // „Dónde está el baño.“ – nur bei Fragewörtern, die praktisch nie Ausrufe einleiten
      const closeMissing = !hasQ && accented && !/[!¡]/.test(s) && CLOSE_CHECK.has(looseKey(qWord));
      if (!accentMissing && !openMissing && !closeMissing && !tuFix) continue;

      const fixed = words.slice();
      const notes: string[] = [];
      if (accentMissing) {
        const key = looseKey(qWord);
        fixed[qIndex] = fixed[qIndex].replace(qWord, withCase(qWord, ES_QUESTION_WORDS[key]));
        notes.push(`Fragewörter tragen im Spanischen einen Akzent (${ES_QUESTION_WORDS[key]}).`);
      }
      if (tuFix) {
        for (let i = 0; i < fixed.length; i++) if (core(fixed[i]).toLowerCase() === 'tu' && i > 0 && looseKey(core(fixed[i - 1])) === 'y') fixed[i] = fixed[i].replace(/tu/i, (m) => withCase(m, 'tú'));
        notes.push('„tú“ (du) hat einen Akzent – ohne Akzent heißt „tu“ „dein“.');
      }
      if (openMissing || closeMissing) {
        const at = clauseStart >= 0 ? clauseStart : (() => {
          // ohne Fragewort: Frage beginnt nach dem letzten Komma, falls der Rest kurz ist, sonst am Satzanfang
          const lastComma = words.map((w, i) => (w.endsWith(',') ? i : -1)).filter((i) => i >= 0).pop();
          return lastComma !== undefined && words.length - lastComma - 1 <= 3 ? lastComma + 1 : 0;
        })();
        if (!hasOpen && fixed[at]) fixed[at] = '¿' + fixed[at].replace(/^¡/, '');
        if (closeMissing) {
          const last = fixed.length - 1;
          fixed[last] = fixed[last].replace(/[.…!]*$/, '') + '?';
        }
        notes.push('Spanische Fragen stehen zwischen ¿ und ?.');
      }
      const corrected = fixed.join(' ');
      if (corrected !== s) out.push({ original: s, corrected, explanation: notes.join(' ') });
    } else {
      // Portugiesisch: „por quê“ / „o quê“ am Ende einer Frage tragen einen Zirkumflex
      const m = s.match(/(^|\s)(por que|o que)\s*\?\s*$/i);
      if (m) {
        const corrected = s.replace(/(por que|o que)(\s*\?\s*)$/i, (_all, words: string, tail: string) => `${words.slice(0, -3)}quê${tail.trim()}`);
        out.push({ original: s, corrected, explanation: 'Am Ende einer Frage wird „que“ betont und bekommt einen Zirkumflex: „por quê?“, „o quê?“.' });
      }
    }
  }
  return out;
}

const GERMAN_WORDS = new Set([
  'ich', 'und', 'nicht', 'ist', 'bin', 'habe', 'hast', 'hat', 'mein', 'meine', 'bitte', 'danke', 'auch', 'mit', 'für', 'fur',
  'möchte', 'mochte', 'gerne', 'gern', 'heiße', 'heisse', 'komme', 'aus', 'wir', 'sind', 'nein', 'hallo', 'tschüss', 'tschuss',
  'guten', 'sehr', 'gut', 'mir', 'geht', 'kann', 'ein', 'eine', 'einen', 'die', 'oder', 'aber', 'wie', 'was', 'wo', 'wann',
  'warum', 'weil', 'weiß', 'weiss', 'keine', 'kein', 'nicht', 'bisschen', 'viel', 'jetzt', 'heute', 'morgen', 'dann', 'hier',
]);

/** Heuristik: Antwort ist (überwiegend) Deutsch statt Zielsprache. */
export function looksGerman(text: string): boolean {
  const words = normalize(text).split(' ').filter(Boolean);
  if (!words.length) return false;
  let hits = 0;
  for (const w of words) if (GERMAN_WORDS.has(w) || /[äöß]/.test(w)) hits++;
  return hits >= 2 || (hits >= 1 && hits / words.length >= 0.5);
}

/** Sehr kurze Antwort (höchstens zwei Wörter). */
export const isVeryShort = (text: string) => displayWords(text).length <= 2;

/** Originalschreibung der gefundenen Schlüsselwörter im Nutzertext (z. B. „sí“ statt „si“). */
export function originalWords(text: string, normalizedKeywords: readonly string[]): string[] {
  const tokens = displayWords(text);
  const keys = tokens.map((t) => looseKey(t));
  const out: string[] = [];
  for (const kw of normalizedKeywords) {
    const parts = kw.split(' ');
    for (let i = 0; i + parts.length <= keys.length; i++) {
      if (parts.every((p, j) => keys[i + j] === p)) { out.push(tokens.slice(i, i + parts.length).join(' ').toLowerCase()); break; }
    }
  }
  return out;
}

// ───────────────────────── Auswertung ─────────────────────────

export interface OfflineEvalInput {
  courseId: CourseId;
  scenario: Pick<Scenario, 'id' | 'title' | 'phrases'>;
  /** alle Nutzerbeiträge in Reihenfolge */
  userTurns: { text: string; voice?: boolean }[];
  /** nur im Offline-Dialog: Skript + Zustand (ohne → Auswertung ohne Gesprächsschritte, z. B. KI-Fallback) */
  script?: OfflineScript | null;
  state?: OfflineState | null;
  /** vorhandene Grammatikthemen (für gültige Übungslinks) */
  grammarTopicIds?: readonly string[];
}

const dedupe = (list: string[]) => {
  const seen = new Set<string>();
  return list.filter((x) => {
    const k = looseKey(x);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/** Regelbasierte Offline-Auswertung (ehrlich als „einfache Offline-Auswertung“ gekennzeichnet). */
export function evaluateOffline(input: OfflineEvalInput): PartnerEvaluation {
  const { courseId, scenario } = input;
  const turns = input.userTurns.map((t) => ({ ...t, text: t.text.trim() })).filter((t) => t.text);
  const script = input.script ?? null;
  const state = input.state ?? null;
  const log = script && state ? state.log : [];
  const sampleFor = (nodeId: string) => (script ? findNode(script, nodeId)?.sample ?? '' : '');
  const nodeOf = (nodeId: string) => (script ? findNode(script, nodeId) : null);

  // Fehler
  const grammarErrors: PartnerEvaluation['grammarErrors'] = [];
  for (const t of turns) {
    for (const q of detectQuestionIssues(t.text, courseId)) {
      if (grammarErrors.length < 6) grammarErrors.push({ original: q.original, corrected: q.corrected, explanation: q.explanation });
    }
  }
  const langName = courseId === 'es' ? 'Spanisch' : 'Portugiesisch';
  const unnatural: PartnerEvaluation['unnatural'] = [];
  let germanCount = 0;
  let shortCount = 0;
  const logByText = new Map(log.map((l) => [l.text, l]));
  for (const t of turns) {
    const entry = logByText.get(t.text);
    const sample = entry ? sampleFor(entry.nodeId) : '';
    if (looksGerman(t.text)) {
      germanCount++;
      if (unnatural.length < 6) {
        unnatural.push({
          original: t.text,
          better: sample,
          explanation: `Das war Deutsch – versuch es auf ${langName}, auch wenn es noch nicht perfekt ist. Einzelne Wörter reichen für den Anfang.`,
        });
      }
      continue;
    }
    const node = entry ? nodeOf(entry.nodeId) : null;
    if (isVeryShort(t.text) && sample && displayWords(sample).length >= 4 && !node?.end) {
      shortCount++;
      if (unnatural.length < 6 && shortCount <= 3) {
        unnatural.push({
          original: t.text,
          better: sample,
          explanation: 'Kurze Antworten sind in Ordnung – mit einem ganzen Satz übst du aber deutlich mehr.',
        });
      }
    }
  }

  // Wortschatz
  let used: string[];
  if (log.length) {
    used = dedupe(log.flatMap((l) => originalWords(l.text, l.keywords)));
  } else {
    used = dedupe(turns.filter((t) => !looksGerman(t.text)).flatMap((t) => displayWords(t.text).map((w) => w.toLowerCase())).filter((w) => w.length >= 4));
  }
  used = used.slice(0, 12);
  const allUser = ` ${turns.map((t) => looseKey(t.text)).join(' ')} `;
  const suggestions = scenario.phrases
    .filter((p) => {
      const k = looseKey(p.target);
      return k && !allUser.includes(` ${k} `);
    })
    .slice(0, 5)
    .map((p) => `${p.target} – ${p.german}`);

  // Alternativen & gute Antworten
  const answeredNodes = log.map((l) => l.nodeId);
  const missedSamples = log.filter((l) => !l.matched).map((l) => sampleFor(l.nodeId));
  const otherSamples = answeredNodes.map((id) => sampleFor(id));
  const alternatives = log.length
    ? dedupe([...missedSamples, ...otherSamples].filter(Boolean)).slice(0, 5)
    : dedupe(scenario.phrases.map((p) => p.target)).slice(0, 4);
  const goodAnswers = dedupe(
    log.filter((l) => l.matched && !looksGerman(l.text)).map((l) => l.text).sort((a, b) => displayWords(b).length - displayWords(a).length),
  ).slice(0, 4);

  // Kennzahlen
  const answered = log.length;
  const hits = log.filter((l) => l.matched).length;
  const hitPct = answered ? Math.round((hits / answered) * 100) : null;
  const scores: Partial<Record<Skill, number>> = {};
  if (hitPct !== null) scores.vocabulary = hitPct;

  // Empfehlungen
  const prefix = courseId === 'es' ? 'es' : 'pt';
  const topic = (id: string) => (!input.grammarTopicIds || input.grammarTopicIds.includes(id) ? `/grammatik/${id}` : '/grammatik');
  const recommended: PartnerEvaluation['recommendedExercises'] = [];
  if (grammarErrors.length) recommended.push({ label: 'Fragen richtig schreiben', route: topic(`${prefix}.g.questions`) });
  if (germanCount || shortCount) recommended.push({ label: 'Wortschatz wiederholen', route: '/vokabeln' });
  if (hitPct !== null && hitPct < 60) recommended.push({ label: 'Diese Situation noch einmal üben', route: `/partner/${scenario.id}` });
  if (turns.some((t) => t.voice)) recommended.push({ label: 'Aussprache trainieren', route: '/aussprache' });
  recommended.push({ label: 'Gemischte Wiederholung', route: '/wiederholung' });

  // Zusammenfassung
  const intro = 'Einfache Offline-Auswertung (regelbasiert, ohne KI).';
  let summary: string;
  if (script && state && answered) {
    const endText = state.ended ? ' und das Gespräch bis zum Ende geführt' : '';
    const mood = hitPct! >= 80
      ? 'Stark – du hast die Situation souverän gemeistert.'
      : hitPct! >= 50
        ? 'Gute Basis! Mit den Beispielantworten unten wirst du noch sicherer.'
        : 'Jeder Versuch zählt – schau dir die Beispielantworten an und probiere es gleich noch einmal.';
    summary = `${intro} Du hast ${hits} von ${answered} Gesprächsschritten passend beantwortet${endText}. ${mood}`;
  } else {
    summary = `${intro} Geprüft wurden nur die Schreibweise von Fragen, die Antwortlänge und ob du in der Zielsprache geschrieben hast – Grammatik und Ausdruck kann nur die KI-Auswertung beurteilen.`;
  }

  const voiceTurns = turns.filter((t) => t.voice).length;
  const evaluation: PartnerEvaluation = {
    summary,
    grammarErrors,
    unnatural,
    vocabulary: { used, suggestions },
    alternatives,
    goodAnswers,
    recommendedExercises: recommended.slice(0, 4),
    scores,
    source: 'offline',
  };
  if (voiceTurns) {
    evaluation.pronunciation = `Du hast ${voiceTurns} ${voiceTurns === 1 ? 'Beitrag' : 'Beiträge'} gesprochen, und die Spracherkennung hat ${voiceTurns === 1 ? 'ihn' : 'sie'} in Text umgewandelt (Verständlichkeit laut Spracherkennung – keine phonetische Analyse). Gezieltes Feedback bekommst du im Aussprache-Labor.`;
  }
  return evaluation;
}
