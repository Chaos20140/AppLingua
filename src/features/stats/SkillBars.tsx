import { SKILLS, type Skill } from '../../core/types';
import { SKILL_LABELS, type Competences } from '../../engine/competence';
import { ProgressBar } from '../../ui';
import s from './SkillBars.module.css';

/** Kurze Erklärung, woraus sich eine Kompetenz ergibt. */
export const SKILL_HELP: Record<Skill, string> = {
  grammar: 'Regeln sicher anwenden – aus Grammatikaufgaben in Lektionen, im Grammatikzentrum und in Prüfungen.',
  pronunciation: 'Verständlichkeit laut Spracherkennung bzw. deiner Selbsteinschätzung – keine phonetische Analyse.',
  listening: 'Gesprochenes verstehen – Hör- und Diktataufgaben, auch in Songs.',
  speaking: 'Selbst formulieren und sprechen – Sprechaufgaben und Gespräche mit dem KI-Partner.',
  reading: 'Texte, Dialoge und Situationen verstehen.',
  writing: 'Selbst schreiben – freie Antworten, Übersetzungen, Lückentexte und Korrekturen.',
  vocabulary: 'Wörter kennen und abrufen – Vokabelkarten und Wortschatzaufgaben.',
};

const MIN_EVIDENCE = 5;

export function SkillBars({ competences, detailed = false }: { competences: Competences; detailed?: boolean }) {
  return (
    <ul className={s.list}>
      {SKILLS.map((sk) => {
        const c = competences[sk];
        const none = c.evidence === 0;
        const low = c.evidence < MIN_EVIDENCE;
        const tone = none ? 'info' : c.score >= 75 ? 'success' : c.score >= 45 ? 'accent' : 'gold';
        return (
          <li key={sk} className={s.item}>
            <div className={s.row}>
              <span className={s.name}>{SKILL_LABELS[sk]}</span>
              <span className={s.score}>
                {none ? '–' : c.score}
                {!none && <span className={s.of}> / 100</span>}
              </span>
            </div>
            <ProgressBar
              value={c.score / 100}
              label={`${SKILL_LABELS[sk]}: ${none ? 'noch keine Belege' : `${c.score} von 100`}`}
              size="sm"
              tone={tone}
            />
            {detailed ? (
              <p className={s.help}>
                {SKILL_HELP[sk]}{' '}
                <span className={s.evidence}>
                  {none
                    ? 'Noch keine Belege.'
                    : `${c.evidence} ${c.evidence === 1 ? 'Beleg' : 'Belege'} · Trefferquote ${Math.round(c.accuracy)} %${low ? ' · Wert noch vorläufig' : ''}`}
                </span>
              </p>
            ) : (
              low && <p className={s.hint}>{none ? 'Noch keine Belege' : 'Noch wenige Belege – Wert vorläufig'}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
