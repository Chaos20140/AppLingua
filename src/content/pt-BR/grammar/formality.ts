import type { GrammarTopic } from '../../types';

const T = 'pt.g.formality';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 2,
  category: 'Kommunikation',
  title: 'Anrede: você, o senhor, a senhora',
  summary: 'Wen du wie ansprichst: você als Standard, o senhor / a senhora für Respekt – und warum alle Anredeformen mit der 3. Person Singular stehen.',
  keywords: ['Anrede', 'du', 'Sie', 'você', 'vocês', 'senhor', 'senhora', 'dona', 'tu', 'höflich', 'formell', 'informell'],
  explanation: [
    {
      type: 'text',
      md:
        '`você` ist in Brasilien die normale Anrede – unter Freunden, im Büro, im Laden, oft auch mit Fremden. Respekt und Distanz drückst du mit `o senhor` (zu einem Mann) und `a senhora` (zu einer Frau) aus: gegenüber älteren Menschen, Kundinnen und Kunden im gehobenen Service oder in sehr formellen Situationen.\n' +
        'Für **mehrere Personen** sagst du `vocês` – locker **und** höflich. Sehr förmlich: `os senhores` / `as senhoras`.',
    },
    {
      type: 'table',
      title: 'Anrede im Überblick',
      headers: ['Situation', 'Anrede', 'Beispiel'],
      rows: [
        ['Freunde, Kollegen, Gleichaltrige', 'você', 'Você está bem?'],
        ['ältere Person, Respektsperson', 'o senhor / a senhora', 'O senhor está bem?'],
        ['mehrere Personen', 'vocês', 'Vocês estão bem?'],
        ['mehrere, sehr förmlich', 'os senhores / as senhoras', 'As senhoras estão bem?'],
      ],
    },
    {
      type: 'text',
      md:
        '**Grammatik:** `você`, `o senhor` und `a senhora` stehen alle mit der Verbform der **3. Person Singular** (wie `ele`/`ela`): `você é`, `o senhor é`. Im Plural entsprechend `vocês são`, `os senhores são`.\n' +
        '**Mit Vornamen:** Zu älteren Frauen sagt man respektvoll `dona` + Vorname (`dona Maria`), zu Männern umgangssprachlich `seu` + Vorname (`seu João`).',
    },
    {
      type: 'variant',
      variant: 'pt-BR',
      md: 'Im Süden (z. B. Porto Alegre) und in Teilen des Nordostens hörst du `tu` – im Alltag oft mit der Verbform von você (`tu vai`). Das musst du verstehen, aber nicht selbst verwenden: Mit `você` bist du überall in Brasilien richtig.',
    },
    { type: 'tip', md: 'Im Zweifel: `você` – außer bei deutlich älteren Menschen. Dort ist `o senhor` / `a senhora` ein Zeichen von Respekt, das sehr geschätzt wird.' },
  ],
  examples: [
    { target: 'Bom dia! Tudo bem com o senhor?', german: 'Guten Morgen! Geht es Ihnen gut?', note: 'zu einem älteren Mann' },
    {
      target: 'A senhora é brasileira?',
      german: 'Sind Sie Brasilianerin?',
      parts: [{ text: 'A senhora', role: 'subject' }, { text: ' ' }, { text: 'é', role: 'verb' }, { text: ' ' }, { text: 'brasileira', role: 'adjective' }, { text: '?' }],
    },
    { target: 'Você está cansado?', german: 'Bist du müde?' },
    { target: 'Vocês são de onde?', german: 'Woher kommt ihr? / Woher kommen Sie?' },
    { target: 'Boa tarde, dona Maria!', german: 'Guten Tag, Frau Maria!', note: 'respektvoll und herzlich zugleich' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Você é alemão? · O senhor é alemão?',
      german: 'Bist du Deutscher? · Sind Sie Deutscher?',
      md: 'Im Deutschen hat „Sie“ die Verbform der 3. Person **Plural** („Sie sind“). Im Portugiesischen stehen `você` und `o senhor` mit der 3. Person **Singular** (`é`) – nur das Anredewort ändert sich.',
    },
    {
      type: 'text',
      md: 'Das brasilianische `você` ist viel verbreiteter als das deutsche „du“. Wer einen Gleichaltrigen mit `o senhor` anspricht, wirkt schnell steif – oder sogar ironisch.',
    },
  ],
  mistakes: [
    { wrong: 'O senhor estão cansado?', right: 'O senhor está cansado?', why: 'Das deutsche „Sie sind“ verleitet zum Plural. `o senhor` ist aber eine Person → 3. Person Singular.' },
    { wrong: 'Tudo bem com a senhor?', right: 'Tudo bem com o senhor?', why: 'Artikel und Anredewort passen sich dem Geschlecht an: o senhor (Mann), a senhora (Frau).' },
    { wrong: 'Oi, dona Maria! E aí, beleza?', right: 'Bom dia, dona Maria! Tudo bem com a senhora?', why: '`E aí, beleza?` ist Slang unter Freunden – gegenüber einer älteren Dame unpassend.' },
  ],
  mnemonic: 'você und o senhor / a senhora: verschiedene Wörter, **gleiche Verbform** – die von ele/ela.',
  levels: [
    {
      level: 1,
      title: 'Wer ist wer?',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'matchPairs', skills: ['grammar', 'vocabulary'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'você', right: 'du' }, { left: 'o senhor', right: 'Sie (zu einem Mann)' }, { left: 'a senhora', right: 'Sie (zu einer Frau)' }, { left: 'vocês', right: 'ihr / Sie (mehrere)' }],
          feedback: { rule: 'você = du, o senhor / a senhora = Sie (eine Person), vocês = ihr oder Sie (mehrere).', why: '`vocês` deckt locker und höflich im Plural ab.', avoid: 'Artikel verrät das Geschlecht: o senhor, a senhora.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['reading', 'grammar'], topicIds: [T], difficulty: 1,
          prompt: 'Welche Anrede passt zu deinem 80-jährigen Nachbarn?',
          options: [{ text: 'você', why: 'Möglich, aber bei deutlich älteren Menschen wirkt es wenig respektvoll.' }, { text: 'o senhor' }, { text: 'a senhora', why: '`a senhora` spricht eine Frau an.' }],
          answer: 1,
          feedback: { rule: 'Ältere Männer sprichst du respektvoll mit `o senhor` an.', why: '`a senhora` gilt für Frauen, `você` ist hier zu locker.', avoid: 'Alter + Respekt → o senhor / a senhora.' },
        },
        {
          id: `${T}.L1.03`, type: 'situation', skills: ['reading', 'speaking'], topicIds: [T], difficulty: 1,
          scenario: 'Du triffst eine gleichaltrige Freundin im Café.',
          options: [{ text: 'Oi! Tudo bem com você?' }, { text: 'Bom dia! Tudo bem com a senhora?', why: 'Viel zu förmlich für eine Freundin – klingt distanziert.' }, { text: 'Oi! Tudo bem com vocês?', why: '`vocês` spricht mehrere Personen an.' }],
          answer: 0,
          feedback: { rule: 'Unter Freunden: `você`.', why: '`a senhora` schafft Distanz, `vocês` ist Plural.', avoid: 'Eine Person, vertraut → você.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Anrede & Verbform',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Boa tarde! Tudo bem com ___ senhora?', answers: [['a']], bank: ['o', 'a', 'os'], german: 'Guten Tag! Geht es Ihnen gut? (zu einer Frau)',
          feedback: { rule: '`senhora` ist weiblich → `a senhora`.', why: '`o` gehört zu `senhor`, `os` ist Plural.', avoid: 'Artikel immer mitlernen: a senhora.' },
        },
        {
          id: `${T}.L2.02`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.estar'], difficulty: 2,
          verb: 'estar', tense: 'Präsens', person: 'o senhor', sentence: 'O senhor ___ bem?', answers: ['está'],
          feedback: { rule: '`o senhor` → 3. Person Singular: `está`.', why: '`estão` wäre Plural – wie im deutschen „Sie sind“, aber hier falsch.', avoid: 'Eine angesprochene Person = Singular.' },
        },
        {
          id: `${T}.L2.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.ser'], difficulty: 2,
          tokens: ['A', 'senhora', 'é', 'brasileira?'], extra: ['são'], german: 'Sind Sie Brasilianerin?',
          feedback: { rule: 'Höfliche Frage: `A senhora é brasileira?` – Verb in der 3. Person Singular.', why: '`são` ist Plural.', avoid: 'Ja/Nein-Frage: Satzstellung wie in der Aussage, nur die Melodie steigt.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Sicher im Register',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'O senhor estão cansado?', answers: ['O senhor está cansado?'], german: 'Sind Sie müde?',
          feedback: { rule: '`o senhor` + 3. Person Singular: `está`.', why: 'Das deutsche „Sie sind“ verführt zur Pluralform `estão`.', avoid: 'Frag dich: Wie viele Personen spreche ich an? Eine → Singular.' },
        },
        {
          id: `${T}.L3.02`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T, 'pt.g.ser'], difficulty: 3,
          direction: 'toTarget', source: 'Sind Sie Ärztin? (höflich, zu einer älteren Frau)', answers: ['A senhora é médica?'],
          feedback: { rule: 'Höflich zu einer Frau: `a senhora` + `é`; Beruf ohne Artikel: `médica`.', why: '`Você é médica?` wäre die lockere Variante.', avoid: 'Respekt + Frau → a senhora.' },
        },
        {
          id: `${T}.L3.03`, type: 'listening', skills: ['listening', 'reading'], topicIds: [T], difficulty: 3,
          audio: 'Bom dia, dona Maria! Tudo bem com a senhora?', question: 'Wie spricht die Person Maria an?',
          options: ['locker, wie eine Freundin', 'respektvoll, mit „dona“ + Vorname', 'formell mit Nachnamen'], answer: 1,
          feedback: { rule: '`dona` + Vorname und `a senhora` = respektvolle, herzliche Anrede.', why: 'Einen Nachnamen gibt es hier nicht; locker wäre `Oi, Maria! Tudo bem?`.', avoid: 'Achte auf `dona`/`seu` vor Vornamen – ein Respektsignal.' },
        },
      ],
    },
  ],
  related: ['pt.g.pronouns', 'pt.g.ser'],
};

export default topic;
