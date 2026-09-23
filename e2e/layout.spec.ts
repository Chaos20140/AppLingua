import { test, expect, onboard } from './fixtures';

/**
 * iPhone-Layout: kein horizontales Überlaufen, Bottom-Navigation mit Touch-Zielen ≥ 44 px und
 * Eingabefelder ≥ 16 px Schrift (sonst zoomt iOS Safari beim Fokussieren hinein).
 */
const ROUTES = [
  '/dashboard', '/lernpfad', '/lernpfad/stage0', '/lektion/es.s0.l01', '/songs', '/songs/song.es.buenos-dias',
  '/songs/song.es.buenos-dias/spielen?modus=mitlesen', '/songs/eigener-text', '/ueben', '/grammatik', '/grammatik/es.g.formality',
  '/aussprache', '/vokabeln', '/wiederholung', '/partner', '/pruefungen', '/erfolge', '/statistik', '/profil',
  '/einstellungen', '/fehlerarchiv', '/datenschutz', '/rechtliches', '/anmelden', '/registrieren',
];

test.describe('iPhone-Layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'nur für iPhone-Profile');

  test('Hauptrouten: kein horizontales Überlaufen, Eingaben ≥ 16 px', async ({ page }, testInfo) => {
    // Das iPhone SE ist das schmalste Profil (375 px) – was dort passt, passt auch auf den größeren.
    test.skip(testInfo.project.name !== 'iphone-se', 'Routen-Durchlauf nur im schmalsten Profil');
    test.setTimeout(240_000);
    await onboard(page);
    const problems: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      // Späte Inhalte (Lazy-Chunks, Bilder) und Einblend-Animationen abwarten, ohne feste Wartezeit.
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => Promise.all(document.getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined))));
      const m = await page.evaluate(() => {
        const vw = window.innerWidth;
        const doc = document.documentElement;
        const offenders = [...document.querySelectorAll<HTMLElement>('body *')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed';
          })
          .slice(0, 3)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} (${Math.round(el.getBoundingClientRect().right)}px)`);
        const smallInputs = [...document.querySelectorAll<HTMLElement>('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]), textarea, select')]
          .filter((el) => el.getClientRects().length > 0 && parseFloat(getComputedStyle(el).fontSize) < 16)
          .map((el) => `${el.tagName.toLowerCase()}[${el.getAttribute('aria-label') ?? el.getAttribute('name') ?? el.id}] ${getComputedStyle(el).fontSize}`);
        return { scrollWidth: doc.scrollWidth, innerWidth: vw, offenders, smallInputs };
      });
      if (m.scrollWidth > m.innerWidth) problems.push(`${route}: scrollWidth ${m.scrollWidth} > ${m.innerWidth} – ${m.offenders.join(', ')}`);
      if (m.smallInputs.length) problems.push(`${route}: Eingabe < 16px – ${m.smallInputs.join(', ')}`);
    }
    await testInfo.attach('layout-probleme', { body: problems.join('\n') || 'keine' });
    expect(problems).toEqual([]);
  });

  test('Bottom-Navigation: sichtbar, 5 Einträge inkl. „Songs“, Touch-Ziele ≥ 44 px', async ({ page }) => {
    await onboard(page);
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    await expect(nav).toBeVisible();
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(5);
    await expect(links).toHaveText([/Start/, /Lernpfad/, /Songs/, /Üben/, /Profil/]);
    const vh = page.viewportSize()!.height;
    for (const link of await links.all()) {
      const box = (await link.boundingBox())!;
      expect(box.height, `${await link.innerText()}: Höhe`).toBeGreaterThanOrEqual(44);
      expect(box.width, `${await link.innerText()}: Breite`).toBeGreaterThanOrEqual(44);
      expect(box.y + box.height, 'innerhalb des sichtbaren Bereichs').toBeLessThanOrEqual(vh);
    }
    await nav.getByRole('link', { name: 'Songs' }).click();
    await expect(page).toHaveURL(/\/songs$/);
    await expect(nav.getByRole('link', { name: 'Songs' })).toHaveAttribute('aria-current', 'page');

    // Auch auf Unterseiten bleibt die Navigation erreichbar.
    await page.goto('/grammatik/es.g.formality');
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Üben' })).toHaveAttribute('aria-current', 'page');
  });
});
