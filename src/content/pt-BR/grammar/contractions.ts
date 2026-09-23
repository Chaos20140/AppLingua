import type { GrammarTopic } from '../../types';

const T = 'pt.g.contractions';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 9,
  category: 'Artikel & Nomen',
  title: 'Kontraktionen: do, na, pelo, à …',
  summary: 'de, em, por und a verschmelzen mit dem Artikel: do, da, no, na, pelo, pela, ao, à – außerdem dele, nele und num/numa.',
  keywords: ['Kontraktion', 'Verschmelzung', 'do', 'da', 'no', 'na', 'pelo', 'pela', 'ao', 'à', 'Crase', 'dele', 'num'],
  explanation: [
    {
      type: 'table',
      title: 'Präposition + bestimmter Artikel',
      headers: ['', '+ o', '+ a', '+ os', '+ as'],
      rows: [
        ['de (von, aus)', 'do', 'da', 'dos', 'das'],
        ['em (in, an, auf)', 'no', 'na', 'nos', 'nas'],
        ['por (durch, für)', 'pelo', 'pela', 'pelos', 'pelas'],
        ['a (zu, nach)', 'ao', 'à', 'aos', 'às'],
      ],
    },
    {
      type: 'text',
      md:
        'Die Verschmelzung ist **Pflicht**: `de o` oder `em a` gibt es im Portugiesischen nicht.\n' +
        '- Länder mit Artikel: `Sou do Brasil.` · `Moro na Alemanha.` Städte meist ohne: `Sou de Berlim.` · `Moro em São Paulo.` (Ausnahme: `o Rio` → `no Rio`)\n' +
        '- Besitz: `o carro do Pedro` (Pedros Auto)\n' +
        '- Mit Pronomen: `de + ele = dele` (sein), `de + ela = dela` (ihr), `em + ele = nele`\n' +
        '- Mit unbestimmtem Artikel (freiwillig): `em um = num`, `em uma = numa` – beides ist korrekt.\n' +
        '- `à` (a + a, „Crase“) mit Gravis-Akzent: `Vou à praia.` – Ich gehe zum Strand.',
    },
    { type: 'tip', md: 'Vor jedem `de` / `em` kurz prüfen: **Folgt ein Artikel?** Dann verschmelzen.' },
  ],
  examples: [
    {
      target: 'Sou do Brasil.',
      german: 'Ich komme aus Brasilien.',
      parts: [{ text: 'Sou', role: 'verb' }, { text: ' ' }, { text: 'do', role: 'preposition' }, { text: ' ' }, { text: 'Brasil', role: 'noun' }, { text: '.' }],
    },
    { target: 'Estou na praia.', german: 'Ich bin am Strand.' },
    { target: 'O livro é da Ana.', german: 'Das Buch gehört Ana.', literal: 'Das Buch ist von der Ana.' },
    { target: 'O carro dele é novo.', german: 'Sein Auto ist neu.', literal: 'Das Auto von ihm ist neu.' },
    { target: 'Moro numa cidade pequena.', german: 'Ich wohne in einer kleinen Stadt.', note: 'Auch korrekt: `em uma cidade pequena`.' },
    { target: 'Vou à praia amanhã.', german: 'Ich gehe morgen an den Strand.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'no hotel · do médico · ao centro',
      german: 'im Hotel · vom Arzt · zum Zentrum',
      md: 'Auch das Deutsche verschmilzt: in dem → im, von dem → vom, zu dem → zum. Der Unterschied: Im Portugiesischen ist die Verschmelzung **immer** Pflicht.',
    },
  ],
  mistakes: [
    { wrong: 'Sou de o Brasil.', right: 'Sou do Brasil.', why: '`de` + `o` muss zu `do` verschmelzen.' },
    { wrong: 'Estou em a cidade.', right: 'Estou na cidade.', why: '`em` + `a` = `na`.' },
    { wrong: 'O carro de ele.', right: 'O carro dele.', why: 'Auch mit Pronomen wird verschmolzen: de + ele = dele.' },
  ],
  mnemonic: 'de → do/da · em → no/na · por → pelo/pela · a → ao/à. Kleine Wörter kleben zusammen.',
  levels: [
    {
      level: 1,
      title: 'Die Formen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'matchPairs', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'de + o', right: 'do' }, { left: 'de + a', right: 'da' }, { left: 'em + o', right: 'no' }, { left: 'em + a', right: 'na' }, { left: 'em + os', right: 'nos' }],
          feedback: { rule: 'de + o/a = do/da; em + o/a/os/as = no/na/nos/nas.', why: 'Aus `em` wird ein `n`, aus `de` ein `d`.', avoid: 'n = in, d = von/aus.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Sou ___ Alemanha.',
          options: [{ text: 'de', why: 'Alemanha hat einen Artikel – de allein reicht nicht.' }, { text: 'da' }, { text: 'do', why: '`Alemanha` ist weiblich.' }],
          answer: 1,
          feedback: { rule: '`a Alemanha` → de + a = `da Alemanha`.', why: '`do` wäre männlich (do Brasil).', avoid: 'Erst das Genus des Landes, dann verschmelzen.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Im Satz',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Estou ___ hotel e ela está ___ estação.', answers: [['no'], ['na']], german: 'Ich bin im Hotel und sie ist am Bahnhof.',
          feedback: { rule: '`o hotel` → no hotel; `a estação` → na estação.', why: 'Das Genus des Nomens entscheidet zwischen no und na.', avoid: 'Artikel mitdenken: o hotel, a estação.' },
        },
        {
          id: `${T}.L2.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'O livro é ___ Pedro.', answers: [['do', 'de']], german: 'Das Buch gehört Pedro.',
          feedback: { rule: 'Besitz: `de` + `o Pedro` = `do Pedro`.', why: 'Vor Vornamen steht in vielen Regionen ein Artikel. Ohne Artikel wäre auch `de Pedro` möglich.', avoid: 'Besitz = de + Besitzer.' },
        },
        {
          id: `${T}.L2.03`, type: 'dictation', skills: ['listening', 'writing'], topicIds: [T], difficulty: 2,
          audio: 'Somos da Alemanha, mas moramos no Brasil.', answers: ['Somos da Alemanha, mas moramos no Brasil.'], german: 'Wir kommen aus Deutschland, wohnen aber in Brasilien.',
          feedback: { rule: '`da Alemanha` (de + a), `no Brasil` (em + o).', why: 'Beim Hören klingen die Kontraktionen wie ein Teil des nächsten Wortes.', avoid: 'Schreib Kontraktionen immer als eigenes Wort: da, no.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Mit Pronomen & à',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'O carro de ele é caro.', answers: ['O carro dele é caro.'], german: 'Sein Auto ist teuer.',
          feedback: { rule: 'de + ele = `dele` (sein), de + ela = `dela` (ihr).', why: 'Auch Pronomen verschmelzen mit `de`.', avoid: 'dele/dela stehen **nach** dem Nomen: o carro dele.' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.estar'], difficulty: 3,
          direction: 'toTarget', source: 'Ich bin im Hotel.', answers: ['Estou no hotel.', 'Eu estou no hotel.', 'Tô no hotel.'],
          feedback: { rule: 'Ort → estar; em + o = `no`.', why: '`em o hotel` ist nicht möglich.', avoid: 'im = no, in der = na.' },
        },
        {
          id: `${T}.L3.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 3,
          tokens: ['As', 'fotos', 'são', 'dos', 'amigos.'], extra: ['de'], german: 'Die Fotos sind von den Freunden.',
          feedback: { rule: 'de + os = `dos`.', why: '`de os` muss verschmelzen.', avoid: 'Auch im Plural: dos, das, nos, nas.' },
        },
      ],
    },
  ],
  related: ['pt.g.articles-gender', 'pt.g.ser'],
};

export default topic;
