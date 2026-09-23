import { test, expect, onboard, switchCourse } from './fixtures';

/**
 * Rauchtest Lernpfad A1: Spanisch zeigt alle fünf A1-Kapitel samt Zwischentests, Abschlussprüfung
 * und Endgegner; Portugiesisch zeigt die ersten zwei A1-Kapitel mit Lektionen – der Rest ist
 * ehrlich als „folgt in einem Update“ gekennzeichnet.
 */
test('Lernpfad A1: Spanisch mit Kapiteln 1–5 und Boss, Portugiesisch mit Kapiteln 1–2', async ({ page }) => {
  test.setTimeout(180_000);
  await onboard(page);

  await test.step('Spanisch A1', async () => {
    await page.goto('/lernpfad');
    const a1 = page.getByRole('main').getByRole('region', { name: 'Mein Alltag auf Spanisch' });
    await expect(a1.getByRole('heading', { level: 3 })).toHaveText([
      'Mein Leben',
      'Unterwegs in der Stadt',
      'Essen, Einkaufen & Preise',
      'Freizeit, Wetter & Verabredungen',
      'Wohnen & Beschreiben',
      'Abschlussprüfung & Endgegner',
    ]);
    // Frisch onboardet: A1 ist noch gesperrt – alle Knoten sind Sperr-Buttons mit Hinweis.
    await expect(a1.getByRole('button', { name: /^Lektion: / })).toHaveCount(16);
    await expect(a1.getByRole('button', { name: /^Zwischentest: / })).toHaveCount(5);
    await expect(a1.getByRole('button', { name: /^Abschlussprüfung A1\. gesperrt\./ })).toBeVisible();
    const boss = a1.getByRole('button', { name: /^Endgegner: La Reina del Mercado\. gesperrt\./ });
    await expect(boss).toBeVisible();
    await expect(a1.getByText(/folg(t|en) in einem Update/)).toHaveCount(0);

    await boss.click();
    const sheet = page.getByRole('dialog', { name: 'Was fehlt noch?' });
    await expect(sheet).toContainText('Stufe 0');
    await sheet.getByRole('button', { name: 'Verstanden' }).click();
    await expect(sheet).toBeHidden();
  });

  await test.step('Portugiesisch A1 (begonnen)', async () => {
    await page.goto('/dashboard');
    await switchCourse(page, 'Portugiesisch');
    await page.goto('/lernpfad');
    const a1 = page.getByRole('main').getByRole('region', { name: 'Alltag in Brasilien' });
    await expect(a1.getByRole('heading', { level: 3 })).toHaveText([
      'Família & Zuhause',
      'Mein Tag',
      'Essen, Trinken & Einkaufen',
      'Unterwegs & Pläne',
      'Abschlussprüfung & Endgegner',
    ]);
    await expect(a1.getByRole('button', { name: /^Lektion: / })).toHaveCount(6);
    await expect(a1.getByRole('button', { name: /^Lektion: Minha família – meine Familie\. gesperrt\./ })).toBeVisible();
    await expect(a1.getByRole('button', { name: /^Zwischentest: / })).toHaveCount(2);
    await expect(a1.getByText('Dieses Kapitel ist geplant – die Lektionen folgen in einem Update.')).toHaveCount(2);
    await expect(a1.getByText('Abschlussprüfung und Endgegner dieser Etappe folgen in einem Update.')).toBeVisible();
    await expect(a1.getByRole('button', { name: /^(Abschlussprüfung|Endgegner)/ })).toHaveCount(0);
  });
});
