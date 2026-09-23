import { describe, expect, it } from 'vitest';
import type { UserSongText } from '../../../core/types';
import type { Exercise, Song } from '../../../content/types';
import demoSongs from '../../../content/songs';
import { fillGaps } from '../../../engine/grading';
import { looseKey, normalize } from '../../../engine/text';
import { userTextToSong } from '../userText';
import {
  availableKinds, bossSections, buildPool, checkExercise, generateBoss, generateKind, generateMixed, generateReview,
  generateRound, isAnnotated, KIND_ROUND, lineIdsForExercises, lineWeakness, MIXED_ROUND, parseVerbAnalysis,
  SONG_EX_KINDS, vocabFor, weakLines, type SongExercise, type SongExKind,
} from './generator';

const all = (pool: Record<SongExKind, SongExercise[]>) => SONG_EX_KINDS.flatMap((k) => pool[k.key]);
const ID_RE = (song: Song) => new RegExp(`^${song.id.replace(/\./g, '\\.')}\\.x\\.[a-z]+\\.\\d+$`);

function userSong(lyrics: string, extra: Partial<UserSongText> = {}): Song {
  return userTextToSong('t1', {
    title: 'Mi canción', artist: 'Yo', courseId: 'es', variant: 'es-ES', lyrics,
    createdAt: '2026-01-01T00:00:00.000Z', privateUseConfirmed: true, ...extra,
  });
}

const USER_LYRICS = [
  '[Strophe]',
  'Camino despacio por la ciudad dormida',
  'Las luces brillan sobre el agua tranquila',
  'Pienso en tu sonrisa y en la noche perdida',
  '[Refrain]',
  'Canto bajito una canción sencilla',
  'Bailamos juntos hasta la mañana',
  'El viento lleva mi voz lejana',
].join('\n');

/** Alle sichtbaren Texte einer Übung (für „undefined“-/Sicherheitsprüfungen) */
function texts(ex: Exercise): string[] {
  const f = [ex.feedback.rule, ex.feedback.why ?? '', ex.feedback.avoid ?? '', ex.instruction ?? ''];
  switch (ex.type) {
    case 'mc': return [...f, ex.prompt, ...ex.options.flatMap((o) => [o.text, o.why ?? ''])];
    case 'cloze': return [...f, ex.sentence, ...(ex.bank ?? []), ex.german ?? ''];
    case 'order': return [...f, ...ex.tokens, ex.german];
    case 'listening': return [...f, ex.audio, ex.question, ...ex.options];
    case 'dictation': return [...f, ex.audio, ex.german ?? ''];
    case 'speak': return [...f, ex.text, ex.german];
    case 'dialogue': return [...f, ...ex.lines.flatMap((l) => [l.text, l.german ?? '']), ...(ex.options ?? [])];
    case 'matchPairs': return [...f, ...ex.pairs.flatMap((p) => [p.left, p.right])];
    case 'conjugate': return [...f, ex.verb, ex.person, ex.tense, ex.sentence ?? ''];
    default: return f;
  }
}

describe('Song-Übungsgenerator – Demo-Lernlieder', () => {
  it('gibt es überhaupt Demo-Songs mit Erklärungen', () => {
    expect(demoSongs.length).toBeGreaterThan(0);
    for (const s of demoSongs) expect(isAnnotated(s)).toBe(true);
  });

  for (const song of demoSongs) {
    describe(song.id, () => {
      const pool = buildPool(song, 'test-seed');
      const items = all(pool);
      const topicIds = new Set(song.lines.flatMap((l) => l.explanation.grammar.map((g) => g.topicId).filter(Boolean)));

      it('erzeugt nur gültige Übungen (Struktur + Musterlösung wird als richtig bewertet)', () => {
        expect(items.length).toBeGreaterThan(20);
        for (const se of items) expect(checkExercise(se.exercise)).toEqual([]);
      });

      it('vergibt eindeutige, stabile IDs im Format <songId>.x.<typ>.<n>', () => {
        const ids = items.map((x) => x.exercise.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(id).toMatch(ID_RE(song));
        const other = all(buildPool(song, 'anderer-seed')).map((x) => x.exercise.id).sort();
        expect(other).toEqual([...ids].sort());
      });

      it('setzt Kompetenzen, Feedback und nur existierende Themen', () => {
        for (const { exercise: ex } of items) {
          expect(ex.skills.length).toBeGreaterThan(0);
          expect(ex.feedback.rule.trim().length).toBeGreaterThan(5);
          for (const t of ex.topicIds ?? []) expect(topicIds.has(t)).toBe(true);
          for (const t of texts(ex)) {
            expect(t).not.toMatch(/undefined|null|\[object/);
          }
          expect(ex.variant).toBeUndefined();
        }
      });

      it('hat Lückentext, Anordnen, Hören, Zuordnen, Verben, Grammatik, Diktat und Aussprache', () => {
        for (const k of ['cloze', 'order', 'heard', 'match', 'verbs', 'grammar', 'dictation', 'speak'] as SongExKind[]) {
          expect(pool[k].length, k).toBeGreaterThan(0);
        }
      });

      it('Lückentext: genau eine Lücke, Lösung in der Wortbank, eingesetzt ergibt sich die Zeile', () => {
        for (const se of pool.cloze) {
          const ex = se.exercise;
          if (ex.type !== 'cloze') throw new Error('Typ');
          const line = song.lines.find((l) => l.id === se.lineIds[0])!;
          expect(fillGaps(ex.sentence, [ex.answers[0][0]])).toBe(line.text);
          expect(ex.bank!.map((b) => b.toLowerCase())).toContain(ex.answers[0][0].toLowerCase());
          expect(ex.bank!.length).toBeGreaterThanOrEqual(3);
          // Ablenker kommen nicht in derselben Zeile vor
          const lineWords = new Set(normalize(line.text).split(' '));
          for (const b of ex.bank!) if (looseKey(b) !== looseKey(ex.answers[0][0])) expect(lineWords.has(normalize(b))).toBe(false);
          expect(looseKey(ex.german ?? '')).toBe(looseKey(line.natural));
        }
      });

      it('Gehörte Wörter: richtige Option steht in der Zeile, Ablenker nicht', () => {
        for (const se of pool.heard) {
          const ex = se.exercise;
          if (ex.type !== 'listening') throw new Error('Typ');
          const lineKeys = new Set(normalize(ex.audio).split(' ').map(looseKey));
          ex.options.forEach((o, i) => expect(lineKeys.has(looseKey(o))).toBe(i === ex.answer));
        }
      });

      it('Zuordnen: 3–4 Paare mit eindeutigen Seiten aus Zeile ↔ natürlicher Übersetzung', () => {
        for (const se of pool.match) {
          const ex = se.exercise;
          if (ex.type !== 'matchPairs') throw new Error('Typ');
          expect(ex.pairs.length).toBeGreaterThanOrEqual(3);
          expect(ex.pairs.length).toBeLessThanOrEqual(4);
          for (const p of ex.pairs) expect(song.lines.some((l) => l.text === p.left && looseKey(l.natural) === looseKey(p.right))).toBe(true);
        }
      });

      it('Verben: Infinitiv-Frage nennt die richtige Grundform, Konjugation die Form aus dem Song', () => {
        for (const se of pool.verbs) {
          const ex = se.exercise;
          const line = song.lines.find((l) => l.id === se.lineIds[0])!;
          if (ex.type === 'mc') {
            const correct = ex.options[ex.answer].text;
            expect(line.verbs!.some((v) => v.infinitive === correct)).toBe(true);
          } else if (ex.type === 'conjugate') {
            expect(line.verbs!.some((v) => v.form === ex.answers[0] && v.infinitive === ex.verb)).toBe(true);
            if (ex.sentence) expect(fillGaps(ex.sentence, ex.answers).toLowerCase()).toBe(line.text.toLowerCase());
          } else throw new Error(`unerwarteter Typ ${ex.type}`);
        }
      });

      it('Grammatik: richtige Option ist eine Erklärung der Zeile, Ablenker gehören zu anderen Zeilen', () => {
        for (const se of pool.grammar) {
          const ex = se.exercise;
          if (ex.type !== 'mc') throw new Error('Typ');
          const line = song.lines.find((l) => l.id === se.lineIds[0])!;
          const own = line.explanation.grammar.map((g) => looseKey(g.title));
          ex.options.forEach((o, i) => {
            expect(own.includes(looseKey(o.text))).toBe(i === ex.answer);
            if (i !== ex.answer) expect(o.why).toMatch(/anderen Zeile/);
          });
        }
      });

      it('Diktat und Aussprache nutzen die Zeile als Ziel', () => {
        for (const se of pool.dictation) {
          const ex = se.exercise;
          if (ex.type !== 'dictation') throw new Error('Typ');
          expect(ex.answers[0]).toBe(ex.audio);
        }
        for (const se of pool.speak) {
          const ex = se.exercise;
          if (ex.type !== 'speak') throw new Error('Typ');
          expect(song.lines.some((l) => l.text === ex.text)).toBe(true);
          expect(ex.feedback.why).toMatch(/keine phonetische Analyse/);
        }
      });

      it('Vokabel-Fokus: gültige Karten mit Vorder- und Rückseite', () => {
        for (const se of items) for (const v of se.vocab) {
          expect(v.itemId.startsWith(`song:${song.id}:`)).toBe(true);
          expect(v.front.trim()).not.toBe('');
          expect(v.back.trim()).not.toBe('');
        }
      });

      it('ist deterministisch je Seed', () => {
        expect(buildPool(song, 42)).toEqual(buildPool(song, 42));
        expect(generateMixed(song, { seed: 7 })).toEqual(generateMixed(song, { seed: 7 }));
      });

      it('Boss: Abschnitte mit Bedeutungsfragen (Audio, ohne Text) und Schlüsselwörtern', () => {
        const sections = bossSections(song);
        expect(sections.length).toBeGreaterThan(0);
        for (const sec of sections) {
          const boss = generateBoss(song, sec.id, { seed: 1 });
          expect(boss.length).toBeGreaterThanOrEqual(3);
          expect(boss.length).toBeLessThanOrEqual(9);
          const ids = boss.map((b) => b.exercise.id);
          expect(new Set(ids).size).toBe(ids.length);
          for (const b of boss) {
            expect(checkExercise(b.exercise)).toEqual([]);
            expect(b.kind).toBe('boss');
            const ex = b.exercise;
            if (ex.type !== 'mc') throw new Error('Typ');
            if (ex.audio) {
              // keine Hilfe: der gehörte Text steht nicht in der Frage
              expect(ex.prompt).not.toContain(ex.audio);
              const line = song.lines.find((l) => l.text === ex.audio && sec.lineIds.includes(l.id));
              expect(line, ex.audio).toBeDefined();
              expect(looseKey(ex.options[ex.answer].text)).toBe(looseKey(line!.natural));
            }
          }
          expect(boss.some((b) => b.exercise.type === 'mc' && !!b.exercise.audio)).toBe(true);
          expect(generateBoss(song, sec.id, { seed: 1 })).toEqual(boss);
        }
        expect(generateBoss(song, 'gibt-es-nicht')).toEqual([]);
      });
    });
  }

  it('Redewendungen und Alltagsdialoge kommen in den Demo-Songs vor', () => {
    const pools = demoSongs.map((s) => buildPool(s, 3));
    expect(pools.some((p) => p.idioms.length > 0)).toBe(true);
    expect(pools.some((p) => p.dialogue.length > 0)).toBe(true);
    for (const p of pools) for (const se of p.dialogue) {
      const ex = se.exercise;
      if (ex.type !== 'dialogue') throw new Error('Typ');
      expect(ex.gapIndex).toBe(1);
      expect(ex.options![ex.answer!]).toBe(ex.lines[1].text);
      expect(ex.lines[0].speaker).not.toBe(ex.lines[1].speaker);
      expect(ex.instruction).toMatch(/Du möchtest sagen/);
    }
  });
});

describe('Runden', () => {
  const song = demoSongs[1];

  it('gemischte Runde: 10 verschiedene Aufgaben aus mehreren Arten, Deckel für Sprechen', () => {
    for (const seed of [1, 2, 3, 'x']) {
      const round = generateMixed(song, { seed });
      expect(round.length).toBe(MIXED_ROUND);
      const ids = round.map((r) => r.exercise.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(round.map((r) => r.kind)).size).toBeGreaterThanOrEqual(5);
      expect(round.filter((r) => r.kind === 'speak').length).toBeLessThanOrEqual(2);
      expect(round.filter((r) => r.kind === 'match').length).toBeLessThanOrEqual(1);
      for (let i = 1; i < round.length; i++) expect(round[i].kind === round[i - 1].kind && round[i].exercise.type === round[i - 1].exercise.type).toBe(false);
    }
    const a = generateMixed(song, { seed: 1 }).map((r) => r.exercise.id);
    const b = generateMixed(song, { seed: 2 }).map((r) => r.exercise.id);
    expect(a).not.toEqual(b);
  });

  it('einzelne Art: höchstens 8 Aufgaben dieser Art', () => {
    for (const k of SONG_EX_KINDS) {
      const round = generateKind(song, k.key, { seed: 5 });
      expect(round.length).toBeLessThanOrEqual(KIND_ROUND);
      for (const r of round) expect(r.kind).toBe(k.key);
    }
    expect(generateRound(song, 'cloze', { seed: 5 })).toEqual(generateKind(song, 'cloze', { seed: 5 }));
    expect(generateRound(song, 'mixed', { seed: 5 })).toEqual(generateMixed(song, { seed: 5 }));
  });

  it('availableKinds nennt nur Arten mit Aufgaben und die Rundengröße', () => {
    const kinds = availableKinds(buildPool(song, 0));
    expect(kinds.length).toBeGreaterThanOrEqual(8);
    for (const k of kinds) {
      expect(k.available).toBeGreaterThan(0);
      expect(k.roundSize).toBe(Math.min(KIND_ROUND, k.available));
    }
  });

  it('Schwierige Stellen: niedrige Punktzahlen und offene Fehler werden bevorzugt', () => {
    const lineScores = Object.fromEntries(song.lines.map((l) => [l.id, 100]));
    const pronScores = Object.fromEntries(song.lines.map((l) => [l.id, 100]));
    const weakA = song.lines[2];
    const weakB = song.lines[5];
    lineScores[weakA.id] = 20;
    pronScores[weakA.id] = 10;
    lineScores[weakB.id] = 90;
    const focus = { lineScores, pronScores, errorLineIds: [weakB.id] };
    const w = lineWeakness(song, focus);
    expect(w.get(weakA.id)).toBe(85);
    expect(w.get(weakB.id)).toBeCloseTo(40, 5);
    expect(w.get(song.lines[0].id)).toBe(0);
    expect(weakLines(song, focus).map((l) => l.id)).toEqual([weakA.id, weakB.id]);

    const review = generateReview(song, { seed: 9, focus });
    expect(review.length).toBeGreaterThan(0);
    expect(review.length).toBeLessThanOrEqual(4);
    for (const r of review) expect([weakA.id, weakB.id]).toContain(r.lineIds[0]);
    const forA = review.filter((r) => r.lineIds[0] === weakA.id);
    expect(new Set(forA.map((r) => r.kind)).size).toBe(forA.length);
  });

  it('ohne Fortschritt gelten schwierigere Zeilen als Wiederholungskandidaten', () => {
    const review = generateReview(song, { seed: 1 });
    expect(review.length).toBeGreaterThan(0);
    expect(review.length).toBeLessThanOrEqual(10);
  });

  it('gemischte Runde bevorzugt schwache Zeilen', () => {
    const lineScores = Object.fromEntries(song.lines.map((l, i) => [l.id, i === 3 ? 0 : 100]));
    let hits = 0;
    for (let seed = 0; seed < 20; seed++) {
      if (generateMixed(song, { seed, focus: { lineScores, pronScores: lineScores } }).some((r) => r.lineIds.includes(song.lines[3].id))) hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(15);
  });

  it('sammelt verpasste Wörter eindeutig je Karte', () => {
    const round = generateKind(song, 'cloze', { seed: 2 });
    const ids = round.map((r) => r.exercise.id);
    const v = vocabFor(round, [...ids, ...ids, 'fremd']);
    expect(v.length).toBeGreaterThan(0);
    expect(new Set(v.map((x) => x.itemId)).size).toBe(v.length);
    expect(vocabFor(round, [])).toEqual([]);
  });

  it('ordnet Übungs-IDs wieder ihren Zeilen zu (Fehlerarchiv)', () => {
    const pool = buildPool(song, 0);
    const ex = pool.dictation[1];
    expect(lineIdsForExercises(song, [ex.exercise.id, 'fremd.id'])).toEqual(ex.lineIds);
    expect(lineIdsForExercises(song, [])).toEqual([]);
  });
});

describe('Eigene Texte ohne Glossar', () => {
  const song = userSong(USER_LYRICS);

  it('bietet nur Lückentext, Anordnen, Diktat, gehörte Wörter und Aussprache', () => {
    expect(isAnnotated(song)).toBe(false);
    const pool = buildPool(song, 1);
    for (const k of ['match', 'verbs', 'grammar', 'idioms', 'dialogue'] as SongExKind[]) expect(pool[k]).toEqual([]);
    for (const k of ['cloze', 'order', 'heard', 'dictation', 'speak'] as SongExKind[]) expect(pool[k].length, k).toBeGreaterThan(0);
    for (const se of all(pool)) {
      expect(checkExercise(se.exercise)).toEqual([]);
      expect(se.vocab).toEqual([]);
      for (const t of texts(se.exercise)) expect(t).not.toMatch(/undefined|null/);
    }
    expect(bossSections(song)).toEqual([]);
    expect(generateBoss(song, song.sections[0]?.id ?? 's1')).toEqual([]);
  });

  it('Lückentext nutzt Inhaltswörter statt Funktionswörter', () => {
    const pool = buildPool(song, 1);
    for (const se of pool.cloze) {
      const ex = se.exercise;
      if (ex.type !== 'cloze') throw new Error('Typ');
      const w = normalize(ex.answers[0][0]);
      expect(['la', 'el', 'por', 'en', 'y', 'sobre', 'las', 'mi', 'tu', 'una', 'hasta']).not.toContain(w);
      expect(w.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('gemischte Runde funktioniert auch für eigene Texte', () => {
    const round = generateMixed(song, { seed: 4 });
    expect(round.length).toBe(MIXED_ROUND);
    for (const r of round) expect(['cloze', 'order', 'heard', 'dictation', 'speak']).toContain(r.kind);
  });

  it('Markdown-Zeichen aus Nutzertext landen nicht als Formatierung im Feedback', () => {
    const s = userSong('Canto *fuerte* con `alma` y corazón\nLa noche _oscura_ me llama despacio\nCamino solo por la calle vacía');
    for (const se of all(buildPool(s, 2))) {
      const rule = se.exercise.feedback.rule;
      expect(rule.replace(/`[^`]*`/g, '')).not.toMatch(/[*_]/);
      expect((rule.match(/`/g) ?? []).length % 2).toBe(0);
    }
  });

  it('sehr kurze Texte liefern ehrlich wenig oder nichts – aber nie ungültige Übungen', () => {
    const tiny = userSong('Hola');
    const pool = buildPool(tiny, 1);
    expect(all(pool)).toEqual([]);
    expect(generateMixed(tiny, { seed: 1 })).toEqual([]);
    expect(generateReview(tiny, { seed: 1 })).toEqual([]);
  });

  it('Portugiesisch: eigene Texte nutzen portugiesische Füllwörter', () => {
    const pt = userSong('Eu caminho devagar pela cidade vazia\nA noite brilha sobre o mar tranquilo\nTeu sorriso ilumina minha janela', { courseId: 'pt-BR', variant: 'pt-BR' });
    const pool = buildPool(pt, 3);
    expect(pool.cloze.length).toBeGreaterThan(0);
    for (const se of pool.cloze) {
      const ex = se.exercise;
      if (ex.type !== 'cloze') throw new Error('Typ');
      expect(['eu', 'pela', 'a', 'o', 'sobre', 'teu', 'minha']).not.toContain(normalize(ex.answers[0][0]));
    }
  });
});

describe('parseVerbAnalysis', () => {
  it('erkennt Zeitform und Person', () => {
    expect(parseVerbAnalysis('Präsens, 3. Person Singular – regelmäßiges -er-Verb', 'es', 'es-LA')).toEqual({ tense: 'Präsens', person: 'él/ella/usted' });
    expect(parseVerbAnalysis('Präsens, 1. Person Plural (nosotros) – als Vorschlag', 'es', 'es-ES')).toEqual({ tense: 'Präsens', person: 'nosotros' });
    expect(parseVerbAnalysis('Presente, 1. Person Singular – unregelmäßig', 'pt', 'pt-BR')).toEqual({ tense: 'Präsens', person: 'eu' });
    expect(parseVerbAnalysis('Präsens, 2. Person Plural', 'es', 'es-LA')).toEqual({ tense: 'Präsens', person: 'ustedes' });
    expect(parseVerbAnalysis('Präsens, 2. Person Plural (vosotros) – unregelmäßig', 'es', 'es-ES')).toEqual({ tense: 'Präsens', person: 'vosotros' });
  });

  it('lässt unsichere Fälle aus (Imperativ, reflexiv, Kurzformen, Infinitiv, unpersönlich)', () => {
    for (const a of [
      'Imperativ, 2. Person Singular (tú) – unregelmäßig',
      'Präsens, 1. Person Singular – reflexiv (me ducho)',
      'Presente, 3. Person Singular – gesprochene Kurzform von „está“',
      'Infinitiv nach al',
      'unpersönlich „es gibt“',
      'Befehlsform (umgangssprachlich, du) – „komm!“',
      'Gerundium',
    ]) expect(parseVerbAnalysis(a, 'es', 'es-ES')).toBeNull();
  });
});
