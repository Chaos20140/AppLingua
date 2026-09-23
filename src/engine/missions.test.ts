import { describe, expect, it } from 'vitest';
import type { AnswerEvent, XpEvent } from '../core/types';
import { addDays, weekKey } from './dates';
import { MISSIONS, buildPeriodData, checkClaim, missionStatuses, periodOfKey, selectMissions, type MissionSource } from './missions';
import { XP_IDS } from './xp';

const empty = (): MissionSource => ({ xpEvents: [], answers: [], pronAttempts: [], partnerSessions: [], songExerciseResults: [], examResults: [], vocabCards: [], dailyGoalXp: 50 });
const answer = (at: string, p: Partial<AnswerEvent> = {}): AnswerEvent => ({ at, courseId: 'es', exerciseId: 'x', exerciseType: 'mc', context: 'lesson', skills: ['grammar'], topicIds: [], correct: true, ...p });
const xp = (at: string, amount: number, reason: XpEvent['reason'], ref?: string): XpEvent => ({ at, amount, reason, ref });

describe('Missionen – Auswahl', () => {
  it('täglich und wöchentlich je 3, deterministisch je Periode', () => {
    for (let i = 0; i < 60; i++) {
      const day = addDays('2026-01-01', i);
      const d = selectMissions(day);
      expect(d).toHaveLength(3);
      expect(selectMissions(day).map((m) => m.id)).toEqual(d.map((m) => m.id));
      expect(d.filter((m) => m.core)).toHaveLength(1);
      expect(new Set(d.map((m) => m.category)).size).toBe(3);
      expect(d.filter((m) => m.category.startsWith('song-')).length).toBeLessThanOrEqual(1);
      expect(d.every((m) => m.period === 'daily')).toBe(true);
      const w = selectMissions(weekKey(day));
      expect(w).toHaveLength(3);
      expect(w.every((m) => m.period === 'weekly')).toBe(true);
    }
  });
  it('Auswahl variiert über die Tage und deckt Songs, Aussprache, KI-Gespräch ab', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 120; i++) selectMissions(addDays('2026-01-01', i)).forEach((m) => seen.add(m.id));
    for (const id of ['d.song-lines', 'd.song-sing', 'd.song-exercise', 'd.pron', 'd.partner', 'd.review', 'd.grammar', 'd.lesson']) expect(seen).toContain(id);
  });
  it('Periodenschlüssel', () => {
    expect(periodOfKey('2026-09-21')).toBe('daily');
    expect(periodOfKey('2026-W39')).toBe('weekly');
    expect(periodOfKey('quatsch')).toBeNull();
    expect(MISSIONS.every((m) => m.xp === 30 || m.xp === 50 || m.xp === 150)).toBe(true);
  });
});

describe('Missionen – Fortschritt & Einlösen', () => {
  const day = '2026-09-21';
  it('misst nur Ereignisse der Periode', () => {
    const src = empty();
    src.answers = [answer(`${day}T10:00:00`), answer(`${day}T11:00:00`, { correct: false }), answer('2026-09-20T10:00:00')];
    src.xpEvents = [xp(`${day}T10:00:00`, 50, 'lesson', 'es.s0.l01'), xp(`${day}T10:05:00`, 30, 'mission'), xp('2026-09-20T10:00:00', 50, 'lesson', 'es.s0.l02')];
    const d = buildPeriodData(src, day);
    expect(d.answers).toHaveLength(2);
    const byId = new Map(MISSIONS.map((m) => [m.id, m]));
    expect(byId.get('d.correct')!.measure(d)).toBe(1);
    expect(byId.get('d.lesson')!.measure(d)).toBe(1);
    expect(byId.get('d.goal')!.measure(d)).toBe(50); // Missions-XP zählen nicht
    const w = buildPeriodData(src, weekKey(day));
    expect(byId.get('w.lessons')!.measure(w)).toBe(1); // 2026-09-20 gehört zur Vorwoche
  });
  it('Status und idempotentes Einlösen', () => {
    const src = empty();
    // alles erfüllen, was im Pool vorkommen kann
    src.answers = Array.from({ length: 30 }, (_, i) => answer(`${day}T10:${String(i).padStart(2, '0')}:00`, { context: i < 12 ? 'review' : i < 24 ? 'vocab' : 'grammar', skills: ['grammar', 'listening'] }));
    src.xpEvents = [xp(`${day}T09:00:00`, 60, 'lesson', 'es.s0.l01'), ...Array.from({ length: 3 }, (_, i) => xp(`${day}T09:1${i}:00`, 5, 'song-line', 'song.es.x'))];
    src.pronAttempts = Array.from({ length: 5 }, () => ({ at: `${day}T12:00:00`, courseId: 'es' as const, itemId: 'p', context: 'song' as const, target: 'x', method: 'speech-recognition' as const, scorePct: 80, issues: [] }));
    src.partnerSessions = [{ at: `${day}T13:00:00`, courseId: 'es', scenarioId: 's', mode: 'offline', prefs: { level: 'A1', formal: false, speed: 'normal', correction: 'sofort', translations: true }, turns: [{ role: 'user', text: 'Hola' }, { role: 'user', text: 'Quiero un café' }] }];
    src.songExerciseResults = [{ at: `${day}T14:00:00`, songId: 'song.es.x', exerciseType: 'cloze', correct: 3, total: 4 }];
    const st = missionStatuses(src, day, new Set());
    expect(st).toHaveLength(3);
    expect(st.every((m) => m.completed && !m.claimed && m.ratio === 1)).toBe(true);

    const first = st[0];
    const ok = checkClaim(src, first.id, day, day, new Set());
    expect(ok).toMatchObject({ ok: true, xp: first.xp, rewardId: XP_IDS.mission(day, first.id) });
    const again = checkClaim(src, first.id, day, day, new Set([first.rewardId]));
    expect(again).toEqual({ ok: false, reason: 'Belohnung bereits abgeholt.' });
    expect(missionStatuses(src, day, new Set([first.rewardId]))[0].claimed).toBe(true);
  });
  it('lehnt unerfüllte, fremde und abgelaufene Missionen ab', () => {
    const src = empty();
    const m = selectMissions(day)[0];
    expect(checkClaim(src, m.id, day, day, new Set())).toMatchObject({ ok: false, reason: 'Die Mission ist noch nicht erfüllt.' });
    const foreign = MISSIONS.find((x) => x.period === 'daily' && !selectMissions(day).includes(x))!;
    expect(checkClaim(src, foreign.id, day, day, new Set())).toMatchObject({ ok: false });
    expect(checkClaim(src, m.id, '2026-09-01', day, new Set())).toMatchObject({ ok: false });
    expect(checkClaim(src, m.id, 'kaputt', day, new Set())).toMatchObject({ ok: false, reason: 'Unbekannter Zeitraum.' });
  });
});
