import { test, expect, onboard, navigateTo, waitForStored } from './fixtures';

const SONG = 'Buenos días, ciudad';

test('Songs: Mitlesen, Wort erklären, Vokabel merken, Favorit & Playlist bleiben nach Reload', async ({ page }) => {
  test.setTimeout(150_000);
  await onboard(page);
  await navigateTo(page, 'Songs');
  await expect(page).toHaveURL(/\/songs$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Songs' })).toBeVisible();

  await page.getByRole('link', { name: SONG, exact: true }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: SONG })).toBeVisible();

  // Modus „Mitlesen“: Play/Pause bedienbar (ohne Audio-Assertions)
  await page.getByRole('link', { name: 'Modus 2: Mitlesen' }).click();
  await expect(page).toHaveURL(/\/songs\/song\.es\.buenos-dias\/spielen\?modus=mitlesen$/);
  const main = page.getByRole('main');
  const play = main.getByRole('button', { name: 'Abspielen' });
  await expect(play).toBeEnabled();
  await play.click();
  const pause = main.getByRole('button', { name: 'Pause', exact: true });
  const noAudio = main.getByRole('alert').filter({ hasText: 'Web Audio fehlt' });
  await expect(pause.or(noAudio).first()).toBeVisible();
  if (await noAudio.isVisible()) {
    // Playwright-WebKit unter Windows hat weder Web Audio noch Sprachausgabe (echtes iOS-Safari schon):
    // Dann muss der ehrliche Ausweg funktionieren – der Schritt-Modus.
    await noAudio.getByRole('button', { name: 'Schritt-Modus nutzen' }).click();
    await expect(noAudio).toBeHidden();
    await expect(main.getByRole('button', { name: /^Zeile vor/ }).first()).toBeEnabled();
  } else {
    await pause.click();
    await expect(play).toBeVisible();
  }

  // Wort antippen → Aktionsmenü → „Was bedeutet das?“ (eingebaute Offline-Erklärung)
  await main.getByRole('button', { name: 'ventana', exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: /ventana/ });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Was bedeutet das?' }).click();
  await expect(sheet.getByText('Offline-Erklärung', { exact: true })).toBeVisible();
  await expect(sheet.getByRole('heading', { level: 4, name: 'Natürliche Bedeutung' })).toBeVisible();
  await expect(sheet.getByText('Fenster', { exact: true })).toBeVisible();
  // Ohne Supabase/KI: ehrlicher Hinweis statt stiller Fehler
  await expect(sheet.getByText(/KI-Funktionen sind in dieser Version nicht eingerichtet/)).toBeVisible();

  // „Zur Vokabelliste hinzufügen“ → Karte erscheint in /vokabeln
  await sheet.getByRole('button', { name: 'Alle Aktionen' }).click();
  await sheet.getByRole('button', { name: 'Zur Vokabelliste hinzufügen' }).click();
  await expect(sheet.getByLabel('Wort')).toHaveValue('ventana');
  await expect(sheet.getByLabel('Deutsche Bedeutung')).not.toHaveValue('');
  await sheet.getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(page.getByText('Zur Vokabelliste hinzugefügt', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();

  // Favorit + Playlist auf der Song-Seite
  await page.goto('/songs/song.es.buenos-dias');
  await page.getByRole('banner').getByRole('button', { name: `„${SONG}“ zu Favoriten hinzufügen` }).click();
  await expect(page.getByRole('banner').getByRole('button', { name: `„${SONG}“ aus Favoriten entfernen` })).toBeVisible();

  await page.getByRole('banner').getByRole('button', { name: 'Zu Playlist hinzufügen' }).click();
  await page.getByRole('dialog', { name: 'Zu Playlist hinzufügen' }).getByRole('button', { name: 'Neue Playlist' }).click();
  const create = page.getByRole('dialog', { name: 'Neue Playlist' });
  await create.getByLabel('Name der Playlist').fill('Morgenroutine');
  await create.getByRole('button', { name: 'Anlegen' }).click();
  await expect(create).toBeHidden();
  await expect(page.getByText('Playlist „Morgenroutine“ angelegt', { exact: false })).toBeVisible();

  // Reload → alles noch da (IndexedDB)
  await waitForStored(page, 'songFavorites', 'song.es.buenos-dias');
  await waitForStored(page, 'playlists', 'Morgenroutine');
  await page.reload();
  await expect(page.getByRole('banner').getByRole('button', { name: `„${SONG}“ aus Favoriten entfernen` })).toBeVisible();

  await page.goto('/songs');
  await page.getByRole('tab', { name: 'Favoriten' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Favoriten' }).getByRole('link', { name: SONG, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Playlists' }).click();
  await page.getByRole('tabpanel', { name: 'Playlists' }).getByRole('link', { name: /Morgenroutine/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Morgenroutine' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: new RegExp(SONG) }).first()).toBeVisible();

  await page.goto('/vokabeln');
  await expect(page.getByRole('main').getByText('ventana', { exact: true }).first()).toBeVisible();
});
