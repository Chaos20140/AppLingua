/**
 * Aussprache-Kategorie: Beschreibung, Wörter/Sätze → PronPractice, Minimalpaar-Hörtraining.
 */
import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AudioLines } from 'lucide-react';
import type { PronItem } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { useList } from '../../data/store';
import { useActiveCourse, useVariant } from '../../state/settings';
import { Button, EmptyState, ErrorState, Page, RichText, Segmented, Skeleton } from '../../ui';
import { courseOfId, htmlLangFor, isForVariant } from '../content/helpers';
import { useSpeaker } from '../content/useSpeaker';
import { statsByItem } from './issues';
import { MinimalPairTrainer } from './MinimalPairTrainer';
import PronPractice from './PronPractice';
import s from './pron.module.css';

type View = 'sprechen' | 'hoeren';

export default function PronCategoryPage() {
  const { categoryId = '' } = useParams();
  const active = useActiveCourse();
  const courseId = courseOfId(categoryId) ?? active;
  const variant = useVariant(courseId);
  const sp = useSpeaker(variant);
  const { data, loading, error, retry } = useCourseContent(courseId);
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>('sprechen');
  const attemptRecords = useList('pronAttempts');
  const stats = useMemo(() => statsByItem(attemptRecords.map((r) => r.data), courseId), [attemptRecords, courseId]);

  const category = data?.pronCategories.find((c) => c.id === categoryId);
  const items = useMemo(() => {
    if (!data || !category) return [] as PronItem[];
    const byId = new Map(data.pronItems.map((i) => [i.id, i] as const));
    return category.itemIds
      .map((id) => byId.get(id))
      .filter((i): i is PronItem => !!i && isForVariant(i.variant, variant))
      .map((it, idx) => ({ it, idx }))
      .sort((a, b) => a.it.level - b.it.level || a.idx - b.idx)
      .map((x) => x.it);
  }, [data, category, variant]);

  if (loading) {
    return (
      <Page title="Aussprache" back="/aussprache">
        <Skeleton lines={3} />
        <Skeleton height={52} radius={14} />
        <Skeleton height={260} radius={28} />
      </Page>
    );
  }
  if (error || !data) {
    return (
      <Page title="Aussprache" back="/aussprache">
        <ErrorState message={error ?? 'Die Kategorie konnte nicht geladen werden.'} onRetry={retry} />
      </Page>
    );
  }
  if (!category) {
    return (
      <Page title="Nicht gefunden" back="/aussprache">
        <EmptyState
          icon={<AudioLines size={28} />}
          title="Diese Kategorie gibt es nicht"
          description="Vielleicht gehört sie zu einem anderen Kurs oder der Link ist veraltet."
          action={<Button to="/aussprache">Zum Aussprache-Labor</Button>}
        />
      </Page>
    );
  }

  const requested = params.get('item');
  const current = items.find((i) => i.id === requested) ?? items[0] ?? null;
  const index = current ? items.indexOf(current) : -1;
  const select = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('item', id);
    setParams(next, { replace: true });
    setView('sprechen');
  };
  const pairs = (category.minimalPairs ?? []).filter((p) => p.length === 2);

  return (
    <Page title={category.title} back="/aussprache" gap="lg">
      <div className={s.catIntro}>
        <span className={s.catEmojiLg} aria-hidden="true">{category.icon}</span>
        <RichText md={category.description} onSpeak={sp.available ? (t) => sp.say(t) : undefined} targetLang={htmlLangFor(variant)} />
      </div>

      {pairs.length > 0 && (
        <Segmented
          label="Übungsbereich"
          value={view}
          onChange={setView}
          options={[
            { value: 'sprechen', label: 'Aussprechen' },
            { value: 'hoeren', label: 'Hörtraining' },
          ]}
        />
      )}

      {view === 'hoeren' && pairs.length > 0 ? (
        <section aria-label="Hörtraining mit Minimalpaaren" className={s.section}>
          <p className={s.muted}>Minimalpaare unterscheiden sich nur in einem Laut. Wer sie hört, spricht sie auch leichter richtig.</p>
          <MinimalPairTrainer pairs={pairs} variant={variant} />
        </section>
      ) : items.length === 0 || !current ? (
        <EmptyState
          compact
          title="Für deine Variante gibt es hier noch keine Übungen"
          description="Die Wörter dieser Kategorie gelten nur für eine andere Sprachvariante."
          action={<Button variant="secondary" to="/aussprache">Andere Kategorie wählen</Button>}
        />
      ) : (
        <section aria-labelledby="pron-words-title" className={s.section}>
          <h2 id="pron-words-title" className="sr-only">Wörter und Sätze</h2>
          <nav aria-label="Wörter dieser Kategorie">
            <ol className={s.itemPicker}>
              {items.map((it) => {
                const st = stats.get(it.id);
                const tone = !st ? '' : st.best >= 80 ? s.dotGood : st.best >= 50 ? s.dotMid : s.dotLow;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      className={`${s.pick} ${it.id === current.id ? s.pickActive : ''}`}
                      aria-current={it.id === current.id ? 'true' : undefined}
                      onClick={() => select(it.id)}
                      lang={htmlLangFor(variant)}
                    >
                      {st && <span className={`${s.dot} ${tone}`} aria-hidden="true" />}
                      {it.text}
                      <span className="sr-only">{st ? `, bester Versuch ${st.best} Prozent` : ', noch nicht geübt'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <p className={s.progressLine} aria-live="polite">{index + 1} von {items.length}</p>

          <PronPractice key={current.id} item={current} courseId={courseId} variant={variant} context="pronunciation" refId={category.id} />

          <div className={s.stepper}>
            <Button
              variant="ghost"
              icon={<ArrowLeft size={18} />}
              disabled={index <= 0}
              onClick={() => index > 0 && select(items[index - 1].id)}
            >
              Zurück
            </Button>
            {index < items.length - 1 ? (
              <Button variant="secondary" iconRight={<ArrowRight size={18} />} onClick={() => select(items[index + 1].id)}>
                Nächstes Wort
              </Button>
            ) : pairs.length > 0 ? (
              <Button variant="secondary" iconRight={<ArrowRight size={18} />} onClick={() => { setView('hoeren'); window.scrollTo({ top: 0 }); }}>
                Zum Hörtraining
              </Button>
            ) : (
              <Button variant="secondary" to="/aussprache">Zurück zum Labor</Button>
            )}
          </div>
        </section>
      )}
    </Page>
  );
}
