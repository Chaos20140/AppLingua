import type { GrammarTopic } from '../../types';

const T = 'pt.g.adjectives';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'a1',
  order: 16,
  category: 'Adjektive',
  title: 'Adjektive: Angleichung & Stellung',
  summary: 'Adjektive passen sich in Genus und Zahl an – auch nach ser (ela é alta). Sie stehen meist hinter dem Nomen. Dazu: muito, pouco und um pouco.',
  keywords: ['Adjektiv', 'Angleichung', 'Stellung', 'alto', 'alta', 'legal', 'legais', 'feliz', 'muito', 'pouco', 'um pouco', 'beschreiben'],
  explanation: [
    {
      type: 'table',
      title: 'So passen sich Adjektive an',
      headers: ['Endung', 'männlich', 'weiblich', 'Plural'],
      rows: [
        ['-o / -a', 'alto', 'alta', 'altos / altas'],
        ['-e', 'inteligente', 'inteligente', 'inteligentes'],
        ['-l', 'legal', 'legal', 'legais'],
        ['-z', 'feliz', 'feliz', 'felizes'],
        ['-m', 'jovem', 'jovem', 'jovens'],
        ['-or', 'trabalhador', 'trabalhadora', 'trabalhadores / trabalhadoras'],
      ],
    },
    {
      type: 'text',
      md:
        '**Anpassen – immer!** Anders als im Deutschen passt sich das Adjektiv auch nach `ser` und `estar` an: `O Paulo é alto.` – `A Júlia é alta.` – `Eles são altos.` Bei gemischten Gruppen gewinnt die männliche Form: `O Paulo e a Júlia são altos.`',
    },
    { type: 'colored', parts: [{ text: 'Ela', role: 'subject' }, { text: ' ' }, { text: 'é', role: 'verb' }, { text: ' ' }, { text: 'alta', role: 'adjective' }, { text: ' e ' }, { text: 'muito', role: 'adverb' }, { text: ' ' }, { text: 'simpática', role: 'adjective' }, { text: '.' }], german: 'Sie ist groß und sehr sympathisch.' },
    {
      type: 'text',
      md:
        '**Stellung:** Das Adjektiv steht in der Regel **hinter** dem Nomen: `uma casa grande`, `um homem alto`, `olhos azuis`. Farben und Nationalitäten stehen immer dahinter. Wenige kurze Adjektive wie `bom`/`boa` stehen oft davor: `um bom amigo`. Achtung: `um grande amigo` = ein großartiger Freund, `um amigo grande` = ein großer, kräftiger Freund.',
    },
    {
      type: 'text',
      md:
        '**muito** vor einem Adjektiv heißt „sehr“ und bleibt **unverändert**: `Ela é muito alta.` · `Eles são muito legais.` Vor einem Nomen heißt es „viel/viele“ und passt sich an: `muitos amigos`, `muitas irmãs`.\n**um pouco** + Adjektiv = ein bisschen: `Ele é um pouco tímido.` **pouco** allein = wenig: `Ela fala pouco.` · `Tenho pouco tempo.`',
    },
    { type: 'mistake', wrong: 'Ela é muita alta.', right: 'Ela é muito alta.', why: '`muito` vor einem Adjektiv bedeutet „sehr“ und ist unveränderlich.' },
    { type: 'tip', md: '**Das Adjektiv schaut auf sein Nomen: gleiches Geschlecht, gleiche Zahl – und es stellt sich meist dahinter.**' },
    { type: 'audio', text: 'Meu irmão é alto e engraçado, e minha irmã é baixa e um pouco tímida.', label: 'Mein Bruder ist groß und lustig, meine Schwester klein und ein bisschen schüchtern.' },
  ],
  examples: [
    {
      target: 'Minha irmã é alta e muito inteligente.',
      german: 'Meine Schwester ist groß und sehr klug.',
      parts: [{ text: 'Minha', role: 'pronoun' }, { text: ' ' }, { text: 'irmã', role: 'subject' }, { text: ' ' }, { text: 'é', role: 'verb' }, { text: ' ' }, { text: 'alta', role: 'adjective' }, { text: ' e ' }, { text: 'muito', role: 'adverb' }, { text: ' ' }, { text: 'inteligente', role: 'adjective' }, { text: '.' }],
    },
    {
      target: 'Ele tem olhos azuis e cabelo castanho.',
      german: 'Er hat blaue Augen und braune Haare.',
      parts: [{ text: 'Ele', role: 'subject' }, { text: ' ' }, { text: 'tem', role: 'verb' }, { text: ' ' }, { text: 'olhos', role: 'noun' }, { text: ' ' }, { text: 'azuis', role: 'adjective' }, { text: ' e ' }, { text: 'cabelo', role: 'noun' }, { text: ' ' }, { text: 'castanho', role: 'adjective' }, { text: '.' }],
      note: '`cabelo` steht meist im Singular – anders als „die Haare“.',
    },
    { target: 'Os meus primos são muito legais.', german: 'Meine Cousins sind sehr nett.' },
    { target: 'Temos um apartamento pequeno, mas bonito.', german: 'Wir haben eine kleine, aber schöne Wohnung.' },
    { target: 'A Carla é um pouco tímida, mas é muito engraçada.', german: 'Carla ist ein bisschen schüchtern, aber sehr lustig.' },
    { target: 'Ele é um grande amigo.', german: 'Er ist ein großartiger Freund.', note: 'Vor dem Nomen bedeutet `grande` „großartig“.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Ele é alto. · Ela é alta.',
      german: 'Er ist groß. · Sie ist groß.',
      md: 'Im Deutschen bleibt das Adjektiv nach „sein“ unverändert. Im Portugiesischen passt es sich **immer** an.',
    },
    {
      type: 'compare',
      target: 'uma casa grande',
      german: 'ein großes Haus',
      md: 'Deutsch: Adjektiv vor dem Nomen. Portugiesisch: meist dahinter.',
    },
    {
      type: 'compare',
      target: 'O meu pai é alto.',
      german: 'Mein Vater ist groß.',
      md: 'Wortfalle: Für die **Körpergröße** sagt man `alto` (wörtlich „hoch“). `grande` heißt bei Menschen eher „kräftig, groß gebaut“ oder „erwachsen“.',
    },
  ],
  mistakes: [
    { wrong: 'A minha mãe é alto.', right: 'A minha mãe é alta.', why: 'Das Adjektiv passt sich dem Subjekt an: mãe → weiblich → `alta`.' },
    { wrong: 'Ela é muita simpática.', right: 'Ela é muito simpática.', why: '„sehr“ = `muito`, unveränderlich.' },
    { wrong: 'um azul carro', right: 'um carro azul', why: 'Farben stehen hinter dem Nomen.' },
    { wrong: 'Eles são legals.', right: 'Eles são legais.', why: 'Adjektive auf -l bilden den Plural auf -is: `legal` → `legais`.' },
    { wrong: 'Meu pai é muito grande.', right: 'Meu pai é muito alto.', why: 'Körpergröße = `alto`; `grande` klingt nach „kräftig, groß gebaut“.' },
  ],
  mnemonic: '**Adjektiv = Schatten des Nomens:** gleiches Geschlecht, gleiche Zahl, meistens dahinter. Nur `muito` (sehr) bleibt, wie es ist.',
  levels: [
    {
      level: 1,
      title: 'Angleichung',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'A Júlia é ___.',
          options: [{ text: 'alto', why: '`Júlia` ist eine Frau → weibliche Form.' }, { text: 'alta' }, { text: 'altas', why: 'Es ist nur eine Person.' }],
          answer: 1,
          feedback: { rule: 'weiblich Singular → `alta`.', why: 'Auch nach `é` passt sich das Adjektiv an.', avoid: 'Frau → -a.' },
        },
        {
          id: `${T}.L1.02`, type: 'matchPairs', skills: ['vocabulary', 'grammar'], topicIds: [T], difficulty: 1,
          instruction: 'Ordne die Gegensätze zu.',
          pairs: [{ left: 'alto', right: 'baixo' }, { left: 'jovem', right: 'velho' }, { left: 'grande', right: 'pequeno' }, { left: 'muito', right: 'pouco' }],
          feedback: { rule: 'alto ↔ baixo (Körpergröße), jovem ↔ velho, grande ↔ pequeno, muito ↔ pouco.', why: 'Gegensatzpaare prägen sich zusammen besser ein.', avoid: 'Lerne Adjektive immer mit ihrem Gegenteil.' },
        },
        {
          id: `${T}.L1.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 1,
          sentence: 'O Pedro é alto, e a Ana também é ___.', answers: [['alta']], german: 'Pedro ist groß, und Ana ist auch groß.',
          feedback: { rule: 'Ana → weiblich → `alta`.', why: 'Das Adjektiv richtet sich nach der Person, die beschrieben wird.', avoid: 'Für jede Person neu anpassen.' },
        },
        {
          id: `${T}.L1.04`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.plural'], difficulty: 1,
          prompt: 'Eles são muito ___. (legal)',
          options: [{ text: 'legals', why: 'Wörter auf -l bilden den Plural nicht mit -s.' }, { text: 'legais' }, { text: 'legales', why: 'Die Endung -es gibt es bei -l nicht.' }],
          answer: 1,
          feedback: { rule: '-al → -ais: `legal` → `legais`.', why: 'Das -l wird im Plural zu -is.', avoid: 'legal – legais, azul – azuis.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Plural & Stellung',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.plural'], difficulty: 2,
          instruction: 'Setze „feliz“ und „inteligente“ in der richtigen Form ein.',
          sentence: 'As minhas amigas são ___ e ___.', answers: [['felizes'], ['inteligentes']], german: 'Meine Freundinnen sind glücklich und klug.',
          feedback: { rule: '-z → + es (`felizes`), -e → + s (`inteligentes`).', why: 'Beide Adjektive haben nur eine Form für m/f – aber im Plural brauchen sie eine Endung.', avoid: 'Plural-Subjekt → Plural-Adjektiv.' },
        },
        {
          id: `${T}.L2.02`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.ter'], difficulty: 2,
          tokens: ['Ela', 'tem', 'olhos', 'azuis', 'e', 'cabelo', 'castanho.'], extra: ['azul'],
          alternatives: [['Ela', 'tem', 'cabelo', 'castanho', 'e', 'olhos', 'azuis.']],
          german: 'Sie hat blaue Augen und braune Haare.',
          feedback: { rule: 'Adjektiv hinter dem Nomen und angeglichen: `olhos azuis`, `cabelo castanho`.', why: '`azul` ist Singular – `olhos` braucht `azuis`.', avoid: 'Nomen zuerst, dann die Farbe.' },
        },
        {
          id: `${T}.L2.03`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Wie sagt man „ein blaues Auto“?',
          options: [{ text: 'um carro azul' }, { text: 'um azul carro', why: 'Farben stehen immer hinter dem Nomen.' }, { text: 'um carro azuis', why: '`azuis` ist Plural.' }],
          answer: 0,
          feedback: { rule: 'Farbadjektive stehen hinter dem Nomen: `um carro azul`.', why: 'Die deutsche Reihenfolge lässt sich nicht übertragen.', avoid: 'Erst das Ding, dann die Farbe.' },
        },
        {
          id: `${T}.L2.04`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Ela é muita bonita.', answers: ['Ela é muito bonita.'], german: 'Sie ist sehr hübsch.',
          feedback: { rule: '„sehr“ = `muito` – unveränderlich.', why: '`muita` gibt es nur vor weiblichen Nomen (muita gente), nicht vor Adjektiven.', avoid: 'muito + Adjektiv: nie anpassen.' },
        },
        {
          id: `${T}.L2.05`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.possessives'], difficulty: 2,
          direction: 'toTarget', source: 'Meine Brüder sind groß (Körpergröße).',
          answers: ['Meus irmãos são altos.', 'Os meus irmãos são altos.'],
          feedback: { rule: 'Körpergröße = `alto`; männlich Plural → `altos`.', why: '`grandes` würde eher „kräftig“ oder „erwachsen“ bedeuten.', avoid: 'Menschen: alto/baixo.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Menschen beschreiben',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.possessives'], difficulty: 3,
          direction: 'toTarget', source: 'Meine Mutter ist klein und sehr lustig.',
          answers: [
            'Minha mãe é baixa e muito engraçada.', 'A minha mãe é baixa e muito engraçada.',
            'Minha mãe é baixinha e muito engraçada.', 'A minha mãe é baixinha e muito engraçada.',
            'Minha mãe é pequena e muito engraçada.', 'A minha mãe é pequena e muito engraçada.',
            'Minha mãe é baixa e muito divertida.', 'A minha mãe é baixa e muito divertida.',
          ],
          feedback: { rule: '`mãe` → weibliche Formen: `baixa`, `engraçada`; `muito` bleibt unverändert.', why: 'Häufige Fehler sind `baixo` / `engraçado` oder `muita`.', avoid: 'Erst das Subjekt, dann alle Adjektive angleichen.' },
        },
        {
          id: `${T}.L3.02`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'Os meus pais são muito simpático.', answers: ['Os meus pais são muito simpáticos.', 'Meus pais são muito simpáticos.'], german: 'Meine Eltern sind sehr sympathisch.',
          feedback: { rule: 'Plural-Subjekt → Plural-Adjektiv: `simpáticos`.', why: '`muito` bleibt, aber das Adjektiv braucht das -s.', avoid: 'Plural bis zum Satzende durchziehen.' },
        },
        {
          id: `${T}.L3.03`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: [T], difficulty: 3,
          audio: 'A Bia é alta, tem cabelo castanho e olhos azuis. Ela é um pouco tímida.', question: 'Welche Beschreibung passt zu Bia?',
          options: ['groß, braune Haare, blaue Augen, etwas schüchtern', 'klein, braune Haare, blaue Augen, sehr lustig', 'groß, blonde Haare, braune Augen, etwas schüchtern'], answer: 0,
          feedback: { rule: '`alta` = groß, `cabelo castanho` = braune Haare, `olhos azuis` = blaue Augen, `um pouco tímida` = etwas schüchtern.', why: 'Die anderen Beschreibungen vertauschen Größe, Farben oder Charakter.', avoid: 'Beim Hören auf jedes Adjektiv achten.' },
        },
        {
          id: `${T}.L3.04`, type: 'speakFree', skills: ['speaking', 'grammar'], topicIds: [T], difficulty: 3,
          prompt: 'Beschreibe mündlich eine Person aus deiner Familie: Aussehen und Charakter (2–3 Sätze).',
          keywords: ['alto', 'alta', 'baixo', 'baixa', 'muito', 'tem', 'cabelo', 'olhos', 'legal', 'simpático', 'simpática', 'engraçado', 'engraçada'],
          minMatch: 3,
          sample: 'Minha irmã é alta e tem cabelo castanho. Ela é muito legal e um pouco tímida.',
          feedback: { rule: 'Aussehen (alto/a, cabelo, olhos) + Charakter (legal, engraçado/a) – angeglichen an die Person.', why: 'Fehlende Schlüsselwörter bedeuten, dass ein Teil der Beschreibung fehlt oder nicht erkannt wurde.', avoid: 'Kurze Sätze: Ele/Ela é … Tem …' },
        },
      ],
    },
  ],
  related: ['pt.g.articles-gender', 'pt.g.plural', 'pt.g.ser-estar'],
};

export default topic;
