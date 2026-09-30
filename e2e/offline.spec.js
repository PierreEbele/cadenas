import { expect, test } from '@playwright/test';
import { chooseFiles, decryptInNode, download, submit } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  // Le service worker met tout le site en cache puis prend la main sur la page.
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 });
});

test('tout le site est mis en cache', async ({ page }) => {
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys.find((key) => key.startsWith('cadenas-')));
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cached).toEqual(expect.arrayContaining(['/', '/manifest.webmanifest', '/favicon.svg']));
  expect(cached.some((path) => /^\/assets\/worker-.*\.js$/.test(path))).toBe(true);
});

test('le site fonctionne hors ligne une fois visité', async ({ page, context }) => {
  // Sous WebKit, Playwright ne sait pas couper le réseau sans court-circuiter
  // le service worker (toute navigation échoue) : seule la mise en cache y est
  // vérifiée, par le test précédent.
  test.skip(test.info().project.name === 'webkit', 'émulation hors ligne incompatible avec les service workers sous WebKit');

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toHaveText('cadenas');

  await chooseFiles(page, [{ name: 'hors-ligne.txt', content: 'sans réseau' }]);
  await submit(page, 'mot de passe');
  const encrypted = await download(page);
  const { bytes } = await decryptInNode(encrypted.bytes, 'mot de passe');
  expect(bytes.toString()).toBe('sans réseau');
});
