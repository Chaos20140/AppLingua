/**
 * Kleiner, vollständiger Testkurs (nur für Unit-Tests). Enthält jeden Übungstyp einmal.
 */
import type { CourseContent, Exercise, Exam, GrammarTopic, Lesson, Song } from '../../content/types';

const fb = { rule: 'Testregel.', why: 'Testbegründung.', avoid: 'Testtipp.' };

export const EXERCISES: Record<Exercise['type'], Exercise> = {
  mc: { id: 'x.mc', type: 'mc', skills: ['vocabulary'], topicIds: ['es.g.ser'], feedback: fb, prompt: 'Was heißt „Hallo“?', options: [{ text: 'hola' }, { text: 'adiós', why: '`adiós` heißt „tschüss“.' }], answer: 0 },
  cloze: { id: 'x.cloze', type: 'cloze', skills: ['grammar'], topicIds: ['es.g.ser'], feedback: fb, sentence: 'Yo ___ estudiante y tú ___ profesor.', answers: [['soy'], ['eres']], bank: ['soy', 'eres', 'es'] },
  order: { id: 'x.order', type: 'order', skills: ['grammar'], feedback: fb, tokens: ['Me', 'llamo', 'Ana', '.'], extra: ['soy'], german: 'Ich heiße Ana.' },
  translate: { id: 'x.translate', type: 'translate', skills: ['writing'], feedback: fb, direction: 'toTarget', source: 'Ich bin Studentin.', answers: ['Soy estudiante.', 'Yo soy estudiante.'] },
  freeText: { id: 'x.free', type: 'freeText', skills: ['writing'], feedback: fb, prompt: 'Stell dich vor.', requirements: [{ pattern: 'me llamo|soy', hint: 'deinen Namen (z. B. „Me llamo …“)' }, { pattern: 'años', hint: 'dein Alter mit „años“' }], samples: ['Me llamo Ana y tengo veinte años.'], minWords: 4 },
  listening: { id: 'x.listen', type: 'listening', skills: ['listening'], feedback: fb, audio: 'Buenos días', question: 'Was hörst du?', options: ['Guten Morgen', 'Gute Nacht'], answer: 0 },
  dictation: { id: 'x.dict', type: 'dictation', skills: ['listening', 'writing'], feedback: fb, audio: '¿Cómo estás?', answers: ['¿Cómo estás?'], german: 'Wie geht es dir?' },
  speak: { id: 'x.speak', type: 'speak', skills: ['pronunciation', 'speaking'], feedback: fb, text: 'El perro corre', german: 'Der Hund rennt', pronItemId: 'es.p.r.perro' },
  minimalPair: { id: 'x.pair', type: 'minimalPair', skills: ['pronunciation', 'listening'], feedback: fb, options: ['pero', 'perro'], answer: 1, hint: 'Gerolltes RR' },
  fixError: { id: 'x.fix', type: 'fixError', skills: ['grammar'], topicIds: ['es.g.estar'], feedback: fb, sentence: 'Yo es cansado.', answers: ['Yo estoy cansado.', 'Estoy cansado.'] },
  dialogue: { id: 'x.dialog', type: 'dialogue', skills: ['reading'], feedback: fb, lines: [{ speaker: 'A', text: '¡Hola!' }, { speaker: 'B', text: '' }], gapIndex: 1, options: ['¡Hola!', 'Gracias'], answer: 0 },
  situation: { id: 'x.sit', type: 'situation', skills: ['speaking'], feedback: fb, scenario: 'Du betrittst morgens ein Café.', options: [{ text: 'Buenos días.' }, { text: 'Buenas noches.', why: 'Das sagt man abends.' }], answer: 0 },
  imageMatch: { id: 'x.img', type: 'imageMatch', skills: ['vocabulary'], feedback: fb, pairs: [{ emoji: '🐶', word: 'perro' }, { emoji: '🐱', word: 'gato' }] },
  matchPairs: { id: 'x.match', type: 'matchPairs', skills: ['vocabulary'], feedback: fb, pairs: [{ left: 'hola', right: 'hallo' }, { left: 'adiós', right: 'tschüss' }, { left: 'gracias', right: 'danke' }] },
  conjugate: { id: 'x.conj', type: 'conjugate', skills: ['grammar'], topicIds: ['es.g.ser'], feedback: fb, verb: 'hablar', tense: 'Präsens', person: 'nosotros', answers: ['hablamos'] },
  speakFree: { id: 'x.sfree', type: 'speakFree', skills: ['speaking'], feedback: fb, prompt: 'Bestelle einen Kaffee.', keywords: ['café', 'por favor', 'quiero'], minMatch: 2, sample: 'Quiero un café, por favor.' },
  aiChat: { id: 'x.chat', type: 'aiChat', skills: ['speaking'], feedback: fb, scenarioId: 'es.sc.restaurant', goal: 'Bestelle ein Essen.', turns: 3 },
};

const withId = (ex: Exercise, id: string): Exercise => ({ ...ex, id });

function lesson(id: string, stageId: Lesson['stageId'], chapterId: string, order: number, exs: Exercise[], extra: Partial<Lesson> = {}): Lesson {
  return {
    id, courseId: 'es', stageId, chapterId, order, title: `Lektion ${order}`, icon: '📘', minutes: 8,
    goal: 'Testziel', canDo: ['Ich kann testen.'], topicIds: ['es.g.ser'],
    vocab: [
      { id: `${id}.v.hola`, target: 'hola', german: 'hallo', pos: 'phrase', field: 'Begrüßung', stageId, lessonId: id },
      { id: `${id}.v.vosotros`, target: 'vosotros', german: 'ihr', pos: 'pron', field: 'Pronomen', stageId, lessonId: id, variant: 'es-ES' },
    ],
    explanation: [{ type: 'text', md: 'Erklärung' }],
    examples: [{ target: 'Soy Ana.', german: 'Ich bin Ana.', parts: [{ text: 'Soy', role: 'verb' }, { text: ' Ana.', role: 'noun' }] }],
    guided: exs.slice(0, Math.max(1, exs.length - 1)),
    pronunciation: ['es.p.r.perro'],
    application: exs.slice(-1),
    review: [],
    ...extra,
  };
}

const E = EXERCISES;
const lessons: Lesson[] = [
  lesson('es.s0.l01', 'stage0', 'es.s0.c1', 1, [withId(E.mc, 'es.s0.l01.g01'), withId(E.cloze, 'es.s0.l01.g02'), withId(E.order, 'es.s0.l01.a01')]),
  lesson('es.s0.l02', 'stage0', 'es.s0.c1', 2, [withId(E.translate, 'es.s0.l02.g01'), withId(E.fixError, 'es.s0.l02.g02'), withId(E.freeText, 'es.s0.l02.a01')], { topicIds: ['es.g.estar'] }),
  lesson('es.s0.l03', 'stage0', 'es.s0.c2', 3, [withId(E.listening, 'es.s0.l03.g01'), withId(E.dictation, 'es.s0.l03.g02'), withId(E.speak, 'es.s0.l03.g03'), withId(E.minimalPair, 'es.s0.l03.g04'), withId(E.dialogue, 'es.s0.l03.a01')]),
  lesson('es.a1.l01', 'a1', 'es.a1.c1', 1, [withId(E.situation, 'es.a1.l01.g01'), withId(E.imageMatch, 'es.a1.l01.g02'), withId(E.matchPairs, 'es.a1.l01.g03'), withId(E.speakFree, 'es.a1.l01.g04'), withId(E.aiChat, 'es.a1.l01.a01')]),
];

function exam(id: string, kind: Exam['kind'], exs: Exercise[], passPct = 70): Exam {
  return {
    id, courseId: 'es', stageId: 'stage0', kind, title: kind === 'boss' ? 'Der Wächter' : kind === 'final' ? 'Abschlussprüfung Stufe 0' : 'Zwischentest 1',
    description: 'Test', passPct, sections: [{ title: 'Teil 1', skill: 'grammar', exercises: exs }],
    boss: kind === 'boss' ? { name: 'Don Tilde', emoji: '🐉', intro: 'Intro', defeat: 'Nochmal!', victory: 'Sieg!' } : undefined,
  };
}

const grammar: GrammarTopic[] = (['es.g.ser', 'es.g.estar', 'es.g.articles'] as const).map((id, i) => ({
  id, courseId: 'es', stageId: 'stage0', order: i + 1, category: 'Verben', title: id === 'es.g.ser' ? 'ser' : id === 'es.g.estar' ? 'estar' : 'Artikel',
  summary: 'Kurz erklärt', keywords: [id], explanation: [{ type: 'text', md: 'Text' }], examples: [], germanComparison: [],
  mistakes: [], mnemonic: 'Merksatz',
  levels: [{ level: 1, title: 'Einstieg', exercises: [withId(E.conjugate, `${id}.L1.01`), { ...withId(E.cloze, `${id}.L1.02`), topicIds: [id] }] }],
}));

export const COURSE: CourseContent = {
  meta: { id: 'es', name: 'Spanisch', nativeName: 'Español', flag: '🇪🇸', variants: [{ id: 'es-ES', label: 'Spanien', description: '', ttsLang: 'es-ES' }, { id: 'es-LA', label: 'Lateinamerika', description: '', ttsLang: 'es-MX' }] },
  stages: [
    {
      id: 'stage0', courseId: 'es', title: 'Stufe 0', short: 'Stufe 0', description: '', goals: [], grammarTopics: [], vocabFields: [], pronFocus: [], dialogues: [],
      chapters: [
        { id: 'es.s0.c1', title: 'Hallo', description: '', lessonIds: ['es.s0.l01', 'es.s0.l02'], examId: 'es.exam.s0.mid' },
        { id: 'es.s0.c2', title: 'Hören', description: '', lessonIds: ['es.s0.l03'] },
      ],
      finalExamId: 'es.exam.s0.final', bossExamId: 'es.exam.s0.boss',
      mastery: { finalPct: 70, bossPct: 60, minSkills: { grammar: 20 } },
      available: true,
    },
    {
      id: 'a1', courseId: 'es', title: 'A1', short: 'A1', description: '', goals: [], grammarTopics: [], vocabFields: [], pronFocus: [], dialogues: [],
      chapters: [{ id: 'es.a1.c1', title: 'Alltag', description: '', lessonIds: ['es.a1.l01'] }],
      mastery: { finalPct: 70, bossPct: 60, minSkills: {} },
      available: true,
    },
    {
      id: 'a2', courseId: 'es', title: 'A2', short: 'A2', description: '', goals: [], grammarTopics: [], vocabFields: [], pronFocus: [], dialogues: [],
      chapters: [], mastery: { finalPct: 70, bossPct: 60, minSkills: {} }, available: false,
    },
  ],
  lessons,
  exams: [
    exam('es.exam.s0.mid', 'midterm', [withId(E.mc, 'es.exam.s0.mid.01')]),
    exam('es.exam.s0.final', 'final', [withId(E.cloze, 'es.exam.s0.final.01'), withId(E.conjugate, 'es.exam.s0.final.02')]),
    exam('es.exam.s0.boss', 'boss', [withId(E.translate, 'es.exam.s0.boss.01')], 60),
  ],
  placement: { courseId: 'es', intro: 'Test', questions: [{ level: 'stage0', exercise: withId(E.mc, 'es.pl.01') }, { level: 'a1', exercise: withId(E.conjugate, 'es.pl.02') }] },
  grammar,
  pronCategories: [
    { id: 'es.pc.r', courseId: 'es', title: 'Einfaches R und gerolltes RR', icon: '🌀', description: '', itemIds: ['es.p.r.perro', 'es.p.r.pero'] },
    { id: 'es.pc.j-g', courseId: 'es', title: 'J und G', icon: '🔥', description: '', itemIds: ['es.p.j.jamon'] },
  ],
  pronItems: [
    { id: 'es.p.r.perro', courseId: 'es', categoryId: 'es.pc.r', text: 'perro', german: 'Hund', helper: 'PÄ-rro', ipa: 'ˈpero', syllables: ['pe', 'rro'], stress: 0, mouth: 'Zungenspitze vibriert', mistakes: ['deutsches Rachen-R'], tips: ['Mit „d-d-d“ üben'], issueCodes: ['rr'], level: 2 },
    { id: 'es.p.r.pero', courseId: 'es', categoryId: 'es.pc.r', text: 'pero', german: 'aber', helper: 'PÄ-ro', ipa: 'ˈpeɾo', syllables: ['pe', 'ro'], stress: 0, mouth: 'Zunge tippt einmal', mistakes: [], tips: ['Kurz antippen'], issueCodes: ['r'], level: 1 },
    { id: 'es.p.j.jamon', courseId: 'es', categoryId: 'es.pc.j-g', text: 'jamón', german: 'Schinken', helper: 'cha-MON', ipa: 'xaˈmon', syllables: ['ja', 'món'], stress: 1, mouth: 'Rachen', mistakes: [], tips: ['Wie „ach“'], issueCodes: ['j'], level: 1 },
  ],
  scenarios: [{
    id: 'es.sc.restaurant', courseId: 'es', key: 'restaurant', title: 'Im Restaurant', emoji: '🍽️', description: '', partnerRole: 'Kellner', userRole: 'Gast',
    goals: ['bestellen'], phrases: [], register: 'formell',
    script: { formal: [
      { id: 'n1', partner: '¿Qué desea?', partnerGerman: 'Was wünschen Sie?', expect: [{ keywords: ['quiero'], next: 'n2' }], fallbackNext: 'n2', hint: 'Bestelle', sample: 'Quiero un café.' },
      { id: 'n2', partner: 'Muy bien.', partnerGerman: 'Sehr gut.', expect: [], fallbackNext: 'n2', hint: '', sample: '', end: true },
    ] },
  }],
};

export const SONG: Song = {
  id: 'song.es.la-plaza', courseId: 'es', variant: 'es-LA', title: 'La plaza', artist: 'Demo-Band', cover: { from: '#000', to: '#fff', emoji: '🎵' },
  genre: 'Pop', level: 'A1', speed: 'langsam', wordsPerMinute: 80, colloquialPct: 10, explicit: false, themes: ['Stadt'],
  grammarTags: ['es.g.ser'], license: { kind: 'original', note: 'Eigenes Demo-Lied' },
  backing: { bpm: 90, style: 'pop', key: 'C', chords: ['C', 'G'] }, durationMs: 20000,
  sections: [{ id: 'v1', label: 'Strophe' }],
  lines: [
    { id: 'l01', sectionId: 'v1', startMs: 0, endMs: 4000, text: '¡Hola, amigo!', tokens: [{ t: '¡', p: true }, { t: 'Hola', g: 'hola' }, { t: ',', p: true }, { t: 'amigo', g: 'amigo' }, { t: '!', p: true }], natural: 'Hallo, Freund!', literal: 'Hallo, Freund!', phonetic: 'OLA amiGO', difficulty: 1, explanation: { summary: '', grammar: [{ title: 'ser', md: '', topicId: 'es.g.ser' }], alternatives: [], everyday: '' } },
    { id: 'l02', sectionId: 'v1', startMs: 4000, endMs: 8000, text: 'Soy de aquí.', tokens: [{ t: 'Soy', g: 'soy' }, { t: 'de' }, { t: 'aquí' }, { t: '.', p: true }], natural: 'Ich bin von hier.', literal: 'Ich bin von hier.', phonetic: 'SOI de aKI', difficulty: 1, explanation: { summary: '', grammar: [], alternatives: [], everyday: '' } },
  ],
  glossary: {
    hola: { lemma: 'hola', pos: 'Interjektion', meaning: 'hallo', register: 'neutral', phonetic: 'OLA', examples: [], everyday: 'ja' },
    amigo: { lemma: 'amigo', pos: 'Nomen (m)', meaning: 'Freund', register: 'neutral', phonetic: 'aMIgo', examples: [], everyday: 'ja' },
    soy: { lemma: 'ser', pos: 'Verb', meaning: 'ich bin', register: 'neutral', phonetic: 'SOI', examples: [], everyday: 'ja' },
  },
};
