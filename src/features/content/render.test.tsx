// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ExplainBlock, PronItem } from '../../content/types';

vi.mock('../../speech/tts', async (orig) => ({
  ...(await orig<typeof import('../../speech/tts')>()),
  speak: vi.fn(async () => undefined),
  stopSpeaking: vi.fn(),
  ttsSupported: vi.fn(() => true),
  useTts: () => ({
    available: true, speaking: false, speakingKey: null, voicesLoaded: true, speak: async () => true, stop: () => undefined,
    voicesFor: () => [], bestVoice: () => null, voiceStatus: () => 'ok', missingVoiceHelp: () => null, error: null, clearError: () => undefined,
  }),
}));

import { ColoredSentence, ExampleList, ExplainBlocks, RoleLegend } from './ExplainBlocks';
import PronPractice from '../pronunciation/PronPractice';

afterEach(cleanup);

const BLOCKS: ExplainBlock[] = [
  { type: 'text', md: 'Mit `ser` sagst du, **wer** du bist.' },
  { type: 'tip', md: 'Ser = Identität' },
  { type: 'compare', target: 'Soy Ana.', german: 'Ich bin Ana.', md: 'Kein Pronomen nötig.' },
  { type: 'mistake', wrong: 'Estoy alemán.', right: 'Soy alemán.', why: 'Nationalität → `ser`.' },
  { type: 'table', title: 'Formen', headers: ['Person', 'Form'], rows: [['yo', 'soy'], ['tú', 'eres']] },
  {
    type: 'conjugation', verb: 'hablar', translation: 'sprechen', tense: 'Präsens',
    rows: [{ person: 'yo', form: 'hablo', ending: 'o' }, { person: 'vosotros', form: 'habláis', ending: 'áis', variant: 'es-ES' }],
  },
  { type: 'colored', parts: [{ text: 'Soy', role: 'verb' }, { text: ' de', role: 'preposition' }, { text: ' Alemania', role: 'noun' }, { text: '.' }], german: 'Ich komme aus Deutschland.' },
  { type: 'variant', variant: 'es-ES', md: 'In Spanien sagt man `vosotros`.' },
  { type: 'variant', variant: 'es-LA', md: 'In Lateinamerika sagt man `ustedes`.' },
  { type: 'audio', text: '¡Hola!', label: 'Begrüßung' },
];

describe('ExplainBlocks', { timeout: 15_000 }, () => {
  it('rendert alle Blocktypen ohne HTML-Injektion', () => {
    const { container } = render(<ExplainBlocks blocks={BLOCKS} variant="es-LA" />);
    expect(screen.getByText('Merksatz')).toBeTruthy();
    expect(screen.getByText('Ich bin Ana.')).toBeTruthy();
    expect(container.querySelector('del')?.textContent).toBe('Estoy alemán.');
    expect(screen.getByText('Formen')).toBeTruthy();
    // Endung markiert, vosotros für es-LA als „nur Spanien“
    expect(screen.getByText('nur Spanien')).toBeTruthy();
    // eigene Variante sichtbar, andere eingeklappt
    expect(screen.getByText(/Deine Variante/)).toBeTruthy();
    const toggle = screen.getByRole('button', { name: /Andere Variante zeigen/ });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('button', { name: /Vorlesen: ¡Hola!/ }).length).toBeGreaterThan(0);
  });

  it('ColoredSentence zeigt die Rolle per Antippen', () => {
    render(<ColoredSentence parts={[{ text: 'Soy', role: 'verb' }, { text: ' de', role: 'preposition' }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Soy: Verb' }));
    expect(screen.getByText(/ist hier:/).textContent).toContain('Verb');
  });

  it('ExampleList filtert Varianten und klappt „wörtlich“ auf', () => {
    render(
      <ExampleList
        variant="es-ES"
        examples={[
          { target: 'Me llamo Ana.', german: 'Ich heiße Ana.', literal: 'Ich nenne mich Ana.' },
          { target: 'Ustedes son.', german: 'Ihr seid.', variant: 'es-LA' },
        ]}
      />,
    );
    expect(screen.queryByText('Ustedes son.')).toBeNull();
    const btn = screen.getByRole('button', { name: /Wörtlich/ });
    fireEvent.click(btn);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('RoleLegend ohne Props', () => {
    render(<RoleLegend />);
    expect(screen.getByRole('list', { name: /Farblegende/ })).toBeTruthy();
  });
});

describe('PronPractice', { timeout: 15_000 }, () => {
  const item: PronItem = {
    id: 'es.p.r.perro', courseId: 'es', categoryId: 'es.pc.r', text: 'perro', german: 'Hund', helper: 'PE-rrro',
    ipa: '[ˈpe.ro]', syllables: ['pe', 'rro'], stress: 0, mouth: 'Zungenspitze flattern lassen.',
    mistakes: ['Nur ein Schlag – dann versteht man `pero`.'], tips: ['Sag „drrr“.'], issueCodes: ['rr'], level: 2,
    variantNotes: [{ variant: 'es-LA', note: 'Überall gleich.' }],
  };

  it('zeigt Wort, Silben mit Betonung, IPA-Umschalter und eine Startaktion', () => {
    render(
      <MemoryRouter>
        <PronPractice item={item} courseId="es" variant="es-ES" context="pronunciation" />
      </MemoryRouter>,
    );
    expect(screen.getByText('perro')).toBeTruthy();
    expect(screen.getByText('(betont)', { exact: false })).toBeTruthy();
    const ipa = screen.getByRole('button', { name: 'IPA' });
    fireEvent.click(ipa);
    expect(screen.getByText('[ˈpe.ro]')).toBeTruthy();
    // ohne Mikro/Erkennung in jsdom: ehrlicher Fallback „Vorbild hören & nachsprechen“
    expect(screen.getByRole('button', { name: /Vorbild hören|Sprechen|Aufnehmen/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /So klingt es in anderen Varianten/ })).toBeTruthy();
  });
});
