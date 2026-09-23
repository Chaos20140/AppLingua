/**
 * Eigene Songtexte → Song-Objekte (rein, ohne React).
 * Rechtlich: Nutzertexte bleiben privat (license.kind 'user-private'); Medien nur als IDs offizieller Dienste.
 */
import type { CourseId, UserSongText, Variant } from '../../core/types';
import type { Song, SongGenre, SongLine, SongToken } from '../../content/types';
import { hashString } from '../../engine/text';

export type SongLevel = Song['level'];
export const SONG_LEVELS: SongLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const SONG_GENRES: SongGenre[] = [
  'Pop', 'Ballade', 'Rock', 'Cumbia', 'Reggaeton', 'Salsa', 'Bolero', 'Flamenco-Pop', 'Folk',
  'Bossa Nova', 'Samba', 'Forró', 'MPB', 'Kinderlied',
];

/** Präfix der Song-IDs eigener Texte: `user.<uuid>`. */
export const USER_SONG_PREFIX = 'user.';
export const isUserSongId = (id: string) => id.startsWith(USER_SONG_PREFIX);
export const userSongId = (textId: string) => `${USER_SONG_PREFIX}${textId}`;
export const userTextIdOf = (songId: string) => (isUserSongId(songId) ? songId.slice(USER_SONG_PREFIX.length) : null);

/** Hinweis statt Übersetzung bei eigenen Texten (Übersetzungen liefert die KI oder der Nutzer). */
export const USER_TRANSLATION_HINT = 'Übersetzung per KI oder selbst ergänzen';

export const USER_LICENSE: Song['license'] = {
  kind: 'user-private',
  note: 'Privat eingegebener Text – nur für deine persönliche Analyse. Er wird nicht veröffentlicht oder geteilt.',
};

/** Grenzen für die Eingabe (Schutz vor Riesentexten, KI-Grenzen). */
export const USER_TEXT_LIMITS = { title: 120, artist: 120, lyrics: 8000, lines: 200 } as const;

/**
 * Gespeicherter Nutzertext inkl. optionalem Niveau (Erweiterung von UserSongText ohne Typänderung
 * im Kern: zusätzliche Felder sind strukturell erlaubt und werden unverändert synchronisiert).
 */
export type UserSongTextData = UserSongText & { level?: SongLevel };

// ───────────────────────── Tokenisierung ─────────────────────────
const OPENING = new Set(['¿', '¡', '«', '(', '“', '"', '„', '[']);
const LEADING_RE = /^[¿¡«(“"„[]+/;
const TRAILING_RE = /[.,;:!?…»)”"\]]+$/;

/** Zerlegt eine Zeile in Wort- und Satzzeichen-Tokens (Satzzeichen mit p: true, nicht antippbar). */
export function tokenizeLyricLine(text: string): SongToken[] {
  const tokens: SongToken[] = [];
  const src = text.trim();
  if (!src) return tokens;
  for (const chunk of src.split(/\s+/)) {
    const lead = chunk.match(LEADING_RE)?.[0] ?? '';
    const rest = chunk.slice(lead.length);
    const trail = rest.match(TRAILING_RE)?.[0] ?? '';
    const core = rest.slice(0, rest.length - trail.length);
    for (const ch of lead) tokens.push({ t: ch, p: true });
    if (core) {
      // Gedankenstriche/Symbole ohne Buchstaben sind Satzzeichen
      if (/[\p{L}\p{N}]/u.test(core)) tokens.push({ t: core });
      else tokens.push({ t: core, p: true });
    }
    for (const ch of trail) tokens.push({ t: ch, p: true });
  }
  return tokens;
}

/** Setzt Tokens wieder zu lesbarem Text zusammen (Satzzeichen ohne Leerzeichen davor). */
export function joinLyricTokens(tokens: readonly SongToken[]): string {
  let out = '';
  tokens.forEach((tok, i) => {
    const prev = tokens[i - 1];
    const glued = i === 0 || (tok.p && !OPENING.has(tok.t)) || (prev?.p && OPENING.has(prev.t));
    out += (glued ? '' : ' ') + tok.t;
  });
  return out;
}

export const wordCountOf = (tokens: readonly SongToken[]) => tokens.filter((t) => !t.p).length;

// ───────────────────────── Zeilen & Abschnitte ─────────────────────────
const SECTION_RE = /^\s*[[(]\s*([^\])]{1,40})\s*[\])]\s*:?\s*$/;

export interface ParsedLyrics {
  sections: { id: string; label: string }[];
  lines: { text: string; sectionId: string }[];
}

/**
 * Text → Zeilen. Leerzeilen trennen Abschnitte, `[Refrain]` oder `(Strophe 2)` in einer eigenen
 * Zeile benennen den folgenden Abschnitt. Höchstens USER_TEXT_LIMITS.lines Zeilen.
 */
export function parseLyrics(lyrics: string): ParsedLyrics {
  const sections: ParsedLyrics['sections'] = [];
  const lines: ParsedLyrics['lines'] = [];
  let currentId: string | null = null;
  let pendingLabel: string | null = null;
  for (const raw of lyrics.replace(/\r\n?/g, '\n').split('\n')) {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) { currentId = null; continue; }
    const label = text.match(SECTION_RE)?.[1];
    if (label) { pendingLabel = label.trim(); currentId = null; continue; }
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    if (!currentId) {
      currentId = `s${sections.length + 1}`;
      sections.push({ id: currentId, label: pendingLabel ?? `Teil ${sections.length + 1}` });
      pendingLabel = null;
    }
    lines.push({ text, sectionId: currentId });
    if (lines.length >= USER_TEXT_LIMITS.lines) break;
  }
  return { sections, lines };
}

// ───────────────────────── Zeiten & Schwierigkeit ─────────────────────────
const MS_PER_WORD = 450;
const MS_LINE_OVERHEAD = 600;
const MIN_LINE_MS = 1800;
const INTRO_MS = 2000;
const OUTRO_MS = 2000;

const lineMsFor = (words: number) => Math.max(MIN_LINE_MS, words * MS_PER_WORD + MS_LINE_OVERHEAD);

/** Nur verwendbar, wenn es für jede Zeile eine Zeit gibt und die Zeiten aufsteigen. */
export function validTimings(timings: readonly number[] | undefined, lineCount: number): boolean {
  if (!timings || lineCount === 0 || timings.length < lineCount) return false;
  for (let i = 0; i < lineCount; i++) {
    const t = timings[i];
    if (!Number.isFinite(t) || t < 0) return false;
    if (i > 0 && t <= timings[i - 1]) return false;
  }
  return true;
}

function difficultyOf(tokens: readonly SongToken[]): 1 | 2 | 3 {
  const words = tokens.filter((t) => !t.p);
  const long = words.filter((w) => w.t.length >= 9).length;
  if (words.length <= 6 && long === 0) return 1;
  if (words.length <= 10 && long <= 1) return 2;
  return 3;
}

/** Grobe Niveau-Schätzung eines Textes (nur Orientierung, wenn der Nutzer nichts angibt). */
export function estimateLevel(lines: readonly { tokens: readonly SongToken[] }[]): SongLevel {
  const words = lines.flatMap((l) => l.tokens.filter((t) => !t.p).map((t) => t.t));
  if (!words.length) return 'A2';
  const avgLen = words.reduce((n, w) => n + w.length, 0) / words.length;
  const perLine = words.length / lines.length;
  const unique = new Set(words.map((w) => w.toLowerCase())).size / words.length;
  // Wortvielfalt ist erst bei längeren Texten aussagekräftig
  const variety = words.length >= 40 ? (unique - 0.5) * 3 : 0;
  const score = (avgLen - 4) * 1.2 + (perLine - 6) * 0.35 + variety;
  if (score < 0) return 'A2';
  if (score < 1.4) return 'B1';
  if (score < 2.8) return 'B2';
  return 'C1';
}

function coverOf(seed: string): Song['cover'] {
  const h = hashString(seed);
  const hue = h % 360;
  const hue2 = (hue + 40 + ((h >>> 9) % 60)) % 360;
  const emojis = ['📝', '🎧', '🎙️', '🎼', '🎹', '🎸', '🥁', '🎺'];
  return {
    from: `hsl(${hue} 62% 52%)`,
    to: `hsl(${hue2} 58% 36%)`,
    emoji: emojis[(h >>> 3) % emojis.length],
  };
}

const courseOfVariant = (v: Variant): CourseId => (v === 'pt-BR' ? 'pt-BR' : 'es');
const isGenre = (g: unknown): g is SongGenre => typeof g === 'string' && (SONG_GENRES as string[]).includes(g);
const isLevel = (l: unknown): l is SongLevel => typeof l === 'string' && (SONG_LEVELS as string[]).includes(l);

/** Liest das (optionale) Niveau eines gespeicherten Nutzertextes. */
export function userTextLevel(text: UserSongText): SongLevel | undefined {
  const l = (text as UserSongTextData).level;
  return isLevel(l) ? l : undefined;
}

/**
 * Wandelt einen gespeicherten Nutzertext in ein Song-Objekt um: Tokenisierung inkl. Satzzeichen,
 * leeres Glossar, Übersetzungen leer (Hinweis USER_TRANSLATION_HINT), Zeiten aus `timings`
 * oder gleichmäßig nach Wortanzahl verteilt (`untimed: true`).
 */
export function userTextToSong(textId: string, text: UserSongText): Song {
  const variant: Variant = text.courseId === 'pt-BR' ? 'pt-BR' : text.variant === 'pt-BR' ? 'es-LA' : text.variant;
  const courseId: CourseId = text.courseId ?? courseOfVariant(variant);
  const parsed = parseLyrics(text.lyrics ?? '');
  const tokenLines = parsed.lines.map((l) => ({ ...l, tokens: tokenizeLyricLine(l.text) }));
  const timed = validTimings(text.timings, tokenLines.length);

  let cursor = INTRO_MS;
  let sungMs = 0;
  let words = 0;
  const lines: SongLine[] = tokenLines.map((l, i) => {
    const n = wordCountOf(l.tokens);
    words += n;
    let startMs: number;
    let endMs: number;
    if (timed) {
      const t = text.timings as number[];
      startMs = Math.round(t[i]);
      const next = i + 1 < tokenLines.length ? t[i + 1] : startMs + lineMsFor(n);
      endMs = Math.round(Math.max(startMs + 300, next - 100));
    } else {
      startMs = cursor;
      endMs = cursor + lineMsFor(n);
      cursor = endMs + 400;
    }
    sungMs += endMs - startMs;
    return {
      id: `l${String(i + 1).padStart(2, '0')}`,
      sectionId: l.sectionId,
      startMs,
      endMs,
      text: joinLyricTokens(l.tokens),
      tokens: l.tokens,
      natural: '',
      literal: '',
      phonetic: '',
      difficulty: difficultyOf(l.tokens),
      explanation: { summary: USER_TRANSLATION_HINT, grammar: [], alternatives: [], everyday: '' },
    };
  });

  const wpm = sungMs > 0 ? Math.round(words / (sungMs / 60000)) : 0;
  const speed: Song['speed'] = timed ? (wpm < 70 ? 'langsam' : wpm > 120 ? 'schnell' : 'mittel') : 'mittel';
  const last = lines[lines.length - 1];
  const media = text.media ? cleanMedia(text.media) : undefined;
  const id = userSongId(textId);

  const song: Song = {
    id,
    courseId,
    variant,
    title: (text.title ?? '').trim() || 'Eigener Text',
    artist: (text.artist ?? '').trim(),
    cover: coverOf(id),
    genre: isGenre(text.genre) ? text.genre : 'Pop',
    level: userTextLevel(text) ?? estimateLevel(lines),
    speed,
    wordsPerMinute: wpm,
    colloquialPct: 0,
    explicit: false,
    themes: [],
    grammarTags: [],
    license: USER_LICENSE,
    backing: { bpm: 96, style: 'pop', key: 'C', chords: ['C', 'G', 'Am', 'F'] },
    durationMs: last ? last.endMs + OUTRO_MS : 0,
    sections: parsed.sections,
    lines,
    glossary: {},
  };
  if (media && Object.keys(media).length) song.media = media;
  if (!timed) song.untimed = true;
  return song;
}

// ───────────────────────── Medienlinks (nur IDs offizieller Dienste) ─────────────────────────
export type MediaParse = { ok: true; value: string } | { ok: false; error: string } | null;

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_KINDS = ['track', 'album', 'playlist'] as const;

function toUrl(input: string): URL | null {
  const s = input.trim();
  if (!s) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
}

const hostIs = (u: URL, ...hosts: string[]) => {
  const h = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  return hosts.includes(h);
};

/** YouTube-Link oder -ID → 11-stellige Video-ID. Leere Eingabe → null. */
export function parseYouTubeId(input: string): MediaParse {
  const s = input.trim();
  if (!s) return null;
  if (YT_ID.test(s)) return { ok: true, value: s };
  const u = toUrl(s);
  const fail = { ok: false as const, error: 'Das ist kein gültiger YouTube-Link. Beispiel: https://youtu.be/…' };
  if (!u || !/^https?:$/.test(u.protocol)) return fail;
  let id: string | null = null;
  if (hostIs(u, 'youtu.be')) id = u.pathname.split('/')[1] ?? null;
  else if (hostIs(u, 'youtube.com', 'music.youtube.com', 'youtube-nocookie.com')) {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') id = u.searchParams.get('v');
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) id = parts[1] ?? null;
  }
  return id && YT_ID.test(id) ? { ok: true, value: id } : fail;
}

/** Spotify-Link oder -URI → `spotify:<track|album|playlist>:<id>`. */
export function parseSpotifyUri(input: string): MediaParse {
  const s = input.trim();
  if (!s) return null;
  const fail = { ok: false as const, error: 'Das ist kein gültiger Spotify-Link. Beispiel: https://open.spotify.com/track/…' };
  const uri = s.match(/^spotify:(track|album|playlist):([A-Za-z0-9]{22})$/);
  if (uri) return { ok: true, value: `spotify:${uri[1]}:${uri[2]}` };
  const u = toUrl(s);
  if (!u || u.protocol !== 'https:' || !hostIs(u, 'open.spotify.com')) return fail;
  const parts = u.pathname.split('/').filter(Boolean).filter((p) => !/^intl-[a-z]{2}$/i.test(p));
  const kind = parts[0] as (typeof SPOTIFY_KINDS)[number];
  const id = parts[1];
  if (!SPOTIFY_KINDS.includes(kind) || !id || !SPOTIFY_ID.test(id)) return fail;
  return { ok: true, value: `spotify:${kind}:${id}` };
}

/**
 * Apple-Music-Link → bereinigte Form nur aus Land + IDs:
 * `https://music.apple.com/<cc>/album/<albumId>?i=<songId>` bzw. `/song/<songId>`.
 */
export function parseAppleMusicUrl(input: string): MediaParse {
  const s = input.trim();
  if (!s) return null;
  const fail = { ok: false as const, error: 'Das ist kein gültiger Apple-Music-Link. Beispiel: https://music.apple.com/de/album/…' };
  const u = toUrl(s);
  if (!u || u.protocol !== 'https:' || !hostIs(u, 'music.apple.com')) return fail;
  const parts = u.pathname.split('/').filter(Boolean);
  const cc = (parts[0] ?? '').toLowerCase();
  if (!/^[a-z]{2}$/.test(cc)) return fail;
  const kind = parts[1];
  const id = parts[parts.length - 1] ?? '';
  const numId = /^(?:id)?(\d{5,15})$/.exec(id)?.[1];
  if (!numId) return fail;
  if (kind === 'album') {
    const track = u.searchParams.get('i');
    if (track && !/^\d{5,15}$/.test(track)) return fail;
    return { ok: true, value: `https://music.apple.com/${cc}/album/${numId}${track ? `?i=${track}` : ''}` };
  }
  if (kind === 'song') return { ok: true, value: `https://music.apple.com/${cc}/song/${numId}` };
  if (kind === 'playlist' && /^pl\.[A-Za-z0-9-]{10,64}$/.test(id)) return { ok: true, value: `https://music.apple.com/${cc}/playlist/${id}` };
  return fail;
}

/** Nur gültige Medienangaben übernehmen (Schutz gegen manipulierte/alte Datensätze). */
export function cleanMedia(media: NonNullable<UserSongText['media']>): NonNullable<Song['media']> {
  const out: NonNullable<Song['media']> = {};
  const yt = media.youtubeId ? parseYouTubeId(media.youtubeId) : null;
  if (yt?.ok) out.youtubeId = yt.value;
  const sp = media.spotifyUri ? parseSpotifyUri(media.spotifyUri) : null;
  if (sp?.ok) out.spotifyUri = sp.value;
  const am = media.appleMusicUrl ? parseAppleMusicUrl(media.appleMusicUrl) : null;
  if (am?.ok) out.appleMusicUrl = am.value;
  return out;
}

/** Öffentliche Seite des Dienstes (für „Im Dienst öffnen“ – keine Einbettung, kein Tracking vorab). */
export function mediaPageUrl(kind: 'youtube' | 'spotify' | 'appleMusic', value: string): string | null {
  if (kind === 'youtube') return YT_ID.test(value) ? `https://www.youtube.com/watch?v=${value}` : null;
  if (kind === 'spotify') {
    const m = value.match(/^spotify:(track|album|playlist):([A-Za-z0-9]{22})$/);
    return m ? `https://open.spotify.com/${m[1]}/${m[2]}` : null;
  }
  const am = parseAppleMusicUrl(value);
  return am?.ok ? am.value : null;
}
