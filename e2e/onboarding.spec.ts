import { test, expect, onboard, waitForStored } from './fixtures';

test('Onboarding: Spanisch (Lateinamerika) bis zum Dashboard im lokalen Modus', async ({ page }) => {
  await onboard(page, { variant: 'es-LA', name: 'Alex' });

  await expect(page.getByRole('button', { name: 'Aktiver Kurs: Spanisch (Lateinamerika). Kurs wechseln' })).toBeVisible();
  await expect(page.getByText(/^Hallo Alex/)).toBeVisible();

  // Level & Sprachniveau
  await expect(page.getByRole('link', { name: /^Spielerlevel 1\b/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Sprachniveau Einsteiger/ })).toBeVisible();

  // Tagesziel (im Onboarding „Ernsthaft“ = 100 XP) und Serie
  const today = page.getByRole('region', { name: 'Heute' });
  await expect(today.getByRole('progressbar', { name: 'Tagesziel' })).toHaveAttribute('aria-valuetext', '0 von 100 XP');
  await expect(today.getByRole('listitem').filter({ hasText: /Tage? Serie$/ })).toHaveText(/^0\s*Tage Serie$/);

  // Nächste Lektion
  await expect(page.getByRole('heading', { level: 2, name: 'Hola – begrüßen & verabschieden' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Lektion starten' })).toHaveAttribute('href', /\/lektion\/es\.s0\.l01$/);

  // Sync-Status ehrlich „lokal“
  const sync = page.getByRole('region', { name: 'Speicherung & Sync' }).getByRole('status', { name: /^Sync-Status: Nur lokal/ });
  await expect(sync).toBeVisible();
  await expect(sync).toHaveText('Nur lokal');

  // Nach einem Reload bleibt das Onboarding abgeschlossen (IndexedDB).
  await waitForStored(page, 'profile', '"onboardingDone":true');
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/^Hallo Alex/)).toBeVisible();
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
});
