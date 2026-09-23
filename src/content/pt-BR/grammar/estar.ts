import type { GrammarTopic } from '../../types';

const T = 'pt.g.estar';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 5,
  category: 'Verben',
  title: 'estar – sein (Zustand & Ort)',
  summary: 'Die Formen estou, está, estamos, estão, die Kurzformen tô/tá – und wofür du estar brauchst: Befinden, Zustände, Aufenthaltsort und „estar com fome“.',
  keywords: ['estar', 'sein', 'estou', 'está', 'estamos', 'estão', 'tô', 'tá', 'Zustand', 'Befinden', 'Ort', 'fome', 'sede'],
  explanation: [
    {
      type: 'conjugation',
      verb: 'estar',
      translation: 'sein (Zustand, Ort)',
      tense: 'Präsens',
      rows: [
        { person: 'eu', form: 'estou', ending: 'ou' },
        { person: 'você / ele / ela / a gente', form: 'está', ending: 'á' },
        { person: 'nós', form: 'estamos', ending: 'amos' },
        { person: 'vocês / eles / elas', form: 'estão', ending: 'ão' },
      ],
    },
    {
      type: 'text',
      md:
        '`estar` beschreibt, **wie oder wo** jemand oder etwas **gerade** ist:\n' +
        '- Befinden: `Estou bem.` · `Como você está?`\n' +
        '- vorübergehende Zustände: `Ela está cansada / doente / ocupada.`\n' +
        '- Aufenthaltsort von Personen und beweglichen Dingen: `Estou em casa.` · `O livro está na mesa.`\n' +
        '- Wetter: `Está calor.` · `Está frio.`\n' +
        '- `estar com` + Nomen für Körpergefühle: `Estou com fome / sede / frio.` (Ich habe Hunger / Durst / mir ist kalt.)',
    },
    {
      type: 'variant',
      variant: 'pt-BR',
      md: 'Im Alltag fällt die erste Silbe fast immer weg: `tô` (estou), `tá` (está), `tamo` (estamos), `tão` (estão). `Tô com fome!` · `Tá calor, né?` Diese Formen solltest du sicher verstehen – in Chats sind sie normal, in formellen Texten nicht.',
    },
    { type: 'tip', md: '**estar = Statusmeldung**: Wie geht’s? Wo bist du? Wie ist es gerade?' },
  ],
  examples: [
    {
      target: 'Estou com fome.',
      german: 'Ich habe Hunger.',
      literal: 'Ich bin mit Hunger.',
      parts: [{ text: 'Estou', role: 'verb' }, { text: ' ' }, { text: 'com', role: 'preposition' }, { text: ' ' }, { text: 'fome', role: 'noun' }, { text: '.' }],
    },
    { target: 'Onde você está?', german: 'Wo bist du?' },
    { target: 'Ela está doente hoje.', german: 'Sie ist heute krank.' },
    { target: 'Tá calor, né?', german: 'Ganz schön warm, oder?', note: '`né` (von „não é“) = oder? / nicht wahr?' },
    { target: 'O livro está na mesa.', german: 'Das Buch liegt auf dem Tisch.', note: 'Wo Deutsche „liegen/stehen“ sagen, reicht im Portugiesischen `estar`.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Estou com fome. · Estou bem.',
      german: 'Ich habe Hunger. · Mir geht es gut.',
      md: 'Wo das Deutsche „haben“ oder „es geht mir“ benutzt, sagt das Portugiesische einfach „ich bin“ – mit `estar`. (`Tenho fome` ist ebenfalls korrekt, klingt in Brasilien aber etwas formeller.)',
    },
    {
      type: 'text',
      md: 'Das Deutsche unterscheidet Positionen („liegt, steht, hängt“). Das Portugiesische sagt einfach `está`: `O quadro está na parede.` – Das Bild hängt an der Wand.',
    },
  ],
  mistakes: [
    { wrong: 'Eu está bem.', right: 'Eu estou bem.', why: 'Zu `eu` gehört `estou`.' },
    { wrong: 'Sou com fome.', right: 'Estou com fome.', why: 'Hunger ist ein vorübergehender Zustand → `estar`.' },
    { wrong: 'Sou em casa.', right: 'Estou em casa.', why: 'Aufenthaltsort einer Person → `estar`.' },
  ],
  mnemonic: 'estou – está – estamos – estão: die Statusmeldung (Kurzform: tô – tá – tamo – tão).',
  levels: [
    {
      level: 1,
      title: 'Formen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          verb: 'estar', tense: 'Präsens', person: 'nós', sentence: 'Nós ___ cansados.', answers: ['estamos', 'tamo', 'tamos'],
          feedback: { rule: 'nós → `estamos`.', why: '`estão` ist die Form für vocês/eles/elas.', avoid: 'nós → -mos.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '„Ich bin zu Hause.“',
          options: [{ text: 'Estou em casa.' }, { text: 'Sou em casa.', why: 'Ort → estar, nicht ser.' }, { text: 'Está em casa.', why: '`está` passt zu você/ele/ela.' }],
          answer: 0,
          feedback: { rule: 'Aufenthaltsort → `estar`: `Estou em casa.`', why: '`sou` beschreibt Identität, `está` ist die falsche Person.', avoid: 'Wo? → estar.' },
        },
        {
          id: `${T}.L1.03`, type: 'matchPairs', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 1,
          instruction: 'Ordne die Kurzformen den Langformen zu.',
          pairs: [{ left: 'tô', right: 'estou' }, { left: 'tá', right: 'está' }, { left: 'tamo', right: 'estamos' }, { left: 'tão', right: 'estão' }],
          feedback: { rule: 'Kurzformen: tô = estou, tá = está, tamo = estamos, tão = estão.', why: 'Die Silbe „es-“ fällt im Alltag einfach weg.', avoid: 'Streiche gedanklich „es-“ – dann erkennst du die Form.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Im Alltag',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.pronouns'], difficulty: 2,
          sentence: 'Vocês ___ cansados? – Não, a gente ___ bem.', answers: [['estão', 'tão'], ['está', 'tá']], german: 'Seid ihr müde? – Nein, uns geht’s gut.',
          feedback: { rule: 'vocês estão; a gente está (3. Person Singular).', why: '`a gente estamos` ist falsch, auch wenn es „wir“ bedeutet.', avoid: 'a gente = Verbform wie ele.' },
        },
        {
          id: `${T}.L2.02`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 2,
          audio: 'Tô com fome.', question: 'Was sagt die Person?', options: ['Ich habe Hunger.', 'Ich bin müde.', 'Ich bin zu Hause.'], answer: 0,
          feedback: { rule: '`tô com fome` = ich habe Hunger (tô = estou).', why: 'müde = cansado, zu Hause = em casa.', avoid: 'estar com + Gefühl: fome (Hunger), sede (Durst), frio (Kälte).' },
        },
        {
          id: `${T}.L2.03`, type: 'translate', skills: ['reading', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toGerman', source: 'Onde vocês estão?', answers: ['Wo seid ihr?', 'Wo sind Sie?', 'Wo seid ihr gerade?', 'Wo sind Sie gerade?'],
          feedback: { rule: '`onde` = wo, `vocês estão` = ihr seid / Sie sind (mehrere).', why: '`vocês` kann locker (ihr) oder höflich (Sie) gemeint sein.', avoid: 'estar + onde → Frage nach dem Aufenthaltsort.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Feste Wendungen',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'Eu sou com sede.', answers: ['Eu estou com sede.', 'Estou com sede.', 'Tô com sede.'], german: 'Ich habe Durst.',
          feedback: { rule: 'Körpergefühle: `estar com` + Nomen.', why: '`ser` passt nicht zu vorübergehenden Zuständen.', avoid: 'Hunger, Durst, Kälte → estou com …' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          direction: 'toTarget', source: 'Wir haben Hunger.',
          answers: ['Estamos com fome.', 'Nós estamos com fome.', 'A gente está com fome.', 'A gente tá com fome.', 'Temos fome.', 'Nós temos fome.'],
          feedback: { rule: 'Brasilianisch üblich: `Estamos com fome.` / `A gente está com fome.`', why: '`Temos fome` ist auch korrekt, klingt aber formeller.', avoid: 'Wörtlich „wir sind mit Hunger“ – nicht „haben“.' },
        },
        {
          id: `${T}.L3.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.contractions'], difficulty: 3,
          tokens: ['Ela', 'está', 'no', 'hotel', 'agora.'], extra: ['é'], german: 'Sie ist jetzt im Hotel.',
          feedback: { rule: 'Aufenthaltsort einer Person → `estar`; em + o = `no`.', why: '`é` (ser) beschreibt keinen Aufenthaltsort.', avoid: 'Personen + Ort → estar.' },
        },
      ],
    },
  ],
  related: ['pt.g.ser', 'pt.g.ser-estar'],
};

export default topic;
