// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listRecords, resetStore } from '../../data/store';
import type { Exercise } from '../../content/types';
import { ToastProvider } from '../../ui';
import { loadCourse } from '../../content/registry';
import AiChatExercise from './AiChatExercise';
import PartnerChatPage from './PartnerChatPage';
import PartnerHubPage from './PartnerHubPage';

// Kursinhalte vorab laden – der erste dynamische Import dauert im vollen Testlauf > 1 s
beforeAll(async () => { await loadCourse('es'); }, 30_000);
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = (() => {}) as typeof window.scrollTo;
});
beforeEach(async () => { await resetStore(); });
afterEach(() => cleanup());

const prefs = { level: 'Einsteiger', formal: false, speed: 'normal', correction: 'sofort', translations: true };

function renderAt(path: string, state?: unknown) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[{ pathname: path, state }]}>
        <Routes>
          <Route path="/partner" element={<PartnerHubPage />} />
          <Route path="/partner/:scenarioId" element={<PartnerChatPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Sprachpartner (Smoke)', { timeout: 15_000 }, () => {
  it('zeigt die Szenarien des aktiven Kurses und den ehrlichen Modus', async () => {
    renderAt('/partner');
    expect(await screen.findByText('Alltag – lockeres Gespräch')).toBeTruthy();
    expect(screen.getByText('Geführter Offline-Dialog')).toBeTruthy();
    expect(screen.getByText('Noch keine Gespräche')).toBeTruthy();
  });

  it('führt einen Offline-Dialog, wertet aus und speichert das Gespräch', async () => {
    renderAt('/partner/es.sc.alltag', { prefs, mode: 'offline' });
    expect(await screen.findByText(/Soy Lucía/)).toBeTruthy();
    const input = screen.getByLabelText('Deine Antwort') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Hola, me llamo Tom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    expect(await screen.findByText('¡Encantada!')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'Ich weiß nicht' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(await screen.findByText(/so könntest du antworten/)).toBeTruthy();

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Beenden/ })); });
    expect(await screen.findByText('Gut gemacht!')).toBeTruthy();
    expect(screen.getByText('Einfache Offline-Auswertung')).toBeTruthy();
    expect(screen.getByText(/Nicht gemessen/)).toBeTruthy();
    const saved = listRecords('partnerSessions');
    expect(saved).toHaveLength(1);
    expect(saved[0].data.mode).toBe('offline');
    expect(saved[0].data.evaluation?.source).toBe('offline');
    expect(screen.getByText('+30 XP')).toBeTruthy();
  });

  it('meldet eine unbekannte Situation ehrlich', async () => {
    renderAt('/partner/es.sc.gibtsnicht');
    expect(await screen.findByText('Situation nicht gefunden')).toBeTruthy();
  });
});

describe('aiChat-Übung (Smoke)', { timeout: 15_000 }, () => {
  it('liefert nach den geforderten Beiträgen eine ChatAnswer', async () => {
    const onAnswer = vi.fn();
    const exercise: Extract<Exercise, { type: 'aiChat' }> = {
      id: 't.aichat', type: 'aiChat', skills: ['speaking'], feedback: { rule: 'x' }, scenarioId: 'es.sc.alltag', goal: 'Stell dich vor.', turns: 1,
    };
    render(<ToastProvider><AiChatExercise exercise={exercise} courseId="es" variant="es-LA" onAnswer={onAnswer} /></ToastProvider>);
    fireEvent.click(await screen.findByRole('button', { name: /Gespräch starten/ }));
    const input = await screen.findByLabelText('Deine Antwort');
    fireEvent.change(input, { target: { value: 'Me llamo Tom' } });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    fireEvent.click(await screen.findByRole('button', { name: /Gespräch abschließen/ }));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith({ completed: true, userTurns: 1, scorePct: 100 }));
  });
});
