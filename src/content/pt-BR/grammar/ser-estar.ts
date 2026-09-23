import type { GrammarTopic } from '../../types';

const T = 'pt.g.ser-estar';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 6,
  category: 'Verben',
  title: 'ser oder estar?',
  summary: 'Die Entscheidung zwischen ser und estar: Steckbrief oder Statusmeldung – mit den typischen Bedeutungsunterschieden wie „é bonita“ / „está bonita“.',
  keywords: ['ser', 'estar', 'sein', 'Unterschied', 'Zustand', 'Eigenschaft', 'Ort', 'bonito', 'chato', 'ficar'],
  explanation: [
    {
      type: 'table',
      title: 'Die Grundregel',
      headers: ['ser – Steckbrief', 'estar – Statusmeldung'],
      rows: [
        ['Name, Identität: Sou a Lena.', 'Befinden: Estou bem.'],
        ['Herkunft: Sou de Berlim.', 'Aufenthaltsort: Estou em Berlim.'],
        ['Beruf: Sou professora.', 'vorübergehende Situation: Estou de férias.'],
        ['Charakter: Ele é calmo.', 'Stimmung: Ele está nervoso.'],
        ['Uhrzeit, Datum: São três horas.', 'Wetter: Está frio.'],
      ],
    },
    {
      type: 'table',
      title: 'Gleiches Adjektiv – andere Bedeutung',
      headers: ['mit ser', 'mit estar'],
      rows: [
        ['Ela é bonita. – Sie ist hübsch.', 'Ela está bonita. – Sie sieht (heute) hübsch aus.'],
        ['Ele é chato. – Er ist nervig (ein nerviger Typ).', 'Ele está chato. – Er ist (gerade) nervig / schlecht drauf.'],
        ['A sopa é boa. – Die Suppe ist gut (ein gutes Rezept).', 'A sopa está boa. – Die Suppe schmeckt (gerade) gut.'],
        ['Ele é feliz. – Er ist ein glücklicher Mensch.', 'Ele está feliz. – Er ist (gerade) froh.'],
      ],
    },
    {
      type: 'text',
      md:
        '**Orte genauer:** Personen und bewegliche Dinge → `estar` (`O Pedro está no hotel.`). Für feste Orte wie Gebäude und Städte sagen Brasilianer meist `ficar`: `Onde fica o banco?` – Wo ist die Bank? Veranstaltungen (Wo findet etwas statt?) stehen mit `ser`: `A festa é na casa da Ana.`',
    },
    { type: 'tip', md: 'Frag dich: Gehört es in den **Steckbrief** (ser) oder ist es eine **Statusmeldung** (estar)? Signalwörter für estar: `hoje`, `agora`, `ainda`.' },
  ],
  examples: [
    {
      target: 'Sou alemã, mas estou no Brasil.',
      german: 'Ich bin Deutsche, aber (gerade) in Brasilien.',
      parts: [{ text: 'Sou', role: 'verb' }, { text: ' ' }, { text: 'alemã', role: 'adjective' }, { text: ', mas ' }, { text: 'estou', role: 'verb' }, { text: ' ' }, { text: 'no', role: 'preposition' }, { text: ' ' }, { text: 'Brasil', role: 'noun' }, { text: '.' }],
    },
    { target: 'Ele é simpático, mas hoje está cansado.', german: 'Er ist nett, aber heute ist er müde.' },
    { target: 'Nossa, você está bonita hoje!', german: 'Wow, du siehst heute toll aus!' },
    { target: 'A festa é na casa da Ana.', german: 'Die Party ist (findet statt) bei Ana.' },
    { target: 'Onde fica a estação?', german: 'Wo ist der Bahnhof?' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Ela é bonita. · Ela está bonita.',
      german: 'Sie ist hübsch. · Sie sieht (heute) hübsch aus.',
      md: 'Das Deutsche braucht Zusatzwörter wie „gerade“, „heute“ oder „aussehen“, um einen Zustand auszudrücken. Im Portugiesischen erledigt das schon die Wahl des Verbs.',
    },
  ],
  mistakes: [
    { wrong: 'Sou cansado.', right: 'Estou cansado.', why: 'Müdigkeit ist ein Zustand, kein Charakterzug.' },
    { wrong: 'Estou alemão.', right: 'Sou alemão.', why: 'Die Nationalität gehört zur Identität.' },
    { wrong: 'A festa está na casa da Ana.', right: 'A festa é na casa da Ana.', why: 'Bei Veranstaltungen (wo etwas stattfindet) steht `ser`.' },
  ],
  mnemonic: '**Steckbrief → ser. Statusmeldung → estar.**',
  levels: [
    {
      level: 1,
      title: 'Grundregel',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '„Ich bin Brasilianerin.“',
          options: [{ text: 'Sou brasileira.' }, { text: 'Estou brasileira.', why: 'Nationalität → ser.' }, { text: 'É brasileira.', why: '`é` ist nicht die Form für „ich“.' }],
          answer: 0,
          feedback: { rule: 'Nationalität → `ser`: `Sou brasileira.`', why: 'Die Nationalität ändert sich nicht von heute auf morgen.', avoid: 'Steckbrief → ser.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '„Wir sind im Hotel.“',
          options: [{ text: 'Somos no hotel.', why: 'Aufenthaltsort → estar.' }, { text: 'Estamos no hotel.' }, { text: 'Estão no hotel.', why: '`estão` heißt „sie sind / ihr seid“.' }],
          answer: 1,
          feedback: { rule: 'Aufenthaltsort → `estar`: `Estamos no hotel.`', why: '`somos` wäre ser, `estão` die falsche Person.', avoid: 'Wo bin ich gerade? → estar.' },
        },
        {
          id: `${T}.L1.03`, type: 'matchPairs', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'Sou de Recife.', right: 'Ich komme aus Recife.' }, { left: 'Estou em Recife.', right: 'Ich bin (gerade) in Recife.' }, { left: 'Sou calmo.', right: 'Ich bin ein ruhiger Mensch.' }, { left: 'Estou calmo.', right: 'Ich bin (gerade) ruhig.' }],
          feedback: { rule: 'ser = dauerhaft/Identität, estar = gerade jetzt.', why: 'Mit demselben Ort oder Adjektiv ändert das Verb die Bedeutung.', avoid: 'Übersetze estar gedanklich mit „gerade“.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Bedeutung unterscheiden',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Ela ___ alemã, mas agora ___ no Brasil.', answers: [['é'], ['está', 'tá']], german: 'Sie ist Deutsche, aber jetzt in Brasilien.',
          feedback: { rule: 'Nationalität → ser (`é`); Aufenthaltsort → estar (`está`).', why: 'Zwei verschiedene Informationen, zwei verschiedene Verben.', avoid: 'Signalwort `agora` (jetzt) → estar.' },
        },
        {
          id: `${T}.L2.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Was bedeutet `A sopa está boa.`?',
          options: [{ text: 'Die Suppe ist (generell) ein gutes Gericht.', why: 'Das wäre `A sopa é boa.`' }, { text: 'Die Suppe schmeckt (gerade) gut.' }, { text: 'Die Suppe ist fertig.', why: 'Das hieße `A sopa está pronta.`' }],
          answer: 1,
          feedback: { rule: '`estar` + Adjektiv = aktueller Eindruck: Die Suppe schmeckt gerade gut.', why: '`ser boa` beschreibt eine allgemeine Eigenschaft.', avoid: 'estar = so, wie es jetzt wirkt.' },
        },
        {
          id: `${T}.L2.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Normalmente ele ___ calmo, mas hoje ___ nervoso.', answers: [['é'], ['está', 'tá']], german: 'Normalerweise ist er ruhig, aber heute ist er nervös.',
          feedback: { rule: 'Charakter (normalmente) → ser; Stimmung (hoje) → estar.', why: 'Die Signalwörter `normalmente` und `hoje` zeigen den Unterschied.', avoid: 'Achte auf Zeitwörter im Satz.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Feinheiten',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'A festa está na casa da Ana.', answers: ['A festa é na casa da Ana.'], german: 'Die Party findet bei Ana statt.',
          feedback: { rule: 'Wo eine Veranstaltung stattfindet → `ser`.', why: 'Eine Party ist kein Gegenstand, der sich irgendwo befindet, sondern ein Ereignis.', avoid: 'Ereignis + Ort → é.' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          direction: 'toTarget', source: 'Er ist nett, aber heute ist er müde.',
          answers: ['Ele é simpático, mas hoje está cansado.', 'Ele é simpático, mas hoje ele está cansado.', 'Ele é simpático, mas hoje tá cansado.', 'Ele é simpático, mas hoje ele tá cansado.', 'Ele é legal, mas hoje está cansado.', 'Ele é legal, mas hoje ele está cansado.'],
          feedback: { rule: 'Charakter → `é`; heutiger Zustand → `está`.', why: 'Beide deutschen „ist“ werden unterschiedlich übersetzt.', avoid: 'Erst einordnen: Steckbrief oder Statusmeldung?' },
        },
        {
          id: `${T}.L3.03`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 3,
          audio: 'Nossa, você está bonita hoje!', question: 'Was meint die Person?',
          options: ['Du bist ein hübscher Mensch.', 'Du siehst heute toll aus.', 'Du bist heute zu Hause.'], answer: 1,
          feedback: { rule: '`estar bonita` = heute gut aussehen.', why: '`ser bonita` wäre eine allgemeine Aussage über das Aussehen.', avoid: '`hoje` + estar → aktueller Eindruck.' },
        },
      ],
    },
  ],
  related: ['pt.g.ser', 'pt.g.estar'],
};

export default topic;
