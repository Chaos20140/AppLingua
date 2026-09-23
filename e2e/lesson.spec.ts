import { test, expect, onboard, switchCourse, waitForStored } from './fixtures';
import { playLesson } from './exercises';

/**
 * Kernablauf 2 + 4: Lektion durchspielen, Fortschritt übersteht Reload – und bleibt bei Kurs- und
 * Variantenwechsel unverändert (echter Fortschritt statt künstlich eingespielter Daten).
 */
test('Lektion es.s0.l01 komplett durchspielen – Fortschritt übersteht Reload und Kurswechsel', async ({ page }) => {
  test.setTimeout(420_000);
  await onboard(page);
  await page.getByRole('link', { name: 'Lektion starten' }).click();
  await expect(page).toHaveURL(/\/lektion\/es\.s0\.l01$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Hola – begrüßen & verabschieden' })).toBeVisible();

  const stats = await playLesson(page);
  expect(stats.exercises).toBeGreaterThanOrEqual(10);
  // Falsche Antworten blockieren nie und zeigen die fünfteilige Erklärung.
  expect(stats.wrong).toBeGreaterThan(0);
  expect(stats.explanationsChecked).toBe(stats.wrong);

  // Ergebnis mit XP
  const main = page.getByRole('main');
  await expect(main.getByText('Neu abgeschlossen')).toBeVisible();
  // Kachel „+N“ · „XP (inkl. M Lektion)“
  const xpTile = main.locator('div').filter({ has: page.getByText(/^XP \(inkl\. \d+ Lektion\)$/) }).last();
  const lessonXp = Number(/^\+(\d+)$/.exec(await xpTile.getByText(/^\+\d+$/).innerText())?.[1]);
  expect(lessonXp).toBeGreaterThan(0);
  await expect(main.getByRole('link', { name: 'Weiter: Laute & Alphabet' })).toBeVisible();

  // Reload: Fortschritt kommt aus IndexedDB zurück.
  await waitForStored(page, 'lessonProgress', '"lessonId":"es.s0.l01"');
  await page.reload();
  await expect(page.getByText(/Bereits abgeschlossen · Bestwert \d+ %/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lektion wiederholen' })).toBeVisible();

  await page.goto('/lernpfad');
  await expect(page.getByText(/^1 von \d+ Lektionen geschafft$/)).toBeVisible();
  await expect(page.getByRole('link', { name: /^Lektion: Hola – begrüßen & verabschieden\. abgeschlossen\./ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Lektion: Laute & Alphabet\. verfügbar\./ })).toBeVisible();

  await page.goto('/statistik');
  const totalXp = Number(/(\d+) XP gesammelt/.exec(await page.getByText(/\d+ XP gesammelt/).innerText())?.[1]);
  expect(totalXp).toBeGreaterThanOrEqual(lessonXp);

  await test.step('Kurswechsel auf Portugiesisch: getrennter Lernpfad', async () => {
    await page.goto('/dashboard');
    await switchCourse(page, 'Portugiesisch');
    await page.goto('/lernpfad');
    await expect(page.getByText(/^Portugiesisch – deine Reise/)).toBeVisible();
    await expect(page.getByText(/^0 von \d+ Lektionen geschafft$/)).toBeVisible();
    const lessons = page.getByRole('main').getByRole('link', { name: /^Lektion: / });
    await expect(lessons.first()).toHaveAttribute('href', /\/lektion\/pt\./);
    await expect(page.getByRole('link', { name: /Hola – begrüßen & verabschieden/ })).toHaveCount(0);
  });

  await test.step('Zurück zu Spanisch: Fortschritt unverändert', async () => {
    await page.goto('/dashboard');
    await switchCourse(page, 'Spanisch');
    await page.goto('/lernpfad');
    await expect(page.getByText(/^Spanisch – deine Reise/)).toBeVisible();
    await expect(page.getByText(/^1 von \d+ Lektionen geschafft$/)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Lektion: Hola – begrüßen & verabschieden\. abgeschlossen\./ })).toBeVisible();
  });

  await test.step('Variante Spanien ⇄ Lateinamerika umschalten', async () => {
    await page.goto('/einstellungen');
    const variant = page.getByRole('radiogroup', { name: 'Spanisch-Variante' });
    await variant.getByRole('radio', { name: /Spanien/ }).click();
    await expect(variant.getByRole('radio', { name: /Spanien/ })).toBeChecked();
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Aktiver Kurs: Spanisch (Spanien). Kurs wechseln' })).toBeVisible();
    await page.goto('/lernpfad');
    await expect(page.getByText(/^1 von \d+ Lektionen geschafft$/)).toBeVisible();

    await page.goto('/einstellungen');
    await variant.getByRole('radio', { name: /Lateinamerika/ }).click();
    await expect(variant.getByRole('radio', { name: /Lateinamerika/ })).toBeChecked();
    await waitForStored(page, 'settings', '"esVariant":"es-LA"');
    await page.reload();
    await expect(variant.getByRole('radio', { name: /Lateinamerika/ })).toBeChecked();
    await page.goto('/dashboard');
    await expect(page.getByRole('button', { name: 'Aktiver Kurs: Spanisch (Lateinamerika). Kurs wechseln' })).toBeVisible();
  });
});
