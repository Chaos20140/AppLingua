import { test, expect, onboard, waitForStored } from './fixtures';
import { exerciseRegion, playOneExercise, stableScope } from './exercises';

/** Rauchtests der übrigen Bereiche – jeweils frisch onboardet im lokalen Modus. */
test.beforeEach(async ({ page }) => {
  await onboard(page);
});

test('Grammatikzentrum: Thema öffnen und Stufe-1-Übungen spielen', async ({ page }) => {
  // Onboarding + zwei Übungen: in der vollen Suite (WebKit-Emulation unter Last) > 120 s beobachtet.
  test.setTimeout(180_000);
  await page.goto('/grammatik');
  await expect(page.getByRole('heading', { level: 1, name: 'Grammatik' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Grammatik durchsuchen' }).fill('usted');
  await page.getByRole('link', { name: /Du oder Sie\? – tú, usted & Begrüßungen/ }).first().click();
  await expect(page).toHaveURL(/\/grammatik\/es\.g\.formality$/);
  await expect(page.getByRole('heading', { level: 1, name: /Du oder Sie\?/ })).toBeVisible();

  await page.getByRole('button', { name: /^Stufe 1 starten:/ }).click();
  const main = page.getByRole('main');
  const exercise = exerciseRegion(page, main);
  for (let i = 0; i < 2; i++) {
    await expect(exercise.first()).toBeVisible();
    await playOneExercise(page, await stableScope(main, exercise.first()));
  }
});

test('Aussprache-Labor ohne Mikrofon: ehrlicher Fallback', async ({ page, context }) => {
  // Kein Mikrofon-Zugriff gewährt → Spracherkennung/Aufnahme dürfen nichts versprechen.
  await context.clearPermissions();
  await page.goto('/aussprache');
  await expect(page.getByRole('heading', { level: 1, name: 'Aussprache' })).toBeVisible();
  await expect(page.getByText('So wird bewertet: Verständlichkeit laut Spracherkennung')).toBeVisible();
  await expect(page.getByText(/keine phonetische Analyse/).first()).toBeVisible();

  await page.getByRole('link', { name: /^Vokale: \d+ Übungen/ }).click();
  const item = page.getByRole('article').first();
  await expect(item).toBeVisible();
  const listenOnly = item.getByRole('radio', { name: 'Ohne Mikro' });
  if (await listenOnly.count()) await listenOnly.click();
  await item.getByRole('button', { name: 'Vorbild hören & nachsprechen' }).click();
  await item.getByRole('group', { name: 'Selbsteinschätzung' }).getByRole('button', { name: 'Fast wie das Vorbild' }).click();
  await expect(item.getByRole('progressbar', { name: 'Selbsteinschätzung' })).toBeVisible();
});

test('KI-Partner offline: geführter Dialog mit zwei Zügen und Auswertung', async ({ page }) => {
  await page.goto('/partner');
  await expect(page.getByText('Geführter Offline-Dialog').first()).toBeVisible();
  await expect(page.getByText(/KI-Funktionen sind in dieser Version nicht eingerichtet/).first()).toBeVisible();
  await page.getByRole('button', { name: /^Informell Geführter Dialog/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Gespräch starten' }).click();
  await expect(page).toHaveURL(/\/partner\/.+/);

  const input = page.getByRole('textbox', { name: 'Deine Antwort' });
  const log = page.getByRole('log', { name: 'Gesprächsverlauf' });
  const typing = page.getByRole('status', { name: /schreibt …$/ });
  for (const reply of ['Hola, me llamo Alex.', 'Soy de Alemania.']) {
    await expect(typing).toBeHidden();
    await input.fill(reply);
    await page.getByRole('button', { name: 'Senden' }).click();
    await expect(log).toContainText(reply);
  }
  await expect(typing).toBeHidden();
  await page.getByRole('button', { name: /^(Auswertung|Beenden)$/ }).first().click();
  const main = page.getByRole('main');
  await expect(main.getByText('Einfache Offline-Auswertung (regelbasiert, ohne KI)', { exact: false })).toBeVisible();
  await expect(main.getByText(/^\+\d+ XP/).first()).toBeVisible();
  await expect(main.getByRole('listitem').filter({ hasText: 'Soy de Alemania.' }).first()).toBeVisible();
});

test('Wiederholung: eigene Karte anlegen und wiederholen', async ({ page }) => {
  await page.goto('/wiederholung');
  await expect(page.getByRole('heading', { level: 2, name: 'Alles wiederholt' })).toBeVisible();

  await page.goto('/vokabeln');
  await page.getByRole('main').getByRole('button', { name: 'Eigene Karte anlegen' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Zielsprache').fill('la playa');
  await sheet.getByLabel('Deutsch', { exact: true }).fill('der Strand');
  await sheet.getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('main').getByText('la playa').first()).toBeVisible();

  await page.goto('/wiederholung');
  await page.getByRole('button', { name: /Jetzt wiederholen|Los geht/ }).first().click();
  // Herkunft der Karte ohne Doppelung („Eigene Karte · Eigene Karte“ war ein Fehler)
  await expect(page.getByText('Eigene Karte', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Eigene Karte · Eigene Karte/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Antwort zeigen', exact: true }).click();
  await expect(page.getByText('der Strand').first()).toBeVisible();
  await page.getByRole('button', { name: /^Gut/ }).click();
  await expect(page.getByText(/1 Karte · 1 gewusst|1 von 1 richtig/).first()).toBeVisible();
});

test('Prüfungen-Hub, Erfolge und Statistik', async ({ page }) => {
  await page.goto('/pruefungen');
  await expect(page.getByRole('heading', { level: 1, name: 'Prüfungen & Boss' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Überblick' })).toContainText(/0\s*bestanden/);
  await expect(page.getByRole('link', { name: /^Abschlussprüfung Stufe 0/ })).toBeVisible();

  await page.goto('/erfolge');
  await expect(page.getByRole('heading', { level: 1, name: 'Erfolge' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Abzeichen gesammelt' })).toBeVisible();
  await page.getByRole('tab', { name: 'Level-Leiter' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Level-Leiter' })).toBeVisible();

  await page.goto('/statistik');
  await expect(page.getByRole('heading', { level: 1, name: 'Statistik' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Zwei Arten von Fortschritt' })).toContainText('Spielerlevel');
  await expect(page.getByRole('region', { name: 'Kompetenzen' })).toBeVisible();
});

test('Einstellungen: Design dunkel wird angewendet und bleibt erhalten', async ({ page }) => {
  await page.goto('/einstellungen');
  const design = page.getByRole('radiogroup', { name: 'Design' });
  await design.getByRole('radio', { name: 'Dunkel' }).click();
  await expect(design.getByRole('radio', { name: 'Dunkel' })).toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const dark = await bg();
  // dunkler Hintergrund: Helligkeit der RGB-Komponenten gering
  const [r, g, b] = (dark.match(/\d+/g) ?? []).map(Number);
  expect((r + g + b) / 3).toBeLessThan(80);

  await waitForStored(page, 'settings', '"theme":"dark"');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await design.getByRole('radio', { name: 'Hell' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('Auth-Seiten: ehrlicher Hinweis im lokalen Modus', async ({ page }) => {
  // Lokaler Modus: Die Supabase-Bibliothek wird nie geladen (dynamischer Import nur mit Konfiguration).
  const supabaseRequests: string[] = [];
  page.on('request', (r) => { if (/\/assets\/(vendor-supabase|supabaseAdapter)-/.test(r.url())) supabaseRequests.push(r.url()); });
  const notice = /Konten sind in dieser Version noch nicht verfügbar, weil die Cloud noch nicht eingerichtet ist/;
  for (const [path, title] of [['/anmelden', 'Anmelden'], ['/registrieren', 'Konto erstellen'], ['/passwort-vergessen', 'Passwort vergessen']] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('main').getByRole('status')).toHaveText(notice);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Im lokalen Modus weiterlernen' })).toBeVisible();
  }
  await page.getByRole('link', { name: 'Im lokalen Modus weiterlernen' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(supabaseRequests).toEqual([]);
});
