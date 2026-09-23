/**
 * KI-Coach-Client (Edge Function „ai-coach“ über supabase.functions.invoke).
 *
 * `aiStatus()` sagt ehrlich, ob KI gerade nutzbar ist: nicht eingerichtet / nicht angemeldet /
 * offline / Tageslimit erreicht / verfügbar. Alle Aufrufe werfen `AiError` mit deutscher Meldung –
 * die aufrufende UI zeigt dann den Offline-Fallback (geskriptete Partner, eingebaute Erklärungen).
 */
import { useMemo, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import type {
  CourseId, ExplainAction, Explanation, LanguageLevel, PartnerEvaluation, PartnerPrefs, Skill, Variant,
} from '../core/types';
import { useAuth } from '../data/auth/useAuth';
import { cloudConfigured, loadSupabase } from '../data/supabase';

// ───────────────────────── Typen ─────────────────────────
/** Grenzen der Edge Function – Eingabefelder in der UI entsprechend begrenzen. */
export const AI_LIMITS = {
  turnText: 800,
  turns: 40,
  explainText: 500,
  explainContext: 1500,
} as const;

export interface AiScenario {
  title: string;
  description?: string;
  partnerRole: string;
  userRole: string;
  goals?: string[];
}

export interface ChatTurn { role: 'partner' | 'user'; text: string }

export interface PartnerReplyRequest {
  courseId: CourseId;
  variant: Variant;
  /** z. B. ein `Scenario` aus den Inhalten (nur die Textfelder werden übertragen) */
  scenario: AiScenario;
  prefs: PartnerPrefs;
  /** bisheriger Verlauf; leer = Partner eröffnet das Gespräch */
  turns: ChatTurn[];
}

export interface PartnerReply {
  /** Antwort in der Zielsprache */
  reply: string;
  /** deutsche Übersetzung (nur wenn prefs.translations) */
  translation?: string;
  /** kurze deutsche Korrektur der letzten Nutzernachricht (nur bei prefs.correction = 'sofort') */
  correction?: string;
  /** Ziele der Situation erreicht → Gespräch kann enden */
  goalReached: boolean;
}

export interface PartnerEvaluateRequest extends PartnerReplyRequest {
  /** 'voice' = Beiträge stammen aus der Spracherkennung */
  inputMode?: 'text' | 'voice';
}

export interface ExplainRequest {
  courseId: CourseId;
  variant: Variant;
  level: LanguageLevel;
  action: ExplainAction;
  /** markierter Ausschnitt (max. 500 Zeichen) */
  text: string;
  /** umgebende Zeile/Satz */
  context?: string;
  songTitle?: string;
}

export type AiStatusCode = 'available' | 'not-configured' | 'signed-out' | 'offline' | 'daily-limit';

export interface AiStatus {
  available: boolean;
  code: AiStatusCode;
  /** deutsche Begründung, null wenn verfügbar */
  reason: string | null;
}

export type AiErrorCode =
  | 'not-configured' | 'signed-out' | 'offline' | 'daily-limit' | 'refused' | 'busy' | 'timeout'
  | 'invalid' | 'unavailable' | 'unknown';

export class AiError extends Error {
  readonly code: AiErrorCode;
  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

// ───────────────────────── Status ─────────────────────────
const REASONS: Record<Exclude<AiStatusCode, 'available'>, string> = {
  'not-configured': 'Die KI-Funktionen sind in dieser Version nicht eingerichtet. Der Offline-Partner und die eingebauten Erklärungen funktionieren trotzdem.',
  'signed-out': 'Melde dich an, um den KI-Coach zu nutzen. Ohne Konto stehen dir der Offline-Partner und die eingebauten Erklärungen zur Verfügung.',
  'offline': 'Du bist offline. Der Offline-Partner und die eingebauten Erklärungen funktionieren trotzdem.',
  'daily-limit': 'Dein KI-Kontingent für heute ist aufgebraucht. Morgen geht es weiter – bis dahin helfen dir die Offline-Übungen.',
};

/** Laufzeit-Erkenntnisse vom Server (z. B. Schlüssel fehlt, Tageslimit erreicht). */
const useAiFlags = create<{ serverMissing: boolean; limitDay: string | null }>(() => ({ serverMissing: false, limitDay: null }));
const today = () => new Date().toISOString().slice(0, 10);

function computeStatus(signedIn: boolean, loading: boolean, online: boolean, flags: { serverMissing: boolean; limitDay: string | null }): AiStatus {
  const off = (code: Exclude<AiStatusCode, 'available'>, reason = REASONS[code]): AiStatus => ({ available: false, code, reason });
  if (!cloudConfigured || flags.serverMissing) return off('not-configured');
  if (!online) return off('offline');
  if (loading) return off('signed-out', 'Deine Anmeldung wird noch geprüft …');
  if (!signedIn) return off('signed-out');
  if (flags.limitDay === today()) return off('daily-limit');
  return { available: true, code: 'available', reason: null };
}

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Aktueller KI-Status (nicht reaktiv). */
export function aiStatus(): AiStatus {
  const { user, status } = useAuth.getState();
  return computeStatus(Boolean(user), status === 'loading', isOnline(), useAiFlags.getState());
}

function subscribeOnline(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
}

/** Reaktiver KI-Status für Komponenten. */
export function useAiStatus(): AiStatus {
  const signedIn = useAuth((s) => s.user !== null);
  const loading = useAuth((s) => s.status === 'loading');
  const online = useSyncExternalStore(subscribeOnline, isOnline, () => true);
  const serverMissing = useAiFlags((s) => s.serverMissing);
  const limitDay = useAiFlags((s) => s.limitDay);
  return useMemo(
    () => computeStatus(signedIn, loading, online, { serverMissing, limitDay }),
    [signedIn, loading, online, serverMissing, limitDay],
  );
}

// ───────────────────────── Aufruf ─────────────────────────
async function mapInvokeError(error: unknown): Promise<AiError> {
  // Bereits geladen (invoke lief über den Client) – kommt aus dem Modul-Cache.
  const { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } = await import('@supabase/supabase-js');
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response | undefined;
    let code = '';
    let message = '';
    try {
      const body = (await res?.json()) as { error?: { code?: string; message?: string } };
      code = body?.error?.code ?? '';
      message = body?.error?.message ?? '';
    } catch { /* keine JSON-Antwort */ }
    const status = res?.status ?? 0;
    switch (code) {
      case 'daily-limit':
        useAiFlags.setState({ limitDay: today() });
        return new AiError('daily-limit', message || REASONS['daily-limit']);
      case 'unauthorized':
        return new AiError('signed-out', message || 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.');
      case 'ai-not-configured':
      case 'not-configured':
        useAiFlags.setState({ serverMissing: true });
        return new AiError('not-configured', message || REASONS['not-configured']);
      case 'refused':
        return new AiError('refused', message || 'Dazu kann der KI-Coach nichts sagen. Formuliere es bitte anders.');
      case 'ai-busy':
      case 'quota-unavailable':
        return new AiError('busy', message || 'Der KI-Coach ist gerade ausgelastet. Bitte versuche es gleich noch einmal.');
      case 'ai-timeout':
        return new AiError('timeout', message || 'Der KI-Coach hat zu lange gebraucht. Bitte versuche es erneut.');
      case 'invalid-request':
      case 'too-large':
        return new AiError('invalid', message || 'Die Anfrage war ungültig.');
      case 'origin-not-allowed':
        return new AiError('not-configured', 'Diese App-Adresse ist für den KI-Coach nicht freigegeben (ALLOWED_ORIGINS).');
      default:
        if (status === 404) {
          useAiFlags.setState({ serverMissing: true });
          return new AiError('not-configured', REASONS['not-configured']);
        }
        return new AiError(status >= 500 ? 'unavailable' : 'unknown', message || 'Der KI-Coach konnte gerade nicht antworten. Bitte versuche es erneut.');
    }
  }
  if (!isOnline()) return new AiError('offline', REASONS.offline);
  if (error instanceof FunctionsFetchError) {
    const aborted = /abort|timeout/i.test(String((error.context as Error | undefined)?.name ?? '') + error.message);
    return aborted
      ? new AiError('timeout', 'Der KI-Coach hat zu lange gebraucht. Bitte versuche es erneut.')
      : new AiError('unavailable', 'Der KI-Coach ist gerade nicht erreichbar. Bitte versuche es später erneut.');
  }
  if (error instanceof FunctionsRelayError) {
    return new AiError('unavailable', 'Der KI-Coach ist gerade nicht erreichbar. Bitte versuche es später erneut.');
  }
  return new AiError('unknown', 'Der KI-Coach konnte gerade nicht antworten. Bitte versuche es erneut.');
}

async function invoke(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const status = aiStatus();
  if (!status.available) throw new AiError(status.code === 'available' ? 'unknown' : status.code, status.reason ?? '');
  let sb: Awaited<ReturnType<typeof loadSupabase>>;
  try {
    sb = await loadSupabase();
  } catch {
    throw isOnline()
      ? new AiError('unavailable', 'Der KI-Coach ist gerade nicht erreichbar. Bitte versuche es später erneut.')
      : new AiError('offline', REASONS.offline);
  }
  if (!sb) throw new AiError('not-configured', REASONS['not-configured']);
  let res: { data: unknown; error: unknown };
  try {
    res = await sb.functions.invoke('ai-coach', { body, timeout: 120_000 });
  } catch (e) {
    throw await mapInvokeError(e);
  }
  if (res.error) throw await mapInvokeError(res.error);
  const result = (res.data as { result?: unknown } | null)?.result;
  if (!result || typeof result !== 'object') {
    throw new AiError('unknown', 'Die Antwort des KI-Coachs war unvollständig. Bitte versuche es erneut.');
  }
  return result as Record<string, unknown>;
}

// ───────────────────────── Eingaben aufbereiten ─────────────────────────
function tooLong(what: string, max: number): never {
  throw new AiError('invalid', `${what} ist zu lang (höchstens ${max} Zeichen).`);
}

function partnerBody(req: PartnerReplyRequest) {
  const turns = req.turns.slice(-AI_LIMITS.turns).map((t) => {
    const text = t.text.trim();
    if (text.length > AI_LIMITS.turnText) tooLong('Eine Nachricht', AI_LIMITS.turnText);
    return { role: t.role, text };
  }).filter((t) => t.text);
  const s = req.scenario;
  return {
    courseId: req.courseId,
    variant: req.variant,
    scenario: {
      title: s.title.slice(0, 120),
      description: (s.description ?? '').slice(0, 600),
      partnerRole: s.partnerRole.slice(0, 200),
      userRole: s.userRole.slice(0, 200),
      goals: (s.goals ?? []).slice(0, 8).map((g) => g.slice(0, 200)),
    },
    prefs: {
      level: req.prefs.level,
      formal: req.prefs.formal,
      speed: req.prefs.speed,
      correction: req.prefs.correction,
      translations: req.prefs.translations,
    },
    turns,
  };
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []);
function objList<K extends string>(v: unknown, keys: readonly K[]): Record<K, string>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<K, string> => !!x && typeof x === 'object' && keys.every((k) => typeof (x as Record<string, unknown>)[k] === 'string'))
    .map((x) => Object.fromEntries(keys.map((k) => [k, x[k]])) as Record<K, string>);
}

// ───────────────────────── Öffentliche Aufrufe ─────────────────────────
/** Nächste Antwort des KI-Gesprächspartners. */
export async function aiPartnerReply(req: PartnerReplyRequest): Promise<PartnerReply> {
  const r = await invoke({ action: 'partner-reply', ...partnerBody(req) });
  const reply = str(r.reply).trim();
  if (!reply) throw new AiError('unknown', 'Die Antwort des KI-Coachs war leer. Bitte versuche es erneut.');
  const translation = str(r.translation).trim();
  const correction = str(r.correction).trim();
  return { reply, ...(translation ? { translation } : {}), ...(correction ? { correction } : {}), goalReached: r.goalReached === true };
}

/** Auswertung eines Übungsgesprächs (Felder wie PartnerEvaluation, source = 'ai'). */
export async function aiPartnerEvaluate(req: PartnerEvaluateRequest): Promise<PartnerEvaluation> {
  const r = await invoke({ action: 'partner-evaluate', inputMode: req.inputMode ?? 'text', ...partnerBody(req) });
  const vocab = (r.vocabulary && typeof r.vocabulary === 'object' ? r.vocabulary : {}) as Record<string, unknown>;
  const scoresIn = (r.scores && typeof r.scores === 'object' ? r.scores : {}) as Record<string, unknown>;
  const scores: Partial<Record<Skill, number>> = {};
  for (const k of ['grammar', 'vocabulary', 'writing', 'speaking'] as const) {
    const v = scoresIn[k];
    if (typeof v === 'number' && Number.isFinite(v)) scores[k] = Math.max(0, Math.min(100, Math.round(v)));
  }
  const pronunciation = str(r.pronunciation).trim();
  return {
    summary: str(r.summary),
    grammarErrors: objList(r.grammarErrors, ['original', 'corrected', 'explanation'] as const),
    unnatural: objList(r.unnatural, ['original', 'better', 'explanation'] as const),
    vocabulary: { used: strList(vocab.used), suggestions: strList(vocab.suggestions) },
    ...(pronunciation ? { pronunciation } : {}),
    alternatives: strList(r.alternatives),
    goodAnswers: strList(r.goodAnswers),
    recommendedExercises: objList(r.recommendedExercises, ['label', 'route'] as const).filter((x) => x.route.startsWith('/')),
    scores,
    source: 'ai',
  };
}

/** Erklärung eines Ausschnitts (Felder wie Explanation, source = 'ai'), passend zum Sprachniveau. */
export async function aiExplain(req: ExplainRequest): Promise<Explanation> {
  const text = req.text.trim();
  if (!text) throw new AiError('invalid', 'Bitte markiere zuerst einen Text.');
  if (text.length > AI_LIMITS.explainText) tooLong('Der markierte Text', AI_LIMITS.explainText);
  const r = await invoke({
    action: 'explain',
    courseId: req.courseId,
    variant: req.variant,
    level: req.level,
    explainAction: req.action,
    text,
    context: (req.context ?? '').slice(0, AI_LIMITS.explainContext),
    songTitle: (req.songTitle ?? '').slice(0, 120),
  });
  const out: Explanation = { source: 'ai' };
  for (const k of ['natural', 'literal', 'context', 'colloquial', 'ambiguity', 'culture', 'everyday'] as const) {
    const v = str(r[k]).trim();
    if (v) out[k] = v;
  }
  for (const k of ['grammar', 'idioms', 'alternatives'] as const) {
    const v = strList(r[k]);
    if (v.length) out[k] = v;
  }
  const examples = objList(r.examples, ['target', 'german'] as const);
  if (examples.length) out.examples = examples;
  const p = r.pronunciation as Record<string, unknown> | undefined;
  if (p && typeof p === 'object' && str(p.phonetic)) {
    const tips = strList(p.tips);
    out.pronunciation = { phonetic: str(p.phonetic), ...(str(p.ipa) ? { ipa: str(p.ipa) } : {}), ...(tips.length ? { tips } : {}) };
  }
  if (Object.keys(out).length === 1) throw new AiError('unknown', 'Die Erklärung des KI-Coachs war leer. Bitte versuche es erneut.');
  return out;
}
