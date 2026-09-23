import type { GrammarTopic } from '../../types';

const T = 'pt.g.questions';

const topic: GrammarTopic = {
  id: T,
  courseId: 'pt-BR',
  stageId: 'stage0',
  order: 12,
  category: 'Satzbau & Fragen',
  title: 'Fragen & Fragewörter',
  summary: 'Ja/Nein-Fragen nur über die Satzmelodie, W-Fragen mit o que, quem, onde, como, quando, quanto, qual, por que – ohne Umstellung von Subjekt und Verb.',
  keywords: ['Fragen', 'Fragewörter', 'o que', 'quem', 'onde', 'como', 'quando', 'quanto', 'qual', 'por que', 'porque', 'Satzmelodie', 'cadê'],
  explanation: [
    {
      type: 'text',
      md:
        '**Ja/Nein-Fragen** unterscheiden sich von Aussagen nur durch die **Satzmelodie** – die Stimme steigt am Ende: `Você fala inglês?` ↗. Geantwortet wird gern mit dem Verb: `– Falo.` / `– Não falo.`\n' +
        '**W-Fragen:** Fragewort am Anfang, danach die normale Reihenfolge **Subjekt + Verb**: `Onde você mora?` Die Melodie fällt am Ende eher ab.',
    },
    {
      type: 'table',
      title: 'Fragewörter',
      headers: ['Fragewort', 'Deutsch', 'Beispiel'],
      rows: [
        ['o que', 'was', 'O que você faz?'],
        ['quem', 'wer', 'Quem é ele?'],
        ['onde / de onde', 'wo / woher', 'Onde você mora? · De onde você é?'],
        ['como', 'wie', 'Como você se chama?'],
        ['quando', 'wann', 'Quando você chega?'],
        ['quanto / quanta', 'wie viel', 'Quanto custa?'],
        ['quantos / quantas', 'wie viele', 'Quantos anos você tem?'],
        ['qual / quais', 'welche(r/s); was (bei Auswahl)', 'Qual é o seu nome?'],
        ['por que', 'warum', 'Por que você aprende português?'],
      ],
    },
    {
      type: 'text',
      md:
        '**por que / porque / por quê:** Die Frage „warum?“ schreibt man getrennt (`Por que …?`), die Antwort „weil“ zusammen (`Porque …`). Am Satzende: `Você está triste por quê?`\n' +
        '**Umgangssprache:** `Onde é que você mora?` (mit eingeschobenem „é que“) und `Cadê o Pedro?` (= Wo ist Pedro?) hörst du in Brasilien ständig.',
    },
    { type: 'tip', md: 'Fragewort + **você** + Verb – keine Umstellung. Und nach dem Namen fragst du mit **qual**, nicht mit „o que“.' },
  ],
  examples: [
    {
      target: 'Onde você mora?',
      german: 'Wo wohnst du?',
      parts: [{ text: 'Onde', role: 'question' }, { text: ' ' }, { text: 'você', role: 'subject' }, { text: ' ' }, { text: 'mora', role: 'verb' }, { text: '?' }],
    },
    { target: 'Qual é o seu nome?', german: 'Wie ist dein Name?', literal: 'Welcher ist dein Name?' },
    { target: 'Por que você aprende português? – Porque eu gosto do Brasil.', german: 'Warum lernst du Portugiesisch? – Weil ich Brasilien mag.' },
    { target: 'Quantas pessoas?', german: 'Wie viele Personen?', note: '`pessoa` ist weiblich → quantas.' },
    { target: 'Cadê o Pedro?', german: 'Wo ist Pedro?', note: 'sehr umgangssprachlich' },
  ],
  germanComparison: [
    {
      type: 'compare',
      target: 'Onde você mora? · Você fala inglês?',
      german: 'Wo wohnst du? · Sprichst du Englisch?',
      md: 'Im Deutschen wandert das Verb vor das Subjekt („wohnst du“). Im brasilianischen Portugiesisch bleibt alles an seinem Platz – nur die Melodie verrät die Frage.',
    },
    {
      type: 'compare',
      target: 'Qual é o seu nome?',
      german: 'Wie ist dein Name? / Was ist dein Name?',
      md: 'Wer wörtlich „Was ist dein Name?“ übersetzt, sagt „O que é o seu nome?“ – falsch. Bei einer Auswahl aus Möglichkeiten (Name, Adresse, Telefonnummer) heißt es `qual`.',
    },
  ],
  mistakes: [
    { wrong: 'O que é o seu nome?', right: 'Qual é o seu nome?', why: 'Vor `é` + Nomen fragt man mit `qual`, wenn es um eine konkrete Angabe geht.' },
    { wrong: 'Quanto anos você tem?', right: 'Quantos anos você tem?', why: '`quanto` passt sich an: anos ist männlich Plural → quantos.' },
    { wrong: 'Porque você está aqui?', right: 'Por que você está aqui?', why: 'Die Frage „warum“ wird getrennt geschrieben.' },
  ],
  mnemonic: 'Fragewort + você + Verb. Name, Nummer, Adresse → qual. Warum = por que, weil = porque.',
  levels: [
    {
      level: 1,
      title: 'Fragewörter',
      exercises: [
        {
          id: `${T}.L1.01`, type: 'matchPairs', skills: ['vocabulary', 'grammar'], topicIds: [T], difficulty: 1,
          pairs: [{ left: 'quem', right: 'wer' }, { left: 'onde', right: 'wo' }, { left: 'quando', right: 'wann' }, { left: 'por que', right: 'warum' }, { left: 'quantos', right: 'wie viele' }],
          feedback: { rule: 'quem = wer, onde = wo, quando = wann, por que = warum, quantos = wie viele.', why: 'quem/quando/quanto beginnen alle mit „qu“.', avoid: 'Lerne jedes Fragewort mit einer Beispielfrage.' },
        },
        {
          id: `${T}.L1.02`, type: 'mc', skills: ['grammar', 'reading'], topicIds: [T], difficulty: 1,
          prompt: '„Wo wohnst du?“',
          options: [{ text: 'Onde você mora?' }, { text: 'Quando você mora?', why: '`quando` = wann.' }, { text: 'Quem você mora?', why: '`quem` = wer.' }],
          answer: 0,
          feedback: { rule: 'wo = `onde`: `Onde você mora?`', why: 'Die anderen Fragewörter fragen nach Zeit bzw. Person.', avoid: 'onde ↔ Ort, quando ↔ Zeit, quem ↔ Person.' },
        },
      ],
    },
    {
      level: 2,
      title: 'Die richtige Form',
      exercises: [
        {
          id: `${T}.L2.01`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: '___ anos você tem?', answers: [['Quantos']], bank: ['Quanto', 'Quantos', 'Quantas'], german: 'Wie alt bist du?',
          feedback: { rule: '`anos` ist männlich Plural → `quantos`.', why: '`quanto` = wie viel (Singular), `quantas` = weiblich Plural.', avoid: 'quanto passt sich dem Nomen an – wie ein Adjektiv.' },
        },
        {
          id: `${T}.L2.02`, type: 'cloze', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 2,
          sentence: '___ é o seu nome?', answers: [['Qual']], bank: ['Qual', 'O que', 'Quem'], german: 'Wie ist dein Name?',
          feedback: { rule: 'Nach einer konkreten Angabe (Name, Nummer, Adresse) fragt man mit `qual`.', why: '`O que é o seu nome?` ist eine wörtliche, aber falsche Übersetzung.', avoid: 'qual + é + Angabe.' },
        },
        {
          id: `${T}.L2.03`, type: 'order', skills: ['grammar', 'reading'], topicIds: [T, 'pt.g.present-regular'], difficulty: 2,
          tokens: ['Por', 'que', 'você', 'aprende', 'português?'], extra: ['porque'], german: 'Warum lernst du Portugiesisch?',
          feedback: { rule: 'Frage „warum“ = `por que` (getrennt) + você + Verb.', why: '`porque` (zusammen) bedeutet „weil“.', avoid: 'Frage getrennt, Antwort zusammen.' },
        },
      ],
    },
    {
      level: 3,
      title: 'Typische Fallen',
      exercises: [
        {
          id: `${T}.L3.01`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T], difficulty: 3,
          sentence: 'O que é o seu nome?', answers: ['Qual é o seu nome?', 'Qual é seu nome?'], german: 'Wie ist dein Name?',
          feedback: { rule: 'Nach dem Namen fragt man mit `qual`.', why: '`o que é …?` fragt nach einer Definition („Was ist das?“).', avoid: 'Name, Telefonnummer, Adresse → qual.' },
        },
        {
          id: `${T}.L3.02`, type: 'fixError', skills: ['grammar', 'writing'], topicIds: [T, 'pt.g.estar'], difficulty: 3,
          sentence: 'Porque você está cansado?', answers: ['Por que você está cansado?'], german: 'Warum bist du müde?',
          feedback: { rule: 'Die Frage „warum“ schreibt man getrennt: `Por que`.', why: '`Porque` heißt „weil“ und leitet eine Antwort ein.', avoid: 'Fragezeichen am Ende → por que getrennt.' },
        },
        {
          id: `${T}.L3.03`, type: 'dialogue', skills: ['reading', 'grammar'], topicIds: [T], difficulty: 3,
          instruction: 'Welche Frage passt zur Antwort?',
          lines: [
            { speaker: 'Ana', text: '…' },
            { speaker: 'Leo', text: 'Moro em Belém.', german: 'Ich wohne in Belém.' },
          ],
          gapIndex: 0, options: ['Onde você mora?', 'Quando você mora?', 'De onde você é?'], answer: 0,
          feedback: { rule: 'Antwort mit `Moro em …` → Frage `Onde você mora?`.', why: 'Auf `De onde você é?` würde man mit `Sou de …` antworten.', avoid: 'Das Verb der Antwort verrät die Frage: moro → mora.' },
        },
      ],
    },
  ],
  related: ['pt.g.present-regular', 'pt.g.numbers'],
};

export default topic;
