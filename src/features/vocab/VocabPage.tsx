import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, CircleCheck, Headphones, Layers, PenLine, Plus, Search, Sparkles, X } from 'lucide-react';
import type { SrsCard } from '../../core/types';
import { cardId } from '../../engine/srs';
import { useCards, useDueCards } from '../../state/review';
import { ttsLangFor, useActiveCourse, useSettings, useVariant, VARIANT_LABELS } from '../../state/settings';
import { useTts } from '../../speech/tts';
import { Badge, Button, Card, Chip, EmptyState, IconButton, ListRow, Page, StatTile, TextField } from '../../ui';
import { AddCardSheet, CardDetailSheet } from './CardSheets';
import { MODE_LABEL, StudySession } from './StudySession';
import {
  cardStats, dueLabel, filterCards, formatDueDate, pickPractice, SOURCE_GROUP_LABEL, sourceGroup,
  type CardFilter, type SourceGroup, type StudyMode,
} from './vocabUtils';
import s from './VocabPage.module.css';

const SESSION_SIZE = 20;
const PRACTICE_SIZE = 10;
const PAGE_SIZE = 50;
const GROUPS: SourceGroup[] = ['lesson', 'song', 'user', 'error', 'other'];
const GROUP_CLASS: Record<SourceGroup, string> = { lesson: s.gLesson, song: s.gSong, user: s.gUser, error: s.gError, other: s.gOther };

interface Study { mode: StudyMode; cards: SrsCard[]; schedule: boolean; round: number }

export default function VocabPage() {
  const courseId = useActiveCourse();
  const variant = useVariant(courseId);
  const settings = useSettings();
  const lang = ttsLangFor(variant);
  const tts = useTts();
  const cards = useCards(courseId);
  const due = useDueCards(courseId);
  const stats = useMemo(() => cardStats(cards), [cards]);

  const [study, setStudy] = useState<Study | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CardFilter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => filterCards(cards, query, filter), [cards, query, filter]);
  const selected = selectedId ? cards.find((c) => cardId(c.courseId, c.itemId) === selectedId) ?? null : null;

  const plan = (mode: StudyMode, round = 0): Study | null => {
    if (due.length) return { mode, cards: due.slice(0, SESSION_SIZE), schedule: true, round };
    const practice = pickPractice(cards, PRACTICE_SIZE);
    return practice.length ? { mode, cards: practice, schedule: false, round } : null;
  };
  const start = (mode: StudyMode) => {
    const p = plan(mode);
    if (p) { setStudy(p); window.scrollTo({ top: 0 }); }
  };

  if (study) {
    return (
      <Page
        title={MODE_LABEL[study.mode]}
        subtitle={study.schedule ? `${study.cards.length} fällige ${study.cards.length === 1 ? 'Karte' : 'Karten'}` : 'Freies Üben – ohne Einfluss auf deinen Plan'}
        leading={<IconButton label="Runde beenden" icon={<X size={22} />} onClick={() => setStudy(null)} />}
        largeTitle={false}
      >
        <StudySession
          key={`${study.mode}:${study.round}`}
          courseId={courseId}
          mode={study.mode}
          cards={study.cards}
          schedule={study.schedule}
          lang={lang}
          strictAccents={settings.strictAccents}
          onExit={() => setStudy(null)}
          onRestart={() => {
            const next = plan(study.mode, study.round + 1);
            setStudy(next);
            window.scrollTo({ top: 0 });
          }}
        />
      </Page>
    );
  }

  const active = stats.total - stats.suspended;
  const filterOptions: { value: CardFilter; label: string; count: number }[] = [
    { value: 'all', label: 'Alle', count: stats.total },
    { value: 'due', label: 'Fällig', count: stats.due },
    { value: 'new', label: 'Neu', count: stats.fresh },
    ...GROUPS.filter((g) => stats.bySource[g] > 0).map((g) => ({ value: g as CardFilter, label: SOURCE_GROUP_LABEL[g], count: stats.bySource[g] })),
    ...(stats.suspended ? [{ value: 'suspended' as CardFilter, label: 'Pausiert', count: stats.suspended }] : []),
  ];

  const modes: { mode: StudyMode; icon: ReactNode; title: string; desc: string; disabledReason?: string }[] = [
    { mode: 'flash', icon: <Layers size={22} />, title: 'Karteikarten', desc: 'Umdrehen, anhören, selbst bewerten.' },
    { mode: 'write', icon: <PenLine size={22} />, title: 'Schreiben', desc: 'Deutsch sehen, in der Zielsprache tippen.' },
    {
      mode: 'listen', icon: <Headphones size={22} />, title: 'Hören', desc: 'Anhören und aufschreiben, was du hörst.',
      disabledReason: tts.available ? undefined : 'Sprachausgabe ist in diesem Browser nicht verfügbar.',
    },
  ];

  return (
    <Page
      title="Vokabeln"
      subtitle={VARIANT_LABELS[variant]}
      back="/ueben"
      actions={<IconButton label="Eigene Karte anlegen" icon={<Plus size={22} />} onClick={() => setAddOpen(true)} />}
    >
      {stats.total === 0 ? (
        <EmptyState
          icon={<BookOpen size={28} />}
          title="Noch keine Vokabeln"
          description="Sobald du Lektionen oder Songs lernst, sammeln sich hier deine Wörter – oder du legst gleich eigene Karten an."
          action={
            <div className={s.emptyActions}>
              <Button to="/lernpfad">Zum Lernpfad</Button>
              <Button variant="secondary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>Eigene Karte anlegen</Button>
            </div>
          }
        />
      ) : (
        <>
          <Card tone={stats.due ? 'hero' : 'success'} className={s.hero}>
            <div className={s.heroText}>
              {stats.due ? (
                <>
                  <p className={s.heroKicker}>Heute fällig</p>
                  <p className={s.heroValue}>{stats.due} {stats.due === 1 ? 'Karte' : 'Karten'}</p>
                  <p className={s.heroSub}>Ein paar Minuten reichen – danach sitzt es besser.</p>
                </>
              ) : (
                <>
                  <p className={s.heroKicker}><CircleCheck size={16} aria-hidden="true" /> Alles wiederholt</p>
                  <p className={s.heroValue}>Stark!</p>
                  <p className={s.heroSub}>
                    {stats.nextDueAt ? `Nächste Karte fällig: ${formatDueDate(stats.nextDueAt)}.` : 'Gerade ist nichts fällig.'} Freies Üben geht trotzdem.
                  </p>
                </>
              )}
            </div>
            <Button
              size="lg"
              variant={stats.due ? 'secondary' : 'primary'}
              icon={<Sparkles size={18} />}
              onClick={() => start('flash')}
              disabled={active === 0}
              className={s.heroButton}
            >
              {stats.due ? 'Jetzt wiederholen' : 'Frei üben'}
            </Button>
          </Card>

          <div className={s.tiles}>
            <StatTile label="Gesamt" value={stats.total} tone="neutral" hint={stats.suspended ? `${stats.suspended} pausiert` : undefined} />
            <StatTile label="Gelernt" value={stats.learned} tone="success" hint={`${stats.mature} gefestigt`} />
            <StatTile label="Neu" value={stats.fresh} tone="info" />
          </div>

          <section aria-labelledby="vocab-sources" className={s.section}>
            <h2 id="vocab-sources" className={s.h2}>Herkunft</h2>
            <div className={s.sourceBar} role="img" aria-label={GROUPS.filter((g) => stats.bySource[g]).map((g) => `${SOURCE_GROUP_LABEL[g]}: ${stats.bySource[g]}`).join(', ')}>
              {GROUPS.filter((g) => stats.bySource[g]).map((g) => (
                <span key={g} className={`${s.sourceSeg} ${GROUP_CLASS[g]}`} style={{ flexGrow: stats.bySource[g] }} />
              ))}
            </div>
            <ul className={s.legend}>
              {GROUPS.filter((g) => g !== 'other' || stats.bySource.other).map((g) => (
                <li key={g}><span className={`${s.dot} ${GROUP_CLASS[g]}`} aria-hidden="true" />{SOURCE_GROUP_LABEL[g]} <strong>{stats.bySource[g]}</strong></li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="vocab-modes" className={s.section}>
            <h2 id="vocab-modes" className={s.h2}>Lernmodi</h2>
            <p className={s.sectionHint}>
              {stats.due ? `Jeder Modus startet mit deinen ${Math.min(stats.due, SESSION_SIZE)} fälligsten Karten.` : 'Nichts fällig – du übst frei, ohne deinen Plan zu verändern.'}
            </p>
            <div className={s.modes}>
              {modes.map((m) => (
                <Card
                  key={m.mode}
                  onClick={m.disabledReason || active === 0 ? undefined : () => start(m.mode)}
                  tone={m.disabledReason ? 'muted' : 'default'}
                  className={s.mode}
                  padding="md"
                >
                  <span className={s.modeIcon} aria-hidden="true">{m.icon}</span>
                  <span className={s.modeTitle}>{m.title}</span>
                  <span className={s.modeDesc}>{m.disabledReason ?? m.desc}</span>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="vocab-list" className={s.section}>
            <div className={s.listHead}>
              <h2 id="vocab-list" className={s.h2}>Alle Karten</h2>
              <Button variant="ghost" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>Neue Karte</Button>
            </div>
            <TextField
              label="Vokabeln durchsuchen"
              hideLabel
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
              placeholder={`Suchen (${courseId === 'es' ? 'Spanisch' : 'Portugiesisch'}, Deutsch, Notiz) …`}
              leading={<Search size={18} aria-hidden="true" />}
              enterKeyHint="search"
            />
            <div className={s.filters} role="group" aria-label="Filter">
              {filterOptions.map((f) => (
                <Chip key={f.value} selected={filter === f.value} onClick={() => { setFilter(f.value); setLimit(PAGE_SIZE); }} size="sm">
                  {f.label} <span className={s.chipCount}>{f.count}</span>
                </Chip>
              ))}
            </div>
            <p className={s.srOnly} aria-live="polite">{filtered.length} Karten gefunden</p>
            {filtered.length === 0 ? (
              <EmptyState compact icon={<Search size={22} />} title="Keine Treffer" description="Versuch einen anderen Suchbegriff oder Filter." />
            ) : (
              <>
                <Card padding="none">
                  {filtered.slice(0, limit).map((c) => {
                    const label = dueLabel(c);
                    const tone = c.suspended ? 'neutral' : label === 'Fällig' ? 'accent' : label === 'Neu' ? 'info' : 'neutral';
                    return (
                      <ListRow
                        key={c.itemId}
                        title={<span lang={lang}>{c.front}</span>}
                        subtitle={`${c.back}${c.note ? ' · 📝' : ''}`}
                        trailing={<Badge tone={tone}>{label}</Badge>}
                        onClick={() => setSelectedId(cardId(c.courseId, c.itemId))}
                        chevron
                        leadingRaw={<span className={s.rowLead}><span className={`${s.rowDot} ${GROUP_CLASS[sourceGroup(c)]}`} aria-hidden="true" /><span className={s.srOnly}>{SOURCE_GROUP_LABEL[sourceGroup(c)]}:</span></span>}
                      />
                    );
                  })}
                </Card>
                {filtered.length > limit && (
                  <Button variant="ghost" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    {Math.min(PAGE_SIZE, filtered.length - limit)} weitere anzeigen
                  </Button>
                )}
              </>
            )}
          </section>
        </>
      )}

      <CardDetailSheet card={selected} lang={lang} onClose={() => setSelectedId(null)} />
      <AddCardSheet open={addOpen} onClose={() => setAddOpen(false)} courseId={courseId} lang={lang} existing={cards} />
    </Page>
  );
}
