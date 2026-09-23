import { test, expect, onboard, navigateTo, switchCourse } from './fixtures';

/*
 * Nur in Chromium: Playwrights WebKit-Build (insbesondere unter Windows/Linux) bedient Offline-
 * Navigationen nicht aus dem Service Worker – `page.reload()` endet dort mit „WebKit encountered an
 * internal error“, obwohl der Service Worker aktiv ist. Das ist eine Grenze der Testumgebung, nicht
 * der App (Safari auf iOS nutzt denselben Workbox-Precache). Die Offline-Logik der App selbst
 * (Precache, navigateFallback, Offline-Hinweis) ist browserunabhängig.
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'Service-Worker-Offline-Navigation in Playwright-WebKit nicht zuverlässig');

test('Offline: nach dem ersten Laden startet die App ohne Netz, Lernpfad und Lektion funktionieren', async ({ page, context }) => {
  test.setTimeout(120_000);
  await onboard(page);

  // Service Worker aktiv = Precache vollständig installiert.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.active?.state))).toBe('activated');

  await context.setOffline(true);
  // Bewusst ohne Ausnahme im Konsolen-Wächter: Auch offline darf die App keine Fehler loggen.

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Start' })).toBeVisible();
  await expect(page.getByText('Offline – du kannst weiterlernen, alles wird lokal gespeichert.')).toBeVisible();

  await navigateTo(page, 'Lernpfad');
  await expect(page.getByRole('heading', { level: 1, name: 'Lernpfad' })).toBeVisible();
  await page.getByRole('link', { name: /^Lektion: Hola – begrüßen & verabschieden\. verfügbar\./ }).click();
  await expect(page).toHaveURL(/\/lektion\/es\.s0\.l01$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Hola – begrüßen & verabschieden' })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page.getByText(/^Schritt 2 von 8/)).toBeVisible();
  await expect(page.getByText('Offline – du kannst weiterlernen, alles wird lokal gespeichert.')).toBeVisible();

  // Wieder online → kurzer Hinweis
  await context.setOffline(false);
  await expect(page.getByText('Wieder online')).toBeVisible();
});

test('Offline: Portugiesisch (nicht im Precache) ist nach einmaligem Öffnen offline verfügbar', async ({ page, context }) => {
  test.setTimeout(120_000);
  await onboard(page);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.active?.state))).toBe('activated');

  await switchCourse(page, 'Portugiesisch');
  // Runtime-Cache „course-content“ (src/app/useOfflineWarmup.ts) enthält den pt-BR-Chunk.
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open('course-content');
    return (await cache.keys()).some((r) => /\/assets\/pt-BR-[\w-]+\.js$/.test(new URL(r.url).pathname));
  }), { message: 'pt-BR-Kurs im Cache „course-content“' }).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Offline – du kannst weiterlernen, alles wird lokal gespeichert.')).toBeVisible();
  await navigateTo(page, 'Lernpfad');
  await expect(page.getByText(/^Portugiesisch – deine Reise/)).toBeVisible();
  const first = page.getByRole('main').getByRole('link', { name: /^Lektion: .*verfügbar\./ }).first();
  await expect(first).toHaveAttribute('href', /\/lektion\/pt\./);
  await first.click();
  await expect(page).toHaveURL(/\/lektion\/pt\./);
  await expect(page.getByRole('main').getByRole('button', { name: 'Los geht’s' })).toBeVisible();
  await context.setOffline(false);
});
