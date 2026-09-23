import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Basis-Pfad (GitHub Pages: z. B. VITE_BASE_PATH=/AppLingua/). */
function normalizeBase(raw: string | undefined): string {
  let base = (raw ?? '/').trim() || '/';
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

const base = normalizeBase(process.env.VITE_BASE_PATH);

/**
 * CSP für den Build (Meta-Tag). Quellen: YouTube-IFrame-API (www.youtube.com inkl. /s/player/…,
 * Player auf youtube-nocookie.com), Spotify-iFrame-API (Lader auf open.spotify.com lädt das
 * eigentliche Skript von embed-cdn.spotifycdn.com), Apple-Music-Embed, Supabase (https + wss).
 * frame-ancestors wirkt nur als HTTP-Header (vercel.json / netlify.toml), nicht im Meta-Tag.
 * Änderungen hier auch in vercel.json und netlify.toml übernehmen (scripts/postbuild.mjs prüft das).
 * `extraConnect`: Origin einer eigenen Supabase-URL (z. B. eigene Domain), falls nicht *.supabase.co.
 */
const contentSecurityPolicyFor = (extraConnect: string[] = []) => [
  "default-src 'self'",
  "script-src 'self' https://www.youtube.com https://s.ytimg.com https://open.spotify.com https://embed-cdn.spotifycdn.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://i.ytimg.com https://*.scdn.co https://*.mzstatic.com",
  "media-src 'self' blob:",
  ['connect-src', "'self'", 'https://*.supabase.co', 'wss://*.supabase.co', ...extraConnect].join(' '),
  "frame-src https://www.youtube-nocookie.com https://open.spotify.com https://embed.music.apple.com",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** Origin der konfigurierten Supabase-URL (https/wss), sofern sie nicht schon abgedeckt ist. */
function supabaseConnectSources(raw: string | undefined): string[] {
  try {
    const u = new URL((raw ?? '').trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return [];
    if (u.protocol === 'https:' && u.hostname.endsWith('.supabase.co')) return [];
    return [u.origin, `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}`];
  } catch {
    return [];
  }
}

/**
 * Supabase konfiguriert? Gleiche Kriterien wie `cloudConfigured` in src/data/supabase.ts.
 * Wird in configResolved gesetzt (dort sind auch .env-Dateien geladen).
 */
let cloudBuild = false;
function isCloudConfigured(env: Record<string, string | undefined>): boolean {
  const url = (env.VITE_SUPABASE_URL ?? '').trim();
  const key = (env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  try {
    const u = new URL(url);
    return Boolean(key) && (u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

/**
 * Content-Security-Policy nur im Produktions-Build einsetzen: Der Dev-Server (HMR, React-Refresh)
 * braucht Inline-Skripte und WebSocket-Verbindungen, die die strenge Policy blockieren würde.
 */
function contentSecurityPolicy(): Plugin {
  let extraConnect: string[] = [];
  return {
    name: 'applingua:csp',
    configResolved(config) {
      extraConnect = supabaseConnectSources(config.env.VITE_SUPABASE_URL as string | undefined);
      cloudBuild = isCloudConfigured(config.env as Record<string, string | undefined>);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const meta = ctx.server
          ? ''
          : `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicyFor(extraConnect)}" />`;
        return html.replace('<!--app:csp-->', meta);
      },
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    contentSecurityPolicy(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false, // Registrierung über useRegisterSW (src/app/UpdatePrompt.tsx)
      includeAssets: ['icon.svg', 'robots.txt', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'],
      manifest: {
        id: base,
        name: 'AppLingua',
        short_name: 'AppLingua',
        description: 'Gamifizierter Sprachcoach für Spanisch und brasilianisches Portugiesisch – mit Lektionen, Aussprache-Training, Songs und KI-Gesprächspartner.',
        lang: 'de',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        theme_color: '#0D111D',
        background_color: '#0D111D',
        categories: ['education', 'music'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico,txt,webmanifest}'],
        // Precache = App-Shell + Spanisch (Standardkurs) + Songs. Der Portugiesisch-Chunk (~560 KB)
        // kommt per Runtime-Cache dazu, sobald er geladen wird – src/app/useOfflineWarmup.ts lädt den
        // aktiven Kurs nach dem Start im Hintergrund vor und legt ihn in diesen Cache.
        globIgnores: ['**/assets/pt-BR-*.js'],
        // Ohne Supabase-Konfiguration wird @supabase/supabase-js nie geladen (dynamischer Import in
        // src/data/supabase.ts) → nicht vorab cachen. Mit Cloud bleibt es im Precache (Sitzung offline).
        manifestTransforms: [
          async (entries) => ({
            manifest: cloudBuild ? entries : entries.filter((e) => !/(^|\/)assets\/vendor-supabase-[\w-]+\.js$/.test(e.url)),
            warnings: [],
          }),
        ],
        navigateFallback: 'index.html',
        // Dateien (z. B. /robots.txt) nie durch die App-Shell ersetzen.
        navigateFallbackDenylist: [/\/[^/?]+\.[^/?]+$/],
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // Kurs-Chunks außerhalb des Precache (Dateinamen mit Hash → unveränderlich, CacheFirst ist sicher).
            // Muster synchron halten mit CONTENT_CHUNK in src/app/useOfflineWarmup.ts (Funktion wird serialisiert).
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/pt-BR-[\w-]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'course-content',
              // Alte Versionen (anderer Hash) fallen nach Updates heraus.
              expiration: { maxEntries: 4, maxAgeSeconds: 180 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [200] },
              // Vorgewärmte Einträge (CACHE_URLS, ohne Origin-Header) sollen auch Modul-Anfragen (mit Origin)
              // bedienen, selbst wenn der Server „Vary: Origin“ sendet.
              matchOptions: { ignoreVary: true },
            },
          },
          {
            // Vorschaubilder offizieller YouTube-Einbettungen (nur nach Einwilligung geladen).
            urlPattern: ({ url }) => url.origin === 'https://i.ytimg.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'yt-thumbnails',
              expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020', // Safari 15+
    cssTarget: 'safari15',
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Selten geänderte Bibliotheken separat → nach App-Updates bleiben sie im Cache.
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              priority: 20,
            },
            { name: 'vendor-supabase', test: /[\\/]node_modules[\\/]@supabase[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
});
