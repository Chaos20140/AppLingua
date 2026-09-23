import { describe, expect, it } from 'vitest';
import type { ErrorEntry, PronAttempt, SongProgress } from '../core/types';
import { COURSE, SONG } from './__fixtures__/course';
import { computeTopicMastery } from './competence';
import { buildDailyPlan, categoryForIssue } from './plan';
import { buildReviewSession, frequentPronIssues, indexExercises, pronItemsForIssues } from './review';
import { recommendSongs, songMastery } from './songs';
import { newCard } from './srs';
import { computeUnlocks } from './unlock';

const prog = (p: Partial<SongProgress> = {}): SongProgress => ({
  songId: SONG.id, courseId: 'es', lastPositionMs: 0, learnedLineIds: [], lineScores: {}, pronScores: {}, playCount: 0, lastPlayedAt: '', modesUsed: [], exercisesDone: 0, exerciseAccuracy: 0, ...p,
});
const prefs = { explicitFilter: true, preferredGenres: [] as string[], preferredArtists: [] as string[], speed: 'egal' as const, colloquial: 'egal' as const };
const pron = (issues: string[], scorePct = 40): PronAttempt => ({ at: '2026-09-20T10:00:00Z', courseId: 'es', itemId: 'es.p.r.perro', context: 'pronunciation', target: 'perro', method: 'speech-recognition', scorePct, issues });

describe('Song-Mastery', () => {
  it('40 % Zeilen, 25 % Übungen, 25 % Aussprache, 10 % Boss', () => {
    expect(songMastery(undefined, SONG).total).toBe(0);
    expect(songMastery(prog({ learnedLineIds: ['l01'] }), SONG).total).toBe(20);
    expect(songMastery(prog({ learnedLineIds: ['l01', 'l02', 'fremd'] }), SONG)).toMatchObject({ total: 40, learnedLines: 2, totalLines: 2 });
    expect(songMastery(prog({ exercisesDone: 1, exerciseAccuracy: 80 }), SONG).total).toBe(20);
    expect(songMastery(prog({ pronScores: { l01: 100, l02: 60 } }), SONG).total).toBe(20);
    expect(songMastery(prog({ learnedLineIds: ['l01', 'l02'], exercisesDone: 3, exerciseAccuracy: 100, pronScores: { l01: 100, l02: 100 }, bossPassedAt: 'x' }), SONG).total).toBe(100);
  });
});

describe('Song-Empfehlungen', () => {
  const songs = [
    SONG,
    { ...SONG, id: 'song.es.b1', level: 'B1' as const, title: 'Schwer' },
    { ...SONG, id: 'song.es.pop2', genre: 'Cumbia' as const, grammarTags: ['es.g.estar'] },
    { ...SONG, id: 'song.es.explicit', explicit: true },
    { ...SONG, id: 'song.pt.x', courseId: 'pt-BR' as const, variant: 'pt-BR' as const },
  ];
  it('filtert Kurs und explizite Inhalte', () => {
    const r = recommendSongs(songs, { courseId: 'es', variant: 'es-LA', level: 'Einsteiger', prefs });
    expect(r.map((x) => x.song.id)).not.toContain('song.es.explicit');
    expect(r.map((x) => x.song.id)).not.toContain('song.pt.x');
    expect(recommendSongs(songs, { courseId: 'es', variant: 'es-LA', level: 'Einsteiger', prefs: { ...prefs, explicitFilter: false } }).map((x) => x.song.id)).toContain('song.es.explicit');
  });
  it('bevorzugt passendes Niveau, Lieblingsgenre und Schwachthemen', () => {
    const r = recommendSongs(songs, { courseId: 'es', variant: 'es-LA', level: 'A1', prefs: { ...prefs, preferredGenres: ['Cumbia'] }, weakTopicIds: ['es.g.estar'] });
    expect(r[0].song.id).toBe('song.es.pop2');
    expect(r[0].reasons.join(' ')).toContain('Cumbia');
    expect(r[r.length - 1].song.id).toBe('song.es.b1');
  });
  it('gemeisterte Songs rutschen nach hinten, angefangene werden empfohlen', () => {
    const r = recommendSongs([SONG, { ...SONG, id: 'song.es.neu' }], {
      courseId: 'es', variant: 'es-LA', level: 'A1', prefs,
      progress: { [SONG.id]: prog({ playCount: 3, learnedLineIds: ['l01', 'l02'], exercisesDone: 3, exerciseAccuracy: 100, pronScores: { l01: 100, l02: 100 }, bossPassedAt: 'x', completedAt: 'x' }) },
    });
    expect(r[0].song.id).toBe('song.es.neu');
    const r2 = recommendSongs([SONG, { ...SONG, id: 'song.es.neu' }], { courseId: 'es', variant: 'es-LA', level: 'A1', prefs, progress: { [SONG.id]: prog({ playCount: 1, learnedLineIds: ['l01'] }) } });
    expect(r2[0].song.id).toBe(SONG.id);
    expect(r2[0].reasons.join(' ')).toContain('Weiterlernen');
  });
});

describe('Wiederholungssitzung', () => {
  const now = new Date(2026, 8, 21, 12);
  const card = newCard({ courseId: 'es', itemId: 'es.v.hola', kind: 'vocab', front: 'hola', back: 'hallo', source: { type: 'lesson' } }, new Date(2026, 8, 20));
  const err = (exerciseId: string, count = 2): ErrorEntry => ({
    courseId: 'es', exerciseId, context: 'lesson', skill: 'grammar', topicIds: [], prompt: '', userAnswer: '', correctAnswer: '',
    explanation: { what: '', why: '', rule: '', correct: '', avoid: '' }, count, firstAt: '2026-09-01', lastAt: '2026-09-02', correctSince: 0,
  });
  const weakAnswers = Array.from({ length: 5 }, (_, i) => ({ at: `2026-09-1${i}T10:00:00Z`, courseId: 'es' as const, exerciseId: 'q', exerciseType: 'cloze', context: 'lesson' as const, skills: ['grammar' as const], topicIds: ['es.g.estar'], correct: false }));

  it('mischt fällige Karten, offene Fehler, schwache Themen und Aussprache', () => {
    const s = buildReviewSession({
      courseId: 'es', content: COURSE, cards: [card],
      errors: [err('es.s0.l01.g02', 3), { ...err('es.s0.l02.g01'), resolvedAt: 'x' }, err('gibt-es-nicht')],
      topicMastery: computeTopicMastery(weakAnswers, 'es'),
      pronAttempts: [pron(['rr']), pron(['rr']), pron(['j'], 90)],
    }, { now, variant: 'es-LA' });
    expect(s.cards.map((c) => c.itemId)).toEqual(['es.v.hola']);
    expect(s.items.find((i) => i.reason === 'error')?.exercise.id).toBe('es.s0.l01.g02');
    expect(s.items.filter((i) => i.reason === 'error')).toHaveLength(1); // behobene/unbekannte ausgelassen
    expect(s.items.some((i) => i.reason === 'weak-topic' && i.exercise.topicIds?.includes('es.g.estar'))).toBe(true);
    const p = s.items.find((i) => i.reason === 'pronunciation');
    expect(p?.exercise).toMatchObject({ type: 'speak', pronItemId: 'es.p.r.perro' });
    expect(new Set(s.exercises.map((e) => e.id)).size).toBe(s.exercises.length);
    expect(s.items[0].reason).toBe('error'); // Interleaving beginnt mit Fehlern
    expect(s.empty).toBe(false);
  });
  it('sanfter Modus begrenzt die Menge; leere Sitzung wird erkannt', () => {
    const cards = Array.from({ length: 30 }, (_, i) => ({ ...card, itemId: `c${i}` }));
    expect(buildReviewSession({ courseId: 'es', content: COURSE, cards, errors: [], topicMastery: {}, pronAttempts: [] }, { now, gentle: true }).cards).toHaveLength(10);
    expect(buildReviewSession({ courseId: 'es', content: COURSE, cards: [], errors: [], topicMastery: {}, pronAttempts: [] }, { now }).empty).toBe(true);
  });
  it('Hilfsfunktionen', () => {
    expect(indexExercises(COURSE).get('es.exam.s0.boss.01')?.source.type).toBe('exam');
    expect(frequentPronIssues([pron(['rr', 'stress']), pron(['rr']), pron(['j'], 95)])).toEqual([{ code: 'rr', count: 2 }, { code: 'stress', count: 1 }]);
    expect(pronItemsForIssues(COURSE, ['j']).map((p) => p.id)).toEqual(['es.p.j.jamon']);
    expect(categoryForIssue(COURSE, 'rr')?.id).toBe('es.pc.r');
  });
});

describe('Tagesplan', () => {
  const unlock = computeUnlocks(COURSE, { lessonProgress: [], examResults: [], competences: {} });
  const baseInput = {
    courseId: 'es' as const, content: COURSE, unlock, dueCount: 0, topicMastery: {}, pronAttempts: [] as PronAttempt[],
    lastActiveBefore: null, today: '2026-09-21', dailyGoalXp: 50, todayXp: 0, hasHistory: false,
  };
  it('neuer Nutzer: erste Lektion', () => {
    const p = buildDailyPlan(baseInput);
    expect(p.items[0]).toMatchObject({ kind: 'lesson', route: '/lektion/es.s0.l01' });
    expect(p.headline).toContain('ersten Lektion');
    expect(p.comeback).toBeNull();
  });
  it('enthält Wiederholung, schwächstes Grammatikthema, Aussprache-Problem und Song', () => {
    const weak = Array.from({ length: 4 }, () => ({ at: '2026-09-20T10:00:00Z', courseId: 'es' as const, exerciseId: 'q', exerciseType: 'cloze', context: 'lesson' as const, skills: ['grammar' as const], topicIds: ['es.g.ser'], correct: false }));
    const p = buildDailyPlan({
      ...baseInput, hasHistory: true, lastActiveBefore: '2026-09-20', dueCount: 12, todayXp: 20,
      topicMastery: computeTopicMastery(weak), pronAttempts: [pron(['rr']), pron(['rr'])], song: { song: SONG, reason: 'Passt zu deinem Niveau (A1)' },
    });
    expect(p.items.map((i) => i.kind)).toEqual(['lesson', 'review', 'grammar', 'pronunciation', 'song']);
    expect(p.items[1].title).toBe('12 Karten wiederholen');
    expect(p.items[2].route).toBe('/grammatik/es.g.ser');
    expect(p.items[3].route).toBe('/aussprache/es.pc.r');
    expect(p.headline).toBe('Noch 30 XP bis zu deinem Tagesziel');
    expect(p.totalMinutes).toBeGreaterThan(0);
  });
  it('Wiedereinstieg nach ≥ 3 Tagen: sanft, reduziertes Ziel, freundlicher Text', () => {
    const p = buildDailyPlan({ ...baseInput, hasHistory: true, lastActiveBefore: '2026-09-15', dueCount: 40, dailyGoalXp: 100 });
    expect(p.comeback).toMatchObject({ daysAway: 6 });
    expect(p.comeback!.message).toContain('kein Problem');
    expect(p.goalXp).toBe(50);
    expect(p.items[0]).toMatchObject({ kind: 'review', title: 'Sanfte Wiederholung: 10 Karten' });
    expect(p.items.length).toBeLessThanOrEqual(3);
    expect(buildDailyPlan({ ...baseInput, hasHistory: true, lastActiveBefore: '2026-09-19' }).comeback).toBeNull();
  });
});
