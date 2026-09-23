/**
 * Song-Player (Vollbild): verbindet Quelle (Demo-Synth, YouTube, Spotify, Apple Music/Schritt-Modus),
 * Songtext, Lernmodus-Panels, Steuerleiste, Fortsetzen, Playlist-Warteschlange und Ergebnisse.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Check, ChevronDown, Eye, EyeOff, Info, ListMusic, Mic, PartyPopper, Play, RotateCcw, SkipForward, Sparkles, Timer,
} from 'lucide-react';
import type { ExplainAction } from '../../../core/types';
import type { Song, SongLine } from '../../../content/types';
import { getRecord, putRecord, useRecord } from '../../../data/store';
import { recordSongActivity, saveSongPosition } from '../../../state/actions';
import { getSettings, ttsLangFor, useSettings, useVariant } from '../../../state/settings';
import { useSongProgress } from '../../../state/songs';
import { SCORE_DISCLAIMER } from '../../../speech/pronunciationScore';
import { useTts } from '../../../speech/tts';
import type { PronCheckResult } from '../../../speech/usePronunciationCheck';
import { Badge, Button, EmptyState, IconButton, Page, useToast } from '../../../ui';
import LyricActionSheet from '../LyricActionSheet';
import { useAllSongs } from '../catalog';
import { SONG_MODES, type SongModeKey } from '../modes';
import { localOnlyFor, VARIANT_SHORT } from '../songData';
import { userTextIdOf, validTimings } from '../userText';
import ControlBar from './ControlBar';
import { GapPanel, LearnPanel, LineActions, LineMic, PronPanel, TranslatePanel } from './LinePanels';
import LyricsView, { type DisplayMode } from './LyricsView';
import MediaEmbed from './MediaEmbed';
import { DisplaySheet, LoopSheet, ModeSheet, QueueSheet, SOURCE_LABEL, type SourceChoice } from './PlayerSheets';
import { SynthSource } from './sources/SynthSource';
import type { PlaybackSource } from './sources/types';
import TapSync from './TapSync';
import {
  chooseGaps, formatTime, lineIndexAt, lineSeed, resumeTarget, sectionRanges, shouldOfferResume, TTS_SYLLABLE_MS,
  type GapPct, type LangBase,
} from './timeline';
import { usePlayback, usePlayerLifecycle } from './usePlayback';
import { cx, readLocalPrefs, writeLocalPrefs } from './util';
import s from './player.module.css';

interface ModeDefaults {
  vocals: boolean;
  pauseAfterLine: boolean;
  gapPct: GapPct;
}

const MODE_DEFAULTS: Record<SongModeKey, ModeDefaults> = {
  hoeren: { vocals: true, pauseAfterLine: false, gapPct: 0 },
  mitlesen: { vocals: true, pauseAfterLine: false, gapPct: 0 },
  mitsingen: { vocals: false, pauseAfterLine: false, gapPct: 0 },
  zeilen: { vocals: true, pauseAfterLine: true, gapPct: 0 },
  karaoke: { vocals: false, pauseAfterLine: false, gapPct: 0 },
  luecken: { vocals: true, pauseAfterLine: true, gapPct: 25 },
  aussprache: { vocals: true, pauseAfterLine: true, gapPct: 0 },
  uebersetzung: { vocals: true, pauseAfterLine: true, gapPct: 0 },
};

const TEMPO_ORDER = [1, 0.9, 0.75, 0.5];
const HEARD_FOR_COMPLETE = 0.7;
const FLAWLESS_PCT = 80;

interface LocalPrefs { fontScale: number; display: DisplayMode; phonetic: boolean }

export interface PlayerScreenProps {
  song: Song;
  isUser: boolean;
  mode: SongModeKey;
  playlistId: string | null;
  autoplay: boolean;
}

type SheetState = { lineId: string; tokenIndex?: number; initialAction?: ExplainAction };

export default function PlayerScreen({ song, isUser, mode, playlistId, autoplay }: PlayerScreenProps) {
  const settings = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const [, setSearch] = useSearchParams();
  const tts = useTts();
  const lang = ttsLangFor(song.variant);
  const base: LangBase = song.courseId === 'pt-BR' ? 'pt' : 'es';
  const def = MODE_DEFAULTS[mode];
  const modeInfo = SONG_MODES.find((m) => m.key === mode) ?? SONG_MODES[0];
  const userVariant = useVariant(song.courseId);
  const progress = useSongProgress(song.id);
  const learnedIds = useMemo(() => new Set(progress?.learnedLineIds ?? []), [progress]);
  const lines = song.lines;
  const hasLines = lines.length > 0;
  const hasTranslation = lines.some((l) => l.natural);
  const hasPhonetic = lines.some((l) => l.phonetic);
  const sections = useMemo(() => sectionRanges(song), [song]);

  // ───────────── Quelle & Zeitmodus ─────────────
  const media = song.media;
  const sourceOptions = useMemo<SourceChoice[]>(() => {
    const o: SourceChoice[] = [];
    if (media?.youtubeId) o.push('youtube');
    if (media?.spotifyUri) o.push('spotify');
    if (media?.appleMusicUrl) o.push('apple');
    o.push('synth');
    return o;
  }, [media?.youtubeId, media?.spotifyUri, media?.appleMusicUrl]);
  const [sourceKind, setSourceKind] = useState<SourceChoice>(sourceOptions[0]);
  // Eigene Texte ohne Zeiten + echte Musik: Zeilen per Hand (bis per Tap-Sync synchronisiert)
  const [stepPref, setStepPref] = useState(() => Boolean(song.untimed && sourceOptions[0] !== 'synth'));
  const stepForced = sourceKind === 'apple';
  const clock = !stepForced && !stepPref;

  // ───────────── Anzeige & Optionen ─────────────
  const [prefs, setPrefsState] = useState<LocalPrefs>(() =>
    readLocalPrefs<LocalPrefs>({ fontScale: 1, display: settings.songs.showTranslation ? 'both' : 'original', phonetic: settings.songs.showPhonetic }));
  const setPrefs = (patch: Partial<LocalPrefs>) => setPrefsState((p) => {
    const n = { ...p, ...patch };
    writeLocalPrefs(n);
    return n;
  });
  const [vocals, setVocals] = useState(def.vocals);
  const [pauseAfterLine, setPauseAfterLine] = useState(def.pauseAfterLine);
  const [gapPct, setGapPct] = useState<GapPct>(def.gapPct);
  const [tempo, setTempo] = useState(1);
  const [loopFirst, setLoopFirst] = useState<number | null>(null);
  const loop = loopFirst === null ? null : sections.find((r) => r.firstIdx === loopFirst) ?? null;

  const modeRef = useRef(mode);
  useEffect(() => {
    if (modeRef.current === mode) return;
    modeRef.current = mode;
    const d = MODE_DEFAULTS[mode];
    setVocals(d.vocals);
    setPauseAfterLine(d.pauseAfterLine);
    setGapPct(d.gapPct);
  }, [mode]);

  // ───────────── Quellen erzeugen ─────────────
  const vocalsRef = useRef(vocals);
  vocalsRef.current = vocals;
  const [synth, setSynth] = useState<SynthSource | null>(null);
  useEffect(() => {
    if (sourceKind !== 'synth' || !hasLines) return;
    const src = new SynthSource(song, { lang, vocals: vocalsRef.current, ttsRate: () => getSettings().ttsRate });
    setSynth(src);
    return () => {
      src.dispose();
      setSynth(null);
    };
  }, [song, sourceKind, lang, hasLines]);
  useEffect(() => { synth?.setVocals(vocals); }, [synth, vocals]);

  const [embedSource, setEmbedSource] = useState<PlaybackSource | null>(null);
  const source: PlaybackSource | null = sourceKind === 'synth' ? synth : sourceKind === 'apple' ? null : embedSource;

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    setNotice(null);
    if (!source) return;
    return source.onNotice((m) => setNotice(m));
  }, [source]);

  // ───────────── Sitzung ─────────────
  const heard = useRef(new Set<number>());
  const startedRef = useRef(false);
  const finishedRef = useRef(false);
  const completeRecorded = useRef(false);
  const exerciseRecorded = useRef<Record<string, boolean>>({});
  const flawlessRecorded = useRef(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [summary, setSummary] = useState(false);
  const [flawless, setFlawless] = useState(false);
  const addXp = (n: number) => { if (n > 0) setSessionXp((x) => x + n); };

  const [gapResults, setGapResults] = useState<Record<string, Record<number, boolean>>>({});
  const [transResults, setTransResults] = useState<Record<string, boolean>>({});
  const [singScores, setSingScores] = useState<Record<string, { score: number; method: string }>>({});
  const results = useRef({ gapResults, transResults, singScores });
  results.current = { gapResults, transResults, singScores };

  const [manualIdx, setManualIdx] = useState(0);
  const [resumeAt, setResumeAt] = useState<number | null>(() => {
    const p = getRecord('songProgress', song.id);
    return p && shouldOfferResume(p.lastPositionMs, song.durationMs) ? p.lastPositionMs : null;
  });

  const markStarted = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setResumeAt(null);
    const r = recordSongActivity(song, { type: 'play', mode, positionMs: Math.round(source?.getTime() ?? 0) });
    addXp(r.xp);
  };

  const recordExercises = () => {
    const { gapResults: g, transResults: t } = results.current;
    if (mode === 'luecken' && !exerciseRecorded.current.luecken) {
      let correct = 0;
      let total = 0;
      for (const r of Object.values(g)) for (const v of Object.values(r)) { total += 1; if (v) correct += 1; }
      if (total) {
        exerciseRecorded.current.luecken = true;
        addXp(recordSongActivity(song, { type: 'exercise', exerciseType: 'player-luecken', correct, total }).xp);
      }
    }
    if (mode === 'uebersetzung' && !exerciseRecorded.current.uebersetzung) {
      const vals = Object.values(t);
      if (vals.length) {
        exerciseRecorded.current.uebersetzung = true;
        addXp(recordSongActivity(song, { type: 'exercise', exerciseType: 'player-uebersetzung', correct: vals.filter(Boolean).length, total: vals.length }).xp);
      }
    }
  };
  const recordExercisesRef = useRef(recordExercises);
  recordExercisesRef.current = recordExercises;
  useEffect(() => () => recordExercisesRef.current(), []);

  const finish = () => {
    source?.pause();
    tts.stop();
    if (!finishedRef.current) {
      finishedRef.current = true;
      if (!completeRecorded.current && heard.current.size >= Math.ceil(lines.length * HEARD_FOR_COMPLETE)) {
        completeRecorded.current = true;
        addXp(recordSongActivity(song, { type: 'complete' }).xp);
      }
      recordExercises();
      if (startedRef.current) saveSongPosition(song, 0);
    }
    setSummary(true);
  };

  // ───────────── Wiedergabe ─────────────
  const durationMs = (source && source.kind !== 'synth' ? source.getDuration() : null) ?? song.durationMs;
  const pb = usePlayback({
    lines,
    durationMs,
    source,
    clock,
    pauseAfterLine,
    loop,
    onLineHeard: (i) => heard.current.add(i),
    onEnded: () => { if (clock) finish(); },
  });
  const lineIdx = clock ? pb.lineIdx : manualIdx;
  const canPlay = !!source && pb.status !== 'loading' && pb.status !== 'error' && pb.status !== 'none';

  useEffect(() => {
    if (pb.playing) {
      markStarted();
      setSummary(false);
      finishedRef.current = false;
    }
  }, [pb.playing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!clock) heard.current.add(manualIdx);
  }, [clock, manualIdx]);

  // Tempo anwenden (YouTube kennt seine Raten erst nach dem Laden)
  const rates = source?.availableRates() ?? [1];
  const tempoEnabled = !!source?.supportsRate && rates.length > 1;
  useEffect(() => {
    if (source?.supportsRate) source.setRate(rates.includes(tempo) ? tempo : 1);
  }, [source, tempo, pb.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position speichern (periodisch, Pause, Hintergrund, Verlassen)
  const saveInfo = useRef({ clock, manualIdx });
  saveInfo.current = { clock, manualIdx };
  const save = () => {
    if (!startedRef.current || finishedRef.current || !hasLines) return;
    const t = saveInfo.current.clock ? pb.getTime() : lines[saveInfo.current.manualIdx]?.startMs ?? 0;
    saveSongPosition(song, t);
  };
  usePlayerLifecycle({ playing: pb.playing, pause: pb.pause, save });

  // Autoplay (nächster Playlist-Song) – nur wenn der Ton bereits freigeschaltet war
  const autoTried = useRef(false);
  useEffect(() => {
    if (!autoplay || autoTried.current || !source || pb.status !== 'ready' || sourceKind !== 'synth') return;
    autoTried.current = true;
    pb.play();
  }, [autoplay, source, pb.status, sourceKind]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manuelle Sprachausgabe endet beim Verlassen
  useEffect(() => () => tts.stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────────── Lückentext / Karaoke ─────────────
  const masks = useMemo(() => {
    if (gapPct <= 0) return null;
    return new Map(lines.map((l, i) => [i, chooseGaps(l.tokens, gapPct, base, lineSeed(song.id, l.id))] as const));
  }, [lines, gapPct, base, song.id]);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(() => new Set());
  const [revealedLines, setRevealedLines] = useState<Set<number>>(() => new Set());
  const toggleRevealLine = (i: number) => setRevealedLines((old) => {
    const n = new Set(old);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });

  // ───────────── Aktionsmenü (Wort/Zeile) ─────────────
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = (st: SheetState) => {
    pb.pause();
    tts.stop();
    setSheet(st);
    setSheetOpen(true);
  };
  const onWord = (i: number, ti?: number) => {
    const l = lines[i];
    if (l) openSheet({ lineId: l.id, tokenIndex: ti });
  };
  const explain = (i: number) => {
    const l = lines[i];
    if (l) openSheet({ lineId: l.id, initialAction: 'explain-line' });
  };

  // ───────────── Navigation zwischen Zeilen ─────────────
  const speakLine = (i: number) => {
    const l = lines[i];
    if (!l) return;
    markStarted();
    void tts.speak(l.text, { lang, key: `player:${song.id}:${l.id}` });
  };
  const goNext = (i: number) => {
    if (i >= lines.length - 1) {
      finish();
      return;
    }
    if (clock) {
      if (pb.heldAt === i) pb.play();
      else pb.seekLine(i + 1, { play: true });
    } else {
      tts.stop();
      markStarted();
      setManualIdx(i + 1);
    }
  };
  const repeatLine = (i: number) => {
    if (clock) pb.seekLine(i, { play: true });
    else speakLine(i);
  };
  const jump = (i: number) => {
    if (clock) pb.seekLine(i, { play: pb.playing });
    else {
      tts.stop();
      setManualIdx(i);
    }
  };

  // Tastatur (Desktop): Leertaste = Play/Pause, ←/→ = Zeile
  const keys = useRef({ clock, lineIdx, toggle: pb.toggle, prev: pb.prev, next: pb.next, sheetOpen });
  keys.current = { clock, lineIdx, toggle: pb.toggle, prev: pb.prev, next: pb.next, sheetOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || t.closest('input, textarea, select, button, [contenteditable], [role="dialog"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = keys.current;
      if (k.sheetOpen) return;
      if (e.key === ' ' && k.clock) { e.preventDefault(); k.toggle(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (k.clock) k.prev(); else setManualIdx((x) => Math.max(0, x - 1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (k.clock) k.next(); else setManualIdx((x) => Math.min(lines.length - 1, x + 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lines.length]);

  // Eingabe aktiv → Steuerleiste ausblenden (Tastatur verdeckt nichts)
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null) => el instanceof HTMLElement && el.matches('input:not([type="range"]), textarea');
    const onIn = (e: FocusEvent) => { if (isField(e.target)) setTyping(true); };
    const onOut = (e: FocusEvent) => { if (isField(e.target) && !isField(e.relatedTarget)) setTyping(false); };
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  // ───────────── Ergebnisse je Modus ─────────────
  const onSingResult = (line: SongLine, r: PronCheckResult) => {
    const res = recordSongActivity(song, {
      type: 'sing-line', lineId: line.id, scorePct: r.scorePct, target: line.text, method: r.method,
      transcript: r.method === 'speech-recognition' ? r.transcript || undefined : undefined, issues: r.issues,
    });
    addXp(res.xp);
    const prev = results.current.singScores[line.id];
    const nextScores = {
      ...results.current.singScores,
      [line.id]: prev && prev.score >= r.scorePct && prev.method === 'speech-recognition' ? prev : { score: r.scorePct, method: r.method },
    };
    setSingScores(nextScores);
    if (mode === 'mitsingen' && !flawlessRecorded.current && lines.every((l) => nextScores[l.id]?.method === 'speech-recognition' && nextScores[l.id].score >= FLAWLESS_PCT)) {
      flawlessRecorded.current = true;
      addXp(recordSongActivity(song, { type: 'flawless' }).xp);
      setFlawless(true);
    }
  };

  const onLearnChecked = (lineId: string, scorePct: number) => {
    const r = recordSongActivity(song, { type: 'line-learned', lineId, scorePct });
    addXp(r.xp);
    return r.lineLearnedNow;
  };

  // Mitsingen: Mikrofon-Leiste für die aktuelle (bzw. beim Zuhören gesperrte) Zeile
  const [micLock, setMicLock] = useState<number | null>(null);
  const micIdx = micLock ?? Math.max(0, lineIdx);
  const micLine = lines[micIdx];

  // ───────────── Tap-Sync (eigene Texte) ─────────────
  const [tapSync, setTapSync] = useState(false);
  const textId = userTextIdOf(song.id);
  const saveTimings = (timings: number[]) => {
    const rec = textId ? getRecord('songUserTexts', textId) : undefined;
    if (!textId || !rec || !validTimings(timings, lines.length)) {
      toast('Die Zeiten konnten nicht gespeichert werden. Bitte noch einmal tippen.', { tone: 'error' });
      return;
    }
    putRecord('songUserTexts', textId, { ...rec, timings: timings.slice(0, lines.length) }, { localOnly: localOnlyFor(song.id) });
    toast('Zeiten gespeichert – dein Text läuft jetzt synchron.', { tone: 'success' });
    setTapSync(false);
    if (sourceKind !== 'apple') setStepPref(false);
  };
  const tapSource = embedSource && ['ready', 'paused', 'playing', 'ended'].includes(embedSource.getStatus()) && sourceKind !== 'synth' ? embedSource : null;

  // ───────────── Playlist ─────────────
  const playlist = useRecord('playlists', playlistId ?? '');
  const all = useAllSongs();
  const queue = playlistId && playlist ? playlist.songIds : [];
  const qIdx = queue.indexOf(song.id);
  const nextId = qIdx >= 0 ? queue.slice(qIdx + 1).find((id) => all.songs.some((x) => x.id === id)) : undefined;
  const nextSong = nextId ? all.songs.find((x) => x.id === nextId) : undefined;
  const goSong = useCallback((id: string, auto: boolean) => {
    const q = new URLSearchParams({ modus: mode });
    if (playlistId) q.set('playlist', playlistId);
    navigate(`/songs/${encodeURIComponent(id)}/spielen?${q.toString()}`, { replace: true, state: { autoplay: auto } });
  }, [mode, navigate, playlistId]);
  const [advanceIn, setAdvanceIn] = useState<number | null>(null);
  useEffect(() => {
    if (summary && nextId) setAdvanceIn(8);
    else setAdvanceIn(null);
  }, [summary, nextId]);
  useEffect(() => {
    if (advanceIn === null || !nextId) return;
    if (advanceIn <= 0) {
      goSong(nextId, true);
      return;
    }
    const id = window.setTimeout(() => setAdvanceIn((n) => (n === null ? null : n - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [advanceIn, nextId, goSong]);

  // ───────────── Sheets ─────────────
  const [displayOpen, setDisplayOpen] = useState(false);
  const [loopOpen, setLoopOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const cycleTempo = () => {
    if (!tempoEnabled) {
      toast(source?.rateReason ?? 'Das Tempo lässt sich bei dieser Quelle nicht ändern.', { tone: 'info' });
      return;
    }
    const order = TEMPO_ORDER.filter((r) => rates.includes(r));
    setTempo(order[(order.indexOf(tempo) + 1) % order.length] ?? 1);
  };

  const restart = () => {
    setSummary(false);
    finishedRef.current = false;
    heard.current.clear();
    if (clock) {
      pb.seek(0);
      pb.play();
    } else {
      setManualIdx(0);
    }
  };

  const resume = () => {
    if (resumeAt === null) return;
    if (clock) {
      pb.seek(resumeTarget(lines, resumeAt));
      pb.play();
    } else {
      setManualIdx(Math.max(0, lineIndexAt(lines, resumeAt, 0)));
      markStarted();
    }
    setResumeAt(null);
  };

  // ───────────── Darstellung ─────────────
  const backTo = playlistId ? `/songs/playlist/${encodeURIComponent(playlistId)}` : `/songs/${encodeURIComponent(song.id)}`;
  const showPanels = !clock || !pb.playing;
  const syllableMs = sourceKind === 'synth' && vocals ? TTS_SYLLABLE_MS / Math.max(0.5, settings.ttsRate || 0.95) : undefined;
  // Bei Quellfehler (z. B. ohne Web Audio) erklärt die Fehlermeldung die Lage – „nur Begleitmusik“ wäre dann falsch.
  const voiceHelp = sourceKind === 'synth' && vocals && pb.status !== 'error'
    ? (tts.available ? tts.missingVoiceHelp(lang) : 'Dein Browser hat keine Sprachausgabe – du hörst nur die Begleitmusik.')
    : null;

  const renderPanel = (i: number) => {
    if (!showPanels) return null;
    const line = lines[i];
    if (!line) return null;
    const isLast = i >= lines.length - 1;
    switch (mode) {
      case 'zeilen':
        return (
          <LearnPanel
            key={line.id}
            song={song}
            idx={i}
            base={base}
            strictAccents={settings.strictAccents}
            learned={learnedIds.has(line.id)}
            isLast={isLast}
            onRepeat={() => repeatLine(i)}
            onExplain={() => explain(i)}
            onContinue={() => goNext(i)}
            onChecked={onLearnChecked}
          />
        );
      case 'luecken':
        return (
          <GapPanel
            key={`${line.id}:${gapPct}`}
            song={song}
            idx={i}
            gaps={masks?.get(i) ?? []}
            base={base}
            strictAccents={settings.strictAccents}
            result={gapResults[line.id]}
            isLast={isLast}
            onChecked={(id, r) => setGapResults((old) => ({ ...old, [id]: r }))}
            onRepeat={() => repeatLine(i)}
            onExplain={() => explain(i)}
            onContinue={() => goNext(i)}
          />
        );
      case 'uebersetzung':
        return (
          <TranslatePanel
            key={line.id}
            song={song}
            idx={i}
            result={transResults[line.id]}
            isLast={isLast}
            onResult={(id, ok) => setTransResults((old) => ({ ...old, [id]: ok }))}
            onRepeat={() => repeatLine(i)}
            onExplain={() => explain(i)}
            onContinue={() => goNext(i)}
          />
        );
      case 'aussprache':
        return (
          <PronPanel
            key={line.id}
            song={song}
            idx={i}
            lang={lang}
            isLast={isLast}
            onResult={onSingResult}
            onExplain={() => explain(i)}
            onContinue={() => goNext(i)}
          />
        );
      default:
        return (
          <div className={s.panelLite}>
            <LineActions
              onRepeat={() => repeatLine(i)}
              onExplain={() => explain(i)}
              extra={mode === 'karaoke' ? (
                <Button variant="secondary" icon={revealedLines.has(i) ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />} onClick={() => toggleRevealLine(i)}>
                  {revealedLines.has(i) ? 'Verdecken' : 'Aufdecken'}
                </Button>
              ) : null}
              onContinue={!clock || pb.heldAt === i ? () => goNext(i) : undefined}
              continueLabel={isLast ? 'Abschließen' : 'Weiter'}
            />
          </div>
        );
    }
  };

  const lineBadge = (i: number) => {
    const l = lines[i];
    if (!l) return null;
    if (mode === 'mitsingen' || mode === 'aussprache') {
      const sc = singScores[l.id];
      if (!sc) return null;
      return (
        <span className={s.lineBadge}>
          <Badge tone={sc.score >= FLAWLESS_PCT ? 'success' : sc.score >= 50 ? 'gold' : 'neutral'} icon={<Mic size={12} aria-hidden="true" />}>
            {sc.score} %{sc.method !== 'speech-recognition' ? ' (selbst)' : ''}
          </Badge>
        </span>
      );
    }
    if (mode === 'zeilen' && learnedIds.has(l.id)) {
      return <span className={s.lineBadge}><Badge tone="success" icon={<Check size={12} aria-hidden="true" />}>Gelernt</Badge></span>;
    }
    if (mode === 'luecken' && gapResults[l.id]) {
      const r = Object.values(gapResults[l.id]);
      return <span className={s.lineBadge}><Badge tone={r.every(Boolean) ? 'success' : 'neutral'}>{r.filter(Boolean).length}/{r.length}</Badge></span>;
    }
    if (mode === 'uebersetzung' && transResults[l.id] !== undefined) {
      return <span className={s.lineBadge}><Badge tone={transResults[l.id] ? 'success' : 'neutral'}>{transResults[l.id] ? 'Verstanden' : 'Nochmal üben'}</Badge></span>;
    }
    return null;
  };

  const coverStyle = { background: `linear-gradient(135deg, ${song.cover.from}, ${song.cover.to})` };
  const heardCount = heard.current.size;
  const gapStats = Object.values(gapResults).flatMap((r) => Object.values(r));
  const transStats = Object.values(transResults);
  const singStats = Object.values(singScores);

  if (!hasLines) {
    return (
      <Page title={song.title} back={backTo} largeTitle={false}>
        <EmptyState
          title="Noch kein Text"
          description="Dieser Song hat noch keine Zeilen. Ergänze den Text, dann kannst du ihn hier abspielen."
          action={textId ? <Button to={`/songs/eigener-text/${encodeURIComponent(textId)}`}>Text bearbeiten</Button> : <Button to="/songs">Zu den Songs</Button>}
        />
      </Page>
    );
  }

  return (
    <Page
      title={song.title}
      back={backTo}
      largeTitle={false}
      gap="none"
      className={s.page}
      actions={(
        <>
          {queue.length > 0 && <IconButton label="Warteschlange" icon={<ListMusic size={20} />} onClick={() => setQueueOpen(true)} />}
          <IconButton label="Anzeige & Übung einstellen" icon={<span className={s.aa} aria-hidden="true">Aa</span>} onClick={() => setDisplayOpen(true)} />
        </>
      )}
    >
      <div className={s.glow} style={{ '--c1': song.cover.from, '--c2': song.cover.to } as CSSProperties} aria-hidden="true" />

      <header className={cx(s.hero, mode === 'hoeren' && s.heroLarge)}>
        <div className={s.cover} style={coverStyle} aria-hidden="true"><span>{song.cover.emoji}</span></div>
        <div className={s.heroText}>
          <p className={s.heroTitle}>{song.title}</p>
          <p className={s.heroArtist}>{song.artist || (isUser ? 'Eigener Text' : '')}{queue.length > 0 && qIdx >= 0 ? ` · ${qIdx + 1}/${queue.length} in „${playlist?.name ?? 'Playlist'}“` : ''}</p>
          <button type="button" className={s.modeChip} onClick={() => setModeOpen(true)} aria-haspopup="dialog">
            <span className={s.modeChipNr} aria-hidden="true">{modeInfo.nr}</span>
            {modeInfo.title}
            <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className={s.notes}>
        {sourceKind === 'synth' && (
          <p className={s.honest}>
            <Info size={16} aria-hidden="true" />
            {isUser
              ? 'Vorlesen: Begleitmusik im Browser erzeugt, Text per Sprachausgabe.'
              : 'Demo-Lernlied: Begleitmusik im Browser erzeugt, Gesang per Sprachausgabe.'}
          </p>
        )}
        {sourceKind !== 'synth' && <p className={s.honest}><Info size={16} aria-hidden="true" /> Quelle: {SOURCE_LABEL[sourceKind]} (offizielle Einbettung)</p>}
        {userVariant !== song.variant && song.courseId !== 'pt-BR' && (
          <p className={s.honest}><Info size={16} aria-hidden="true" /> Dieses Lied nutzt Spanisch aus {VARIANT_SHORT[song.variant]} – dein Kurs ist auf {VARIANT_SHORT[userVariant]} eingestellt.</p>
        )}
        {isUser && song.untimed && !tapSync && (
          <div className={s.callout}>
            <Timer size={18} aria-hidden="true" />
            <p>{clock ? 'Die Zeiten sind geschätzt.' : 'Dein Text hat noch keine Zeiten – schalte die Zeilen per Hand weiter.'} Mit Tap-Sync läuft er synchron zur Musik.</p>
            <Button variant="secondary" onClick={() => { pb.pause(); setTapSync(true); }}>Zeiten tippen</Button>
          </div>
        )}
        {mode === 'mitsingen' && (
          <p className={s.callout}><Mic size={18} aria-hidden="true" /> Bewertet wird nur die Aussprache (Verständlichkeit laut Spracherkennung), nicht deine Stimme. Mit Kopfhörern klappt die Erkennung besser.</p>
        )}
        {mode === 'aussprache' && <p className={s.honest}><Info size={16} aria-hidden="true" /> {SCORE_DISCLAIMER}</p>}
        {voiceHelp && <p className={s.warn} role="status"><AlertTriangle size={16} aria-hidden="true" /> {voiceHelp}</p>}
        {notice && <p className={s.warn} role="status"><AlertTriangle size={16} aria-hidden="true" /> {notice}</p>}
        {/* Im Schritt-Modus braucht es die Wiedergabe nicht – der Fehler blockiert dann nichts mehr. */}
        {clock && source?.getStatus() === 'error' && (
          <div className={s.errorBox} role="alert">
            <p><AlertTriangle size={18} aria-hidden="true" /> {source.error ?? 'Die Wiedergabe ist fehlgeschlagen.'}</p>
            <div className={s.actions}>
              {sourceKind !== 'synth' && <Button variant="secondary" onClick={() => setSourceKind('synth')}>Stattdessen vorlesen</Button>}
              <Button variant="secondary" onClick={() => setStepPref(true)}>Schritt-Modus nutzen</Button>
            </div>
          </div>
        )}
      </div>

      {(sourceKind === 'youtube' || sourceKind === 'spotify' || sourceKind === 'apple') && (
        <MediaEmbed kind={sourceKind} song={song} onSource={setEmbedSource} />
      )}

      {resumeAt !== null && !startedRef.current && (clock ? canPlay : true) && (
        <div className={s.resume} role="region" aria-label="Fortsetzen">
          <p>Fortsetzen bei <strong>{formatTime(resumeAt)}</strong>?</p>
          <div className={s.actions}>
            <Button variant="ghost" onClick={() => setResumeAt(null)}>Von vorn</Button>
            <Button variant="primary" icon={<Play size={16} aria-hidden="true" />} onClick={resume}>Fortsetzen</Button>
          </div>
        </div>
      )}

      {tapSync ? (
        <TapSync song={song} source={tapSource} onSave={saveTimings} onCancel={() => setTapSync(false)} />
      ) : (
        <LyricsView
          song={song}
          lang={lang}
          lineIdx={lineIdx}
          focus={mode === 'hoeren'}
          display={hasTranslation ? prefs.display : 'original'}
          showPhonetic={prefs.phonetic && hasPhonetic}
          fontScale={prefs.fontScale}
          masks={masks}
          gapInputMode={mode === 'luecken'}
          gapResults={gapResults}
          hints={mode === 'karaoke'}
          revealedLines={revealedLines}
          revealedWords={revealedWords}
          onRevealWord={(k) => setRevealedWords((old) => new Set(old).add(k))}
          playing={pb.playing}
          clock={clock}
          getTime={pb.getTime}
          syllableMs={syllableMs}
          onWord={onWord}
          onJump={jump}
          renderPanel={renderPanel}
          lineBadge={lineBadge}
        />
      )}

      {summary && (
        <section className={s.summary} aria-labelledby="pl-summary" aria-live="polite">
          <div className={s.summaryIcon} aria-hidden="true">{flawless ? <Sparkles size={26} /> : <PartyPopper size={26} />}</div>
          <h2 id="pl-summary" className={s.summaryTitle}>{flawless ? 'Fehlerfrei gesungen!' : 'Durchgang geschafft!'}</h2>
          <ul className={s.stats}>
            <li><strong>{Math.min(heardCount, lines.length)}/{lines.length}</strong> Zeilen {clock ? 'gehört' : 'durchgegangen'}</li>
            {mode === 'luecken' && gapStats.length > 0 && <li><strong>{gapStats.filter(Boolean).length}/{gapStats.length}</strong> Lücken richtig</li>}
            {mode === 'uebersetzung' && transStats.length > 0 && <li><strong>{transStats.filter(Boolean).length}/{transStats.length}</strong> Zeilen verstanden</li>}
            {(mode === 'mitsingen' || mode === 'aussprache') && singStats.length > 0 && (
              <li><strong>{Math.round(singStats.reduce((a, b) => a + b.score, 0) / singStats.length)} %</strong> Ø Verständlichkeit ({singStats.length} Zeilen)</li>
            )}
            {mode === 'zeilen' && <li><strong>{lines.filter((l) => learnedIds.has(l.id)).length}/{lines.length}</strong> Zeilen gelernt</li>}
            {sessionXp > 0 && <li><strong>+{sessionXp} XP</strong> in dieser Runde</li>}
          </ul>
          {heardCount < Math.ceil(lines.length * HEARD_FOR_COMPLETE) && !completeRecorded.current && (
            <p className={s.muted}>Tipp: Hör den Song einmal komplett durch, dann zählt er als abgeschlossen.</p>
          )}
          {nextSong && (
            <p className={s.upNext} aria-live="polite">
              Als Nächstes: <strong>{nextSong.title}</strong>{advanceIn !== null ? ` – startet in ${advanceIn} s` : ''}
            </p>
          )}
          <div className={s.actions}>
            <Button variant="secondary" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={restart}>Nochmal</Button>
            {nextSong && advanceIn !== null && <Button variant="ghost" onClick={() => setAdvanceIn(null)}>Hier bleiben</Button>}
            {nextSong && <Button variant="primary" icon={<SkipForward size={16} aria-hidden="true" />} onClick={() => goSong(nextSong.id, true)}>Nächster Song</Button>}
            {!isUser && <Button variant={nextSong ? 'secondary' : 'primary'} to={`/songs/${encodeURIComponent(song.id)}/uebungen`}>Übungen zum Song</Button>}
            <Button variant="ghost" to={`/songs/${encodeURIComponent(song.id)}`}>Zur Songseite</Button>
          </div>
        </section>
      )}

      <div className={s.barSpacer} aria-hidden="true" />

      {!tapSync && (
        <ControlBar
          hidden={typing}
          clock={clock}
          playing={pb.playing}
          loading={clock && pb.status === 'loading'}
          canPlay={canPlay}
          timeMs={pb.timeMs}
          durationMs={durationMs}
          lineIdx={lineIdx}
          lineCount={lines.length}
          onToggle={pb.toggle}
          onSeek={pb.seek}
          onPrev={() => { if (clock) pb.prev(); else { tts.stop(); setManualIdx((x) => Math.max(0, x - 1)); } }}
          onNext={() => { if (clock) pb.next(); else goNext(manualIdx); }}
          onRepeat={pb.repeat}
          onSpeakLine={tts.available ? () => { if (tts.speaking) tts.stop(); else speakLine(manualIdx); } : undefined}
          speaking={tts.speaking}
          onOpenDisplay={() => setDisplayOpen(true)}
          tempo={tempo}
          tempoEnabled={tempoEnabled}
          tempoReason={source?.rateReason}
          onTempo={cycleTempo}
          pauseAfterLine={pauseAfterLine}
          onTogglePauseAfterLine={() => setPauseAfterLine((v) => !v)}
          loopLabel={loop?.label ?? null}
          onOpenLoop={() => setLoopOpen(true)}
          vocals={vocals}
          onToggleVocals={sourceKind === 'synth' ? () => setVocals((v) => !v) : undefined}
          micSlot={mode === 'mitsingen' && micLine ? (
            <LineMic
              key={micLine.id}
              song={song}
              line={micLine}
              lineNo={micIdx + 1}
              lang={lang}
              variant="bar"
              onResult={onSingResult}
              onBusyChange={(busy) => setMicLock(busy ? micIdx : null)}
            />
          ) : null}
        />
      )}

      {sheet && (
        <LyricActionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          song={song}
          lineId={sheet.lineId}
          tokenIndex={sheet.tokenIndex}
          courseId={song.courseId}
          variant={song.variant}
          initialAction={sheet.initialAction}
        />
      )}

      <DisplaySheet
        open={displayOpen}
        onClose={() => setDisplayOpen(false)}
        hasTranslation={hasTranslation}
        hasPhonetic={hasPhonetic}
        fontScale={prefs.fontScale}
        onFontScale={(v) => setPrefs({ fontScale: v })}
        display={prefs.display}
        onDisplay={(v) => setPrefs({ display: v })}
        phonetic={prefs.phonetic}
        onPhonetic={(v) => setPrefs({ phonetic: v })}
        gapPct={gapPct}
        onGapPct={setGapPct}
        clock={clock}
        pauseAfterLine={pauseAfterLine}
        onPauseAfterLine={setPauseAfterLine}
        tempo={tempo}
        rates={tempoEnabled ? rates : [1]}
        tempoReason={tempoEnabled ? undefined : source?.rateReason}
        onTempo={setTempo}
        vocals={vocals}
        onVocals={sourceKind === 'synth' ? setVocals : undefined}
        sources={sourceOptions}
        source={sourceKind}
        onSource={(v) => { pb.pause(); setSourceKind(v); if (v === 'synth') setStepPref(false); }}
        stepMode={!clock}
        stepForced={stepForced}
        onStepMode={(v) => { pb.pause(); setStepPref(v); if (v) setManualIdx(Math.max(0, pb.lineIdx)); }}
        onTapSync={isUser ? () => { pb.pause(); setDisplayOpen(false); setTapSync(true); } : undefined}
      />
      <LoopSheet
        open={loopOpen}
        onClose={() => setLoopOpen(false)}
        sections={sections}
        value={loopFirst}
        onChange={(v) => {
          setLoopFirst(v);
          setLoopOpen(false);
          if (v !== null) pb.seekLine(v, { play: pb.playing });
        }}
      />
      <ModeSheet
        open={modeOpen}
        onClose={() => setModeOpen(false)}
        value={mode}
        onChange={(k) => {
          setModeOpen(false);
          setSearch((prev) => {
            const q = new URLSearchParams(prev);
            q.set('modus', k);
            return q;
          }, { replace: true });
        }}
      />
      {queue.length > 0 && (
        <QueueSheet
          open={queueOpen}
          onClose={() => setQueueOpen(false)}
          name={playlist?.name ?? ''}
          songs={queue.map((id) => ({ id, song: all.songs.find((x) => x.id === id) ?? null }))}
          currentId={song.id}
          onPick={(id) => { setQueueOpen(false); if (id !== song.id) goSong(id, false); }}
        />
      )}
    </Page>
  );
}
