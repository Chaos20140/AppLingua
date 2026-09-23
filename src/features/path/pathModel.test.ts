import { describe, expect, it } from 'vitest';
import { COURSE } from '../../engine/__fixtures__/course';
import { computeUnlocks } from '../../engine/unlock';
import { buildPathModel, connectorPath, lockInfo, offsetFor, progressIndex, worldNodes } from './pathModel';

const fresh = () => computeUnlocks(COURSE, { lessonProgress: [], examResults: [], competences: {} });

describe('pathModel', () => {
  it('baut Welten, Kapitel und Prüfungsknoten', () => {
    const worlds = buildPathModel(COURSE, fresh());
    expect(worlds.map((w) => w.stage.id)).toEqual(['stage0', 'a1', 'a2']);
    const s0 = worlds[0];
    expect(s0.chapters[0].nodes.map((n) => n.id)).toEqual(['es.s0.l01', 'es.s0.l02', 'es.exam.s0.mid']);
    expect(s0.finale.map((n) => n.id)).toEqual(['es.exam.s0.final', 'es.exam.s0.boss']);
    expect(worlds[2].chapters).toHaveLength(0);
    const nodes = worldNodes(s0);
    expect(nodes.map((n) => n.index)).toEqual(nodes.map((_, i) => i));
  });

  it('markiert den aktuellen Knoten und Sterne', () => {
    const unlock = computeUnlocks(COURSE, {
      lessonProgress: [{ courseId: 'es', lessonId: 'es.s0.l01', bestScorePct: 90, stars: 2, attempts: 1, firstCompletedAt: '2026-01-01T10:00:00Z', lastCompletedAt: '2026-01-01T10:00:00Z', bestCombo: 3 }],
      examResults: [],
      competences: {},
    });
    const worlds = buildPathModel(COURSE, unlock, { 'es.s0.l01': 2 });
    const [l1, l2] = worlds[0].chapters[0].nodes;
    expect(l1).toMatchObject({ state: 'completed', stars: 2, current: false });
    expect(l2).toMatchObject({ state: 'available', current: true });
    expect(progressIndex(worlds[0].chapters[0].nodes)).toBe(1);
  });

  it('erklärt Sperren', () => {
    const worlds = buildPathModel(COURSE, fresh());
    const l2 = worlds[0].chapters[0].nodes[1];
    expect(lockInfo(worlds, 0, l2).reasons[0]).toMatch(/Lektion „.*“ ab/);
    const a1 = worlds[1];
    expect(lockInfo(worlds, 1, a1.chapters[0].nodes[0]).reasons.length).toBeGreaterThan(1);
    expect(lockInfo(worlds, 2, null).reasons[0]).toMatch(/Update/);
    const boss = worlds[0].finale[1];
    expect(lockInfo(worlds, 0, boss).reasons[0]).toMatch(/Abschlussprüfung/);
  });

  it('berechnet die Pfad-Geometrie', () => {
    expect(offsetFor(0)).toBe(0);
    expect(offsetFor(2)).toBe(1);
    expect(offsetFor(10)).toBe(1);
    expect(connectorPath([{ x: 0, y: 0 }, { x: 10, y: 100 }])).toBe('M 0 0 C 0 50, 10 50, 10 100');
    expect(connectorPath([])).toBe('');
  });
});
