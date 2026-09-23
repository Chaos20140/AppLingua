/** Kurzes Nachsprechen eines Wortes/einer Zeile (Spracherkennung, Aufnahme oder Selbsteinschätzung). */
import { Mic, RotateCcw, Square, Volume2 } from 'lucide-react';
import type { CourseId } from '../../core/types';
import { Button, Spinner } from '../../ui';
import { buildPronAttempt, SELF_RATING_OPTIONS, usePronunciationCheck } from '../../speech/usePronunciationCheck';
import { recordPronAttempt } from '../../state/actions';
import s from './LyricActionSheet.module.css';

export interface EchoPracticeProps {
  target: string;
  lang: string;
  courseId: CourseId;
  itemId: string;
}

export default function EchoPractice({ target, lang, courseId, itemId }: EchoPracticeProps) {
  const pc = usePronunciationCheck(target, {
    lang,
    itemId,
    onResult: (r) => { recordPronAttempt(buildPronAttempt(r, { courseId, itemId, context: 'song', target })); },
  });
  const busy = pc.status === 'listening' || pc.status === 'recording';
  const noMic = pc.mode === 'listen-only';

  return (
    <div className={s.echo}>
      <div className={s.echoHead}>
        <h4 className={s.sectionTitle}>Kurz nachsprechen</h4>
        <span className={s.echoMode}>
          {pc.mode === 'speech-recognition' ? 'Spracherkennung' : pc.mode === 'recording' ? 'Aufnahme + Selbsteinschätzung' : 'Ohne Mikrofon'}
        </span>
      </div>
      <p className={s.echoHint} aria-live="polite">{pc.error ?? pc.hint}</p>

      {busy && (
        <div className={s.echoLive}>
          <span className={s.level} style={{ transform: `scaleX(${Math.max(0.08, pc.level)})` }} aria-hidden="true" />
          {pc.interim && <span className={s.interim}>„{pc.interim}“</span>}
        </div>
      )}

      {pc.status === 'evaluating' && <Spinner label="Wird ausgewertet …" />}

      {pc.status === 'self-rating' && (
        <div className={s.rateGrid} role="group" aria-label="Wie nah warst du am Vorbild?">
          {pc.hasRecording && (
            <Button variant="secondary" icon={<Volume2 size={18} />} onClick={() => { void pc.playRecording(); }}>Meine Aufnahme</Button>
          )}
          {SELF_RATING_OPTIONS.map((o) => (
            <Button key={o.value} variant="secondary" onClick={() => pc.selfRate(o.value)}>{o.label}</Button>
          ))}
        </div>
      )}

      {pc.status === 'result' && pc.result && (
        <div className={s.echoResult} aria-live="polite">
          <p className={s.echoScore}>
            <strong>{pc.result.scorePct} %</strong>{' '}
            {pc.result.method === 'speech-recognition' ? 'Verständlichkeit laut Spracherkennung' : 'laut deiner Selbsteinschätzung'}
          </p>
          {pc.result.method === 'speech-recognition' && pc.result.words.length > 0 && (
            <p className={s.echoWords} lang={lang}>
              {pc.result.words.map((w, i) => (
                <span key={i} className={w.ok ? s.wordOk : s.wordMiss}>{w.text} </span>
              ))}
            </p>
          )}
          {pc.result.summary && <p className={s.muted}>{pc.result.summary}</p>}
          {pc.result.tips.length > 0 && (
            <ul className={s.tips}>{pc.result.tips.slice(0, 2).map((t) => <li key={t}>{t}</li>)}</ul>
          )}
          <p className={s.disclaimer}>Keine phonetische Analyse – die Browser-Erkennung zeigt nur, wie gut du verstanden wirst.</p>
        </div>
      )}

      <div className={s.echoActions}>
        {busy ? (
          <Button variant="primary" icon={<Square size={16} />} onClick={pc.stop}>Fertig</Button>
        ) : pc.status === 'result' || pc.status === 'error' ? (
          <Button variant="secondary" icon={<RotateCcw size={18} />} onClick={() => { pc.reset(); pc.start(); }}>Noch einmal</Button>
        ) : pc.status === 'idle' ? (
          <Button variant="primary" icon={noMic ? <Volume2 size={18} /> : <Mic size={18} />} onClick={pc.start}>
            {noMic ? 'Vorbild hören & selbst einschätzen' : pc.mode === 'recording' ? 'Aufnehmen' : 'Sprechen'}
          </Button>
        ) : null}
        {busy && <Button variant="ghost" onClick={pc.cancel}>Abbrechen</Button>}
      </div>
    </div>
  );
}
