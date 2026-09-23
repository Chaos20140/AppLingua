/**
 * Bausteine der Chat-Oberfläche (Sprachpartner-Seite und aiChat-Übung):
 * Nachrichtenblasen, Tipp-Anzeige „schreibt …“ und Eingabeleiste mit Mikrofon und Akzent-Leiste.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Languages, Lightbulb, Mic, Send, Square, Volume2 } from 'lucide-react';
import type { CourseId, PartnerPrefs } from '../../core/types';
import { IconButton } from '../../ui';
import { AI_LIMITS } from '../../ai/client';
import { listen, stopListening, sttSupport, SttError } from '../../speech/stt';
import type { ChatMessage } from './useConversation';
import s from './Chat.module.css';

const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(' ');

export const ACCENTS: Record<CourseId, string[]> = {
  es: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
  'pt-BR': ['á', 'â', 'ã', 'à', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'],
};

// ───────────────────────── Nachricht ─────────────────────────

export interface MessageBubbleProps {
  msg: ChatMessage;
  /** Übersetzungshilfe aktiv */
  translations: boolean;
  correction: PartnerPrefs['correction'];
  onSpeak?: (text: string, key: string) => void;
  speakingKey?: string | null;
  partnerName?: string;
  /** BCP-47 der Zielsprache (für Screenreader-Aussprache) */
  textLang?: string;
}

export function MessageBubble({ msg, translations, correction, onSpeak, speakingKey, partnerName, textLang }: MessageBubbleProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const isPartner = msg.role === 'partner';
  const speakKey = `chat:${msg.id}`;
  const suggestKey = `chat:${msg.id}:s`;
  const showInline = correction === 'sofort';
  return (
    <li className={cx(s.row, isPartner ? s.rowPartner : s.rowUser)}>
      <div className={cx(s.bubble, isPartner ? s.partner : s.user)}>
        <span className={s.srOnly}>{isPartner ? `${partnerName ?? 'Partner'}: ` : 'Du: '}</span>
        {msg.repeat && <span className={s.repeatTag}>fragt noch einmal</span>}
        <p className={s.text} lang={textLang}>{msg.text}</p>
        {isPartner && (onSpeak || (translations && msg.translation)) && (
          <div className={s.bubbleActions}>
            {onSpeak && (
              <IconButton
                size="sm"
                variant="plain"
                label={speakingKey === speakKey ? 'Wiedergabe stoppen' : 'Vorlesen'}
                icon={speakingKey === speakKey ? <Square size={16} /> : <Volume2 size={18} />}
                onClick={() => onSpeak(msg.text, speakKey)}
              />
            )}
            {translations && msg.translation && (
              <IconButton
                size="sm"
                variant="plain"
                label={showTranslation ? 'Übersetzung ausblenden' : 'Übersetzung zeigen'}
                pressed={showTranslation}
                icon={<Languages size={18} />}
                onClick={() => setShowTranslation((v) => !v)}
              />
            )}
          </div>
        )}
        {isPartner && showTranslation && msg.translation && <p className={s.translation}>{msg.translation}</p>}
        {!isPartner && msg.voice && <span className={s.voiceTag}><Mic size={12} aria-hidden="true" /> gesprochen</span>}
      </div>
      {!isPartner && showInline && msg.correction && (
        <div className={cx(s.note, s.noteCorrection)} role="note">
          <Lightbulb size={16} aria-hidden="true" />
          <p><strong>Korrektur:</strong> {msg.correction}</p>
        </div>
      )}
      {!isPartner && showInline && msg.suggestion && (
        <div className={s.note} role="note">
          <Lightbulb size={16} aria-hidden="true" />
          <div>
            <p className={s.noteLabel}>Das passte nicht ganz – so könntest du antworten:</p>
            <p className={s.noteTarget} lang={textLang}>{msg.suggestion}</p>
            {msg.hint && <p className={s.noteHint}>{msg.hint}</p>}
          </div>
          {onSpeak && (
            <IconButton
              size="sm"
              variant="plain"
              label="Beispielantwort vorlesen"
              icon={speakingKey === suggestKey ? <Square size={16} /> : <Volume2 size={18} />}
              onClick={() => onSpeak(msg.suggestion!, suggestKey)}
            />
          )}
        </div>
      )}
    </li>
  );
}

export function TypingIndicator({ name }: { name: string }) {
  return (
    <li className={cx(s.row, s.rowPartner)}>
      <div className={cx(s.bubble, s.partner, s.typing)} role="status" aria-label={`${name} schreibt …`}>
        <span className={s.dot} data-motion-safe="" />
        <span className={s.dot} data-motion-safe="" />
        <span className={s.dot} data-motion-safe="" />
      </div>
    </li>
  );
}

// ───────────────────────── Eingabe ─────────────────────────

export interface ComposerProps {
  courseId: CourseId;
  /** BCP-47 für die Spracherkennung */
  lang: string;
  value: string;
  /** voice = Text stammt (teilweise) aus der Spracherkennung */
  onChange: (value: string, voice?: boolean) => void;
  onSend: () => void;
  disabled?: boolean;
  /** z. B. während die KI antwortet: Tippen erlaubt, Senden nicht */
  sendBlocked?: boolean;
  placeholder?: string;
  /** zusätzliche Schaltflächen links in der Werkzeugzeile (Tipp, Redemittel) */
  tools?: ReactNode;
  className?: string;
  inputLabel?: string;
}

export function Composer({ courseId, lang, value, onChange, onSend, disabled, sendBlocked, placeholder, tools, className, inputLabel = 'Deine Antwort' }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const support = useMemo(() => sttSupport(), []);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Höhe mitwachsen lassen (max. ~5 Zeilen)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [value]);

  useEffect(() => () => { stopListening(); }, []);

  const insert = (ch: string) => {
    const el = ref.current;
    const v = valueRef.current;
    const start = el?.selectionStart ?? v.length;
    const end = el?.selectionEnd ?? v.length;
    const next = v.slice(0, start) + ch + v.slice(end);
    onChange(next.slice(0, AI_LIMITS.turnText));
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  const toggleMic = async () => {
    if (listening) { stopListening(); return; }
    setMicError(null);
    setListening(true);
    setInterim('');
    try {
      const res = await listen({ lang, onInterim: (t) => setInterim(t) });
      const best = res.transcripts[0]?.trim();
      if (best) {
        const base = valueRef.current.trim();
        onChange(`${base ? base + ' ' : ''}${best}`.slice(0, AI_LIMITS.turnText), true);
      } else {
        setMicError('Ich habe nichts verstanden. Tippe noch einmal aufs Mikrofon und sprich deutlich.');
      }
    } catch (e) {
      if (!(e instanceof SttError && e.code === 'aborted')) {
        setMicError(e instanceof Error ? e.message : 'Die Spracherkennung ist fehlgeschlagen.');
      }
    } finally {
      setListening(false);
      setInterim('');
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.stopPropagation(); // Enter sendet – nicht zusätzlich „Prüfen“ der umgebenden Übung auslösen
      if (!sendBlocked && value.trim()) onSend();
    }
  };

  const canSend = !disabled && !sendBlocked && value.trim().length > 0;

  return (
    <div className={cx(s.composer, className)}>
      <div className={s.toolbar}>
        {tools}
        <div className={s.accents} role="group" aria-label="Sonderzeichen einfügen">
          {ACCENTS[courseId].map((ch) => (
            <button
              key={ch}
              type="button"
              className={s.accent}
              disabled={disabled}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => insert(ch)}
              aria-label={`${ch} einfügen`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
      <div className={s.inputRow}>
        {support.available && (
          <IconButton
            label={listening ? 'Aufnahme beenden' : 'Antwort sprechen'}
            icon={listening ? <Square size={18} /> : <Mic size={20} />}
            variant={listening ? 'solid' : 'tonal'}
            pressed={listening}
            disabled={disabled}
            onClick={() => void toggleMic()}
            className={listening ? s.micActive : undefined}
          />
        )}
        <textarea
          ref={ref}
          className={s.input}
          rows={1}
          value={listening && interim ? `${value}${value ? ' ' : ''}${interim}` : value}
          onChange={(e) => onChange(e.target.value.slice(0, AI_LIMITS.turnText))}
          onKeyDown={onKeyDown}
          placeholder={listening ? 'Ich höre zu …' : placeholder}
          aria-label={inputLabel}
          disabled={disabled}
          readOnly={listening}
          maxLength={AI_LIMITS.turnText}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          lang={lang}
        />
        <IconButton
          label="Senden"
          icon={<Send size={18} />}
          variant="solid"
          disabled={!canSend}
          onClick={onSend}
        />
      </div>
      <p className={s.micStatus} aria-live="polite">
        {listening ? 'Ich höre zu … sprich jetzt.' : micError ?? ''}
      </p>
      {!support.available && support.reason && <p className={s.srOnly}>{`Spracheingabe nicht verfügbar: ${support.reason}`}</p>}
    </div>
  );
}
