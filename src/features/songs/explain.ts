/**
 * Erklärungen zu Songtexten: offline aus Glossar/Zeilenerklärung, mit KI (aiExplain) wenn verfügbar –
 * bei eigenen Texten automatisch. KI-Ergebnisse werden in songExplanations gespeichert und wiederverwendet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CourseId, Explanation, ExplainAction, LanguageLevel, Variant } from '../../core/types';
import type { Song, SongLine } from '../../content/types';
import { aiExplain, useAiStatus, type AiStatus } from '../../ai/client';
import { nowIso, putRecord, useRecord } from '../../data/store';
import { useLanguageLevel } from '../../state/progress';
import { explanationId, hasOfflineContent, offlineExplanation, spanOf } from './explainCore';
import { localOnlyFor } from './songData';

export * from './explainCore';

export interface LyricExplanationState {
  /** anzuzeigende Erklärung (gespeicherte KI-Erklärung vor Offline-Erklärung) */
  explanation: Explanation | null;
  /** offline berechnete Erklärung (falls vorhanden) */
  offline: Explanation | null;
  loading: boolean;
  error: string | null;
  /** Nutzer-Niveau, für das erklärt wird */
  level: LanguageLevel;
  /** gespeicherte KI-Erklärung wurde für ein anderes Niveau erstellt */
  levelMismatch: boolean;
  ai: AiStatus;
  /** KI-Erklärung anfordern (erneut: `refresh = true`) */
  requestAi: (refresh?: boolean) => void;
}

interface Args {
  song: Song;
  line: SongLine | null;
  tokenIndex?: number;
  action: ExplainAction | null;
  courseId: CourseId;
  variant: Variant;
}

export function useLyricExplanation({ song, line, tokenIndex, action, courseId, variant }: Args): LyricExplanationState {
  const { level } = useLanguageLevel(courseId);
  const ai = useAiStatus();
  const span = line ? spanOf(line, tokenIndex) : '';
  const id = line && action ? explanationId(song.id, line.id, span, action) : '';
  const cached = useRecord('songExplanations', id);
  const offline = useMemo(
    () => (line && action ? offlineExplanation(song, line, tokenIndex, action, level, variant) : null),
    [song, line, tokenIndex, action, level, variant],
  );
  const [req, setReq] = useState<{ id: string; loading: boolean; error: string | null }>({ id: '', loading: false, error: null });
  const current = useRef(id);
  current.current = id;

  const requestAi = useCallback((refresh = false) => {
    if (!line || !action || !id) return;
    if (!ai.available) { setReq({ id, loading: false, error: ai.reason ?? 'Der KI-Coach ist gerade nicht verfügbar.' }); return; }
    if (cached && !refresh && cached.level === level) return;
    const key = id;
    setReq({ id: key, loading: true, error: null });
    aiExplain({ courseId, variant, level, action, text: span, context: line.text, songTitle: song.title })
      .then((result) => {
        putRecord('songExplanations', key, {
          songId: song.id, lineId: line.id, span, action, level, result: { ...result, source: 'ai' }, createdAt: nowIso(),
        }, { localOnly: localOnlyFor(song.id) });
        if (current.current === key) setReq({ id: key, loading: false, error: null });
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error && e.message ? e.message : 'Die Erklärung konnte nicht geladen werden. Bitte versuche es erneut.';
        if (current.current === key) setReq({ id: key, loading: false, error: msg });
      });
  }, [ai.available, ai.reason, action, cached, courseId, id, level, line, song.id, song.title, span, variant]);

  // Eigene Texte (ohne eingebaute Erklärungen): KI automatisch nach dem Antippen einer Aktion
  const needsAi = Boolean(line && action && !cached && (!offline || (!hasOfflineContent(song) && action !== 'pronunciation')));
  const autoTried = useRef(new Set<string>());
  useEffect(() => {
    if (!needsAi || !ai.available || autoTried.current.has(id)) return;
    autoTried.current.add(id);
    requestAi();
  }, [needsAi, ai.available, id, requestAi]);

  const mine = req.id === id;
  return {
    explanation: cached?.result ?? offline,
    offline,
    loading: mine && req.loading,
    error: mine ? req.error : null,
    level,
    levelMismatch: Boolean(cached && cached.level !== level),
    ai,
    requestAi,
  };
}
