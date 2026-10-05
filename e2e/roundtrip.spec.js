import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { chooseFiles, decryptInNode, download, encryptInNode, randomBytes, submit } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('chiffre puis déchiffre un fichier .cadenas', async ({ page }) => {
  const content = randomBytes(300_000);
  await chooseFiles(page, [{ name: 'rapport.pdf', content }]);
  await expect(page.locator('#file-name')).toHaveText('rapport.pdf');
  await submit(page, 'cheval agrafe correct');

  const encrypted = await download(page);
  expect(encrypted.name).toBe('rapport.pdf.cadenas');
  expect(encrypted.bytes.subarray(0, 7).toString()).toBe('CADENAS');

  await page.locator('#restart').click();
  await chooseFiles(page, [{ name: encrypted.name, content: encrypted.bytes }]);
  await expect(page.locator('#confirm-field')).toBeHidden();
  await submit(page, 'cheval agrafe correct', { confirm: false });

  const decrypted = await download(page);
  expect(decrypted.name).toBe('rapport.pdf');
  expect(decrypted.bytes.equals(content)).toBe(true);
});

test('le fichier .age produit par le site est lisible par la bibliothèque', async ({ page }) => {
  await chooseFiles(page, [{ name: 'note.txt', content: 'compatible age ✓' }]);
  await submit(page, 'mot de passe', { format: 'age' });

  const encrypted = await download(page);
  expect(encrypted.name).toBe('note.txt.age');
  const { format, bytes } = await decryptInNode(encrypted.bytes, 'mot de passe');
  expect(format).toBe('age');
  expect(bytes.toString()).toBe('compatible age ✓');
});

test('déchiffre un fichier chiffré par la ligne de commande', async ({ page }) => {
  const encrypted = await encryptInNode('venu de la CLI', 'secret partagé');
  await chooseFiles(page, [{ name: 'message.txt.cadenas', content: encrypted }]);
  await submit(page, 'secret partagé', { confirm: false });

  const decrypted = await download(page);
  expect(decrypted.bytes.toString()).toBe('venu de la CLI');
});

test('mauvais mot de passe : message d’erreur, rien à télécharger', async ({ page }) => {
  const encrypted = await encryptInNode('x', 'le bon');
  await chooseFiles(page, [{ name: 'x.cadenas', content: encrypted }]);
  await submit(page, 'le mauvais', { confirm: false });

  await expect(page.locator('#error')).toHaveText('Mot de passe incorrect.', { timeout: 60_000 });
  await expect(page.locator('#result')).toBeHidden();
  await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');
});

test('un fichier .cadenas endommagé n’est pas chiffré une seconde fois', async ({ page }) => {
  await chooseFiles(page, [{ name: 'rapport.pdf.cadenas', content: 'pas un fichier chiffré' }]);
  await expect(page.locator('#error')).toContainText('.cadenas');
  await expect(page.locator('#password')).toBeDisabled();
});

test('les deux mots de passe doivent correspondre', async ({ page }) => {
  await chooseFiles(page, [{ name: 'a.txt', content: 'a' }]);
  await page.locator('#password').fill('un');
  await page.locator('#confirm').fill('deux');
  await page.locator('#submit').click();
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#progress')).toBeHidden();
});

test('plusieurs fichiers sont chiffrés dans une archive .zip', async ({ page }) => {
  await chooseFiles(page, [
    { name: 'a.txt', content: 'premier' },
    { name: 'b.txt', content: 'second' },
  ]);
  await expect(page.locator('#file-badge')).toHaveText('zip');
  await submit(page, 'archive');

  const encrypted = await download(page);
  expect(encrypted.name).toMatch(/^cadenas-\d{4}-\d{2}-\d{2}\.zip\.cadenas$/);
  const { bytes } = await decryptInNode(encrypted.bytes, 'archive');
  const files = unzipSync(new Uint8Array(bytes));
  expect(Object.keys(files).sort()).toEqual(['a.txt', 'b.txt']);
  expect(new TextDecoder().decode(files['b.txt'])).toBe('second');
});

test('nom masqué : nom neutre, nom d’origine rangé dans l’archive', async ({ page }) => {
  await chooseFiles(page, [{ name: 'bilan-confidentiel.pdf', content: 'chiffres' }]);
  await page.locator('#hide-name').check();
  await submit(page, 'discret');

  const encrypted = await download(page);
  expect(encrypted.name).toMatch(/^cadenas-\d{4}-\d{2}-\d{2}\.zip\.cadenas$/);
  const { bytes } = await decryptInNode(encrypted.bytes, 'discret');
  const files = unzipSync(new Uint8Array(bytes));
  expect(Object.keys(files)).toEqual(['bilan-confidentiel.pdf']);

  // Au déchiffrement, l'option n'apparaît pas.
  await page.locator('#restart').click();
  await chooseFiles(page, [{ name: encrypted.name, content: encrypted.bytes }]);
  await expect(page.locator('#hide-name-field')).toBeHidden();
});

test('la langue bascule en anglais et reste choisie', async ({ page }) => {
  const formatLink = page.locator('a[data-i18n="footer.format"]');
  await expect(formatLink).toHaveAttribute('href', /\/docs\/FORMAT\.fr\.md$/);
  await page.locator('#lang').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#submit')).toHaveText('Encrypt');
  await expect(formatLink).toHaveAttribute('href', /\/docs\/FORMAT\.md$/);
  await page.reload();
  await expect(page.locator('#submit')).toHaveText('Encrypt');
});

test('page de déchiffrement (#dechiffrer) : un seul fichier chiffré, rien d’autre', async ({ page }) => {
  await page.goto('./#dechiffrer');
  await expect(page.locator('#drop-title')).toHaveText('Déposez ici le fichier chiffré que vous avez reçu');
  await expect(page.locator('#pick-folder')).toBeHidden();

  await chooseFiles(page, [{ name: 'note.txt', content: 'pas chiffré' }]);
  await expect(page.locator('#error')).toContainText('Ce n’est pas un fichier chiffré');
  await expect(page.locator('#submit')).toBeDisabled();

  const encrypted = await encryptInNode('reçu par e-mail', 'secret');
  await chooseFiles(page, [{ name: 'lettre.txt.cadenas', content: encrypted }]);
  await expect(page.locator('#file-info')).toContainText('fichier chiffré');
  await submit(page, 'secret', { confirm: false });
  const decrypted = await download(page);
  expect(decrypted.bytes.toString()).toBe('reçu par e-mail');
  await expect(page.locator('#restart')).toHaveText('Ouvrir un autre fichier');
});

test('après un chiffrement, l’adresse de déchiffrement est indiquée', async ({ page }) => {
  await chooseFiles(page, [{ name: 'note.txt', content: 'à envoyer' }]);
  await submit(page, 'secret');
  await expect(page.locator('#result')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#share-link')).toHaveAttribute('href', /#dechiffrer$/);

  await page.locator('#restart').click();
  await page.locator('#view-switch-button').click();
  await expect(page).toHaveURL(/#dechiffrer$/);
  await expect(page.locator('#tagline')).toHaveText(/Ouvrez un fichier chiffré/);
  await page.locator('#view-switch-button').click();
  await expect(page.locator('#pick-folder')).toBeVisible();
});
