import type { GrammarTopic } from '../../types';

const T = 'pt.g.possessives';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'a1',
  order: 14,
  category: 'Pronomen',
  title: 'Possessivbegleiter: meu, seu, dele …',
  summary: 'mein, dein, unser: meu/minha, seu/sua, nosso/nossa – und die brasilianische Lösung für „sein“ und „ihr“: a casa dele, o carro dela.',
  keywords: ['Possessiv', 'mein', 'dein', 'sein', 'ihr', 'unser', 'meu', 'minha', 'seu', 'sua', 'dele', 'dela', 'nosso', 'Besitz'],
  explanation: [
    {
      type: 'table',
      title: 'Vor dem Nomen: die Form passt sich dem Nomen an',
      headers: ['', 'männl. Sg.', 'weibl. Sg.', 'männl. Pl.', 'weibl. Pl.'],
      rows: [
        ['mein(e)', 'meu', 'minha', 'meus', 'minhas'],
        ['dein(e) / Ihr(e) – zu você', 'seu', 'sua', 'seus', 'suas'],
        ['unser(e)', 'nosso', 'nossa', 'nossos', 'nossas'],
      ],
    },
    {
      type: 'text',
      md:
        '**Die Endung richtet sich nach dem Ding (oder der Person), das man hat – nicht nach dem Besitzer:** `meu pai`, `minha mãe`, `meus filhos`, `minhas irmãs` – egal, ob ein Mann oder eine Frau spricht.',
    },
    {
      type: 'table',
      title: 'Hinter dem Nomen: sein, ihr, euer',
      headers: ['Deutsch', 'Portugiesisch', 'Beispiel'],
      rows: [
        ['sein (von ihm)', 'dele (= de + ele)', 'a casa dele – sein Haus'],
        ['ihr (von ihr)', 'dela (= de + ela)', 'o carro dela – ihr Auto'],
        ['ihr (von ihnen)', 'deles / delas', 'os filhos deles – ihre Kinder'],
        ['euer (von euch)', 'de vocês', 'a casa de vocês – euer Haus'],
      ],
    },
    {
      type: 'text',
      md:
        '**Warum dele und dela?** In Brasilien spricht man die Leute mit `você` an – deshalb versteht man `seu/sua` zuerst als **„dein“** bzw. **„Ihr“**. Für „sein“ und „ihr“ nimmt man darum meist **dele/dela** hinter dem Nomen. Das ist eindeutig: `a casa dele` kann nur „sein Haus“ heißen.',
    },
    { type: 'colored', parts: [{ text: 'O', role: 'article' }, { text: ' ' }, { text: 'carro', role: 'noun' }, { text: ' ' }, { text: 'dela', role: 'pronoun' }, { text: ' ' }, { text: 'é', role: 'verb' }, { text: ' ' }, { text: 'novo', role: 'adjective' }, { text: '.' }], german: 'Ihr Auto ist neu.' },
    {
      type: 'text',
      md:
        '**Artikel:** Vor `meu`, `seu`, `nosso` darf der Artikel stehen oder fehlen: `minha casa` = `a minha casa`. Beides ist richtig. Bei **dele/dela** ist der Artikel Pflicht: `a casa dele`. Mit Namen genauso: `o carro da Ana` – Anas Auto.',
    },
    { type: 'tip', md: 'Frag dich: **Was ist es?** → meu/minha/seu/sua passt sich dem Ding an. **Wem gehört es?** → dele/dela zeigt auf den Besitzer.' },
    { type: 'audio', text: 'Meu irmão tem uma filha. O nome dela é Bia.', label: 'Mein Bruder hat eine Tochter. Ihr Name ist Bia.' },
  ],
  examples: [
    {
      target: 'Minha mãe é professora.',
      german: 'Meine Mutter ist Lehrerin.',
      parts: [{ text: 'Minha', role: 'pronoun' }, { text: ' ' }, { text: 'mãe', role: 'subject' }, { text: ' ' }, { text: 'é', role: 'verb' }, { text: ' ' }, { text: 'professora', role: 'noun' }, { text: '.' }],
    },
    { target: 'Meus avós moram no Rio.', german: 'Meine Großeltern wohnen in Rio.' },
    { target: 'Qual é o seu nome?', german: 'Wie ist dein / Ihr Name?' },
    {
      target: 'A casa dela é muito bonita.',
      german: 'Ihr Haus ist sehr schön.',
      parts: [{ text: 'A', role: 'article' }, { text: ' ' }, { text: 'casa', role: 'noun' }, { text: ' ' }, { text: 'dela', role: 'pronoun' }, { text: ' ' }, { text: 'é', role: 'verb' }, { text: ' ' }, { text: 'muito', role: 'adverb' }, { text: ' ' }, { text: 'bonita', role: 'adjective' }, { text: '.' }],
    },
    { target: 'Os filhos deles moram em São Paulo.', german: 'Ihre Kinder wohnen in São Paulo.' },
    { target: 'Nossa casa fica perto da praia.', german: 'Unser Haus liegt in der Nähe des Strandes.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'o carro dele · o carro dela',
      german: 'sein Auto · ihr Auto',
      md: 'Hier funktioniert Portugiesisch wie Deutsch: `dele`/`dela` zeigt, **wem** etwas gehört – ihm oder ihr.',
    },
    {
      type: 'compare',
      target: 'meu pai · minha mãe',
      german: 'mein Vater · meine Mutter',
      md: 'Auch das kennst du: Die Endung passt sich dem Nomen an. Aber `sua casa` kann „dein“, „sein“, „ihr“ oder „Ihr Haus“ heißen – deshalb sagen Brasilianer für Dritte lieber `a casa dele/dela`.',
    },
  ],
  mistakes: [
    { wrong: 'Minha pai é médico.', right: 'Meu pai é médico.', why: '`pai` ist männlich → `meu`. Es zählt das Nomen, nicht wer spricht.' },
    { wrong: 'Dele casa é grande.', right: 'A casa dele é grande.', why: '`dele` steht hinter dem Nomen, davor der Artikel.' },
    { wrong: 'Meu irmãs moram em Salvador.', right: 'Minhas irmãs moram em Salvador.', why: '`irmãs` ist weiblich und Plural → `minhas`.' },
    { wrong: 'a casa de ele', right: 'a casa dele', why: '`de` + `ele` verschmilzt immer zu `dele`.' },
  ],
  mnemonic: '**Das Ding bestimmt die Endung (meu/minha), der Besitzer bestimmt dele/dela.**',
  levels: [
    {
      level: 1,
      title: 'meu oder minha?',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '___ mãe é brasileira.',
          options: [{ text: 'Meu', why: '`mãe` ist weiblich.' }, { text: 'Minha' }, { text: 'Meus', why: '`meus` ist männlich Plural.' }],
          answer: 1,
          feedback: { rule: 'weiblich Singular → `minha`: `Minha mãe`.', why: 'Die Form richtet sich nach `mãe`, nicht nach der sprechenden Person.', avoid: 'Erst das Genus des Nomens prüfen.' },
        },
        {
          id: `${T}.L1.02`, type: 'matchPairs', skills: ['vocabulary', 'grammar'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'meus pais', right: 'meine Eltern' }, { left: 'minha irmã', right: 'meine Schwester' }, { left: 'nossa casa', right: 'unser Haus' }, { left: 'o carro dele', right: 'sein Auto' }, { left: 'o carro dela', right: 'ihr Auto' }],
          feedback: { rule: 'meus/minha/nossa passen sich dem Nomen an; dele = sein, dela = ihr.', why: '`dele` und `dela` zeigen auf den Besitzer – ihn oder sie.', avoid: 'dele = von ihm, dela = von ihr.' },
        },
        {
          id: `${T}.L1.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          sentence: 'Eu moro com ___ pais e ___ irmã.', answers: [['meus', 'os meus'], ['minha', 'a minha']], bank: ['meus', 'minha', 'meu', 'minhas'],
          german: 'Ich wohne mit meinen Eltern und meiner Schwester.',
          feedback: { rule: '`pais` → männlich Plural `meus`; `irmã` → weiblich Singular `minha`.', why: '`meu` und `minhas` passen weder zu `pais` noch zu `irmã`.', avoid: 'Endung des Nomens ansehen: -s → Plural, -ã/-a → meist weiblich.' },
        },
        {
          id: `${T}.L1.04`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Wie sagt man „unsere Kinder“?',
          options: [{ text: 'nossos filhos' }, { text: 'nossas filhos', why: '`filhos` ist männlich.' }, { text: 'nosso filhos', why: 'Plural braucht auch beim Possessiv ein -s.' }],
          answer: 0,
          feedback: { rule: 'männlich Plural → `nossos filhos`.', why: 'Possessiv und Nomen stimmen in Genus und Zahl überein.', avoid: 'Plural-s an beide Wörter.' },
        },
      ],
    },
    {
      level: 2,
      title: 'dele, dela & seu',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Pedro wohnt in Recife. **Sein Haus** ist groß. – Wie sagt man „sein Haus“ natürlich und eindeutig?',
          options: [{ text: 'a casa dele' }, { text: 'a casa dela', why: '`dela` = von ihr – Pedro ist ein Mann.' }, { text: 'dele casa', why: '`dele` steht hinter dem Nomen, mit Artikel davor.' }, { text: 'a sua casa', why: 'Das versteht man in Brasilien zuerst als „dein Haus“ – mehrdeutig.' }],
          answer: 0,
          feedback: { rule: '„sein“ = Nomen + `dele`: `a casa dele`.', why: '`seu/sua` bedeutet im Alltag vor allem „dein/Ihr“.', avoid: 'Für Dritte: dele/dela hinter das Nomen.' },
        },
        {
          id: `${T}.L2.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'A Ana tem um irmão. O nome ___ é Rafael.', answers: [['dele']], german: 'Ana hat einen Bruder. Sein Name ist Rafael.',
          feedback: { rule: 'Der Name gehört dem Bruder (ele) → `dele`.', why: '`dela` würde auf Ana zeigen – dann wäre es Anas Name.', avoid: 'Frag: Wem gehört der Name?' },
        },
        {
          id: `${T}.L2.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.ter'], difficulty: 2,
          sentence: 'Meus avós têm um cachorro. O cachorro ___ é muito velho.', answers: [['deles']], german: 'Meine Großeltern haben einen Hund. Ihr Hund ist sehr alt.',
          feedback: { rule: 'Mehrere Besitzer (eles) → `deles`.', why: '`dele` wäre nur ein Besitzer; `dela` eine Frau.', avoid: 'Besitzer im Plural → deles/delas.' },
        },
        {
          id: `${T}.L2.04`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.ser'], difficulty: 2,
          direction: 'toTarget', source: 'Carla ist verheiratet. Ihr Mann ist Arzt.',
          answers: ['A Carla é casada. O marido dela é médico.', 'Carla é casada. O marido dela é médico.'],
          feedback: { rule: '„ihr Mann“ (von Carla) = `o marido dela`.', why: '`o seu marido` würde man als „dein/Ihr Mann“ verstehen.', avoid: 'Besitzerin ist eine Frau → dela.' },
        },
        {
          id: `${T}.L2.05`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.contractions'], difficulty: 2,
          tokens: ['A', 'casa', 'dela', 'fica', 'perto', 'da', 'praia.'], extra: ['de', 'ela'], german: 'Ihr Haus liegt in der Nähe des Strandes.',
          feedback: { rule: '`a casa dela` (de + ela = dela), `perto da praia` (de + a = da).', why: '`de ela` muss verschmelzen – getrennt ist es falsch.', avoid: 'de + ele/ela → dele/dela, immer.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Alles zusammen',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Meu mãe tem dois irmãos.', answers: ['Minha mãe tem dois irmãos.', 'A minha mãe tem dois irmãos.'], german: 'Meine Mutter hat zwei Brüder.',
          feedback: { rule: '`mãe` ist weiblich → `minha mãe`.', why: 'Das Possessiv passt sich dem Nomen an, nicht dem Sprecher.', avoid: 'minha mãe, meu pai.' },
        },
        {
          id: `${T}.L3.02`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'Dele carro é novo.', answers: ['O carro dele é novo.'], german: 'Sein Auto ist neu.',
          feedback: { rule: 'Artikel + Nomen + `dele`: `O carro dele`.', why: '`dele` kann nicht vor dem Nomen stehen.', avoid: 'dele/dela immer hinten.' },
        },
        {
          id: `${T}.L3.03`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.present-regular'], difficulty: 3,
          direction: 'toTarget', source: 'Unsere Kinder wohnen in São Paulo.',
          answers: ['Nossos filhos moram em São Paulo.', 'Os nossos filhos moram em São Paulo.', 'Nossos filhos vivem em São Paulo.', 'Os nossos filhos vivem em São Paulo.'],
          feedback: { rule: '`nossos filhos` (männlich Plural) + `moram` (3. Person Plural).', why: '`nossas` wäre weiblich, `nosso` Singular.', avoid: 'Possessiv, Nomen und Verb – alle im Plural.' },
        },
        {
          id: `${T}.L3.04`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 3,
          audio: 'O Marcos tem uma irmã. O marido dela é alemão.', question: 'Wer ist Deutscher?',
          options: ['Marcos', 'Marcos’ Schwester', 'der Mann von Marcos’ Schwester'], answer: 2,
          feedback: { rule: '`o marido dela` = der Mann von ihr (der Schwester).', why: '`dela` zeigt auf die Schwester – ihr Mann ist Deutscher.', avoid: 'dela → die zuletzt genannte Frau.' },
        },
        {
          id: `${T}.L3.05`, type: 'situation', skills: ['speaking', 'grammar'], topicIds: [T], difficulty: 2,
          scenario: 'Du zeigst einer Freundin ein Foto von deinem Bruder und seiner Frau. Du sagst: „Das ist seine Frau.“',
          options: [{ text: 'É a esposa dele.' }, { text: 'É a sua esposa.', why: 'Das klingt wie „Das ist deine Frau“.' }, { text: 'É a esposa dela.', why: '`dela` = von ihr – dein Bruder ist ein Mann.' }],
          answer: 0,
          feedback: { rule: '„seine Frau“ = `a esposa dele`.', why: 'Mit `dele` ist sofort klar, wessen Frau gemeint ist.', avoid: 'Für Dritte nicht seu/sua, sondern dele/dela.' },
        },
      ],
    },
  ],
  related: ['pt.g.ter', 'pt.g.contractions', 'pt.g.pronouns'],
};

export default topic;
