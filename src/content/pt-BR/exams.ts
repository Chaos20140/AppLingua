import type { Exam } from '../types';

const F = 'pt.exam.s0.final';
const B = 'pt.exam.s0.boss';

const finalExam: Exam = {
  id: F,
  courseId: 'pt-BR',
  stageId: 'stage0',
  kind: 'final',
  title: 'Abschlussprüfung Stufe 0',
  description:
    'Die Abschlussprüfung deckt alle sieben Lektionen ab: Begrüßung und Anrede, Aussprache, Pronomen, **ser/estar**, Artikel und Plural, Zahlen, Vorstellen und Fragen. Du brauchst **70 %**. Fehler landen im Fehlerarchiv – du kannst die Prüfung beliebig oft wiederholen.',
  passPct: 70,
  sections: [
    {
      title: 'Grammatik',
      skill: 'grammar',
      exercises: [
        {
          id: `${F}.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.ser-estar'], difficulty: 2,
          sentence: 'Eu ___ professor, mas hoje ___ em casa.', answers: [['sou'], ['estou', 'tô']], german: 'Ich bin Lehrer, aber heute bin ich zu Hause.',
          feedback: { rule: 'Beruf → ser (`sou`), Aufenthaltsort → estar (`estou`).', why: '`estou professor` oder `sou em casa` verwechseln Steckbrief und Statusmeldung.', avoid: 'Steckbrief → ser, Statusmeldung → estar.' },
        },
        {
          id: `${F}.02`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: ['pt.g.estar'], difficulty: 2,
          verb: 'estar', tense: 'Präsens', person: 'vocês', sentence: 'Vocês ___ cansados?', answers: ['estão', 'tão'],
          feedback: { rule: 'vocês → `estão`.', why: '`vocês` steht mit der 3. Person Plural.', avoid: 'vocês = wie eles.' },
        },
        {
          id: `${F}.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.contractions'], difficulty: 2,
          sentence: 'Sou ___ Brasil, mas moro ___ Alemanha.', answers: [['do'], ['na']], german: 'Ich komme aus Brasilien, wohne aber in Deutschland.',
          feedback: { rule: 'de + o (Brasil) = `do`; em + a (Alemanha) = `na`.', why: 'Länder haben einen Artikel – die Präposition muss verschmelzen.', avoid: 'o Brasil, a Alemanha – erst den Artikel denken.' },
        },
        {
          id: `${F}.04`, type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.articles-gender'], difficulty: 2,
          prompt: 'Welche Kombination ist richtig?',
          options: [{ text: 'a dia', why: '`dia` ist männlich.' }, { text: 'o cidade', why: '-dade ist weiblich.' }, { text: 'o problema' }, { text: 'a hotel', why: '`hotel` ist männlich.' }],
          answer: 2,
          feedback: { rule: '`o problema` ist männlich (griechisches -ma).', why: 'o dia, a cidade, o hotel wären die richtigen Formen der anderen.', avoid: 'Ausnahmen wie o dia und o problema gezielt merken.' },
        },
        {
          id: `${F}.05`, type: 'order', skills: ['grammar', 'reading'], topicIds: ['pt.g.questions'], difficulty: 2,
          tokens: ['Quantos', 'anos', 'você', 'tem?'], extra: ['é'], german: 'Wie alt bist du?',
          feedback: { rule: 'Alter mit `ter`: `Quantos anos você tem?`', why: '`é` (ser) passt nicht zum Alter.', avoid: 'Alter hat man – tenho/tem.' },
        },
        {
          id: `${F}.06`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: ['pt.g.present-regular'], difficulty: 2,
          sentence: 'Eu sou trinta anos.', answers: ['Eu tenho trinta anos.', 'Tenho trinta anos.', 'Eu tenho 30 anos.', 'Tenho 30 anos.'], german: 'Ich bin dreißig Jahre alt.',
          feedback: { rule: 'Alter: `ter` + Zahl + `anos`.', why: 'Wörtlich aus dem Deutschen („ich bin … alt“) übersetzt ergibt einen falschen Satz.', avoid: 'Tenho … anos.' },
        },
        {
          id: `${F}.07`, type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.pronouns', 'pt.g.ser'], difficulty: 2,
          prompt: 'A gente ___ do Rio.',
          options: [{ text: 'somos', why: '`somos` gehört zu `nós`.' }, { text: 'é' }, { text: 'são', why: '`são` ist 3. Person Plural.' }],
          answer: 1,
          feedback: { rule: '`a gente` + 3. Person Singular: `a gente é`.', why: 'Obwohl es „wir“ bedeutet, ist a gente grammatisch Singular.', avoid: 'a gente = Verbform wie ele.' },
        },
        {
          id: `${F}.08`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: ['pt.g.present-regular'], difficulty: 2,
          verb: 'aprender', tense: 'Präsens', person: 'nós', sentence: 'Nós ___ português.', answers: ['aprendemos'],
          feedback: { rule: '-er-Verben bei nós: -emos → `aprendemos`.', why: '„aprendamos“ wäre Subjuntivo (Konjunktiv), kein Indikativ Präsens.', avoid: 'nós → -mos, der Vokal kommt vom Infinitiv (-er → e).' },
        },
        {
          id: `${F}.09`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.plural'], difficulty: 3,
          instruction: 'Setze den Plural von „hotel“ und „flor“ ein.',
          sentence: 'dois ___ e três ___', answers: [['hotéis'], ['flores']], german: 'zwei Hotels und drei Blumen',
          feedback: { rule: '-l → -is (`hotéis`), -r → + es (`flores`).', why: '„hotels“ und „flors“ folgen der deutschen bzw. englischen Logik.', avoid: 'Letzten Buchstaben ansehen – er bestimmt die Pluralregel.' },
        },
      ],
    },
    {
      title: 'Hörverstehen',
      skill: 'listening',
      exercises: [
        {
          id: `${F}.10`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.numbers'], difficulty: 2,
          audio: 'São quarenta e cinco reais.', question: 'Wie viel kostet es?', options: ['54 Reais', '45 Reais', '40 Reais'], answer: 1,
          feedback: { rule: '`quarenta e cinco` = 45 (Zehner + e + Einer).', why: '54 wäre `cinquenta e quatro`.', avoid: 'Im Portugiesischen kommt der Zehner zuerst.' },
        },
        {
          id: `${F}.11`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.formality'], difficulty: 1,
          audio: 'Boa noite, até amanhã!', question: 'Zu welcher Tageszeit findet das Gespräch statt?', options: ['morgens', 'nachmittags', 'abends'], answer: 2,
          feedback: { rule: '`boa noite` = guten Abend / gute Nacht.', why: 'Morgens: bom dia; nachmittags: boa tarde.', avoid: 'noite = Abend/Nacht.' },
        },
        {
          id: `${F}.12`, type: 'dictation', skills: ['listening', 'writing'], topicIds: ['pt.g.questions'], difficulty: 3,
          audio: 'Onde vocês moram?', answers: ['Onde vocês moram?'], german: 'Wo wohnt ihr?',
          feedback: { rule: '`Onde vocês moram?` – Fragewort + Subjekt + Verb (Plural).', why: 'Häufige Fehler: „voces“ ohne Zirkumflex, „mora“ statt „moram“.', avoid: 'vocês → Verbendung -m.' },
        },
        {
          id: `${F}.13`, type: 'minimalPair', skills: ['listening', 'pronunciation'], topicIds: ['pt.g.sounds'], difficulty: 2,
          options: ['caro', 'carro'], answer: 0,
          hint: '`caro` (teuer) hat einen kurzen Zungenschlag, `carro` (Auto) ein gehauchtes h.',
          feedback: { rule: 'r zwischen Vokalen = Zungenschlag; rr = h.', why: 'Nur dieser Laut unterscheidet „teuer“ und „Auto“.', avoid: 'caro ≈ „KA-ru“, carro ≈ „KA-hu“.' },
        },
      ],
    },
    {
      title: 'Wortschatz',
      skill: 'vocabulary',
      exercises: [
        {
          id: `${F}.14`, type: 'matchPairs', skills: ['vocabulary', 'reading'], difficulty: 1,
          pairs: [{ left: 'obrigada', right: 'danke (Frau spricht)' }, { left: 'tchau', right: 'tschüss' }, { left: 'cansado', right: 'müde' }, { left: 'a cidade', right: 'die Stadt' }, { left: 'o pão', right: 'das Brot' }],
          feedback: { rule: 'obrigada = danke (Frau), tchau = tschüss, cansado = müde, a cidade = die Stadt, o pão = das Brot.', why: 'Diese Wörter gehören zum Grundwortschatz der Stufe 0.', avoid: 'Wiederhole Vokabeln im Vokabeltrainer regelmäßig.' },
        },
        {
          id: `${F}.15`, type: 'translate', skills: ['reading', 'vocabulary'], topicIds: ['pt.g.ser', 'pt.g.present-regular'], difficulty: 2,
          direction: 'toGerman', source: 'Ela é médica e mora em Salvador.', answers: ['Sie ist Ärztin und wohnt in Salvador.', 'Sie ist Ärztin und lebt in Salvador.'],
          feedback: { rule: '`é médica` = ist Ärztin; `mora` = wohnt.', why: '`mora` ist die ela-Form von `morar` (wohnen); `médica` ist die weibliche Form von `médico`.', avoid: 'Verbformen auf den Infinitiv zurückführen: mora → morar.' },
        },
      ],
    },
    {
      title: 'Aussprache & Sprechen',
      skill: 'pronunciation',
      exercises: [
        {
          id: `${F}.16`, type: 'mc', skills: ['pronunciation', 'reading'], topicIds: ['pt.g.sounds'], difficulty: 2,
          prompt: 'Wie spricht man `noite` aus?',
          options: [{ text: '„NOI-te“', why: 'Unbetontes -e am Ende klingt wie i.' }, { text: '„NOI-tschi“' }, { text: '„NOI-ti“ mit klarem t', why: 'Vor i wird t zu „tsch“.' }],
          answer: 1,
          feedback: { rule: '-e am Ende → i; t vor i → „tsch“: `noite` ≈ „NOI-tschi“.', why: 'Beide Regeln wirken hier zusammen.', avoid: 'Erst das Wortende als i sprechen, dann kommt das tsch automatisch.' },
        },
        {
          id: `${F}.17`, type: 'speak', skills: ['pronunciation', 'speaking'], topicIds: ['pt.g.sounds'], difficulty: 2,
          text: 'Meu nome é Paulo.', german: 'Mein Name ist Paulo.', phonetic: 'me-u NÕ-mjä PAU-lu', ipa: '[ˈmew ˈnõmi ˈɛ ˈpawlu]', pronItemId: 'pt.p.rhythm.meu-nome-e',
          feedback: { rule: '`nome` + `é` verschmelzen („NÕ-mjä“), `Paulo` ≈ „PAU-lu“.', why: 'Einzeln abgehackte Wörter klingen unnatürlich und werden schlechter erkannt.', avoid: 'Satz als eine Melodie sprechen.' },
        },
        {
          id: `${F}.18`, type: 'speakFree', skills: ['speaking', 'grammar'], topicIds: ['pt.g.present-regular'], difficulty: 3,
          prompt: 'Stell dich mündlich vor: Name, Herkunft und Wohnort.',
          keywords: ['nome', 'sou', 'moro', 'chamo'], minMatch: 2,
          sample: 'Meu nome é Lena. Sou da Alemanha e moro em Hamburgo.',
          feedback: { rule: 'Bausteine: Meu nome é … · Sou de/da … · Moro em …', why: 'Fehlende Schlüsselwörter bedeuten, dass ein Baustein fehlt oder nicht erkannt wurde.', avoid: 'Sprich langsam und deutlich in ganzen Sätzen.' },
        },
      ],
    },
    {
      title: 'Situationen',
      skill: 'reading',
      exercises: [
        {
          id: `${F}.19`, type: 'situation', skills: ['reading', 'speaking'], topicIds: ['pt.g.formality'], difficulty: 2,
          scenario: 'Im Bus sitzt eine ältere Dame neben dir. Ihr kommt ins Gespräch – du fragst höflich, wie es ihr geht.',
          options: [{ text: 'Tudo bem com a senhora?' }, { text: 'E aí, beleza?', why: 'Slang unter Freunden – gegenüber einer älteren Dame unpassend.' }, { text: 'Tudo bem com vocês?', why: '`vocês` spricht mehrere Personen an.' }],
          answer: 0,
          feedback: { rule: 'Respektvoll zu einer älteren Frau: `a senhora`.', why: 'Die anderen Optionen sind zu locker bzw. im Plural.', avoid: 'Alter + Respekt → o senhor / a senhora.' },
        },
      ],
    },
  ],
};

const bossExam: Exam = {
  id: B,
  courseId: 'pt-BR',
  stageId: 'stage0',
  kind: 'boss',
  title: 'Endgegner: O Guardião do Calçadão',
  description:
    'Der Guardião prüft alles aus Stufe 0 – schneller, gemischter und ein bisschen strenger als die Abschlussprüfung. Du brauchst **70 %**. Verlieren kostet nichts: Du kannst ihn jederzeit erneut herausfordern.',
  passPct: 70,
  boss: {
    name: 'O Guardião do Calçadão',
    emoji: '🏖️',
    intro:
      'An der Strandpromenade von Copacabana wacht **O Guardião do Calçadão** – ein älterer Herr mit Strohhut, der jeden Neuankömmling prüft. Nur wer ihn höflich grüßt, sich vorstellt und seine Fragen versteht, darf weiter. Tipp: Er legt Wert auf Respekt – `o senhor`!',
    defeat:
      '„Quase! Volte amanhã.“ – Fast geschafft! Schau im Fehlerarchiv nach, woran es lag, wiederhole die passenden Lektionen und fordere den Guardião erneut heraus – so oft du willst.',
    victory:
      '„Parabéns! Pode passar!“ – Der Guardião lüftet seinen Hut: Du hast Stufe 0 gemeistert. Der Weg ins A1 ist frei!',
  },
  sections: [
    {
      title: 'Der Gruß am Calçadão',
      skill: 'speaking',
      exercises: [
        {
          id: `${B}.01`, type: 'situation', skills: ['reading', 'speaking'], topicIds: ['pt.g.formality'], difficulty: 2,
          scenario: 'Es ist 16 Uhr. Der Guardião – ein älterer Herr – sieht dich erwartungsvoll an. Wie grüßt du ihn?',
          options: [{ text: 'Boa tarde! Tudo bem com o senhor?' }, { text: 'Bom dia! Tudo bem com você?', why: 'Falsche Tageszeit und zu locker.' }, { text: 'Boa noite! Tudo bem com a senhora?', why: 'Falsche Tageszeit, und `a senhora` spricht eine Frau an.' }],
          answer: 0,
          feedback: { rule: 'Nachmittags `boa tarde`; älterer Mann → `o senhor`.', why: 'Tageszeit und Anrede müssen beide stimmen.', avoid: 'Zwei Checks: Uhrzeit und Gegenüber.' },
        },
        {
          id: `${B}.02`, type: 'speakFree', skills: ['speaking', 'pronunciation'], topicIds: ['pt.g.formality', 'pt.g.ser'], difficulty: 3,
          prompt: 'Grüß den Guardião höflich und stell dich vor (Name und Herkunft).',
          keywords: ['boa tarde', 'senhor', 'nome', 'sou', 'chamo'], minMatch: 3,
          sample: 'Boa tarde! Tudo bem com o senhor? Meu nome é Jonas e sou da Alemanha.',
          feedback: { rule: 'Gruß (`boa tarde`), respektvolle Anrede (`o senhor`), Vorstellung (`meu nome é`, `sou de/da`).', why: 'Der Guardião erwartet Höflichkeit und eine vollständige Vorstellung.', avoid: 'Erst grüßen, dann nach dem Befinden fragen, dann vorstellen.' },
        },
      ],
    },
    {
      title: 'Die Fragen des Guardião',
      skill: 'grammar',
      exercises: [
        {
          id: `${B}.03`, type: 'dialogue', skills: ['grammar', 'reading'], topicIds: ['pt.g.ser', 'pt.g.contractions'], difficulty: 2,
          lines: [{ speaker: 'Guardião', text: 'De onde você é?', german: 'Woher kommst du?' }, { speaker: 'Você', text: '…' }],
          gapIndex: 1, options: ['Sou da Alemanha.', 'Estou da Alemanha.', 'Sou de a Alemanha.'], answer: 0,
          feedback: { rule: 'Herkunft: `ser` + `da` (de + a) + Land.', why: '`estou` beschreibt keinen Ursprung; `de a` muss verschmelzen.', avoid: 'Sou da/do + Land.' },
        },
        {
          id: `${B}.04`, type: 'dialogue', skills: ['grammar', 'reading'], topicIds: ['pt.g.estar', 'pt.g.contractions'], difficulty: 2,
          lines: [{ speaker: 'Guardião', text: 'E onde você está agora?', german: 'Und wo bist du jetzt?' }, { speaker: 'Você', text: '…' }],
          gapIndex: 1, options: ['Estou no Rio.', 'Sou no Rio.', 'Estou em o Rio.'], answer: 0,
          feedback: { rule: 'Aufenthaltsort → `estar`; em + o Rio = `no Rio`.', why: '`sou` passt nicht zum Ort, `em o` muss verschmelzen.', avoid: 'Wo? → estou no/na …' },
        },
        {
          id: `${B}.05`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.numbers', 'pt.g.present-regular'], difficulty: 3,
          instruction: 'Der Guardião fragt: „Quantos anos você tem?“ Du bist 22.',
          sentence: 'Eu ___ vinte e ___ anos.', answers: [['tenho'], ['dois']], german: 'Ich bin 22 Jahre alt.',
          feedback: { rule: 'Alter mit `ter`: `tenho`; 22 = `vinte e dois` (ano ist männlich).', why: '`sou` wäre falsch; `duas` passt nur zu weiblichen Nomen.', avoid: 'tenho … anos – und bei 1/2 das Genus prüfen.' },
        },
        {
          id: `${B}.06`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: ['pt.g.pronouns', 'pt.g.present-regular'], difficulty: 3,
          sentence: 'A gente falamos um pouco de português.', answers: ['A gente fala um pouco de português.', 'Nós falamos um pouco de português.'], german: 'Wir sprechen ein bisschen Portugiesisch.',
          feedback: { rule: '`a gente fala` oder `nós falamos`.', why: '`a gente` verlangt die 3. Person Singular.', avoid: 'a gente = wie ele.' },
        },
        {
          id: `${B}.07`, type: 'translate', skills: ['writing', 'grammar'], topicIds: ['pt.g.ser-estar', 'pt.g.present-regular'], difficulty: 3,
          direction: 'toTarget', source: 'Wir wohnen in Berlin, aber wir sind (gerade) in Brasilien.',
          answers: [
            'Moramos em Berlim, mas estamos no Brasil.',
            'Nós moramos em Berlim, mas estamos no Brasil.',
            'Nós moramos em Berlim, mas nós estamos no Brasil.',
            'A gente mora em Berlim, mas está no Brasil.',
            'A gente mora em Berlim, mas a gente está no Brasil.',
            'A gente mora em Berlim, mas tá no Brasil.',
          ],
          feedback: { rule: '`morar em` + Stadt; Aufenthaltsort → `estar` + `no Brasil`.', why: '`somos no Brasil` oder `estamos em Brasil` sind die typischen Fehler.', avoid: 'Städte ohne Artikel (em Berlim), Länder mit (no Brasil).' },
        },
      ],
    },
    {
      title: 'Hör genau hin',
      skill: 'listening',
      exercises: [
        {
          id: `${B}.08`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.numbers'], difficulty: 2,
          audio: 'Coco, oito reais. Água, seis reais.', question: 'Was kostet das Wasser am Kiosk?', options: ['8 Reais', '6 Reais', '16 Reais'], answer: 1,
          feedback: { rule: '`água, seis reais` = Wasser, 6 Reais.', why: '8 Reais kostet die Kokosnuss (`coco`).', avoid: 'Ordne jeden Preis dem Wort davor zu.' },
        },
        {
          id: `${B}.09`, type: 'minimalPair', skills: ['listening', 'pronunciation'], topicIds: ['pt.g.numbers'], difficulty: 3,
          options: ['sessenta', 'setenta'], answer: 0,
          hint: '`sessenta` (60) mit „ss“, `setenta` (70) mit „t“.',
          feedback: { rule: '60 = sessenta, 70 = setenta.', why: 'Nur ein Laut unterscheidet die beiden Zahlen.', avoid: 'seis → sessenta, sete → setenta.' },
        },
        {
          id: `${B}.10`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.numbers'], difficulty: 3,
          audio: 'O número é nove, oito, meia, sete, dois.', question: 'Welche Nummer nennt der Guardião?', options: ['9-8-3-7-2', '9-8-6-7-2', '9-8-6-2-7'], answer: 1,
          feedback: { rule: '`meia` = 6 beim Diktieren von Nummern.', why: 'Die Reihenfolge der Ziffern bleibt wie gesprochen.', avoid: 'meia in Nummern = 6.' },
        },
      ],
    },
    {
      title: 'Das letzte Rätsel',
      skill: 'reading',
      exercises: [
        {
          id: `${B}.11`, type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.ser-estar'], difficulty: 2,
          prompt: 'Welcher Satz beschreibt einen **vorübergehenden Zustand**?',
          options: [{ text: 'Ele é simpático.', why: 'Charakter → ser (dauerhaft).' }, { text: 'Ele está cansado.' }, { text: 'Ele é médico.', why: 'Beruf → ser.' }],
          answer: 1,
          feedback: { rule: 'Vorübergehende Zustände → `estar`: `Ele está cansado.`', why: 'Charakter und Beruf gehören zum Steckbrief (ser).', avoid: 'estar = gerade jetzt.' },
        },
        {
          id: `${B}.12`, type: 'order', skills: ['grammar', 'reading'], topicIds: ['pt.g.questions', 'pt.g.ser'], difficulty: 3,
          tokens: ['De', 'onde', 'vocês', 'são?'], alternatives: [['Vocês', 'são', 'de', 'onde?']], extra: ['estão', 'é'], german: 'Woher kommt ihr?',
          feedback: { rule: 'Herkunft → ser; vocês → `são`: `De onde vocês são?`', why: '`estão` (estar) passt nicht zur Herkunft, `é` ist Singular.', avoid: 'Fragewort + Subjekt + Verb.' },
        },
      ],
    },
  ],
};

export const exams: Exam[] = [finalExam, bossExam];
