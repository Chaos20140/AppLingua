/**
 * Wiederverwendbare Aussprache-Übung zu einem PronItem (Vertrag – genutzt von Lektionen und dem Aussprache-Labor).
 * Bewertung = „Verständlichkeit laut Spracherkennung“ (keine phonetische Analyse) mit ehrlichen Fallbacks:
 * Aufnahme + Selbstvergleich bzw. ohne Mikrofon anhören, nachsprechen, selbst einschätzen.
 */
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronDown, CircleCheck, CircleX, Ear, Globe, Hand, History, Lightbulb, MapPin, Mic, Play, RotateCcw, Snail, Square,
  TriangleAlert, Volume2,
} from 'lucide-react';
import type { CourseId, ExerciseContext, PronAttempt, Variant } from '../../core/types';
import type { PronItem } from '../../content/types';
import { useList } from '../../data/store';
import { useSpeechSettings } from '../../speech/env';
import { SCORE_DISCLAIMER, SCORE_LABEL } from '../../speech/pronunciationScore';
import { getRememberedRecording, playBlob } from '../../speech/recorder';
import {
  buildPronAttempt, SELF_RATING_OPTIONS, usePronunciationCheck, type PronCheckMode,
} from '../../speech/usePronunciationCheck';
import { recordPronAttempt } from '../../state/actions';
import { ttsLangFor } from '../../state/settings';
import { Badge, Button, ProgressRing, RichText, Segmented, Spinner } from '../../ui';
import { htmlLangFor, VARIANT_SHORT } from '../content/helpers';
import { issueLabel, recentAttempts } from './issues';
import s from './PronPractice.module.css';

export interface PronPracticeProps {
  item: PronItem;
  courseId: CourseId;
  variant: Variant;
  context: ExerciseContext;
  refId?: string;
  /** kompakte Darstellung (in Lektionen) */
  compact?: boolean;
  /** nach gespeichertem Versuch (recordPronAttempt wird intern aufgerufen) */
  onAttempt?: (attempt: PronAttempt) => void;
}

const MODE_LABEL: Record<PronCheckMode, string> = {
  'speech-recognition': 'Spracherkennung',
  recording: 'Aufnahme',
  'listen-only': 'Ohne Mikro',
};

const MODE_INFO: Record<PronCheckMode, string> = {
  'speech-recognition': 'Sprich das Wort nach dem Tippen deutlich ins Mikrofon. Die Spracherkennung deines Geräts prüft, ob sie dich versteht.',
  recording: 'Du nimmst dich auf und vergleichst deine Aufnahme selbst mit dem Vorbild.',
  'listen-only': 'Hör dir das Vorbild an, sprich laut nach und schätze dich selbst ein.',
};

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Der STT-Hinweis empfiehlt „Aufnehmen & vergleichen“ – ohne nutzbares Mikrofon wäre das ein leeres Versprechen. */
const withoutRecordingHint = (reason: string) =>
  reason.replace(/\s*(?:–\s*)?oder nutze (?:hier )?„Aufnehmen & vergleichen“/, '');

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return same ? `heute, ${time}` : `${d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}, ${time}`;
}

export default function PronPractice({ item, courseId, variant, context, compact = false, onAttempt }: PronPracticeProps) {
  const lang = ttsLangFor(variant);
  const htmlLang = htmlLangFor(variant);
  const [showIpa, setShowIpa] = useState(false);
  const [helpOpen, setHelpOpen] = useState(!compact);
  const [otherVariants, setOtherVariants] = useState(false);
  const [xp, setXp] = useState<number | null>(null);
  const speech = useSpeechSettings();
  const helpId = useId();
  const variantsId = useId();

  const check = usePronunciationCheck(item.text, {
    lang,
    issueCodes: item.issueCodes,
    itemId: item.id,
    onResult: (r) => {
      const attempt = buildPronAttempt(r, { courseId, itemId: item.id, context, target: item.text });
      try {
        const res = recordPronAttempt(attempt);
        setXp(res.xp);
      } catch {
        setXp(null);
      }
      onAttempt?.(attempt);
    },
  });
  const { status, mode, support, result } = check;
  const busy = status === 'listening' || status === 'recording' || status === 'evaluating';

  useEffect(() => { setXp(null); }, [item.id]);

  const attemptsList = useList('pronAttempts');
  const recent = useMemo(
    () => recentAttempts(attemptsList.map((r) => r.data), item.id, courseId, compact ? 2 : 4),
    [attemptsList, item.id, courseId, compact],
  );

  const remembered = useMemo(
    () => (speech.storeRecordings && !check.hasRecording ? getRememberedRecording(item.id) ?? null : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [speech.storeRecordings, check.hasRecording, item.id, status],
  );

  const stressIdx = Math.max(0, Math.min(item.syllables.length - 1, item.stress));
  const ownNotes = (item.variantNotes ?? []).filter((n) => n.variant === variant);
  const otherNotes = (item.variantNotes ?? []).filter((n) => n.variant !== variant);

  const startLabel = status === 'result' || status === 'error'
    ? 'Nochmal versuchen'
    : mode === 'speech-recognition' ? 'Sprechen' : mode === 'recording' ? 'Aufnehmen' : 'Vorbild hören & nachsprechen';

  return (
    <article className={cx(s.root, compact && s.compact)} aria-label={`Aussprache üben: ${item.text}`}>
      {/* ── Wort / Satz ── */}
      <header className={s.head}>
        <p className={s.target} lang={htmlLang}>{item.text}</p>
        <p className={s.german}>{item.german}</p>
        <p className={s.helper}>
          <Ear size={16} aria-hidden="true" />
          <span><span className="sr-only">Aussprachehilfe: </span>{item.helper}</span>
        </p>

        {item.syllables.length > 0 && (
          <div className={s.sylRow}>
            <ol className={s.syllables} aria-label={`Silben, betont ist „${item.syllables[stressIdx]}“`}>
              {item.syllables.map((syl, i) => (
                <li key={i} className={cx(s.syl, i === stressIdx && s.sylStress)} lang={htmlLang}>
                  {i === stressIdx && <span className={s.stressMark} aria-hidden="true">ˈ</span>}
                  {syl}
                  {i === stressIdx && <span className="sr-only"> (betont)</span>}
                </li>
              ))}
            </ol>
            <button type="button" className={s.ipaBtn} aria-pressed={showIpa} onClick={() => setShowIpa((v) => !v)}>
              IPA
            </button>
          </div>
        )}
        {showIpa && <p className={s.ipa}><span className="sr-only">Lautschrift: </span>{item.ipa}</p>}

        {support.tts ? (
          <div className={s.listen}>
            <Button
              variant="secondary"
              icon={check.playing === 'model' ? <Square size={16} /> : <Volume2 size={18} />}
              disabled={busy}
              onClick={() => (check.playing === 'model' ? check.stopPlayback() : void check.playModel(false))}
            >
              {check.playing === 'model' ? 'Stopp' : 'Anhören'}
            </Button>
            <Button variant="ghost" icon={<Snail size={18} />} disabled={busy} onClick={() => void check.playModel(true)}>
              Langsam
            </Button>
          </div>
        ) : (
          <p className={s.warn}><TriangleAlert size={16} aria-hidden="true" /> Keine Sprachausgabe verfügbar – nutze die Aussprachehilfe oben.</p>
        )}
      </header>

      {/* ── Üben ── */}
      <section className={s.practice} aria-label="Selbst sprechen">
        {support.modes.length > 1 && (
          <Segmented
            size="sm"
            label="Übungsart"
            value={mode}
            onChange={(m) => check.setMode(m)}
            options={support.modes.map((m) => ({ value: m, label: MODE_LABEL[m], disabled: busy }))}
          />
        )}
        {status === 'idle' && <p className={s.modeInfo}>{MODE_INFO[mode]}</p>}
        {mode !== 'speech-recognition' && !support.stt.available && support.stt.reason && status === 'idle' && (
          <p className={s.note}>{support.recorder.available ? support.stt.reason : withoutRecordingHint(support.stt.reason)}</p>
        )}
        {support.stt.warning && mode === 'speech-recognition' && status === 'idle' && <p className={s.note}>{support.stt.warning}</p>}

        {(status === 'listening' || status === 'recording') && (
          <div className={s.live}>
            <div className={s.meterWrap} aria-hidden="true">
              <span className={s.meter} style={{ transform: `scale(${1 + Math.min(1, check.level) * 0.7})` }} />
              <span className={s.meterCore}><Mic size={26} /></span>
            </div>
            <p className={s.liveText}>{status === 'listening' ? 'Ich höre zu …' : 'Aufnahme läuft …'}</p>
            {check.interim && <p className={s.interim} lang={htmlLang}>„{check.interim}“</p>}
            <div className={s.row}>
              <Button icon={<Square size={16} />} onClick={check.stop}>Fertig</Button>
              <Button variant="ghost" onClick={check.cancel}>Abbrechen</Button>
            </div>
          </div>
        )}

        {status === 'evaluating' && (
          <div className={s.live} role="status">
            <Spinner size={28} label={null} />
            <p className={s.liveText}>Wird ausgewertet …</p>
          </div>
        )}

        {status === 'self-rating' && (
          <div className={s.rating}>
            <p className={s.ratingQ}>
              {check.hasRecording ? 'Vergleiche deine Aufnahme mit dem Vorbild:' : 'Sprich laut nach – wie nah warst du am Vorbild?'}
            </p>
            <div className={s.row}>
              {check.hasRecording && (
                <Button variant="secondary" icon={<Play size={16} />} onClick={() => void check.playRecording()}>
                  {check.playing === 'recording' ? 'Läuft …' : 'Meine Aufnahme'}
                </Button>
              )}
              {support.tts && (
                <Button variant="secondary" icon={<Volume2 size={16} />} onClick={() => void check.playModel(false)}>Vorbild</Button>
              )}
            </div>
            <div className={s.ratingGrid} role="group" aria-label="Selbsteinschätzung">
              {SELF_RATING_OPTIONS.map((o) => (
                <button key={o.value} type="button" className={cx(s.rateBtn, s[`rate${o.value}`])} onClick={() => check.selfRate(o.value)}>
                  <span className={s.rateDots} aria-hidden="true">{'●'.repeat(o.value)}{'○'.repeat(4 - o.value)}</span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === 'result' && result && (
          <div className={s.result}>
            <div className={s.scoreRow}>
              <ProgressRing
                value={result.scorePct / 100}
                size={compact ? 72 : 88}
                label={result.method === 'speech-recognition' ? SCORE_LABEL : 'Selbsteinschätzung'}
                valueText={`${result.scorePct} Prozent`}
                tone={result.rating === 'excellent' ? 'success' : result.rating === 'good' ? 'gold' : 'accent'}
              >
                <span className={s.scoreNum}>{result.scorePct}%</span>
              </ProgressRing>
              <div className={s.scoreText}>
                <span className={s.eyebrow}>{result.method === 'speech-recognition' ? SCORE_LABEL : 'Selbsteinschätzung'}</span>
                <p className={s.summary}>{result.summary}</p>
                {xp !== null && xp > 0 && <Badge tone="gold">+{xp} XP</Badge>}
              </div>
            </div>

            {result.method === 'speech-recognition' && result.words.length > 0 && (
              <div className={s.words}>
                <span className={s.eyebrow}>So hat die Erkennung dich verstanden</span>
                <p className={s.wordLine} lang={htmlLang}>
                  {result.words.map((w, i) => (
                    <span key={i} className={w.ok ? s.wordOk : s.wordBad}>
                      {w.text}
                      <span className="sr-only">{w.ok ? ' (verstanden)' : w.heard ? ` (nicht verstanden, gehört: ${w.heard})` : ' (nicht verstanden)'}</span>
                    </span>
                  )).reduce<ReactNode[]>((acc, el, i) => (i ? [...acc, ' ', el] : [el]), [])}
                </p>
                {result.transcript && <p className={s.heard}>Erkannt: „<span lang={htmlLang}>{result.transcript}</span>“</p>}
              </div>
            )}

            {result.notes.length > 0 && (
              <ul className={s.notes}>
                {result.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            )}

            {(result.issues.length > 0 || result.tips.length > 0) && (
              <div className={s.tipsBox}>
                <span className={s.eyebrow}><Lightbulb size={14} aria-hidden="true" /> Konkrete Tipps</span>
                {result.issues.length > 0 && (
                  <div className={s.issueChips}>
                    {result.issues.map((c) => <Badge key={c} tone="warning">{issueLabel(c, courseId)}</Badge>)}
                  </div>
                )}
                <ul className={s.tipList}>
                  {[...new Set(result.tips)].map((t, i) => <li key={i}><RichText md={t} inline /></li>)}
                </ul>
              </div>
            )}

            {result.method === 'speech-recognition' && <p className={s.disclaimer}>{SCORE_DISCLAIMER}</p>}
          </div>
        )}

        {status !== 'error' && check.error && <p className={s.note} role="status">{check.error}</p>}

        {status === 'error' && check.error && (
          <div className={s.error} role="alert">
            <TriangleAlert size={18} aria-hidden="true" />
            <span>{check.error}</span>
          </div>
        )}

        {(status === 'idle' || status === 'result' || status === 'error') && (
          <div className={s.actions}>
            <Button
              size="lg"
              block
              icon={status === 'result' || status === 'error' ? <RotateCcw size={18} /> : mode === 'listen-only' ? <Volume2 size={20} /> : <Mic size={20} />}
              onClick={check.start}
            >
              {startLabel}
            </Button>
            {status === 'result' && check.hasRecording && (
              <Button variant="secondary" block icon={<Play size={16} />} onClick={() => void check.playRecording()}>
                {check.playing === 'recording' ? 'Läuft …' : 'Meine Aufnahme anhören'}
              </Button>
            )}
            {status === 'idle' && remembered && (
              <Button variant="ghost" block icon={<Play size={16} />} onClick={() => void playBlob(remembered).catch(() => undefined)}>
                Letzte Aufnahme anhören
              </Button>
            )}
          </div>
        )}

        <p className={s.hint} aria-live="polite">{busy || status === 'self-rating' ? check.hint : ''}</p>
      </section>

      {/* ── Hilfe ── */}
      {compact && (
        <button type="button" className={s.disclosure} aria-expanded={helpOpen} aria-controls={helpId} onClick={() => setHelpOpen((o) => !o)}>
          <span>{helpOpen ? 'Aussprache-Hilfe ausblenden' : 'Mund, Zunge & typische Fehler'}</span>
          <ChevronDown size={16} aria-hidden="true" className={cx(s.chev, helpOpen && s.chevOpen)} />
        </button>
      )}
      <div id={helpId} hidden={!helpOpen} className={s.help}>
        {item.mouth && (
          <div className={s.helpBlock}>
            <h3 className={s.h3}>Mund, Zunge & Lippen</h3>
            <RichText md={item.mouth} targetLang={htmlLang} />
          </div>
        )}
        {item.mistakes.length > 0 && (
          <div className={s.helpBlock}>
            <h3 className={s.h3}>Typische Fehler</h3>
            <ul className={s.bullets}>
              {item.mistakes.map((m, i) => <li key={i}><CircleX size={16} aria-hidden="true" className={s.bad} /><RichText md={m} inline targetLang={htmlLang} /></li>)}
            </ul>
          </div>
        )}
        {item.tips.length > 0 && (
          <div className={s.helpBlock}>
            <h3 className={s.h3}>So klappt&apos;s</h3>
            <ul className={s.bullets}>
              {item.tips.map((t, i) => <li key={i}><CircleCheck size={16} aria-hidden="true" className={s.good} /><RichText md={t} inline targetLang={htmlLang} /></li>)}
            </ul>
          </div>
        )}
        {(ownNotes.length > 0 || otherNotes.length > 0) && (
          <div className={s.helpBlock}>
            {ownNotes.map((n, i) => (
              <div key={i} className={s.variantOwn}>
                <span className={s.eyebrow}><MapPin size={14} aria-hidden="true" /> Deine Variante · {VARIANT_SHORT[n.variant]}</span>
                <RichText md={n.note} targetLang={htmlLang} />
              </div>
            ))}
            {otherNotes.length > 0 && (
              <>
                <button type="button" className={s.disclosure} aria-expanded={otherVariants} aria-controls={variantsId} onClick={() => setOtherVariants((o) => !o)}>
                  <Globe size={16} aria-hidden="true" />
                  <span>{otherVariants ? 'Andere Varianten ausblenden' : 'So klingt es in anderen Varianten'}</span>
                  <ChevronDown size={16} aria-hidden="true" className={cx(s.chev, otherVariants && s.chevOpen)} />
                </button>
                <div id={variantsId} hidden={!otherVariants} className={s.variantList}>
                  {otherNotes.map((n, i) => (
                    <div key={i} className={s.variantOther}>
                      <span className={s.eyebrow}>{VARIANT_SHORT[n.variant]}</span>
                      <RichText md={n.note} targetLang={htmlLangFor(n.variant)} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Verlauf & Datenschutz ── */}
      {recent.length > 0 && (
        <div className={s.recent}>
          <h3 className={s.h3}><History size={14} aria-hidden="true" /> Letzte Versuche</h3>
          <ul className={s.recentList}>
            {recent.map((a, i) => (
              <li key={`${a.at}:${i}`} className={s.recentItem}>
                {a.method === 'speech-recognition' ? <Mic size={14} aria-hidden="true" /> : <Hand size={14} aria-hidden="true" />}
                <span className={s.recentWhen}>{timeLabel(a.at)}</span>
                <span className="sr-only">{a.method === 'speech-recognition' ? 'Spracherkennung' : 'Selbsteinschätzung'}</span>
                <span className={s.recentScore}>{a.scorePct} %</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!compact && support.recorder.available && (
        <p className={s.privacy}>
          {speech.storeRecordings
            ? 'Mit deiner Einwilligung wird deine letzte Aufnahme je Wort für diese Sitzung im Arbeitsspeicher behalten – nie hochgeladen.'
            : 'Aufnahmen bleiben nur während dieser Übung im Arbeitsspeicher und werden weder gespeichert noch hochgeladen. In den Einstellungen kannst du erlauben, die letzte Aufnahme je Wort für die Sitzung zu behalten.'}
        </p>
      )}
    </article>
  );
}
