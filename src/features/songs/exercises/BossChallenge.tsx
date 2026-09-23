/**
 * Boss-Challenge eines Songs (/songs/:songId/uebungen?boss=1):
 * Abschnitt wählen → Abschnitt ohne Text anhören (Sprachausgabe, einmal langsam möglich) →
 * Verständnisfragen ohne Hilfen (Prüfungsmodus) → ab SONG_BOSS_PASS_PCT % gewonnen. Jederzeit wiederholbar.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Check, CircleAlert, Crown, Ear, EyeOff, Headphones, Play, RotateCcw, Shield, Snail, Square, Target, Trophy,
} from 'lucide-react';
import type { Song } from '../../../content/types';
import { SONG_BOSS_PASS_PCT } from '../../../engine/songs';
import { ttsLangFor } from '../../../state/settings';
import { recordSongActivity, useSongMastery, useSongProgress, type SongActivityResult } from '../../../state/songs';
import { stopSpeaking, useTts } from '../../../speech/tts';
import type { SessionSummary } from '../../exercises/contract';
import { Badge, Button, Card, EmptyState, IconButton, Page, ProgressBar } from '../../../ui';
import { bossSections, generateBoss, vocabFor, type BossSection, type SongExercise } from './generator';
import { MistakeList, VocabRescue } from './RoundResult';
import { RoundRunner } from './RoundRunner';
import s from './SongExercises.module.css';

type Phase =
  | { kind: 'select' }
  | { kind: 'listen'; section: BossSection; items: SongExercise[] }
  | { kind: 'quiz'; section: BossSection; items: SongExercise[]; masteryBefore: number }
  | {
    kind: 'result'; section: BossSection; items: SongExercise[]; summary: SessionSummary;
    activity: SongActivityResult | null; saveError: string | null; masteryBefore: number;
  };

const newSeed = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
/** bevorzugt den Refrain als Vorauswahl */
const preferred = (list: BossSection[]) => list.find((x) => /refr|chor|estribillo/i.test(x.label)) ?? list[0];

export function BossChallenge({ song }: { song: Song }) {
  const base = `/songs/${encodeURIComponent(song.id)}`;
  const progress = useSongProgress(song.id);
  const mastery = useSongMastery(song);
  const sections = useMemo(
    () => bossSections(song).filter((sec) => generateBoss(song, sec.id, { seed: 0 }).length >= 3),
    [song],
  );
  const [selected, setSelected] = useState<string>(() => preferred(sections)?.id ?? '');
  const [phase, setPhase] = useState<Phase>({ kind: 'select' });

  const top = () => window.scrollTo({ top: 0 });
  const begin = (section: BossSection) => {
    setPhase({ kind: 'listen', section, items: generateBoss(song, section.id, { seed: newSeed() }) });
    top();
  };

  if (!sections.length) {
    return (
      <Page title="Boss-Challenge" back={`${base}/uebungen`}>
        <EmptyState
          icon={<Crown size={28} />}
          title="Für diesen Song noch nicht verfügbar"
          description={song.license.kind === 'user-private'
            ? 'Die Boss-Challenge fragt nach der Bedeutung jeder Zeile – dafür braucht es geprüfte Übersetzungen. Eigene Texte haben die nicht. Übe stattdessen mit Lückentext, Diktat und Aussprache.'
            : 'Kein Abschnitt dieses Songs hat genug übersetzte Zeilen für eine faire Challenge.'}
          action={<Button to={`${base}/uebungen`}>Zu den Übungen</Button>}
        />
      </Page>
    );
  }

  if (phase.kind === 'listen') {
    return (
      <ListenStage
        song={song}
        section={phase.section}
        onStart={() => { setPhase({ kind: 'quiz', section: phase.section, items: phase.items, masteryBefore: mastery.total }); top(); }}
        onBack={() => setPhase({ kind: 'select' })}
      />
    );
  }

  if (phase.kind === 'quiz') {
    const finish = (summary: SessionSummary) => {
      let activity: SongActivityResult | null = null;
      let saveError: string | null = null;
      try {
        activity = recordSongActivity(song, {
          type: 'boss', scorePct: summary.scorePct, passPct: SONG_BOSS_PASS_PCT,
          durationSec: summary.durationSec, perSkill: summary.perSkill,
        });
      } catch {
        saveError = 'Das Ergebnis konnte nicht gespeichert werden. Deine Antworten siehst du trotzdem unten.';
      }
      setPhase({ kind: 'result', section: phase.section, items: phase.items, summary, activity, saveError, masteryBefore: phase.masteryBefore });
      top();
    };
    return (
      <RoundRunner
        song={song}
        items={phase.items}
        title={`Boss · ${phase.section.label}`}
        context="boss"
        examMode
        onFinish={finish}
        onCancel={() => setPhase({ kind: 'select' })}
      />
    );
  }

  if (phase.kind === 'result') {
    return (
      <Page title="Boss-Challenge" back={`${base}/uebungen`}>
        <BossResult
          song={song}
          phase={phase}
          onRetry={() => begin(phase.section)}
          onOther={() => { setPhase({ kind: 'select' }); top(); }}
        />
      </Page>
    );
  }

  const current = sections.find((x) => x.id === selected) ?? sections[0];
  return (
    <Page title="Boss-Challenge" subtitle={song.title} back={`${base}/uebungen`}>
      <div className={s.stack}>
        <section className={`${s.bossHero} ${s.appear}`} aria-labelledby="boss-title">
          <span className={s.bossBadge}><Crown size={28} aria-hidden="true" /></span>
          <h2 id="boss-title" className={s.bossTitle}>Zeig, was du verstehst</h2>
          <ul className={s.bossRules}>
            <li><EyeOff size={16} aria-hidden="true" /> Du hörst einen Abschnitt – ohne Text.</li>
            <li><Snail size={16} aria-hidden="true" /> Einmal darfst du ihn dir langsam vorspielen lassen.</li>
            <li><Target size={16} aria-hidden="true" /> Danach Verständnisfragen ohne Hilfen. Ab {SONG_BOSS_PASS_PCT} % ist der Boss besiegt.</li>
            <li><RotateCcw size={16} aria-hidden="true" /> Jederzeit wiederholbar – Fehler kosten nichts.</li>
          </ul>
          {progress?.bossPassedAt && (
            <div className={s.chips}><Badge tone="gold" solid icon={<Trophy size={12} aria-hidden="true" />}>Bereits besiegt</Badge></div>
          )}
        </section>

        <fieldset className={`${s.section} ${s.sectionList}`}>
          <legend className={s.h2} style={{ marginBottom: 'var(--sp-3)' }}>Abschnitt wählen</legend>
          {sections.map((sec, i) => (
            <label key={sec.id} className={`${s.sectionOption} ${s.appear}`} style={{ '--i': i } as CSSProperties}>
              <input
                type="radio"
                name="boss-section"
                value={sec.id}
                checked={current.id === sec.id}
                onChange={() => setSelected(sec.id)}
              />
              <span className={s.sectionName}>{sec.label}</span>
              <span className={s.sectionMeta}>{sec.lineIds.length} Zeilen</span>
            </label>
          ))}
        </fieldset>

        <Button size="lg" block icon={<Headphones size={18} />} onClick={() => begin(current)}>
          {current.label} herausfordern
        </Button>
      </div>
    </Page>
  );
}

// ───────────────────────── Anhören ─────────────────────────

function ListenStage({ song, section, onStart, onBack }: { song: Song; section: BossSection; onStart: () => void; onBack: () => void }) {
  const tts = useTts();
  const lang = ttsLangFor(song.variant);
  const lines = useMemo(() => section.lineIds.map((id) => song.lines.find((l) => l.id === id)).filter((l): l is Song['lines'][number] => !!l), [song, section]);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);
  const [played, setPlayed] = useState(0);
  const [slowUsed, setSlowUsed] = useState(false);
  const runRef = useRef(0);
  const help = tts.available ? tts.missingVoiceHelp(lang) : null;

  useEffect(() => () => {
    runRef.current++;
    stopSpeaking();
  }, []);

  const play = async (slow: boolean) => {
    const run = ++runRef.current;
    tts.clearError();
    setPlaying(true);
    if (slow) setSlowUsed(true);
    for (let i = 0; i < lines.length; i++) {
      if (runRef.current !== run) return;
      setCurrent(i);
      const ok = await tts.speak(lines[i].text, { lang, slow, key: `boss:${section.id}:${i}` });
      if (runRef.current !== run) return;
      if (!ok) {
        setPlaying(false);
        setCurrent(-1);
        return;
      }
      await new Promise((r) => window.setTimeout(r, 500));
    }
    if (runRef.current !== run) return;
    setPlaying(false);
    setCurrent(-1);
    setPlayed((n) => n + 1);
  };

  const stop = () => {
    runRef.current++;
    tts.stop();
    setPlaying(false);
    setCurrent(-1);
  };

  const status = playing
    ? `Zeile ${current + 1} von ${lines.length}`
    : played > 0
      ? 'Gut zugehört! Bereit für die Fragen?'
      : `Du hörst ${lines.length} Zeilen – ganz ohne Text.`;

  return (
    <Page title={`Boss · ${section.label}`} largeTitle={false} back={false}
      leading={<IconButton label="Abschnitt wechseln" icon={<ArrowLeft size={20} />} onClick={() => { stop(); onBack(); }} />}
    >
      <div className={s.stack}>
        <section className={s.stage} aria-labelledby="listen-title">
          <h2 id="listen-title" className={s.h2}>Hör genau hin</h2>
          <div className={`${s.eq} ${playing ? s.eqLive : ''}`} aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => <span key={i} style={{ '--i': i } as CSSProperties} />)}
          </div>
          <ol className={s.dots} aria-label="Zeilen des Abschnitts">
            {lines.map((l, i) => (
              <li
                key={l.id}
                className={`${s.dot} ${i === current ? s.dotNow : ''} ${played > 0 || i < current ? s.dotDone : ''}`}
                aria-label={`Zeile ${i + 1}${i === current ? ' (läuft)' : ''}`}
              />
            ))}
          </ol>
          <p className={s.stageStatus} aria-live="polite">{status}</p>

          {!tts.available ? (
            <div className={s.note} role="note">
              <CircleAlert size={18} aria-hidden="true" />
              <p>
                In diesem Browser gibt es keine Sprachausgabe. Hör dir den Abschnitt im Song-Player an und starte dann
                die Fragen – bei den Hörfragen kannst du dir den Text ersatzweise anzeigen lassen.
              </p>
            </div>
          ) : (
            <>
              {help && (
                <div className={s.note} role="note"><CircleAlert size={18} aria-hidden="true" /><p>{help}</p></div>
              )}
              {tts.error && (
                <div className={s.note} role="alert"><CircleAlert size={18} aria-hidden="true" /><p>{tts.error}</p></div>
              )}
            </>
          )}

          <div className={s.stageButtons}>
            {!tts.available ? (
              <>
                <Button size="lg" icon={<ArrowRight size={18} />} onClick={onStart}>Zu den Fragen</Button>
                <Button size="lg" variant="secondary" icon={<Ear size={18} />} to={`/songs/${encodeURIComponent(song.id)}/spielen`}>
                  Im Player anhören
                </Button>
              </>
            ) : playing ? (
              <Button size="lg" variant="secondary" icon={<Square size={18} />} onClick={stop}>Stopp</Button>
            ) : played > 0 ? (
              <>
                <Button size="lg" icon={<ArrowRight size={18} />} onClick={onStart}>Zu den Fragen</Button>
                <Button size="lg" variant="secondary" icon={<RotateCcw size={18} />} onClick={() => void play(false)}>Nochmal anhören</Button>
              </>
            ) : (
              <Button size="lg" icon={<Play size={18} />} onClick={() => void play(false)}>Abschnitt anhören</Button>
            )}
          </div>

          {tts.available && !playing && (
            slowUsed
              ? <span className={s.used}><Check size={16} aria-hidden="true" /> Langsam-Joker genutzt</span>
              : <Button variant="ghost" icon={<Snail size={18} />} onClick={() => void play(true)}>Einmal langsam anhören</Button>
          )}
          {tts.available && !playing && played === 0 && (
            <Button variant="ghost" onClick={onStart}>Ohne Anhören zu den Fragen</Button>
          )}
        </section>
      </div>
    </Page>
  );
}

// ───────────────────────── Ergebnis ─────────────────────────

function BossResult({ song, phase, onRetry, onOther }: {
  song: Song;
  phase: Extract<Phase, { kind: 'result' }>;
  onRetry: () => void;
  onOther: () => void;
}) {
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const { summary, activity, saveError, section, masteryBefore } = phase;
  const passed = summary.scorePct >= SONG_BOSS_PASS_PCT;
  const missing = Math.max(0, SONG_BOSS_PASS_PCT - summary.scorePct);
  const vocab = vocabFor(phase.items, summary.mistakes.map((m) => m.exercise.id));
  const after = activity?.mastery ?? masteryBefore;
  const base = `/songs/${encodeURIComponent(song.id)}`;

  return (
    <div className={s.result}>
      {passed ? (
        <section className={s.victory} aria-labelledby="boss-result-title">
          <span className={s.crown}><Crown size={40} aria-hidden="true" /></span>
          <h2 id="boss-result-title" ref={headingRef} tabIndex={-1} className={s.resultTitle}>Boss besiegt!</h2>
          <p className={s.resultText}>„{section.label}“ verstanden – ohne Text, ohne Hilfen.</p>
          <div className={s.scoreLine}>
            <span className={s.bigPct}>{summary.scorePct} %</span>
            <span className={s.passMark}>Ziel: {SONG_BOSS_PASS_PCT} %</span>
          </div>
          <div className={s.chips}>
            {activity && activity.xp > 0 && <Badge tone="gold" solid>+{activity.xp} XP</Badge>}
            {activity && activity.xp === 0 && <Badge tone="neutral">XP gab es schon beim ersten Sieg</Badge>}
          </div>
        </section>
      ) : (
        <section className={s.defeat} aria-labelledby="boss-result-title">
          <span className={s.crown}><Shield size={34} aria-hidden="true" /></span>
          <h2 id="boss-result-title" ref={headingRef} tabIndex={-1} className={s.resultTitle}>Noch nicht besiegt</h2>
          <div className={s.scoreLine}>
            <span className={s.bigPct}>{summary.scorePct} %</span>
            <span className={s.passMark}>Ziel: {SONG_BOSS_PASS_PCT} %</span>
          </div>
          <p className={s.resultText}>
            Dir fehlen {missing} Prozentpunkte. Schau dir unten an, was dir entgangen ist – beim nächsten Versuch
            bekommst du neue Antwortmischungen.
          </p>
        </section>
      )}

      {saveError ? (
        <p className={s.note} role="alert"><CircleAlert size={18} aria-hidden="true" /> {saveError}</p>
      ) : (
        <Card padding="lg" className={s.mastery}>
          <div className={s.masteryHead}>
            <span className={s.rowTitle}>Song-Mastery</span>
            <span className={s.masteryValue}>{Math.round(after)} %</span>
          </div>
          <ProgressBar value={after / 100} label="Song-Mastery" tone="gold" />
        </Card>
      )}

      {summary.mistakes.length > 0 && <MistakeList song={song} mistakes={summary.mistakes} title={passed ? 'Kleine Patzer' : 'Das ist dir entgangen'} />}
      {vocab.length > 0 && <VocabRescue song={song} items={vocab} />}

      <div className={s.actions}>
        {passed ? (
          <>
            <Button size="lg" block icon={<Crown size={18} />} onClick={onOther}>Anderen Abschnitt herausfordern</Button>
            <Button size="lg" block variant="secondary" icon={<RotateCcw size={18} />} onClick={onRetry}>Nochmal spielen</Button>
          </>
        ) : (
          <>
            <Button size="lg" block icon={<RotateCcw size={18} />} onClick={onRetry}>Nochmal versuchen</Button>
            <Button size="lg" block variant="secondary" icon={<Target size={18} />}
              onClick={() => navigate(`${base}/uebungen`, { state: { start: 'review' } })}>
              Schwierige Stellen üben
            </Button>
            <Button block variant="ghost" onClick={onOther}>Anderen Abschnitt wählen</Button>
          </>
        )}
        <Button block variant="ghost" to={base}>Zum Song</Button>
      </div>
    </div>
  );
}
