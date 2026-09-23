/**
 * /songs/eigener-text[/:textId] – eigenen Songtext privat anlegen oder bearbeiten.
 * Pflicht: Bestätigung der rein privaten Nutzung. Medienlinks werden nur als IDs gespeichert.
 * Speicherung lokal (localOnly), außer „Eigene Texte synchronisieren“ ist aktiv.
 */
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CloudOff, Cloud, FileText, Lock, Save, Trash2 } from 'lucide-react';
import type { Variant } from '../../core/types';
import type { SongGenre } from '../../content/types';
import { Button, ConfirmDialog, EmptyState, Page, Select, Skeleton, TextArea, TextField, useToast } from '../../ui';
import { nowIso, putRecord, uid, useDataReady, useRecord } from '../../data/store';
import { useActiveCourse, useSettings, variantOf, VARIANT_LABELS } from '../../state/settings';
import { deleteUserText } from './songData';
import {
  parseAppleMusicUrl, parseLyrics, parseSpotifyUri, parseYouTubeId, SONG_GENRES, SONG_LEVELS, USER_TEXT_LIMITS, userSongId,
  userTextLevel, type MediaParse, type SongLevel, type UserSongTextData,
} from './userText';
import sh from './shared.module.css';
import s from './UserText.module.css';

export default function UserTextPage() {
  const { textId } = useParams();
  const ready = useDataReady();
  const existing = useRecord('songUserTexts', textId ?? '');

  if (textId && !ready) {
    return (
      <Page title="Text bearbeiten" back>
        <div className={sh.formStack} aria-busy="true"><Skeleton height={52} /><Skeleton height={52} /><Skeleton height={220} /></div>
      </Page>
    );
  }
  if (textId && !existing) {
    return (
      <Page title="Text nicht gefunden" back="/songs">
        <EmptyState
          icon={<FileText size={28} />}
          title="Diesen Text gibt es hier nicht"
          description="Er wurde gelöscht oder liegt nur auf einem anderen Gerät."
          action={<Button variant="primary" to="/songs/eigener-text">Neuen Text anlegen</Button>}
        />
      </Page>
    );
  }
  return <UserTextForm key={textId ?? 'new'} textId={textId} existing={existing as UserSongTextData | undefined} />;
}

type Field = 'title' | 'artist' | 'lyrics' | 'confirm' | 'yt' | 'sp' | 'am';

function mediaInitial(v?: string) { return v ?? ''; }

function UserTextForm({ textId, existing }: { textId?: string; existing?: UserSongTextData }) {
  const navigate = useNavigate();
  const toast = useToast();
  const settings = useSettings();
  const activeCourse = useActiveCourse();
  const synced = settings.songs.syncUserTexts;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [artist, setArtist] = useState(existing?.artist ?? '');
  const [variant, setVariant] = useState<Variant>(existing?.variant ?? variantOf(settings, activeCourse));
  const [genre, setGenre] = useState<SongGenre>((SONG_GENRES as string[]).includes(existing?.genre ?? '') ? (existing?.genre as SongGenre) : 'Pop');
  const [level, setLevel] = useState<'' | SongLevel>(existing ? userTextLevel(existing) ?? '' : '');
  const [lyrics, setLyrics] = useState(existing?.lyrics ?? '');
  const [confirmed, setConfirmed] = useState(Boolean(existing?.privateUseConfirmed));
  const [yt, setYt] = useState(mediaInitial(existing?.media?.youtubeId));
  const [sp, setSp] = useState(mediaInitial(existing?.media?.spotifyUri));
  const [am, setAm] = useState(mediaInitial(existing?.media?.appleMusicUrl));
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const refs = {
    title: useRef<HTMLInputElement>(null),
    lyrics: useRef<HTMLTextAreaElement>(null),
    confirm: useRef<HTMLInputElement>(null),
    yt: useRef<HTMLInputElement>(null),
    sp: useRef<HTMLInputElement>(null),
    am: useRef<HTMLInputElement>(null),
  };

  const parsed = useMemo(() => parseLyrics(lyrics), [lyrics]);
  const tooMany = lyrics.split('\n').filter((l) => l.trim()).length > USER_TEXT_LIMITS.lines;

  const clearErr = (f: Field) => { if (errors[f]) setErrors((e) => ({ ...e, [f]: undefined })); setSummary(null); };
  const mediaErr = (r: MediaParse) => (r && !r.ok ? r.error : undefined);
  const mediaOk = (r: MediaParse, label: string) => (r?.ok ? `Erkannt: ${label} ${r.value.replace(/^spotify:/, '').replace(/^https:\/\/music\.apple\.com\//, '')}` : undefined);
  const ytR = parseYouTubeId(yt);
  const spR = parseSpotifyUri(sp);
  const amR = parseAppleMusicUrl(am);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    if (!title.trim()) next.title = 'Bitte gib einen Titel ein.';
    if (!parsed.lines.length) next.lyrics = 'Bitte füge den Songtext ein – mindestens eine Zeile.';
    if (!confirmed) next.confirm = 'Bitte bestätige, dass du den Text nur privat nutzt.';
    const ye = mediaErr(ytR); if (ye) next.yt = ye;
    const se = mediaErr(spR); if (se) next.sp = se;
    const ae = mediaErr(amR); if (ae) next.am = ae;
    setErrors(next);
    const order: Field[] = ['title', 'lyrics', 'confirm', 'yt', 'sp', 'am'];
    const firstBad = order.find((f) => next[f]);
    if (firstBad) {
      const n = Object.keys(next).length;
      setSummary(n === 1 ? 'Ein Feld braucht noch deine Aufmerksamkeit.' : `${n} Felder brauchen noch deine Aufmerksamkeit.`);
      refs[firstBad as keyof typeof refs]?.current?.focus();
      return;
    }

    setSaving(true);
    const id = textId ?? uid();
    const oldCount = existing ? parseLyrics(existing.lyrics).lines.length : 0;
    const keepTimings = Boolean(existing?.timings?.length) && oldCount === parsed.lines.length;
    const media: NonNullable<UserSongTextData['media']> = {};
    if (ytR?.ok) media.youtubeId = ytR.value;
    if (spR?.ok) media.spotifyUri = spR.value;
    if (amR?.ok) media.appleMusicUrl = amR.value;
    const data: UserSongTextData = {
      title: title.trim().slice(0, USER_TEXT_LIMITS.title),
      artist: artist.trim().slice(0, USER_TEXT_LIMITS.artist),
      courseId: variant === 'pt-BR' ? 'pt-BR' : 'es',
      variant,
      genre,
      lyrics: lyrics.slice(0, USER_TEXT_LIMITS.lyrics),
      createdAt: existing?.createdAt ?? nowIso(),
      privateUseConfirmed: true,
      ...(keepTimings && existing?.timings ? { timings: existing.timings } : {}),
      ...(Object.keys(media).length ? { media } : {}),
      ...(level ? { level } : {}),
    };
    try {
      putRecord('songUserTexts', id, data, { localOnly: !synced });
    } catch {
      setSaving(false);
      setSummary('Speichern hat nicht geklappt. Bitte versuche es noch einmal.');
      return;
    }
    const droppedTimings = Boolean(existing?.timings?.length) && !keepTimings;
    toast(
      textId
        ? `Änderungen gespeichert.${droppedTimings ? ' Die Zeilenzeiten wurden zurückgesetzt, weil sich die Zeilen geändert haben.' : ''}`
        : 'Text gespeichert – viel Spaß beim Entschlüsseln!',
      { tone: 'success' },
    );
    navigate(`/songs/${encodeURIComponent(userSongId(id))}`, { replace: true });
  };

  return (
    <Page title={textId ? 'Text bearbeiten' : 'Eigener Songtext'} back={textId ? `/songs/${encodeURIComponent(userSongId(textId))}` : '/songs'}>
      <div className={s.privacy}>
        <Lock size={18} aria-hidden="true" />
        <p>
          <strong>Privat.</strong> Dein Text dient nur deiner persönlichen Analyse und wird nie veröffentlicht.{' '}
          {synced ? 'Er wird mit deinem Konto synchronisiert (lässt sich in den Einstellungen ändern).' : 'Er bleibt nur auf diesem Gerät.'}
        </p>
        {synced ? <Cloud size={18} aria-hidden="true" className={s.privacyIcon} /> : <CloudOff size={18} aria-hidden="true" className={s.privacyIcon} />}
      </div>

      <form className={s.form} onSubmit={submit} noValidate aria-describedby={summary ? 'ut-summary' : undefined}>
        <p id="ut-summary" className={s.summary} role="alert">{summary}</p>

        <fieldset className={s.group}>
          <legend className={s.legend}>Song</legend>
          <TextField ref={refs.title} label="Titel" value={title} onChange={(e) => { setTitle(e.target.value); clearErr('title'); }} maxLength={USER_TEXT_LIMITS.title} error={errors.title} autoComplete="off" required enterKeyHint="next" />
          <TextField label="Künstler (optional)" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={USER_TEXT_LIMITS.artist} autoComplete="off" enterKeyHint="next" />
          <div className={s.two}>
            <Select<Variant>
              label="Sprache & Variante"
              value={variant}
              onChange={setVariant}
              options={(['es-ES', 'es-LA', 'pt-BR'] as Variant[]).map((v) => ({ value: v, label: VARIANT_LABELS[v] }))}
            />
            <Select<SongGenre> label="Genre" value={genre} onChange={setGenre} options={SONG_GENRES.map((g) => ({ value: g, label: g }))} />
          </div>
          <Select<'' | SongLevel>
            label="Niveau (optional)"
            value={level}
            onChange={setLevel}
            options={[{ value: '', label: 'Weiß ich nicht – bitte schätzen' }, ...SONG_LEVELS.map((l) => ({ value: l, label: l }))]}
            hint="Ohne Angabe schätzen wir das Niveau grob anhand von Wortlänge und Zeilenlänge."
          />
        </fieldset>

        <fieldset className={s.group}>
          <legend className={s.legend}>Songtext</legend>
          <TextArea
            ref={refs.lyrics}
            label="Text"
            hideLabel
            value={lyrics}
            onChange={(e) => { setLyrics(e.target.value); clearErr('lyrics'); }}
            maxLength={USER_TEXT_LIMITS.lyrics}
            showCount
            rows={10}
            maxRows={22}
            placeholder={'Eine Zeile pro Textzeile.\nLeerzeile = neuer Abschnitt.\n[Refrain] in einer eigenen Zeile benennt ihn.'}
            error={errors.lyrics}
            spellCheck={false}
            autoCapitalize="sentences"
            lang={variant === 'pt-BR' ? 'pt-BR' : 'es'}
            className={s.lyrics}
          />
          <p className={s.stats} aria-live="polite">
            {parsed.lines.length} {parsed.lines.length === 1 ? 'Zeile' : 'Zeilen'} · {parsed.sections.length} {parsed.sections.length === 1 ? 'Abschnitt' : 'Abschnitte'}
            {tooMany && ` · nur die ersten ${USER_TEXT_LIMITS.lines} Zeilen werden verwendet`}
          </p>
        </fieldset>

        <fieldset className={s.group}>
          <legend className={s.legend}>Musikdienste verknüpfen (optional)</legend>
          <p className={sh.muted}>Gespeichert wird nur die ID. Abgespielt wird später über die offizielle Einbettung – erst nach deiner Zustimmung.</p>
          <TextField
            ref={refs.yt}
            label="YouTube-Link"
            value={yt}
            onChange={(e) => { setYt(e.target.value); clearErr('yt'); }}
            onBlur={() => { const er = mediaErr(parseYouTubeId(yt)); if (er) setErrors((x) => ({ ...x, yt: er })); }}
            placeholder="https://youtu.be/…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            error={errors.yt}
            hint={mediaOk(ytR, 'Video')}
          />
          <TextField
            ref={refs.sp}
            label="Spotify-Link"
            value={sp}
            onChange={(e) => { setSp(e.target.value); clearErr('sp'); }}
            onBlur={() => { const er = mediaErr(parseSpotifyUri(sp)); if (er) setErrors((x) => ({ ...x, sp: er })); }}
            placeholder="https://open.spotify.com/track/…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            error={errors.sp}
            hint={mediaOk(spR, '')}
          />
          <TextField
            ref={refs.am}
            label="Apple-Music-Link"
            value={am}
            onChange={(e) => { setAm(e.target.value); clearErr('am'); }}
            onBlur={() => { const er = mediaErr(parseAppleMusicUrl(am)); if (er) setErrors((x) => ({ ...x, am: er })); }}
            placeholder="https://music.apple.com/de/album/…"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            error={errors.am}
            hint={mediaOk(amR, '')}
          />
        </fieldset>

        <div className={`${s.confirm} ${errors.confirm ? s.confirmError : ''}`}>
          <label className={s.confirmLabel}>
            <input
              ref={refs.confirm}
              type="checkbox"
              className={s.checkbox}
              checked={confirmed}
              onChange={(e) => { setConfirmed(e.target.checked); clearErr('confirm'); }}
              aria-invalid={Boolean(errors.confirm)}
              aria-describedby={errors.confirm ? 'ut-confirm-err' : undefined}
            />
            <span>Ich nutze diesen Text nur für meine private Analyse und veröffentliche ihn nicht.</span>
          </label>
          {errors.confirm && <p id="ut-confirm-err" className={s.error}>{errors.confirm}</p>}
        </div>

        {textId && (
          <div className={s.danger}>
            <Button type="button" variant="ghost" icon={<Trash2 size={18} />} onClick={() => setDeleting(true)}>Text löschen</Button>
          </div>
        )}

        <div className={s.spacer} aria-hidden="true" />
        <div className={s.bar}>
          <Button type="submit" variant="primary" size="lg" block icon={<Save size={18} />} loading={saving}>
            {textId ? 'Änderungen speichern' : 'Text speichern'}
          </Button>
        </div>
      </form>

      {textId && (
        <ConfirmDialog
          open={deleting}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            deleteUserText(userSongId(textId));
            setDeleting(false);
            toast('Text gelöscht – samt Notizen und Markierungen.', { tone: 'info' });
            navigate('/songs', { replace: true });
          }}
          title="Text löschen?"
          message="Der Text wird mit allen Notizen, Markierungen und Erklärungen gelöscht. Vokabeln in deiner Wiederholung bleiben erhalten."
          confirmLabel="Endgültig löschen"
          tone="danger"
        />
      )}
    </Page>
  );
}
