/**
 * Sprachausgabe für Erklär-Renderer: bindet Sprache der Variante, Umschalten (erneutes Tippen stoppt)
 * und ehrliche Fehlermeldungen. Startet nur nach Nutzer-Geste (Aufruf aus Klick-Handlern).
 */
import { useCallback } from 'react';
import type { Variant } from '../../core/types';
import { useTts } from '../../speech/tts';
import { ttsLangFor } from '../../state/settings';

export interface Speaker {
  /** Sprachausgabe grundsätzlich vorhanden */
  available: boolean;
  lang: string;
  /** Spricht `text` (normal oder langsam); läuft derselbe Text gerade, wird gestoppt. */
  say: (text: string, slow?: boolean) => void;
  isSpeaking: (text: string, slow?: boolean) => boolean;
  error: string | null;
  clearError: () => void;
  /** Hinweis, falls keine passende Stimme installiert ist */
  voiceHelp: string | null;
}

const keyOf = (text: string, slow?: boolean) => `${slow ? 'slow' : 'norm'}:${text}`;

export function useSpeaker(variant: Variant): Speaker {
  const tts = useTts();
  const lang = ttsLangFor(variant);
  const { speak, stop, speaking, speakingKey } = tts;

  const say = useCallback((text: string, slow = false) => {
    const key = keyOf(text, slow);
    if (speaking && speakingKey === key) {
      stop();
      return;
    }
    void speak(text, { lang, slow, key });
  }, [lang, speak, stop, speaking, speakingKey]);

  const isSpeaking = useCallback(
    (text: string, slow?: boolean) => speaking && speakingKey === keyOf(text, slow),
    [speaking, speakingKey],
  );

  let voiceHelp: string | null = null;
  try {
    voiceHelp = tts.available && tts.voicesLoaded ? tts.missingVoiceHelp(lang) : null;
  } catch {
    voiceHelp = null;
  }

  return { available: tts.available, lang, say, isSpeaking, error: tts.error, clearError: tts.clearError, voiceHelp };
}
