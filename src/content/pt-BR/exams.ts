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

const A1C1 = 'pt.exam.a1.c1';
const A1C2 = 'pt.exam.a1.c2';

const a1c1: Exam = {
  id: A1C1,
  courseId: 'pt-BR',
  stageId: 'a1',
  kind: 'midterm',
  title: 'Kapiteltest: Família & Zuhause',
  description:
    'Prüft Kapitel 1 von A1: **ter**, Possessivbegleiter (**meu, seu, dele, dela**), **tem** = es gibt mit Ortsangaben sowie **Adjektive** zum Beschreiben von Menschen. Du brauchst **60 %**.',
  passPct: 60,
  sections: [
    {
      title: 'Grammatik',
      skill: 'grammar',
      exercises: [
        {
          id: `${A1C1}.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.ter'], difficulty: 1,
          prompt: 'Meus pais ___ três filhos.',
          options: [{ text: 'têm' }, { text: 'tem', why: '`tem` ist Singular – für eles/elas/vocês schreibt man `têm`.' }, { text: 'temos', why: '`temos` gehört zu `nós`.' }],
          answer: 0,
          feedback: { rule: 'eles (meus pais) → `têm`.', why: '`tem` und `têm` klingen gleich – der Zirkumflex markiert den Plural.', avoid: 'Plural → Dach (^).' },
        },
        {
          id: `${A1C1}.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.possessives'], difficulty: 2,
          sentence: 'A Paula tem um irmão. A esposa ___ é médica.', answers: [['dele']], german: 'Paula hat einen Bruder. Seine Frau ist Ärztin.',
          feedback: { rule: 'Die Frau gehört zum Bruder (ele) → `a esposa dele`.', why: '`dela` würde auf Paula zeigen; `sua` klingt wie „deine“.', avoid: 'Frag: Wem gehört es? – ihm → dele.' },
        },
        {
          id: `${A1C1}.03`, type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.tem-haver'], difficulty: 2,
          prompt: '„Gibt es hier in der Nähe einen Supermarkt?“',
          options: [{ text: 'Tem um mercado aqui perto?' }, { text: 'Está um mercado aqui perto?', why: '`estar` bedeutet nicht „es gibt“.' }, { text: 'É um mercado aqui perto?', why: 'Das hieße „Ist das ein Supermarkt hier in der Nähe?“' }],
          answer: 0,
          feedback: { rule: '„es gibt“ = `tem`: `Tem um mercado aqui perto?`', why: 'Nach etwas Unbestimmtem (um mercado) fragt man mit `tem`.', avoid: 'Gibt es …? → Tem …?' },
        },
        {
          id: `${A1C1}.04`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.adjectives'], difficulty: 2,
          instruction: 'Setze „baixo“ und „engraçado“ in der richtigen Form ein.',
          sentence: 'A minha avó é ___ e muito ___.', answers: [['baixa'], ['engraçada']], german: 'Meine Großmutter ist klein und sehr lustig.',
          feedback: { rule: '`avó` ist weiblich → `baixa`, `engraçada`; `muito` bleibt unverändert.', why: 'Auch nach `é` passen sich Adjektive an.', avoid: 'Frau → -a, bei jedem Adjektiv.' },
        },
        {
          id: `${A1C1}.05`, type: 'order', skills: ['grammar', 'reading'], topicIds: ['pt.g.tem-haver', 'pt.g.contractions'], difficulty: 2,
          tokens: ['O', 'banheiro', 'fica', 'ao', 'lado', 'da', 'cozinha.'], extra: ['tem', 'de'], german: 'Das Bad liegt neben der Küche.',
          feedback: { rule: 'Bestimmter Raum + `fica` + `ao lado da` (de + a).', why: '`tem` passt nicht zu „das Bad“ (bestimmt); `de a` muss verschmelzen.', avoid: 'der/die/das + Ort → fica.' },
        },
        {
          id: `${A1C1}.06`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: ['pt.g.ter'], difficulty: 2,
          sentence: 'Meu pai é cinquenta anos.',
          answers: ['Meu pai tem cinquenta anos.', 'O meu pai tem cinquenta anos.', 'Meu pai tem 50 anos.', 'O meu pai tem 50 anos.'],
          german: 'Mein Vater ist fünfzig.',
          feedback: { rule: 'Alter: `ter` + Zahl + `anos`.', why: 'Das deutsche „ist … alt“ wird mit `ter` ausgedrückt.', avoid: 'Jahre hat man: tem … anos.' },
        },
      ],
    },
    {
      title: 'Hörverstehen',
      skill: 'listening',
      exercises: [
        {
          id: `${A1C1}.07`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.ter'], difficulty: 2,
          audio: 'Eu tenho dois irmãos e uma irmã. A minha irmã é casada e tem um filho.', question: 'Was stimmt?',
          options: ['Die Person hat drei Geschwister; die Schwester hat einen Sohn.', 'Die Person hat zwei Geschwister; die Schwester ist ledig.', 'Die Person hat drei Brüder und einen Sohn.'],
          answer: 0,
          feedback: { rule: '`dois irmãos e uma irmã` = drei Geschwister; `casada` = verheiratet; `tem um filho` = hat einen Sohn.', why: 'Der Sohn gehört zur Schwester, nicht zur sprechenden Person.', avoid: 'Auf das Subjekt jedes Satzes achten.' },
        },
        {
          id: `${A1C1}.08`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.tem-haver', 'pt.g.adjectives'], difficulty: 2,
          audio: 'No meu apartamento tem dois quartos, uma sala pequena e uma varanda.', question: 'Was gibt es in der Wohnung?',
          options: ['zwei Schlafzimmer, ein kleines Wohnzimmer und einen Balkon', 'ein Schlafzimmer, zwei Wohnzimmer und einen Balkon', 'zwei Schlafzimmer, eine große Küche und einen Balkon'],
          answer: 0,
          feedback: { rule: '`dois quartos` = zwei Schlafzimmer, `uma sala pequena` = ein kleines Wohnzimmer, `uma varanda` = ein Balkon.', why: '`sala` ist das Wohnzimmer, die Küche heißt `cozinha`.', avoid: 'quarto = Schlafzimmer, sala = Wohnzimmer.' },
        },
        {
          id: `${A1C1}.09`, type: 'dictation', skills: ['listening', 'writing'], topicIds: ['pt.g.possessives', 'pt.g.tem-haver'], difficulty: 3,
          audio: 'A casa dela fica perto da praia.', answers: ['A casa dela fica perto da praia.'], german: 'Ihr Haus liegt in der Nähe des Strandes.',
          feedback: { rule: '`a casa dela` (ihr Haus) · `fica perto da praia` (liegt in der Nähe des Strandes).', why: '`dela` und `da` sind Verschmelzungen mit `de` – man schreibt sie zusammen.', avoid: 'de + ela = dela, de + a = da.' },
        },
      ],
    },
    {
      title: 'Wortschatz',
      skill: 'vocabulary',
      exercises: [
        {
          id: `${A1C1}.10`, type: 'imageMatch', skills: ['vocabulary', 'reading'], difficulty: 1,
          pairs: [{ emoji: '🛏️', word: 'a cama' }, { emoji: '🛋️', word: 'o sofá' }, { emoji: '🪟', word: 'a janela' }, { emoji: '🐶', word: 'o cachorro' }, { emoji: '🐱', word: 'o gato' }],
          feedback: { rule: 'a cama = Bett, o sofá = Sofa, a janela = Fenster, o cachorro = Hund, o gato = Katze.', why: 'Diese Wörter gehören zum Grundwortschatz von Kapitel 1.', avoid: 'Vokabeln immer mit Artikel lernen.' },
        },
      ],
    },
    {
      title: 'Aussprache & Sprechen',
      skill: 'pronunciation',
      exercises: [
        {
          id: `${A1C1}.11`, type: 'speak', skills: ['pronunciation', 'speaking'], topicIds: ['pt.g.adjectives', 'pt.g.possessives'], difficulty: 2,
          text: 'Minha filha tem olhos azuis.', german: 'Meine Tochter hat blaue Augen.', phonetic: 'MI-nja FI-lja tẽi Ó-lju-sa-SUIS', ipa: '[ˈmiɲɐ ˈfiʎɐ ˈtẽj̃ ˈɔʎuz aˈzujs]',
          feedback: { rule: '`nh` ≈ „nj“, `lh` ≈ „lj“; `olhos` mit offenem o; das s von `olhos` summt ins nächste Wort.', why: 'Ein hartes „l-h“ oder eine Pause zwischen `olhos` und `azuis` klingt unnatürlich.', avoid: '`olhos azuis` wie ein Wort sprechen: „Ó-lju-sa-SUIS“.' },
        },
        {
          id: `${A1C1}.12`, type: 'speakFree', skills: ['speaking', 'grammar'], topicIds: ['pt.g.ter', 'pt.g.possessives', 'pt.g.adjectives'], difficulty: 3,
          prompt: 'Stell mündlich deine Familie oder deine Wohnung vor (2–3 Sätze).',
          keywords: ['tenho', 'tem', 'meu', 'minha', 'meus', 'minhas', 'dele', 'dela', 'fica', 'muito'], minMatch: 3,
          sample: 'Eu tenho uma irmã. Ela é alta e muito legal. O apartamento dela fica perto da praia.',
          feedback: { rule: 'Bausteine: Tenho … · Meu/Minha … · … dele/dela · Tem … · Fica perto de …', why: 'Fehlende Schlüsselwörter bedeuten, dass ein Baustein fehlt oder nicht erkannt wurde.', avoid: 'Kurze, vollständige Sätze sprechen.' },
        },
      ],
    },
  ],
};

const a1c2: Exam = {
  id: A1C2,
  courseId: 'pt-BR',
  stageId: 'a1',
  kind: 'midterm',
  title: 'Kapiteltest: Mein Tag',
  description:
    'Prüft Kapitel 2 von A1: den Tagesablauf mit **reflexiven Verben** (eu me levanto), **Uhrzeit, Wochentage und Datum** sowie **estar + Gerundium** (estou falando). Du brauchst **60 %**.',
  passPct: 60,
  sections: [
    {
      title: 'Grammatik',
      skill: 'grammar',
      exercises: [
        {
          id: `${A1C2}.01`, type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.reflexive'], difficulty: 1,
          prompt: 'Ela ___ levanta às sete.',
          options: [{ text: 'se' }, { text: 'me', why: '`me` gehört zu `eu`.' }, { text: 'nos', why: '`nos` gehört zu `nós`.' }],
          answer: 0,
          feedback: { rule: 'ela → `se`: `Ela se levanta.`', why: 'Das Pronomen passt zur Person – bei ele/ela/você immer `se`.', avoid: 'eu – me, nós – nos, alle anderen – se.' },
        },
        {
          id: `${A1C2}.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.reflexive'], difficulty: 2,
          sentence: 'Nós ___ levantamos cedo, mas as crianças ___ levantam tarde.', answers: [['nos'], ['se']],
          german: 'Wir stehen früh auf, aber die Kinder stehen spät auf.',
          feedback: { rule: 'nós → `nos`; eles (as crianças) → `se`.', why: 'Pronomen und Verbendung passen immer zur gleichen Person.', avoid: '-mos → nos; -am → se.' },
        },
        {
          id: `${A1C2}.03`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.time-dates', 'pt.g.contractions'], difficulty: 2,
          sentence: 'De segunda a sexta eu me levanto ___ seis e almoço ___ meio-dia.', answers: [['às'], ['ao']],
          german: 'Von Montag bis Freitag stehe ich um sechs auf und esse um zwölf zu Mittag.',
          feedback: { rule: 'um sechs = `às seis`; um zwölf (mittags) = `ao meio-dia` (a + o).', why: '`meio-dia` ist männlich – deshalb `ao`, nicht `às`.', avoid: 'Stunden → às; meio-dia → ao; meia-noite → à.' },
        },
        {
          id: `${A1C2}.04`, type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.time-dates'], difficulty: 2,
          prompt: 'Es ist 1:30 Uhr.',
          options: [{ text: 'É uma e meia.' }, { text: 'São uma e meia.', why: 'Bei 1 Uhr steht `é` – auch mit Minuten.' }, { text: 'É meia duas.', why: '„halb zwei“ lässt sich nicht wörtlich übersetzen.' }],
          answer: 0,
          feedback: { rule: '1:30 = `É uma e meia.`', why: 'Die volle Stunde (uma) bestimmt den Singular; die halbe Stunde wird addiert.', avoid: 'uma → é; „halb“ = e meia nach der vollen Stunde.' },
        },
        {
          id: `${A1C2}.05`, type: 'conjugate', skills: ['grammar', 'writing'], topicIds: ['pt.g.gerund'], difficulty: 2,
          verb: 'fazer', tense: 'Verlaufsform (estar + Gerundium)', person: 'vocês', sentence: 'O que vocês ___?', answers: ['estão fazendo', 'tão fazendo'],
          feedback: { rule: 'vocês → `estão` + `fazendo`.', why: 'Nur estar wird konjugiert; das Gerundium `fazendo` ist regelmäßig.', avoid: 'estar + -ndo.' },
        },
      ],
    },
    {
      title: 'Hörverstehen',
      skill: 'listening',
      exercises: [
        {
          id: `${A1C2}.06`, type: 'listening', skills: ['listening', 'grammar'], topicIds: ['pt.g.time-dates'], difficulty: 2,
          audio: 'Eu almoço ao meio-dia e meia.', question: 'Wann isst die Person zu Mittag?',
          options: ['12:30', '12:00', '0:30'], answer: 0,
          feedback: { rule: '`meio-dia e meia` = 12:30.', why: '12:00 wäre nur `meio-dia`, 0:30 `meia-noite e meia`.', avoid: 'meio-dia = Mittag, meia-noite = Mitternacht.' },
        },
        {
          id: `${A1C2}.07`, type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.time-dates'], difficulty: 2,
          audio: 'Na segunda e na quarta eu trabalho de manhã. Na sexta eu trabalho à tarde.', question: 'An welchem Tag arbeitet die Person nachmittags?',
          options: ['am Freitag', 'am Montag', 'am Mittwoch'], answer: 0,
          feedback: { rule: '`na sexta … à tarde` = am Freitag nachmittags.', why: 'Montag (segunda) und Mittwoch (quarta) arbeitet die Person morgens (de manhã).', avoid: 'à tarde = nachmittags, de manhã = morgens.' },
        },
        {
          id: `${A1C2}.08`, type: 'dictation', skills: ['listening', 'writing'], topicIds: ['pt.g.reflexive', 'pt.g.time-dates'], difficulty: 3,
          audio: 'Eu me levanto às seis e meia.', answers: ['Eu me levanto às seis e meia.'], german: 'Ich stehe um halb sieben auf.',
          feedback: { rule: '`me levanto` (Pronomen vor dem Verb) · `às seis e meia` (um 6:30).', why: 'Häufige Fehler: „as“ ohne Akzent, „se levanto“ statt „me levanto“.', avoid: 'um … Uhr = às (mit Gravis).' },
        },
      ],
    },
    {
      title: 'Wortschatz',
      skill: 'vocabulary',
      exercises: [
        {
          id: `${A1C2}.09`, type: 'matchPairs', skills: ['vocabulary', 'reading'], topicIds: ['pt.g.reflexive', 'pt.g.time-dates'], difficulty: 1,
          pairs: [{ left: 'sempre', right: 'immer' }, { left: 'nunca', right: 'nie' }, { left: 'às vezes', right: 'manchmal' }, { left: 'geralmente', right: 'normalerweise' }, { left: 'sábado', right: 'Samstag' }],
          feedback: { rule: 'sempre = immer, nunca = nie, às vezes = manchmal, geralmente = normalerweise, sábado = Samstag.', why: 'Häufigkeitswörter und Wochentage braucht man für jeden Tagesablauf.', avoid: 'Häufigkeitswörter als Skala lernen: nunca → às vezes → geralmente → sempre.' },
        },
      ],
    },
    {
      title: 'Aussprache & Sprechen',
      skill: 'pronunciation',
      exercises: [
        {
          id: `${A1C2}.10`, type: 'speak', skills: ['pronunciation', 'speaking'], topicIds: ['pt.g.time-dates'], difficulty: 1,
          text: 'Que horas são?', german: 'Wie spät ist es?', phonetic: 'ki Ó-ras ßãu', ipa: '[ki ˈɔɾɐs ˈsɐ̃w̃]', pronItemId: 'pt.p.rhythm.que-horas-sao',
          feedback: { rule: '`que` ≈ „ki“, stummes h in `horas`, nasales „ãu“ in `são` – Melodie am Ende fallend.', why: 'Ein gesprochenes h oder ein „sau“ ohne Nasal wird schlechter verstanden.', avoid: 'Satz als eine Melodie: „ki Ó-ra-ßãu“.' },
        },
        {
          id: `${A1C2}.11`, type: 'speakFree', skills: ['speaking', 'grammar'], topicIds: ['pt.g.reflexive', 'pt.g.time-dates'], difficulty: 3,
          prompt: 'Erzähl mündlich von deinem Morgen: Wann wachst du auf, wann stehst du auf, und was machst du danach? (2–3 Sätze)',
          keywords: ['acordo', 'levanto', 'horas', 'meia', 'tomo banho', 'me visto', 'tomo café'], minMatch: 3,
          sample: 'Eu acordo às seis e meia e me levanto às sete. Depois eu tomo banho, me visto e tomo café.',
          feedback: { rule: 'acordo · me levanto · às … (horas) · tomo banho · me visto · tomo café.', why: 'Fehlende Schlüsselwörter bedeuten, dass ein Teil des Ablaufs fehlt oder nicht erkannt wurde.', avoid: 'Uhrzeit mit „às“ nennen und die Verben der Reihe nach sprechen.' },
        },
      ],
    },
    {
      title: 'Situation',
      skill: 'reading',
      exercises: [
        {
          id: `${A1C2}.12`, type: 'situation', skills: ['reading', 'speaking'], topicIds: ['pt.g.gerund'], difficulty: 2,
          scenario: 'Eine Freundin schreibt dir: „Cadê você?“ (Wo bist du?). Du bist schon unterwegs und fast da. Was antwortest du?',
          options: [{ text: 'Tô chegando!' }, { text: 'Tô em casa.', why: 'Dann wärst du noch zu Hause.' }, { text: 'Eu chegar.', why: 'Hier fehlt ein konjugiertes Verb.' }],
          answer: 0,
          feedback: { rule: '`Tô chegando!` = Bin gleich da! (estou + Gerundium).', why: 'Die Verlaufsform zeigt: Du bist gerade dabei anzukommen.', avoid: 'Unterwegs → tô chegando.' },
        },
      ],
    },
  ],
};

export const exams: Exam[] = [finalExam, bossExam, a1c1, a1c2];
