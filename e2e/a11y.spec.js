import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { chooseFiles, download, submit } from './helpers.js';

/** Audit axe (WCAG 2.1 A et AA) de la page dans son état actuel. */
async function audit(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return violations.map(({ id, nodes }) => `${id} : ${nodes.map((node) => node.target.join(' ')).join(', ')}`);
}

test.beforeEach(async ({ page }) => {
  // Sans animations : l'audit des contrastes porte sur l'état final, jamais
  // sur une couleur de fond en pleine transition.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
});

test('accessibilité : chaque étape passe l’audit axe', async ({ page }) => {
  expect(await audit(page), 'page d’accueil').toEqual([]);

  await chooseFiles(page, [{ name: 'a.txt', content: 'a' }]);
  await page.locator('#password').fill('un');
  await page.locator('#confirm').fill('deux');
  await page.locator('#submit').click();
  await expect(page.locator('#error')).toBeVisible();
  expect(await audit(page), 'fichier choisi, erreur affichée').toEqual([]);

  await submit(page, 'mot de passe');
  await download(page);
  expect(await audit(page), 'résultat').toEqual([]);
});

test('accessibilité : mode sombre', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await chooseFiles(page, [{ name: 'a.txt', content: 'a' }]);
  expect(await audit(page)).toEqual([]);
});

test('tout le parcours se fait au clavier', async ({ page, browserName }) => {
  // WebKit ne donne pas le focus aux champs de fichier avec Tab.
  test.skip(browserName === 'webkit', 'WebKit : pas de focus clavier sur <input type="file">');

  // Tab → zone de dépôt (champ de fichier), Espace → sélecteur de fichiers.
  await page.keyboard.press('Tab');
  await expect(page.locator('#file')).toBeFocused();
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Space')]);
  await chooser.setFiles({ name: 'clavier.txt', mimeType: 'text/plain', buffer: Buffer.from('au clavier') });

  // Le focus passe au mot de passe, puis Tab jusqu'à la confirmation.
  await expect(page.locator('#password')).toBeFocused();
  await page.keyboard.type('mot de passe');
  while (!(await page.locator('#confirm').evaluate((element) => element === document.activeElement))) {
    await page.keyboard.press('Tab');
  }
  await page.keyboard.type('mot de passe');
  await page.keyboard.press('Enter');

  // Le résultat reçoit le focus : Entrée télécharge.
  await expect(page.locator('#download')).toBeFocused({ timeout: 60_000 });
  const [file] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
  expect(file.suggestedFilename()).toBe('clavier.txt.cadenas');
});
