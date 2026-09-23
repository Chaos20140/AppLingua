import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * Gemeinsame E2E-Bausteine: Konsolen-Wächter, Onboarding und Navigation.
 *
 * Jeder Test sammelt console.error und pageerror. Am Testende müssen alle Meldungen
 * leer sein – außer sie stehen in KNOWN_HARMLESS oder der Test erlaubt sie gezielt
 * (errorGuard.allow) mit Begründung.
 */

/** Bekannte, harmlose Meldungen – jeweils mit Begründung. */
const KNOWN_HARMLESS: RegExp[] = [
  // (derzeit keine) – neue Einträge nur mit Begründung ergänzen.
];

export type ErrorGuard = {
  /** Erlaubt Meldungen, die im aktuellen Test erwartet sind (z. B. Netzfehler im Offline-Test). */
  allow: (re: RegExp) => void;
  /** Bisher gesammelte Meldungen (für Diagnosen). */
  messages: () => string[];
};

export const test = base.extend<{ errorGuard: ErrorGuard }>({
  errorGuard: [
    async ({ page }, use) => {
      const messages: string[] = [];
      const allowed = [...KNOWN_HARMLESS];
      page.on('console', (m) => {
        if (m.type() === 'error') messages.push(`console.error: ${m.text()}`);
      });
      page.on('pageerror', (e) => messages.push(`pageerror: ${e.name}: ${e.message}`));
      await use({ allow: (re) => void allowed.push(re), messages: () => [...messages] });
      const unexpected = messages.filter((msg) => !allowed.some((re) => re.test(msg)));
      expect(unexpected, 'unerwartete Konsolenfehler').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Wartet, bis ein Datensatz dauerhaft in IndexedDB (DB „applingua“, Store „records“) steht.
 * Die App speichert asynchron (Microtask → IDB-Transaktion); ein Reload direkt nach einer Aktion
 * kann eine noch offene Transaktion abbrechen. Unter Last dauert das Commit in WebKit spürbar –
 * erst danach ist „übersteht Reload“ aussagekräftig. `needle` muss im JSON des Datensatzes vorkommen.
 */
export async function waitForStored(page: Page, collection: string, needle: string): Promise<void> {
  await expect.poll(() => page.evaluate(({ collection, needle }) => new Promise<boolean>((resolve) => {
    const req = indexedDB.open('applingua');
    req.onerror = () => resolve(false);
    req.onsuccess = () => {
      const db = req.result;
      const all = db.transaction('records').objectStore('records').getAll();
      all.onerror = () => { db.close(); resolve(false); };
      all.onsuccess = () => {
        db.close();
        resolve((all.result as { collection: string; deleted?: boolean }[])
          .some((r) => r.collection === collection && !r.deleted && JSON.stringify(r).includes(needle)));
      };
    };
  }), { collection, needle }), { message: `${collection} mit „${needle}“ in IndexedDB` }).toBe(true);
}

/** Wählt eine visuell gestaltete Radio-Option über ihr Label (das Input liegt darunter). */
export async function choose(page: Page, name: RegExp): Promise<void> {
  const radio = page.getByRole('radio', { name });
  await page.locator('label').filter({ has: radio }).click();
  await expect(radio).toBeChecked();
}

export type OnboardOptions = { variant?: 'es-LA' | 'es-ES'; name?: string };

/**
 * Onboarding über die echte Oberfläche: Spanisch → Variante → Vorkenntnisse → Tagesziel
 * → Name → Einstufung überspringen → lokaler Modus → Dashboard.
 */
export async function onboard(page: Page, { variant = 'es-LA', name = 'Alex' }: OnboardOptions = {}): Promise<void> {
  await page.goto('/');
  await expect(page).toHaveURL(/\/willkommen$/);
  await page.getByRole('button', { name: 'Mit Spanisch starten' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  const step = (title: string) => expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
  const next = () => page.getByRole('button', { name: 'Weiter', exact: true }).click();

  await step('Welche Sprache möchtest du lernen?');
  await choose(page, /^Spanisch/);
  await next();

  await step('Welches Spanisch passt zu dir?');
  await choose(page, variant === 'es-ES' ? /^Spanien/ : /^Lateinamerika/);
  await next();

  await step('Wie viel kannst du schon?');
  await expect(page.getByRole('button', { name: 'Bitte wähle deine Vorkenntnisse' })).toBeDisabled();
  await choose(page, /^Ich kenne schon etwas/);
  await next();

  await step('Wie viel Zeit möchtest du täglich investieren?');
  await choose(page, /^Ernsthaft/);
  await next();

  await step('Wie dürfen wir dich nennen?');
  await page.getByLabel('Dein Vorname (optional)').fill(name);
  await next();

  await step('Wo möchtest du einsteigen?');
  await page.getByRole('button', { name: 'Überspringen – bei Stufe 0 beginnen' }).click();

  await step('Dein Fortschritt bleibt auf diesem Gerät');
  await expect(page.getByText('Lokaler Modus', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Start' })).toBeVisible();
}

/** Hauptnavigation: Bottom-Navigation (Mobil) bzw. Seitenleiste (Desktop). */
export function mainNav(page: Page): Locator {
  return page.getByRole('navigation', { name: /^(Hauptnavigation|Bereiche)$/ }).filter({ visible: true });
}

export async function navigateTo(page: Page, label: string): Promise<void> {
  await mainNav(page).getByRole('link', { name: label, exact: true }).click();
}

/** Kurswechsel über den Kurs-Schalter in der Kopfzeile. */
export async function switchCourse(page: Page, course: 'Spanisch' | 'Portugiesisch'): Promise<void> {
  await page.getByRole('button', { name: /^Aktiver Kurs:/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Kurs wechseln' });
  await dialog.getByRole('button', { name: new RegExp(`^${course}`) }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: new RegExp(`^Aktiver Kurs: ${course}`) })).toBeVisible();
}
