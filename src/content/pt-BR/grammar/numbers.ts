import type { GrammarTopic } from '../../types';

const T = 'pt.g.numbers';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 11,
  category: 'Zahlen',
  title: 'Zahlen 0–100 und darüber hinaus',
  summary: 'Zahlen von 0 bis 100, weibliche Formen bei um/uma und dois/duas, das „e“ zwischen Zehnern und Einern, meia für sechs – plus Ausblick auf die Hunderter.',
  keywords: ['Zahlen', 'zählen', 'Preis', 'reais', 'meia', 'cem', 'cento', 'mil', 'um', 'uma', 'dois', 'duas'],
  explanation: [
    {
      type: 'table',
      title: '0–100',
      headers: ['0–9', '10–19', 'Zehner'],
      rows: [
        ['0 zero', '10 dez', '20 vinte'],
        ['1 um / uma', '11 onze', '30 trinta'],
        ['2 dois / duas', '12 doze', '40 quarenta'],
        ['3 três', '13 treze', '50 cinquenta'],
        ['4 quatro', '14 catorze / quatorze', '60 sessenta'],
        ['5 cinco', '15 quinze', '70 setenta'],
        ['6 seis (meia)', '16 dezesseis', '80 oitenta'],
        ['7 sete', '17 dezessete', '90 noventa'],
        ['8 oito', '18 dezoito', '100 cem'],
        ['9 nove', '19 dezenove', '–'],
      ],
    },
    {
      type: 'table',
      title: 'Ausblick: Hunderter & Tausend',
      headers: ['Zahl', 'Portugiesisch'],
      rows: [
        ['101', 'cento e um'],
        ['200', 'duzentos / duzentas'],
        ['300', 'trezentos / trezentas'],
        ['500', 'quinhentos / quinhentas'],
        ['1000', 'mil'],
      ],
    },
    {
      type: 'text',
      md:
        '**Zusammensetzen:** Zehner + `e` + Einer: `vinte e cinco` (25), `noventa e nove` (99). Genau 100 heißt `cem`; ab 101 `cento e …`.\n' +
        '**Genus:** 1 und 2 haben weibliche Formen – auch in zusammengesetzten Zahlen: `uma casa`, `duas casas`, `vinte e duas pessoas`. Ab 200 passen sich auch die Hunderter an: `duzentas pessoas`.\n' +
        '**Preise:** `R$ 12,50` = `doze reais e cinquenta (centavos)`. Singular: `um real`, Plural: `reais`.',
    },
    {
      type: 'variant',
      variant: 'pt-BR',
      md: 'Beim Diktieren von Telefon- und Hausnummern sagen Brasilianer für 6 meist `meia` (von `meia dúzia`, halbes Dutzend), damit man `seis` nicht mit `três` verwechselt: `nove, oito, meia, dois`. In Brasilien sind `catorze` und `quatorze` beide richtig.',
    },
    { type: 'tip', md: '**Zehner – e – Einer.** Und bei Telefonnummern ist die Sechs eine **meia**.' },
  ],
  examples: [
    { target: 'vinte e cinco', german: 'fünfundzwanzig' },
    {
      target: 'São duas mulheres e dois homens.',
      german: 'Es sind zwei Frauen und zwei Männer.',
      parts: [{ text: 'São', role: 'verb' }, { text: ' ' }, { text: 'duas', role: 'other' }, { text: ' ' }, { text: 'mulheres', role: 'noun' }, { text: ' e ' }, { text: 'dois', role: 'other' }, { text: ' ' }, { text: 'homens', role: 'noun' }, { text: '.' }],
    },
    { target: 'São doze reais e cinquenta.', german: 'Das macht 12,50 Reais.' },
    { target: 'O número é nove, nove, meia, oito.', german: 'Die Nummer ist 9-9-6-8.' },
    { target: 'Cem pessoas.', german: 'Hundert Personen.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'vinte e cinco',
      german: 'fünfundzwanzig',
      md: 'Umgekehrte Reihenfolge: Das Portugiesische sagt „zwanzig und fünf“. Genau hier entstehen die meisten Zahlendreher – beim Hören und beim Sprechen.',
    },
    {
      type: 'text',
      md: 'Angenehm: Dezimalkomma und Tausenderpunkt funktionieren wie im Deutschen – `R$ 1.250,90`.',
    },
  ],
  mistakes: [
    { wrong: 'dois mulheres', right: 'duas mulheres', why: '2 hat vor weiblichen Nomen die Form `duas`.' },
    { wrong: 'cinco e vinte (für 25)', right: 'vinte e cinco', why: 'Zehner zuerst, dann `e`, dann Einer.' },
    { wrong: 'cento reais (für 100)', right: 'cem reais', why: 'Genau 100 heißt `cem`; `cento` nur in 101–199.' },
  ],
  mnemonic: 'Zehner – e – Einer · um/uma, dois/duas · genau 100 = cem · 6 am Telefon = meia.',
  levels: [
    {
      level: 1,
      title: 'Zahlen erkennen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'matchPairs', skills: ['vocabulary', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: '3', right: 'três' }, { left: '11', right: 'onze' }, { left: '19', right: 'dezenove' }, { left: '60', right: 'sessenta' }, { left: '100', right: 'cem' }],
          feedback: { rule: '3 três, 11 onze, 19 dezenove, 60 sessenta, 100 cem.', why: '`sessenta` (60) und `setenta` (70) werden leicht verwechselt.', avoid: 'seis → sessenta, sete → setenta.' },
        },
        {
          id: `${T}.L1.02`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: [T], difficulty: 1,
          audio: 'treze', question: 'Welche Zahl hörst du?', options: ['3', '13', '30'], answer: 1,
          feedback: { rule: '`treze` = 13.', why: '3 = três, 30 = trinta.', avoid: '11–15 enden auf -ze.' },
        },
        {
          id: `${T}.L1.03`, type: 'mc', skills: ['vocabulary', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Wie heißt genau 100?',
          options: [{ text: 'cento', why: '`cento` nur in 101–199.' }, { text: 'cem' }, { text: 'mil', why: '`mil` = 1000.' }],
          answer: 1,
          feedback: { rule: 'Genau 100 = `cem`.', why: '`cento e um` = 101; `mil` = 1000.', avoid: 'cem steht allein, cento braucht ein „e …“.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Zahlen bilden',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'translate', skills: ['writing', 'vocabulary'], topicIds: [T], difficulty: 2,
          direction: 'toTarget', source: '47', answers: ['quarenta e sete'],
          feedback: { rule: '47 = `quarenta e sete` (Zehner + e + Einer).', why: 'Die deutsche Reihenfolge „sieben und vierzig“ gilt hier nicht.', avoid: 'Lies die Ziffern von links: 4 → quarenta, 7 → sete.' },
        },
        {
          id: `${T}.L2.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.articles-gender'], difficulty: 2,
          sentence: '___ mulheres e ___ homens (2 + 2)', answers: [['duas'], ['dois']], german: 'zwei Frauen und zwei Männer',
          feedback: { rule: '2 vor weiblichen Nomen = `duas`, vor männlichen = `dois`.', why: '`mulher` ist weiblich, `homem` männlich.', avoid: 'Bei 1 und 2 immer das Genus prüfen.' },
        },
        {
          id: `${T}.L2.03`, type: 'dictation', skills: ['listening', 'writing'], topicIds: [T], difficulty: 2,
          instruction: 'Schreib die Zahl als Wort oder in Ziffern.',
          audio: 'sessenta e seis', answers: ['sessenta e seis', '66'],
          feedback: { rule: '66 = `sessenta e seis`.', why: '`setenta e seis` wäre 76.', avoid: 'sess- → 6, set- → 7.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Preise & Nummern',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'São cinco e trinta reais.', answers: ['São trinta e cinco reais.'], german: 'Das macht 35 Reais.',
          feedback: { rule: 'Zehner zuerst: `trinta e cinco`.', why: '„cinco e trinta“ ist die deutsche Reihenfolge.', avoid: 'Beim Sprechen erst den Zehner denken.' },
        },
        {
          id: `${T}.L3.02`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: [T], difficulty: 3,
          audio: 'O número é nove, nove, meia, oito.', question: 'Welche Nummer hörst du?', options: ['9-9-3-8', '9-9-6-8', '9-9-7-8'], answer: 1,
          feedback: { rule: '`meia` = 6 beim Diktieren von Nummern.', why: '`meia` klingt nicht wie drei oder sieben – es ist das halbe Dutzend.', avoid: 'Hörst du „meia“ in einer Nummer: 6.' },
        },
        {
          id: `${T}.L3.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'vinte e ___ pessoas (22)', answers: [['duas']], german: '22 Personen',
          feedback: { rule: '`pessoa` ist weiblich → `vinte e duas pessoas`.', why: 'Auch in zusammengesetzten Zahlen passt sich die 2 an.', avoid: 'Die letzte Ziffer 1 oder 2? Genus prüfen!' },
        },
      ],
    },
  ],
  related: ['pt.g.plural', 'pt.g.articles-gender'],
};

export default topic;
