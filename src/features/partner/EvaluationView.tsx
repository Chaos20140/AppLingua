/** Darstellung einer Gesprächsauswertung (KI oder einfache Offline-Auswertung). */
import type { ReactNode } from 'react';
import { ArrowRight, Bot, BookOpen, CircleCheck, Info, Lightbulb, Mic, PenLine, Sparkles, Star, Volume2, WandSparkles } from 'lucide-react';
import type { PartnerEvaluation, Skill } from '../../core/types';
import { Badge, Button, IconButton, ProgressBar } from '../../ui';
import s from './Evaluation.module.css';

const SKILL_LABEL: Record<Skill, string> = {
  grammar: 'Grammatik', pronunciation: 'Aussprache', listening: 'Hörverstehen', speaking: 'Sprechen',
  reading: 'Lesen', writing: 'Schreiben', vocabulary: 'Wortschatz',
};

function Section({ icon, title, children, count }: { icon: ReactNode; title: string; children: ReactNode; count?: number }) {
  return (
    <section className={s.section}>
      <h3 className={s.heading}>
        <span className={s.headIcon} aria-hidden="true">{icon}</span>
        {title}
        {count !== undefined && count > 0 && <span className={s.count}>{count}</span>}
      </h3>
      {children}
    </section>
  );
}

export interface EvaluationViewProps {
  evaluation: PartnerEvaluation;
  /** z. B. Grund, warum statt der KI-Auswertung die Offline-Auswertung gezeigt wird */
  notice?: string | null;
  onSpeak?: (text: string) => void;
  /** BCP-47 der Zielsprache */
  lang?: string;
  /** Übungslinks anzeigen (Standard: true) */
  showLinks?: boolean;
}

export function EvaluationView({ evaluation: ev, notice, onSpeak, lang, showLinks = true }: EvaluationViewProps) {
  const scores = (Object.entries(ev.scores) as [Skill, number][]).filter(([, v]) => typeof v === 'number');
  const speakBtn = (text: string) => onSpeak && (
    <IconButton size="sm" variant="plain" label="Vorlesen" icon={<Volume2 size={18} />} onClick={() => onSpeak(text)} />
  );

  return (
    <div className={s.wrap}>
      <div className={s.summary}>
        <Badge tone={ev.source === 'ai' ? 'info' : 'neutral'} icon={ev.source === 'ai' ? <Bot size={14} /> : <Info size={14} />}>
          {ev.source === 'ai' ? 'KI-Auswertung' : 'Einfache Offline-Auswertung'}
        </Badge>
        {notice && <p className={s.notice}>{notice}</p>}
        <p className={s.summaryText}>{ev.summary}</p>
        {scores.length > 0 && (
          <div className={s.scores}>
            {scores.map(([k, v]) => (
              <ProgressBar key={k} value={v / 100} label={SKILL_LABEL[k]} showLabel valueText={`${v} %`} size="sm" tone={v >= 80 ? 'success' : v >= 50 ? 'accent' : 'gold'} />
            ))}
          </div>
        )}
      </div>

      {ev.goodAnswers.length > 0 && (
        <Section icon={<Star size={16} />} title="Besonders gut" count={ev.goodAnswers.length}>
          <ul className={s.list}>
            {ev.goodAnswers.map((g, i) => (
              <li key={i} className={s.good}><CircleCheck size={16} aria-hidden="true" /><span lang={lang}>{g}</span></li>
            ))}
          </ul>
        </Section>
      )}

      <Section icon={<PenLine size={16} />} title="Grammatik & Schreibweise" count={ev.grammarErrors.length}>
        {ev.grammarErrors.length ? (
          <ul className={s.list}>
            {ev.grammarErrors.map((g, i) => (
              <li key={i} className={s.fix}>
                <p className={s.wrong} lang={lang}><span className={s.srOnly}>Deine Version: </span>{g.original}</p>
                <p className={s.right} lang={lang}><ArrowRight size={14} aria-hidden="true" /><span className={s.srOnly}>Besser: </span>{g.corrected}</p>
                <p className={s.explain}>{g.explanation}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>{ev.source === 'ai' ? 'Keine Grammatikfehler gefunden – stark!' : 'Keine Auffälligkeiten bei der Schreibweise gefunden. (Die Offline-Auswertung prüft nur einfache Regeln.)'}</p>
        )}
      </Section>

      <Section icon={<WandSparkles size={16} />} title="Natürlicher formulieren" count={ev.unnatural.length}>
        {ev.unnatural.length ? (
          <ul className={s.list}>
            {ev.unnatural.map((u, i) => (
              <li key={i} className={s.fix}>
                <p className={s.wrong} lang={lang}><span className={s.srOnly}>Deine Version: </span>{u.original}</p>
                {u.better && (
                  <p className={s.right} lang={lang}>
                    <ArrowRight size={14} aria-hidden="true" /><span className={s.srOnly}>Besser: </span>{u.better}
                  </p>
                )}
                <p className={s.explain}>{u.explanation}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={s.empty}>Nichts Auffälliges – deine Formulierungen passen.</p>
        )}
      </Section>

      <Section icon={<BookOpen size={16} />} title="Wortschatz">
        {ev.vocabulary.used.length > 0 ? (
          <>
            <p className={s.sub}>Das hast du verwendet:</p>
            <ul className={s.chips}>
              {ev.vocabulary.used.map((w, i) => <li key={i} lang={lang}>{w}</li>)}
            </ul>
          </>
        ) : (
          <p className={s.empty}>Noch kein Wortschatz aus dieser Situation erkannt.</p>
        )}
        {ev.vocabulary.suggestions.length > 0 && (
          <>
            <p className={s.sub}>Nützlich für nächstes Mal:</p>
            <ul className={s.list}>
              {ev.vocabulary.suggestions.map((w, i) => <li key={i} className={s.plain} lang={lang}>{w}</li>)}
            </ul>
          </>
        )}
      </Section>

      <Section icon={<Mic size={16} />} title="Aussprache">
        <p className={ev.pronunciation ? s.text : s.empty}>
          {ev.pronunciation ?? 'Nicht gemessen – in diesem Gespräch wurde die Aussprache nicht bewertet. Übe gezielt im Aussprache-Labor.'}
        </p>
      </Section>

      {ev.alternatives.length > 0 && (
        <Section icon={<Lightbulb size={16} />} title="So könntest du es auch sagen">
          <ul className={s.list}>
            {ev.alternatives.map((a, i) => (
              <li key={i} className={s.alt}>
                <span lang={lang}>{a}</span>
                {speakBtn(a)}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {showLinks && ev.recommendedExercises.length > 0 && (
        <Section icon={<Sparkles size={16} />} title="Empfohlene Übungen">
          <div className={s.links}>
            {ev.recommendedExercises.map((r, i) => (
              <Button key={i} to={r.route} variant="secondary" iconRight={<ArrowRight size={16} />}>{r.label}</Button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
