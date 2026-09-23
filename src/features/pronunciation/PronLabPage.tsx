/**
 * Aussprache-Labor: Kategorien des aktiven Kurses, „Deine Baustellen“ aus den letzten Versuchen,
 * ehrlicher Hinweis zur browserbasierten Bewertung.
 */
import { useMemo } from 'react';
import { ArrowRight, Construction, Info, Mic, MicOff, Sparkles } from 'lucide-react';
import { useCourseContent } from '../../content/registry';
import { useList } from '../../data/store';
import { recorderSupport } from '../../speech/recorder';
import { SCORE_DISCLAIMER, SCORE_LABEL, issueTip } from '../../speech/pronunciationScore';
import { sttSupport } from '../../speech/stt';
import { useActiveCourse, useVariant, ttsLangFor, VARIANT_LABELS } from '../../state/settings';
import { Button, Card, EmptyState, ErrorState, Page, ProgressBar, Skeleton } from '../../ui';
import { isForVariant } from '../content/helpers';
import { aggregateIssues, categoryForIssue, issueLabel, statsByItem } from './issues';
import s from './pron.module.css';

export default function PronLabPage() {
  const courseId = useActiveCourse();
  const variant = useVariant(courseId);
  const lang = ttsLangFor(variant);
  const { data, loading, error, retry } = useCourseContent(courseId);
  const attemptRecords = useList('pronAttempts');
  const attempts = useMemo(() => attemptRecords.map((r) => r.data), [attemptRecords]);
  const stats = useMemo(() => statsByItem(attempts, courseId), [attempts, courseId]);
  const issues = useMemo(() => aggregateIssues(attempts, courseId), [attempts, courseId]);
  const support = useMemo(() => ({ stt: sttSupport(), rec: recorderSupport() }), []);

  const items = useMemo(
    () => (data?.pronItems ?? []).filter((i) => i.courseId === courseId && isForVariant(i.variant, variant)),
    [data, courseId, variant],
  );
  const categories = useMemo(
    () => (data?.pronCategories ?? []).filter((c) => c.courseId === courseId),
    [data, courseId],
  );

  if (loading) {
    return (
      <Page title="Aussprache" back>
        <Skeleton height={140} radius={20} />
        <Skeleton height={96} radius={20} />
        <div className={s.catGrid}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={132} radius={20} />)}
        </div>
      </Page>
    );
  }
  if (error || !data) {
    return (
      <Page title="Aussprache" back>
        <ErrorState message={error ?? 'Das Aussprache-Labor konnte nicht geladen werden.'} onRetry={retry} />
      </Page>
    );
  }

  const practiced = items.filter((i) => stats.has(i.id)).length;
  const good = items.filter((i) => (stats.get(i.id)?.best ?? 0) >= 80).length;

  return (
    <Page title="Aussprache" back subtitle={VARIANT_LABELS[variant]} gap="lg">
      <Card tone="hero" padding="lg" className={s.hero}>
        <span className={s.heroEyebrow}><Sparkles size={14} aria-hidden="true" /> Aussprache-Labor</span>
        <h2 className={s.heroTitle}>Klar verstanden werden – Laut für Laut</h2>
        <p className={s.heroText}>Hör das Vorbild, sprich nach und bekomm konkrete Tipps zu Mund, Zunge und Betonung.</p>
        {items.length > 0 && (
          <div className={s.heroStats}>
            <ProgressBar value={items.length ? good / items.length : 0} label="Sicher ausgesprochen" size="sm" tone="gold" />
            <span>{good} von {items.length} sicher · {practiced} geübt</span>
          </div>
        )}
      </Card>

      <Card tone="muted" padding="md" className={s.honest}>
        <span className={s.honestIcon} aria-hidden="true"><Info size={18} /></span>
        <div className={s.honestBody}>
          <strong>So wird bewertet: {SCORE_LABEL}</strong>
          <p className={s.muted}>{SCORE_DISCLAIMER}</p>
          <p className={s.supportLine}>
            {support.stt.available ? (
              <><Mic size={14} aria-hidden="true" /> Spracherkennung ist in diesem Browser verfügbar.</>
            ) : support.rec.available ? (
              <><MicOff size={14} aria-hidden="true" /> Keine Spracherkennung verfügbar{support.stt.reason ? ` (${support.stt.reason.replace(/\.$/, '')})` : ''} – du nimmst dich auf und vergleichst selbst mit dem Vorbild.</>
            ) : (
              <><MicOff size={14} aria-hidden="true" /> Kein Mikrofon nutzbar – du hörst das Vorbild, sprichst laut nach und schätzt dich selbst ein.</>
            )}
          </p>
        </div>
      </Card>

      <section className={s.section} aria-labelledby="pl-issues">
        <h2 id="pl-issues" className={s.h2}><Construction size={20} aria-hidden="true" /> Deine Baustellen</h2>
        {issues.length > 0 ? (
          <ul className={s.issueList}>
            {issues.map((iss) => {
              const cat = categoryForIssue(iss.code, items);
              const tip = issueTip(iss.code, lang);
              return (
                <li key={iss.code} className={s.issue}>
                  <div className={s.issueHead}>
                    <strong>{issueLabel(iss.code, courseId)}</strong>
                    <span className={s.muted}>{iss.items === 1 ? '1 Wort' : `${iss.items} Wörter`}</span>
                  </div>
                  {tip && <p className={s.issueTip}>{tip}</p>}
                  {cat && (
                    <Button variant="secondary" iconRight={<ArrowRight size={16} />} to={practiceHref(cat, iss.itemIds, items)}>
                      Gezielt üben
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : stats.size > 0 ? (
          <p className={s.allGood}>Aktuell keine Baustellen – deine letzten Versuche wurden gut verstanden. Weiter so!</p>
        ) : (
          <EmptyState
            compact
            icon={<Construction size={26} />}
            headingLevel={3}
            title="Noch keine Baustellen"
            description="Nach deinen ersten Versuchen siehst du hier, welche Laute dir noch schwerfallen – mit konkreten Tipps."
          />
        )}
      </section>

      <section className={s.section} aria-labelledby="pl-cats">
        <h2 id="pl-cats" className={s.h2}>Kategorien</h2>
        {categories.length === 0 ? (
          <EmptyState compact title="Noch keine Kategorien" description="Für diesen Kurs folgen Aussprache-Übungen mit einem Update." />
        ) : (
          <ul className={s.catGrid}>
            {categories.map((c) => {
              const catItems = items.filter((i) => i.categoryId === c.id);
              const done = catItems.filter((i) => stats.has(i.id)).length;
              const best = catItems.filter((i) => (stats.get(i.id)?.best ?? 0) >= 80).length;
              return (
                <li key={c.id}>
                  <Card to={`/aussprache/${c.id}`} padding="md" className={s.catCard} aria-label={`${c.title}: ${catItems.length} Übungen, ${done} geübt`}>
                    <span className={s.catEmoji} aria-hidden="true">{c.icon}</span>
                    <span className={s.catTitle}>{c.title}</span>
                    <span className={s.catMeta}>
                      {catItems.length} {catItems.length === 1 ? 'Übung' : 'Übungen'}
                      {done > 0 ? ` · ${done} geübt` : ''}
                      {c.minimalPairs?.length ? ' · Hörtraining' : ''}
                    </span>
                    <span className={s.catBar} aria-hidden="true">
                      <span className={s.catBarFill} style={{ transform: `scaleX(${catItems.length ? best / catItems.length : 0})` }} />
                    </span>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Page>
  );
}

function practiceHref(categoryId: string, itemIds: string[], items: { id: string; categoryId: string }[]): string {
  const hit = itemIds.find((id) => items.some((i) => i.id === id && i.categoryId === categoryId));
  return hit ? `/aussprache/${categoryId}?item=${encodeURIComponent(hit)}` : `/aussprache/${categoryId}`;
}
