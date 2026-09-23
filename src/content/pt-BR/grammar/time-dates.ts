import type { GrammarTopic } from '../../types';

const T = 'pt.g.time-dates';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'a1',
  order: 18,
  category: 'Zahlen',
  title: 'Uhrzeit, Wochentage & Datum',
  summary: 'Que horas são? – É uma hora, são duas e meia. Dazu: às oito horas, de manhã / à tarde / à noite, die Wochentage (segunda-feira …) und das Datum.',
  keywords: ['Uhrzeit', 'Que horas são', 'é uma hora', 'são duas', 'meia', 'meio-dia', 'meia-noite', 'às', 'Wochentage', 'segunda-feira', 'Datum', 'Monate', 'de manhã', 'à tarde', 'à noite'],
  explanation: [
    {
      type: 'table',
      title: 'Wie spät ist es? – Que horas são?',
      headers: ['Uhrzeit', 'Portugiesisch'],
      rows: [
        ['1:00', 'É uma hora.'],
        ['2:00', 'São duas horas.'],
        ['2:30', 'São duas e meia.'],
        ['3:15', 'São três e quinze.'],
        ['4:45', 'São quinze para as cinco. / São quatro e quarenta e cinco.'],
        ['12:00', 'É meio-dia.'],
        ['12:30', 'É meio-dia e meia.'],
        ['0:00', 'É meia-noite.'],
      ],
    },
    {
      type: 'text',
      md:
        '**é oder são?** Bei 1 Uhr, Mittag und Mitternacht steht der Singular `é`, sonst `são`.\n**Genus:** `hora` ist weiblich – daher `uma hora`, `duas horas` (nicht „dois“). `meia` ist die „halbe (Stunde)“, deshalb auch `meio-dia e meia`. Viertelstunden sagt man einfach mit Minuten: `e quinze`.',
    },
    { type: 'colored', parts: [{ text: 'São', role: 'verb' }, { text: ' ' }, { text: 'duas', role: 'other' }, { text: ' ' }, { text: 'e', role: 'other' }, { text: ' ' }, { text: 'meia', role: 'noun' }, { text: '.' }], german: 'Es ist halb drei.' },
    {
      type: 'text',
      md:
        '**Um wie viel Uhr? – A que horas?** (umgangssprachlich auch nur `Que horas …?`) Antwort mit `às` (a + as): `às oito (horas)`, `às duas e meia`. Bei 1 Uhr: `à uma (hora)`; mittags und nachts: `ao meio-dia`, `à meia-noite`.\n**Tageszeiten:** `de manhã` (morgens, vormittags), `à tarde` (nachmittags), `à noite` (abends, nachts). Nach einer Uhrzeit: `às oito da manhã`, `às três da tarde`, `às dez da noite`. Offiziell (Arbeit, Kino, Bus) zählt man bis 24: `às quinze horas` = um 15 Uhr.',
    },
    {
      type: 'table',
      title: 'Die Wochentage',
      headers: ['Portugiesisch', 'Deutsch', 'kurz'],
      rows: [
        ['segunda-feira', 'Montag', 'segunda'],
        ['terça-feira', 'Dienstag', 'terça'],
        ['quarta-feira', 'Mittwoch', 'quarta'],
        ['quinta-feira', 'Donnerstag', 'quinta'],
        ['sexta-feira', 'Freitag', 'sexta'],
        ['sábado', 'Samstag', '–'],
        ['domingo', 'Sonntag', '–'],
      ],
    },
    {
      type: 'text',
      md:
        'Die Tage mit **-feira** sind weiblich: `na segunda(-feira)` = am Montag. `sábado` und `domingo` sind männlich: `no sábado`, `no domingo`. „Montags / jeden Montag“ = `às segundas` oder `toda segunda`. Von … bis: `de segunda a sexta`.\n**Datum:** `Que dia é hoje?` – `Hoje é dia cinco de maio.` oder `Hoje é quinta-feira.` Monate: janeiro, fevereiro, março, abril, maio, junho, julho, agosto, setembro, outubro, novembro, dezembro. Der Erste heißt `primeiro`: `primeiro de maio`. „Im Mai“ = `em maio`. Wochentage und Monate schreibt man **klein**.',
    },
    { type: 'mistake', wrong: 'São uma hora.', right: 'É uma hora.', why: '1 Uhr ist Singular – also `é`, genau wie bei Mittag und Mitternacht.' },
    { type: 'tip', md: '**Eins, Mittag, Mitternacht → é. Alles andere → são.** Und die Stunde ist weiblich: uma, duas.' },
    { type: 'audio', text: 'Que horas são? – São três e meia.', label: 'Wie spät ist es? – Halb vier.' },
  ],
  examples: [
    {
      target: 'Que horas são? – São duas e meia.',
      german: 'Wie spät ist es? – Halb drei.',
      parts: [{ text: 'Que horas', role: 'question' }, { text: ' ' }, { text: 'são', role: 'verb' }, { text: '? – ' }, { text: 'São', role: 'verb' }, { text: ' ' }, { text: 'duas e meia', role: 'other' }, { text: '.' }],
    },
    {
      target: 'A aula começa às oito da manhã.',
      german: 'Der Unterricht beginnt um acht Uhr morgens.',
      parts: [{ text: 'A', role: 'article' }, { text: ' ' }, { text: 'aula', role: 'subject' }, { text: ' ' }, { text: 'começa', role: 'verb' }, { text: ' ' }, { text: 'às', role: 'preposition' }, { text: ' ' }, { text: 'oito', role: 'other' }, { text: ' ' }, { text: 'da manhã', role: 'adverb' }, { text: '.' }],
    },
    { target: 'Eu almoço ao meio-dia.', german: 'Ich esse um zwölf Uhr zu Mittag.' },
    { target: 'Na sexta à noite a gente janta fora.', german: 'Am Freitagabend essen wir auswärts.' },
    { target: 'Hoje é quarta-feira, dia dez de julho.', german: 'Heute ist Mittwoch, der zehnte Juli.' },
    { target: 'Meu aniversário é no dia primeiro de março.', german: 'Mein Geburtstag ist am ersten März.' },
    { target: 'Eu trabalho de segunda a sexta.', german: 'Ich arbeite von Montag bis Freitag.' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'São duas e meia.',
      german: 'Es ist halb drei.',
      md: 'Achtung Falle: Deutsch schaut bei „halb“ auf die **nächste** Stunde („halb drei“ = 2:30). Portugiesisch rechnet von der **vollen** Stunde weiter: „zwei und eine halbe“.',
    },
    {
      type: 'compare',
      target: 'às oito da noite',
      german: 'um acht Uhr abends',
      md: '„um … Uhr“ = `às …` – das Wort `horas` kann man weglassen.',
    },
    {
      type: 'compare',
      target: 'na segunda-feira, em maio',
      german: 'am Montag, im Mai',
      md: 'Wochentage und Monate werden kleingeschrieben – anders als im Deutschen.',
    },
  ],
  mistakes: [
    { wrong: 'São uma hora.', right: 'É uma hora.', why: '1 Uhr (wie Mittag und Mitternacht) steht mit `é`.' },
    { wrong: 'São dois horas.', right: 'São duas horas.', why: '`hora` ist weiblich → `duas`.' },
    { wrong: 'É meia três.', right: 'São duas e meia.', why: '„halb drei“ = 2:30 = zwei Uhr und eine halbe Stunde.' },
    { wrong: 'às uma', right: 'à uma', why: '`uma` ist Singular: a + a = `à`.' },
    { wrong: 'no segunda-feira', right: 'na segunda-feira', why: 'Die Tage auf -feira sind weiblich.' },
  ],
  mnemonic: '**Halb drei = duas e meia.** Portugiesisch schaut zurück auf die volle Stunde, Deutsch schaut voraus.',
  levels: [
    {
      level: 1,
      title: 'Wie spät ist es?',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: 'Es ist 1:00 Uhr.',
          options: [{ text: 'É uma hora.' }, { text: 'São uma hora.', why: 'Bei 1 Uhr steht der Singular `é`.' }, { text: 'É um hora.', why: '`hora` ist weiblich → `uma`.' }],
          answer: 0,
          feedback: { rule: '1 Uhr: `É uma hora.`', why: 'Nur eine Stunde → Singular; `hora` ist weiblich.', avoid: 'Eins, Mittag, Mitternacht → é.' },
        },
        {
          id: `${T}.L1.02`, type: 'matchPairs', skills: ['vocabulary', 'grammar'], topicIds: [T], difficulty: 1,
          pairs: [{ left: '2:30', right: 'São duas e meia.' }, { left: '12:00', right: 'É meio-dia.' }, { left: '3:15', right: 'São três e quinze.' }, { left: '0:00', right: 'É meia-noite.' }],
          feedback: { rule: '2:30 = duas e meia · 12:00 = meio-dia · 3:15 = três e quinze · 0:00 = meia-noite.', why: 'Mittag und Mitternacht haben eigene Wörter und stehen mit `é`.', avoid: 'meio-dia (Mittag) ≠ meia-noite (Mitternacht).' },
        },
        {
          id: `${T}.L1.03`, type: 'matchPairs', skills: ['vocabulary', 'reading'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'segunda-feira', right: 'Montag' }, { left: 'terça-feira', right: 'Dienstag' }, { left: 'quarta-feira', right: 'Mittwoch' }, { left: 'quinta-feira', right: 'Donnerstag' }, { left: 'sexta-feira', right: 'Freitag' }],
          feedback: { rule: 'Die Wochentage werden gezählt: segunda (2.) = Montag, terça (3.) = Dienstag … sexta (6.) = Freitag.', why: 'Die Woche beginnt traditionell am Sonntag (domingo) – deshalb ist Montag der „zweite“ Tag.', avoid: 'Montag = 2 → segunda.' },
        },
        {
          id: `${T}.L1.04`, type: 'listening', skills: ['listening', 'grammar'], topicIds: [T], difficulty: 1,
          audio: 'São quatro e meia.', question: 'Wie spät ist es?',
          options: ['3:30', '4:30', '5:30'], answer: 1,
          feedback: { rule: '`quatro e meia` = vier und eine halbe = 4:30.', why: 'Deutsch sagt dazu „halb fünf“ – deshalb verwechselt man es leicht mit 5:30 oder 3:30.', avoid: 'Die genannte Zahl ist die volle Stunde.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Um wie viel Uhr?',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'O café abre ___ sete e fecha ___ meia-noite.', answers: [['às'], ['à']],
          german: 'Das Café öffnet um sieben und schließt um Mitternacht.',
          feedback: { rule: 'um … Uhr = `às`; um Mitternacht = `à meia-noite`.', why: '`meia-noite` ist Singular (a + a = à), `sete` steht für „as sete horas“ (a + as = às).', avoid: 'Plural-Stunden → às, eine Stunde → à.' },
        },
        {
          id: `${T}.L2.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 2,
          prompt: 'Die Halbe-Stunde-Falle: Wie sagt man „halb drei“?',
          options: [{ text: 'São duas e meia.' }, { text: 'São três e meia.', why: 'Das ist 3:30 – auf Deutsch „halb vier“.' }, { text: 'É meia três.', why: 'Diese Konstruktion gibt es nicht.' }],
          answer: 0,
          feedback: { rule: '„halb drei“ = 2:30 = `duas e meia`.', why: 'Portugiesisch nennt die volle Stunde und addiert die halbe.', avoid: 'Halb X = (X – 1) e meia.' },
        },
        {
          id: `${T}.L2.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: 'Eu trabalho ___ manhã e estudo ___ noite.', answers: [['de'], ['à', 'de']],
          german: 'Ich arbeite morgens und lerne abends.',
          feedback: { rule: '`de manhã` = morgens; `à noite` (oder `de noite`) = abends.', why: 'Ohne Uhrzeit heißt es `de manhã`; „na manhã“ klingt falsch.', avoid: 'de manhã · à tarde · à noite.' },
        },
        {
          id: `${T}.L2.04`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.ser-estar'], difficulty: 2,
          tokens: ['A', 'aula', 'é', 'na', 'segunda', 'às', 'dez.'], extra: ['no', 'em'],
          alternatives: [['A', 'aula', 'é', 'às', 'dez', 'na', 'segunda.']],
          german: 'Der Unterricht ist am Montag um zehn.',
          feedback: { rule: 'am Montag = `na segunda`; um zehn = `às dez`.', why: '`segunda` ist weiblich → `na`, nicht `no`.', avoid: '-feira-Tage → na; sábado/domingo → no.' },
        },
        {
          id: `${T}.L2.05`, type: 'translate', skills: ['writing', 'grammar'], topicIds: [T], difficulty: 2,
          direction: 'toTarget', source: 'Um wie viel Uhr isst du zu Mittag?',
          answers: ['A que horas você almoça?', 'Que horas você almoça?', 'Você almoça a que horas?', 'A que hora você almoça?'],
          feedback: { rule: '`A que horas …?` = Um wie viel Uhr …? `almoçar` = zu Mittag essen.', why: '`Que horas são?` fragt nach der aktuellen Uhrzeit, nicht nach einem Zeitpunkt.', avoid: 'Zeitpunkt → (A) que horas + Verb.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Datum & Wochenplan',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'translate', skills: ['writing', 'vocabulary'], topicIds: [T], difficulty: 2,
          direction: 'toTarget', source: 'Heute ist Freitag.',
          answers: ['Hoje é sexta-feira.', 'Hoje é sexta.'],
          feedback: { rule: 'Freitag = `sexta-feira` (kurz: `sexta`), kleingeschrieben.', why: 'Wochentage schreibt man klein; ein Artikel ist nach `é` nicht nötig.', avoid: 'Freitag = 6. Tag → sexta.' },
        },
        {
          id: `${T}.L3.02`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'São uma e meia.', answers: ['É uma e meia.'], german: 'Es ist halb zwei.',
          feedback: { rule: 'Alles mit 1 Uhr steht im Singular: `É uma e meia.`', why: 'Die Minuten ändern nichts – entscheidend ist die Stunde (uma).', avoid: 'uma → é, auch mit „e meia“.' },
        },
        {
          id: `${T}.L3.03`, type: 'dictation', skills: ['listening', 'writing'], topicIds: [T, 'pt.g.numbers'], difficulty: 3,
          audio: 'Hoje é dia doze de outubro.', answers: ['Hoje é dia doze de outubro.', 'Hoje é dia 12 de outubro.'], german: 'Heute ist der zwölfte Oktober.',
          feedback: { rule: 'Datum: `dia` + Zahl + `de` + Monat (klein).', why: 'Monate schreibt man klein; der Tag wird mit der Grundzahl genannt (nur der Erste heißt `primeiro`).', avoid: 'dia doze de outubro – ohne Großbuchstaben.' },
        },
        {
          id: `${T}.L3.04`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: [T], difficulty: 3,
          audio: 'A consulta é na quinta-feira, às três da tarde.', question: 'Wann ist der Termin?',
          options: ['Donnerstag, 15 Uhr', 'Dienstag, 15 Uhr', 'Donnerstag, 3 Uhr morgens'], answer: 0,
          feedback: { rule: '`quinta-feira` = Donnerstag; `às três da tarde` = um 15 Uhr.', why: '`terça` wäre Dienstag; `da tarde` zeigt den Nachmittag.', avoid: 'quinta = 5. Tag = Donnerstag.' },
        },
        {
          id: `${T}.L3.05`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.contractions'], difficulty: 3,
          sentence: 'Eu trabalho no segunda.', answers: ['Eu trabalho na segunda.', 'Eu trabalho na segunda-feira.', 'Trabalho na segunda.', 'Trabalho na segunda-feira.'], german: 'Ich arbeite am Montag.',
          feedback: { rule: '`segunda(-feira)` ist weiblich → `na segunda`.', why: '`no` passt nur zu `sábado` und `domingo`.', avoid: '-feira → na.' },
        },
      ],
    },
  ],
  related: ['pt.g.numbers', 'pt.g.contractions', 'pt.g.reflexive'],
};

export default topic;
