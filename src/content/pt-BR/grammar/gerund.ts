import type { GrammarTopic } from '../../types';

const T = 'pt.g.gerund';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'a1',
  order: 19,
  category: 'Verben',
  title: 'estar + Gerundium: estou falando',
  summary: 'Was passiert gerade? Brasilianer sagen estou falando, tá chovendo, tô chegando – das Gerundium auf -ndo ist bei allen Verben regelmäßig.',
  keywords: ['Gerundium', 'estar', 'estou falando', 'gerade', 'Verlaufsform', '-ndo', 'tô', 'tá', 'Telefon', 'Nachricht', 'jetzt'],
  explanation: [
    {
      type: 'table',
      title: 'So bildest du das Gerundium: Infinitiv ohne -r + ndo',
      headers: ['Infinitiv', 'Gerundium', 'Deutsch'],
      rows: [
        ['falar', 'falando', 'sprechen'],
        ['comer', 'comendo', 'essen'],
        ['abrir', 'abrindo', 'öffnen'],
        ['fazer', 'fazendo', 'machen'],
        ['ler', 'lendo', 'lesen'],
        ['ir', 'indo', 'gehen, fahren'],
      ],
    },
    {
      type: 'text',
      md:
        '**Bildung:** Infinitiv ohne -r + **-ndo**: fala**ndo**, come**ndo**, abri**ndo**. Das gilt für **alle** Verben – auch für unregelmäßige wie `fazer` → `fazendo` oder `ir` → `indo`. Der Vokal vor -ndo verrät die Verbgruppe: **-ando, -endo, -indo**. Konjugiert wird nur `estar` – und das kennst du schon.',
    },
    {
      type: 'conjugation',
      verb: 'estar + falando',
      translation: 'gerade sprechen',
      tense: 'Verlaufsform (Präsens)',
      rows: [
        { person: 'eu', form: 'estou falando', ending: 'ndo' },
        { person: 'você / ele / ela / a gente', form: 'está falando', ending: 'ndo' },
        { person: 'nós', form: 'estamos falando', ending: 'ndo' },
        { person: 'vocês / eles / elas', form: 'estão falando', ending: 'ndo' },
      ],
    },
    { type: 'colored', parts: [{ text: 'Eu', role: 'subject' }, { text: ' ' }, { text: 'estou', role: 'verb' }, { text: ' ' }, { text: 'fala', role: 'verb' }, { text: 'ndo', role: 'ending' }, { text: ' ' }, { text: 'ao', role: 'preposition' }, { text: ' ' }, { text: 'telefone', role: 'noun' }, { text: '.' }], german: 'Ich telefoniere gerade.' },
    {
      type: 'text',
      md:
        '**Wann?** Für alles, was **gerade im Moment** passiert: `O que você está fazendo?` – `Estou cozinhando.` Auch für eine **vorübergehende Phase**: `Estou morando em São Paulo.` (Ich wohne zurzeit in São Paulo.)\nDas einfache Präsens beschreibt dagegen **Gewohnheiten**: `Eu trabalho em casa.` (generell) – `Estou trabalhando.` (jetzt gerade). In Portugal hörst du stattdessen „estou a falar“ – in Brasilien sagt man immer `estou falando`.',
    },
    {
      type: 'text',
      md:
        '**Im Alltag, am Telefon und in Nachrichten** hörst und liest du ständig die Kurzformen `tô` (= estou) und `tá` (= está): `Tô chegando!` (Bin gleich da!) · `Tá chovendo.` (Es regnet.) · `Tô saindo agora.` (Ich gehe jetzt los.)\n**Mit reflexiven Verben** steht das Pronomen vor dem Gerundium: `Estou me vestindo.` – Ich ziehe mich gerade an.',
    },
    { type: 'mistake', wrong: 'Eu estou falar com a Ana.', right: 'Eu estou falando com a Ana.', why: 'Nach `estar` steht für „gerade tun“ das Gerundium, nicht der Infinitiv.' },
    { type: 'tip', md: '**estar + -ndo = gerade.** Stell dir ein Live-Video vor: Was läuft gerade? → estou …-ndo.' },
    { type: 'audio', text: 'Oi, amor! Tô saindo do trabalho agora. Já tô chegando!', label: 'Hallo Schatz! Ich gehe gerade von der Arbeit los. Bin gleich da!' },
  ],
  examples: [
    {
      target: 'O que você está fazendo? – Estou estudando.',
      german: 'Was machst du gerade? – Ich lerne.',
      parts: [{ text: 'O que', role: 'question' }, { text: ' ' }, { text: 'você', role: 'subject' }, { text: ' ' }, { text: 'está', role: 'verb' }, { text: ' ' }, { text: 'fazendo', role: 'verb' }, { text: '? – ' }, { text: 'Estou', role: 'verb' }, { text: ' ' }, { text: 'estudando', role: 'verb' }, { text: '.' }],
    },
    { target: 'Ela está falando ao telefone.', german: 'Sie telefoniert gerade.' },
    { target: 'Tá chovendo muito hoje.', german: 'Heute regnet es stark.' },
    { target: 'Estamos morando no Rio agora.', german: 'Wir wohnen zurzeit in Rio.' },
    { target: 'Tô chegando! Cinco minutos.', german: 'Bin gleich da! Fünf Minuten.' },
    {
      target: 'As crianças estão dormindo.',
      german: 'Die Kinder schlafen (gerade).',
      parts: [{ text: 'As', role: 'article' }, { text: ' ' }, { text: 'crianças', role: 'subject' }, { text: ' ' }, { text: 'estão', role: 'verb' }, { text: ' ' }, { text: 'dormi', role: 'verb' }, { text: 'ndo', role: 'ending' }, { text: '.' }],
    },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Estou trabalhando.',
      german: 'Ich arbeite (gerade).',
      md: 'Deutsch hat keine eigene Verlaufsform – wir sagen „gerade“ oder umgangssprachlich „ich bin am Arbeiten“. Portugiesisch nutzt dafür estar + Gerundium – und zwar sehr oft.',
    },
    {
      type: 'compare',
      target: 'Eu trabalho. · Estou trabalhando.',
      german: 'Ich arbeite (generell). · Ich arbeite gerade.',
      md: 'Präsens = Gewohnheit, estar + -ndo = jetzt oder in dieser Phase.',
    },
  ],
  mistakes: [
    { wrong: 'Eu estou falar.', right: 'Eu estou falando.', why: 'Nach `estar` steht das Gerundium (-ndo), nicht der Infinitiv.' },
    { wrong: 'Sou trabalhando.', right: 'Estou trabalhando.', why: 'Die Verlaufsform wird immer mit `estar` gebildet.' },
    { wrong: 'Ela está comindo.', right: 'Ela está comendo.', why: 'Der Vokal bleibt wie im Infinitiv: com**e**r → com**e**ndo.' },
    { wrong: 'Eu estou a falar.', right: 'Eu estou falando.', why: '„estar a + Infinitiv“ ist die Form aus Portugal – in Brasilien sagt man `estou falando`.' },
  ],
  mnemonic: '**Live dabei? → estar + -ndo.** Vokal vom Infinitiv behalten: -ando, -endo, -indo.',
  levels: [
    {
      level: 1,
      title: 'Das Gerundium bilden',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Gerundium von **comer**:',
          options: [{ text: 'comendo' }, { text: 'comindo', why: 'Der Vokal des Infinitivs (e) bleibt erhalten.' }, { text: 'comando', why: '-ando gibt es nur bei -ar-Verben (und `comando` heißt „Befehl“).' }],
          answer: 0,
          feedback: { rule: '-er → -endo: `comer` → `comendo`.', why: 'Man streicht nur das -r und hängt -ndo an.', avoid: 'Infinitiv ohne r + ndo.' },
        },
        {
          id: `${T}.L1.02`, type: 'matchPairs', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'falar', right: 'falando' }, { left: 'fazer', right: 'fazendo' }, { left: 'dormir', right: 'dormindo' }, { left: 'ir', right: 'indo' }, { left: 'ler', right: 'lendo' }],
          feedback: { rule: 'Immer: Infinitiv ohne -r + ndo.', why: 'Auch unregelmäßige Verben (fazer, ir) bilden das Gerundium regelmäßig.', avoid: 'Kein Verb ist beim Gerundium unregelmäßig.' },
        },
        {
          id: `${T}.L1.03`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.estar'], difficulty: 1,
          verb: 'trabalhar', tense: 'Verlaufsform (estar + Gerundium)', person: 'eu', sentence: 'Agora eu ___.', answers: ['estou trabalhando', 'tô trabalhando'],
          feedback: { rule: 'eu → `estou` + `trabalhando`.', why: 'Zwei Teile: konjugiertes estar + unveränderliches Gerundium.', avoid: 'estou + -ndo.' },
        },
        {
          id: `${T}.L1.04`, type: 'mc', skills: ['reading', 'vocabulary'], topicIds: [T], difficulty: 1,
          prompt: 'Was bedeutet **„Tô chegando!“** in einer Nachricht?',
          options: [{ text: 'Bin gleich da!' }, { text: 'Ich komme nicht.', why: 'Der Satz enthält keine Verneinung (`não`).' }, { text: 'Ich bin zu Hause.', why: 'Das wäre `Tô em casa.`' }],
          answer: 0,
          feedback: { rule: '`tô` = estou; `chegando` = ankommend → „Bin gleich da! / Ich komme gerade an.“', why: 'Die Verlaufsform zeigt: Die Person ist schon unterwegs.', avoid: 'tô = estou, tá = está.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Was machst du gerade?',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.estar'], difficulty: 2,
          sentence: 'O que vocês ___ fazendo? – A gente ___ vendo um filme.', answers: [['estão', 'tão'], ['está', 'tá']],
          german: 'Was macht ihr gerade? – Wir schauen einen Film.',
          feedback: { rule: 'vocês → `estão`; a gente → `está` (+ Gerundium).', why: '`a gente` steht mit der 3. Person Singular, auch in der Verlaufsform.', avoid: 'Nur estar wird konjugiert – das Gerundium bleibt gleich.' },
        },
        {
          id: `${T}.L2.02`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          verb: 'fazer', tense: 'Verlaufsform (estar + Gerundium)', person: 'ela', sentence: 'O que ela ___?', answers: ['está fazendo', 'tá fazendo'],
          feedback: { rule: 'ela → `está fazendo`.', why: '`fazer` ist unregelmäßig, das Gerundium `fazendo` aber nicht.', avoid: 'está + -ndo.' },
        },
        {
          id: `${T}.L2.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.questions'], difficulty: 2,
          tokens: ['O', 'que', 'você', 'está', 'fazendo?'], extra: ['fazer', 'é'], german: 'Was machst du gerade?',
          feedback: { rule: '`O que` + Subjekt + `está` + Gerundium.', why: '`fazer` (Infinitiv) passt nicht nach `está`; `é` bildet keine Verlaufsform.', avoid: 'estar + -ndo, nie estar + Infinitiv.' },
        },
        {
          id: `${T}.L2.04`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Eu estou falar com a minha mãe.',
          answers: [
            'Eu estou falando com a minha mãe.', 'Estou falando com a minha mãe.', 'Eu estou falando com minha mãe.', 'Estou falando com minha mãe.',
            'Eu tô falando com a minha mãe.', 'Tô falando com a minha mãe.', 'Eu tô falando com minha mãe.', 'Tô falando com minha mãe.',
          ],
          german: 'Ich spreche gerade mit meiner Mutter.',
          feedback: { rule: '`estou` + Gerundium: `estou falando`.', why: 'Mit dem Infinitiv wäre es ein unvollständiger Satz.', avoid: 'Nach estar: -ndo.' },
        },
        {
          id: `${T}.L2.05`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.present-regular'], difficulty: 2,
          prompt: 'Welcher Satz beschreibt eine **Gewohnheit**?',
          options: [{ text: 'Eu trabalho em casa.' }, { text: 'Estou trabalhando em casa.', why: 'Die Verlaufsform beschreibt, was gerade (oder zurzeit) passiert.' }, { text: 'Estou em casa.', why: 'Das sagt nur, wo du gerade bist.' }],
          answer: 0,
          feedback: { rule: 'Gewohnheit → einfaches Präsens: `Eu trabalho em casa.`', why: '`estou trabalhando` = gerade jetzt oder in dieser Phase.', avoid: 'Immer/normalerweise → Präsens; gerade → estar + -ndo.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Am Telefon & in Nachrichten',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'dialogue', skills: ['speaking', 'grammar'], topicIds: [T], difficulty: 2,
          lines: [
            { speaker: 'Mãe', text: 'Oi, filho! Tudo bem? O que você está fazendo?', german: 'Hallo, mein Sohn! Alles gut? Was machst du gerade?' },
            { speaker: 'Lucas', text: 'Estou cozinhando.', german: 'Ich koche gerade.' },
            { speaker: 'Mãe', text: 'Que bom! Então a gente se fala mais tarde.', german: 'Schön! Dann sprechen wir später.' },
          ],
          gapIndex: 1,
          options: ['Estou cozinhando.', 'Eu cozinhar.', 'Sou cozinhando.'],
          answer: 0,
          feedback: { rule: 'Auf `O que você está fazendo?` antwortet man mit `Estou` + Gerundium.', why: '`Eu cozinhar` hat kein konjugiertes Verb; `Sou cozinhando` nutzt ser statt estar.', avoid: 'Frage mit está …-ndo → Antwort mit estou …-ndo.' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          direction: 'toTarget', source: 'Die Kinder schlafen gerade.',
          answers: ['As crianças estão dormindo.', 'As crianças estão dormindo agora.', 'Agora as crianças estão dormindo.', 'As crianças tão dormindo.', 'As crianças tão dormindo agora.'],
          feedback: { rule: 'eles/elas → `estão` + `dormindo`.', why: '„gerade“ steckt schon in der Verlaufsform – `agora` kann, muss aber nicht dazu.', avoid: 'Plural-Subjekt → estão.' },
        },
        {
          id: `${T}.L3.03`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 3,
          audio: 'Oi, Ana! Tô trabalhando agora. Te ligo mais tarde, tá?', question: 'Warum kann die Person gerade nicht telefonieren?',
          options: ['Sie arbeitet gerade.', 'Sie isst gerade.', 'Sie schläft gerade.'], answer: 0,
          feedback: { rule: '`Tô trabalhando` = Ich arbeite gerade.', why: '`comendo` (essen) und `dormindo` (schlafen) kommen nicht vor.', avoid: 'Auf das Wort vor -ndo achten.' },
        },
        {
          id: `${T}.L3.04`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.reflexive'], difficulty: 3,
          direction: 'toTarget', source: 'Ich ziehe mich gerade an.',
          answers: ['Estou me vestindo.', 'Eu estou me vestindo.', 'Tô me vestindo.', 'Eu tô me vestindo.', 'Estou me vestindo agora.', 'Eu estou me vestindo agora.'],
          feedback: { rule: '`estou` + Pronomen + Gerundium: `Estou me vestindo.`', why: 'In Brasilien steht `me` vor dem Gerundium.', avoid: 'estou me …-ndo.' },
        },
        {
          id: `${T}.L3.05`, type: 'freeText', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          prompt: 'Schreib einer Freundin eine kurze Nachricht: Was machst du gerade – und was machen andere Personen gerade? (zwei Sätze mit estar + Gerundium)',
          requirements: [
            { pattern: '\\b(estou|to)\\s+(me\\s+)?[a-z]+ndo\\b', hint: 'Sag, was du gerade machst (estou … -ndo).' },
            { pattern: '\\b(esta|ta|estamos|estao|tao)\\s+(me\\s+|se\\s+|nos\\s+)?[a-z]+ndo\\b', hint: 'Sag, was jemand anderes gerade macht (está / estão … -ndo).' },
          ],
          samples: ['Oi, Bia! Tô estudando português. O meu irmão está dormindo e os meus pais estão vendo TV.'],
          minWords: 8,
          feedback: { rule: 'estou / está / estão + Gerundium (-ando, -endo, -indo).', why: 'Jeder Satz braucht eine Form von estar und ein Gerundium.', avoid: 'Erst estar konjugieren, dann -ndo anhängen.' },
        },
      ],
    },
  ],
  related: ['pt.g.estar', 'pt.g.present-regular', 'pt.g.reflexive'],
};

export default topic;
