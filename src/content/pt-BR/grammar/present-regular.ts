import type { GrammarTopic } from '../../types';

const T = 'pt.g.present-regular';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 10,
  category: 'Verben',
  title: 'Präsens der regelmäßigen Verben',
  summary: 'Verben auf -ar, -er und -ir im Präsens: Im brasilianischen Alltag reichen vier Formen – falo, fala, falamos, falam.',
  keywords: ['Präsens', 'Gegenwart', 'regelmäßig', '-ar', '-er', '-ir', 'falar', 'morar', 'comer', 'abrir', 'Konjugation', 'Endungen'],
  explanation: [
    {
      type: 'text',
      md:
        'Portugiesische Verben enden im Infinitiv auf **-ar**, **-er** oder **-ir**. Für das Präsens nimmst du den Stamm (`fal-`, `com-`, `abr-`) und hängst die Endung an.\n' +
        'Gute Nachricht für Brasilien: Weil `você`, `a gente` und `ele/ela` dieselbe Form haben und `vocês` wie `eles` konjugiert wird, brauchst du im Alltag nur **vier** Formen. (`tu` und `vós` lernst du später nur zum Verstehen.)',
    },
    {
      type: 'conjugation',
      verb: 'falar',
      translation: 'sprechen',
      tense: 'Präsens',
      rows: [
        { person: 'eu', form: 'falo', ending: 'o' },
        { person: 'você / ele / ela / a gente', form: 'fala', ending: 'a' },
        { person: 'nós', form: 'falamos', ending: 'amos' },
        { person: 'vocês / eles / elas', form: 'falam', ending: 'am' },
      ],
    },
    {
      type: 'table',
      title: 'Endungen im Vergleich',
      headers: ['Person', '-ar (falar)', '-er (comer)', '-ir (abrir)'],
      rows: [
        ['eu', 'falo', 'como', 'abro'],
        ['você / ele / ela / a gente', 'fala', 'come', 'abre'],
        ['nós', 'falamos', 'comemos', 'abrimos'],
        ['vocês / eles / elas', 'falam', 'comem', 'abrem'],
      ],
    },
    {
      type: 'text',
      md:
        '**Wofür das Präsens?** Für das, was jetzt oder regelmäßig passiert (`Moro em Recife.` · `Trabalho de segunda a sexta.`), und – wie im Deutschen – für die nahe Zukunft (`Amanhã eu falo com ele.`).\n' +
        'Was **genau jetzt** passiert, drücken Brasilianer meist mit `estar` + Gerundium aus: `Estou falando.` – Ich spreche gerade. (Das lernst du in Etappe A1.)',
    },
    { type: 'tip', md: 'Endungs-Merkspruch: **eu -o · você -a/-e · nós -mos · vocês -m.** -er und -ir unterscheiden sich nur bei nós: -emos / -imos.' },
  ],
  examples: [
    {
      target: 'Eu moro em Salvador.',
      german: 'Ich wohne in Salvador.',
      parts: [{ text: 'Eu', role: 'subject' }, { text: ' ' }, { text: 'mor', role: 'verb' }, { text: 'o', role: 'ending' }, { text: ' em Salvador.' }],
    },
    { target: 'Você fala inglês?', german: 'Sprichst du Englisch?' },
    { target: 'Nós aprendemos português.', german: 'Wir lernen Portugiesisch.' },
    { target: 'A gente come muito feijão.', german: 'Wir essen viele Bohnen.', note: '`a gente` + ele-Form: `come`.' },
    { target: 'Eles abrem a loja às nove.', german: 'Sie öffnen den Laden um neun.' },
    { target: 'Ela trabalha em casa.', german: 'Sie arbeitet zu Hause.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'falo · fala · fala · falamos · falam · falam',
      german: 'ich spreche · du sprichst · er spricht · wir sprechen · ihr sprecht · sie sprechen',
      md: 'Das Deutsche hat fünf verschiedene Präsensformen, das brasilianische Portugiesisch praktisch nur vier – „du“ und „er“ teilen sich eine Form. Dafür musst du bei `você fala` das Pronomen meist mitsagen.',
    },
  ],
  mistakes: [
    { wrong: 'Você falas português?', right: 'Você fala português?', why: '`você` steht mit der 3. Person Singular – ohne -s.' },
    { wrong: 'A gente falamos.', right: 'A gente fala.', why: '`a gente` = Verbform wie `ele`.' },
    { wrong: 'Eles aprendam.', right: 'Eles aprendem.', why: '-er-Verben enden bei eles auf -em, nicht -am.' },
  ],
  mnemonic: 'eu -o · você -a/-e · nós -mos · vocês -m.',
  levels: [
    {
      level: 1,
      title: 'Formen bilden',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          verb: 'morar', tense: 'Präsens', person: 'eu', sentence: 'Eu ___ em Belo Horizonte.', answers: ['moro'],
          feedback: { rule: 'eu → Stamm + **-o**: `moro`.', why: '`mora` wäre die Form für você/ele.', avoid: 'eu endet im Präsens fast immer auf -o.' },
        },
        {
          id: `${T}.L1.02`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          verb: 'comer', tense: 'Präsens', person: 'nós', sentence: 'Nós ___ às oito.', answers: ['comemos'],
          feedback: { rule: '-er-Verben bei nós: **-emos** → `comemos`.', why: '„comamos“ wäre Subjuntivo (Konjunktiv), kein Indikativ Präsens.', avoid: 'Der Themavokal des Infinitivs (-er → e) bleibt bei nós erhalten.' },
        },
        {
          id: `${T}.L1.03`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Ela ___ português.',
          options: [{ text: 'falo', why: '`falo` ist die eu-Form.' }, { text: 'fala' }, { text: 'falam', why: '`falam` ist Plural.' }],
          answer: 1,
          feedback: { rule: 'ela → `fala`.', why: '3. Person Singular endet bei -ar-Verben auf -a.', avoid: 'você/ele/ela/a gente → -a.' },
        },
      ],
    },
    {
      level: 2,
      title: '-er und -ir',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          verb: 'abrir', tense: 'Präsens', person: 'eles', sentence: 'Eles ___ a porta.', answers: ['abrem'],
          feedback: { rule: '-ir-Verben bei eles: **-em** → `abrem`.', why: '„abram“ wäre eine Konjunktivform.', avoid: '-er und -ir haben bei eles dieselbe Endung: -em.' },
        },
        {
          id: `${T}.L2.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          instruction: 'Setze morar und trabalhar in der eu-Form ein.',
          sentence: 'Eu ___ em Recife e ___ num hotel.', answers: [['moro'], ['trabalho']], german: 'Ich wohne in Recife und arbeite in einem Hotel.',
          feedback: { rule: 'eu → -o: `moro`, `trabalho`.', why: 'Beide sind regelmäßige -ar-Verben.', avoid: 'Stamm finden (mor-, trabalh-) + o.' },
        },
        {
          id: `${T}.L2.03`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 2,
          audio: 'Vocês falam alemão?', question: 'Wer wird gefragt?', options: ['eine Person (du)', 'mehrere Personen (ihr)', 'er'], answer: 1,
          feedback: { rule: '`vocês falam` = ihr sprecht / Sie sprechen (mehrere).', why: 'Für eine Person hieße es `você fala`.', avoid: 'Endung -am/-em + vocês → mehrere Personen.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Sicher anwenden',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.pronouns'], difficulty: 3,
          sentence: 'A gente moramos no Brasil.', answers: ['A gente mora no Brasil.', 'Nós moramos no Brasil.'], german: 'Wir wohnen in Brasilien.',
          feedback: { rule: '`a gente mora` (3. Sg.) oder `nós moramos`.', why: 'Die Mischung ist grammatisch falsch.', avoid: 'Entscheide dich: a gente + -a oder nós + -mos.' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          direction: 'toTarget', source: 'Wir lernen Portugiesisch.',
          answers: ['Nós aprendemos português.', 'Aprendemos português.', 'A gente aprende português.', 'Nós estudamos português.', 'Estudamos português.', 'A gente estuda português.'],
          feedback: { rule: '`aprender` (-er) → nós aprendemos / a gente aprende. `estudar` ist ebenfalls möglich.', why: 'Sprachen schreibt man klein: `português`.', avoid: 'nós → -emos bei -er-Verben.' },
        },
        {
          id: `${T}.L3.03`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          verb: 'dividir', tense: 'Präsens', person: 'nós', sentence: 'Nós ___ a conta.', answers: ['dividimos'],
          feedback: { rule: '-ir-Verben bei nós: **-imos** → `dividimos`.', why: '„dividemos“ wäre die -er-Endung.', avoid: 'Nur bei nós unterscheiden sich -er (-emos) und -ir (-imos).' },
        },
      ],
    },
  ],
  related: ['pt.g.pronouns', 'pt.g.questions'],
};

export default topic;
