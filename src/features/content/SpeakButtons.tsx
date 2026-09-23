import { useState } from 'react';
import { Snail, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../../ui';
import type { Speaker } from './useSpeaker';
import s from './ExplainBlocks.module.css';

export interface SpeakButtonsProps {
  sp: Speaker;
  text: string;
  /** Beschriftung für Screenreader, Standard: der Text */
  label?: string;
  /** zusätzlich langsam vorlesen (Standard: true) */
  slow?: boolean;
  size?: 'sm' | 'md';
}

/** Vorlesen normal/langsam. Ohne Sprachausgabe wird nichts angezeigt (keine toten Buttons). */
export function SpeakButtons({ sp, text, label, slow = true, size = 'sm' }: SpeakButtonsProps) {
  if (!sp.available || !text.trim()) return null;
  const name = label ?? text;
  return (
    <span className={s.speakBtns}>
      <IconButton
        size={size}
        variant="tonal"
        label={`Vorlesen: ${name}`}
        icon={<Volume2 size={18} />}
        pressed={sp.isSpeaking(text)}
        onClick={() => sp.say(text)}
      />
      {slow && (
        <IconButton
          size={size}
          variant="plain"
          label={`Langsam vorlesen: ${name}`}
          icon={<Snail size={18} />}
          pressed={sp.isSpeaking(text, true)}
          onClick={() => sp.say(text, true)}
        />
      )}
    </span>
  );
}

/** Ehrlicher Hinweis, falls Sprachausgabe fehlt/fehlschlägt (aria-live). Lange Anleitungen sind aufklappbar. */
export function SpeechNotice({ sp, showUnavailable = true, showVoiceHelp = true }: { sp: Speaker; showUnavailable?: boolean; showVoiceHelp?: boolean }) {
  const [open, setOpen] = useState(false);
  const msg = !sp.available
    ? (showUnavailable ? 'Dein Browser bietet keine Sprachausgabe. Die Texte kannst du trotzdem lesen – Vorlesen ist in Safari auf dem iPhone verfügbar.' : null)
    : sp.error ?? (showVoiceHelp ? sp.voiceHelp : null);
  const cut = msg ? msg.indexOf('. ') : -1;
  const first = msg && cut > 0 && msg.length - cut > 40 ? msg.slice(0, cut + 1) : msg;
  const rest = msg && first !== msg ? msg.slice(first!.length).trim() : '';
  return (
    <div className={msg ? s.notice : s.noticeEmpty} role="status" aria-live="polite">
      {msg && (
        <>
          <VolumeX size={18} aria-hidden="true" />
          <span>
            {first}
            {rest && (open ? <> {rest}</> : (
              <>
                {' '}
                <button type="button" className={s.noticeMore} onClick={() => setOpen(true)}>So behebst du das</button>
              </>
            ))}
          </span>
        </>
      )}
    </div>
  );
}
