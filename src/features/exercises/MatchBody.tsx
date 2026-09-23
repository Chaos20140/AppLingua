/**
 * Zuordnen (imageMatch / matchPairs): links wählen → rechts wählen (oder umgekehrt).
 * Übungsmodus: richtige Paare rasten ein, Fehlversuche schütteln dezent; bewertet wird der erste Versuch je Paar.
 * Prüfungsmodus: freie Zuordnung ohne Auflösung (erneut antippen löst ein Paar).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { looseKey } from '../../engine/text';
import { useTts } from '../../speech/tts';
import { cx } from './cx';
import { shuffleFor, type BodyProps } from './shared';
import s from './ex.module.css';

type Props = BodyProps<'imageMatch'> | BodyProps<'matchPairs'>;
type Side = 'L' | 'R';

const PAIR_TONES = 5;

export function MatchBody(props: Props) {
  const { ex, env, locked, outcome } = props;
  const setAnswer = props.setAnswer as (a: Record<string, string> | null) => void;
  const submit = props.submit as (a?: Record<string, string>) => void;
  const image = ex.type === 'imageMatch';
  const pairs = useMemo(
    () => (ex.type === 'imageMatch'
      ? ex.pairs.map((p) => ({ left: p.emoji, right: p.word }))
      : ex.pairs.map((p) => ({ left: p.left, right: p.right }))),
    [ex],
  );
  const rights = useMemo(() => shuffleFor(pairs.map((p) => p.right), ex.id), [pairs, ex.id]);
  const tts = useTts();

  /** links-Index → rechts-Index */
  const [links, setLinks] = useState<Record<number, number>>({});
  /** erster Versuch je linkem Element (für die Bewertung) */
  const first = useRef<Record<number, number>>({});
  const [sel, setSel] = useState<{ side: Side; i: number } | null>(null);
  const [shake, setShake] = useState<{ l: number; r: number } | null>(null);
  const [announce, setAnnounce] = useState('');
  const shakeTimer = useRef(0);
  const submitTimer = useRef(0);
  useEffect(() => () => {
    window.clearTimeout(shakeTimer.current);
    window.clearTimeout(submitTimer.current);
  }, []);

  const exam = env.examMode;
  const rightTaken = new Map(Object.entries(links).map(([l, r]) => [r, Number(l)]));
  const matchedCount = Object.keys(links).length;

  const buildAnswer = (lk: Record<number, number>, useFirst: boolean) => Object.fromEntries(pairs.map((p, li) => {
    const ri = useFirst ? first.current[li] ?? lk[li] : lk[li];
    return [p.left, ri === undefined ? '' : rights[ri]];
  }));

  const link = (li: number, ri: number) => {
    if (exam) {
      const next = { ...links };
      for (const [l, r] of Object.entries(next)) if (r === ri) delete next[Number(l)];
      next[li] = ri;
      setLinks(next);
      setSel(null);
      setAnnounce(`${pairs[li].left} mit ${rights[ri]} verbunden.`);
      setAnswer(Object.keys(next).length === pairs.length ? buildAnswer(next, false) : null);
      return;
    }
    const correct = looseKey(rights[ri]) === looseKey(pairs[li].right);
    if (first.current[li] === undefined) first.current[li] = ri;
    setSel(null);
    if (!correct) {
      setShake({ l: li, r: ri });
      setAnnounce(`${pairs[li].left} und ${rights[ri]} passen nicht zusammen.`);
      window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setShake(null), 480);
      return;
    }
    const next = { ...links, [li]: ri };
    setLinks(next);
    setAnnounce(`Richtig: ${pairs[li].left} – ${rights[ri]}.`);
    if (image) void tts.speak(rights[ri], { lang: env.lang });
    if (Object.keys(next).length === pairs.length) {
      const answer = buildAnswer(next, true);
      setAnswer(answer);
      submitTimer.current = window.setTimeout(() => submit(answer), 380);
    }
  };

  const tap = (side: Side, i: number) => {
    if (locked) return;
    const pairedLeft = side === 'L' ? (links[i] !== undefined ? i : null) : rightTaken.get(i) ?? null;
    if (pairedLeft !== null) {
      if (!exam) return; // eingerastete Paare bleiben
      const next = { ...links };
      delete next[pairedLeft];
      setLinks(next);
      setAnswer(null);
      setSel({ side, i });
      return;
    }
    if (!sel || sel.side === side) {
      setSel(sel && sel.side === side && sel.i === i ? null : { side, i });
      return;
    }
    const li = side === 'L' ? i : sel.i;
    const ri = side === 'R' ? i : sel.i;
    link(li, ri);
  };

  const toneOf = (li: number) => (Object.keys(links).map(Number).sort((a, b) => a - b).indexOf(li) % PAIR_TONES);
  const parts = locked && outcome ? outcome.parts : undefined;

  const item = (side: Side, i: number, label: string) => {
    const li = side === 'L' ? i : rightTaken.get(i);
    const paired = li !== undefined && links[li] !== undefined;
    const selected = sel?.side === side && sel.i === i;
    const shaking = shake && (side === 'L' ? shake.l === i : shake.r === i);
    const hadError = parts && li !== undefined && parts[li] === false;
    return (
      <button
        key={`${side}${i}`}
        type="button"
        className={cx(
          s.matchItem,
          side === 'L' && image && s.matchEmoji,
          selected && s.matchSelected,
          paired && (exam ? s[`pairTone${toneOf(li!)}`] : s.matchDone),
          shaking && s.matchShake,
          hadError && s.matchHadError,
        )}
        lang={side === 'R' || !image ? env.lang : undefined}
        aria-pressed={selected}
        aria-disabled={locked || (paired && !exam) || undefined}
        aria-label={paired ? `${label} (zugeordnet${exam ? ' – antippen zum Lösen' : ''})` : label}
        onClick={() => tap(side, i)}
      >
        <span className={s.matchLabel}>{label}</span>
        {exam && paired && <span className={s.pairDot} aria-hidden>{toneOf(li!) + 1}</span>}
      </button>
    );
  };

  return (
    <>
      <p className={s.muted} aria-hidden>
        {exam ? 'Verbinde jedes Element links mit einem rechts.' : `${matchedCount} von ${pairs.length} Paaren gefunden`}
      </p>
      <div className={s.matchGrid} role="group" aria-label={image ? 'Bilder links, Wörter rechts' : 'Paare zuordnen'}>
        {pairs.map((p, i) => [item('L', i, p.left), item('R', i, rights[i])])}
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>
    </>
  );
}
