/**
 * YouTube über die offizielle IFrame-API (Host youtube-nocookie.com). Wird erst nach Einwilligung
 * erzeugt. Zeit per Polling + Interpolation; Tempo über setPlaybackRate (nur verfügbare Raten).
 */
import { BaseSource, loadScriptOnce, PLAYER_RATES, type PlaybackSource } from './types';

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  getAvailablePlaybackRates(): number[];
  destroy(): void;
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: {
    host?: string;
    videoId: string;
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (e: { target: YTPlayer }) => void;
      onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      onError?: (e: { data: number }) => void;
      onPlaybackRateChange?: (e: { data: number }) => void;
    };
  }) => YTPlayer;
}

type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };

const API_SRC = 'https://www.youtube.com/iframe_api';
let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  const w = window as YTWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    const timer = window.setTimeout(() => reject(new Error('timeout')), 15000);
    w.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timer);
      try { prev?.(); } catch { /* fremder Callback */ }
      if (w.YT?.Player) resolve(w.YT);
      else reject(new Error('api'));
    };
    loadScriptOnce(API_SRC).catch((e: unknown) => { window.clearTimeout(timer); reject(e); });
  });
  apiPromise.catch(() => { apiPromise = null; });
  return apiPromise;
}

const ERRORS: Record<number, string> = {
  2: 'Die Video-ID ist ungültig.',
  5: 'Dieses Video kann im Browser-Player nicht abgespielt werden.',
  100: 'Das Video wurde nicht gefunden oder ist privat.',
  101: 'Der Rechteinhaber erlaubt keine Einbettung dieses Videos. Öffne es direkt auf YouTube.',
  150: 'Der Rechteinhaber erlaubt keine Einbettung dieses Videos. Öffne es direkt auf YouTube.',
};

export class YouTubeSource extends BaseSource implements PlaybackSource {
  readonly kind = 'youtube' as const;
  supportsRate = false;
  rateReason: string | undefined = 'Tempo ist verfügbar, sobald das Video geladen ist.';

  private player: YTPlayer | null = null;
  private host: HTMLElement;
  private container: HTMLElement;
  private rates: number[] = [];
  private rate = 1;
  private lastMs = 0;
  private lastAt = 0;
  private polling: number | null = null;
  private disposed = false;
  private playRequestedAt = 0;

  constructor(container: HTMLElement, videoId: string) {
    super();
    this.container = container;
    this.host = document.createElement('div');
    container.appendChild(this.host);
    loadYouTubeApi()
      .then((YT) => {
        if (this.disposed) return;
        this.player = new YT.Player(this.host, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1, controls: 1, fs: 0, origin: window.location.origin },
          events: {
            onReady: () => this.handleReady(),
            onStateChange: (e) => this.handleState(e.data),
            onError: (e) => this.setStatus('error', ERRORS[e.data] ?? 'YouTube meldet einen Fehler beim Abspielen.'),
          },
        });
      })
      .catch(() => {
        if (!this.disposed) this.setStatus('error', 'YouTube konnte nicht geladen werden (offline oder durch den Browser blockiert).');
      });
  }

  private handleReady() {
    if (this.disposed || !this.player) return;
    try {
      const available = this.player.getAvailablePlaybackRates() ?? [];
      this.rates = PLAYER_RATES.filter((r) => available.some((a) => Math.abs(a - r) < 0.001));
    } catch {
      this.rates = [1];
    }
    this.supportsRate = this.rates.length > 1;
    this.rateReason = this.supportsRate ? undefined : 'Dieses Video erlaubt keine Tempoänderung.';
    this.setStatus('ready');
  }

  private handleState(state: number) {
    // -1 nicht gestartet · 0 beendet · 1 läuft · 2 pausiert · 3 puffert · 5 bereit
    this.sample();
    if (state === 1) {
      this.playRequestedAt = 0;
      this.startPolling();
      this.setStatus('playing');
    } else if (state === 2) {
      this.stopPolling();
      this.setStatus('paused');
    } else if (state === 0) {
      this.stopPolling();
      this.setStatus('ended');
    }
  }

  private sample() {
    if (!this.player) return;
    try {
      const ms = (this.player.getCurrentTime() || 0) * 1000;
      if (Math.abs(ms - this.lastMs) > 1 || !this.lastAt) {
        this.lastMs = ms;
        this.lastAt = performance.now();
      }
    } catch { /* Player noch nicht bereit */ }
  }

  private startPolling() {
    if (this.polling !== null) return;
    this.polling = window.setInterval(() => this.sample(), 200);
  }

  private stopPolling() {
    if (this.polling !== null) window.clearInterval(this.polling);
    this.polling = null;
  }

  async play(): Promise<void> {
    if (!this.player || this.disposed) return;
    this.playRequestedAt = performance.now();
    try { this.player.playVideo(); } catch { /* s. u. */ }
    // iOS: Programmatischer Start klappt erst, nachdem einmal direkt ins Video getippt wurde
    window.setTimeout(() => {
      if (!this.disposed && this.playRequestedAt && this.status !== 'playing') {
        this.noticeEm.emit('Tippe einmal direkt auf das Video, um es zu starten – danach funktionieren die Tasten hier.');
      }
    }, 2500);
  }

  pause(): void {
    this.playRequestedAt = 0;
    try { this.player?.pauseVideo(); } catch { /* egal */ }
  }

  seek(ms: number): void {
    if (!this.player) return;
    try {
      this.player.seekTo(Math.max(0, ms) / 1000, true);
      this.lastMs = Math.max(0, ms);
      this.lastAt = performance.now();
    } catch { /* egal */ }
  }

  getTime(): number {
    if (this.status === 'playing' && this.lastAt) {
      const est = this.lastMs + (performance.now() - this.lastAt) * this.rate;
      const dur = this.getDuration();
      return dur ? Math.min(dur, est) : est;
    }
    return this.lastMs;
  }

  setRate(rate: number): void {
    if (!this.player || !this.supportsRate) return;
    const r = this.rates.includes(rate) ? rate : 1;
    this.sample();
    this.rate = r;
    try { this.player.setPlaybackRate(r); } catch { /* egal */ }
  }

  availableRates() { return this.rates.length ? [...this.rates] : [1]; }

  getDuration(): number | null {
    try {
      const d = this.player?.getDuration() ?? 0;
      return d > 0 ? d * 1000 : null;
    } catch {
      return null;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopPolling();
    try { this.player?.destroy(); } catch { /* egal */ }
    this.player = null;
    this.host.remove();
    this.container.replaceChildren();
    this.clearListeners();
  }
}
