// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./stt', async (orig) => ({
  ...(await orig<typeof import('./stt')>()),
  sttSupport: vi.fn(() => ({ available: true })),
  listen: vi.fn(),
  stopListening: vi.fn(),
  abortListening: vi.fn(),
}));
vi.mock('./recorder', async (orig) => ({
  ...(await orig<typeof import('./recorder')>()),
  recorderSupport: vi.fn(() => ({ available: true, mimeType: 'audio/mp4' })),
  startRecording: vi.fn(async () => undefined),
  stopRecording: vi.fn(async () => new Blob(['x'], { type: 'audio/mp4' })),
  cancelRecording: vi.fn(),
  playBlob: vi.fn(async () => undefined),
  stopPlayback: vi.fn(),
  rememberRecording: vi.fn(() => false),
}));
vi.mock('./tts', () => ({
  speak: vi.fn(async () => undefined),
  stopSpeaking: vi.fn(),
  ttsSupported: vi.fn(() => true),
}));

import * as recorder from './recorder';
import * as stt from './stt';
import * as tts from './tts';
import { buildPronAttempt, usePronunciationCheck } from './usePronunciationCheck';

const m = <T extends (...a: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  m(stt.sttSupport).mockReturnValue({ available: true });
  m(recorder.recorderSupport).mockReturnValue({ available: true, mimeType: 'audio/mp4' });
});

describe('usePronunciationCheck', () => {
  it('Spracherkennung → Ergebnis mit Verständlichkeitswert', async () => {
    m(stt.listen).mockResolvedValue({ transcripts: ['pero', 'perro'] });
    const onResult = vi.fn();
    const { result } = renderHook(() => usePronunciationCheck('perro', { lang: 'es-ES', issueCodes: ['rr'], onResult }));
    expect(result.current.mode).toBe('speech-recognition');
    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe('result'));
    expect(result.current.result?.method).toBe('speech-recognition');
    expect(result.current.result?.scorePct).toBe(100);
    expect(onResult).toHaveBeenCalledTimes(1);
    const attempt = buildPronAttempt(result.current.result!, { courseId: 'es', itemId: 'es.p.r.perro', context: 'pronunciation', target: 'perro' });
    expect(attempt).toMatchObject({ method: 'speech-recognition', scorePct: 100, transcript: 'perro', issues: [] });
  });

  it('keine Sprache erkannt → Fehler, Modus bleibt (erneut versuchen)', async () => {
    m(stt.listen).mockRejectedValue(new stt.SttError('no-speech', 'Es wurde keine Sprache erkannt.'));
    const { result } = renderHook(() => usePronunciationCheck('hola', { lang: 'es-ES' }));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.mode).toBe('speech-recognition');
    expect(result.current.error).toMatch(/keine Sprache/);
  });

  it('Spracherkennung gesperrt → Aufnahme + Selbstvergleich', async () => {
    m(stt.listen).mockRejectedValue(new stt.SttError('service-not-allowed', 'Siri & Diktieren ist aus.'));
    const onResult = vi.fn();
    const { result } = renderHook(() => usePronunciationCheck('calle', { lang: 'es-MX', issueCodes: ['ll-y', 'vowels'], onResult }));
    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.mode).toBe('recording');
    expect(result.current.error).toMatch(/aufnehmen/);

    act(() => result.current.start());
    expect(result.current.status).toBe('recording');
    act(() => result.current.stop());
    await waitFor(() => expect(result.current.status).toBe('self-rating'));
    expect(result.current.hasRecording).toBe(true);

    await act(() => result.current.playRecording());
    expect(recorder.playBlob).toHaveBeenCalledTimes(1);

    act(() => result.current.selfRate(3));
    expect(result.current.status).toBe('result');
    expect(result.current.result).toMatchObject({ method: 'self-assessment', scorePct: 75, selfRating: 3, issues: ['ll-y'], words: [] });
    expect(result.current.result?.tips[0]).toMatch(/LL und Y/);
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it('ohne Mikrofon: anhören + Selbsteinschätzung', async () => {
    m(stt.sttSupport).mockReturnValue({ available: false, reason: 'nicht da' });
    m(recorder.recorderSupport).mockReturnValue({ available: false, reason: 'nicht da' });
    const { result } = renderHook(() => usePronunciationCheck('não', { lang: 'pt-BR', issueCodes: ['ao', 'nasal'] }));
    expect(result.current.mode).toBe('listen-only');
    expect(result.current.support.modes).toEqual(['listen-only']);
    act(() => result.current.start());
    expect(result.current.status).toBe('self-rating');
    expect(tts.speak).toHaveBeenCalledWith('não', expect.objectContaining({ lang: 'pt-BR' }));
    act(() => result.current.selfRate(1));
    expect(result.current.result).toMatchObject({ scorePct: 25, issues: ['ao', 'nasal'] });
  });

  it('Mikrofon verweigert bei Aufnahme → Anhören-Modus', async () => {
    m(stt.sttSupport).mockReturnValue({ available: false });
    m(recorder.startRecording).mockRejectedValueOnce(new recorder.RecorderError('not-allowed'));
    const { result } = renderHook(() => usePronunciationCheck('hola', { lang: 'es-ES' }));
    expect(result.current.mode).toBe('recording');
    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.mode).toBe('listen-only');
  });

  it('reset/Zielwechsel setzt zurück', async () => {
    m(stt.listen).mockResolvedValue({ transcripts: ['hola'] });
    const { result, rerender } = renderHook(({ t }) => usePronunciationCheck(t, { lang: 'es-ES' }), { initialProps: { t: 'hola' } });
    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe('result'));
    rerender({ t: 'adiós' });
    await waitFor(() => expect(result.current.status).toBe('idle'));
    expect(result.current.result).toBeNull();
  });
});
