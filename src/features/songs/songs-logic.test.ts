import { describe, expect, it } from 'vitest';
import type { ErrorEntry, UserSongText } from '../../core/types';
import { getRecord, putRecord } from '../../data/store';
import type { Song, SongLine } from '../../content/types';
import {
  estimateLevel, joinLyricTokens, parseAppleMusicUrl, parseLyrics, parseSpotifyUri, parseYouTubeId,
  tokenizeLyricLine, userTextToSong, USER_TRANSLATION_HINT, validTimings, cleanMedia, mediaPageUrl,
} from './userText';
import {
  explainTerms, explanationId, friendlyPos, layoutExplanation, offlineExplanation, pronunciationTips, spanOf,
} from './explainCore';
import { activeFilterCount, colloquialBucket, EMPTY_FILTERS, moveItem, searchLibrary } from './library';
import { deleteUserText } from './songData';

const text = (over: Partial<UserSongText> = {}): UserSongText => ({
  title: 'Mi canción',
  artist: 'Yo',
  courseId: 'es',
  variant: 'es-LA',
  genre: 'Pop',
  lyrics: '[Estrofa]\n¿Dónde estás, amor?\nTe busco — en la calle.\n\nLa la la\n',
  createdAt: '2026-09-01T00:00:00.000Z',
  privateUseConfirmed: true,
  ...over,
});

describe('Tokenisierung', () => {
  it('trennt Satzzeichen ab und markiert sie', () => {
    const t = tokenizeLyricLine('¿Dónde estás, amor?');
    expect(t.map((x) => x.t)).toEqual(['¿', 'Dónde', 'estás', ',', 'amor', '?']);
    expect(t.filter((x) => x.p).map((x) => x.t)).toEqual(['¿', ',', '?']);
    expect(joinLyricTokens(t)).toBe('¿Dónde estás, amor?');
  });
  it('behandelt Gedankenstriche als Satzzeichen', () => {
    const t = tokenizeLyricLine('Te busco — en la calle.');
    expect(t.find((x) => x.t === '—')?.p).toBe(true);
    expect(t.filter((x) => !x.p)).toHaveLength(5);
  });
});

describe('parseLyrics', () => {
  it('erkennt Abschnittsnamen und Leerzeilen', () => {
    const p = parseLyrics(text().lyrics);
    expect(p.sections.map((s) => s.label)).toEqual(['Estrofa', 'Teil 2']);
    expect(p.lines).toHaveLength(3);
    expect(p.lines[2]).toEqual({ text: 'La la la', sectionId: 's2' });
  });
});

describe('userTextToSong', () => {
  it('baut einen privaten, ungetimten Song', () => {
    const s = userTextToSong('abc', text());
    expect(s.id).toBe('user.abc');
    expect(s.license.kind).toBe('user-private');
    expect(s.untimed).toBe(true);
    expect(s.glossary).toEqual({});
    expect(s.lines[0].natural).toBe('');
    expect(s.lines[0].explanation.summary).toBe(USER_TRANSLATION_HINT);
    expect(s.lines.every((l, i) => i === 0 || l.startMs > s.lines[i - 1].endMs)).toBe(true);
    expect(s.durationMs).toBeGreaterThan(s.lines[2].endMs);
  });
  it('übernimmt gültige Zeiten, Niveau und Medien', () => {
    const s = userTextToSong('x', { ...text({ timings: [1000, 4000, 7000], media: { youtubeId: 'dQw4w9WgXcQ', spotifyUri: 'kaputt' } }), level: 'B1' } as UserSongText);
    expect(s.untimed).toBeUndefined();
    expect(s.lines[1].startMs).toBe(4000);
    expect(s.level).toBe('B1');
    expect(s.media).toEqual({ youtubeId: 'dQw4w9WgXcQ' });
  });
  it('erzwingt pt-BR als Variante für Portugiesisch', () => {
    expect(userTextToSong('p', text({ courseId: 'pt-BR', variant: 'es-ES' })).variant).toBe('pt-BR');
  });
  it('ignoriert unpassende Zeiten', () => {
    expect(validTimings([0, 100], 3)).toBe(false);
    expect(validTimings([0, 100, 50], 3)).toBe(false);
    expect(validTimings([0, 100, 200], 3)).toBe(true);
  });
  it('schätzt ein Niveau', () => {
    expect(['A2', 'B1', 'B2', 'C1']).toContain(estimateLevel([{ tokens: tokenizeLyricLine('hola amor') }]));
  });
});

describe('Medienlinks', () => {
  it('YouTube', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=3')).toEqual({ ok: true, value: 'dQw4w9WgXcQ' });
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x')).toEqual({ ok: true, value: 'dQw4w9WgXcQ' });
    expect(parseYouTubeId('youtube.com/shorts/dQw4w9WgXcQ')).toEqual({ ok: true, value: 'dQw4w9WgXcQ' });
    expect(parseYouTubeId('https://evil.com/watch?v=dQw4w9WgXcQ')?.ok).toBe(false);
    expect(parseYouTubeId('   ')).toBeNull();
  });
  it('Spotify', () => {
    expect(parseSpotifyUri('https://open.spotify.com/intl-de/track/4cOdK2wGLETKBW3PvgPWqT?si=abc')).toEqual({ ok: true, value: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT' });
    expect(parseSpotifyUri('spotify:album:4cOdK2wGLETKBW3PvgPWqT')?.ok).toBe(true);
    expect(parseSpotifyUri('https://open.spotify.com/artist/4cOdK2wGLETKBW3PvgPWqT')?.ok).toBe(false);
  });
  it('Apple Music', () => {
    expect(parseAppleMusicUrl('https://music.apple.com/de/album/some-name/1440818839?i=1440818840&ls=1')).toEqual({ ok: true, value: 'https://music.apple.com/de/album/1440818839?i=1440818840' });
    expect(parseAppleMusicUrl('https://music.apple.com/us/song/name/1440818840')).toEqual({ ok: true, value: 'https://music.apple.com/us/song/1440818840' });
    expect(parseAppleMusicUrl('https://music.apple.com.evil.io/de/album/x/1440818839')?.ok).toBe(false);
  });
  it('bereinigt Medien und baut Links', () => {
    expect(cleanMedia({ youtubeId: 'javascript:alert(1)' })).toEqual({});
    expect(mediaPageUrl('spotify', 'spotify:track:4cOdK2wGLETKBW3PvgPWqT')).toBe('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
  });
});

// ── Erklärungen ──
const line: SongLine = {
  id: 'l01', sectionId: 's1', startMs: 0, endMs: 1000,
  text: 'Abro la ventana, ya sale el sol,',
  tokens: tokenizeLyricLine('Abro la ventana, ya sale el sol,').map((t) => (t.p ? t : { ...t, g: t.t.toLowerCase() })),
  natural: 'Ich öffne das Fenster, schon geht die Sonne auf,',
  literal: 'Öffne-ich das Fenster, schon kommt-heraus die Sonne,',
  phonetic: 'A-bro la ben-TA-na',
  difficulty: 1,
  explanation: {
    summary: 'Der Morgen beginnt.',
    grammar: [{ title: 'Präsens', md: 'Das Präsens mit Subjekt `yo`.' }],
    alternatives: [{ target: 'El sol ya sale.', german: 'Die Sonne geht schon auf.' }],
    everyday: 'Ganz normal.',
  },
  verbs: [{ form: 'abro', infinitive: 'abrir', analysis: 'Präsens, 1. Person Singular' }],
};
const song = {
  id: 'song.es.test', courseId: 'es', variant: 'es-LA', title: 'T', artist: 'A',
  license: { kind: 'original', note: '' },
  lines: [line],
  glossary: {
    abro: { lemma: 'abrir', pos: 'Verb', meaning: 'ich öffne', literal: 'öffne-ich', form: '1. Person Singular Präsens', register: 'neutral', phonetic: 'A-bro', examples: [{ target: 'Abro la puerta.', german: 'Ich öffne die Tür.' }], everyday: 'Sehr häufig.' },
    ventana: { lemma: 'ventana', pos: 'Nomen (f)', meaning: 'Fenster', register: 'neutral', phonetic: 'ben-TA-na', examples: [{ target: 'la ventana abierta', german: 'das offene Fenster' }], everyday: 'Ständig.' },
  },
} as unknown as Song;

describe('Erklärungen offline', () => {
  it('Wortbedeutung mit Kontext, Grammatik und Beispielen', () => {
    const e = offlineExplanation(song, line, 0, 'meaning', 'B1', 'es-LA');
    expect(e?.source).toBe('offline');
    expect(e?.natural).toBe('ich öffne');
    expect(e?.context).toContain('Abro la ventana');
    expect(e?.grammar?.some((g) => g.includes('abrir'))).toBe(true);
    expect(e?.examples).toHaveLength(1);
  });
  it('Zeile wörtlich mit Wort-für-Wort-Hilfe', () => {
    const e = offlineExplanation(song, line, undefined, 'literal', 'A2', 'es-LA');
    expect(e?.literal).toBe(line.literal);
    expect(e?.context).toContain('`ventana` = Fenster');
  });
  it('Wort ohne Glossar → offline nichts (außer Aussprachetipps)', () => {
    expect(offlineExplanation(song, line, 1, 'meaning', 'A1', 'es-LA')).toBeNull();
    expect(offlineExplanation(song, line, 1, 'pronunciation', 'A1', 'es-LA')?.pronunciation?.tips?.length).toBeGreaterThan(0);
  });
  it('eigene Texte → nur Aussprachetipps', () => {
    const u = userTextToSong('u', text());
    expect(offlineExplanation(u, u.lines[0], undefined, 'meaning', 'A1', 'es-LA')).toBeNull();
    expect(offlineExplanation(u, u.lines[0], undefined, 'pronunciation', 'A1', 'es-LA')?.pronunciation?.phonetic).toBe('');
  });
  it('erklärt Fachbegriffe für Einsteiger, nicht in Code', () => {
    expect(explainTerms('Das Präsens von `Präsens`.', 'A1')).toBe('Das Präsens (Gegenwart) von `Präsens`.');
    expect(explainTerms('Das Präsens.', 'B1')).toBe('Das Präsens.');
    expect(explainTerms('Präsens (Gegenwart)', 'Einsteiger')).toBe('Präsens (Gegenwart)');
    expect(friendlyPos('Artikel (f. Sg.)', 'A1')).toContain('weiblich, Einzahl');
  });
  it('Layout: Einsteiger sehen den Kern, Details hinter „Mehr“', () => {
    const e = offlineExplanation(song, line, undefined, 'meaning', 'A1', 'es-LA') as NonNullable<ReturnType<typeof offlineExplanation>>;
    const beginner = layoutExplanation(e, 'meaning', 'A1');
    expect(beginner.primary).toEqual(['natural', 'literal', 'context', 'everyday']);
    expect(beginner.more).toContain('grammar');
    const adv = layoutExplanation(e, 'meaning', 'B2');
    expect(adv.primary).toContain('grammar');
    expect(adv.more).toEqual([]);
  });
  it('Aussprachetipps je Variante', () => {
    expect(pronunciationTips('cerveza', 'es-ES').join(' ')).toContain('th');
    expect(pronunciationTips('cerveza', 'es-LA').join(' ')).toContain('stimmloses „s“');
    expect(pronunciationTips('não', 'pt-BR')[0]).toContain('Nasale');
    expect(pronunciationTips('perro y calle', 'es-LA').length).toBeLessThanOrEqual(4);
  });
  it('IDs: stabil und gekürzt', () => {
    expect(spanOf(line, 2)).toBe('ventana');
    expect(spanOf(line, 3)).toBe(line.text);
    expect(explanationId('song.es.test', 'l01', 'Ventana', 'meaning')).toBe('song.es.test:l01:ventana:meaning');
    const long = explanationId('s', 'l01', line.text, 'literal');
    expect(long.length).toBeLessThan(60);
    expect(long).toBe(explanationId('s', 'l01', line.text, 'literal'));
  });
});

describe('Bibliothek', () => {
  const songs = [song, { ...song, id: 'song.pt.x', courseId: 'pt-BR', variant: 'pt-BR', title: 'Bom dia', artist: 'Clara', level: 'A1', colloquialPct: 50 }] as unknown as Song[];
  it('sucht akzentunabhängig in Titel, Künstler und Text', () => {
    expect(searchLibrary(songs, 'bom', EMPTY_FILTERS, false).map((h) => h.song.id)).toEqual(['song.pt.x']);
    const hit = searchLibrary(songs, 'VENTANA', EMPTY_FILTERS, false)[0];
    expect(hit.song.id).toBe('song.es.test');
    expect(hit.matchedLine).toBe(line.text);
  });
  it('filtert nach Sprache und Umgangssprache', () => {
    expect(searchLibrary(songs, '', { ...EMPTY_FILTERS, lang: 'pt-BR' }, false)).toHaveLength(1);
    expect(searchLibrary(songs, '', { ...EMPTY_FILTERS, lang: 'es-ES' }, false)).toHaveLength(0);
    expect(colloquialBucket(50)).toBe('viel');
    expect(activeFilterCount({ ...EMPTY_FILTERS, genre: 'Pop', lang: 'es' })).toBe(1);
  });
  it('verschiebt Playlist-Einträge', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 2, -2)).toEqual(['c', 'a', 'b']);
  });
});

describe('eigenen Text löschen', () => {
  it('entfernt auch Fehlerarchiv-Einträge mit Aufgabe/Lösung aus dem Text', () => {
    const err = (exerciseId: string, refId?: string) =>
      ({ courseId: 'es', exerciseId, context: 'song', ...(refId ? { refId } : {}), prompt: 'Te busco', correctAnswer: 'calle' }) as unknown as ErrorEntry;
    putRecord('songUserTexts', 't1', text());
    putRecord('errorEntries', 'es:user.t1.x.a', err('user.t1.x.a', 'user.t1'));
    putRecord('errorEntries', 'es:user.t1.x.b', err('user.t1.x.b'));
    putRecord('errorEntries', 'es:song.es.x.c', err('song.es.x.c', 'song.es'));
    deleteUserText('user.t1');
    expect(getRecord('songUserTexts', 't1')).toBeUndefined();
    expect(getRecord('errorEntries', 'es:user.t1.x.a')).toBeUndefined();
    expect(getRecord('errorEntries', 'es:user.t1.x.b')).toBeUndefined();
    expect(getRecord('errorEntries', 'es:song.es.x.c')).toBeDefined();
  });
});
