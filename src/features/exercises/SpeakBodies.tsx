/** Sprech-Übungen: speak (Nachsprechen mit Verständlichkeitsprüfung) und speakFree (freie Antwort). */
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Lightbulb, Mic, RotateCcw, Snail, Square, Volume2 } from 'lucide-react';
import { RichText } from '../../ui';
import type { CourseId } from '../../core/types';
import { looseKey } from '../../engine/text';
import { recordPronAttempt } from '../../state/actions';
import { SCORE_DISCLAIMER, SCORE_LABEL } from '../../speech/pronunciationScore';
import { abortListening, listen, stopListening, SttError, sttSupport } from '../../speech/stt';
import {
  buildPronAttempt, SELF_RATING_OPTIONS, usePronunciationCheck, type PronCheckMode, type PronCheckResult,
} from '../../speech/usePronunciationCheck';
import { SpeakButton, useSpeakFn } from './ListenControls';
import { AnswerField } from './TextBodies';
import { cx } from './cx';
import type { BodyProps } from './shared';
import s from './ex.module.css';

const MODE_LABEL: Record<PronCheckMode, string> = {
  'speech-recognition': 'Spracherkennung',
  recording: 'Aufnahme & Selbstvergleich',
  'listen-only': 'Nachsprechen & selbst einschätzen',
};

function scoreTone(pct: number) {
  return pct >= 85 ? s.scoreHigh : pct >= 60 ? s.scoreMid : s.scoreLow;
}

// ───────────────────────── Nachsprechen ─────────────────────────

export function SpeakBody({ ex, env, locked, setAnswer }: BodyProps<'speak'>) {
  const itemId = ex.pronItemId ?? ex.id;
  const meta = useRef({ courseId: env.courseId as CourseId, context: env.context, record: !env.examMode && env.context !== 'placement' });
  const check = usePronunciationCheck(ex.text, {
    lang: env.lang,
    itemId,
    onResult: (r: PronCheckResult) => {
      setAnswer({ transcripts: r.transcripts, scorePct: r.scorePct, selfAssessed: r.method === 'self-assessment' });
      if (meta.current.record) {
        try {
          recordPronAttempt(buildPronAttempt(r, { courseId: meta.current.courseId, itemId, context: meta.current.context, target: ex.text }));
        } catch (err) {
          console.error('Ausspracheversuch konnte nicht gespeichert werden', err);
        }
      }
    },
  });
  const { status, mode, result } = check;
  const active = status === 'listening' || status === 'recording';
  const busy = active || status === 'evaluating';

  return (
    <>
      <div className={cx(s.promptCard, s.center, s.speakCard)}>
        <p className={s.speakTarget} lang={env.lang}>{ex.text}</p>
        <p className={s.promptSub}>{ex.german}</p>
        {(ex.phonetic || (env.showIpa && ex.ipa)) && (
          <p className={s.phonetic}>
            {ex.phonetic && <span><span className={s.phonLabel}>Lautschrift</span> {ex.phonetic}</span>}
            {env.showIpa && ex.ipa && <span><span className={s.phonLabel}>IPA</span> <span className={s.ipa}>/{ex.ipa.replace(/^\/|\/$/g, '')}/</span></span>}
          </p>
        )}
        {check.support.tts && (
          <div className={s.listenRow}>
            <button type="button" className={cx(s.slowBtn, check.playing === 'model' && s.playing)} onClick={() => void check.playModel(false)} disabled={busy}>
              <Volume2 aria-hidden /><span>Vorbild</span>
            </button>
            <button type="button" className={s.slowBtn} onClick={() => void check.playModel(true)} disabled={busy} aria-label="Vorbild langsam anhören">
              <Snail aria-hidden /><span>Langsam</span>
            </button>
          </div>
        )}
      </div>

      {!locked && (
        <div className={s.micPanel}>
          {status === 'self-rating' ? (
            <div className={s.selfRate} role="group" aria-label="Selbsteinschätzung">
              <p className={s.micHint}>{check.hint}</p>
              {check.hasRecording && (
                <button type="button" className={s.linkBtn} onClick={() => void check.playRecording()}>
                  <Volume2 aria-hidden /> Meine Aufnahme anhören
                </button>
              )}
              <div className={s.selfRateGrid}>
                {SELF_RATING_OPTIONS.map((o) => (
                  <button key={o.value} type="button" className={s.selfRateBtn} onClick={() => check.selfRate(o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                className={cx(s.micBtn, active && s.micActive)}
                onClick={() => (active ? check.stop() : check.start())}
                disabled={status === 'evaluating'}
                aria-label={active ? (status === 'listening' ? 'Fertig' : 'Stopp') : mode === 'listen-only' ? 'Vorbild anhören und nachsprechen' : mode === 'recording' ? 'Aufnehmen' : 'Sprechen'}
              >
                {active && <span className={s.micLevel} style={{ transform: `scale(${1 + check.level * 0.6})` }} aria-hidden data-motion-safe />}
                {active ? <Square aria-hidden /> : mode === 'listen-only' ? <Volume2 aria-hidden /> : <Mic aria-hidden />}
              </button>
              <p className={s.micHint} aria-live="polite">{check.interim ? `„${check.interim}“` : check.hint}</p>
              {check.support.stt.warning && status === 'idle' && <p className={s.softNote}>{check.support.stt.warning}</p>}
              {check.support.modes.length > 1 && !busy && (
                <div className={s.modeSwitch}>
                  {check.support.modes.filter((m) => m !== mode).map((m) => (
                    <button key={m} type="button" className={s.linkBtn} onClick={() => check.setMode(m)}>
                      Stattdessen: {MODE_LABEL[m]}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {result && (
        <div className={s.pronResult}>
          <div className={s.pronScoreRow}>
            <span className={cx(s.pronScore, scoreTone(result.scorePct))}>{Math.round(result.scorePct)} %</span>
            <span className={s.pronScoreLabel}>{result.method === 'speech-recognition' ? SCORE_LABEL : 'Selbsteinschätzung'}</span>
          </div>
          {result.method === 'speech-recognition' && result.words.length > 0 && (
            <p className={s.pronWords} lang={env.lang} aria-label="Erkannte Wörter">
              {result.words.map((w, i) => (
                <span key={i} className={w.ok ? s.wordOk : s.wordBad} title={!w.ok && w.heard ? `verstanden: ${w.heard}` : undefined}>
                  {w.text}
                  <span className="sr-only">{w.ok ? ' (erkannt)' : w.heard ? ` (verstanden als ${w.heard})` : ' (nicht erkannt)'}</span>
                </span>
              ))}
            </p>
          )}
          <p className={s.pronSummary}>{result.summary}</p>
          {result.notes.slice(0, 2).map((n, i) => <p key={`n${i}`} className={s.softNote}>{n}</p>)}
          {result.tips.slice(0, 2).map((t, i) => <p key={`t${i}`} className={s.tipLine}><Lightbulb aria-hidden /> {t}</p>)}
          {result.method === 'speech-recognition' && <p className={s.disclaimer}>{SCORE_DISCLAIMER}</p>}
          {!locked && (
            <button type="button" className={s.linkBtn} onClick={() => { check.reset(); setAnswer(null); }}>
              <RotateCcw aria-hidden /> Noch einmal versuchen
            </button>
          )}
        </div>
      )}
      {status === 'error' && check.error && !locked && (
        <p className={s.errorNote} role="alert">{check.error}</p>
      )}
    </>
  );
}

// ───────────────────────── Freies Sprechen ─────────────────────────

type FreeStatus = 'idle' | 'listening' | 'done' | 'error';

export function SpeakFreeBody({ ex, env, locked, outcome, setAnswer, submit }: BodyProps<'speakFree'>) {
  const support = useRef(sttSupport()).current;
  const [typing, setTyping] = useState(!support.available);
  const [status, setStatus] = useState<FreeStatus>('idle');
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const speakFn = useSpeakFn(env.lang);
  const run = useRef(0);

  useEffect(() => () => { run.current++; abortListening(); }, []);

  const start = () => {
    const id = ++run.current;
    setError(null);
    setInterim('');
    setStatus('listening');
    listen({ lang: env.lang, timeoutMs: 20000, silenceMs: 2200, onInterim: (t) => { if (id === run.current) setInterim(t); } })
      .then((res) => {
        if (id !== run.current) return;
        const best = res.transcripts[0] ?? '';
        setTranscript(best);
        setStatus(best ? 'done' : 'error');
        if (best) setAnswer({ transcripts: res.transcripts });
        else setError('Ich habe nichts verstanden. Versuch es noch einmal – etwas lauter und näher am Mikrofon.');
      })
      .catch((e: unknown) => {
        if (id !== run.current) return;
        if (e instanceof SttError && e.code === 'aborted') { setStatus('idle'); return; }
        setStatus('error');
        const msg = e instanceof Error ? e.message : 'Die Spracherkennung ist fehlgeschlagen.';
        if (e instanceof SttError && !e.retryable) {
          setError(`${msg} Du kannst deine Antwort stattdessen tippen.`);
          setTyping(true);
        } else setError(msg);
      });
  };

  const switchToTyping = () => {
    run.current++;
    abortListening();
    setStatus('idle');
    setTyping(true);
    setAnswer(text.trim() ? text : null);
  };
  const switchToSpeech = () => {
    setTyping(false);
    setAnswer(transcript ? { transcripts: [transcript] } : null);
  };

  const heard = typing ? text : transcript;
  const hay = ` ${looseKey(heard)} `;
  const found = ex.keywords.filter((k) => looseKey(k) && hay.includes(` ${looseKey(k)} `));

  return (
    <>
      <div className={s.promptCard}>
        <RichText md={ex.prompt} onSpeak={speakFn} targetLang={env.lang} className={s.promptText} />
        {!locked && !env.examMode && ex.keywords.length > 0 && (showHelp ? (
          <p className={s.promptSub}>Hilfreiche Wörter: <span lang={env.lang}>{ex.keywords.join(' · ')}</span></p>
        ) : (
          <button type="button" className={s.linkBtn} onClick={() => setShowHelp(true)}><Lightbulb aria-hidden /> Formulierungshilfe</button>
        ))}
      </div>

      {typing ? (
        <>
          {!support.available && !locked && <p className={s.softNote}>{support.reason ?? 'Spracherkennung ist hier nicht verfügbar.'} Tippe deine Antwort stattdessen.</p>}
          <AnswerField
            value={text} locked={locked} lang={env.lang} label="Deine Antwort" multiline minRows={2}
            state={locked && outcome ? (outcome.correct ? 'ok' : 'bad') : null}
            onSubmit={() => submit()} onChange={(v) => { setText(v); setAnswer(v.trim() ? v : null); }}
          />
          {support.available && !locked && (
            <button type="button" className={s.linkBtn} onClick={switchToSpeech}><Mic aria-hidden /> Doch lieber sprechen</button>
          )}
        </>
      ) : (
        !locked && (
          <div className={s.micPanel}>
            <button
              type="button"
              className={cx(s.micBtn, status === 'listening' && s.micActive)}
              onClick={() => (status === 'listening' ? stopListening() : start())}
              aria-label={status === 'listening' ? 'Fertig' : transcript ? 'Neu sprechen' : 'Sprechen'}
            >
              {status === 'listening' ? <Square aria-hidden /> : <Mic aria-hidden />}
            </button>
            <p className={s.micHint} aria-live="polite">
              {status === 'listening'
                ? (interim ? `„${interim}“` : 'Ich höre zu – sprich jetzt.')
                : transcript ? 'Tippe erneut, um neu zu sprechen.' : 'Tippe aufs Mikrofon und antworte laut.'}
            </p>
            {support.warning && <p className={s.softNote}>{support.warning}</p>}
            {error && <p className={s.errorNote} role="alert">{error}</p>}
            <button type="button" className={s.linkBtn} onClick={switchToTyping}><Keyboard aria-hidden /> Stattdessen tippen</button>
          </div>
        )
      )}

      {!typing && transcript && (
        <div className={s.infoCard}>
          <p className={s.checklistTitle}>Verstanden wurde</p>
          <p className={s.transcriptText} lang={env.lang}>„{transcript}“</p>
        </div>
      )}

      {locked && outcome && (
        <div className={s.infoCard}>
          <p className={s.checklistTitle}>Schlüsselwörter</p>
          <p className={s.keywordRow}>
            {ex.keywords.map((k) => (
              <span key={k} className={cx(s.keyword, found.includes(k) && s.keywordFound)} lang={env.lang}>
                {k}<span className="sr-only">{found.includes(k) ? ' (verwendet)' : ' (fehlt)'}</span>
              </span>
            ))}
          </p>
          <p className={s.checklistTitle}>Musterantwort</p>
          <p className={s.sourceLine}><span lang={env.lang}>{ex.sample}</span><SpeakButton text={ex.sample} lang={env.lang} /></p>
        </div>
      )}
    </>
  );
}
