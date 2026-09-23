import { defineConfig, devices } from '@playwright/test';

/**
 * E2E-Tests gegen den Produktions-Build (inkl. Service Worker).
 * iPhone-Profile laufen in WebKit (Safari-Engine).
 *
 * Eigener Build-Ordner und eigener Port: Ein paralleles `npm run build` (leert dist/) oder ein
 * anderes `vite preview` auf dem Standardport 4173 würde sonst laufende Tests mit 404ern stören
 * bzw. einen fremden Stand testen.
 */
const PORT = 4317;
const OUT_DIR = 'node_modules/.cache/e2e-dist';
export default defineConfig({
  testDir: 'e2e',
  // WebKit-Emulation (iPhone-Profile) ist unter Last deutlich langsamer als Chromium – Onboarding allein kann 30 s+ dauern.
  timeout: 120_000,
  // großzügig: WebKit-Emulation auf ausgelasteten Rechnern braucht für den ersten Inhalts-Chunk länger
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'iphone-15', use: { ...devices['iPhone 15'] } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'] } },
    { name: 'iphone-15-pro-max', use: { ...devices['iPhone 15 Pro Max'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npx vite build --outDir ${OUT_DIR} --emptyOutDir && npx vite preview --outDir ${OUT_DIR} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
