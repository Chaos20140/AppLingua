/**
 * Song-Übungen (/songs/:songId/uebungen): gemischte Runde, einzelne Übungsarten, schwierige Stellen
 * und – mit ?boss=1 – die Boss-Challenge. Aufgaben erzeugt ./generator (deterministisch je Seed),
 * gespielt wird mit der gemeinsamen ExerciseView + useExerciseSession (context 'song', refId songId).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Clock, Crown, Info, Layers, ListChecks, Shuffle, Target, Trophy } from 'lucide-react';
import type { Song } from '../../../content/types';
import { recordSongActivity, useSongMastery, useSongProgress, type SongActivityResult } from '../../../state/songs';
import type { SessionSummary } from '../../exercises/contract';
import { Badge, Button, EmptyState, ErrorState, Page, ProgressRing, Skeleton, useToast } from '../../../ui';
import { useSongById } from '../catalog';
import { SongCover } from '../SongCard';
import { VARIANT_FLAG, VARIANT_SHORT } from '../songData';
import { userTextIdOf } from '../userText';
import { BossChallenge } from './BossChallenge';
import {
  availableKinds, buildPool, bossSections, generateMixed, generateReview, generateRound, isAnnotated, kindMeta,
  SONG_EX_KINDS, weakLines, type SongExercise, type SongExMode,
} from './generator';
import { KIND_ICON } from './kindIcons';
import { RoundResult } from './RoundResult';
import { RoundRunner } from './RoundRunner';
import { useSongFocus } from './useSongFocus';
import s from './SongExercises.module.css';

export default function SongExercisesPage() {
  const { songId = '' } = useParams();
  const [params] = useSearchParams();
  const { song, loading, error, retry } = useSongById(songId);
  const back = `/songs/${encodeURIComponent(songId)}`;

  if (!song && loading) return <LoadingView back={back} />;
  if (!song && error) {
    return (
      <Page title="Song-Übungen" back={back}>
        <ErrorState title="Song konnte nicht geladen werden" message={error} onRetry={retry} />
      </Page>
    );
  }
  if (!song) {
    return (
      <Page title="Song-Übungen" back="/songs">
        <EmptyState
          title="Song nicht gefunden"
          description="Vielleicht wurde der eigene Text gelöscht oder der Link ist nicht mehr aktuell."
          action={<Button to="/songs">Zur Song-Bibliothek</Button>}
        />
      </Page>
    );
  }
  if (params.get('boss') === '1') return <BossChallenge key={song.id} song={song} />;
  return <ExerciseHub key={song.id} song={song} />;
}

function LoadingView({ back }: { back: string }) {
  return (
    <Page title="Song-Übungen" back={back}>
      <div className={s.skel} aria-busy="true" aria-label="Übungen werden geladen">
        <Skeleton height={96} radius="var(--r-xl)" />
        <Skeleton height={176} radius="var(--r-xl)" />
        <div className={s.skelGrid}>
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={128} radius="var(--r-lg)" />)}
        </div>
      </div>
    </Page>
  );
}

// ───────────────────────── Auswahl, Runde, Ergebnis ─────────────────────────

interface Round { mode: SongExMode; items: SongExercise[]; masteryBefore: number }
type Phase =
  | { kind: 'pick' }
  | { kind: 'run'; round: Round; token: number }
  | { kind: 'result'; round: Round; summary: SessionSummary; activity: SongActivityResult | null; saveError: string | null };

const modeLabel = (m: SongExMode) => (m === 'mixed' ? 'Gemischte Runde' : m === 'review' ? 'Schwierige Stellen' : kindMeta(m).label);
const isMode = (m: unknown): m is SongExMode =>
  m === 'mixed' || m === 'review' || SONG_EX_KINDS.some((k) => k.key === m);

function ExerciseHub({ song }: { song: Song }) {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const focus = useSongFocus(song);
  const mastery = useSongMastery(song);
  const progress = useSongProgress(song.id);
  const [phase, setPhase] = useState<Phase>({ kind: 'pick' });
  const tokenRef = useRef(0);

  const annotated = isAnnotated(song);
  const pool = useMemo(() => buildPool(song, 0), [song]);
  const kinds = useMemo(() => availableKinds(pool), [pool]);
  const mixedCount = useMemo(() => generateMixed(song, { seed: 0 }).length, [song]);
  const weak = useMemo(() => weakLines(song, focus, 10), [song, focus]);
  const reviewCount = useMemo(() => generateReview(song, { seed: 0, focus }).length, [song, focus]);
  const hasFocusData = Object.keys(focus.lineScores ?? {}).length + Object.keys(focus.pronScores ?? {}).length + (focus.errorLineIds?.length ?? 0) > 0;
  const bossReady = useMemo(() => bossSections(song).length > 0, [song]);

  const start = useCallback((mode: SongExMode) => {
    const seed = `${Date.now().toString(36)}-${++tokenRef.current}`;
    const items = generateRound(song, mode, { seed, focus });
    if (!items.length) {
      toast('Für diese Auswahl gibt es gerade keine Aufgaben.', { tone: 'info' });
      return;
    }
    setPhase({ kind: 'run', round: { mode, items, masteryBefore: mastery.total }, token: tokenRef.current });
    window.scrollTo({ top: 0 });
  }, [song, focus, mastery.total, toast]);

  // Direktstart (z. B. „Schwierige Stellen üben“ nach der Boss-Challenge)
  const autoStarted = useRef(false);
  useEffect(() => {
    const wanted = (location.state as { start?: unknown } | null)?.start;
    if (autoStarted.current || !isMode(wanted)) return;
    autoStarted.current = true;
    navigate(location.pathname + location.search, { replace: true, state: null });
    start(wanted);
  }, [location, navigate, start]);

  const finish = (round: Round, summary: SessionSummary) => {
    let activity: SongActivityResult | null = null;
    let saveError: string | null = null;
    try {
      activity = recordSongActivity(song, { type: 'exercise', exerciseType: round.mode, correct: summary.correct, total: summary.total });
    } catch {
      saveError = 'Das Ergebnis konnte nicht gespeichert werden – deine Antworten siehst du trotzdem unten.';
    }
    setPhase({ kind: 'result', round, summary, activity, saveError });
    window.scrollTo({ top: 0 });
  };

  const base = `/songs/${encodeURIComponent(song.id)}`;

  if (phase.kind === 'run') {
    return (
      <RoundRunner
        key={phase.token}
        song={song}
        items={phase.round.items}
        title={modeLabel(phase.round.mode)}
        context="song"
        onFinish={(summary) => finish(phase.round, summary)}
        onCancel={() => setPhase({ kind: 'pick' })}
      />
    );
  }

  if (phase.kind === 'result') {
    return (
      <Page title="Auswertung" back={base}>
        <RoundResult
          song={song}
          title={modeLabel(phase.round.mode)}
          summary={phase.summary}
          items={phase.round.items}
          activity={phase.activity}
          saveError={phase.saveError}
          masteryBefore={phase.round.masteryBefore}
          onAgain={() => start(phase.round.mode)}
          onPick={() => { setPhase({ kind: 'pick' }); window.scrollTo({ top: 0 }); }}
        />
      </Page>
    );
  }

  const textId = userTextIdOf(song.id);
  if (!kinds.length) {
    return (
      <Page title="Song-Übungen" back={base}>
        <EmptyState
          icon={<Layers size={28} />}
          title="Zu wenig Text für Übungen"
          description="Übungen brauchen Zeilen mit mindestens drei Wörtern. Ergänze deinen Text – dann geht es los."
          action={textId
            ? <Button to={`/songs/eigener-text/${encodeURIComponent(textId)}`}>Text bearbeiten</Button>
            : <Button to={base}>Zum Song</Button>}
        />
      </Page>
    );
  }

  const heroStyle = { '--from': song.cover.from } as CSSProperties;
  return (
    <Page title="Song-Übungen" back={base}>
      <div className={s.stack}>
        <header className={`${s.hero} ${s.appear}`} style={heroStyle}>
          <span className={s.heroGlow} aria-hidden="true" />
          <SongCover song={song} size="sm" />
          <div className={s.heroText}>
            <h2 className={s.heroTitle}>{song.title}</h2>
            {song.artist && <span className={s.sub}>{song.artist}</span>}
            <div className={s.heroMeta}>
              <Badge tone="neutral">{song.level}</Badge>
              <Badge tone="neutral">{VARIANT_FLAG[song.variant]} {VARIANT_SHORT[song.variant]}</Badge>
            </div>
          </div>
          <div className={s.ringWrap}>
            <ProgressRing value={mastery.total / 100} label="Song-Mastery" size={64} stroke={7} tone="gold">
              <span className={s.ringValue}>{Math.round(mastery.total)}</span>
            </ProgressRing>
            <span className={s.ringLabel}>Mastery</span>
          </div>
        </header>

        <section className={`${s.feature} ${s.appear}`} style={{ '--i': 1 } as CSSProperties} aria-labelledby="mixed-title">
          <div className={s.featureHead}>
            <span className={s.featureIcon}><Shuffle size={24} aria-hidden="true" /></span>
            <div>
              <h2 id="mixed-title" className={s.featureTitle}>Gemischte Runde</h2>
              <p className={s.featureText}>Alle Übungsarten im Wechsel – Zeilen, bei denen du noch unsicher bist, kommen öfter dran.</p>
            </div>
          </div>
          <ul className={s.featureFacts}>
            <li><ListChecks size={14} aria-hidden="true" /> {mixedCount} Aufgaben</li>
            <li><Layers size={14} aria-hidden="true" /> {kinds.length} Übungsarten</li>
            <li><Clock size={14} aria-hidden="true" /> ca. {Math.max(2, Math.round(mixedCount * 0.5))} Min.</li>
          </ul>
          <button type="button" className={s.featureBtn} onClick={() => start('mixed')}>
            Runde starten <ChevronRight size={18} aria-hidden="true" />
          </button>
        </section>

        {reviewCount > 0 && (
          <section className={`${s.rowCard} ${s.appear}`} style={{ '--i': 2 } as CSSProperties} aria-labelledby="review-title">
            <span className={s.rowIcon}><Target size={22} aria-hidden="true" /></span>
            <div className={s.rowText}>
              <h2 id="review-title" className={s.rowTitle}>Schwierige Stellen</h2>
              <p className={s.sub}>
                {hasFocusData
                  ? `${weak.length} ${weak.length === 1 ? 'Zeile' : 'Zeilen'} mit niedrigen Werten oder offenen Fehlern – gezielt wiederholen.`
                  : 'Noch keine Werte: Wir starten mit den anspruchsvollsten Zeilen des Songs.'}
              </p>
            </div>
            <div className={s.rowAction}>
              <Button variant="secondary" onClick={() => start('review')}>Gezielt üben</Button>
            </div>
          </section>
        )}

        <section className={s.section} aria-labelledby="kinds-title">
          <h2 id="kinds-title" className={s.h2}>Übungsarten</h2>
          <ul className={s.kindGrid}>
            {kinds.map((k, i) => {
              const meta = kindMeta(k.kind);
              const Icon = KIND_ICON[k.kind];
              return (
                <li key={k.kind} className={s.appear} style={{ '--i': i + 3 } as CSSProperties}>
                  <button type="button" className={s.kindTile} onClick={() => start(k.kind)}>
                    <span className={s.kindIcon}><Icon size={20} aria-hidden="true" /></span>
                    <span className={s.kindLabel}>{meta.label}</span>
                    <span className={s.kindDesc}>{meta.description}</span>
                    <span className={s.kindCount}>{k.roundSize} {k.roundSize === 1 ? 'Aufgabe' : 'Aufgaben'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {!annotated && (
          <div className={s.note} role="note">
            <Info size={18} aria-hidden="true" />
            <p>
              <strong>Eigener Text:</strong> Lückentext, Anordnen, Diktat, gehörte Wörter und Aussprache funktionieren mit
              jedem Text. Übersetzungen zuordnen, Verbformen, Grammatik, Redewendungen, Alltagsdialoge und die
              Boss-Challenge brauchen geprüfte Übersetzungen und Erklärungen – die haben nur die Demo-Lernlieder.
            </p>
          </div>
        )}

        {bossReady && (
          <section className={`${s.rowCard} ${s.appear}`} aria-labelledby="boss-card-title">
            <span className={`${s.rowIcon} ${s.rowIconGold}`}><Crown size={22} aria-hidden="true" /></span>
            <div className={s.rowText}>
              <h2 id="boss-card-title" className={s.rowTitle}>
                Boss-Challenge{' '}
                {progress?.bossPassedAt && <Badge tone="gold" icon={<Trophy size={12} aria-hidden="true" />}>Besiegt</Badge>}
              </h2>
              <p className={s.sub}>Einen Abschnitt nur hören und ohne Hilfen verstehen.</p>
            </div>
            <div className={s.rowAction}>
              <Button variant="secondary" to={`${base}/uebungen?boss=1`}>Herausfordern</Button>
            </div>
          </section>
        )}
      </div>
    </Page>
  );
}
