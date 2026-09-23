/**
 * Offizielle Einbettungen (YouTube-nocookie, Spotify, Apple Music) mit Zwei-Klick-Einwilligung.
 * Vor der Zustimmung wird nichts vom Anbieter geladen. YouTube/Spotify liefern eine steuerbare
 * PlaybackSource; Apple Music hat keine Steuer-API (→ Schritt-Modus).
 */
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { Song } from '../../../content/types';
import { updateSettings, useSettings } from '../../../state/settings';
import { Button, Toggle } from '../../../ui';
import { mediaPageUrl } from '../userText';
import { SpotifySource, SPOTIFY_PREVIEW_HINT } from './sources/SpotifySource';
import type { PlaybackSource } from './sources/types';
import { YouTubeSource } from './sources/YouTubeSource';
import s from './player.module.css';

export type EmbedKind = 'youtube' | 'spotify' | 'apple';

const SERVICE: Record<EmbedKind, { name: string; company: string; consent: 'youtube' | 'spotify' | 'appleMusic' }> = {
  youtube: { name: 'YouTube', company: 'Google Ireland', consent: 'youtube' },
  spotify: { name: 'Spotify', company: 'Spotify AB', consent: 'spotify' },
  apple: { name: 'Apple Music', company: 'Apple', consent: 'appleMusic' },
};

export interface MediaEmbedProps {
  kind: EmbedKind;
  song: Song;
  onSource: (source: PlaybackSource | null) => void;
}

function ConsentCard({ kind, onAllow }: { kind: EmbedKind; onAllow: (remember: boolean) => void }) {
  const [remember, setRemember] = useState(false);
  const svc = SERVICE[kind];
  return (
    <section className={s.consent} aria-label={`${svc.name} laden`}>
      <div className={s.consentHead}>
        <ShieldCheck size={22} aria-hidden="true" />
        <h2 className={s.consentTitle}>{svc.name}-Player laden?</h2>
      </div>
      <p className={s.muted}>
        Zum Abspielen wird der offizielle Player von {svc.name} ({svc.company}) geladen. Dabei überträgt dein
        Browser Daten wie deine IP-Adresse an den Anbieter. Vorher lädt AppLingua nichts von dort.
      </p>
      <Toggle checked={remember} onChange={setRemember} label={`Für ${svc.name} merken`} description="Widerruf jederzeit in den Einstellungen." />
      <div className={s.actions}>
        <Button variant="primary" onClick={() => onAllow(remember)}>{svc.name} laden</Button>
        <Button variant="ghost" to="/datenschutz">Datenschutz</Button>
      </div>
    </section>
  );
}

export default function MediaEmbed({ kind, song, onSource }: MediaEmbedProps) {
  const settings = useSettings();
  const svc = SERVICE[kind];
  const [sessionOk, setSessionOk] = useState(false);
  const allowed = settings.embedConsent[svc.consent] || sessionOk;
  const hostRef = useRef<HTMLDivElement>(null);
  const onSourceRef = useRef(onSource);
  onSourceRef.current = onSource;
  const media = song.media ?? {};
  const youtubeId = media.youtubeId;
  const spotifyUri = media.spotifyUri;

  useEffect(() => {
    if (!allowed || kind === 'apple') return;
    const el = hostRef.current;
    if (!el) return;
    let src: PlaybackSource | null = null;
    if (kind === 'youtube' && youtubeId) src = new YouTubeSource(el, youtubeId);
    if (kind === 'spotify' && spotifyUri) src = new SpotifySource(el, spotifyUri);
    onSourceRef.current(src);
    return () => {
      src?.dispose();
      onSourceRef.current(null);
    };
  }, [allowed, kind, youtubeId, spotifyUri]);

  const pageValue = kind === 'youtube' ? youtubeId : kind === 'spotify' ? spotifyUri : media.appleMusicUrl;
  const pageUrl = pageValue ? mediaPageUrl(kind === 'apple' ? 'appleMusic' : kind, pageValue) : null;

  if (!allowed) {
    return (
      <ConsentCard
        kind={kind}
        onAllow={(remember) => {
          if (remember) updateSettings({ embedConsent: { [svc.consent]: true } });
          setSessionOk(true);
        }}
      />
    );
  }

  return (
    <section className={s.embedWrap} aria-label={`${svc.name}-Player`}>
      {kind === 'youtube' && <div className={s.embed16x9}><div ref={hostRef} className={s.embedHost} /></div>}
      {kind === 'spotify' && <div ref={hostRef} className={s.embedSpotify} />}
      {kind === 'apple' && pageUrl && (
        <iframe
          className={s.embedApple}
          src={pageUrl.replace('https://music.apple.com/', 'https://embed.music.apple.com/')}
          title={`Apple Music: ${song.title}`}
          allow="autoplay *; encrypted-media *; clipboard-write"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          loading="lazy"
        />
      )}
      <p className={s.embedNote}>
        {kind === 'spotify' && `${SPOTIFY_PREVIEW_HINT} `}
        {kind === 'apple' && 'Apple Music bietet keine Steuerung von außen: Starte die Musik im Player und schalte die Zeilen mit „Zeile vor“ weiter. '}
        {pageUrl && (
          <a className={s.extLink} href={pageUrl} target="_blank" rel="noopener noreferrer">
            In {svc.name} öffnen <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}
      </p>
    </section>
  );
}
