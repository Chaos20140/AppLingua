import type { PlacementTest } from '../types';

export const placement: PlacementTest = {
  courseId: 'pt-BR',
  intro:
    'Dieser kurze Test (ca. 5 Minuten) schätzt ein, wo du im **brasilianischen Portugiesisch** stehst. Die Fragen werden schrittweise schwieriger – wenn du etwas nicht weißt, ist das völlig in Ordnung: Überspringen oder raten verfälscht nur die Empfehlung. Das Ergebnis ist ein **Vorschlag**, kein nachgewiesenes Sprachniveau; du kannst jederzeit bei Stufe 0 beginnen.',
  questions: [
    {
      level: 'stage0',
      exercise: {
        id: 'pt.pl.01', type: 'mc', skills: ['vocabulary', 'reading'], topicIds: ['pt.g.formality'], difficulty: 1,
        prompt: 'Wie begrüßt du jemanden am Nachmittag?',
        options: [{ text: 'Boa tarde!' }, { text: 'Bom tarde!', why: '`tarde` ist weiblich → boa.' }, { text: 'Boa noite!', why: 'Das sagt man abends.' }],
        answer: 0,
        feedback: { rule: 'Nachmittags: `Boa tarde!`', why: '`tarde` ist weiblich, deshalb `boa`.', avoid: 'bom dia – boa tarde – boa noite.' },
      },
    },
    {
      level: 'stage0',
      exercise: {
        id: 'pt.pl.02', type: 'mc', skills: ['grammar', 'reading'], topicIds: ['pt.g.ser-estar'], difficulty: 1,
        prompt: '„Ich bin müde.“',
        options: [{ text: 'Eu sou cansado.' }, { text: 'Eu estou cansado.' }, { text: 'Eu tenho cansado.' }],
        answer: 1,
        feedback: { rule: 'Zustände → `estar`: `Eu estou cansado.`', why: '`ser` beschreibt dauerhafte Eigenschaften; `ter cansado` ist keine gültige Konstruktion.', avoid: 'Statusmeldung → estar.' },
      },
    },
    {
      level: 'stage0',
      exercise: {
        id: 'pt.pl.03', type: 'cloze', skills: ['grammar', 'writing'], topicIds: ['pt.g.contractions'], difficulty: 1,
        sentence: 'Eu sou ___ Alemanha.', answers: [['da']], german: 'Ich komme aus Deutschland.',
        feedback: { rule: 'de + a (Alemanha) = `da`.', why: 'Länder haben einen Artikel, die Präposition verschmilzt.', avoid: 'Sou da Alemanha / do Brasil.' },
      },
    },
    {
      level: 'stage0',
      exercise: {
        id: 'pt.pl.04', type: 'listening', skills: ['listening', 'vocabulary'], topicIds: ['pt.g.numbers'], difficulty: 1,
        audio: 'quarenta e sete', question: 'Welche Zahl hörst du?', options: ['47', '74', '57'], answer: 0,
        feedback: { rule: '`quarenta e sete` = 47.', why: 'Zehner zuerst: quarenta (40) + sete (7).', avoid: 'Umgekehrte Reihenfolge wie im Deutschen.' },
      },
    },
    {
      level: 'a1',
      exercise: {
        id: 'pt.pl.05', type: 'conjugate', skills: ['grammar', 'writing'], topicIds: ['pt.g.present-regular'], difficulty: 2,
        verb: 'morar', tense: 'Präsens', person: 'nós', sentence: 'Nós ___ em São Paulo.', answers: ['moramos'],
        feedback: { rule: 'nós → -amos: `moramos`.', why: 'Regelmäßiges -ar-Verb.', avoid: 'nós → -mos.' },
      },
    },
    {
      level: 'a1',
      exercise: {
        id: 'pt.pl.06', type: 'mc', skills: ['grammar', 'reading'], difficulty: 2,
        prompt: '„Ich mag Kaffee.“',
        options: [{ text: 'Eu gosto café.', why: '`gostar` braucht immer `de`.' }, { text: 'Eu gosto de café.' }, { text: 'Eu gosta de café.', why: '`gosta` ist die Form für você/ele.' }],
        answer: 1,
        feedback: { rule: '`gostar de` + Nomen: `Eu gosto de café.`', why: 'Ohne `de` ist der Satz unvollständig.', avoid: 'gostar immer mit de lernen.' },
      },
    },
    {
      level: 'a1',
      exercise: {
        id: 'pt.pl.07', type: 'mc', skills: ['grammar', 'reading'], difficulty: 2,
        prompt: '„Morgen werde ich lernen.“ (Alltagssprache)',
        options: [{ text: 'Amanhã eu vou estudar.' }, { text: 'Amanhã eu vou estudo.', why: 'Nach `vou` steht der Infinitiv.' }, { text: 'Amanhã eu estudar vou.', why: 'Falsche Wortstellung.' }],
        answer: 0,
        feedback: { rule: 'Nahe Zukunft: `ir` (vou) + Infinitiv.', why: 'Das ist die übliche Zukunftsform im gesprochenen Brasilianisch.', avoid: 'vou + Infinitiv = „ich werde …“.' },
      },
    },
    {
      level: 'a2',
      exercise: {
        id: 'pt.pl.08', type: 'mc', skills: ['grammar', 'reading'], difficulty: 2,
        prompt: '„Gestern habe ich Pizza gegessen.“',
        options: [{ text: 'Ontem eu como pizza.', why: 'Präsens passt nicht zu „gestern“.' }, { text: 'Ontem eu comi pizza.' }, { text: 'Ontem eu comia pizza.', why: 'Das Imperfeito beschreibt Gewohnheiten („ich aß früher“).' }],
        answer: 1,
        feedback: { rule: 'Abgeschlossene Handlung in der Vergangenheit → Pretérito perfeito: `comi`.', why: '`comia` beschreibt Wiederholtes oder Hintergrund.', avoid: 'Einmalig und abgeschlossen → perfeito.' },
      },
    },
    {
      level: 'a2',
      exercise: {
        id: 'pt.pl.09', type: 'cloze', skills: ['grammar', 'writing'], difficulty: 3,
        instruction: 'Setze „morar“ in der passenden Vergangenheitsform ein.',
        sentence: 'Quando eu era criança, eu ___ no interior.', answers: [['morava']], german: 'Als ich ein Kind war, wohnte ich auf dem Land.',
        feedback: { rule: 'Zustände und Gewohnheiten in der Vergangenheit → Imperfeito: `morava`.', why: '`morei` würde einen abgeschlossenen Zeitraum betonen – hier geht es um den Hintergrund der Kindheit.', avoid: 'Quando eu era … → imperfeito.' },
      },
    },
    {
      level: 'b1',
      exercise: {
        id: 'pt.pl.10', type: 'mc', skills: ['grammar', 'reading'], difficulty: 3,
        prompt: 'Espero que você ___ amanhã.',
        options: [{ text: 'vem', why: 'Nach `esperar que` steht der Subjuntivo.' }, { text: 'venha' }, { text: 'vier', why: 'Das ist Futuro do subjuntivo (nach quando/se).' }],
        answer: 1,
        feedback: { rule: 'Wunsch mit `esperar que` → Presente do subjuntivo: `venha`.', why: 'Der Indikativ `vem` stellt eine Tatsache fest.', avoid: 'Wunsch/Hoffnung + que → subjuntivo.' },
      },
    },
    {
      level: 'b2',
      exercise: {
        id: 'pt.pl.11', type: 'cloze', skills: ['grammar', 'writing'], difficulty: 3,
        instruction: 'Setze „ter“ in der passenden Form ein.',
        sentence: 'Quando eu ___ tempo, vou te visitar.', answers: [['tiver']], german: 'Wenn ich Zeit habe, besuche ich dich.',
        feedback: { rule: 'Zukünftige Bedingung nach `quando` → Futuro do subjuntivo: `tiver`.', why: '`tenho` (Indikativ) ist nach `quando` mit Zukunftsbezug falsch.', avoid: 'quando/se + Zukunft → futuro do subjuntivo.' },
      },
    },
    {
      level: 'b2',
      exercise: {
        id: 'pt.pl.12', type: 'mc', skills: ['grammar', 'reading'], difficulty: 3,
        prompt: 'Welcher Satz ist korrekt und idiomatisch?',
        options: [{ text: 'É importante nós estudar mais.' }, { text: 'É importante estudarmos mais.' }, { text: 'É importante que nós estudamos mais.', why: 'Nach `é importante que` steht der Subjuntivo (estudemos).' }],
        answer: 1,
        feedback: { rule: 'Persönlicher Infinitiv: `estudarmos` (Infinitiv + Personalendung).', why: '`nós estudar` fehlt die Endung; `que … estudamos` bräuchte den Subjuntivo.', avoid: 'Infinitivo pessoal: -r + mos/em.' },
      },
    },
    {
      level: 'c1',
      exercise: {
        id: 'pt.pl.13', type: 'cloze', skills: ['grammar', 'writing'], difficulty: 3,
        instruction: 'Setze „tentar“ in der passenden Form ein.',
        sentence: 'Por mais que ele ___, não conseguiu.', answers: [['tentasse']], german: 'So sehr er es auch versuchte, er schaffte es nicht.',
        feedback: { rule: '`por mais que` + Imperfeito do subjuntivo (Vergangenheit): `tentasse`.', why: 'Konzessive Konjunktionen verlangen den Subjuntivo.', avoid: 'por mais que, embora, ainda que → subjuntivo.' },
      },
    },
  ],
};
