import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Bot, Check, Compass, Flag, Lightbulb, MessageCircle, RotateCcw, Sparkles, Volume2, WifiOff, X } from 'lucide-react';
import type { CourseId, PartnerEvaluation } from '../../core/types';
import type { Scenario } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { aiPartnerEvaluate, useAiStatus } from '../../ai/client';
import { nowIso } from '../../data/store';
import { recordPartnerSession } from '../../state/actions';
import { ttsLangFor, useSettings, useVariant } from '../../state/settings';
import { useTts } from '../../speech/tts';
import { stopListening } from '../../speech/stt';
import { Badge, BottomSheet, Button, ConfirmDialog, EmptyState, ErrorState, IconButton, Page, Skeleton, Toggle } from '../../ui';
import { Composer, MessageBubble, TypingIndicator } from './ChatParts';
import { EvaluationView } from './EvaluationView';
import { evaluateOffline } from './offlineEngine';
import { readLaunchState, SPEED_LABEL, type PartnerLaunchState } from './launch';
import { rateForSpeed, useConversation, type ChatMessage } from './useConversation';
import chat from './Chat.module.css';
import s from './ChatPage.module.css';

const courseOfScenario = (id: string, fallback: CourseId): CourseId => (id.startsWith('pt.') ? 'pt-BR' : id.startsWith('es.') ? 'es' : fallback);

export default function PartnerChatPage() {
  const { scenarioId = '' } = useParams();
  const settings = useSettings();
  const courseId = courseOfScenario(scenarioId, settings.activeCourse);
  const content = useCourseContent(courseId);
  const scenario = content.data?.scenarios.find((sc) => sc.id === scenarioId) ?? null;
  const grammarIds = useMemo(() => content.data?.grammar.map((g) => g.id) ?? [], [content.data]);

  if (content.loading) {
    return (
      <Page title="Gespräch" back="/partner" largeTitle={false}>
        <div className={s.loading} aria-busy="true" aria-label="Gespräch wird vorbereitet">
          <Skeleton height={64} radius={20} width="78%" />
          <Skeleton height={48} radius={20} width="54%" className={s.skelRight} />
          <Skeleton height={72} radius={20} width="70%" />
        </div>
      </Page>
    );
  }
  if (content.error) {
    return (
      <Page title="Gespräch" back="/partner" largeTitle={false}>
        <ErrorState message={content.error} onRetry={content.retry} />
      </Page>
    );
  }
  if (!scenario) {
    return (
      <Page title="Gespräch" back="/partner" largeTitle={false}>
        <EmptyState
          icon={<MessageCircle size={28} />}
          title="Situation nicht gefunden"
          description="Diese Gesprächssituation gibt es nicht (mehr). Wähle eine andere in der Übersicht."
          action={<Button to="/partner">Zur Übersicht</Button>}
        />
      </Page>
    );
  }
  return <ChatRoom key={scenario.id} scenario={scenario} courseId={courseId} grammarIds={grammarIds} />;
}

interface Result {
  evaluation: PartnerEvaluation;
  notice: string | null;
  xp: number;
  userTurns: number;
}

function ChatRoom({ scenario, courseId, grammarIds }: { scenario: Scenario; courseId: CourseId; grammarIds: string[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const settings = useSettings();
  const variant = useVariant(courseId);
  const lang = ttsLangFor(variant);
  const ai = useAiStatus();
  const tts = useTts();

  // Einstellungen: aus dem Setup (Router-State) oder Standard; KI nur, wenn sie jetzt verfügbar ist
  const [launch] = useState<PartnerLaunchState & { modeNotice: string | null }>(() => {
    const fromSetup = readLaunchState(location.state);
    const base: PartnerLaunchState = fromSetup ?? {
      prefs: { ...settings.partner, formal: scenario.register === 'formell' },
      mode: ai.available ? 'ai' : 'offline',
    };
    if (base.mode === 'ai' && !ai.available) {
      return { ...base, mode: 'offline', modeNotice: `KI-Partner nicht verfügbar: ${ai.reason ?? 'unbekannter Grund'} Du übst im geführten Offline-Dialog.` };
    }
    return { ...base, modeNotice: null };
  });
  const { prefs, topic } = launch;
  const rate = rateForSpeed(prefs.speed, settings);

  const [autoRead, setAutoRead] = useState(settings.autoplayAudio && tts.available);
  const autoReadRef = useRef(autoRead);
  autoReadRef.current = autoRead;

  const speak = useCallback((text: string, key: string) => {
    if (tts.speakingKey === key) { tts.stop(); return; }
    void tts.speak(text, { lang, rate, key });
  }, [lang, rate, tts]);

  const onPartnerMessages = useCallback((msgs: ChatMessage[]) => {
    if (!autoReadRef.current || !msgs.length) return;
    const last = msgs[msgs.length - 1];
    void tts.speak(msgs.map((m) => m.text).join(' '), { lang, rate, key: `chat:${last.id}` });
  }, [lang, rate, tts]);

  const conv = useConversation({ courseId, variant, scenario, prefs, mode: launch.mode, topic, onPartnerMessages });

  const [phase, setPhase] = useState<'chat' | 'evaluating' | 'done'>('chat');
  const [result, setResult] = useState<Result | null>(null);
  const [draft, setDraft] = useState('');
  const [draftVoice, setDraftVoice] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [barHeight, setBarHeight] = useState(160);
  const barRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const recorded = useRef(false);

  useEffect(() => {
    alive.current = true;
    conv.start();
    return () => { alive.current = false; tts.stop(); stopListening(); };
    // nur beim Öffnen starten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Höhe der fixierten Eingabeleiste für den Abstand am Ende der Liste
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBarHeight(el.offsetHeight));
    ro.observe(el);
    setBarHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [phase]);

  // Auto-Scroll zu neuen Nachrichten
  useEffect(() => {
    if (phase !== 'chat') return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    endRef.current?.scrollIntoView({ block: 'end', behavior: reduce ? 'auto' : 'smooth' });
  }, [conv.messages.length, conv.busy, conv.error, tipOpen, phase, conv.ended, conv.goalReached]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    conv.send(text, { voice: draftVoice });
    setDraft('');
    setDraftVoice(false);
    setTipOpen(false);
  };

  const finish = async () => {
    if (recorded.current || conv.userTurns === 0) return;
    tts.stop();
    stopListening();
    setPhase('evaluating');
    const userTurns = conv.messages.filter((m) => m.role === 'user').map((m) => ({ text: m.text, voice: m.voice }));
    let evaluation: PartnerEvaluation;
    let notice: string | null = null;
    if (conv.mode === 'ai') {
      try {
        evaluation = await aiPartnerEvaluate({
          courseId, variant, scenario: conv.aiScenario, prefs, turns: conv.aiTurns(), inputMode: conv.voiceTurns > 0 ? 'voice' : 'text',
        });
      } catch (e) {
        notice = `Die KI-Auswertung ist gerade nicht verfügbar${e instanceof Error && e.message ? ` (${e.message.replace(/\.$/, '')})` : ''}. Hier siehst du stattdessen eine einfache Offline-Auswertung.`;
        evaluation = evaluateOffline({ courseId, scenario, userTurns, grammarTopicIds: grammarIds });
      }
    } else {
      evaluation = evaluateOffline({ courseId, scenario, userTurns, script: conv.script, state: conv.offlineState, grammarTopicIds: grammarIds });
    }
    if (!alive.current || recorded.current) return;
    recorded.current = true;
    const res = recordPartnerSession({ at: nowIso(), courseId, scenarioId: scenario.id, mode: conv.mode, prefs, turns: conv.sessionTurns(), evaluation });
    setResult({ evaluation, notice, xp: res.xp, userTurns: userTurns.length });
    setPhase('done');
    window.scrollTo({ top: 0 });
  };

  const again = () => {
    recorded.current = false;
    setResult(null);
    setDraft('');
    setTipOpen(false);
    setPhase('chat');
    conv.restart();
  };

  const requestExit = () => {
    if (phase === 'chat' && conv.userTurns > 0) setExitOpen(true);
    else navigate('/partner');
  };

  const insertPhrase = (text: string) => {
    setDraft((d) => (d.trim() ? `${d.trim()} ${text}` : text));
    setPhrasesOpen(false);
  };

  const modeBadge = conv.mode === 'ai'
    ? <Badge tone="info" icon={<Bot size={12} />}>KI-Partner</Badge>
    : <Badge tone="neutral" icon={<Compass size={12} />}>Geführter Dialog</Badge>;
  const inputLocked = phase !== 'chat' || conv.ended || (conv.mode === 'offline' && !conv.offlineState);
  const registerLabel = (conv.mode === 'offline' && conv.script ? conv.script.register === 'formal' : prefs.formal) ? 'Formell' : 'Informell';
  const partnerName = scenario.partnerRole.split(/[,(]/)[0].trim() || 'Partner';

  return (
    <Page
      title={scenario.title}
      largeTitle={false}
      leading={<IconButton label={phase === 'chat' ? 'Gespräch verlassen' : 'Schließen'} icon={<X size={22} />} onClick={requestExit} />}
      actions={phase === 'chat' ? (
        <Button variant="ghost" icon={<Flag size={16} />} onClick={() => void finish()} disabled={conv.userTurns === 0}>
          Beenden
        </Button>
      ) : undefined}
      gap="md"
    >
      {phase === 'chat' && (
        <>
          <header className={s.intro}>
            <span className={s.introEmoji} aria-hidden="true">{scenario.emoji}</span>
            <div className={s.introText}>
              <p className={s.introRole}>{scenario.partnerRole}</p>
              <div className={s.introBadges}>
                {modeBadge}
                <Badge tone="neutral">{registerLabel}</Badge>
                <Badge tone="neutral">Tempo: {SPEED_LABEL[prefs.speed]}</Badge>
              </div>
            </div>
          </header>

          {(launch.modeNotice || (conv.mode === 'offline' && conv.script?.notice)) && (
            <p className={s.notice} role="note">
              <WifiOff size={16} aria-hidden="true" />
              <span>{[launch.modeNotice, conv.mode === 'offline' ? conv.script?.notice : null].filter(Boolean).join(' ')}</span>
            </p>
          )}

          <details className={s.goals}>
            <summary>Deine Ziele in diesem Gespräch</summary>
            <ul>{scenario.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          </details>

          {tts.available ? (
            <Toggle checked={autoRead} onChange={setAutoRead} label="Partner automatisch vorlesen" className={s.autoRead} />
          ) : (
            <p className={s.hint}>Sprachausgabe ist in diesem Browser nicht verfügbar – lies die Nachrichten einfach mit.</p>
          )}
          {tts.error && <p className={s.error} role="alert">{tts.error}</p>}

          <ol className={chat.list} role="log" aria-label="Gesprächsverlauf" aria-live="polite">
            {conv.messages.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                translations={prefs.translations}
                correction={prefs.correction}
                onSpeak={tts.available ? speak : undefined}
                speakingKey={tts.speakingKey}
                partnerName={partnerName}
                textLang={lang}
              />
            ))}
            {conv.busy && <TypingIndicator name={partnerName} />}
          </ol>

          {conv.error && (
            <div className={s.errorBox} role="alert">
              <p>{conv.error}</p>
              <div className={s.errorActions}>
                {conv.mode === 'ai' && <Button variant="secondary" icon={<RotateCcw size={16} />} onClick={conv.retry}>Erneut versuchen</Button>}
                {conv.canSwitchOffline && (
                  <Button variant="ghost" icon={<Compass size={16} />} onClick={conv.switchToOffline}>
                    Geführter Offline-Dialog
                  </Button>
                )}
              </div>
              {conv.canSwitchOffline && conv.userTurns > 0 && <p className={s.hint}>Der geführte Dialog beginnt von vorn.</p>}
            </div>
          )}

          {(conv.ended || conv.goalReached || conv.atLimit) && (
            <div className={s.endBanner} role="status">
              <span className={s.endIcon} aria-hidden="true"><Check size={20} /></span>
              <div>
                <p className={s.endTitle}>{conv.ended ? 'Gespräch abgeschlossen!' : conv.atLimit ? 'Ein langes Gespräch – stark!' : 'Ziel erreicht!'}</p>
                <p className={s.endText}>
                  {conv.ended
                    ? 'Hol dir jetzt deine Auswertung mit Beispielantworten und Tipps.'
                    : conv.atLimit
                      ? 'Beende es jetzt, um deine Auswertung zu bekommen.'
                      : 'Du kannst weiterreden oder das Gespräch jetzt beenden und die Auswertung ansehen.'}
                </p>
              </div>
              <Button onClick={() => void finish()} icon={<Sparkles size={16} />}>Auswertung</Button>
            </div>
          )}

          <div ref={endRef} style={{ height: `calc(${barHeight}px + var(--kb-inset))` }} aria-hidden="true" />

          <div ref={barRef} className={s.bar}>
            <div className={s.barInner}>
              {tipOpen && conv.node && (
                <div className={s.tip} role="region" aria-label="Tipp">
                  <p className={s.tipHint}><Lightbulb size={16} aria-hidden="true" /> {conv.node.hint}</p>
                  <div className={s.tipSample}>
                    <span lang={lang}>{conv.node.sample}</span>
                    {tts.available && (
                      <IconButton size="sm" variant="plain" label="Beispiel vorlesen" icon={<Volume2 size={18} />} onClick={() => speak(conv.node!.sample, `tip:${conv.node!.id}`)} />
                    )}
                  </div>
                  <Button variant="secondary" onClick={() => { setDraft(conv.node!.sample); setTipOpen(false); }}>In Antwort übernehmen</Button>
                </div>
              )}
              <Composer
                courseId={courseId}
                lang={lang}
                value={draft}
                onChange={(v, voice) => { setDraft(v); if (voice) setDraftVoice(true); else if (!v.trim()) setDraftVoice(false); }}
                onSend={send}
                disabled={inputLocked}
                sendBlocked={conv.busy}
                placeholder={conv.ended ? 'Gespräch beendet' : `Antworte auf ${courseId === 'es' ? 'Spanisch' : 'Portugiesisch'} …`}
                tools={
                  <>
                    {conv.mode === 'offline' && conv.node && (
                      <Button variant="ghost" icon={<Lightbulb size={16} />} onClick={() => setTipOpen((v) => !v)} aria-expanded={tipOpen}>
                        Tipp
                      </Button>
                    )}
                    {scenario.phrases.length > 0 && (
                      <IconButton label="Redemittel" icon={<BookOpen size={18} />} variant="plain" onClick={() => setPhrasesOpen(true)} />
                    )}
                  </>
                }
              />
            </div>
          </div>
        </>
      )}

      {phase === 'evaluating' && (
        <div className={s.evaluating} role="status" aria-live="polite">
          <p className={s.evalTitle}>{conv.mode === 'ai' ? 'Dein KI-Coach wertet das Gespräch aus …' : 'Deine Auswertung wird erstellt …'}</p>
          <Skeleton lines={3} />
          <Skeleton height={80} radius={16} />
          <Skeleton height={80} radius={16} />
        </div>
      )}

      {phase === 'done' && result && (
        <div className={s.done}>
          <div className={s.doneHead}>
            <span className={s.doneEmoji} aria-hidden="true">🎉</span>
            <h2 className={s.doneTitle}>Gut gemacht!</h2>
            <p className={s.doneText}>
              {result.userTurns} {result.userTurns === 1 ? 'eigener Beitrag' : 'eigene Beiträge'} in „{scenario.title}“.
            </p>
            {result.xp > 0 ? (
              <Badge tone="gold" solid icon={<Sparkles size={14} />}>+{result.xp} XP</Badge>
            ) : (
              <p className={s.hint}>
                {result.userTurns < 2
                  ? 'XP gibt es ab zwei eigenen Beiträgen – beim nächsten Mal!'
                  : 'Die XP für diese Situation hast du heute schon erhalten. Üben lohnt sich trotzdem!'}
              </p>
            )}
          </div>
          <EvaluationView
            evaluation={result.evaluation}
            notice={result.notice}
            lang={lang}
            onSpeak={tts.available ? (t) => void tts.speak(t, { lang, rate }) : undefined}
          />
          <div className={s.doneActions}>
            <Button block size="lg" icon={<RotateCcw size={18} />} onClick={again}>Noch einmal üben</Button>
            <Button block variant="secondary" to="/partner">Andere Situation wählen</Button>
          </div>
        </div>
      )}

      <BottomSheet open={phrasesOpen} onClose={() => setPhrasesOpen(false)} title="Redemittel" description="Nützliche Sätze für diese Situation – tippe auf „Einfügen“, um sie zu verwenden.">
        <ul className={s.phrases}>
          {scenario.phrases.map((p, i) => (
            <li key={i} className={s.phrase}>
              <div className={s.phraseText}>
                <span lang={lang} className={s.phraseTarget}>{p.target}</span>
                <span className={s.phraseGerman}>{p.german}</span>
              </div>
              {tts.available && <IconButton size="sm" variant="plain" label={`„${p.target}“ vorlesen`} icon={<Volume2 size={18} />} onClick={() => speak(p.target, `phrase:${i}`)} />}
              {!inputLocked && <Button variant="ghost" onClick={() => insertPhrase(p.target)}>Einfügen</Button>}
            </li>
          ))}
        </ul>
      </BottomSheet>

      <ConfirmDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onConfirm={() => { setExitOpen(false); navigate('/partner'); }}
        title="Gespräch verlassen?"
        message="Das Gespräch wird nicht gespeichert. Tipp: Mit „Beenden“ bekommst du eine Auswertung und XP."
        confirmLabel="Verlassen"
        cancelLabel="Weiter üben"
        tone="danger"
      />
    </Page>
  );
}
