import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Generischer „Spieler“ für Übungen: beantwortet jede Übungsart irgendwie (bewusst oft falsch),
 * prüft bei Fehlern die fünfteilige Erklärung und geht weiter. Fehler dürfen nie blockieren.
 */

export const EXPLANATION_PARTS = ['Was war falsch', 'Warum', 'Regel', 'Richtige Lösung', 'So vermeidest du den Fehler'] as const;

export type PlayStats = { exercises: number; wrong: number; explanationsChecked: number };

const CHAT_REPLIES = ['Hola, me llamo Alex.', 'Muy bien, gracias. ¿Y tú?', 'Soy de Alemania.', 'Me gusta leer.', 'Sí, claro.', '¡Adiós, hasta luego!'];

/** Paare zuordnen / Bilder zuordnen: jede Kombination durchprobieren (Fehlversuche wackeln nur). */
async function solveMatch(group: Locator): Promise<void> {
  const items = group.getByRole('button');
  const n = await items.count();
  const paired = async (i: number) => ((await items.nth(i).getAttribute('aria-label')) ?? '').includes('zugeordnet');
  for (let l = 0; l < n; l += 2) {
    for (let r = 1; r < n && !(await paired(l)); r += 2) {
      if (await paired(r)) continue;
      await items.nth(l).click();
      await items.nth(r).click();
    }
  }
}

/** Geführtes Gespräch (aiChat-Übung): antworten, bis „Gespräch abschließen“ erscheint. */
async function playChat(scope: Locator): Promise<void> {
  const finish = scope.getByRole('button', { name: 'Gespräch abschließen' });
  const input = scope.getByRole('textbox', { name: 'Deine Antwort' });
  const typing = scope.getByRole('status', { name: /schreibt …$/ });
  await expect(finish.or(input).first()).toBeVisible();
  for (const reply of CHAT_REPLIES) {
    await expect(typing).toBeHidden();
    if (await finish.isVisible()) break;
    await input.fill(reply);
    await scope.getByRole('button', { name: 'Senden' }).click();
    await expect(scope.getByRole('log', { name: 'Gesprächsverlauf' })).toContainText(reply);
  }
  await expect(typing).toBeHidden();
  await finish.click();
}

/** Irgendeine Antwort geben: erste Option, erste Kachel bzw. ein kurzer Text. */
async function giveSomeAnswer(scope: Locator): Promise<void> {
  const typeInstead = scope.getByRole('button', { name: 'Stattdessen tippen' });
  if (await typeInstead.isVisible()) await typeInstead.click();

  const radios = scope.getByRole('radio');
  const tiles = scope.getByRole('button', { name: /(hinzufügen|einsetzen)“?$/ });
  const fields = scope.getByRole('textbox');
  if (await radios.count()) {
    await radios.first().click();
  } else if (await tiles.count()) {
    await tiles.first().click();
  } else if (await fields.count()) {
    const n = await fields.count();
    for (let i = 0; i < n; i++) {
      const f = fields.nth(i);
      if ((await f.isVisible()) && (await f.isEditable())) await f.fill('hola');
    }
  } else {
    throw new Error(`Unbekannte Übungsart:\n${await scope.ariaSnapshot()}`);
  }
}

/**
 * Beantwortet genau eine Übung in `scope` (bis inkl. „Weiter“) – für Lektionen, Grammatik-Stufen usw.
 * Liefert, ob die Antwort als falsch gewertet wurde.
 */
export async function playOneExercise(page: Page, scope: Locator, stats?: PlayStats): Promise<void> {
  const match = scope.getByRole('group', { name: /^(Bilder links, Wörter rechts|Paare zuordnen)$/ });
  const chatStart = scope.getByRole('button', { name: 'Gespräch starten' });
  if (await match.isVisible()) await solveMatch(match);
  else if (await chatStart.isVisible()) {
    await chatStart.click();
    await playChat(scope);
  } else {
    await giveSomeAnswer(scope);
    const check = scope.getByRole('button', { name: 'Prüfen' });
    await expect(check).toBeEnabled();
    await check.click();
  }

  const next = page.getByRole('button', { name: 'Weiter', exact: true });
  await expect(next).toBeVisible();
  if (stats) stats.exercises++;
  if (await scope.getByText('Was war falsch', { exact: true }).isVisible()) {
    if (stats) stats.wrong++;
    for (const part of EXPLANATION_PARTS) {
      await expect(scope.getByText(part, { exact: true }).first()).toBeVisible();
    }
    if (stats) stats.explanationsChecked++;
  }
  await next.click();
}

/**
 * Stabiler Bereich einer Übung: über den Namen (Aufgabenstellung) statt über Filter,
 * die sich während der Übung ändern (z. B. verschwindet „Gespräch starten“ nach dem Start).
 */
export async function stableScope(container: Locator, region: Locator): Promise<Locator> {
  const name = (await region.getByRole('heading', { level: 2 }).first().innerText()).trim();
  return container.getByRole('region', { name, exact: true }).last();
}

/** Bereich einer noch offenen Übung (Aufgabenstellung als Überschrift + Antwort-Bedienelemente). */
export function exerciseRegion(page: Page, container: Locator): Locator {
  return container.getByRole('region').filter({ has: page.getByRole('heading', { level: 2 }) }).filter({
    has: page.getByRole('button', { name: /^(Prüfen|Gespräch starten|Stattdessen tippen)$/ })
      .or(page.getByRole('group', { name: /^(Bilder links, Wörter rechts|Paare zuordnen)$/ })),
  });
}

/**
 * Spielt eine komplette Lektion bis zum Ergebnis durch (Lernziel → … → Ergebnis).
 * Aussprache: einmal „Ohne Mikro“ mit Selbsteinschätzung – funktioniert ohne Mikrofon.
 */
export async function playLesson(page: Page): Promise<PlayStats> {
  const stats: PlayStats = { exercises: 0, wrong: 0, explanationsChecked: 0 };
  const main = page.getByRole('main');
  const result = main.getByRole('progressbar', { name: 'Punktzahl' });
  const phaseButton = main.getByRole('button', { name: /^(Los geht’s|Weiter zu den Beispielen|Jetzt üben|Weiter: .+)$/ });
  const pronLater = main.getByRole('button', { name: 'Später üben' });
  const exercise = exerciseRegion(page, main);

  for (let guard = 0; guard < 60; guard++) {
    await expect(result.or(phaseButton).or(pronLater).or(exercise).first()).toBeVisible();
    if (await result.isVisible()) return stats;

    if (await pronLater.isVisible()) {
      const item = main.getByRole('article').first();
      // Modus-Umschalter gibt es nur, wenn Mikrofon/Spracherkennung verfügbar sind – sonst ist „Ohne Mikro“ bereits aktiv.
      const listenOnly = item.getByRole('radio', { name: 'Ohne Mikro' });
      const modelButton = item.getByRole('button', { name: 'Vorbild hören & nachsprechen' });
      await expect(item.getByRole('region', { name: 'Selbst sprechen' })).toBeVisible();
      if (await listenOnly.count()) {
        await listenOnly.click();
        await expect(listenOnly).toBeChecked();
      }
      await modelButton.click();
      await item.getByRole('group', { name: 'Selbsteinschätzung' }).getByRole('button', { name: 'Teilweise getroffen' }).click();
      await expect(item.getByRole('progressbar', { name: 'Selbsteinschätzung' })).toBeVisible();
      await main.getByRole('button', { name: 'Weiter', exact: true }).click();
      continue;
    }
    if (await phaseButton.first().isVisible()) {
      await phaseButton.first().click();
      continue;
    }
    await playOneExercise(page, await stableScope(main, exercise.first()), stats);
  }
  throw new Error('Lektion wurde nicht beendet (Schleifenschutz).');
}
