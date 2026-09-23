// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../../../data/store';
import { ToastProvider } from '../../../ui';
import SongExercisesPage from './SongExercisesPage';

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});
beforeEach(async () => { await resetStore(); });
afterEach(() => cleanup());

function renderAt(path: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/songs/:songId/uebungen" element={<SongExercisesPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

// Erster Test lädt den Song-Katalog (großer Chunk) – unter Last reichen 5 s Testzeit nicht.
describe('Song-Übungen (Smoke)', { timeout: 15_000 }, () => {
  it('zeigt Auswahl und startet eine gemischte Runde', async () => {
    renderAt('/songs/song.es.en-la-plaza/uebungen');
    expect(await screen.findByText('Gemischte Runde', {}, { timeout: 12_000 })).toBeTruthy();
    expect(screen.getByText('Übungsarten')).toBeTruthy();
    expect(screen.getByText('Lückentext')).toBeTruthy();
    expect(screen.getByText('Boss-Challenge')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Runde starten/ })); });
    expect(await screen.findByText(/Aufgabe 1 von 10/)).toBeTruthy();
  });

  it('startet eine einzelne Übungsart', async () => {
    renderAt('/songs/song.es.en-la-plaza/uebungen');
    const tile = await screen.findByRole('button', { name: /Diktat/ }, { timeout: 12_000 });
    await act(async () => { fireEvent.click(tile); });
    expect(await screen.findByText(/Aufgabe 1 von 8/)).toBeTruthy();
  });

  it('Boss-Challenge: Abschnitt wählen, ehrlicher Fallback ohne Sprachausgabe, Fragen im Prüfungsmodus', async () => {
    renderAt('/songs/song.es.en-la-plaza/uebungen?boss=1');
    expect(await screen.findByText('Abschnitt wählen', {}, { timeout: 12_000 })).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /herausfordern/ })); });
    expect(await screen.findByText(/keine Sprachausgabe/)).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Zu den Fragen' })); });
    expect(await screen.findByText(/Aufgabe 1 von/)).toBeTruthy();
  });

  it('unbekannter Song: ehrlicher Leerzustand', async () => {
    renderAt('/songs/song.es.gibt-es-nicht/uebungen');
    expect(await screen.findByText('Song nicht gefunden', {}, { timeout: 12_000 })).toBeTruthy();
  });
});
