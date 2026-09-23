// @vitest-environment jsdom
/**
 * Rauchtest: Die Übersichtsseiten (Dashboard, Lernpfad, Etappe, Prüfungen, Üben, Erfolge,
 * Statistik) rendern mit echtem Kursinhalt ohne Laufzeitfehler – leer und mit etwas Fortschritt.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCourse } from '../../content/registry';
import { resetStore } from '../../data/store';
import { awardXp, completeLesson } from '../../state/actions';
import { emitReward } from '../../state/rewards';
import { ToastProvider } from '../../ui';
import AchievementsPage from '../achievements/AchievementsPage';
import ExamPage from '../exams/ExamPage';
import ExamsHubPage from '../exams/ExamsHubPage';
import PathPage from '../path/PathPage';
import StagePage from '../path/StagePage';
import PracticeHubPage from '../practice/PracticeHubPage';
import RewardCenter from '../rewards/RewardCenter';
import StatsPage from '../stats/StatsPage';
import DashboardPage from './DashboardPage';

beforeAll(() => {
  const mm = (q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false });
  vi.stubGlobal('matchMedia', mm);
  window.matchMedia = mm as unknown as typeof window.matchMedia;
  class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
  vi.stubGlobal('IntersectionObserver', IO);
  vi.stubGlobal('ResizeObserver', IO);
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});

beforeEach(async () => {
  await resetStore();
});
afterEach(() => cleanup());

function renderAt(path: string, route: string, el: ReactNode) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={el} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const PAGES: [string, string, ReactNode, RegExp][] = [
  ['/dashboard', '/dashboard', <DashboardPage />, /Missionen/],
  ['/lernpfad', '/lernpfad', <PathPage />, /Welt 1/],
  ['/lernpfad/stage0', '/lernpfad/:stageId', <StagePage />, /Kapitel & Lektionen/],
  ['/lernpfad/b1', '/lernpfad/:stageId', <StagePage />, /folgen in einem Update/],
  ['/pruefungen', '/pruefungen', <ExamsHubPage />, /bestanden/],
  ['/pruefung/es.exam.s0.boss', '/pruefung/:examId', <ExamPage />, /Noch gesperrt/],
  ['/ueben', '/ueben', <PracticeHubPage />, /Schnelle Runde/],
  ['/erfolge', '/erfolge', <AchievementsPage />, /Abzeichen/],
  ['/statistik', '/statistik', <StatsPage />, /Kompetenzen/],
];

describe('Übersichtsseiten rendern', { timeout: 15_000 }, () => {
  for (const [path, route, el, expectText] of PAGES) {
    it(`${path} (leer)`, async () => {
      renderAt(path, route, el);
      expect((await screen.findAllByText(expectText, {}, { timeout: 3000 })).length).toBeGreaterThan(0);
    });
  }

  it('mit Fortschritt: Lernpfad markiert den aktuellen Knoten, Dashboard zeigt Level', async () => {
    const content = await loadCourse('es');
    const lesson = content.lessons.find((l) => l.id === 'es.s0.l01')!;
    act(() => {
      completeLesson({ courseId: 'es', lesson, scorePct: 90, bestCombo: 4, durationSec: 300 });
      awardXp(40, 'exercise', { id: 'smoke-1', courseId: 'es' });
    });
    renderAt('/lernpfad', '/lernpfad', <PathPage />);
    expect(await screen.findByText('Weiter', {}, { timeout: 3000 })).toBeTruthy();
    cleanup();
    renderAt('/dashboard', '/dashboard', <DashboardPage />);
    expect(await screen.findByText(/Lektion starten/, {}, { timeout: 3000 })).toBeTruthy();
  });

  it('RewardCenter zeigt Level-up und Abzeichen nacheinander', async () => {
    renderAt('/dashboard', '/dashboard', <RewardCenter />);
    act(() => {
      emitReward({ type: 'badges', badgeIds: ['lesson-1'] });
      emitReward({ type: 'level-up', level: 3, title: 'Neuling' });
      emitReward({ type: 'xp', amount: 10, reason: 'exercise' });
    });
    expect(await screen.findByText('Level 3 erreicht!', {}, { timeout: 3000 })).toBeTruthy();
  });
});
