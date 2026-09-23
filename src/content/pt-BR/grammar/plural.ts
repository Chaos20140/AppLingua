import type { GrammarTopic } from '../../types';

const T = 'pt.g.plural';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 8,
  category: 'Artikel & Nomen',
  title: 'Plural von Nomen & Adjektiven',
  summary: '+s, +es, -m → -ns, -l → -is, -ão → -ões/-ães/-ãos – und warum Artikel und Adjektive den Plural mitmachen.',
  keywords: ['Plural', 'Mehrzahl', '-s', '-es', '-ns', '-is', '-ões', '-ães', 'Adjektiv', 'Übereinstimmung'],
  explanation: [
    {
      type: 'table',
      title: 'Pluralregeln',
      headers: ['Wortende', 'Regel', 'Beispiele'],
      rows: [
        ['Vokal', '+ s', 'casa → casas, café → cafés'],
        ['-r, -z', '+ es', 'flor → flores, mulher → mulheres, luz → luzes'],
        ['-m', '-m → -ns', 'homem → homens, jardim → jardins'],
        ['-al, -el, -ol, -ul', '-l → -is', 'animal → animais, hotel → hotéis, papel → papéis'],
        ['-il (betont)', '-il → -is', 'barril → barris'],
        ['-ês', '+ es (ohne Akzent)', 'português → portugueses'],
        ['-s (unbetont)', 'unverändert', 'o ônibus → os ônibus'],
        ['-ão', '-ões / -ães / -ãos', 'estação → estações, pão → pães, mão → mãos'],
      ],
    },
    {
      type: 'text',
      md:
        '**-ão hat drei Pluralformen.** Die häufigste ist **-ões** (`estações`, `lições`). Wichtige Wörter mit **-ães**: `pão → pães`, `alemão → alemães`, `cão → cães`. Mit **-ãos**: `mão → mãos`, `irmão → irmãos`, `cidadão → cidadãos`. Im Zweifel: -ões.\n' +
        '**Übereinstimmung:** Artikel und Adjektive richten sich nach dem Nomen: `o carro caro` → `os carros caros`, `a casa bonita` → `as casas bonitas`.',
    },
    {
      type: 'variant',
      variant: 'pt-BR',
      md: 'In lockerer Umgangssprache markieren viele Brasilianer den Plural nur am Artikel: `as casa bonita`, `os menino`. Du wirst das oft hören – geschrieben und im gepflegten Sprechen gilt aber die volle Form `as casas bonitas`.',
    },
    { type: 'tip', md: 'Schau auf den **letzten Buchstaben** – er bestimmt die Regel. Und: Was vor dem Nomen steht und was es beschreibt, macht den Plural mit.' },
  ],
  examples: [
    { target: 'o livro → os livros', german: 'das Buch → die Bücher' },
    { target: 'a flor → as flores', german: 'die Blume → die Blumen' },
    { target: 'o homem → os homens', german: 'der Mann → die Männer' },
    { target: 'o hotel → os hotéis', german: 'das Hotel → die Hotels' },
    { target: 'o alemão → os alemães', german: 'der Deutsche → die Deutschen' },
    {
      target: 'Os carros são caros.',
      german: 'Die Autos sind teuer.',
      parts: [{ text: 'Os', role: 'article' }, { text: ' ' }, { text: 'carros', role: 'noun' }, { text: ' ' }, { text: 'são', role: 'verb' }, { text: ' ' }, { text: 'caros', role: 'adjective' }, { text: '.' }],
    },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'os livros · as flores · os carros',
      german: 'die Bücher · die Blumen · die Autos',
      md: 'Im Deutschen gibt es viele Pluralformen (-er mit Umlaut, -n, -s …). Im Portugiesischen endet der Plural fast immer auf **-s** – deutlich einfacher! Dafür bekommen auch Artikel und Adjektive ein -s.',
    },
  ],
  mistakes: [
    { wrong: 'os homems', right: 'os homens', why: '-m wird vor dem Plural-s zu n.' },
    { wrong: 'os hotels', right: 'os hotéis', why: 'Wörter auf -l bilden den Plural auf -is.' },
    { wrong: 'as casa bonita', right: 'as casas bonitas', why: 'In der Standardsprache tragen Nomen und Adjektiv das Plural-s.' },
  ],
  mnemonic: 'Fast immer -s · -m → -ns · -l → -is · -ão → meist -ões · Adjektive ziehen mit.',
  levels: [
    {
      level: 1,
      title: 'Grundregeln',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'matchPairs', skills: ['grammar', 'vocabulary'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'livro', right: 'livros' }, { left: 'flor', right: 'flores' }, { left: 'homem', right: 'homens' }, { left: 'hotel', right: 'hotéis' }],
          feedback: { rule: 'Vokal + s; -r + es; -m → -ns; -l → -is.', why: 'Jede Endung hat ihre eigene Regel.', avoid: 'Erst den letzten Buchstaben ansehen.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Plural von `mulher`?',
          options: [{ text: 'mulhers', why: 'Nach -r kommt -es.' }, { text: 'mulheres' }, { text: 'mulheris', why: '-is gilt nur für Wörter auf -l.' }],
          answer: 1,
          feedback: { rule: '-r → + es: `mulheres`.', why: 'Ein bloßes -s nach r ist nicht möglich.', avoid: 'r und z brauchen ein e vor dem s.' },
        },
        {
          id: `${T}.L1.03`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 1,
          direction: 'toTarget', source: 'die Städte', answers: ['as cidades'],
          feedback: { rule: '`a cidade` → `as cidades` (Artikel und Nomen im Plural).', why: 'Auch der Artikel bekommt ein -s.', avoid: 'Plural immer doppelt markieren: as … -s.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Sonderfälle',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          instruction: 'Setze den Plural von „pão“ und „mão“ ein.',
          sentence: 'os ___ e as ___', answers: [['pães'], ['mãos']], german: 'die Brote und die Hände',
          feedback: { rule: '`pão → pães`, `mão → mãos` – zwei der Ausnahmen bei -ão.', why: 'Der Standard wäre -ões, aber diese Wörter folgen eigenen Mustern.', avoid: 'Lerne die Gruppen: -ães (pão, alemão, cão), -ãos (mão, irmão).' },
        },
        {
          id: `${T}.L2.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Plural von `estação`?',
          options: [{ text: 'estaçãos' }, { text: 'estações' }, { text: 'estaçães' }],
          answer: 1,
          feedback: { rule: 'Wörter auf -ção bilden den Plural immer auf -ções.', why: '-ãos und -ães kommen nur bei wenigen Wörtern vor.', avoid: '-ção → -ções, ohne Ausnahme.' },
        },
        {
          id: `${T}.L2.03`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 2,
          audio: 'Os hotéis são caros.', question: 'Was hörst du?', options: ['Das Hotel ist teuer.', 'Die Hotels sind teuer.', 'Die Autos sind teuer.'], answer: 1,
          feedback: { rule: '`os hotéis são caros` – alles im Plural.', why: 'Artikel `os`, Endung -éis und Verb `são` zeigen den Plural.', avoid: 'Hör auf mehrere Signale: Artikel, Endung, Verb.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Übereinstimmung',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'As flor são bonitas.', answers: ['As flores são bonitas.'], german: 'Die Blumen sind schön.',
          feedback: { rule: 'Nomen auf -r: + es → `flores`.', why: 'Artikel und Adjektiv stehen schon im Plural – das Nomen muss mitziehen.', avoid: 'Kontrolliere am Ende jedes Wort der Nominalgruppe.' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.ser'], difficulty: 3,
          direction: 'toTarget', source: 'Die Deutschen sind nett.', answers: ['Os alemães são simpáticos.', 'Os alemães são legais.'],
          feedback: { rule: '`alemão → alemães`; Adjektiv im Plural: `simpáticos`.', why: '„alemãos“ oder „alemões“ sind falsche Pluralformen.', avoid: 'alemão gehört zur kleinen -ães-Gruppe.' },
        },
        {
          id: `${T}.L3.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.ser'], difficulty: 3,
          sentence: 'Os carros ___ ___.', answers: [['são'], ['caros']], bank: ['é', 'são', 'caro', 'caros'], german: 'Die Autos sind teuer.',
          feedback: { rule: 'Plural-Subjekt → Verb im Plural (`são`) und Adjektiv im Plural (`caros`).', why: '`é` und `caro` passen nur zum Singular.', avoid: 'Subjekt, Verb und Adjektiv müssen zusammenpassen.' },
        },
      ],
    },
  ],
  related: ['pt.g.articles-gender', 'pt.g.numbers'],
};

export default topic;
