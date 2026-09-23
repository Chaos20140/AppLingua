import type { GrammarTopic } from '../../types';

const T = 'pt.g.pronouns';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 3,
  category: 'Pronomen',
  title: 'Personalpronomen & a gente',
  summary: 'eu, você, ele, ela, a gente, nós, vocês, eles, elas – dazu Pronomen nach Präpositionen wie comigo und com você.',
  keywords: ['Pronomen', 'ich', 'du', 'er', 'sie', 'wir', 'ihr', 'a gente', 'nós', 'vocês', 'eles', 'elas', 'comigo', 'conosco'],
  explanation: [
    {
      type: 'table',
      title: 'Subjektpronomen',
      headers: ['Person', 'Portugiesisch', 'Deutsch', 'Verbform wie'],
      rows: [
        ['1. Sg.', 'eu', 'ich', 'eu'],
        ['2. Sg.', 'você', 'du', 'ele / ela'],
        ['3. Sg.', 'ele / ela', 'er / sie', 'ele / ela'],
        ['1. Pl.', 'a gente', 'wir (Alltag)', 'ele / ela'],
        ['1. Pl.', 'nós', 'wir (neutral)', 'nós'],
        ['2. Pl.', 'vocês', 'ihr / Sie (mehrere)', 'eles / elas'],
        ['3. Pl.', 'eles / elas', 'sie', 'eles / elas'],
      ],
    },
    {
      type: 'text',
      md:
        '**a gente** ist im gesprochenen Brasilianisch das übliche „wir“. Grammatisch ist es Singular: `a gente fala`, `a gente é` – nicht „a gente falamos“. `nós` (`nós falamos`) ist neutral und in geschriebenen Texten häufiger.\n' +
        '**eles / elas:** `elas` nur für reine Frauengruppen; sobald ein Mann dabei ist, heißt es `eles`.\n' +
        '**Pronomen weglassen?** Bei `eu` und `nós` zeigt die Verbendung die Person (`Falo português.`). Bei você/ele/ela/a gente ist die Form gleich – deshalb nennen Brasilianer das Pronomen dort meist.',
    },
    {
      type: 'table',
      title: 'Nach Präpositionen',
      headers: ['Pronomen', 'mit com', 'mit para (für)'],
      rows: [
        ['eu', 'comigo', 'para mim'],
        ['você', 'com você', 'para você'],
        ['ele / ela', 'com ele / com ela', 'para ele / para ela'],
        ['a gente / nós', 'com a gente / conosco', 'para a gente / para nós'],
        ['vocês', 'com vocês', 'para vocês'],
        ['eles / elas', 'com eles / com elas', 'para eles / para elas'],
      ],
    },
    { type: 'tip', md: 'Ein Mann dabei → **eles**. Im Gespräch **a gente**, im Formular **nós**. Mit mir = **comigo**, für mich = **para mim**.' },
  ],
  examples: [
    {
      target: 'A gente fala português.',
      german: 'Wir sprechen Portugiesisch.',
      parts: [{ text: 'A gente', role: 'subject' }, { text: ' ' }, { text: 'fala', role: 'verb' }, { text: ' ' }, { text: 'português', role: 'object' }, { text: '.' }],
      note: 'Verbform wie bei ele: `fala`.',
    },
    { target: 'Nós falamos português.', german: 'Wir sprechen Portugiesisch.', note: 'Neutral, in Texten häufiger.' },
    { target: 'Pedro e Ana? Eles estão em casa.', german: 'Pedro und Ana? Sie sind zu Hause.' },
    { target: 'Você vem comigo?', german: 'Kommst du mit mir?' },
    { target: 'Isso é para mim?', german: 'Ist das für mich?' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'ela · elas · a senhora',
      german: 'sie · sie · Sie',
      md: 'Das deutsche „sie/Sie“ hat drei Bedeutungen. Das Portugiesische trennt sauber: `ela` (eine Frau), `elas`/`eles` (mehrere), `a senhora`/`o senhor` (höfliche Anrede).',
    },
    {
      type: 'compare',
      target: 'A gente fala muito.',
      german: 'Man redet viel. / Wir reden viel.',
      md: '`a gente` erinnert grammatisch an das deutsche „man“ (Verb im Singular), bedeutet aber klar „wir“.',
    },
  ],
  mistakes: [
    { wrong: 'Com eu, tudo bem.', right: 'Comigo, tudo bem.', why: '„mit mir“ ist immer `comigo`.' },
    { wrong: 'A gente falamos português.', right: 'A gente fala português.', why: '`a gente` steht mit der 3. Person Singular.' },
    { wrong: 'Pedro e Ana? Elas …', right: 'Pedro e Ana? Eles …', why: 'Gemischte Gruppe → `eles`.' },
    { wrong: 'Isso é para eu?', right: 'Isso é para mim?', why: 'Nach Präpositionen wird `eu` zu `mim` (bzw. `comigo`).' },
  ],
  mnemonic: 'a gente = wir mit ele-Verb · ein Mann dabei = eles · comigo / para mim.',
  levels: [
    {
      level: 1,
      title: 'Pronomen kennen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'matchPairs', skills: ['grammar', 'vocabulary'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'eu', right: 'ich' }, { left: 'ela', right: 'sie (eine Frau)' }, { left: 'a gente', right: 'wir' }, { left: 'vocês', right: 'ihr' }, { left: 'eles', right: 'sie (mehrere)' }],
          feedback: { rule: 'eu = ich, ela = sie (Sg.), a gente = wir, vocês = ihr, eles = sie (Pl.).', why: '`a gente` wird oft mit „die Leute“ verwechselt.', avoid: 'Lerne a gente und nós als Paar.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Du sprichst über **Júlia und Carla**. Welches Pronomen?',
          options: [{ text: 'elas' }, { text: 'eles', why: '`eles` steht für Männer oder gemischte Gruppen.' }, { text: 'vocês', why: '`vocês` sprichst du direkt an.' }],
          answer: 0,
          feedback: { rule: 'Reine Frauengruppe → `elas`.', why: 'Du sprichst **über** zwei Frauen.', avoid: 'Über jemanden: eles/elas. Mit jemandem: vocês.' },
        },
        {
          id: `${T}.L1.03`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 1,
          audio: 'Eles estão em casa.', question: 'Über wen wird gesprochen?', options: ['über uns', 'über mehrere andere Personen', 'über euch'], answer: 1,
          feedback: { rule: '`eles` = sie (mehrere).', why: '„wir“ wäre a gente/nós, „ihr“ wäre vocês.', avoid: 'Hör auf den Anfang: eles/elas → „sie“.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Pronomen im Satz',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: '— E com você, tudo bem? — Sim, ___ tudo bem.', answers: [['comigo']], bank: ['comigo', 'com eu', 'você'], german: '— Und bei dir, alles gut? — Ja, bei mir ist alles gut.',
          feedback: { rule: '„mit mir“ = `comigo`.', why: '`com eu` gibt es nicht; `você` wäre die andere Person.', avoid: 'com + eu → comigo.' },
        },
        {
          id: `${T}.L2.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Pedro, Ana und Carla sind im Hotel. → ___ estão no hotel.',
          options: [{ text: 'Elas', why: 'Pedro ist ein Mann → nicht elas.' }, { text: 'Eles' }, { text: 'A gente', why: '`a gente` = wir.' }],
          answer: 1,
          feedback: { rule: 'Gemischte Gruppe → `eles`.', why: 'Ein Mann genügt für die männliche Form.', avoid: 'Ein Mann dabei → eles.' },
        },
        {
          id: `${T}.L2.03`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toTarget', source: 'Ist das für mich?', answers: ['Isso é para mim?', 'É para mim?', 'Isto é para mim?', 'Isso é pra mim?', 'É pra mim?'],
          feedback: { rule: '„für mich“ = `para mim`.', why: '`para eu` ist falsch – nach Präpositionen steht `mim`.', avoid: 'para + eu → para mim.' },
        },
      ],
    },
    {
      level: 3,
      title: 'a gente & Verbformen',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.estar'], difficulty: 3,
          sentence: 'A gente estamos em casa.', answers: ['A gente está em casa.', 'Nós estamos em casa.', 'A gente tá em casa.'], german: 'Wir sind zu Hause.',
          feedback: { rule: '`a gente` + 3. Person Singular (`está`) – oder `nós` + `estamos`.', why: 'Die Mischung `a gente estamos` ist ein typischer Fehler (auch bei Muttersprachlern, gilt aber als falsch).', avoid: 'a gente = wie ele.' },
        },
        {
          id: `${T}.L3.02`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.ser'], difficulty: 3,
          verb: 'ser', tense: 'Präsens', person: 'a gente', sentence: 'A gente ___ do Brasil.', answers: ['é'],
          feedback: { rule: '`a gente é` – Verbform wie bei ele.', why: '`somos` gehört zu `nós`.', avoid: 'Denke bei a gente an „man“: man ist → a gente é.' },
        },
        {
          id: `${T}.L3.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 3,
          tokens: ['A', 'gente', 'está', 'com', 'eles.'], extra: ['estamos', 'comigo'], german: 'Wir sind mit ihnen zusammen.',
          feedback: { rule: '`a gente está` (3. Sg.) + `com eles`.', why: '`estamos` passt nur zu `nós`; `comigo` heißt „mit mir“.', avoid: 'Erst Subjekt + Verbform prüfen, dann die Präposition.' },
        },
      ],
    },
  ],
  related: ['pt.g.formality', 'pt.g.present-regular'],
};

export default topic;
