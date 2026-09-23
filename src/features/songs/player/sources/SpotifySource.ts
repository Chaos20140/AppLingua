/**
 * Spotify über die offizielle Embed-iFrame-API (nach Einwilligung). Zeit aus playback_update-Ereignissen
 * (interpoliert). Kein Tempo möglich; ohne Spotify-Login im Browser spielt Spotify nur eine Vorschau.
 */
import { BaseSource, loadScriptOnce, type PlaybackSource } from './types';

interface SpotifyController {
  play(): void;
  resume(): void;
  pause(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: string, cb: (e: { data?: { isPaused?: boolean; isBuffering?: boolean; duration?: number; position?: number } }) => void): void;
}

interface SpotifyIFrameApi {
  createController(el: HTMLElement, opts: { uri: string; width?: string | number; height?: string | number }, cb: (c: SpotifyController) => void): void;
}

type SpotifyWindow = Window & { onSpotifyIframeApiReady?: (api: SpotifyIFrameApi) => void; __applinguaSpotifyApi?: SpotifyIFrameApi };

const API_SRC = 'https://open.spotify.com/embed/iframe-api/v1';
let apiPromise: Promise<SpotifyIFrameApi> | null = null;

function loadSpotifyApi(): Promise<SpotifyIFrameApi> {
  const w = window as SpotifyWindow;
  if (w.__applinguaSpotifyApi) return Promise.resolve(w.__applinguaSpotifyApi);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<SpotifyIFrameApi>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), 15000);
    w.onSpotifyIframeApiReady = (api) => {
      window.clearTimeout(timer);
      w.__applinguaSpotifyApi = api;
      resolve(api);
    };
    loadScriptOnce(API_SRC).catch((e: unknown) => { window.clearTimeout(timer); reject(e); });
  });
  apiPromise.catch(() => { apiPromise = null; });
  return apiPromise;
}

export const SPOTIFY_PREVIEW_HINT = 'Ohne Spotify-Anmeldung in diesem Browser spielt Spotify nur eine kurze Vorschau.';

export class SpotifySource extends BaseSource implements PlaybackSource {
  readonly kind = 'spotify' as const;
  readonly supportsRate = false;
  readonly rateReason = 'Spotify erlaubt in eingebetteten Playern keine Tempoänderung.';

  private controller: SpotifyController | null = null;
  private container: HTMLElement;
  private host: HTMLElement;
  private lastMs = 0;
  private lastAt = 0;
  private duration = 0;
  private started = false;
  private disposed = false;
  private playRequestedAt = 0;

  constructor(container: HTMLElement, uri: string) {
    super();
    this.container = container;
    this.host = document.createElement('div');
    container.appendChild(this.host);
    loadSpotifyApi()
      .then((api) => {
        if (this.disposed) return;
        api.createController(this.host, { uri, width: '100%', height: 152 }, (c) => {
          if (this.disposed) { try { c.destroy(); } catch { /* egal */ } return; }
          this.controller = c;
          c.addListener('ready', () => this.setStatus('ready'));
          c.addListener('playback_update', (e) => this.handleUpdate(e.data));
        });
      })
      .catch(() => {
        if (!this.disposed) this.setStatus('error', 'Spotify konnte nicht geladen werden (offline oder durch den Browser blockiert).');
      });
  }

  private handleUpdate(d?: { isPaused?: boolean; isBuffering?: boolean; duration?: number; position?: number }) {
    if (!d || this.disposed) return;
    if (typeof d.position === 'number') {
      this.lastMs = d.position;
      this.lastAt = performance.now();
    }
    if (typeof d.duration === 'number' && d.duration > 0) this.duration = d.duration;
    if (d.isPaused === false && !d.isBuffering) {
      this.started = true;
      this.playRequestedAt = 0;
      this.setStatus('playing');
    } else if (d.isPaused) {
      const atEnd = this.duration > 0 && this.lastMs >= this.duration - 600 && this.started;
      this.setStatus(atEnd ? 'ended' : this.status === 'loading' ? 'ready' : 'paused');
    }
  }

  async play(): Promise<void> {
    const c = this.controller;
    if (!c || this.disposed) return;
    this.playRequestedAt = performance.now();
    try {
      if (this.started && this.status !== 'ended') c.resume();
      else c.play();
    } catch { /* s. u. */ }
    window.setTimeout(() => {
      if (!this.disposed && this.playRequestedAt && this.status !== 'playing') {
        this.noticeEm.emit('Tippe einmal direkt auf den Spotify-Player, um zu starten – danach funktionieren die Tasten hier.');
      }
    }, 3000);
  }

  pause(): void {
    this.playRequestedAt = 0;
    try { this.controller?.pause(); } catch { /* egal */ }
  }

  seek(ms: number): void {
    if (!this.controller) return;
    try {
      this.controller.seek(Math.max(0, ms) / 1000);
      this.lastMs = Math.max(0, ms);
      this.lastAt = performance.now();
    } catch { /* egal */ }
  }

  getTime(): number {
    if (this.status === 'playing' && this.lastAt) {
      const est = this.lastMs + (performance.now() - this.lastAt);
      return this.duration ? Math.min(this.duration, est) : est;
    }
    return this.lastMs;
  }

  setRate(): void { /* nicht unterstützt */ }
  availableRates() { return [1]; }
  getDuration() { return this.duration || null; }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try { this.controller?.destroy(); } catch { /* egal */ }
    this.controller = null;
    this.host.remove();
    this.container.replaceChildren();
    this.clearListeners();
  }
}
