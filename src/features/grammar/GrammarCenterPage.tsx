/**
 * Grammatikzentrum: strukturierter Pfad je Etappe/Kategorie, Suche, Beherrschung, Empfehlung, Farblegende.
 */
import { useDeferredValue, useMemo, useState } from 'react';
import { Archive, ChevronDown, Palette, Search, SearchX, Sparkles, Target, X } from 'lucide-react';
import type { StageId } from '../../core/types';
import type { GrammarTopic, Stage } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { useTopicMastery } from '../../state/progress';
import { useOpenErrors } from '../../state/review';
import { useActiveCourse, useVariant, VARIANT_LABELS } from '../../state/settings';
import {
  Badge, Button, Card, EmptyState, ErrorState, IconButton, ListRow, Page, ProgressBar, ProgressRing, Skeleton, TextField,
} from '../../ui';
import { RoleLegend } from '../content/ExplainBlocks';
import { groupTopics, masteryLabel, recommendTopic, searchTopics, type MasteryLike, type Recommendation as Rec } from './logic';
import s from './grammar.module.css';

const STAGE_FALLBACK: Record<StageId, string> = {
  stage0: 'Grundlagen', a1: 'A1', a2: 'A2', b1: 'B1', b2: 'B2', c1: 'C1', c2: 'C2', native: 'Native Mastery',
};

export default function GrammarCenterPage() {
  const courseId = useActiveCourse();
  const variant = useVariant(courseId);
  const { data, loading, error, retry } = useCourseContent(courseId);
  const mastery = useTopicMastery(courseId);
  const openErrors = useOpenErrors(courseId);
  const [query, setQuery] = useState('');
  const [legendOpen, setLegendOpen] = useState(false);
  const deferred = useDeferredValue(query);

  const topics = useMemo(() => (data?.grammar ?? []).filter((t) => t.courseId === courseId), [data, courseId]);
  const groups = useMemo(() => groupTopics(topics), [topics]);
  const results = useMemo(() => (deferred.trim() ? searchTopics(topics, deferred) : null), [topics, deferred]);
  const rec = useMemo(() => recommendTopic(topics, mastery), [topics, mastery]);
  const stageById = useMemo(() => new Map((data?.stages ?? []).map((st) => [st.id, st] as const)), [data]);

  const counts = useMemo(() => {
    let secure = 0;
    let started = 0;
    for (const t of topics) {
      const m = mastery[t.id];
      if (m?.evidence) started += 1;
      if (m && m.evidence >= 3 && m.mastery >= 85) secure += 1;
    }
    return { secure, started };
  }, [topics, mastery]);

  if (loading) {
    return (
      <Page title="Grammatik" back>
        <Skeleton height={48} radius={14} />
        <Skeleton height={132} radius={20} />
        <Skeleton lines={3} />
        <Skeleton height={220} radius={20} />
      </Page>
    );
  }
  if (error || !data) {
    return (
      <Page title="Grammatik" back>
        <ErrorState message={error ?? 'Die Grammatikthemen konnten nicht geladen werden.'} onRetry={retry} />
      </Page>
    );
  }

  return (
    <Page
      title="Grammatik"
      back
      subtitle={`${topics.length} Themen · ${VARIANT_LABELS[variant]}`}
      gap="lg"
    >
      <div role="search">
        <TextField
          label="Grammatik durchsuchen"
          hideLabel
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Thema, Wort oder Beispiel suchen …"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search size={18} aria-hidden="true" />}
          trailing={query ? <IconButton label="Suche leeren" size="sm" icon={<X size={18} />} onClick={() => setQuery('')} /> : undefined}
        />
      </div>

      {results ? (
        <section aria-labelledby="gr-results" className={s.section}>
          <h2 id="gr-results" className={s.h2} aria-live="polite">
            {results.length === 1 ? '1 Treffer' : `${results.length} Treffer`}
          </h2>
          {results.length ? (
            <Card padding="none">
              <ul className={s.list}>
                {results.map((t) => <TopicRow key={t.id} topic={t} m={mastery[t.id]} stage={stageById.get(t.stageId)} showStage />)}
              </ul>
            </Card>
          ) : (
            <EmptyState
              compact
              icon={<SearchX size={28} />}
              title="Nichts gefunden"
              description={`Versuch es mit einem anderen Begriff – zum Beispiel einem ${variant === 'pt-BR' ? 'portugiesischen' : 'spanischen'} Wort, einer Verbform oder einem deutschen Stichwort.`}
              action={<Button variant="secondary" onClick={() => setQuery('')}>Suche zurücksetzen</Button>}
            />
          )}
        </section>
      ) : (
        <>
          {topics.length === 0 ? (
            <EmptyState title="Noch keine Grammatikthemen" description="Für diesen Kurs folgen die Grammatikthemen mit einem Update." />
          ) : (
            <>
              {rec && <Recommendation rec={rec} />}

              <div className={s.tiles}>
                <div className={s.tile}>
                  <span className={s.tileValue}>{counts.secure}<span className={s.tileOf}>/{topics.length}</span></span>
                  <span className={s.tileLabel}>sicher beherrscht</span>
                </div>
                <div className={s.tile}>
                  <span className={s.tileValue}>{counts.started}</span>
                  <span className={s.tileLabel}>Themen begonnen</span>
                </div>
              </div>

              {groups.map((g) => {
                const stage = stageById.get(g.stageId);
                const all = g.categories.flatMap((c) => c.topics);
                const secure = all.filter((t) => (mastery[t.id]?.evidence ?? 0) >= 3 && (mastery[t.id]?.mastery ?? 0) >= 85).length;
                return (
                  <section key={g.stageId} className={s.section} aria-labelledby={`gr-stage-${g.stageId}`}>
                    <header className={s.stageHead}>
                      <div className={s.stageTitleWrap}>
                        <span className={s.stageShort}>{stage?.short ?? STAGE_FALLBACK[g.stageId]}</span>
                        <h2 id={`gr-stage-${g.stageId}`} className={s.h2}>{stageTitle(stage, g.stageId)}</h2>
                      </div>
                      <span className={s.stageCount}>{secure}/{g.count} sicher</span>
                    </header>
                    <ProgressBar value={g.count ? secure / g.count : 0} label={`Sicher beherrschte Themen: ${stage?.short ?? g.stageId}`} size="sm" tone="success" />
                    {g.categories.map((c) => (
                      <div key={c.category} className={s.category}>
                        <h3 className={s.h3}>{c.category}</h3>
                        <Card padding="none">
                          <ul className={s.list}>
                            {c.topics.map((t) => <TopicRow key={t.id} topic={t} m={mastery[t.id]} />)}
                          </ul>
                        </Card>
                      </div>
                    ))}
                  </section>
                );
              })}
            </>
          )}

          <section className={s.section} aria-labelledby="gr-legend">
            <Card padding="md">
              <button
                type="button"
                className={s.legendToggle}
                aria-expanded={legendOpen}
                aria-controls="gr-legend-body"
                onClick={() => setLegendOpen((o) => !o)}
              >
                <span className={s.iconTile} aria-hidden="true"><Palette size={18} /></span>
                <span className={s.legendToggleText}>
                  <span id="gr-legend" className={s.legendTitle}>Farblegende der Satzglieder</span>
                  <span className={s.muted}>So sind Beispielsätze markiert – Farbe und Linienart zeigen die Rolle.</span>
                </span>
                <ChevronDown size={18} aria-hidden="true" className={legendOpen ? s.chevOpen : s.chev} />
              </button>
              <div id="gr-legend-body" hidden={!legendOpen} className={s.legendBody}>
                <RoleLegend />
                <p className={s.muted}>Tipp: In Beispielsätzen kannst du jedes markierte Wort antippen – dann steht seine Rolle darunter.</p>
              </div>
            </Card>
          </section>

          <Card padding="none">
            <ListRow
              to="/fehlerarchiv"
              leading={<Archive size={20} />}
              title="Fehlerarchiv"
              subtitle={openErrors.length ? `${openErrors.length} ${openErrors.length === 1 ? 'offener' : 'offene'} Fehler – gezielt wiederholen` : 'Deine Fehler werden hier gesammelt und erklärt'}
              trailing={openErrors.length ? <Badge tone="danger">{openErrors.length}</Badge> : undefined}
            />
          </Card>
        </>
      )}
    </Page>
  );
}

function stageTitle(stage: Stage | undefined, id: StageId): string {
  if (!stage) return STAGE_FALLBACK[id];
  const t = stage.title.split(/\s[–-]\s/);
  return t.length > 1 ? t.slice(1).join(' – ') : stage.title;
}

function Recommendation({ rec }: { rec: NonNullable<Rec<GrammarTopic>> }) {
  const weak = rec.kind === 'weak';
  return (
    <Card tone={weak ? 'hero' : 'accent'} padding="lg" className={s.rec}>
      <span className={s.recEyebrow}>
        {weak ? <Target size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
        {weak ? 'Dein schwächstes Thema' : 'Als Nächstes'}
      </span>
      <h2 className={s.recTitle}>{rec.topic.title}</h2>
      <p className={s.recText}>
        {weak
          ? `Aktuell ${rec.mastery} % Beherrschung. Eine kurze Übungsrunde bringt hier am meisten.`
          : rec.topic.summary}
      </p>
      <div>
        <Button to={`/grammatik/${rec.topic.id}`} variant={weak ? 'secondary' : 'primary'}>
          {weak ? 'Gezielt üben' : 'Thema öffnen'}
        </Button>
      </div>
    </Card>
  );
}

function TopicRow({ topic, m, stage, showStage = false }: { topic: GrammarTopic; m?: MasteryLike; stage?: Stage; showStage?: boolean }) {
  const ml = masteryLabel(m);
  const value = m?.evidence ? m.mastery / 100 : 0;
  return (
    <li>
      <ListRow
        to={`/grammatik/${topic.id}`}
        leadingRaw={
          <ProgressRing value={value} size={40} label="Beherrschung" valueText={m?.evidence ? `${m.mastery} Prozent` : 'noch nicht geübt'} tone={ml.tone === 'success' ? 'success' : ml.tone === 'gold' ? 'gold' : 'accent'}>
            <span className={s.ringNum}>{m?.evidence ? m.mastery : '–'}</span>
          </ProgressRing>
        }
        title={topic.title}
        subtitle={showStage ? `${stage?.short ?? topic.stageId} · ${topic.category}` : <span className={s.clamp2}>{topic.summary}</span>}
        trailing={m?.evidence ? <Badge tone={ml.tone}>{ml.label}</Badge> : undefined}
      />
    </li>
  );
}
