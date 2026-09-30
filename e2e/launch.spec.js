import { expect, test } from '@playwright/test';
import { download, encryptInNode, submit } from './helpers.js';

test('le manifeste déclare les fichiers .cadenas et .age', async ({ request }) => {
  const manifest = await (await request.get('./manifest.webmanifest')).json();
  const extensions = manifest.file_handlers.flatMap((handler) => Object.values(handler.accept).flat());
  expect(extensions.sort()).toEqual(['.age', '.cadenas']);
});

test('un fichier ouvert depuis le système est prêt à déchiffrer', async ({ page }) => {
  // L'API launchQueue n'existe que dans une application installée : elle est
  // simulée, avec un fichier passé comme le ferait le système.
  const encrypted = await encryptInNode('ouvert depuis le système', 'secret');
  await page.addInitScript((bytes) => {
    const file = new File([new Uint8Array(bytes)], 'lettre.txt.cadenas');
    // defineProperty : sous Chromium, window.launchQueue existe et est en lecture seule.
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: {
        setConsumer(consumer) {
          consumer({ files: [{ getFile: async () => file }] });
        },
      },
    });
  }, [...encrypted]);

  await page.goto('./');
  await expect(page.locator('#file-name')).toHaveText('lettre.txt.cadenas');
  await expect(page.locator('#submit')).toHaveText('Déchiffrer');
  await expect(page.locator('#password')).toBeFocused();

  await submit(page, 'secret', { confirm: false });
  const decrypted = await download(page);
  expect(decrypted.bytes.toString()).toBe('ouvert depuis le système');
});
