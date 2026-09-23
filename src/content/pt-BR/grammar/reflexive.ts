import type { GrammarTopic } from '../../types';

const T = 'pt.g.reflexive';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'a1',
  order: 17,
  category: 'Verben',
  title: 'Reflexive Verben: eu me levanto',
  summary: 'Reflexive Verben wie levantar-se, chamar-se und vestir-se – mit der brasilianischen Stellung: Das Pronomen steht vor dem Verb (eu me levanto). Dazu: sempre, geralmente, às vezes, nunca.',
  keywords: ['reflexiv', 'me', 'se', 'nos', 'levantar-se', 'chamar-se', 'vestir-se', 'deitar-se', 'Tagesablauf', 'sempre', 'nunca', 'às vezes', 'geralmente'],
  explanation: [
    {
      type: 'conjugation',
      verb: 'levantar-se',
      translation: 'aufstehen',
      tense: 'Präsens',
      rows: [
        { person: 'eu', form: 'me levanto', ending: 'o' },
        { person: 'você / ele / ela / a gente', form: 'se levanta', ending: 'a' },
        { person: 'nós', form: 'nos levantamos', ending: 'amos' },
        { person: 'vocês / eles / elas', form: 'se levantam', ending: 'am' },
      ],
    },
    {
      type: 'text',
      md:
        'Reflexive Verben erkennst du im Wörterbuch am **-se**: `levantar-se` (aufstehen), `chamar-se` (heißen), `vestir-se` (sich anziehen), `deitar-se` (sich hinlegen, ins Bett gehen). Das Pronomen passt zur Person: **me – se – nos – se**. Auch `você` und `a gente` stehen mit **se**.',
    },
    { type: 'colored', parts: [{ text: 'Eu', role: 'subject' }, { text: ' ' }, { text: 'me', role: 'pronoun' }, { text: ' ' }, { text: 'levanto', role: 'verb' }, { text: ' ' }, { text: 'cedo', role: 'adverb' }, { text: '.' }], german: 'Ich stehe früh auf.' },
    {
      type: 'text',
      md:
        '**Brasilianische Stellung:** Im Alltag steht das Pronomen **vor dem Verb** – sogar am Satzanfang: `Me chamo Lena.` Auch Verneinung und Häufigkeitswörter kommen davor: `Eu não me levanto cedo.` · `Ela sempre se veste rápido.` Die Form mit Bindestrich (`levanto-me`) liest du in Portugal oder in sehr formellen Texten – in Brasilien klingt sie steif.',
    },
    {
      type: 'conjugation',
      verb: 'vestir-se',
      translation: 'sich anziehen',
      tense: 'Präsens',
      rows: [
        { person: 'eu', form: 'me visto', ending: 'o' },
        { person: 'você / ele / ela / a gente', form: 'se veste', ending: 'e' },
        { person: 'nós', form: 'nos vestimos', ending: 'imos' },
        { person: 'vocês / eles / elas', form: 'se vestem', ending: 'em' },
      ],
    },
    {
      type: 'text',
      md:
        'Achtung bei `vestir`: In der ich-Form wird das e zu i – eu me **visto**.\n**Nicht alles ist reflexiv wie im Deutschen:** `Eu tomo banho.` = Ich dusche (mich). `Eu acordo.` = Ich wache auf. Dafür ist `levantar-se` (aufstehen) reflexiv.\n**Umgangssprache:** Bei `levantar` und `deitar` lassen Brasilianer das Pronomen oft weg: `Eu levanto cedo.` – das ist normal. Bei `chamar-se` geht das nicht: `Eu chamo Lena` hieße „Ich rufe Lena“.',
    },
    {
      type: 'table',
      title: 'Wie oft? – Häufigkeitswörter',
      headers: ['Wort', 'Bedeutung', 'Beispiel'],
      rows: [
        ['sempre', 'immer', 'Eu sempre me levanto cedo.'],
        ['geralmente', 'normalerweise', 'Geralmente ela se veste rápido.'],
        ['às vezes', 'manchmal', 'Às vezes a gente se levanta tarde.'],
        ['nunca', 'nie', 'Ele nunca se deita cedo.'],
      ],
    },
    { type: 'tip', md: '**me – se – nos – se, und zwar vor dem Verb.** `nunca` verneint allein – ohne zusätzliches `não`.' },
    { type: 'audio', text: 'Eu acordo, me levanto, tomo banho e me visto.', label: 'Ich wache auf, stehe auf, dusche und ziehe mich an.' },
  ],
  examples: [
    { target: 'Como você se chama? – Me chamo Lena.', german: 'Wie heißt du? – Ich heiße Lena.' },
    {
      target: 'Eu sempre me levanto cedo.',
      german: 'Ich stehe immer früh auf.',
      parts: [{ text: 'Eu', role: 'subject' }, { text: ' ' }, { text: 'sempre', role: 'adverb' }, { text: ' ' }, { text: 'me', role: 'pronoun' }, { text: ' ' }, { text: 'levanto', role: 'verb' }, { text: ' ' }, { text: 'cedo', role: 'adverb' }, { text: '.' }],
    },
    { target: 'A gente se veste e toma café.', german: 'Wir ziehen uns an und frühstücken.' },
    {
      target: 'Nós nos levantamos tarde.',
      german: 'Wir stehen spät auf.',
      parts: [{ text: 'Nós', role: 'subject' }, { text: ' ' }, { text: 'nos', role: 'pronoun' }, { text: ' ' }, { text: 'levanta', role: 'verb' }, { text: 'mos', role: 'ending' }, { text: ' ' }, { text: 'tarde', role: 'adverb' }, { text: '.' }],
    },
    { target: 'As crianças não se deitam cedo.', german: 'Die Kinder gehen nicht früh ins Bett.' },
    { target: 'Ele toma banho e se veste.', german: 'Er duscht und zieht sich an.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Eu me visto.',
      german: 'Ich ziehe mich an.',
      md: 'Deutsch: Pronomen **nach** dem Verb. Brasilianisches Portugiesisch: Pronomen **vor** dem Verb.',
    },
    {
      type: 'compare',
      target: 'Eu me levanto. · Eu tomo banho.',
      german: 'Ich stehe auf. · Ich dusche (mich).',
      md: 'Reflexiv ist nicht gleich reflexiv: „aufstehen“ ist im Portugiesischen reflexiv, „duschen“ (`tomar banho`) nicht.',
    },
  ],
  mistakes: [
    { wrong: 'Eu se levanto cedo.', right: 'Eu me levanto cedo.', why: 'Das Pronomen passt zur Person: eu → `me`.' },
    { wrong: 'A gente nos levantamos cedo.', right: 'A gente se levanta cedo.', why: '`a gente` steht mit `se` und der 3. Person Singular.' },
    { wrong: 'Eu chamo Lena.', right: 'Eu me chamo Lena.', why: 'Ohne `me` heißt es „Ich rufe Lena“.' },
    { wrong: 'Eu me ducho.', right: 'Eu tomo banho.', why: '„duschen“ heißt `tomar banho` – nicht reflexiv.' },
    { wrong: 'Eu levanto-me cedo.', right: 'Eu me levanto cedo.', why: 'In Brasilien steht das Pronomen vor dem Verb; die nachgestellte Form klingt europäisch oder amtlich.' },
  ],
  mnemonic: '**me – se – nos – se, immer vor dem Verb:** eu me levanto, você se levanta, nós nos levantamos.',
  levels: [
    {
      level: 1,
      title: 'Das passende Pronomen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Eu ___ chamo Paulo.',
          options: [{ text: 'me' }, { text: 'se', why: '`se` gehört zu você/ele/ela/eles.' }, { text: 'nos', why: '`nos` gehört zu `nós`.' }],
          answer: 0,
          feedback: { rule: 'eu → `me`: `Eu me chamo Paulo.`', why: 'Das Pronomen muss zur Person passen.', avoid: 'eu – me, nós – nos, alle anderen – se.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Vocês ___ levantam cedo?',
          options: [{ text: 'nos', why: '`nos` passt nur zu `nós`.' }, { text: 'se' }, { text: 'me', why: '`me` passt nur zu `eu`.' }],
          answer: 1,
          feedback: { rule: 'vocês → `se`: `Vocês se levantam cedo?`', why: '`vocês` steht grammatisch wie `eles` – mit `se`.', avoid: 'vocês = eles → se.' },
        },
        {
          id: `${T}.L1.03`, type: 'matchPairs', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'eu', right: 'me visto' }, { left: 'ela', right: 'se veste' }, { left: 'nós', right: 'nos vestimos' }, { left: 'eles', right: 'se vestem' }],
          feedback: { rule: 'eu me visto · ela se veste · nós nos vestimos · eles se vestem.', why: 'Pronomen und Verbendung passen beide zur Person.', avoid: 'Pronomen und Endung gemeinsam prüfen.' },
        },
        {
          id: `${T}.L1.04`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          sentence: 'Eu ___ levanto cedo, mas meu marido ___ levanta tarde.', answers: [['me'], ['se']],
          german: 'Ich stehe früh auf, aber mein Mann steht spät auf.',
          feedback: { rule: 'eu → `me`; ele (meu marido) → `se`.', why: 'Zwei Personen, zwei Pronomen.', avoid: 'Für jedes Subjekt neu entscheiden.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Stellung & Häufigkeit',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          tokens: ['Eu', 'nunca', 'me', 'levanto', 'cedo.'], extra: ['se', 'não'], german: 'Ich stehe nie früh auf.',
          feedback: { rule: 'Subjekt + `nunca` + Pronomen + Verb: `Eu nunca me levanto cedo.`', why: '`nunca` verneint allein – ein zusätzliches `não` ist hier falsch; `se` passt nicht zu `eu`.', avoid: 'Häufigkeitswort vor das Pronomen.' },
        },
        {
          id: `${T}.L2.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Welcher Satz klingt im brasilianischen Alltag natürlich?',
          options: [{ text: 'Eu me levanto cedo.' }, { text: 'Eu levanto-me cedo.', why: 'Nachgestelltes Pronomen: typisch für Portugal oder sehr formelle Texte.' }, { text: 'Me eu levanto cedo.', why: 'Das Pronomen steht direkt vor dem Verb, nicht vor dem Subjekt.' }],
          answer: 0,
          feedback: { rule: 'Brasilien: Pronomen direkt vor dem Verb – `eu me levanto`.', why: 'Die Stellung mit Bindestrich ist in Brasilien nur in formeller Schriftsprache üblich.', avoid: 'Pronomen = direkt links vom Verb.' },
        },
        {
          id: `${T}.L2.03`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          instruction: 'Setze vestir-se mit Pronomen ein.',
          verb: 'vestir-se', tense: 'Präsens', person: 'eu', sentence: 'Eu ___ rápido.', answers: ['me visto'],
          feedback: { rule: 'eu → `me visto` (e wird zu i).', why: '„me veste“ wäre die Endung für ele/ela, „se visto“ das falsche Pronomen.', avoid: 'vestir: eu visto – alle anderen mit e.' },
        },
        {
          id: `${T}.L2.04`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.questions'], difficulty: 2,
          instruction: 'Setze chamar-se mit Pronomen ein.',
          verb: 'chamar-se', tense: 'Präsens', person: 'vocês', sentence: 'Como vocês ___?', answers: ['se chamam'],
          feedback: { rule: 'vocês → `se chamam`.', why: 'vocês verlangt `se` und die Endung -am.', avoid: 'vocês = eles: se … -am.' },
        },
        {
          id: `${T}.L2.05`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.pronouns'], difficulty: 2,
          tokens: ['A', 'gente', 'sempre', 'se', 'deita', 'tarde.'], extra: ['nos', 'deitamos'], german: 'Wir gehen immer spät ins Bett.',
          alternatives: [['A', 'gente', 'se', 'deita', 'sempre', 'tarde.']],
          feedback: { rule: '`a gente` + `se` + 3. Person Singular: `a gente se deita`.', why: '`nos deitamos` gehört zu `nós`, nicht zu `a gente`.', avoid: 'a gente = wie ele.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Der Tagesablauf',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          direction: 'toTarget', source: 'Ich stehe auf, dusche und ziehe mich an.',
          answers: ['Eu me levanto, tomo banho e me visto.', 'Me levanto, tomo banho e me visto.', 'Eu levanto, tomo banho e me visto.', 'Levanto, tomo banho e me visto.', 'Eu me levanto, tomo um banho e me visto.', 'Me levanto, tomo um banho e me visto.'],
          feedback: { rule: '`me levanto` (reflexiv), `tomo banho` (nicht reflexiv), `me visto` (reflexiv).', why: '„duschen“ ist im Portugiesischen nicht reflexiv; „aufstehen“ schon.', avoid: 'Nicht Wort für Wort übersetzen – jedes Verb einzeln prüfen.' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['reading', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toGerman', source: 'Como você se chama?',
          answers: ['Wie heißt du?', 'Wie heißen Sie?'],
          feedback: { rule: '`chamar-se` = heißen; `você se chama` = du heißt / Sie heißen.', why: 'Wörtlich: „Wie nennst du dich?“ – natürlich: „Wie heißt du?“', avoid: 'chamar-se = heißen.' },
        },
        {
          id: `${T}.L3.03`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 3,
          audio: 'Eu sempre acordo cedo, mas às vezes me levanto tarde.', question: 'Was stimmt?',
          options: ['Die Person wacht immer früh auf, steht aber manchmal spät auf.', 'Die Person steht immer früh auf.', 'Die Person wacht manchmal spät auf.'], answer: 0,
          feedback: { rule: '`acordar` = aufwachen, `levantar-se` = aufstehen; `sempre` = immer, `às vezes` = manchmal.', why: 'Aufwachen und Aufstehen sind hier zwei verschiedene Dinge.', avoid: 'acordo ≠ me levanto.' },
        },
        {
          id: `${T}.L3.04`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'Eu me ducho e me visto.', answers: ['Eu tomo banho e me visto.', 'Tomo banho e me visto.'], german: 'Ich dusche und ziehe mich an.',
          feedback: { rule: '„duschen“ = `tomar banho` (ohne Pronomen).', why: '„me ducho“ ist eine Übertragung aus dem Deutschen und klingt falsch.', avoid: 'tomar banho – nie reflexiv.' },
        },
        {
          id: `${T}.L3.05`, type: 'speakFree', skills: ['speaking', 'grammar'], topicIds: [T], difficulty: 3,
          prompt: 'Erzähl mündlich, wie dein Morgen abläuft: aufwachen, aufstehen, duschen, anziehen, frühstücken.',
          keywords: ['acordo', 'levanto', 'tomo banho', 'me visto', 'tomo café'], minMatch: 3,
          sample: 'Eu acordo cedo, me levanto, tomo banho, me visto e tomo café.',
          feedback: { rule: 'acordo · me levanto · tomo banho · me visto · tomo café.', why: 'Fehlende Schlüsselwörter bedeuten, dass ein Schritt fehlt oder nicht erkannt wurde.', avoid: 'Kurze Verbketten mit „e“ verbinden.' },
        },
      ],
    },
  ],
  related: ['pt.g.pronouns', 'pt.g.present-regular', 'pt.g.time-dates'],
};

export default topic;
