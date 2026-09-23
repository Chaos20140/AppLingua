import type { GrammarTopic } from '../../types';

const T = 'pt.g.articles-gender';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 7,
  category: 'Artikel & Nomen',
  title: 'Artikel & Genus',
  summary: 'o, a, os, as, um, uma, uns, umas – und wie du das Geschlecht eines Nomens an der Endung erkennst (inklusive der wichtigsten Ausnahmen).',
  keywords: ['Artikel', 'Genus', 'Geschlecht', 'männlich', 'weiblich', 'o', 'a', 'um', 'uma', 'Endung', 'Ausnahmen'],
  explanation: [
    {
      type: 'table',
      title: 'Artikel',
      headers: ['', 'männlich', 'weiblich'],
      rows: [
        ['bestimmt Sg.', 'o', 'a'],
        ['bestimmt Pl.', 'os', 'as'],
        ['unbestimmt Sg.', 'um', 'uma'],
        ['unbestimmt Pl.', 'uns', 'umas'],
      ],
    },
    {
      type: 'table',
      title: 'Genus an der Endung erkennen',
      headers: ['Endung', 'meist', 'Beispiele', 'wichtige Ausnahmen'],
      rows: [
        ['-o', 'männlich', 'o livro, o carro', 'a foto, a tribo'],
        ['-a', 'weiblich', 'a mesa, a casa', 'o dia, o mapa'],
        ['-ma (aus dem Griechischen)', 'männlich', 'o problema, o sistema, o tema', 'a cama (Bett)'],
        ['-dade, -ção, -gem', 'weiblich', 'a cidade, a estação, a viagem', 'o coração'],
        ['-or', 'männlich', 'o amor, o computador', 'a flor, a dor, a cor'],
        ['-e, -l, andere', 'beides möglich', 'o leite, a noite, o hotel', 'mit Artikel lernen'],
      ],
    },
    {
      type: 'text',
      md:
        'Der Artikel wird im Portugiesischen häufiger gebraucht als im Deutschen:\n' +
        '- vor den meisten **Ländern**: `o Brasil`, `a Alemanha`, `os Estados Unidos` (aber: `Portugal`, `Angola` ohne Artikel)\n' +
        '- oft vor **Vornamen**, besonders in São Paulo und im Süden: `a Ana`, `o Pedro`\n' +
        '- vor **Possessivbegleitern** (optional): `o meu carro` = `meu carro`',
    },
    { type: 'tip', md: 'Lerne jedes Nomen **mit Artikel** – als eine Einheit: `o dia`, `a viagem`, `o problema`.' },
  ],
  examples: [
    { target: 'o dia e a noite', german: 'der Tag und die Nacht' },
    {
      target: 'Um problema e uma solução.',
      german: 'Ein Problem und eine Lösung.',
      parts: [{ text: 'Um', role: 'article' }, { text: ' ' }, { text: 'problema', role: 'noun' }, { text: ' e ' }, { text: 'uma', role: 'article' }, { text: ' ' }, { text: 'solução', role: 'noun' }, { text: '.' }],
    },
    { target: 'A viagem é longa.', german: 'Die Reise ist lang.', note: '-gem ist weiblich.' },
    { target: 'O Brasil e a Alemanha.', german: 'Brasilien und Deutschland.' },
    { target: 'A Ana está aqui.', german: 'Ana ist hier.', note: 'Artikel vor Vornamen – typisch für São Paulo und den Süden.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'o leite · o sol · a árvore',
      german: 'die Milch · die Sonne · der Baum',
      md: 'Das deutsche Genus hilft nicht: „die Milch“ ist männlich (`o leite`), „die Sonne“ auch (`o sol`), „der Baum“ dagegen weiblich (`a árvore`).',
    },
    {
      type: 'text',
      md: 'Es gibt kein Neutrum: Alles, was im Deutschen „das“ ist, ist im Portugiesischen männlich oder weiblich – `o livro` (das Buch), `a casa` (das Haus), `a menina` (das Mädchen).',
    },
  ],
  mistakes: [
    { wrong: 'a problema', right: 'o problema', why: 'Wörter auf -ma griechischen Ursprungs sind männlich.' },
    { wrong: 'o viagem', right: 'a viagem', why: 'Wörter auf -gem sind weiblich.' },
    { wrong: 'um mulher', right: 'uma mulher', why: 'Der unbestimmte Artikel passt sich ebenfalls an: `uma` vor weiblichen Nomen.' },
  ],
  mnemonic: 'Kein Nomen ohne Artikel! -o/-ma/-or → meist o · -a/-dade/-ção/-gem → meist a.',
  levels: [
    {
      level: 1,
      title: 'Artikel wählen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '___ problema',
          options: [{ text: 'o' }, { text: 'a', why: '`problema` ist trotz -a männlich.' }],
          answer: 0,
          feedback: { rule: '`o problema` – Wörter auf -ma (griechisch) sind männlich.', why: 'Die Endung -a täuscht hier.', avoid: 'problema, sistema, tema, programa → o.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '___ cidade',
          options: [{ text: 'o', why: '-dade ist weiblich.' }, { text: 'a' }],
          answer: 1,
          feedback: { rule: 'Wörter auf -dade sind weiblich: `a cidade`.', why: 'Wie im Deutschen „-heit/-keit“: immer „die“.', avoid: '-dade → a.' },
        },
        {
          id: `${T}.L1.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          sentence: '___ homem e ___ mulher', answers: [['um'], ['uma']], bank: ['um', 'uma', 'uns', 'umas'], german: 'ein Mann und eine Frau',
          feedback: { rule: 'unbestimmter Artikel: `um` (m.), `uma` (f.).', why: '`uns`/`umas` sind Plural („einige“).', avoid: 'Genus des Nomens → Artikel.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Endungen & Ausnahmen',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.plural'], difficulty: 2,
          sentence: '___ flores e ___ livros', answers: [['as'], ['os']], bank: ['o', 'a', 'os', 'as'], german: 'die Blumen und die Bücher',
          feedback: { rule: '`a flor` → `as flores`; `o livro` → `os livros`.', why: '`flor` endet auf -or, ist aber weiblich.', avoid: 'Plural-Artikel: os/as – immer mit s.' },
        },
        {
          id: `${T}.L2.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Welches Nomen ist **männlich**?',
          options: [{ text: 'viagem', why: '-gem ist weiblich.' }, { text: 'sistema' }, { text: 'estação', why: '-ção ist weiblich.' }],
          answer: 1,
          feedback: { rule: '`o sistema` – -ma (griechisch) ist männlich.', why: '`a viagem` und `a estação` sind weiblich.', avoid: 'Merke die -ma-Gruppe: problema, sistema, tema, programa, clima.' },
        },
        {
          id: `${T}.L2.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          tokens: ['A', 'Ana', 'e', 'o', 'Pedro', 'estão', 'aqui.'], extra: ['está'], german: 'Ana und Pedro sind hier.',
          feedback: { rule: 'Artikel vor Vornamen sind in weiten Teilen Brasiliens üblich: `a Ana`, `o Pedro`. Zwei Personen → `estão`.', why: '`está` ist Singular.', avoid: 'Zwei Subjekte → Verb im Plural.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Fehler finden',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'A problema é o mapa.', answers: ['O problema é o mapa.'], german: 'Das Problem ist die Karte.',
          feedback: { rule: '`o problema` ist männlich.', why: 'Die Endung -a führt hier in die Irre.', avoid: '-ma aus dem Griechischen → o.' },
        },
        {
          id: `${T}.L3.02`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.contractions'], difficulty: 3,
          sentence: 'Eu estou em Brasil.', answers: ['Eu estou no Brasil.', 'Estou no Brasil.'], german: 'Ich bin in Brasilien.',
          feedback: { rule: 'Brasilien hat einen Artikel (`o Brasil`) → em + o = `no Brasil`.', why: 'Ohne Artikel ist der Satz falsch – anders als bei Städten (`em São Paulo`).', avoid: 'Länder fast immer mit Artikel lernen: o Brasil, a Alemanha.' },
        },
        {
          id: `${T}.L3.03`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          direction: 'toTarget', source: 'Eine Blume und ein Buch.', answers: ['Uma flor e um livro.'],
          feedback: { rule: '`a flor` (f.) → uma flor; `o livro` (m.) → um livro.', why: '`flor` endet auf -or, ist aber weiblich.', avoid: 'Ausnahmen wie a flor, a dor, a cor gezielt merken.' },
        },
      ],
    },
  ],
  related: ['pt.g.plural', 'pt.g.contractions'],
};

export default topic;
