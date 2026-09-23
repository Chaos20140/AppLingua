import type { GrammarTopic } from '../../types';

const T = 'pt.g.tem-haver';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'a1',
  order: 15,
  category: 'Satzbau & Fragen',
  title: 'tem = es gibt – und wo etwas ist',
  summary: '„Es gibt“ heißt im brasilianischen Alltag tem (formell: há). Dazu: tem oder está/fica? – und Ortsangaben wie perto de, ao lado de, em frente de.',
  keywords: ['tem', 'há', 'haver', 'es gibt', 'fica', 'está', 'perto de', 'longe de', 'ao lado de', 'em frente de', 'Ort', 'Wohnung'],
  explanation: [
    {
      type: 'text',
      md:
        'Für **„es gibt“** sagen Brasilianer im Alltag einfach **tem** – die Form von `ter`. Sie bleibt **immer im Singular**, egal wie viele Dinge es gibt: `Tem um banheiro.` · `Tem dois quartos.`\nIn Büchern, Nachrichten und formellen Texten steht dafür **há** (von `haver`): `Há dois quartos.` Das solltest du verstehen – im Gespräch klingt `tem` natürlicher.',
    },
    { type: 'colored', parts: [{ text: 'Na', role: 'preposition' }, { text: ' ' }, { text: 'sala', role: 'noun' }, { text: ' ' }, { text: 'tem', role: 'verb' }, { text: ' ' }, { text: 'um', role: 'article' }, { text: ' ' }, { text: 'sofá', role: 'noun' }, { text: '.' }], german: 'Im Wohnzimmer gibt es ein Sofa.' },
    {
      type: 'table',
      title: 'tem oder está / fica?',
      headers: ['Frage', 'Verb', 'Beispiel'],
      rows: [
        ['Gibt es (irgendein) …?', 'tem + um/uma, Zahl oder ohne Artikel', 'Tem uma farmácia aqui perto?'],
        ['Wo ist der/die … (bestimmt)?', 'está – Personen, bewegliche Dinge', 'O gato está no sofá.'],
        ['Wo liegt der/die … (fester Ort)?', 'fica – Gebäude, Räume, Orte', 'O banheiro fica ao lado da cozinha.'],
      ],
    },
    {
      type: 'text',
      md:
        '**Ortsangaben** stehen mit `de` – und `de` verschmilzt mit dem Artikel:\n- `perto de` (in der Nähe von): `perto da praia`\n- `longe de` (weit weg von): `longe do centro`\n- `ao lado de` (neben): `ao lado do sofá`\n- `em frente de` (gegenüber, vor): `em frente do mercado` – man hört auch `em frente ao` und `na frente do`\n„In“ und „auf“ ist meist einfach `em`: `no quarto`, `na mesa`. `perto daqui` = hier in der Nähe (de + aqui).',
    },
    { type: 'mistake', wrong: 'Têm dois quartos.', right: 'Tem dois quartos.', why: 'Das unpersönliche „es gibt“ bleibt immer Singular – ohne Zirkumflex.' },
    { type: 'tip', md: '**Neu im Gespräch (ein, eine, zwei …) → tem. Schon bekannt (der, die, das) → está / fica.**' },
    { type: 'audio', text: 'Tem um mercado perto daqui? – Tem, sim. Fica em frente da farmácia.', label: 'Gibt es hier in der Nähe einen Supermarkt? – Ja, gegenüber der Apotheke.' },
  ],
  examples: [
    {
      target: 'No apartamento tem dois quartos e um banheiro.',
      german: 'In der Wohnung gibt es zwei Schlafzimmer und ein Bad.',
      parts: [{ text: 'No', role: 'preposition' }, { text: ' ' }, { text: 'apartamento', role: 'noun' }, { text: ' ' }, { text: 'tem', role: 'verb' }, { text: ' ' }, { text: 'dois', role: 'other' }, { text: ' ' }, { text: 'quartos', role: 'noun' }, { text: ' e ' }, { text: 'um', role: 'article' }, { text: ' ' }, { text: 'banheiro', role: 'noun' }, { text: '.' }],
    },
    { target: 'Não tem pão em casa.', german: 'Zu Hause gibt es kein Brot.' },
    { target: 'Tem uma padaria perto da minha casa.', german: 'In der Nähe meines Hauses gibt es eine Bäckerei.' },
    {
      target: 'O banheiro fica ao lado do quarto.',
      german: 'Das Bad ist neben dem Schlafzimmer.',
      parts: [{ text: 'O', role: 'article' }, { text: ' ' }, { text: 'banheiro', role: 'subject' }, { text: ' ' }, { text: 'fica', role: 'verb' }, { text: ' ' }, { text: 'ao lado do', role: 'preposition' }, { text: ' ' }, { text: 'quarto', role: 'noun' }, { text: '.' }],
    },
    { target: 'A TV está em frente do sofá.', german: 'Der Fernseher steht gegenüber vom Sofa.' },
    { target: 'Há muitos problemas na cidade.', german: 'Es gibt viele Probleme in der Stadt.', note: 'Formell/schriftlich. Im Gespräch: `Tem muitos problemas na cidade.`' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Tem um sofá na sala.',
      german: 'Im Wohnzimmer steht ein Sofa.',
      md: 'Deutsch unterscheidet „steht“, „liegt“, „hängt“. Portugiesisch sagt einfach `tem` (es gibt) oder `está` (ist).',
    },
    {
      type: 'compare',
      target: 'O gato está no sofá.',
      german: 'Die Katze liegt auf dem Sofa.',
      md: 'Für „auf“ und „in“ reicht meist `em` + Artikel: `no sofá`, `na mesa`, `no quarto`.',
    },
  ],
  mistakes: [
    { wrong: 'Têm dois quartos no apartamento.', right: 'Tem dois quartos no apartamento.', why: '„es gibt“ ist unpersönlich und bleibt Singular: `tem`.' },
    { wrong: 'Tem o banheiro ao lado da cozinha.', right: 'O banheiro fica ao lado da cozinha.', why: 'Ein bestimmtes, bekanntes Ding (o banheiro) → `fica`/`está`, nicht `tem`.' },
    { wrong: 'Está um sofá na sala.', right: 'Tem um sofá na sala.', why: 'Etwas Neues, Unbestimmtes (um sofá) → `tem`.' },
    { wrong: 'A farmácia fica perto de a praia.', right: 'A farmácia fica perto da praia.', why: '`de` + `a` verschmilzt zu `da`.' },
  ],
  mnemonic: '**tem = es gibt – immer Singular, immer ohne Dach.** Bekanntes steht mit está / fica.',
  levels: [
    {
      level: 1,
      title: 'tem = es gibt',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '„Es gibt zwei Schlafzimmer.“',
          options: [{ text: 'Tem dois quartos.' }, { text: 'Têm dois quartos.', why: '`têm` heißt „sie haben“ – „es gibt“ bleibt Singular.' }, { text: 'Estão dois quartos.', why: '`estar` drückt nicht „es gibt“ aus.' }],
          answer: 0,
          feedback: { rule: '„es gibt“ = `tem` – auch bei mehreren Dingen.', why: 'Das unpersönliche tem hat kein Subjekt, deshalb kein Plural.', avoid: 'es gibt → tem, immer gleich.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['reading', 'grammar'], topicIds: [T], difficulty: 1,
          prompt: 'Welche Form liest du eher in Zeitungen und formellen Texten?',
          options: [{ text: 'Tem um problema.', why: 'Typisch für das Gespräch.' }, { text: 'Há um problema.' }, { text: 'É um problema.', why: 'Das heißt „Das ist ein Problem“ – kein „es gibt“.' }],
          answer: 1,
          feedback: { rule: 'formell/schriftlich: `há`; im Gespräch: `tem`.', why: 'Beide bedeuten „es gibt“ – der Unterschied ist das Register.', avoid: 'Sprechen: tem. Lesen: auch há verstehen.' },
        },
        {
          id: `${T}.L1.03`, type: 'matchPairs', skills: ['vocabulary', 'grammar'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'perto de', right: 'in der Nähe von' }, { left: 'longe de', right: 'weit weg von' }, { left: 'ao lado de', right: 'neben' }, { left: 'em frente de', right: 'gegenüber von' }, { left: 'tem', right: 'es gibt' }],
          feedback: { rule: 'Ortsangaben mit `de`: perto de, longe de, ao lado de, em frente de.', why: 'Alle diese Ausdrücke enden auf `de` – das verschmilzt mit dem Artikel.', avoid: 'Ortsangabe + de + Artikel → do/da.' },
        },
        {
          id: `${T}.L1.04`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: [T], difficulty: 1,
          audio: 'Na sala tem um sofá e duas janelas.', question: 'Was gibt es im Wohnzimmer?',
          options: ['ein Sofa und zwei Fenster', 'zwei Sofas und ein Fenster', 'ein Bett und zwei Fenster'], answer: 0,
          feedback: { rule: '`um sofá` = ein Sofa, `duas janelas` = zwei Fenster.', why: '`duas` ist die weibliche Form von 2 – passend zu `janelas`.', avoid: 'Auf Zahl und Nomen achten.' },
        },
      ],
    },
    {
      level: 2,
      title: 'tem, está oder fica?',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Du fragst nach **irgendeiner** Apotheke in der Nähe:',
          options: [{ text: 'Tem uma farmácia perto daqui?' }, { text: 'Está uma farmácia perto daqui?', why: '`estar` steht nicht für „es gibt“.' }, { text: 'Têm uma farmácia perto daqui?', why: '`têm` = „sie haben“.' }],
          answer: 0,
          feedback: { rule: 'Unbestimmtes (uma farmácia) → `tem`.', why: 'Du weißt noch nicht, ob es eine gibt – also fragst du mit „gibt es“.', avoid: 'um/uma → tem.' },
        },
        {
          id: `${T}.L2.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'No apartamento ___ dois quartos. O banheiro ___ ao lado da cozinha.', answers: [['tem', 'há'], ['fica', 'está']],
          german: 'In der Wohnung gibt es zwei Schlafzimmer. Das Bad ist neben der Küche.',
          feedback: { rule: 'Existenz → `tem`; Lage eines bestimmten Raums → `fica` (oder `está`).', why: '`o banheiro` ist bestimmt – hier geht es um den Ort, nicht darum, ob es existiert.', avoid: 'um/dois → tem; o/a → fica/está.' },
        },
        {
          id: `${T}.L2.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.contractions'], difficulty: 2,
          sentence: 'A padaria fica perto ___ praia e ao lado ___ banco.', answers: [['da'], ['do']],
          german: 'Die Bäckerei liegt in der Nähe des Strandes und neben der Bank.',
          feedback: { rule: 'de + a (praia) = `da`; de + o (banco) = `do`.', why: '`a praia` ist weiblich, `o banco` männlich.', avoid: 'Artikel des Nomens denken, dann verschmelzen.' },
        },
        {
          id: `${T}.L2.04`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          tokens: ['Tem', 'um', 'mercado', 'perto', 'daqui?'], extra: ['está', 'é'], german: 'Gibt es hier in der Nähe einen Supermarkt?',
          feedback: { rule: '`Tem` + unbestimmtes Nomen + Ort: `Tem um mercado perto daqui?`', why: '`está` und `é` können „es gibt“ nicht ausdrücken.', avoid: 'Gibt es …? → Tem …?' },
        },
        {
          id: `${T}.L2.05`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Tem o sofá na sala.', answers: ['O sofá está na sala.', 'O sofá fica na sala.'], german: 'Das Sofa steht im Wohnzimmer.',
          feedback: { rule: 'Bestimmtes Ding (o sofá) + Ort → `está`/`fica`.', why: '`tem` passt nur zu etwas Unbestimmtem: `Tem um sofá na sala.`', avoid: 'der/die/das → está oder fica.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Die Wohnung beschreiben',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          direction: 'toTarget', source: 'In meiner Wohnung gibt es keinen Balkon.',
          answers: [
            'No meu apartamento não tem varanda.', 'No meu apartamento não há varanda.',
            'Não tem varanda no meu apartamento.', 'Não há varanda no meu apartamento.',
            'Meu apartamento não tem varanda.', 'O meu apartamento não tem varanda.',
          ],
          feedback: { rule: 'Verneint: `não tem` + Nomen ohne Artikel: `não tem varanda`.', why: '„keinen“ wird mit `não` ausgedrückt, der Artikel fällt weg.', avoid: 'kein … → não tem …' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['reading', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toGerman', source: 'Tem uma farmácia em frente do mercado.',
          answers: [
            'Es gibt eine Apotheke gegenüber vom Supermarkt.', 'Gegenüber vom Supermarkt gibt es eine Apotheke.',
            'Es gibt eine Apotheke gegenüber dem Supermarkt.', 'Gegenüber dem Supermarkt gibt es eine Apotheke.',
            'Es gibt eine Apotheke vor dem Supermarkt.', 'Vor dem Supermarkt gibt es eine Apotheke.',
          ],
          feedback: { rule: '`tem` = es gibt; `em frente do` = gegenüber vom / vor dem.', why: '`mercado` ist im brasilianischen Alltag meist der Supermarkt.', avoid: 'tem am Satzanfang → „es gibt“.' },
        },
        {
          id: `${T}.L3.03`, type: 'dictation', skills: ['listening', 'writing'], topicIds: [T], difficulty: 2,
          audio: 'Tem dois quartos e uma cozinha grande.', answers: ['Tem dois quartos e uma cozinha grande.'], german: 'Es gibt zwei Schlafzimmer und eine große Küche.',
          feedback: { rule: '`Tem` (ohne Dach) + `dois quartos` + `uma cozinha grande`.', why: 'Das unpersönliche tem bleibt Singular, auch vor „zwei Zimmern“.', avoid: 'es gibt → tem, nie têm.' },
        },
        {
          id: `${T}.L3.04`, type: 'situation', skills: ['speaking', 'grammar'], topicIds: [T], difficulty: 2,
          scenario: 'Du bist neu in der Stadt und suchst **irgendeine** Bäckerei. Du fragst jemanden auf der Straße.',
          options: [{ text: 'Com licença, tem uma padaria aqui perto?' }, { text: 'Com licença, está uma padaria aqui perto?', why: '`estar` mit unbestimmtem Artikel klingt falsch.' }, { text: 'Com licença, têm padarias?', why: '`têm` bedeutet „sie haben“.' }],
          answer: 0,
          feedback: { rule: 'Nach etwas Unbestimmtem fragen: `Tem um/uma …?`', why: 'Du weißt nicht, ob und wo es eine gibt – also „gibt es …?“.', avoid: 'Gibt es …? → Tem …?' },
        },
        {
          id: `${T}.L3.05`, type: 'freeText', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 3,
          prompt: 'Beschreibe deine Wohnung in 2–3 Sätzen: Was gibt es, und wo liegt etwas?',
          requirements: [
            { pattern: '\\b(tem|ha)\\b', hint: 'Verwende `tem` (es gibt).' },
            { pattern: '\\b(quartos?|salas?|cozinhas?|banheiros?|varandas?)\\b', hint: 'Nenne mindestens ein Zimmer.' },
            { pattern: '\\bfica\\b|perto d|longe d|ao lado d|em frente d|na frente d', hint: 'Sag, wo etwas liegt (fica, perto de, ao lado de …).' },
          ],
          samples: ['No meu apartamento tem dois quartos, uma sala e uma cozinha pequena. O banheiro fica ao lado da sala. O apartamento fica perto da praia.'],
          minWords: 10,
          feedback: { rule: 'Existenz mit `tem`, Lage mit `fica` + Ortsangabe (perto de, ao lado de …).', why: 'Eine gute Beschreibung sagt, was es gibt und wo es ist.', avoid: 'Erst „es gibt“, dann „wo“.' },
        },
      ],
    },
  ],
  related: ['pt.g.ter', 'pt.g.estar', 'pt.g.contractions'],
};

export default topic;
