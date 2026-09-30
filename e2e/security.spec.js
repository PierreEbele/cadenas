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
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { injected: window.__injected === true, fetched, violations };
  });

  expect(blocked.injected).toBe(false);
  expect(blocked.fetched).toBe(false);
  expect(blocked.violations).toEqual(expect.arrayContaining(['script-src-elem', 'connect-src']));
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
