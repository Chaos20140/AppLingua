/**
 * aiChat-Übung (Vertrag, Besitzer: UI-PARTNER): kompaktes Gespräch innerhalb einer Lektion –
 * KI-Partner, sonst geführter Offline-Dialog des Szenarios. Nach `exercise.turns` eigenen Beiträgen
 * (oder Gesprächsende/Ziel erreicht) meldet `onAnswer` das Ergebnis für gradeExercise.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, Compass, Lightbulb, MessageCircle, RotateCcw, Volume2 } from 'lucide-react';
import type { CourseId, PartnerPrefs, Variant } from '../../core/types';
import type { Exercise, Scenario } from '../../content/types';
import type { ChatAnswer } from '../../engine/grading';
import { useCourseContent } from '../../content/registry';
import { useAiStatus } from '../../ai/client';
import { ttsLangFor, useSettings } from '../../state/settings';
import { useTts } from '../../speech/tts';
import { stopListening } from '../../speech/stt';
import { Button, ErrorState, IconButton, ProgressBar, RichText, Skeleton } from '../../ui';
import { prefersReducedMotion } from '../exercises/shared';
import { Composer, MessageBubble, TypingIndicator } from './ChatParts';
import { offlineScorePct } from './offlineEngine';
import { rateForSpeed, useConversation, type ChatMessage, type ChatMode } from './useConversation';
import chat from './Chat.module.css';
import s from './AiChat.module.css';

export interface AiChatExerciseProps {
  exercise: Extract<Exercise, { type: 'aiChat' }>;
  courseId: CourseId;
  variant: Variant;
  /** am Gesprächsende: Antwort für gradeExercise */
  onAnswer: (answer: ChatAnswer) => void;
}

export default function AiChatExercise(props: AiChatExerciseProps) {
  const { exercise, courseId, onAnswer } = props;
  const content = useCourseContent(courseId);
  const scenario = content.data?.scenarios.find((sc) => sc.id === exercise.scenarioId) ?? null;

  if (content.loading) {
    return (
      <div className={s.wrap} aria-busy="true" aria-label="Gespräch wird vorbereitet">
        <Skeleton lines={2} />
        <Skeleton height={120} radius={20} />
      </div>
    );
  }
  if (content.error) return <ErrorState message={content.error} onRetry={content.retry} />;
  if (!scenario) {
    return (
      <div className={s.wrap}>
        <p className={s.note}>Die Gesprächssituation zu dieser Übung ist nicht verfügbar. Du kannst sie überspringen – sie zählt dann als nicht gelöst.</p>
        <Button variant="secondary" onClick={() => onAnswer({ completed: false, userTurns: 0 })}>Übung überspringen</Button>
      </div>
    );
  }
  return <ChatExercise {...props} scenario={scenario} />;
}

function ChatExercise({ exercise, courseId, variant, onAnswer, scenario }: AiChatExerciseProps & { scenario: Scenario }) {
  const ai = useAiStatus();
  const [mode, setMode] = useState<ChatMode | null>(null);
  const [runKey, setRunKey] = useState(0);

  if (!mode) {
    return (
      <div className={s.wrap}>
        <div className={s.startCard}>
          <span className={s.emoji} aria-hidden="true">{scenario.emoji}</span>
          <div className={s.startText}>
            <p className={s.startTitle}>{scenario.title}</p>
            <RichText md={exercise.goal} className={s.goal} />
            <p className={s.meta}>Ziel: {exercise.turns} eigene {exercise.turns === 1 ? 'Antwort' : 'Antworten'} · Partner: {scenario.partnerRole}</p>
          </div>
        </div>
        {ai.available ? (
          <div className={s.modeButtons}>
            <Button block icon={<Bot size={18} />} onClick={() => setMode('ai')}>Mit KI-Partner sprechen</Button>
            <Button block variant="secondary" icon={<Compass size={18} />} onClick={() => setMode('offline')}>Geführter Dialog</Button>
          </div>
        ) : (
          <>
            <p className={s.note}><strong>Geführter Offline-Dialog.</strong> {ai.reason}</p>
            <Button block icon={<MessageCircle size={18} />} onClick={() => setMode('offline')}>Gespräch starten</Button>
          </>
        )}
      </div>
    );
  }
  return (
    <ChatRun
      key={`${mode}:${runKey}`}
      exercise={exercise}
      courseId={courseId}
      variant={variant}
      scenario={scenario}
      mode={mode}
      onAnswer={onAnswer}
      onSwitchOffline={() => { setMode('offline'); setRunKey((k) => k + 1); }}
    />
  );
}

interface RunProps {
  exercise: AiChatExerciseProps['exercise'];
  courseId: CourseId;
  variant: Variant;
  scenario: Scenario;
  mode: ChatMode;
  onAnswer: (answer: ChatAnswer) => void;
  onSwitchOffline: () => void;
}

function ChatRun({ exercise, courseId, variant, scenario, mode, onAnswer, onSwitchOffline }: RunProps) {
  const settings = useSettings();
  const tts = useTts();
  const lang = ttsLangFor(variant);
  const prefs = useMemo<PartnerPrefs>(
    () => ({ ...settings.partner, formal: scenario.register === 'formell', correction: 'sofort' }),
    // Einstellungen beim Start einfrieren
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario.id],
  );
  const rate = rateForSpeed(prefs.speed, settings);
  const [draft, setDraft] = useState('');
  const [draftVoice, setDraftVoice] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [answered, setAnswered] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const speak = useCallback((text: string, key: string) => {
    if (tts.speakingKey === key) { tts.stop(); return; }
    void tts.speak(text, { lang, rate, key });
  }, [lang, rate, tts]);
  const onPartnerMessages = useCallback((msgs: ChatMessage[]) => {
    if (!settings.autoplayAudio || !tts.available || !msgs.length) return;
    void tts.speak(msgs.map((m) => m.text).join(' '), { lang, rate, key: `chat:${msgs[msgs.length - 1].id}` });
  }, [lang, rate, settings.autoplayAudio, tts]);

  const conv = useConversation({ courseId, variant, scenario, prefs, mode, onPartnerMessages });

  useEffect(() => {
    conv.start();
    return () => { tts.stop(); stopListening(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (conv.messages.length > 1) endRef.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [conv.messages.length, conv.busy]);

  const target = Math.max(1, exercise.turns);
  const reached = conv.userTurns >= target || conv.ended || conv.goalReached;
  const locked = answered || conv.ended || (mode === 'offline' && !conv.offlineState);

  const submit = (completed: boolean) => {
    if (answered) return;
    setAnswered(true);
    tts.stop();
    stopListening();
    const pct = mode === 'offline' && conv.offlineState ? offlineScorePct(conv.offlineState) : null;
    onAnswer({ completed, userTurns: conv.userTurns, ...(pct !== null ? { scorePct: pct } : {}) });
  };

  const send = () => {
    if (!draft.trim()) return;
    conv.send(draft, { voice: draftVoice });
    setDraft('');
    setDraftVoice(false);
    setTipOpen(false);
  };

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <RichText md={exercise.goal} className={s.goal} />
        <ProgressBar
          value={Math.min(1, conv.userTurns / target)}
          label="Gesprächsfortschritt"
          valueText={`${Math.min(conv.userTurns, target)} / ${target} Antworten`}
          showLabel
          size="sm"
          tone={reached ? 'success' : 'accent'}
        />
      </div>

      <div className={s.chatBox}>
        <ol className={chat.list} role="log" aria-label="Gesprächsverlauf" aria-live="polite">
          {conv.messages.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              translations={prefs.translations}
              correction="sofort"
              onSpeak={tts.available ? speak : undefined}
              speakingKey={tts.speakingKey}
              textLang={lang}
            />
          ))}
          {conv.busy && <TypingIndicator name="Dein Partner" />}
        </ol>
        <div ref={endRef} />
      </div>

      {conv.error && (
        <div className={s.error} role="alert">
          <p>{conv.error}</p>
          <div className={s.row}>
            {mode === 'ai' && <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={conv.retry}>Erneut versuchen</Button>}
            {conv.canSwitchOffline && <Button variant="ghost" icon={<Compass size={16} />} onClick={onSwitchOffline}>Geführter Dialog</Button>}
          </div>
        </div>
      )}

      {answered ? (
        <p className={s.done} role="status"><Check size={18} aria-hidden="true" /> Gespräch abgeschlossen.</p>
      ) : (
        <>
          {tipOpen && conv.node && (
            <div className={s.tip}>
              <p className={s.tipHint}><Lightbulb size={16} aria-hidden="true" /> {conv.node.hint}</p>
              <div className={s.row}>
                <span lang={lang} className={s.tipSample}>{conv.node.sample}</span>
                {tts.available && <IconButton size="sm" variant="plain" label="Beispiel vorlesen" icon={<Volume2 size={18} />} onClick={() => speak(conv.node!.sample, `tip:${conv.node!.id}`)} />}
              </div>
              <Button variant="ghost" onClick={() => { setDraft(conv.node!.sample); setTipOpen(false); }}>In Antwort übernehmen</Button>
            </div>
          )}
          {!locked && (
            <Composer
              courseId={courseId}
              lang={lang}
              value={draft}
              onChange={(v, voice) => { setDraft(v); if (voice) setDraftVoice(true); else if (!v.trim()) setDraftVoice(false); }}
              onSend={send}
              sendBlocked={conv.busy}
              placeholder="Deine Antwort …"
              tools={mode === 'offline' && conv.node ? (
                <Button variant="ghost" icon={<Lightbulb size={16} />} onClick={() => setTipOpen((v) => !v)} aria-expanded={tipOpen}>Tipp</Button>
              ) : undefined}
            />
          )}
          <div className={s.actions}>
            {reached ? (
              <Button block icon={<Check size={18} />} onClick={() => submit(true)}>Gespräch abschließen</Button>
            ) : conv.userTurns > 0 ? (
              <Button variant="ghost" onClick={() => submit(false)}>Vorzeitig beenden</Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
