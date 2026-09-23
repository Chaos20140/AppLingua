import type { GrammarTopic } from '../../types';

const T = 'pt.g.ser';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 4,
  category: 'Verben',
  title: 'ser – sein (Identität & Herkunft)',
  summary: 'Die Formen sou, é, somos, são – und wofür du ser brauchst: Name, Herkunft, Nationalität, Beruf, Eigenschaften, Uhrzeit und Datum.',
  keywords: ['ser', 'sein', 'sou', 'é', 'somos', 'são', 'Herkunft', 'Beruf', 'Nationalität', 'Identität'],
  explanation: [
    {
      type: 'conjugation',
      verb: 'ser',
      translation: 'sein',
      tense: 'Präsens',
      rows: [
        { person: 'eu', form: 'sou' },
        { person: 'você / ele / ela / a gente', form: 'é' },
        { person: 'nós', form: 'somos' },
        { person: 'vocês / eles / elas', form: 'são' },
      ],
    },
    {
      type: 'text',
      md:
        '`ser` beschreibt, **was oder wer** jemand oder etwas ist – Dinge, die zur Identität gehören:\n' +
        '- Name/Identität: `Sou a Lena.` · `Quem é ele?`\n' +
        '- Herkunft mit `de`: `Sou de Berlim.` · `Sou da Alemanha.`\n' +
        '- Nationalität: `Ela é brasileira.`\n' +
        '- Beruf (ohne Artikel!): `Ele é engenheiro.`\n' +
        '- Charakter/Eigenschaften: `Vocês são simpáticos.`\n' +
        '- Uhrzeit & Datum: `É uma hora.` · `São duas horas.` · `Hoje é sexta-feira.`',
    },
    {
      type: 'variant',
      variant: 'pt-BR',
      md: 'Typisch brasilianisch: Auf Ja/Nein-Fragen antwortet man gern mit dem Verb statt nur mit `sim`: `Você é brasileira? – Sou, sim!` bzw. `– Não, não sou.`',
    },
    { type: 'tip', md: '**ser = Steckbrief**: alles, was in einem Ausweis oder Profil stehen könnte.' },
  ],
  examples: [
    {
      target: 'Sou de Recife.',
      german: 'Ich komme aus Recife.',
      parts: [{ text: 'Sou', role: 'verb' }, { text: ' ' }, { text: 'de', role: 'preposition' }, { text: ' Recife.' }],
    },
    { target: 'Ele é engenheiro.', german: 'Er ist Ingenieur.' },
    { target: 'Nós somos alemães.', german: 'Wir sind Deutsche.', note: 'Plural von alemão: alemães.' },
    { target: 'Vocês são muito simpáticos.', german: 'Ihr seid sehr nett.' },
    { target: 'Hoje é sexta-feira.', german: 'Heute ist Freitag.' },
    { target: 'São duas horas.', german: 'Es ist zwei Uhr.', note: 'Uhrzeit ab zwei Uhr mit `são`.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Sou professora. · Sou de Munique.',
      german: 'Ich bin Lehrerin. · Ich komme aus München.',
      md: 'Beim Beruf wie im Deutschen **ohne** Artikel. Für die Herkunft sagt man wörtlich „Ich **bin** aus München“ – kein eigenes Verb wie „kommen“.',
    },
  ],
  mistakes: [
    { wrong: 'Eu é alemão.', right: 'Eu sou alemão.', why: 'Zu `eu` gehört immer `sou`.' },
    { wrong: 'Sou um médico.', right: 'Sou médico.', why: 'Vor Berufen steht nach `ser` kein Artikel.' },
    { wrong: 'Eu estou de Berlim.', right: 'Eu sou de Berlim.', why: 'Herkunft ist Teil der Identität → `ser`.' },
  ],
  mnemonic: 'sou – é – somos – são: der Steckbrief in vier Formen.',
  levels: [
    {
      level: 1,
      title: 'Formen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'matchPairs', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'eu', right: 'sou' }, { left: 'ela', right: 'é' }, { left: 'nós', right: 'somos' }, { left: 'eles', right: 'são' }],
          feedback: { rule: 'eu sou, ela é, nós somos, eles são.', why: '`ser` ist unregelmäßig – die Formen muss man lernen.', avoid: 'Sprich die Reihe laut: sou – é – somos – são.' },
        },
        {
          id: `${T}.L1.02`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          verb: 'ser', tense: 'Präsens', person: 'eu', sentence: 'Eu ___ da Alemanha.', answers: ['sou'],
          feedback: { rule: 'eu → `sou`.', why: '`é` ist die Form für você/ele/ela.', avoid: 'eu sou – wie „ich bin“.' },
        },
        {
          id: `${T}.L1.03`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Vocês ___ brasileiros?',
          options: [{ text: 'são' }, { text: 'é', why: '`é` ist Singular.' }, { text: 'somos', why: '`somos` gehört zu nós.' }],
          answer: 0,
          feedback: { rule: 'vocês → `são`.', why: '`vocês` steht mit der 3. Person Plural.', avoid: 'vocês = wie eles.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Im Satz',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Eu ___ de Curitiba e ela ___ de Manaus.', answers: [['sou'], ['é']], german: 'Ich komme aus Curitiba und sie aus Manaus.',
          feedback: { rule: 'eu sou, ela é – Herkunft mit `ser de`.', why: 'Jede Person braucht ihre eigene Form.', avoid: 'Erst das Subjekt suchen, dann die Form wählen.' },
        },
        {
          id: `${T}.L2.02`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.contractions'], difficulty: 2,
          tokens: ['Nós', 'somos', 'da', 'Alemanha.'], extra: ['estamos', 'de'], german: 'Wir kommen aus Deutschland.',
          feedback: { rule: 'Herkunft: `ser` + `da` (de + a) + Land.', why: '`estamos` beschreibt keinen Ursprung; `de Alemanha` ohne Artikel ist falsch.', avoid: 'Länder mit Artikel → da/do.' },
        },
        {
          id: `${T}.L2.03`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toTarget', source: 'Er ist Arzt.', answers: ['Ele é médico.', 'É médico.'],
          feedback: { rule: 'Beruf → `ser`, ohne Artikel: `Ele é médico.`', why: '`Ele é um médico` klingt nach „Er ist ein (bestimmter) Arzt“ – als reine Berufsangabe unüblich.', avoid: 'Beruf = kein Artikel, wie im Deutschen.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Wie Muttersprachler',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'Sou um professor.', answers: ['Sou professor.', 'Eu sou professor.'], german: 'Ich bin Lehrer.',
          feedback: { rule: 'Nach `ser` steht vor dem Beruf kein Artikel.', why: '`um` wäre nur mit einer Beschreibung möglich (`Sou um professor exigente`).', avoid: 'Beruf nackt: Sou professor.' },
        },
        {
          id: `${T}.L3.02`, type: 'dialogue', skills: ['reading', 'speaking'], topicIds: [T], difficulty: 3,
          lines: [
            { speaker: 'Marcos', text: 'Você é brasileira?', german: 'Bist du Brasilianerin?' },
            { speaker: 'Bia', text: '…' },
          ],
          gapIndex: 1, options: ['Sou, sim!', 'Estou, sim!', 'É, sim!'], answer: 0,
          feedback: { rule: 'Brasilianisch antworten: das Verb wiederholen – `Sou, sim!`', why: '`Estou` ist estar; `É` wäre die Form für „er/sie ist“.', avoid: 'Frage mit `é` an dich → Antwort mit `sou`.' },
        },
        {
          id: `${T}.L3.03`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 3,
          audio: 'Nós somos de São Paulo.', question: 'Wer kommt woher?',
          options: ['Ich – aus São Paulo', 'Wir – aus São Paulo', 'Sie (mehrere) – aus São Paulo'], answer: 1,
          feedback: { rule: '`somos` = wir sind.', why: '„ich“ wäre `sou`, „sie“ wäre `são`.', avoid: 'Endung -mos → wir.' },
        },
      ],
    },
  ],
  related: ['pt.g.estar', 'pt.g.ser-estar'],
};

export default topic;
