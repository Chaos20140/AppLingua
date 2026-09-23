/**
 * Minimalpaar-Trainer: Die Sprachausgabe spricht eines von zwei ähnlichen Wörtern – du wählst, welches.
 * Rein lokales Hörtraining (keine XP, keine gespeicherten Ergebnisse).
 */
import { useId, useState } from 'react';
import { ArrowRight, CircleCheck, CircleX, Ear, Snail, Volume2 } from 'lucide-react';
import type { Variant } from '../../core/types';
import { Button } from '../../ui';
import { htmlLangFor } from '../content/helpers';
import { SpeakButtons, SpeechNotice } from '../content/SpeakButtons';
import { useSpeaker } from '../content/useSpeaker';
import { pickPairRound } from './issues';
import s from './pron.module.css';

export function MinimalPairTrainer({ pairs, variant }: { pairs: [string, string][]; variant: Variant }) {
  const sp = useSpeaker(variant);
  const lang = htmlLangFor(variant);
  const [round, setRound] = useState(() => pickPairRound(pairs));
  const [heard, setHeard] = useState(false);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const hintId = useId();

  if (!round) return null;

  if (!sp.available) {
    return (
      <div className={s.mpCard}>
        <SpeechNotice sp={sp} />
        <p className={s.muted}>Ohne Sprachausgabe kannst du die Paare laut lesen und auf den Unterschied achten:</p>
        <ul className={s.pairList}>
          {pairs.map(([a, b], i) => (
            <li key={i} lang={lang}><strong>{a}</strong> <span aria-hidden="true">↔</span><span className="sr-only"> oder </span> <strong>{b}</strong></li>
          ))}
        </ul>
      </div>
    );
  }

  const target = round.pair[round.answer];
  const play = (slow = false) => {
    sp.say(target, slow);
    setHeard(true);
  };
  const pick = (i: 0 | 1) => {
    if (picked !== null) return;
    setPicked(i);
    setScore((sc) => ({ correct: sc.correct + (i === round.answer ? 1 : 0), total: sc.total + 1 }));
  };
  const next = () => {
    let r = pickPairRound(pairs);
    for (let tries = 0; tries < 4 && r && pairs.length > 1 && r.pair[0] === round.pair[0] && r.answer === round.answer; tries++) {
      r = pickPairRound(pairs);
    }
    setRound(r);
    setHeard(false);
    setPicked(null);
  };
  const correct = picked !== null && picked === round.answer;

  return (
    <div className={s.mpCard}>
      <div className={s.mpHead}>
        <span className={s.mpIcon} aria-hidden="true"><Ear size={20} /></span>
        <div>
          <p className={s.mpTitle}>Hör genau hin</p>
          <p className={s.muted}>Welches der beiden Wörter hörst du?</p>
        </div>
        {score.total > 0 && (
          <span className={s.mpScore} aria-label={`${score.correct} von ${score.total} richtig`}>{score.correct}/{score.total}</span>
        )}
      </div>

      <div className={s.row}>
        <Button icon={<Volume2 size={18} />} onClick={() => play(false)}>{heard ? 'Nochmal hören' : 'Anhören'}</Button>
        <Button variant="ghost" icon={<Snail size={18} />} onClick={() => play(true)}>Langsam</Button>
      </div>

      <div className={s.mpOptions} role="group" aria-label="Welches Wort war es?" aria-describedby={!heard ? hintId : undefined}>
        {round.pair.map((w, i) => {
          const state = picked === null ? '' : i === round.answer ? s.mpRight : picked === i ? s.mpWrong : '';
          return (
            <button
              key={w}
              type="button"
              lang={lang}
              className={`${s.mpOption} ${state}`}
              disabled={!heard || picked !== null}
              onClick={() => pick(i as 0 | 1)}
            >
              {picked !== null && i === round.answer && <CircleCheck size={18} aria-hidden="true" />}
              {picked === i && i !== round.answer && <CircleX size={18} aria-hidden="true" />}
              {w}
            </button>
          );
        })}
      </div>
      {!heard && <p id={hintId} className={s.muted}>Tippe zuerst auf „Anhören“ – dann wählst du.</p>}

      <div aria-live="polite" className={s.mpFeedback}>
        {picked !== null && (
          <>
            <p className={correct ? s.good : s.bad}>
              {correct ? 'Richtig! ' : 'Nicht ganz. '}Das war „<span lang={lang}>{target}</span>“.
            </p>
            <div className={s.mpCompare}>
              {round.pair.map((w) => (
                <span key={w} className={s.mpCompareItem}>
                  <span lang={lang}>{w}</span>
                  <SpeakButtons sp={sp} text={w} slow={false} />
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      {picked !== null && (
        <Button variant="secondary" block iconRight={<ArrowRight size={18} />} onClick={next}>Nächstes Paar</Button>
      )}
      <SpeechNotice sp={sp} showUnavailable={false} showVoiceHelp={false} />
    </div>
  );
}
