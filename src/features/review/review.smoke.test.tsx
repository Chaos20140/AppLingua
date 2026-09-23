// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getRecord, listRecords, resetStore } from '../../data/store';
import { addSrsCard } from '../../state/actions';
import { ToastProvider } from '../../ui';
import VocabPage from '../vocab/VocabPage';
import ReviewPage from './ReviewPage';

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});
beforeEach(async () => { await resetStore(); });
afterEach(() => cleanup());

const add = (itemId: string, front: string, back: string) =>
  addSrsCard({ courseId: 'es', itemId, kind: 'vocab', front, back, source: { type: 'lesson', label: 'Lektion 1' } });

function renderAt(path: string) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/vokabeln" element={<VocabPage />} />
          <Route path="/wiederholung" element={<ReviewPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Vokabeltrainer (Smoke)', { timeout: 15_000 }, () => {
  it('leerer Zustand ohne Karten', () => {
    renderAt('/vokabeln');
    expect(screen.getByText('Noch keine Vokabeln')).toBeTruthy();
  });

  it('Karteikarten-Runde plant Karten ein und vergibt die Rundenbelohnung', async () => {
    add('es.v.hola', 'hola', 'hallo');
    add('es.v.casa', 'la casa', 'das Haus');
    renderAt('/vokabeln');
    expect(screen.getByText('2 Karten')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Jetzt wiederholen/ }));
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Antwort zeigen' }));
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Gut/ })); });
    }
    expect(await screen.findByText(/2 Karten · 2 gewusst/)).toBeTruthy();
    expect(getRecord('vocabCards', 'es:es.v.hola')?.reps).toBe(1);
    expect(listRecords('xpEvents').some((r) => r.data.reason === 'review')).toBe(true);
  });

  it('Schreiben-Modus bewertet die Eingabe', async () => {
    add('es.v.hola', 'hola', 'hallo');
    renderAt('/vokabeln');
    fireEvent.click(screen.getByText('Schreiben'));
    const input = screen.getByPlaceholderText('Deine Antwort …');
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText('Richtig!')).toBeTruthy();
  });
});

describe('Wiederholung (Smoke)', { timeout: 15_000 }, () => {
  it('zeigt „Alles wiederholt“, wenn nichts fällig ist', async () => {
    renderAt('/wiederholung');
    // Erster Render lädt den Kursinhalt (großer Chunk) – unter Last (volle Suite, parallele Builds) dauert das mehrere Sekunden.
    expect(await screen.findByText('Alles wiederholt', {}, { timeout: 12_000 })).toBeTruthy();
  });

  it('führt durch fällige Karten bis zur Zusammenfassung', async () => {
    add('es.v.hola', 'hola', 'hallo');
    renderAt('/wiederholung?schnell=1');
    fireEvent.click(await screen.findByRole('button', { name: /Los geht/ }, { timeout: 12_000 }));
    fireEvent.click(screen.getByRole('button', { name: 'Antwort zeigen' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^Leicht/ })); });
    expect(await screen.findByText(/1 von 1 richtig/)).toBeTruthy();
    expect(screen.getByText(/\+20 XP/)).toBeTruthy();
  });
});
