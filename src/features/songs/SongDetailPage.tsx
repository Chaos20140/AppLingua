/**
 * /songs/:songId – Song-Detailseite: Cover, Metadaten, Fortschritt (Mastery), acht Lernmodi,
 * Übungen/Boss, Textvorschau mit antippbaren Wörtern, Notizen, Markierungen, Vokabeln und –
 * bei eigenen Texten – Bearbeiten, Löschen, Medienlinks und Speicherort.
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpenCheck, Check, CloudOff, Cloud, Dumbbell, ExternalLink, Headphones, Info, ListPlus, Mic, Pencil,
  Play, Swords, Trash2, Music2,
} from 'lucide-react';
import type { LanguageLevel } from '../../core/types';
import type { Song, SongLine } from '../../content/types';
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, IconButton, Page, ProgressBar, Skeleton, TextArea, Toggle, useToast,
} from '../../ui';
import { useList, useRecord } from '../../data/store';
import { useAuth } from '../../data/auth';
import { cloudConfigured } from '../../data/supabase';
import { setUserTextsSync } from '../../data/sync';
import { updateSettings, useActiveCourse, useSettings, variantOf, VARIANT_LABELS } from '../../state/settings';
import { useLanguageLevel } from '../../state/progress';
import { useSongMastery, useSongProgress } from '../../state/songs';
import { SONG_BOSS_PASS_PCT, SONG_MASTERY_WEIGHTS } from '../../engine/songs';
import { useSongById } from './catalog';
import { SONG_MODES } from './modes';
import LyricActionSheet from './LyricActionSheet';
import { AddToPlaylistSheet } from './PlaylistDialogs';
import { FavoriteButton, MasteryRing, SongCover } from './SongCard';
import {
  deleteUserText, markId, noteId, saveNote, SPEED_LABEL, useFavoriteIds, useMarkedWords, useSongNotes, VARIANT_FLAG,
} from './songData';
import { mediaPageUrl, userTextIdOf, userTextLevel } from './userText';
import sh from './shared.module.css';
import s from './SongDetail.module.css';

const RANK: Record<string, number> = { Einsteiger: 0, A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6, 'Native Mastery': 7 };
const PREVIEW_LINES = 8;

export default function SongDetailPage() {
  const { songId = '' } = useParams();
  const { song, loading, error, isUser, retry } = useSongById(songId);

  if (loading) {
    return (
      <Page title="Song" back="/songs">
        <div className={s.skelHero} aria-busy="true" aria-label="Song wird geladen">
          <Skeleton width={148} height={148} radius="var(--r-xl)" />
          <div className={s.skelText}><Skeleton width="70%" height={22} /><Skeleton width="45%" /><Skeleton width="60%" height={44} radius="var(--r-full)" /></div>
        </div>
        <Skeleton lines={4} />
      </Page>
    );
  }
  if (error) {
    return <Page title="Song" back="/songs"><ErrorState title="Song konnte nicht geladen werden" message={error} onRetry={retry} /></Page>;
  }
  if (!song) {
    return (
      <Page title="Song nicht gefunden" back="/songs">
        <EmptyState
          icon={<Music2 size={28} />}
          title="Diesen Song gibt es hier nicht"
          description={isUser ? 'Der eigene Text wurde gelöscht oder liegt nur auf einem anderen Gerät.' : 'Vielleicht wurde der Link falsch kopiert.'}
          action={<Button variant="primary" to="/songs">Zu den Songs</Button>}
        />
      </Page>
    );
  }
  return <SongDetail key={song.id} song={song} isUser={isUser} />;
}

function SongDetail({ song, isUser }: { song: Song; isUser: boolean }) {
  const favIds = useFavoriteIds();
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [target, setTarget] = useState<{ lineId: string; tokenIndex?: number; open: boolean } | null>(null);
  const setSheet = (t: { lineId: string; tokenIndex?: number }) => setTarget({ ...t, open: true });
  const settings = useSettings();
  const userVariant = variantOf(settings, song.courseId);
  const base = `/songs/${encodeURIComponent(song.id)}`;
  const heroStyle = { '--from': song.cover.from, '--to': song.cover.to } as CSSProperties;

  return (
    <Page
      title={song.title}
      subtitle={song.artist || (isUser ? 'Eigener Text' : undefined)}
      back="/songs"
      gap="lg"
      actions={<>
        <FavoriteButton songId={song.id} active={favIds.has(song.id)} title={song.title} />
        <IconButton label="Zu Playlist hinzufügen" icon={<ListPlus size={22} />} onClick={() => setPlaylistOpen(true)} />
      </>}
    >
      <Hero song={song} base={base} style={heroStyle} />
      <MetaSection song={song} isUser={isUser} />
      <MasterySection song={song} />

      <section className={sh.section} aria-labelledby="modes-h">
        <div className={sh.sectionHead}>
          <div>
            <h2 id="modes-h" className={sh.h2}>Lernmodi</h2>
            <p className={sh.sub}>Vom entspannten Hören bis zur Übersetzungs-Challenge.{song.untimed ? ' Die Zeilenzeiten sind geschätzt.' : ''}</p>
          </div>
        </div>
        <ModeGrid song={song} base={base} />
      </section>

      <PracticeSection song={song} base={base} />

      <LyricsPreview song={song} onOpen={(lineId, tokenIndex) => setSheet({ lineId, tokenIndex })} />
      <MarkedWords song={song} onOpen={(lineId, tokenIndex) => setSheet({ lineId, tokenIndex })} />
      <SongVocab song={song} />
      <Notes song={song} onOpenLine={(lineId) => setSheet({ lineId })} />

      {isUser && <UserTextSection song={song} />}

      <div className={sh.infoCard}>
        <span className={sh.infoIcon} aria-hidden="true"><Info size={18} /></span>
        <div className={sh.infoText}>
          <strong>{song.license.kind === 'user-private' ? 'Privater Text' : song.license.kind === 'public-domain' ? 'Gemeinfrei' : 'Originales Lernlied'}</strong>
          <p>{song.license.note}</p>
          {song.license.kind !== 'user-private' && <p>Begleitmusik entsteht im Browser, gesungen wird per Sprachausgabe.</p>}
        </div>
      </div>

      <AddToPlaylistSheet open={playlistOpen} onClose={() => setPlaylistOpen(false)} songId={song.id} songTitle={song.title} />
      {target && (
        <LyricActionSheet
          open={target.open}
          onClose={() => setTarget((t) => (t ? { ...t, open: false } : t))}
          song={song}
          lineId={target.lineId}
          tokenIndex={target.tokenIndex}
          courseId={song.courseId}
          variant={userVariant}
        />
      )}
    </Page>
  );
}

// ───────────────────────── Hero ─────────────────────────
function Hero({ song, base, style }: { song: Song; base: string; style: CSSProperties }) {
  const mastery = useSongMastery(song);
  const progress = useSongProgress(song.id);
  const started = Boolean(progress && progress.playCount > 0);
  return (
    <section className={s.hero} style={style} aria-label="Überblick">
      <div className={s.heroGlow} aria-hidden="true" />
      <SongCover song={song} size="lg" className={s.heroCover} />
      <div className={s.heroInfo}>
        <div className={s.heroBadges}>
          <Badge tone="neutral"><span aria-hidden="true">{VARIANT_FLAG[song.variant]}</span> {VARIANT_LABELS[song.variant]}</Badge>
          <Badge tone="neutral">{song.genre}</Badge>
          {song.explicit && <Badge tone="warning">Explizit</Badge>}
        </div>
        <div className={s.heroStats}>
          <MasteryRing value={mastery.total} size={64} />
          <div>
            <span className={s.heroBig}>{mastery.learnedLines}/{mastery.totalLines}</span>
            <span className={s.heroSmall}>Zeilen gelernt</span>
          </div>
        </div>
        <div className={s.heroCtas}>
          <Button variant="primary" size="lg" icon={<Play size={18} />} to={`${base}/spielen?modus=hoeren`}>
            {started ? 'Weiterhören' : 'Jetzt anhören'}
          </Button>
          <Button variant="secondary" size="lg" icon={<Dumbbell size={18} />} to={`${base}/uebungen`}>Übungen</Button>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────── Metadaten ─────────────────────────
function levelFit(songLevel: string, user: LanguageLevel): { text: string; tone: 'success' | 'info' | 'warning' } {
  const d = (RANK[songLevel] ?? 1) - (RANK[user] ?? 0);
  if (d <= -1) return { text: 'Entspannt für dich – ideal zum Festigen.', tone: 'success' };
  if (d === 0) return { text: 'Passt genau zu deinem Niveau.', tone: 'success' };
  if (d === 1) return { text: 'Kleine Herausforderung – genau richtig zum Wachsen.', tone: 'info' };
  return { text: 'Noch anspruchsvoll – starte mit „Zeile für Zeile“ und nutze die Erklärungen.', tone: 'warning' };
}

function MetaSection({ song, isUser }: { song: Song; isUser: boolean }) {
  const activeCourse = useActiveCourse();
  const settings = useSettings();
  const { level } = useLanguageLevel(song.courseId);
  const fit = levelFit(song.level, level);
  const userVariant = variantOf(settings, song.courseId);
  const text = useRecord('songUserTexts', userTextIdOf(song.id) ?? '');
  const estimated = isUser && text && !userTextLevel(text);
  return (
    <section className={sh.section} aria-labelledby="meta-h">
      <h2 id="meta-h" className={sh.h2}>Passt der Song zu dir?</h2>
      <dl className={s.metaGrid}>
        <div className={s.metaTile}>
          <dt>Empfohlen ab</dt>
          <dd><strong>{song.level}</strong>{estimated ? ' (geschätzt)' : ''}</dd>
          <dd className={s.metaSub}>Dein Niveau: {level}</dd>
        </div>
        <div className={s.metaTile}>
          <dt>Sprechtempo</dt>
          <dd><strong>{isUser && song.untimed ? 'Unbekannt' : SPEED_LABEL[song.speed]}</strong></dd>
          {song.wordsPerMinute > 0 && !(isUser && song.untimed) && <dd className={s.metaSub}>≈ {song.wordsPerMinute} Wörter/Min.</dd>}
        </div>
        <div className={s.metaTile}>
          <dt>Umgangssprache</dt>
          <dd><strong>{isUser ? 'Unbekannt' : `${song.colloquialPct} %`}</strong></dd>
          <dd className={s.metaSub}>{isUser ? 'Frag den KI-Coach je Zeile' : 'der Zeilen'}</dd>
        </div>
        <div className={s.metaTile}>
          <dt>Explizite Sprache</dt>
          <dd><strong>{isUser ? 'Nicht geprüft' : song.explicit ? 'Ja' : 'Nein'}</strong></dd>
        </div>
      </dl>
      <p className={`${s.fit} ${s[`fit_${fit.tone}`]}`}>{fit.text}</p>
      {song.courseId !== activeCourse ? (
        <p className={sh.muted}>Dieser Song gehört zu deinem {song.courseId === 'es' ? 'Spanisch' : 'Portugiesisch'}-Kurs – Fortschritt und XP zählen dort.</p>
      ) : song.variant !== userVariant ? (
        <p className={sh.muted}>Du lernst {VARIANT_LABELS[userVariant]}. Dieser Song ist in {VARIANT_LABELS[song.variant]} – super fürs Hörverständnis; Aussprachetipps folgen der Song-Variante.</p>
      ) : null}
    </section>
  );
}

// ───────────────────────── Mastery ─────────────────────────
function MasterySection({ song }: { song: Song }) {
  const m = useSongMastery(song);
  const w = SONG_MASTERY_WEIGHTS;
  const rows: { label: string; value: number; weight: number; detail: string }[] = [
    { label: 'Gelernte Zeilen', value: m.lines, weight: w.lines, detail: `${m.learnedLines} von ${m.totalLines}` },
    { label: 'Übungen', value: m.exercises, weight: w.exercises, detail: `${m.exercises} % Genauigkeit` },
    { label: 'Aussprache', value: m.pronunciation, weight: w.pronunciation, detail: `Ø ${m.pronunciation} % je Zeile` },
    { label: 'Boss-Challenge', value: m.boss, weight: w.boss, detail: m.boss ? 'bestanden' : 'noch offen' },
  ];
  return (
    <section className={sh.section} aria-labelledby="mastery-h">
      <div className={sh.sectionHead}>
        <div>
          <h2 id="mastery-h" className={sh.h2}>Song-Mastery: {m.total} %</h2>
          <p className={sh.sub}>{m.total >= 100 ? 'Gemeistert – Chapeau!' : m.total > 0 ? 'Jede gelernte Zeile bringt dich näher.' : 'Starte mit einem Modus – jede Zeile zählt.'}</p>
        </div>
      </div>
      <Card padding="md">
        <ul className={s.masteryList}>
          {rows.map((r) => (
            <li key={r.label}>
              <div className={s.masteryTop}>
                <span>{r.label} <span className={s.weight}>· {Math.round(r.weight * 100)} %</span></span>
                <span className={s.masteryDetail}>{r.detail}</span>
              </div>
              <ProgressBar value={r.value / 100} label={r.label} valueText={`${r.value} %`} size="sm" tone={r.value >= 100 ? 'success' : 'accent'} />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}

// ───────────────────────── Modi & Üben ─────────────────────────
function ModeGrid({ song, base }: { song: Song; base: string }) {
  const progress = useSongProgress(song.id);
  const used = new Set(progress?.modesUsed ?? []);
  return (
    <ul className={s.modeGrid}>
      {SONG_MODES.map((m) => (
        <li key={m.key}>
          <Card to={`${base}/spielen?modus=${m.key}`} className={s.mode} padding="md" aria-label={`Modus ${m.nr}: ${m.title}`}>
            <span className={s.modeTop}>
              <span className={s.modeNr} aria-hidden="true">{m.nr}</span>
              {used.has(m.key) && <span className={s.modeUsed}><Check size={14} aria-hidden="true" /> genutzt</span>}
            </span>
            <span className={s.modeTitle}>{m.title}</span>
            <span className={s.modeDesc}>{m.description}</span>
            {m.usesMic && <span className={s.modeMic}><Mic size={13} aria-hidden="true" /> Mikrofon optional</span>}
          </Card>
        </li>
      ))}
    </ul>
  );
}

function PracticeSection({ song, base }: { song: Song; base: string }) {
  const p = useSongProgress(song.id);
  return (
    <section className={sh.section} aria-labelledby="practice-h">
      <h2 id="practice-h" className={sh.h2}>Üben & beweisen</h2>
      <div className={s.practiceGrid}>
        <Card to={`${base}/uebungen`} className={s.practice} padding="md">
          <span className={s.practiceIcon} aria-hidden="true"><BookOpenCheck size={22} /></span>
          <span className={s.practiceTitle}>Übungen</span>
          <span className={s.practiceDesc}>
            {p && p.exercisesDone > 0 ? `${p.exercisesDone} erledigt · ${Math.round(p.exerciseAccuracy)} % richtig` : 'Lücken, Wortschatz, Verbformen und Hörverstehen zum Song.'}
          </span>
        </Card>
        <Card to={`${base}/uebungen?boss=1`} className={`${s.practice} ${s.boss}`} padding="md">
          <span className={s.practiceIcon} aria-hidden="true"><Swords size={22} /></span>
          <span className={s.practiceTitle}>Boss-Challenge</span>
          <span className={s.practiceDesc}>
            {p?.bossPassedAt ? 'Bestanden – du kannst sie jederzeit wiederholen.' : `Alles zum Song in einer Runde – ab ${SONG_BOSS_PASS_PCT} % bestanden.`}
          </span>
          {p?.bossPassedAt && <Badge tone="gold" solid>Bestanden</Badge>}
        </Card>
      </div>
    </section>
  );
}

// ───────────────────────── Textvorschau ─────────────────────────
function LyricsPreview({ song, onOpen }: { song: Song; onOpen: (lineId: string, tokenIndex?: number) => void }) {
  const [all, setAll] = useState(false);
  const settings = useSettings();
  const showTr = settings.songs.showTranslation;
  const progress = useSongProgress(song.id);
  const marks = useMarkedWords(song.id);
  const learned = new Set(progress?.learnedLineIds ?? []);
  const marked = new Set(marks.map((m) => markId(song.id, m.lineId, m.tokenIndex)));
  const hasTr = song.lines.some((l) => l.natural);
  const lines = all ? song.lines : song.lines.slice(0, PREVIEW_LINES);
  const sectionLabel = new Map(song.sections.map((x) => [x.id, x.label]));
  const lang = song.variant === 'pt-BR' ? 'pt-BR' : song.variant === 'es-ES' ? 'es-ES' : 'es-419';

  if (!song.lines.length) {
    return (
      <section className={sh.section} aria-labelledby="lyrics-h">
        <h2 id="lyrics-h" className={sh.h2}>Songtext</h2>
        <EmptyState compact title="Kein Text vorhanden" description="Bearbeite den Text, um Zeilen hinzuzufügen." />
      </section>
    );
  }

  return (
    <section className={sh.section} aria-labelledby="lyrics-h">
      <div className={sh.sectionHead}>
        <div>
          <h2 id="lyrics-h" className={sh.h2}>Songtext</h2>
          <p className={sh.sub}>Tippe auf ein Wort – oder auf die Zeilennummer für die ganze Zeile.</p>
        </div>
      </div>
      {hasTr && (
        <Toggle checked={showTr} onChange={(v) => updateSettings({ songs: { showTranslation: v } })} label="Übersetzung zeigen" />
      )}
      <Card padding="none" className={s.lyrics}>
        <ol className={s.lyricList} lang={lang}>
          {lines.map((l, i) => (
            <LyricRow
              key={l.id}
              song={song}
              line={l}
              index={song.lines.indexOf(l)}
              section={i === 0 || lines[i - 1].sectionId !== l.sectionId ? sectionLabel.get(l.sectionId) : undefined}
              learned={learned.has(l.id)}
              marked={marked}
              showTr={showTr}
              onOpen={onOpen}
            />
          ))}
        </ol>
        {song.lines.length > PREVIEW_LINES && (
          <div className={s.lyricMore}>
            <Button variant="ghost" onClick={() => setAll((v) => !v)} aria-expanded={all}>
              {all ? 'Weniger anzeigen' : `Ganzen Text anzeigen (${song.lines.length} Zeilen)`}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}

function LyricRow({ song, line, index, section, learned, marked, showTr, onOpen }: {
  song: Song; line: SongLine; index: number; section?: string; learned: boolean; marked: Set<string>; showTr: boolean;
  onOpen: (lineId: string, tokenIndex?: number) => void;
}) {
  const OPEN = '¿¡«(“';
  return (
    <li className={s.lyricRow}>
      {section && <span className={s.lyricSection} lang="de">{section}</span>}
      <div className={s.lyricLine}>
        <button type="button" className={`${s.lineNr} ${learned ? s.lineNrDone : ''}`} onClick={() => onOpen(line.id)} aria-label={`Zeile ${index + 1} erklären${learned ? ' (gelernt)' : ''}`}>
          {learned ? <Check size={14} aria-hidden="true" /> : index + 1}
        </button>
        <p className={s.lyricText}>
          {line.tokens.map((t, ti) => {
            const prev = line.tokens[ti - 1];
            const space = ti > 0 && !(t.p && !OPEN.includes(t.t)) && !(prev?.p && OPEN.includes(prev.t));
            if (t.p) return <span key={ti}>{space ? ' ' : ''}{t.t}</span>;
            const isMarked = marked.has(markId(song.id, line.id, ti));
            return (
              <span key={ti}>
                {space ? ' ' : ''}
                <button type="button" className={`${s.word} ${isMarked ? s.wordMarked : ''}`} onClick={() => onOpen(line.id, ti)}>
                  {t.t}
                </button>
              </span>
            );
          })}
        </p>
      </div>
      {showTr && line.natural && <p className={s.lyricTr} lang="de">{line.natural}</p>}
    </li>
  );
}

// ───────────────────────── Markierungen, Vokabeln, Notizen ─────────────────────────
function MarkedWords({ song, onOpen }: { song: Song; onOpen: (lineId: string, tokenIndex: number) => void }) {
  const marks = useMarkedWords(song.id);
  const valid = marks.filter((m) => song.lines.some((l) => l.id === m.lineId));
  if (!valid.length) return null;
  return (
    <section className={sh.section} aria-labelledby="marks-h">
      <h2 id="marks-h" className={sh.h2}>Markierte Wörter</h2>
      <ul className={s.markList}>
        {valid.map((m) => (
          <li key={m.id}>
            <button type="button" className={s.mark} onClick={() => onOpen(m.lineId, m.tokenIndex)}>{m.text}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SongVocab({ song }: { song: Song }) {
  const cards = useList('vocabCards');
  const list = useMemo(
    () => cards.filter((c) => c.data.source.type === 'song' && c.data.source.ref === song.id && !c.data.suspended).map((c) => c.data),
    [cards, song.id],
  );
  return (
    <section className={sh.section} aria-labelledby="vocab-h">
      <div className={sh.sectionHead}>
        <div>
          <h2 id="vocab-h" className={sh.h2}>Vokabeln aus diesem Song</h2>
          <p className={sh.sub}>{list.length ? `${list.length} in deiner Wiederholung` : 'Tippe im Text auf ein Wort und wähle „Zur Vokabelliste hinzufügen“.'}</p>
        </div>
        {list.length > 0 && <Button variant="ghost" to="/wiederholung">Wiederholen</Button>}
      </div>
      {list.length > 0 && (
        <Card padding="none">
          <ul className={s.vocabList}>
            {list.slice(0, 12).map((c) => (
              <li key={c.itemId} className={s.vocabRow}>
                <span className={s.vocabFront}>{c.front}</span>
                <span className={s.vocabBack}>{c.back}</span>
              </li>
            ))}
          </ul>
          {list.length > 12 && <div className={s.lyricMore}><Button variant="ghost" to="/vokabeln">Alle {list.length} Vokabeln</Button></div>}
        </Card>
      )}
    </section>
  );
}

function Notes({ song, onOpenLine }: { song: Song; onOpenLine: (lineId: string) => void }) {
  const notes = useSongNotes(song.id);
  const songNote = notes.find((n) => n.id === noteId(song.id));
  const lineNotes = notes.filter((n) => n.lineId && song.lines.some((l) => l.id === n.lineId));
  const [text, setText] = useState(songNote?.text ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const dirty = text.trim() !== (songNote?.text ?? '').trim();
  return (
    <section className={sh.section} aria-labelledby="notes-h">
      <h2 id="notes-h" className={sh.h2}>Notizen</h2>
      <form
        className={sh.formStack}
        onSubmit={(e) => { e.preventDefault(); saveNote(song.id, undefined, text); setStatus(text.trim() ? 'Notiz gespeichert.' : 'Notiz gelöscht.'); }}
      >
        <TextArea
          label="Notiz zum Song"
          value={text}
          onChange={(e) => { setText(e.target.value); setStatus(null); }}
          maxLength={2000}
          rows={3}
          placeholder="Was gefällt dir? Was willst du dir merken?"
        />
        <div className={s.noteRow}>
          <span className={s.saved} role="status" aria-live="polite">{status}</span>
          <Button type="submit" variant="secondary" disabled={!dirty}>Speichern</Button>
        </div>
      </form>
      {lineNotes.length > 0 && (
        <ul className={sh.stack}>
          {lineNotes.map((n) => {
            const l = song.lines.find((x) => x.id === n.lineId) as SongLine;
            return (
              <li key={n.id}>
                <button type="button" className={s.lineNote} onClick={() => onOpenLine(l.id)}>
                  <span className={s.lineNoteLine}>„{l.text}“</span>
                  <span className={s.lineNoteText}>{n.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ───────────────────────── Eigener Text ─────────────────────────
function UserTextSection({ song }: { song: Song }) {
  const navigate = useNavigate();
  const toast = useToast();
  const textId = userTextIdOf(song.id) as string;
  const settings = useSettings();
  const auth = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const synced = settings.songs.syncUserTexts;
  const canSync = cloudConfigured && auth.status === 'signed-in';
  const media = song.media ?? {};
  const links = ([
    ['youtube', 'YouTube', media.youtubeId],
    ['spotify', 'Spotify', media.spotifyUri],
    ['appleMusic', 'Apple Music', media.appleMusicUrl],
  ] as const).filter(([, , v]) => Boolean(v));

  const toggleSync = async (v: boolean) => {
    setSyncBusy(true);
    try {
      await setUserTextsSync(v);
      toast(v ? 'Eigene Texte werden jetzt mit deinem Konto synchronisiert.' : 'Eigene Texte bleiben nur auf diesem Gerät – Kopien im Konto werden entfernt.', { tone: 'success' });
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : 'Die Einstellung konnte nicht gespeichert werden.', { tone: 'error' });
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <section className={sh.section} aria-labelledby="own-h">
      <h2 id="own-h" className={sh.h2}>Dein Text</h2>
      <Card padding="md" className={s.ownCard}>
        <div className={sh.rowActions}>
          <Button variant="secondary" icon={<Pencil size={18} />} to={`/songs/eigener-text/${encodeURIComponent(textId)}`}>Bearbeiten</Button>
          <Button variant="secondary" icon={<Trash2 size={18} />} onClick={() => setConfirm(true)}>Löschen</Button>
        </div>

        <div className={s.ownBlock}>
          <h3 className={s.h3}>Medienlinks</h3>
          {links.length ? (
            <ul className={s.linkList}>
              {links.map(([kind, label, value]) => {
                const url = mediaPageUrl(kind, value as string);
                return (
                  <li key={kind}>
                    <Headphones size={16} aria-hidden="true" />
                    <span>{label}</span>
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className={s.extLink}>
                        Bei {label} öffnen <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={sh.muted}>Keine verknüpft. Im Bearbeiten-Formular kannst du Links zu YouTube, Spotify oder Apple Music ergänzen.</p>
          )}
          <p className={s.fine}>Im Player wird nur die offizielle Einbettung geladen – erst nach deiner Zustimmung.</p>
        </div>

        <div className={s.ownBlock}>
          <h3 className={s.h3}>Speicherort</h3>
          <p className={s.storage}>
            {synced ? <Cloud size={18} aria-hidden="true" /> : <CloudOff size={18} aria-hidden="true" />}
            {synced ? 'In deinem Konto synchronisiert' : 'Nur auf diesem Gerät'}
          </p>
          {canSync ? (
            <Toggle
              checked={synced}
              disabled={syncBusy}
              onChange={(v) => { void toggleSync(v); }}
              label="Eigene Texte im Konto synchronisieren"
              description="Gilt für alle eigenen Texte. Ausschalten entfernt die Kopien aus deinem Konto."
            />
          ) : (
            <p className={sh.muted}>
              {cloudConfigured ? 'Melde dich an, wenn du deine Texte auf mehreren Geräten nutzen möchtest.' : 'Konten sind in dieser Version nicht eingerichtet – dein Text bleibt sicher auf diesem Gerät.'}
            </p>
          )}
        </div>
      </Card>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          deleteUserText(song.id);
          setConfirm(false);
          toast('Text gelöscht – samt Notizen und Markierungen.', { tone: 'info' });
          navigate('/songs', { replace: true });
        }}
        title="Text löschen?"
        message={`„${song.title}“ wird mit allen Notizen, Markierungen und Erklärungen gelöscht. Vokabeln in deiner Wiederholung bleiben erhalten.`}
        confirmLabel="Endgültig löschen"
        tone="danger"
      />
    </section>
  );
}
