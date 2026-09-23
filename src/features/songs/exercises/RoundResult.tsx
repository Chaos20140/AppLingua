/**
 * Auswertung einer Song-Runde: eigene Ergebnisse (Punkte, XP, Serie, Dauer), neue Song-Mastery,
 * Fehler mit Erklärung und verpasste Wörter „Zur Vokabelliste“. Level-Up/Abzeichen zeigt das RewardCenter.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookmarkPlus, Check, CircleX, Clock, Flame, ListChecks, RotateCcw, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import type { Song } from '../../../content/types';
import { useList } from '../../../data/store';
import { exercisePrompt } from '../../../engine/grading';
import { cardId } from '../../../engine/srs';
import { addSrsCard } from '../../../state/actions';
import { ttsLangFor } from '../../../state/settings';
import type { SongActivityResult } from '../../../state/songs';
import type { SessionResult, SessionSummary } from '../../exercises/contract';
import { Badge, Button, Card, ProgressBar, ProgressRing, RichText, StatTile, useToast } from '../../../ui';
import { vocabFor, type SongExercise, type VocabFocus } from './generator';
import s from './SongExercises.module.css';

export interface RoundResultProps {
  song: Song;
  title: string;
  summary: SessionSummary;
  items: SongExercise[];
  activity: SongActivityResult | null;
  saveError: string | null;
  masteryBefore: number;
  onAgain: () => void;
  onPick: () => void;
}

function praise(pct: number): { title: string; text: string } {
  if (pct >= 100) return { title: 'Makellos!', text: 'Jede Aufgabe richtig – dieser Song sitzt.' };
  if (pct >= 80) return { title: 'Richtig stark!', text: 'Du hast den Song gut im Griff. Weiter so!' };
  if (pct >= 50) return { title: 'Guter Fortschritt', text: 'Die Fehler unten zeigen dir, woran du als Nächstes arbeitest.' };
  return { title: 'Dranbleiben lohnt sich', text: 'Jeder Fehler ist ein Hinweis. Lies die Erklärungen und versuch es gleich noch einmal.' };
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = Math.round(sec % 60);
  return m > 0 ? `${m}:${String(r).padStart(2, '0')} min` : `${r} s`;
}

/** Kurzfassung der Aufgabe als reiner Text (ohne Md-Zeichen) */
const promptText = (r: SessionResult) => exercisePrompt(r.exercise).replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();

export function RoundResult({ song, title, summary, items, activity, saveError, masteryBefore, onAgain, onPick }: RoundResultProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const p = praise(summary.scorePct);
  const xp = summary.xp + (activity?.xp ?? 0);
  const after = activity?.mastery ?? masteryBefore;
  const delta = Math.round(after - masteryBefore);
  const vocab = useMemo(() => vocabFor(items, summary.mistakes.map((m) => m.exercise.id)), [items, summary.mistakes]);

  return (
    <div className={s.result}>
      <section className={s.resultHero} aria-labelledby="round-result-title">
        <ProgressRing value={summary.scorePct / 100} label="Ergebnis der Runde" size={112} stroke={10} tone={summary.scorePct >= 80 ? 'success' : 'accent'}>
          <span className={s.bigPct}>{summary.scorePct} %</span>
        </ProgressRing>
        <h2 id="round-result-title" className={s.resultTitle} ref={headingRef} tabIndex={-1}>{p.title}</h2>
        <p className={s.resultText}>{title} · {p.text}</p>
      </section>

      <div className={s.stats}>
        <StatTile label="Richtig" value={`${summary.correct}/${summary.total}`} icon={<ListChecks size={18} />} tone="success" />
        <StatTile label="XP" value={`+${xp}`} icon={<Sparkles size={18} />} tone="gold" />
        <StatTile label="Beste Serie" value={summary.bestCombo} icon={<Flame size={18} />} tone="accent" />
        <StatTile label="Dauer" value={fmtDuration(summary.durationSec)} icon={<Clock size={18} />} tone="info" />
      </div>

      {saveError ? (
        <p className={s.note} role="alert"><CircleX size={18} aria-hidden="true" /> {saveError}</p>
      ) : (
        <Card padding="lg" className={s.mastery}>
          <div className={s.masteryHead}>
            <div>
              <h3 className={s.rowTitle}>Song-Mastery</h3>
              <p className={s.sub}>{song.title}</p>
            </div>
            <span className={s.masteryValue}>{Math.round(after)} %</span>
          </div>
          <ProgressBar value={after / 100} label="Song-Mastery" tone="gold" />
          <div className={s.chips}>
            {delta > 0
              ? <Badge tone="success" icon={<TrendingUp size={12} aria-hidden="true" />}>+{delta} Prozentpunkte</Badge>
              : <Badge tone="neutral">Mastery unverändert</Badge>}
            {activity && activity.xp === 0 && (
              <Badge tone="neutral">Song-Bonus für diese Übung heute schon erhalten</Badge>
            )}
          </div>
        </Card>
      )}

      {summary.mistakes.length > 0 ? (
        <MistakeList song={song} mistakes={summary.mistakes} />
      ) : (
        <p className={s.note}><Trophy size={18} aria-hidden="true" /> <span>Keine Fehler in dieser Runde – stark!</span></p>
      )}

      {vocab.length > 0 && <VocabRescue song={song} items={vocab} />}

      <div className={s.actions}>
        <Button size="lg" block icon={<RotateCcw size={18} />} onClick={onAgain}>Neue Runde</Button>
        <Button size="lg" block variant="secondary" onClick={onPick}>Andere Übung wählen</Button>
        <Button block variant="ghost" to={`/songs/${encodeURIComponent(song.id)}`}>Zum Song</Button>
      </div>
    </div>
  );
}

export function MistakeList({ song, mistakes, title = 'Daraus lernst du' }: { song: Song; mistakes: readonly SessionResult[]; title?: string }) {
  const lang = ttsLangFor(song.variant);
  return (
    <section className={s.section} aria-labelledby="mistakes-title">
      <h3 id="mistakes-title" className={s.h2}>{title}</h3>
      <p className={s.sub}>Diese Aufgaben landen im Fehlerarchiv – nach zwei richtigen Antworten gelten sie als behoben.</p>
      <ul className={s.list}>
        {mistakes.map(({ exercise, outcome }, i) => (
          <li key={`${exercise.id}:${i}`} className={s.mistake}>
            <p className={s.mistakeHead}><CircleX size={16} aria-hidden="true" /> <span>{promptText({ exercise, outcome })}</span></p>
            <p className={s.expected}>
              Richtig: <span>{outcome.expected}</span>
            </p>
            <RichText md={outcome.explanation?.rule || exercise.feedback.rule} targetLang={lang} className={s.rule} />
            {outcome.explanation?.avoid && <RichText md={`**Tipp:** ${outcome.explanation.avoid}`} targetLang={lang} className={s.rule} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VocabRescue({ song, items }: { song: Song; items: readonly VocabFocus[] }) {
  const toast = useToast();
  const cards = useList('vocabCards');
  const lang = ttsLangFor(song.variant);
  const inList = useMemo(() => new Set(cards.filter((c) => !c.data.suspended).map((c) => c.id)), [cards]);
  const [error, setError] = useState<string | null>(null);
  const has = (v: VocabFocus) => inList.has(cardId(song.courseId, v.itemId));
  const open = items.filter((v) => !has(v));

  const add = (list: readonly VocabFocus[]) => {
    try {
      for (const v of list) {
        addSrsCard({
          courseId: song.courseId,
          itemId: v.itemId,
          kind: v.kind,
          front: v.front.slice(0, 200),
          back: v.back.slice(0, 300),
          ...(v.hint ? { hint: v.hint } : {}),
          source: { type: 'song', ref: song.id, label: song.title },
        });
      }
      setError(null);
      toast(list.length === 1 ? 'Zur Vokabelliste hinzugefügt.' : `${list.length} Einträge zur Vokabelliste hinzugefügt.`, { tone: 'success' });
    } catch {
      setError('Speichern hat nicht geklappt. Bitte versuch es noch einmal.');
    }
  };

  return (
    <section className={s.section} aria-labelledby="vocab-title">
      <h3 id="vocab-title" className={s.h2}>Verpasste Wörter</h3>
      <p className={s.sub}>Nimm sie in deine Vokabelliste auf – die Wiederholung holt sie genau dann zurück, wenn du sie sonst vergessen würdest.</p>
      <ul className={s.list}>
        {items.map((v) => (
          <li key={v.itemId} className={s.vocabRow}>
            <div className={s.vocabText}>
              <span className={s.vocabFront} lang={lang}>{v.front}</span>
              <span className={s.vocabBack}>{v.back}</span>
            </div>
            {has(v) ? (
              <span className={s.vocabDone}><Check size={16} aria-hidden="true" /> In der Liste</span>
            ) : (
              <Button size="md" variant="secondary" icon={<BookmarkPlus size={16} />} onClick={() => add([v])} aria-label={`${v.front} zur Vokabelliste hinzufügen`}>
                Merken
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className={s.note} role="alert">{error}</p>}
      {open.length > 1 ? (
        <Button block variant="secondary" icon={<BookmarkPlus size={18} />} onClick={() => add(open)}>
          Alle {open.length} zur Vokabelliste
        </Button>
      ) : open.length === 0 ? (
        <Button block variant="ghost" to="/vokabeln">Zur Vokabelliste</Button>
      ) : null}
    </section>
  );
}
