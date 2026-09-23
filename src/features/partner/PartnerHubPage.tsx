import { useMemo, useState } from 'react';
import { Bot, Clock, Compass, MessageCircle, MessagesSquare, Sparkles } from 'lucide-react';
import type { PartnerSession } from '../../core/types';
import type { Scenario } from '../../content/types';
import { useCourseContent } from '../../content/registry';
import { useAiStatus } from '../../ai/client';
import { useList } from '../../data/store';
import { ttsLangFor, useActiveCourse, useVariant } from '../../state/settings';
import { useTts } from '../../speech/tts';
import { Badge, BottomSheet, Button, Card, EmptyState, ErrorState, ListRow, Page, Skeleton } from '../../ui';
import { EvaluationView } from './EvaluationView';
import { SetupSheet } from './SetupSheet';
import { SPEED_LABEL, formatSessionDate } from './launch';
import s from './Hub.module.css';

type SessionRow = { id: string; data: PartnerSession };

export default function PartnerHubPage() {
  const courseId = useActiveCourse();
  const variant = useVariant(courseId);
  const content = useCourseContent(courseId);
  const ai = useAiStatus();
  const tts = useTts();
  const all = useList('partnerSessions');
  const [setupFor, setSetupFor] = useState<Scenario | null>(null);
  const [openSession, setOpenSession] = useState<SessionRow | null>(null);
  const [showAll, setShowAll] = useState(false);

  const sessions = useMemo(
    () => all.filter((r) => r.data.courseId === courseId).sort((a, b) => b.data.at.localeCompare(a.data.at)),
    [all, courseId],
  );
  const practiced = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of sessions) m.set(r.data.scenarioId, (m.get(r.data.scenarioId) ?? 0) + 1);
    return m;
  }, [sessions]);
  const scenarios = content.data?.scenarios ?? [];
  const byId = useMemo(() => new Map(scenarios.map((sc) => [sc.id, sc])), [scenarios]);
  const visibleSessions = showAll ? sessions : sessions.slice(0, 5);
  const lang = ttsLangFor(variant);

  return (
    <Page title="Sprachpartner" subtitle="Echte Gespräche üben – in deinem Tempo und ohne Lampenfieber." back="/ueben">
      <Card tone={ai.available ? 'hero' : 'muted'} className={`${s.modeCard} ${ai.available ? '' : s.modeMuted}`}>
        <div className={s.modeIcon} aria-hidden="true">{ai.available ? <Bot size={24} /> : <Compass size={24} />}</div>
        <div className={s.modeText}>
          <p className={s.modeTitle}>{ai.available ? 'KI-Partner bereit' : 'Geführter Offline-Dialog'}</p>
          <p className={s.modeDesc}>
            {ai.available
              ? 'Sprich frei über alles, was in der Situation passt – mit Korrekturen und ausführlicher Auswertung.'
              : ai.reason}
          </p>
          {!ai.available && ai.code === 'signed-out' && (
            <Button to="/anmelden" variant="secondary" className={s.modeAction}>Anmelden</Button>
          )}
        </div>
      </Card>

      <section aria-labelledby="partner-scenarios" className={s.section}>
        <div className={s.sectionHead}>
          <h2 id="partner-scenarios" className={s.h2}>Situationen</h2>
          {scenarios.length > 0 && <span className={s.meta}>{scenarios.length} Szenarien</span>}
        </div>
        {content.loading ? (
          <div className={s.grid} aria-busy="true" aria-label="Situationen werden geladen">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={s.skeletonCard}>
                <Skeleton circle width={48} height={48} />
                <Skeleton width="70%" height={18} />
                <Skeleton lines={2} />
              </div>
            ))}
          </div>
        ) : content.error ? (
          <ErrorState message={content.error} onRetry={content.retry} />
        ) : scenarios.length === 0 ? (
          <EmptyState icon={<MessagesSquare size={28} />} title="Noch keine Situationen" description="Für diesen Kurs sind noch keine Gesprächssituationen verfügbar." />
        ) : (
          <ul className={s.grid}>
            {scenarios.map((sc, i) => {
              const count = practiced.get(sc.id) ?? 0;
              return (
                <li key={sc.id} className={s.cell} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
                  <Card onClick={() => setSetupFor(sc)} padding="md" className={s.scenario}>
                    <span className={s.scTop}>
                      <span className={s.emoji} aria-hidden="true">{sc.emoji}</span>
                      <span className={s.scChips}>
                        <Badge tone="neutral">{sc.register === 'formell' ? 'Formell' : 'Informell'}</Badge>
                        {count > 0 && <Badge tone="success">{count}× geübt</Badge>}
                      </span>
                    </span>
                    <span className={s.scTitle}>{sc.title}</span>
                    <span className={s.scDesc}>{sc.description}</span>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="partner-history" className={s.section}>
        <div className={s.sectionHead}>
          <h2 id="partner-history" className={s.h2}>Verlauf</h2>
          {sessions.length > 0 && <span className={s.meta}>{sessions.length} Gespräche</span>}
        </div>
        {sessions.length === 0 ? (
          <EmptyState
            compact
            icon={<Clock size={24} />}
            headingLevel={3}
            title="Noch keine Gespräche"
            description="Wähle oben eine Situation – deine Auswertungen findest du danach hier."
          />
        ) : (
          <>
            <Card padding="none">
              {visibleSessions.map((r) => {
                const sc = byId.get(r.data.scenarioId);
                const userTurns = r.data.turns.filter((t) => t.role === 'user').length;
                return (
                  <ListRow
                    key={r.id}
                    leading={<span aria-hidden="true">{sc?.emoji ?? '💬'}</span>}
                    title={sc?.title ?? 'Gespräch'}
                    subtitle={`${formatSessionDate(r.data.at)} · ${r.data.mode === 'ai' ? 'KI-Partner' : 'Geführt'} · ${userTurns} ${userTurns === 1 ? 'Beitrag' : 'Beiträge'}`}
                    trailing={r.data.evaluation ? <Badge tone="info" icon={<Sparkles size={12} />}>Auswertung</Badge> : undefined}
                    onClick={() => setOpenSession(r)}
                    chevron
                  />
                );
              })}
            </Card>
            {sessions.length > 5 && (
              <Button variant="ghost" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Weniger anzeigen' : `Alle ${sessions.length} Gespräche anzeigen`}
              </Button>
            )}
          </>
        )}
      </section>

      <SetupSheet scenario={setupFor} onClose={() => setSetupFor(null)} ai={ai} />

      <BottomSheet
        open={openSession !== null}
        onClose={() => { tts.stop(); setOpenSession(null); }}
        title={openSession ? (byId.get(openSession.data.scenarioId)?.title ?? 'Gespräch') : 'Gespräch'}
        description={openSession ? `${formatSessionDate(openSession.data.at)} · ${openSession.data.mode === 'ai' ? 'KI-Partner' : 'Geführter Dialog'} · ${openSession.data.prefs.formal ? 'formell' : 'informell'} · Tempo ${SPEED_LABEL[openSession.data.prefs.speed].toLowerCase()}` : undefined}
        footer={openSession && byId.get(openSession.data.scenarioId) ? (
          <Button block icon={<MessageCircle size={18} />} onClick={() => { const sc = byId.get(openSession.data.scenarioId)!; setOpenSession(null); setSetupFor(sc); }}>
            Diese Situation erneut üben
          </Button>
        ) : undefined}
      >
        {openSession && (
          <div className={s.historyBody}>
            {openSession.data.evaluation ? (
              <EvaluationView
                evaluation={openSession.data.evaluation}
                lang={lang}
                onSpeak={tts.available ? (t) => void tts.speak(t, { lang }) : undefined}
              />
            ) : (
              <p className={s.fieldHint}>Für dieses Gespräch wurde keine Auswertung gespeichert.</p>
            )}
            <details className={s.transcript}>
              <summary>Gesprächsverlauf ({openSession.data.turns.length} Nachrichten)</summary>
              <ol className={s.transcriptList}>
                {openSession.data.turns.map((t, i) => (
                  <li key={i} className={t.role === 'user' ? s.tUser : s.tPartner}>
                    <span className={s.tRole}>{t.role === 'user' ? 'Du' : 'Partner'}</span>
                    <span lang={lang}>{t.text}</span>
                    {t.translation && <span className={s.tTrans}>{t.translation}</span>}
                    {t.correction && <span className={s.tCorr}>Korrektur: {t.correction}</span>}
                  </li>
                ))}
              </ol>
            </details>
          </div>
        )}
      </BottomSheet>

    </Page>
  );
}
