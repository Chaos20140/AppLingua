/**
 * Aktionsmenü für angetippte Wörter/Zeilen eines Songs: Bedeutung, Zeilenerklärung, wörtliche und
 * natürliche Übersetzung, Grammatik, Umgangssprache, Aussprache (TTS, Lautschrift, Nachsprechen),
 * Beispiele sowie Vokabelliste, Markierung und Notiz. Quelle (Offline/KI) wird immer gekennzeichnet.
 */
import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlignLeft, ArrowLeftRight, BookmarkPlus, BookOpen, Check, ChevronLeft, ChevronRight, Highlighter,
  Lightbulb, MessageCircleQuestion, MessagesSquare, NotebookPen, RefreshCw, Snail, Sparkles, Volume2, WifiOff,
} from 'lucide-react';
import type { CourseId, Explanation, ExplainAction, Variant } from '../../core/types';
import type { Song, SongLine } from '../../content/types';
import { getRecord, useRecord } from '../../data/store';
import { useAuth } from '../../data/auth';
import { cloudConfigured } from '../../data/supabase';
import { addSrsCard } from '../../state/actions';
import { ttsLangFor, VARIANT_LABELS } from '../../state/settings';
import { useTts } from '../../speech/tts';
import { cardId } from '../../engine/srs';
import { Badge, BottomSheet, Button, ErrorState, RichText, Segmented, Skeleton, TextArea, TextField, useToast } from '../../ui';
import {
  EXPLAIN_ACTIONS, explanationId, isBeginnerLevel, layoutExplanation, SECTION_TITLES, spanOf,
  useLyricExplanation, type SectionKey,
} from './explain';
import { markId, noteId, saveNote, toggleMarkedWord } from './songData';
import { isUserSongId } from './userText';
import EchoPractice from './EchoPractice';
import s from './LyricActionSheet.module.css';

export interface LyricActionSheetProps {
  open: boolean;
  onClose: () => void;
  song: Song;
  lineId: string;
  /** Index in line.tokens; undefined = ganze Zeile */
  tokenIndex?: number;
  courseId: CourseId;
  variant: Variant;
  /** optional: direkt mit dieser Aktion öffnen */
  initialAction?: ExplainAction | 'vocab' | 'note';
}

type View = 'menu' | ExplainAction | 'vocab' | 'note';

const ACTION_ICONS: Record<ExplainAction, ReactNode> = {
  meaning: <MessageCircleQuestion size={20} />,
  'explain-line': <AlignLeft size={20} />,
  literal: <ArrowLeftRight size={20} />,
  natural: <Sparkles size={20} />,
  grammar: <BookOpen size={20} />,
  colloquial: <MessagesSquare size={20} />,
  pronunciation: <Volume2 size={20} />,
  examples: <Lightbulb size={20} />,
};

const GROUPS: { title: string; actions: ExplainAction[] }[] = [
  { title: 'Verstehen', actions: ['meaning', 'explain-line', 'literal', 'natural'] },
  { title: 'Vertiefen', actions: ['grammar', 'colloquial', 'examples'] },
  { title: 'Sprechen', actions: ['pronunciation'] },
];

export default function LyricActionSheet(props: LyricActionSheetProps) {
  const { open, onClose, song, lineId, tokenIndex } = props;
  const line = song.lines.find((l) => l.id === lineId) ?? null;
  const tok = line && tokenIndex !== undefined ? line.tokens[tokenIndex] : undefined;
  const isWord = Boolean(tok && !tok.p);
  const span = line ? spanOf(line, isWord ? tokenIndex : undefined) : '';
  const [view, setView] = useState<View>(props.initialAction ?? 'menu');

  // Beim Öffnen bzw. Wechsel des Ausschnitts zur Startansicht zurück
  useEffect(() => {
    if (open) setView(props.initialAction ?? 'menu');
  }, [open, lineId, tokenIndex, props.initialAction]);

  const title = !line ? 'Nicht gefunden' : isWord ? `„${span}“` : 'Ganze Zeile';
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      description={line ? <LineContext line={line} tokenIndex={isWord ? tokenIndex : undefined} lang={ttsLangFor(song.variant)} /> : undefined}
      className={s.sheet}
    >
      {!line ? (
        <ErrorState title="Zeile nicht gefunden" message="Diese Zeile gibt es in diesem Song nicht (mehr). Vielleicht wurde der Text bearbeitet." />
      ) : (
        <SheetBody {...props} line={line} isWord={isWord} span={span} view={view} setView={setView} />
      )}
    </BottomSheet>
  );
}

function LineContext({ line, tokenIndex, lang }: { line: SongLine; tokenIndex?: number; lang: string }) {
  return (
    <span className={s.context} lang={lang}>
      {line.tokens.map((t, i) => {
        const prev = line.tokens[i - 1];
        const space = i > 0 && !(t.p && !'¿¡«(“'.includes(t.t)) && !(prev?.p && '¿¡«(“'.includes(prev.t));
        return (
          <span key={i}>
            {space ? ' ' : ''}
            <span className={i === tokenIndex ? s.hit : undefined}>{t.t}</span>
          </span>
        );
      })}
      {line.natural && <span className={s.contextDe} lang="de">{line.natural}</span>}
    </span>
  );
}

interface BodyProps extends LyricActionSheetProps {
  line: SongLine;
  isWord: boolean;
  span: string;
  view: View;
  setView: (v: View) => void;
}

function SheetBody(p: BodyProps) {
  const { song, line, isWord, span, view, setView, tokenIndex } = p;
  const lang = ttsLangFor(song.variant);
  const tts = useTts();
  const toast = useToast();
  const marked = useRecord('songMarkedWords', isWord && tokenIndex !== undefined ? markId(song.id, line.id, tokenIndex) : '');
  const note = useRecord('songNotes', noteId(song.id, line.id));
  const speakKey = `sheet:${song.id}:${line.id}:${span}`;

  const speak = (slow: boolean) => {
    void tts.speak(span, { lang, slow, key: `${speakKey}:${slow ? 's' : 'n'}` });
  };

  const speakBar = (
    <div className={s.speakBar}>
      <Button variant="secondary" icon={<Volume2 size={18} />} onClick={() => speak(false)} aria-pressed={tts.speakingKey === `${speakKey}:n`} disabled={!tts.available}>
        Anhören
      </Button>
      <Button variant="secondary" icon={<Snail size={18} />} onClick={() => speak(true)} aria-pressed={tts.speakingKey === `${speakKey}:s`} disabled={!tts.available}>
        Langsam
      </Button>
    </div>
  );
  const ttsHint = !tts.available
    ? 'Sprachausgabe ist in diesem Browser nicht verfügbar.'
    : tts.error ?? tts.missingVoiceHelp(lang);

  if (view === 'menu') {
    return (
      <div className={s.body}>
        {speakBar}
        {(!tts.available || tts.error) && <p className={s.note} role="status">{ttsHint}</p>}
        {GROUPS.map((g) => (
          <section key={g.title} className={s.group} aria-label={g.title}>
            <h3 className={s.groupTitle}>{g.title}</h3>
            <ul className={s.actionList}>
              {g.actions.map((a) => {
                const def = EXPLAIN_ACTIONS.find((x) => x.key === a);
                if (!def) return null;
                return (
                  <li key={a}>
                    <button type="button" className={s.action} onClick={() => setView(a)}>
                      <span className={s.actionIcon} aria-hidden="true">{ACTION_ICONS[a]}</span>
                      <span className={s.actionLabel}>{def.label}</span>
                      <ChevronRight size={18} className={s.chev} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <section className={s.group} aria-label="Merken">
          <h3 className={s.groupTitle}>Merken</h3>
          <ul className={s.actionList}>
            <li>
              <button type="button" className={s.action} onClick={() => setView('vocab')}>
                <span className={s.actionIcon} aria-hidden="true"><BookmarkPlus size={20} /></span>
                <span className={s.actionLabel}>Zur Vokabelliste hinzufügen</span>
                <ChevronRight size={18} className={s.chev} aria-hidden="true" />
              </button>
            </li>
            {isWord && tokenIndex !== undefined && (
              <li>
                <button
                  type="button"
                  className={s.action}
                  aria-pressed={Boolean(marked)}
                  onClick={() => {
                    const on = toggleMarkedWord(song.id, line.id, tokenIndex, span);
                    toast(on ? `„${span}“ markiert – du findest es auf der Song-Seite.` : 'Markierung entfernt.', { tone: on ? 'success' : 'info' });
                  }}
                >
                  <span className={`${s.actionIcon} ${marked ? s.actionIconOn : ''}`} aria-hidden="true">
                    {marked ? <Check size={20} /> : <Highlighter size={20} />}
                  </span>
                  <span className={s.actionLabel}>{marked ? 'Markiert – Markierung entfernen' : 'Wort markieren'}</span>
                </button>
              </li>
            )}
            <li>
              <button type="button" className={s.action} onClick={() => setView('note')}>
                <span className={s.actionIcon} aria-hidden="true"><NotebookPen size={20} /></span>
                <span className={s.actionLabel}>{note ? 'Notiz zur Zeile bearbeiten' : 'Notiz zur Zeile'}</span>
                <ChevronRight size={18} className={s.chev} aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      </div>
    );
  }

  const back = (
    <button type="button" className={s.back} onClick={() => setView('menu')}>
      <ChevronLeft size={18} aria-hidden="true" /> Alle Aktionen
    </button>
  );

  if (view === 'vocab') return <div className={s.body}>{back}<VocabForm {...p} /></div>;
  if (view === 'note') return <div className={s.body}>{back}<NoteForm {...p} existing={note?.text ?? ''} /></div>;

  return (
    <div className={s.body}>
      {back}
      <ExplainView {...p} action={view} speakBar={speakBar} ttsHint={ttsHint} />
    </div>
  );
}

// ───────────────────────── Erklärung ─────────────────────────
function ExplainView(p: BodyProps & { action: ExplainAction; speakBar: ReactNode; ttsHint: string | null }) {
  const { song, line, isWord, tokenIndex, action, courseId, variant } = p;
  const lang = ttsLangFor(song.variant);
  const tts = useTts();
  const st = useLyricExplanation({ song, line, tokenIndex: isWord ? tokenIndex : undefined, action, courseId, variant: song.variant });
  const [prefer, setPrefer] = useState<'ai' | 'offline'>('ai');
  const [showMore, setShowMore] = useState(false);
  const label = EXPLAIN_ACTIONS.find((a) => a.key === action)?.label ?? '';
  const headingId = useId();
  const isUser = isUserSongId(song.id);

  const shown: Explanation | null = prefer === 'offline' && st.offline ? st.offline : st.explanation;
  const both = Boolean(st.offline && st.explanation && st.explanation.source === 'ai');
  const layout = useMemo(() => (shown ? layoutExplanation(shown, action, st.level) : null), [shown, action, st.level]);
  const onSpeak = (t: string) => { void tts.speak(t, { lang }); };

  const aiButton = st.ai.available && !st.loading && (
    shown?.source !== 'ai'
      ? <Button variant="secondary" icon={<Sparkles size={18} />} onClick={() => { setPrefer('ai'); st.requestAi(); }}>
          {shown ? 'Ausführlicher mit KI erklären' : 'Mit KI erklären'}
        </Button>
      : st.levelMismatch
        ? <Button variant="ghost" icon={<RefreshCw size={18} />} onClick={() => st.requestAi(true)}>Für dein Niveau ({st.level}) neu erklären</Button>
        : null
  );

  return (
    <section className={s.explain} aria-labelledby={headingId}>
      <div className={s.explainHead}>
        <h3 id={headingId} className={s.explainTitle}>{label}</h3>
        <div className={s.badges}>
          {shown && (shown.source === 'ai'
            ? <Badge tone="info" icon={<Sparkles size={12} />}>KI-Coach</Badge>
            : <Badge tone="neutral" icon={<WifiOff size={12} />}>Offline-Erklärung</Badge>)}
          <Badge tone="neutral">für {st.level === 'Einsteiger' ? 'Einsteiger' : st.level}</Badge>
        </div>
      </div>

      {both && (
        <Segmented
          size="sm"
          label="Quelle der Erklärung"
          value={prefer}
          onChange={setPrefer}
          options={[{ value: 'ai', label: 'KI-Coach' }, { value: 'offline', label: 'Eingebaut' }]}
        />
      )}

      {action === 'pronunciation' && (
        <>
          {p.speakBar}
          {p.ttsHint && <p className={s.note} role="status">{p.ttsHint}</p>}
          {song.variant !== variant && (
            <p className={s.note}>Dieser Song ist in {VARIANT_LABELS[song.variant]} gesungen – die Aussprache folgt dieser Variante.</p>
          )}
        </>
      )}

      <div aria-live="polite" aria-busy={st.loading}>
        {st.loading && (
          <div className={s.loadingBox}>
            <p className={s.muted}>Der KI-Coach erklärt {isWord ? 'das Wort' : 'die Zeile'} für dein Niveau …</p>
            <Skeleton lines={4} />
          </div>
        )}
        {st.error && !st.loading && (
          <ErrorState
            title="Erklärung nicht verfügbar"
            message={st.error}
            onRetry={st.ai.available ? () => st.requestAi(true) : undefined}
          />
        )}
      </div>

      {!shown && !st.loading && !st.error && (
        <div className={s.fallback}>
          <p className={s.fallbackTitle}>{isUser ? 'Eigene Texte erklärt der KI-Coach' : 'Dafür gibt es keine eingebaute Erklärung'}</p>
          <p className={s.muted}>
            {st.ai.available
              ? 'Tippe auf „Mit KI erklären“ – die Erklärung wird gespeichert und steht dir danach auch offline zur Verfügung.'
              : `${st.ai.reason ?? 'Der KI-Coach ist gerade nicht verfügbar.'} Anhören, Notizen und eigene Vokabeln mit deiner Übersetzung gehen auch ohne KI.`}
          </p>
        </div>
      )}

      {shown && layout && (
        <div className={s.sections}>
          {layout.primary.map((k) => <ExplainSection key={k} k={k} e={shown} lang={lang} onSpeak={onSpeak} />)}
          {layout.more.length > 0 && (
            <>
              <Button variant="ghost" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore}>
                {showMore ? 'Weniger anzeigen' : `Mehr: ${layout.more.map((k) => SECTION_TITLES[k]).slice(0, 3).join(', ')}${layout.more.length > 3 ? ' …' : ''}`}
              </Button>
              {showMore && layout.more.map((k) => <ExplainSection key={k} k={k} e={shown} lang={lang} onSpeak={onSpeak} />)}
            </>
          )}
          {isBeginnerLevel(st.level) && layout.more.length > 0 && !showMore && (
            <p className={s.hintSmall}>Für den Einstieg zeigen wir dir das Wichtigste zuerst.</p>
          )}
        </div>
      )}

      {aiButton && <div className={s.aiRow}>{aiButton}</div>}
      {!st.ai.available && shown?.source === 'offline' && (
        <p className={s.hintSmall}>{st.ai.reason}</p>
      )}

      {action === 'pronunciation' && (
        <EchoPractice
          key={`${line.id}:${p.span}`}
          target={p.span}
          lang={lang}
          courseId={song.courseId}
          itemId={`song:${song.id}:${line.id}${isWord ? `:${tokenIndex}` : ''}`}
        />
      )}
    </section>
  );
}

function ExplainSection({ k, e, lang, onSpeak }: { k: SectionKey; e: Explanation; lang: string; onSpeak: (t: string) => void }) {
  const title = SECTION_TITLES[k];
  let body: ReactNode = null;
  if (k === 'grammar' || k === 'idioms' || k === 'alternatives') {
    const items = (e[k] ?? []) as string[];
    body = (
      <ul className={s.list}>
        {items.map((it, i) => <li key={i}><RichText md={it} inline onSpeak={onSpeak} targetLang={lang} /></li>)}
      </ul>
    );
  } else if (k === 'examples') {
    body = (
      <ul className={s.examples}>
        {(e.examples ?? []).map((ex, i) => (
          <li key={i} className={s.example}>
            <button type="button" className={s.exampleSpeak} onClick={() => onSpeak(ex.target)} aria-label={`„${ex.target}“ anhören`}>
              <Volume2 size={16} aria-hidden="true" />
            </button>
            <span className={s.exampleText}>
              <span lang={lang} className={s.exampleTarget}>{ex.target}</span>
              <span className={s.exampleDe}>{ex.german}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  } else if (k === 'pronunciation') {
    const pr = e.pronunciation;
    if (!pr) return null;
    body = (
      <div className={s.pron}>
        {pr.phonetic
          ? <p className={s.phonetic}><span className={s.pronLabel}>Lautschrift</span>{pr.phonetic}</p>
          : <p className={s.muted}>Für diesen Text gibt es keine eingebaute Lautschrift. Hör dir das Vorbild an – oder lass dir die Lautschrift vom KI-Coach geben.</p>}
        {pr.ipa && <p className={s.ipa}><span className={s.pronLabel}>IPA</span>/{pr.ipa.replace(/^\/|\/$/g, '')}/</p>}
        {pr.tips && pr.tips.length > 0 && (
          <ul className={s.tips}>{pr.tips.map((t) => <li key={t}><RichText md={t} inline /></li>)}</ul>
        )}
      </div>
    );
  } else {
    const v = e[k];
    if (typeof v !== 'string') return null;
    body = <RichText md={v} onSpeak={onSpeak} targetLang={lang} />;
  }
  return (
    <div className={`${s.section} ${k === 'natural' ? s.sectionLead : ''}`}>
      <h4 className={s.sectionTitle}>{title}</h4>
      {body}
    </div>
  );
}

// ───────────────────────── Vokabel ─────────────────────────
function VocabForm({ song, line, isWord, span, tokenIndex }: BodyProps) {
  const toast = useToast();
  const tok = isWord && tokenIndex !== undefined ? line.tokens[tokenIndex] : undefined;
  const gloss = tok?.g ? song.glossary[tok.g] : undefined;
  const itemKey = isWord ? (tok?.g ?? span).toLowerCase() : line.id;
  const itemId = `song:${song.id}:${itemKey}`;
  const id = cardId(song.courseId, itemId);
  const existing = useRecord('vocabCards', id);
  const aiMeaning = getRecord('songExplanations', explanationId(song.id, line.id, span, 'meaning'))?.result.natural
    ?? getRecord('songExplanations', explanationId(song.id, line.id, span, 'natural'))?.result.natural;
  const [front, setFront] = useState(isWord ? span : line.text);
  const [back, setBack] = useState(isWord ? gloss?.meaning ?? aiMeaning ?? '' : line.natural || aiMeaning || '');
  const [error, setError] = useState<string | null>(null);
  const authStatus = useAuth((a) => a.status);
  // Karten werden immer mit dem Konto synchronisiert – auch wenn der eigene Text selbst nur lokal bleibt.
  const syncNote = isUserSongId(song.id) && cloudConfigured && authStatus === 'signed-in';

  if (existing && !existing.suspended) {
    return (
      <div className={s.done} role="status">
        <Check size={22} aria-hidden="true" />
        <div>
          <p className={s.fallbackTitle}>Schon in deiner Vokabelliste</p>
          <p className={s.muted}>„{existing.front}“ – {existing.back}</p>
        </div>
        <Button variant="secondary" to="/vokabeln">Zur Vokabelliste</Button>
      </div>
    );
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const f = front.trim();
    const b = back.trim();
    if (!f) { setError('Bitte gib das Wort oder die Wendung ein.'); return; }
    if (!b) { setError('Bitte ergänze die deutsche Bedeutung – so kannst du die Karte später abfragen.'); return; }
    addSrsCard({
      courseId: song.courseId,
      itemId,
      kind: isWord ? 'vocab' : 'phrase',
      front: f.slice(0, 200),
      back: b.slice(0, 300),
      ...(gloss && gloss.lemma.toLowerCase() !== f.toLowerCase() ? { hint: `Grundform: ${gloss.lemma}` } : {}),
      source: { type: 'song', ref: song.id, label: song.title },
    });
    toast('Zur Vokabelliste hinzugefügt – sie kommt bald in deiner Wiederholung dran.', { tone: 'success' });
  };

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <h3 className={s.explainTitle}>Zur Vokabelliste hinzufügen</h3>
      <TextField label={isWord ? 'Wort' : 'Wendung'} value={front} onChange={(e) => { setFront(e.target.value); setError(null); }} maxLength={200} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      <TextField
        label="Deutsche Bedeutung"
        value={back}
        onChange={(e) => { setBack(e.target.value); setError(null); }}
        maxLength={300}
        hint={!back && isUserSongId(song.id) ? 'Bei eigenen Texten ergänzt du die Bedeutung selbst – oder übernimmst sie aus der KI-Erklärung.' : undefined}
        error={error}
      />
      <Button type="submit" variant="primary" icon={<BookmarkPlus size={18} />} block>Hinzufügen</Button>
      {syncNote && (
        <p className={s.muted}>Vokabelkarten werden wie alle Karten mit deinem Konto synchronisiert – auch wenn dieser eigene Text nur auf diesem Gerät bleibt.</p>
      )}
    </form>
  );
}

// ───────────────────────── Notiz ─────────────────────────
function NoteForm({ song, line, existing }: BodyProps & { existing: string }) {
  const [text, setText] = useState(existing);
  const [saved, setSaved] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    saveNote(song.id, line.id, text);
    setSaved(text.trim() ? 'Notiz gespeichert.' : 'Notiz gelöscht.');
  };
  return (
    <form className={s.form} onSubmit={submit}>
      <h3 className={s.explainTitle}>Notiz zu dieser Zeile</h3>
      <TextArea
        label="Deine Notiz"
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(null); }}
        maxLength={2000}
        showCount
        placeholder="z. B. Eselsbrücke, eigene Übersetzung, was dir auffällt …"
        rows={4}
      />
      <p className={s.saved} role="status" aria-live="polite">{saved}</p>
      <div className={s.formRow}>
        {existing && (
          <Button type="button" variant="ghost" onClick={() => { saveNote(song.id, line.id, ''); setText(''); setSaved('Notiz gelöscht.'); }}>
            Löschen
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={text.trim() === existing.trim()}>Speichern</Button>
      </div>
    </form>
  );
}
