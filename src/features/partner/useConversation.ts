/**
 * Gesprächszustand für Sprachpartner (Seite) und aiChat-Übung (kompakt):
 * KI-Modus über aiPartnerReply, sonst geführter Offline-Dialog (offlineEngine).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CourseId, PartnerPrefs, PartnerSession, Settings, Variant } from '../../core/types';
import type { Scenario, ScriptNode } from '../../content/types';
import { AI_LIMITS, AiError, aiPartnerReply, type AiScenario, type ChatTurn } from '../../ai/client';
import { uid } from '../../data/store';
import { currentNode, pickScript, respondOffline, startOffline, type OfflineScript, type OfflineState, type PartnerLine } from './offlineEngine';

export type ChatMode = 'ai' | 'offline';

export interface ChatMessage {
  id: string;
  role: 'partner' | 'user';
  text: string;
  translation?: string;
  /** KI: kurze deutsche Korrektur dieser Nutzernachricht */
  correction?: string;
  /** Offline: Beispielantwort, wenn die Antwort nicht zum Dialog passte */
  suggestion?: string;
  /** Offline: Formulierungshilfe zum beantworteten Knoten */
  hint?: string;
  /** Partner wiederholt die Frage (Offline) */
  repeat?: boolean;
  /** Antwort passte zum Dialog (Offline) */
  matched?: boolean;
  voice?: boolean;
}

export interface ConversationOptions {
  courseId: CourseId;
  variant: Variant;
  scenario: Scenario;
  prefs: PartnerPrefs;
  mode: ChatMode;
  /** optionaler Gesprächsschwerpunkt (nur KI) */
  topic?: string;
  /** neue Partner-Äußerungen (z. B. zum Vorlesen); offline synchron innerhalb der Nutzer-Geste */
  onPartnerMessages?: (messages: ChatMessage[]) => void;
}

export interface Conversation {
  mode: ChatMode;
  started: boolean;
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  /** KI-Fehler: Wechsel in den Offline-Dialog anbieten */
  canSwitchOffline: boolean;
  /** Offline-Dialog vollständig beantwortet */
  ended: boolean;
  /** KI meldet: Ziel der Situation erreicht */
  goalReached: boolean;
  script: OfflineScript | null;
  offlineState: OfflineState | null;
  /** aktueller Offline-Knoten (für Tipp/Beispielantwort) */
  node: ScriptNode | null;
  userTurns: number;
  voiceTurns: number;
  /** Gesprächsgrenze der KI erreicht */
  atLimit: boolean;
  start: () => void;
  send: (text: string, opts?: { voice?: boolean }) => void;
  retry: () => void;
  switchToOffline: () => void;
  restart: () => void;
  sessionTurns: () => PartnerSession['turns'];
  aiTurns: () => ChatTurn[];
  aiScenario: AiScenario;
}

/** Sprechgeschwindigkeit je Einstellung „langsam/normal/schnell“. */
export function rateForSpeed(speed: PartnerPrefs['speed'], settings: Pick<Settings, 'ttsRate' | 'ttsSlowRate'>): number {
  if (speed === 'langsam') return settings.ttsSlowRate;
  if (speed === 'schnell') return Math.min(1.25, settings.ttsRate + 0.2);
  return settings.ttsRate;
}

const toMessage = (line: PartnerLine): ChatMessage => ({
  id: uid(), role: 'partner', text: line.text, ...(line.german ? { translation: line.german } : {}), ...(line.repeat ? { repeat: true } : {}),
});

export function useConversation(opts: ConversationOptions): Conversation {
  const { courseId, variant, scenario, prefs, topic } = opts;
  const [mode, setMode] = useState<ChatMode>(opts.mode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canSwitchOffline, setCanSwitchOffline] = useState(false);
  const [goalReached, setGoalReached] = useState(false);
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null);

  const script = useMemo(() => pickScript(scenario, prefs.formal), [scenario, prefs.formal]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const offlineRef = useRef<OfflineState | null>(null);
  const requestRef = useRef(0);
  const alive = useRef(true);
  const onPartnerRef = useRef(opts.onPartnerMessages);
  onPartnerRef.current = opts.onPartnerMessages;

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const commit = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const aiScenario = useMemo<AiScenario>(() => {
    const focus = topic?.trim();
    return {
      title: scenario.title,
      description: focus ? `${scenario.description} Gewünschter Schwerpunkt: ${focus.slice(0, 120)}` : scenario.description,
      partnerRole: scenario.partnerRole,
      userRole: scenario.userRole,
      goals: scenario.goals,
    };
  }, [scenario, topic]);

  const aiTurns = useCallback(
    (): ChatTurn[] => messagesRef.current.map((m) => ({ role: m.role, text: m.text })).slice(-AI_LIMITS.turns),
    [],
  );

  const requestAi = useCallback(async () => {
    const reqId = ++requestRef.current;
    setBusy(true);
    setError(null);
    setCanSwitchOffline(false);
    try {
      const reply = await aiPartnerReply({ courseId, variant, scenario: aiScenario, prefs, turns: aiTurns() });
      if (!alive.current || reqId !== requestRef.current) return;
      const partner: ChatMessage = { id: uid(), role: 'partner', text: reply.reply, ...(reply.translation ? { translation: reply.translation } : {}) };
      const list = messagesRef.current.slice();
      if (reply.correction) {
        for (let i = list.length - 1; i >= 0; i--) {
          if (list[i].role === 'user') { list[i] = { ...list[i], correction: reply.correction }; break; }
        }
      }
      const afterUser = list.some((m) => m.role === 'user');
      commit([...list, partner]);
      if (reply.goalReached) setGoalReached(true);
      // Eröffnung nicht automatisch vorlesen (keine Nutzer-Geste), Antworten schon
      if (afterUser) onPartnerRef.current?.([partner]);
    } catch (e) {
      if (!alive.current || reqId !== requestRef.current) return;
      setError(e instanceof AiError || e instanceof Error ? e.message : 'Der KI-Partner ist gerade nicht erreichbar.');
      setCanSwitchOffline(true);
    } finally {
      if (alive.current && reqId === requestRef.current) setBusy(false);
    }
  }, [aiScenario, aiTurns, commit, courseId, prefs, variant]);

  const beginOffline = useCallback(() => {
    requestRef.current++;
    setBusy(false);
    setError(null);
    setCanSwitchOffline(false);
    setGoalReached(false);
    if (!script) {
      offlineRef.current = null;
      setOfflineState(null);
      commit([]);
      setError('Für diese Situation gibt es keinen geführten Dialog.');
      return;
    }
    const { state, lines } = startOffline(script);
    offlineRef.current = state;
    setOfflineState(state);
    const partner = lines.map(toMessage);
    commit(partner);
  }, [commit, script]);

  const start = useCallback(() => {
    if (started) return;
    setStarted(true);
    if (mode === 'offline') beginOffline();
    else { commit([]); void requestAi(); }
  }, [beginOffline, commit, mode, requestAi, started]);

  const send = useCallback((raw: string, o: { voice?: boolean } = {}) => {
    const text = raw.trim().slice(0, AI_LIMITS.turnText);
    if (!text || busy) return;
    if (mode === 'offline') {
      const st = offlineRef.current;
      if (!script || !st || st.ended) return;
      const step = respondOffline(script, st, text, { voice: o.voice });
      const user: ChatMessage = {
        id: uid(), role: 'user', text, matched: step.matched, ...(o.voice ? { voice: true } : {}),
        ...(!step.matched && !step.answered.end ? { suggestion: step.answered.sample, hint: step.answered.hint } : {}),
      };
      const partner = step.lines.map(toMessage);
      offlineRef.current = step.state;
      setOfflineState(step.state);
      commit([...messagesRef.current, user, ...partner]);
      if (partner.length) onPartnerRef.current?.(partner);
      return;
    }
    const user: ChatMessage = { id: uid(), role: 'user', text, ...(o.voice ? { voice: true } : {}) };
    commit([...messagesRef.current, user]);
    void requestAi();
  }, [busy, commit, mode, requestAi, script]);

  const retry = useCallback(() => {
    if (mode !== 'ai' || busy) return;
    void requestAi();
  }, [busy, mode, requestAi]);

  const switchToOffline = useCallback(() => {
    setMode('offline');
    setStarted(true);
    beginOffline();
  }, [beginOffline]);

  const restart = useCallback(() => {
    setStarted(true);
    if (mode === 'offline') beginOffline();
    else {
      requestRef.current++;
      setGoalReached(false);
      commit([]);
      void requestAi();
    }
  }, [beginOffline, commit, mode, requestAi]);

  const sessionTurns = useCallback((): PartnerSession['turns'] => messagesRef.current.map((m) => ({
    role: m.role,
    text: m.text,
    ...(m.translation ? { translation: m.translation } : {}),
    ...(m.correction ? { correction: m.correction } : {}),
  })), []);

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const voiceTurns = messages.filter((m) => m.role === 'user' && m.voice).length;
  const node = mode === 'offline' && script && offlineState && !offlineState.ended ? currentNode(script, offlineState) : null;

  return {
    mode, started, messages, busy, error, canSwitchOffline,
    ended: mode === 'offline' && !!offlineState?.ended,
    goalReached,
    script, offlineState, node, userTurns, voiceTurns,
    atLimit: mode === 'ai' && messages.length >= AI_LIMITS.turns,
    start, send, retry, switchToOffline, restart, sessionTurns, aiTurns, aiScenario,
  };
}
