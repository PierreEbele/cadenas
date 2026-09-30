import { expect, test } from '@playwright/test';
import { chooseFiles, download, submit } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('la politique de sécurité (CSP) est appliquée', async ({ page }) => {
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute('content', /connect-src 'none'/);

  const blocked = await page.evaluate(async () => {
    const violations = [];
    document.addEventListener('securitypolicyviolation', (event) => violations.push(event.effectiveDirective));

    // Script en ligne injecté : refusé (script-src 'self').
    const script = document.createElement('script');
    script.textContent = 'window.__injected = true;';
    document.head.append(script);

    // Connexion réseau, même vers le site lui-même : refusée (connect-src 'none').
    const fetched = await fetch('./manifest.webmanifest').then(
      () => true,
      () => false,
    );

    // Iframe vers un autre site : refusée (frame-src 'self', réservé aux
    // téléchargements en flux).
    const frame = document.createElement('iframe');
    frame.src = 'https://example.com/';
    document.body.append(frame);

    await new Promise((resolve) => setTimeout(resolve, 300));
    return { injected: window.__injected === true, fetched, violations };
  });

  expect(blocked.injected).toBe(false);
  expect(blocked.fetched).toBe(false);
  expect(blocked.violations).toEqual(expect.arrayContaining(['script-src-elem', 'connect-src', 'frame-src']));
});

test('intégrée dans une iframe, la page refuse de fonctionner', async ({ page, baseURL }) => {
  await page.setContent(`<iframe src="${baseURL}" style="width:800px;height:600px"></iframe>`);
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('a[target="_blank"]')).toHaveText(/cadenas/);
  await expect(frame.locator('#form')).toHaveCount(0);
  await expect(frame.locator('#password')).toHaveCount(0);
});

test('aucune requête ne quitte le site pendant un chiffrement', async ({ page, baseURL }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));

  await chooseFiles(page, [{ name: 'secret.txt', content: 'ne doit pas sortir' }]);
  await submit(page, 'mot de passe');
  await download(page);

  const outside = requests.filter((url) => !url.startsWith(baseURL) && !url.startsWith('blob:') && !url.startsWith('data:'));
  expect(outside).toEqual([]);
});
