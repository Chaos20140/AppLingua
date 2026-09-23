import type { GrammarTopic } from '../../types';

const T = 'pt.g.sounds';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 1,
  category: 'Aussprache & Schrift',
  title: 'Aussprache-Grundlagen',
  summary: 'Nasalvokale, -ão, lh/nh, zwei R-Laute, t/d vor i, L als u und abgeschwächte Endvokale – die Regeln hinter dem brasilianischen Klang.',
  keywords: ['Aussprache', 'Nasalvokal', 'ão', 'lh', 'nh', 'R', 'tsch', 'dsch', 'L', 'Tilde', 'Akzent', 'ç', 'Laute'],
  explanation: [
    {
      type: 'text',
      md:
        'Portugiesisch wird regelmäßiger ausgesprochen, als es zunächst scheint. Wer die folgenden Regeln kennt, kann fast jedes Wort korrekt vorlesen. Brasilianisches Portugiesisch klingt dabei offener und melodischer als das europäische: Vokale werden deutlich gesprochen, unbetonte Endungen aber abgeschwächt (-o → u, -e → i).',
    },
    {
      type: 'table',
      title: 'Schreibung und Klang',
      headers: ['Schreibung', 'Klang', 'Beispiel'],
      rows: [
        ['ã, õ; Vokal + m/n am Silbenende', 'nasal (Mund + Nase)', 'lã, bom, sim, cinco'],
        ['ão, -am (Wortende)', 'nasales „au“', 'não, falam'],
        ['lh / nh', '„lj“ / „nj“ (ein Laut)', 'filho / vinho'],
        ['r- am Wortanfang, rr', 'wie deutsches h', 'Rio, carro'],
        ['r zwischen Vokalen, nach Konsonant in derselben Silbe (br, tr …)', 'kurzer Zungenschlag', 'caro, obrigado'],
        ['t, d + i-Laut', '„tsch“, „dsch“', 'tia, dia, noite'],
        ['l am Silbenende', '„u“', 'Brasil, alto'],
        ['s am Wortanfang, ss, ç, c + e/i', 'stimmloses „ß“', 'sim, nosso, coração, cinco'],
        ['s zwischen Vokalen, z', 'summendes s (Rose)', 'casa, doze'],
        ['ch, x (meist)', '„sch“', 'chá, xícara'],
        ['j, g + e/i', 'wie „j“ in „Journal“', 'já, gente'],
        ['h am Wortanfang', 'stumm', 'hotel, hoje'],
      ],
    },
    {
      type: 'text',
      md:
        '**Die Zeichen über den Buchstaben** helfen dir beim Lesen:\n' +
        '- ´ (acento agudo): betonte Silbe, Vokal **offen** – `café`, `avó`\n' +
        '- ^ (circunflexo): betonte Silbe, Vokal **geschlossen** – `você`, `avô`\n' +
        '- ~ (til): Vokal **nasal** – `não`, `manhã`\n' +
        '- ç (cedilha): c klingt wie stimmloses s – `coração`\n' +
        'Ohne Akzent gilt: Wörter auf -a, -e, -o (auch mit -s, -am, -em) werden auf der **vorletzten** Silbe betont, fast alle anderen auf der **letzten**: `CA-sa`, aber `fa-LAR`, `Bra-SIL`.',
    },
    {
      type: 'variant',
      variant: 'pt-BR',
      md: 'Regionale Unterschiede innerhalb Brasiliens: In Rio klingt s am Silbenende wie „sch“ (`mesmo` ≈ „MESCH-mu“), im Nordosten bleiben t/d vor i oft hart, und das R am Silbenende reicht vom gehauchten h bis zum amerikanisch gebogenen R. Alle Varianten sind korrekt – die Regeln oben sind überall verständlich.',
    },
    { type: 'tip', md: 'Die fünf Goldregeln: **Tilde = Nase · rr = h · t/d vor i = tsch/dsch · L am Ende = u · -o/-e am Ende = u/i.**' },
  ],
  examples: [
    { target: 'Não, obrigado.', german: 'Nein, danke.', note: '„nãu, o-bri-GA-du“' },
    { target: 'Bom dia, tia!', german: 'Guten Morgen, Tante!', note: '„bõ DSCHI-a, TSCHI-a“' },
    { target: 'O carro é caro.', german: 'Das Auto ist teuer.', note: '„KA-hu“ vs. „KA-ru“' },
    { target: 'A avó e o avô.', german: 'Die Oma und der Opa.', note: 'offenes ó vs. geschlossenes ô; `e` (und) klingt wie „i“' },
    { target: 'Futebol no Brasil.', german: 'Fußball in Brasilien.', note: '„fu-tschi-BÓU nu bra-SIU“' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'sapato · casa',
      german: '„ßa-PA-tu“ · „KA-sa“',
      md: 'Genau umgekehrt wie im Deutschen: Am Wortanfang summt das deutsche s („Sonne“), das portugiesische nicht. Zwischen Vokalen summen beide („Rose“ – `casa`).',
    },
    {
      type: 'text',
      md: 'Viele Laute kennst du schon: „sch“ (`chá`), „h“ (`Rio`), „lj“ in „Familie“ (`filho`), „nj“ in „Champagner“ (`vinho`), „dsch“ in „Dschungel“ (`dia`). Wirklich neu sind vor allem die **Nasalvokale** – und die Gewohnheit, Endvokale abzuschwächen.',
    },
  ],
  mistakes: [
    { wrong: 'Rio mit deutschem Reibe-R („Rrio“)', right: '„HI-u“', why: 'R am Wortanfang klingt in Brasilien wie ein kräftiges h.' },
    { wrong: 'bom = „bomm“', right: '„bõ“', why: 'm/n am Silbenende machen nur den Vokal nasal – sie werden nicht als eigener Laut gesprochen.' },
    { wrong: 'leite = „LEI-te“', right: '„LEI-tschi“', why: 'Unbetontes -e am Ende klingt wie i – und vor i wird t zu „tsch“.' },
    { wrong: 'sapato mit summendem s', right: '„ßa-PA-tu“', why: 's am Wortanfang ist im Portugiesischen immer stimmlos.' },
  ],
  mnemonic: 'Tilde = Nase · rr = h · t/d vor i = tsch/dsch · L am Ende = u · -o/-e am Ende = u/i.',
  levels: [
    {
      level: 1,
      title: 'Laute erkennen',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['pronunciation', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Wie klingt das `rr` in `carro`?',
          options: [{ text: 'wie ein deutsches h' }, { text: 'gerollt wie im Italienischen', why: 'Das gerollte R ist in Brasilien unüblich.' }, { text: 'wie ein deutsches Reibe-R', why: 'Das würde man als fremden Akzent hören.' }],
          answer: 0,
          feedback: { rule: '`rr` und `r` am Wortanfang klingen in Brasilien wie ein kräftiges h: `carro` ≈ „KA-hu“.', why: 'Gerollte oder deutsche R-Laute sind hier nicht üblich.', avoid: 'Merksatz: Doppel-R = h.' },
        },
        {
          id: `${T}.L1.02`, type: 'matchPairs', skills: ['pronunciation', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'lh', right: '„lj“' }, { left: 'nh', right: '„nj“' }, { left: 'ch', right: '„sch“' }, { left: 'ç', right: 'stimmloses s' }],
          feedback: { rule: 'lh = „lj“, nh = „nj“, ch = „sch“, ç = stimmloses s.', why: 'Das h in lh, nh und ch wird nie als eigener Laut gesprochen.', avoid: 'Lies Buchstabenpaare immer als Einheit.' },
        },
        {
          id: `${T}.L1.03`, type: 'minimalPair', skills: ['listening', 'pronunciation'], topicIds: [T], difficulty: 1,
          options: ['pau', 'pão'], answer: 1,
          hint: '`pão` (Brot) ist nasal – die Luft geht durch die Nase. `pau` (Stock) nicht.',
          feedback: { rule: 'Die Tilde macht den Vokal nasal: `pão` ≈ „pãu“.', why: 'Ohne Nasalierung entsteht ein anderes Wort: `pau` = Stock.', avoid: 'Halte beim Üben die Nase kurz zu – ein nasaler Laut klingt dann dumpf.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Regeln anwenden',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'mc', skills: ['pronunciation', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'In welchem Wort wird ein `d` zu „dsch“?',
          options: [{ text: 'dado', why: 'Beide d stehen vor a bzw. o – kein „dsch“.' }, { text: 'cidade' }, { text: 'tudo', why: 'd vor o bleibt ein normales d.' }],
          answer: 1,
          feedback: { rule: 'd vor einem i-Laut (auch vor unbetontem -e am Wortende) → „dsch“: `cidade` ≈ „ßi-DA-dschi“.', why: 'In `dado` und `tudo` folgt kein i-Laut.', avoid: 'Schau immer auf den Laut **nach** t/d.' },
        },
        {
          id: `${T}.L2.02`, type: 'listening', skills: ['listening', 'pronunciation'], topicIds: [T], difficulty: 2,
          audio: 'futebol', question: 'Wie klingt das Wortende von `futebol`?',
          options: ['„-bol“ mit deutschem L', '„-bóu“', '„-bo“ ganz ohne L'], answer: 1,
          feedback: { rule: 'L am Silbenende klingt wie u: `futebol` ≈ „fu-tschi-BÓU“.', why: 'Das L fällt nicht weg, es wird zu einem u-Laut.', avoid: 'Beim End-L die Zungenspitze unten lassen und die Lippen runden.' },
        },
        {
          id: `${T}.L2.03`, type: 'mc', skills: ['pronunciation', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'In welchem Wort summt das s (wie in „Rose“)?',
          options: [{ text: 'sapato', why: 's am Wortanfang ist stimmlos.' }, { text: 'casa' }, { text: 'nosso', why: 'ss ist immer stimmlos.' }],
          answer: 1,
          feedback: { rule: 'Ein einzelnes s zwischen Vokalen ist stimmhaft: `casa` ≈ „KA-sa“ (wie „Rose“).', why: 's am Wortanfang und ss sind stimmlos.', avoid: 'Einzel-s zwischen Vokalen = summen; sonst scharf.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Feinheiten',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'minimalPair', skills: ['listening', 'pronunciation'], topicIds: [T], difficulty: 3,
          options: ['casa', 'caça'], answer: 0,
          hint: '`casa` (Haus) hat ein summendes s, `caça` (Jagd) ein scharfes ç.',
          feedback: { rule: 's zwischen Vokalen = stimmhaft, ç = stimmlos.', why: 'Nur die Stimmhaftigkeit unterscheidet „Haus“ und „Jagd“.', avoid: 'Hand an den Hals: Bei `casa` vibriert es, bei `caça` nicht.' },
        },
        {
          id: `${T}.L3.02`, type: 'mc', skills: ['pronunciation', 'reading'], topicIds: [T], difficulty: 3,
          prompt: 'Welche Silbe ist in `médico` betont?',
          options: [{ text: 'mé' }, { text: 'di', why: 'Der Akzent auf é zeigt die Betonung an.' }, { text: 'co', why: 'Endsilben auf -o sind ohne Akzent nie betont.' }],
          answer: 0,
          feedback: { rule: 'Ein geschriebener Akzent markiert immer die betonte Silbe: `MÉ-di-co` ≈ „MÄ-dschi-ku“.', why: 'Ohne Akzent läge die Betonung auf der vorletzten Silbe – deshalb braucht `médico` einen.', avoid: 'Siehst du einen Akzent, betone genau dort.' },
        },
        {
          id: `${T}.L3.03`, type: 'dictation', skills: ['listening', 'writing'], topicIds: [T], difficulty: 3,
          audio: 'Não tem problema.', answers: ['Não tem problema.'], german: 'Kein Problem.',
          feedback: { rule: '`não` mit Tilde, `tem` mit m (klingt „tẽi“), `problema` mit einfachem r nach b.', why: 'Häufige Fehler: „nao“, „teim“, „probrema“.', avoid: 'Nasales „ẽi“ am Wortende wird meist -em geschrieben.' },
        },
      ],
    },
  ],
  related: ['pt.g.formality', 'pt.g.numbers'],
};

export default topic;
