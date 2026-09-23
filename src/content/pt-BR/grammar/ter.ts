import type { GrammarTopic } from '../../types';

const T = 'pt.g.ter';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'a1',
  order: 13,
  category: 'Verben',
  title: 'ter – haben',
  summary: 'Das unregelmäßige Verb ter (haben): Besitz, Familie und Alter – und warum tem und têm gleich klingen, aber verschieden geschrieben werden.',
  keywords: ['ter', 'haben', 'tenho', 'tem', 'temos', 'têm', 'Alter', 'Familie', 'Besitz', 'unregelmäßig', 'kein'],
  explanation: [
    {
      type: 'conjugation',
      verb: 'ter',
      translation: 'haben',
      tense: 'Präsens',
      rows: [
        { person: 'eu', form: 'tenho', ending: 'enho' },
        { person: 'você / ele / ela / a gente', form: 'tem', ending: 'em' },
        { person: 'nós', form: 'temos', ending: 'emos' },
        { person: 'vocês / eles / elas', form: 'têm', ending: 'êm' },
      ],
    },
    {
      type: 'text',
      md:
        '`ter` ist unregelmäßig – die gute Nachricht: Es sind nur **vier Formen**. Wichtig: `tem` (Singular) und `têm` (Plural) **klingen in Brasilien genau gleich** („tẽi“). Der Zirkumflex (^) zeigt nur beim Schreiben, dass mehrere Personen etwas haben: `Ela tem …` – `Elas têm …`',
    },
    {
      type: 'table',
      title: 'Wofür man ter braucht',
      headers: ['Verwendung', 'Beispiel', 'Deutsch'],
      rows: [
        ['Besitz', 'Tenho um carro.', 'Ich habe ein Auto.'],
        ['Familie', 'Ela tem dois irmãos.', 'Sie hat zwei Brüder / Geschwister.'],
        ['Alter', 'Tenho trinta anos.', 'Ich bin dreißig (Jahre alt).'],
        ['„es gibt“ (unpersönlich)', 'Tem um mercado aqui perto.', 'Hier in der Nähe gibt es einen Supermarkt.'],
      ],
    },
    { type: 'colored', parts: [{ text: 'Eu', role: 'subject' }, { text: ' ' }, { text: 'tenho', role: 'verb' }, { text: ' ' }, { text: 'dois', role: 'other' }, { text: ' ' }, { text: 'filhos', role: 'noun' }, { text: '.' }], german: 'Ich habe zwei Kinder.' },
    {
      type: 'text',
      md:
        '**Fragen und kurze Antworten:** Eine Ja/Nein-Frage erkennt man nur an der Melodie: `Você tem filhos?` ↗. Brasilianer antworten gern mit dem **Verb statt mit „sim“**: `Tenho.` (Ja.) – `Não, não tenho.` (Nein.)\n**Verneinung:** `não` steht vor dem Verb, und der unbestimmte Artikel fällt meist weg: `Não tenho carro.` – Ich habe kein Auto.',
    },
    { type: 'tip', md: '**tenho – tem – temos – têm.** Das Dach (^) auf `têm` schützt viele Leute: Es steht nur im Plural.' },
    { type: 'audio', text: 'Você tem irmãos? – Tenho. Tenho uma irmã.', label: 'Hast du Geschwister? – Ja, eine Schwester.' },
  ],
  examples: [
    {
      target: 'Tenho uma irmã e dois irmãos.',
      german: 'Ich habe eine Schwester und zwei Brüder.',
      parts: [{ text: 'Tenho', role: 'verb' }, { text: ' ' }, { text: 'uma', role: 'article' }, { text: ' ' }, { text: 'irmã', role: 'noun' }, { text: ' e ' }, { text: 'dois', role: 'other' }, { text: ' ' }, { text: 'irmãos', role: 'noun' }, { text: '.' }],
    },
    { target: 'Quantos anos você tem? – Tenho vinte e oito.', german: 'Wie alt bist du? – Achtundzwanzig.' },
    { target: 'A gente tem um cachorro.', german: 'Wir haben einen Hund.', note: '`a gente` steht wie `ele` mit `tem`.' },
    {
      target: 'Meus pais têm uma casa na praia.',
      german: 'Meine Eltern haben ein Haus am Strand.',
      parts: [{ text: 'Meus', role: 'pronoun' }, { text: ' ' }, { text: 'pais', role: 'subject' }, { text: ' ' }, { text: 'têm', role: 'verb' }, { text: ' ' }, { text: 'uma', role: 'article' }, { text: ' ' }, { text: 'casa', role: 'noun' }, { text: ' ' }, { text: 'na', role: 'preposition' }, { text: ' ' }, { text: 'praia', role: 'noun' }, { text: '.' }],
    },
    { target: 'Você tem filhos? – Não, não tenho.', german: 'Hast du Kinder? – Nein.' },
    { target: 'Nós temos muito trabalho hoje.', german: 'Wir haben heute viel Arbeit.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Tenho trinta anos.',
      german: 'Ich bin dreißig (Jahre alt).',
      md: 'Beim Alter *hat* man auf Portugiesisch Jahre. Wer wörtlich aus dem Deutschen übersetzt („sou trinta“), wird nicht verstanden.',
    },
    {
      type: 'compare',
      target: 'Não tenho carro.',
      german: 'Ich habe kein Auto.',
      md: 'Für „kein“ gibt es kein eigenes Wort: `não` vor das Verb – und der Artikel fällt meist weg.',
    },
  ],
  mistakes: [
    { wrong: 'Eu sou trinta anos.', right: 'Eu tenho trinta anos.', why: 'Das Alter drückt man mit `ter` aus: Man hat Jahre.' },
    { wrong: 'Eles tem dois filhos.', right: 'Eles têm dois filhos.', why: 'Im Plural braucht `têm` den Zirkumflex – man hört ihn nicht, aber man schreibt ihn.' },
    { wrong: 'Eu tem um irmão.', right: 'Eu tenho um irmão.', why: 'Die ich-Form von `ter` ist unregelmäßig: `tenho`.' },
    { wrong: 'A gente temos um cachorro.', right: 'A gente tem um cachorro.', why: '`a gente` bedeutet „wir“, steht aber mit der 3. Person Singular.' },
  ],
  mnemonic: '**tenho – tem – temos – têm.** Gleicher Klang bei tem/têm – das Dach (^) zeigt den Plural.',
  levels: [
    {
      level: 1,
      title: 'Die Formen erkennen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Eu ___ dois irmãos.',
          options: [{ text: 'tenho' }, { text: 'tem', why: '`tem` ist die Form für você/ele/ela.' }, { text: 'temos', why: '`temos` gehört zu `nós`.' }],
          answer: 0,
          feedback: { rule: 'eu → `tenho`.', why: 'Die ich-Form von `ter` ist unregelmäßig und endet auf -enho.', avoid: 'eu tenho – wie „ich hab’s“.' },
        },
        {
          id: `${T}.L1.02`, type: 'matchPairs', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'eu', right: 'tenho' }, { left: 'ela', right: 'tem' }, { left: 'nós', right: 'temos' }, { left: 'eles', right: 'têm' }],
          feedback: { rule: 'eu tenho · ela tem · nós temos · eles têm.', why: '`tem` und `têm` unterscheiden sich nur im Schriftbild: Der Zirkumflex steht im Plural.', avoid: 'Plural → Dach (^).' },
        },
        {
          id: `${T}.L1.03`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.pronouns'], difficulty: 1,
          prompt: 'Welche Form ist richtig?',
          options: [{ text: 'A gente temos um gato.', why: '`temos` passt zu `nós`, nicht zu `a gente`.' }, { text: 'A gente tem um gato.' }, { text: 'A gente têm um gato.', why: '`têm` ist Plural – `a gente` ist grammatisch Singular.' }],
          answer: 1,
          feedback: { rule: '`a gente` + 3. Person Singular: `a gente tem`.', why: 'Die Bedeutung ist „wir“, die Verbform aber wie bei `ele`.', avoid: 'a gente = wie ele.' },
        },
        {
          id: `${T}.L1.04`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T, 'pt.g.numbers'], difficulty: 1,
          audio: 'Eu tenho trinta e dois anos.', question: 'Wie alt ist die Person?',
          options: ['23', '32', '42'], answer: 1,
          feedback: { rule: '`trinta e dois` = 32 – Alter mit `ter`: `tenho … anos`.', why: '23 wäre `vinte e três`, 42 `quarenta e dois`.', avoid: 'Zehner zuerst hören, dann die Einer.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Sätze bilden',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Meus pais ___ dois carros, mas eu não ___ carro.', answers: [['têm'], ['tenho']], german: 'Meine Eltern haben zwei Autos, aber ich habe kein Auto.',
          feedback: { rule: 'eles (meus pais) → `têm`; eu → `tenho`.', why: '„Kein Auto“ = `não tenho carro` – ohne eigenes Wort für „kein“.', avoid: 'Erst das Subjekt bestimmen, dann die Form.' },
        },
        {
          id: `${T}.L2.02`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          verb: 'ter', tense: 'Präsens', person: 'nós', sentence: 'Nós ___ um gato e um cachorro.', answers: ['temos'],
          feedback: { rule: 'nós → `temos`.', why: 'Die nós-Form endet wie bei fast allen Verben auf -mos.', avoid: 'nós → -mos.' },
        },
        {
          id: `${T}.L2.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.possessives'], difficulty: 2,
          tokens: ['Meus', 'avós', 'têm', 'uma', 'casa', 'grande.'], extra: ['são'], german: 'Meine Großeltern haben ein großes Haus.',
          feedback: { rule: 'Subjekt + `têm` + Objekt; das Adjektiv steht hinter dem Nomen: `uma casa grande`.', why: '`são` (sind) passt nicht – es geht um Besitz.', avoid: 'Besitz → ter.' },
        },
        {
          id: `${T}.L2.04`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toTarget', source: 'Ich habe keine Geschwister.',
          answers: ['Não tenho irmãos.', 'Eu não tenho irmãos.'],
          feedback: { rule: '„kein/keine“ = `não` + Verb, ohne Artikel: `Não tenho irmãos.`', why: '`irmãos` steht auch für „Geschwister“ (gemischte Gruppe).', avoid: 'kein → não vor dem Verb.' },
        },
        {
          id: `${T}.L2.05`, type: 'mc', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          prompt: 'Welcher Satz ist richtig geschrieben?',
          options: [{ text: 'Elas têm uma casa grande.' }, { text: 'Elas tem uma casa grande.', why: 'Im Plural fehlt der Zirkumflex: `têm`.' }, { text: 'Elas têem uma casa grande.', why: 'Die Schreibung „têem“ gibt es bei `ter` nicht.' }],
          answer: 0,
          feedback: { rule: 'eles/elas/vocês → `têm` (mit ^).', why: 'Man hört keinen Unterschied zu `tem`, aber man schreibt ihn.', avoid: 'Plural → Dach.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Im Gespräch',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'Eu sou vinte e cinco anos.', answers: ['Eu tenho vinte e cinco anos.', 'Tenho vinte e cinco anos.', 'Eu tenho 25 anos.', 'Tenho 25 anos.'], german: 'Ich bin fünfundzwanzig.',
          feedback: { rule: 'Alter: `ter` + Zahl + `anos`.', why: 'Die deutsche Struktur „ich bin … Jahre alt“ funktioniert im Portugiesischen nicht.', avoid: 'Jahre hat man: tenho … anos.' },
        },
        {
          id: `${T}.L3.02`, type: 'dialogue', skills: ['grammar', 'speaking'], topicIds: [T], difficulty: 2,
          lines: [
            { speaker: 'Ana', text: 'Você tem irmãos?', german: 'Hast du Geschwister?' },
            { speaker: 'Lukas', text: 'Tenho. Tenho uma irmã.', german: 'Ja, eine Schwester.' },
            { speaker: 'Ana', text: 'Que legal! Quantos anos ela tem?', german: 'Wie schön! Wie alt ist sie?' },
          ],
          gapIndex: 1,
          options: ['Tenho. Tenho uma irmã.', 'Sou. Sou uma irmã.', 'Temos. Temos uma irmã.'],
          answer: 0,
          feedback: { rule: 'Auf `Você tem …?` antwortet man mit `Tenho.`', why: '`Sou` heißt „ich bin“; `temos` wäre „wir haben“ – gefragt war aber nach dir.', avoid: 'Kurzantwort = Verb der Frage in der ich-Form.' },
        },
        {
          id: `${T}.L3.03`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.possessives'], difficulty: 3,
          direction: 'toTarget', source: 'Meine Schwester hat zwei Kinder.',
          answers: ['Minha irmã tem dois filhos.', 'A minha irmã tem dois filhos.', 'Minha irmã tem 2 filhos.', 'A minha irmã tem 2 filhos.', 'Minha irmã tem duas crianças.', 'A minha irmã tem duas crianças.'],
          feedback: { rule: '`minha irmã` + `tem` + `dois filhos`.', why: 'Die eigenen Kinder sind `os filhos` (Söhne und Töchter) – die männliche Pluralform gilt auch für gemischte Gruppen.', avoid: 'eigene Kinder → filhos.' },
        },
        {
          id: `${T}.L3.04`, type: 'translate', skills: ['reading', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toGerman', source: 'A gente tem um cachorro e dois gatos.',
          answers: ['Wir haben einen Hund und zwei Katzen.', 'Wir haben einen Hund und zwei Kater.'],
          feedback: { rule: '`a gente tem` = wir haben.', why: '`a gente` bedeutet „wir“, auch wenn das Verb im Singular steht.', avoid: 'a gente = wir.' },
        },
        {
          id: `${T}.L3.05`, type: 'dictation', skills: ['listening', 'writing'], topicIds: [T], difficulty: 3,
          audio: 'Vocês têm filhos?', answers: ['Vocês têm filhos?'], german: 'Habt ihr Kinder?',
          feedback: { rule: '`vocês` → `têm` (mit Zirkumflex).', why: 'Man hört keinen Unterschied zu `tem` – hier hilft nur die Grammatik: vocês ist Plural.', avoid: 'Beim Diktat an das Subjekt denken: vocês → têm.' },
        },
      ],
    },
  ],
  related: ['pt.g.possessives', 'pt.g.tem-haver', 'pt.g.present-regular'],
};

export default topic;
