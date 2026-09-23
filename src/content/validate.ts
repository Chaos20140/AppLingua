/**
 * Inhaltsvalidierung: prüft Kurse und Songs auf Konsistenz (IDs, Antworten, Querverweise, Zeiten …).
 * Jede Übung wird zusätzlich mit ihrer Musterlösung durch die echte Bewertung geschickt –
 * so fallen widersprüchliche Lösungen sofort auf.
 */
import { STAGE_ORDER, SKILLS, type CourseId, type Variant } from '../core/types';
import { canonicalAnswer, countGaps, gradeExercise } from '../engine/grading';
import { normalize, stripAccents } from '../engine/text';
import type { CourseContent, Example, ExplainBlock, Exercise, Song } from './types';

const COURSE_VARIANTS: Record<CourseId, Variant[]> = { es: ['es-ES', 'es-LA'], 'pt-BR': ['pt-BR'] };
const ID_PREFIX: Record<CourseId, string> = { es: 'es.', 'pt-BR': 'pt.' };

function checkRegex(pattern: string): string | null {
  try {
    new RegExp(pattern, 'i');
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

const joined = (s: string) => s.replace(/\s+/g, '');

function validateExercise(ex: Exercise, where: string, ctx: {
  courseId: CourseId; topicIds: Set<string>; pronItemIds: Set<string>; scenarioIds: Set<string>;
}, err: (msg: string) => void) {
  const at = `${where} › ${ex.id}`;
  if (!ex.id) err(`${where}: Übung ohne id`);
  if (!ex.skills?.length) err(`${at}: skills fehlt`);
  for (const s of ex.skills ?? []) if (!SKILLS.includes(s)) err(`${at}: unbekannter Skill „${s}“`);
  if (!ex.feedback?.rule?.trim()) err(`${at}: feedback.rule fehlt`);
  if (ex.variant && !COURSE_VARIANTS[ctx.courseId].includes(ex.variant)) err(`${at}: Variante ${ex.variant} passt nicht zum Kurs`);
  for (const t of ex.topicIds ?? []) if (!ctx.topicIds.has(t)) err(`${at}: topicId „${t}“ existiert nicht`);

  const idxOk = (i: number | undefined, n: number) => typeof i === 'number' && Number.isInteger(i) && i >= 0 && i < n;
  switch (ex.type) {
    case 'mc':
    case 'situation':
      if (ex.options.length < 2) err(`${at}: mindestens 2 Optionen nötig`);
      if (!idxOk(ex.answer, ex.options.length)) err(`${at}: answer-Index ${ex.answer} außerhalb der Optionen`);
      // Groß-/Kleinschreibung ist bei Betonungsoptionen (LU-nes vs. lu-NES) bedeutungstragend
      if (new Set(ex.options.map((o) => o.text.trim())).size !== ex.options.length) err(`${at}: doppelte Optionen`);
      break;
    case 'listening':
    case 'minimalPair':
      if (ex.options.length < 2) err(`${at}: mindestens 2 Optionen nötig`);
      if (!idxOk(ex.answer, ex.options.length)) err(`${at}: answer-Index ${ex.answer} außerhalb der Optionen`);
      if (ex.type === 'listening' && !ex.audio.trim()) err(`${at}: audio fehlt`);
      break;
    case 'dialogue':
      if (!idxOk(ex.gapIndex, ex.lines.length)) err(`${at}: gapIndex außerhalb der Zeilen`);
      if (ex.options) {
        if (!idxOk(ex.answer, ex.options.length)) err(`${at}: answer-Index außerhalb der Optionen`);
      } else if (!ex.answers?.length) err(`${at}: weder options/answer noch answers angegeben`);
      break;
    case 'cloze': {
      const gaps = countGaps(ex.sentence);
      if (gaps === 0) err(`${at}: Satz enthält keine Lücke „___“`);
      if (gaps !== ex.answers.length) err(`${at}: ${gaps} Lücken, aber ${ex.answers.length} Antwortlisten`);
      ex.answers.forEach((a, i) => { if (!a.length || a.some((x) => !x.trim())) err(`${at}: leere Lösung für Lücke ${i + 1}`); });
      if (ex.bank) {
        const bank = new Set(ex.bank.map((b) => b.trim().toLowerCase()));
        ex.answers.forEach((a, i) => { if (!a.some((x) => bank.has(x.trim().toLowerCase()))) err(`${at}: Wortbank enthält keine Lösung für Lücke ${i + 1}`); });
      }
      break;
    }
    case 'order': {
      if (ex.tokens.length < 2) err(`${at}: mindestens 2 Tokens nötig`);
      // Satzzeichen/Großschreibung dürfen in Alternativen anders sitzen (Bewertung normalisiert)
      const key = (t: string[]) => normalize(t.join(' ')).split(' ').sort().join('|');
      for (const alt of ex.alternatives ?? []) if (key(alt) !== key(ex.tokens)) err(`${at}: alternative Reihenfolge nutzt andere Tokens`);
      const tokenSet = new Set(ex.tokens.map((t) => t.trim().toLowerCase()));
      for (const x of ex.extra ?? []) if (tokenSet.has(x.trim().toLowerCase())) err(`${at}: Ablenker „${x}“ ist auch Teil der Lösung`);
      break;
    }
    case 'translate':
    case 'dictation':
    case 'fixError':
    case 'conjugate':
      if (!ex.answers.length || ex.answers.some((a) => !a.trim())) err(`${at}: answers leer`);
      if (ex.type === 'fixError' && ex.answers.some((a) => stripAccents(a.trim().toLowerCase()) === stripAccents(ex.sentence.trim().toLowerCase()))) {
        err(`${at}: eine Lösung ist identisch mit dem fehlerhaften Satz`);
      }
      break;
    case 'freeText':
      if (!ex.samples.length) err(`${at}: samples fehlen`);
      for (const r of ex.requirements) {
        const bad = checkRegex(r.pattern);
        if (bad) err(`${at}: ungültiges Muster „${r.pattern}“ (${bad})`);
      }
      break;
    case 'speak':
      if (!ex.text.trim()) err(`${at}: text fehlt`);
      if (ex.pronItemId && !ctx.pronItemIds.has(ex.pronItemId)) err(`${at}: pronItemId „${ex.pronItemId}“ existiert nicht`);
      break;
    case 'speakFree':
      if (ex.minMatch < 1 || ex.minMatch > ex.keywords.length) err(`${at}: minMatch ${ex.minMatch} passt nicht zu ${ex.keywords.length} keywords`);
      break;
    case 'imageMatch':
    case 'matchPairs': {
      const pairs = ex.type === 'imageMatch' ? ex.pairs.map((p) => [p.emoji, p.word]) : ex.pairs.map((p) => [p.left, p.right]);
      if (pairs.length < 2) err(`${at}: mindestens 2 Paare nötig`);
      if (new Set(pairs.map((p) => p[0])).size !== pairs.length) err(`${at}: linke Seite nicht eindeutig`);
      if (new Set(pairs.map((p) => p[1].toLowerCase())).size !== pairs.length) err(`${at}: rechte Seite nicht eindeutig`);
      break;
    }
    case 'aiChat':
      if (!ctx.scenarioIds.has(ex.scenarioId)) err(`${at}: scenarioId „${ex.scenarioId}“ existiert nicht`);
      if (ex.turns < 1) err(`${at}: turns muss ≥ 1 sein`);
      break;
  }

  // Musterlösung muss von der echten Bewertung als richtig erkannt werden
  try {
    const outcome = gradeExercise(ex, canonicalAnswer(ex), { strictAccents: true });
    if (!outcome.correct) err(`${at}: Musterlösung wird von der Bewertung nicht als richtig erkannt (${outcome.explanation?.what ?? ''})`);
  } catch (e) {
    err(`${at}: Bewertung wirft einen Fehler (${(e as Error).message})`);
  }
}

function validateExample(ex: Example, where: string, err: (m: string) => void) {
  if (ex.parts && joined(ex.parts.map((p) => p.text).join('')) !== joined(ex.target)) {
    err(`${where}: parts ergeben nicht den Zielsatz „${ex.target}“`);
  }
}

function validateBlocks(blocks: ExplainBlock[], where: string, err: (m: string) => void) {
  blocks.forEach((b, i) => {
    if (b.type === 'table' && b.rows.some((r) => r.length !== b.headers.length)) err(`${where} › Tabelle ${i + 1}: Zeilenlänge ≠ Kopfzeile`);
    if (b.type === 'conjugation' && !b.rows.length) err(`${where} › Konjugation ${i + 1}: keine Zeilen`);
  });
}

/** Prüft einen Kurs. Gibt eine Liste deutscher Fehlermeldungen zurück (leer = alles in Ordnung). */
export function validateCourse(content: CourseContent): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  const courseId = content.meta.id;
  const prefix = ID_PREFIX[courseId];

  // Eindeutige IDs über alle Bereiche
  const seen = new Map<string, string>();
  const claim = (id: string, where: string) => {
    if (!id) { err(`${where}: leere ID`); return; }
    const prev = seen.get(id);
    if (prev) err(`Doppelte ID „${id}“ (${prev} und ${where})`);
    else seen.set(id, where);
  };

  const topicIds = new Set(content.grammar.map((g) => g.id));
  const pronItemIds = new Set(content.pronItems.map((p) => p.id));
  const categoryIds = new Set(content.pronCategories.map((c) => c.id));
  const scenarioIds = new Set(content.scenarios.map((s) => s.id));
  const examIds = new Map(content.exams.map((e) => [e.id, e]));
  const lessonIds = new Map(content.lessons.map((l) => [l.id, l]));
  const ctx = { courseId, topicIds, pronItemIds, scenarioIds };

  // Etappen & Kapitel
  const stageIds = new Set<string>();
  const lessonInChapter = new Map<string, string>();
  for (const st of content.stages) {
    claim(`stage:${st.id}`, `Etappe ${st.id}`);
    stageIds.add(st.id);
    if (!STAGE_ORDER.includes(st.id)) err(`Etappe ${st.id}: unbekannte StageId`);
    if (st.courseId !== courseId) err(`Etappe ${st.id}: courseId ${st.courseId} ≠ ${courseId}`);
    for (const ch of st.chapters) {
      claim(ch.id, `Kapitel ${ch.id}`);
      for (const lid of ch.lessonIds) {
        const l = lessonIds.get(lid);
        if (!l) { err(`Kapitel ${ch.id}: Lektion „${lid}“ existiert nicht`); continue; }
        if (lessonInChapter.has(lid)) err(`Lektion ${lid} steht in mehreren Kapiteln`);
        lessonInChapter.set(lid, ch.id);
        if (l.chapterId !== ch.id) err(`Lektion ${lid}: chapterId ${l.chapterId} ≠ Kapitel ${ch.id}`);
        if (l.stageId !== st.id) err(`Lektion ${lid}: stageId ${l.stageId} ≠ Etappe ${st.id}`);
      }
      if (ch.examId) {
        const e = examIds.get(ch.examId);
        if (!e) err(`Kapitel ${ch.id}: Zwischentest „${ch.examId}“ existiert nicht`);
        else if (e.kind !== 'midterm') err(`Kapitel ${ch.id}: „${ch.examId}“ ist kein Zwischentest (${e.kind})`);
      }
    }
    for (const [key, kind] of [['finalExamId', 'final'], ['bossExamId', 'boss']] as const) {
      const id = st[key];
      if (!id) continue;
      const e = examIds.get(id);
      if (!e) err(`Etappe ${st.id}: ${key} „${id}“ existiert nicht`);
      else if (e.kind !== kind) err(`Etappe ${st.id}: ${key} „${id}“ hat Art ${e.kind}, erwartet ${kind}`);
      else if (e.stageId !== st.id) err(`Etappe ${st.id}: Prüfung ${id} gehört zu Etappe ${e.stageId}`);
    }
    if (st.available && !st.chapters.some((c) => c.lessonIds.length)) err(`Etappe ${st.id}: als verfügbar markiert, hat aber keine Lektionen`);
    const m = st.mastery;
    if (m.finalPct < 0 || m.finalPct > 100 || m.bossPct < 0 || m.bossPct > 100) err(`Etappe ${st.id}: mastery-Prozente außerhalb 0–100`);
    for (const s of Object.keys(m.minSkills ?? {})) if (!SKILLS.includes(s as never)) err(`Etappe ${st.id}: unbekannter Skill in minSkills „${s}“`);
  }

  // Lektionen
  for (const l of content.lessons) {
    claim(l.id, `Lektion ${l.id}`);
    const w = `Lektion ${l.id}`;
    if (!l.id.startsWith(prefix)) err(`${w}: ID sollte mit „${prefix}“ beginnen`);
    if (l.courseId !== courseId) err(`${w}: courseId ${l.courseId} ≠ ${courseId}`);
    if (!stageIds.has(l.stageId)) err(`${w}: Etappe ${l.stageId} existiert nicht`);
    if (!lessonInChapter.has(l.id)) err(`${w}: steht in keinem Kapitel`);
    for (const t of l.topicIds) if (!topicIds.has(t)) err(`${w}: topicId „${t}“ existiert nicht`);
    for (const p of l.pronunciation) if (!pronItemIds.has(p)) err(`${w}: Aussprache-Element „${p}“ existiert nicht`);
    for (const v of l.vocab) {
      claim(v.id, `${w} › Vokabel`);
      if (v.variant && !COURSE_VARIANTS[courseId].includes(v.variant)) err(`${w} › ${v.id}: Variante passt nicht zum Kurs`);
    }
    l.examples.forEach((e, i) => validateExample(e, `${w} › Beispiel ${i + 1}`, err));
    validateBlocks(l.explanation, w, err);
    if (!l.guided.length) err(`${w}: keine geführten Übungen`);
    for (const [part, list] of [['geführt', l.guided], ['Anwendung', l.application], ['Wiederholung', l.review]] as const) {
      for (const ex of list) {
        claim(ex.id, `${w} (${part})`);
        validateExercise(ex, w, ctx, err);
      }
    }
  }

  // Prüfungen
  for (const e of content.exams) {
    claim(e.id, `Prüfung ${e.id}`);
    if (e.courseId !== courseId) err(`Prüfung ${e.id}: courseId ≠ ${courseId}`);
    if (!stageIds.has(e.stageId)) err(`Prüfung ${e.id}: Etappe ${e.stageId} existiert nicht`);
    if (e.passPct <= 0 || e.passPct > 100) err(`Prüfung ${e.id}: passPct außerhalb 1–100`);
    if (!e.sections.length || !e.sections.some((s) => s.exercises.length)) err(`Prüfung ${e.id}: keine Aufgaben`);
    if (e.kind === 'boss' && !e.boss) err(`Prüfung ${e.id}: Endgegner ohne boss-Angaben`);
    for (const s of e.sections) {
      if (!SKILLS.includes(s.skill)) err(`Prüfung ${e.id} › ${s.title}: unbekannter Skill`);
      for (const ex of s.exercises) {
        claim(ex.id, `Prüfung ${e.id}`);
        validateExercise(ex, `Prüfung ${e.id}`, ctx, err);
      }
    }
  }

  // Einstufung
  if (content.placement.courseId !== courseId) err('Einstufungstest: courseId passt nicht');
  if (!content.placement.questions.length) err('Einstufungstest: keine Fragen');
  for (const q of content.placement.questions) {
    if (!STAGE_ORDER.includes(q.level)) err(`Einstufung › ${q.exercise.id}: unbekannte Etappe ${q.level}`);
    claim(q.exercise.id, 'Einstufungstest');
    validateExercise(q.exercise, 'Einstufungstest', ctx, err);
  }

  // Grammatik
  for (const g of content.grammar) {
    claim(g.id, `Grammatik ${g.id}`);
    const w = `Grammatik ${g.id}`;
    if (g.courseId !== courseId) err(`${w}: courseId ≠ ${courseId}`);
    if (!g.id.startsWith(prefix)) err(`${w}: ID sollte mit „${prefix}“ beginnen`);
    for (const r of g.related ?? []) if (!topicIds.has(r)) err(`${w}: related „${r}“ existiert nicht`);
    validateBlocks(g.explanation, w, err);
    validateBlocks(g.germanComparison, w, err);
    g.examples.forEach((e, i) => validateExample(e, `${w} › Beispiel ${i + 1}`, err));
    if (!g.levels.some((l) => l.exercises.length)) err(`${w}: keine Übungen`);
    for (const lvl of g.levels) for (const ex of lvl.exercises) {
      claim(ex.id, w);
      validateExercise(ex, w, ctx, err);
    }
  }

  // Aussprache
  for (const p of content.pronItems) {
    claim(p.id, `Aussprache ${p.id}`);
    if (!categoryIds.has(p.categoryId)) err(`Aussprache ${p.id}: Kategorie ${p.categoryId} existiert nicht`);
    if (p.stress < 0 || p.stress >= p.syllables.length) err(`Aussprache ${p.id}: stress-Index außerhalb der Silben`);
    if (p.variant && !COURSE_VARIANTS[courseId].includes(p.variant)) err(`Aussprache ${p.id}: Variante passt nicht zum Kurs`);
  }
  for (const c of content.pronCategories) {
    claim(c.id, `Aussprache-Kategorie ${c.id}`);
    for (const id of c.itemIds) if (!pronItemIds.has(id)) err(`Aussprache-Kategorie ${c.id}: Element „${id}“ existiert nicht`);
  }

  // Szenarien
  for (const s of content.scenarios) {
    claim(s.id, `Szenario ${s.id}`);
    const variants = [s.script.formal, s.script.informal].filter((v): v is NonNullable<typeof v> => !!v);
    if (!variants.length) err(`Szenario ${s.id}: kein Skript`);
    for (const nodes of variants) {
      if (!nodes.length) { err(`Szenario ${s.id}: leeres Skript`); continue; }
      const ids = new Set(nodes.map((n) => n.id));
      if (ids.size !== nodes.length) err(`Szenario ${s.id}: doppelte Knoten-IDs`);
      if (!nodes.some((n) => n.end)) err(`Szenario ${s.id}: kein Endknoten`);
      for (const n of nodes) {
        if (!n.end && !ids.has(n.fallbackNext)) err(`Szenario ${s.id} › ${n.id}: fallbackNext „${n.fallbackNext}“ existiert nicht`);
        for (const e of n.expect) if (!ids.has(e.next)) err(`Szenario ${s.id} › ${n.id}: next „${e.next}“ existiert nicht`);
      }
    }
  }

  return errors;
}

/**
 * Prüft Songs. `courses` (optional) ermöglicht die Prüfung von grammarTags und Themenverweisen.
 */
export function validateSongs(songs: Song[], courses: Partial<Record<CourseId, CourseContent>> = {}): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  const ids = new Set<string>();
  for (const song of songs) {
    const w = `Song ${song.id}`;
    if (ids.has(song.id)) err(`${w}: doppelte ID`);
    ids.add(song.id);
    const expectedPrefix = song.courseId === 'es' ? 'song.es.' : 'song.pt.';
    if (!song.id.startsWith(expectedPrefix)) err(`${w}: ID sollte mit „${expectedPrefix}“ beginnen`);
    if (!COURSE_VARIANTS[song.courseId]?.includes(song.variant)) err(`${w}: Variante ${song.variant} passt nicht zum Kurs ${song.courseId}`);
    if (!['original', 'public-domain'].includes(song.license?.kind)) err(`${w}: Lizenz muss original oder public-domain sein`);
    if (!(song.durationMs > 0)) err(`${w}: durationMs fehlt`);
    if (!song.lines.length) err(`${w}: keine Zeilen`);
    if (song.colloquialPct < 0 || song.colloquialPct > 100) err(`${w}: colloquialPct außerhalb 0–100`);

    const course = courses[song.courseId];
    const topicIds = course ? new Set(course.grammar.map((g) => g.id)) : null;
    if (topicIds) for (const t of song.grammarTags) if (!topicIds.has(t)) err(`${w}: grammarTag „${t}“ existiert nicht`);

    const sectionIds = new Set(song.sections.map((s) => s.id));
    const lineIds = new Set<string>();
    let prevStart = -1;
    let prevEnd = 0;
    for (const line of song.lines) {
      const lw = `${w} › ${line.id}`;
      if (lineIds.has(line.id)) err(`${lw}: doppelte Zeilen-ID`);
      lineIds.add(line.id);
      if (!sectionIds.has(line.sectionId)) err(`${lw}: Abschnitt „${line.sectionId}“ existiert nicht`);
      if (!(line.startMs < line.endMs)) err(`${lw}: startMs muss kleiner als endMs sein`);
      if (line.startMs < prevStart) err(`${lw}: Zeiten nicht monoton (Start vor vorheriger Zeile)`);
      if (line.startMs < prevEnd) err(`${lw}: überlappt mit der vorherigen Zeile`);
      if (line.endMs > song.durationMs) err(`${lw}: endet nach Songende`);
      prevStart = line.startMs;
      prevEnd = line.endMs;
      if (joined(line.tokens.map((t) => t.t).join('')) !== joined(line.text)) err(`${lw}: Tokens ergeben nicht den Text „${line.text}“`);
      for (const t of line.tokens) {
        if (t.g && !song.glossary[t.g]) err(`${lw}: Glossar-Schlüssel „${t.g}“ fehlt`);
        if (t.p && t.g) err(`${lw}: Satzzeichen „${t.t}“ darf keinen Glossar-Eintrag haben`);
      }
      if (topicIds) for (const g of line.explanation.grammar) if (g.topicId && !topicIds.has(g.topicId)) err(`${lw}: topicId „${g.topicId}“ existiert nicht`);
    }
  }
  return errors;
}
