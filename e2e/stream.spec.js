import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { expect, test } from '@playwright/test';
import { decrypt } from '../src/core.js';
import { submit } from './helpers.js';

// Au-delà de 256 Mio, Firefox et Safari reçoivent le résultat en flux par le
// service worker. Chrome et Edge l'écrivent directement sur le disque (boîte
// de dialogue « Enregistrer sous », non automatisable) : pas concernés.
const SIZE = 256 * 1024 * 1024 + 123_457;

// Deux fichiers de 256 Mio chiffrés en même temps saturent la machine.
test.describe.configure({ mode: 'serial' });

let dir;
let source;
let sourceHash;

test.beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'cadenas-e2e-'));
  source = join(dir, 'sauvegarde.tar');
  const data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i += 4) data.writeUInt32LE((i * 2654435761) >>> 0, i - (i + 4 > SIZE ? 4 - (SIZE - i) : 0));
  await writeFile(source, data);
  sourceHash = createHash('sha256').update(data).digest('hex');
});

test.afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function hashDecrypted(path, password) {
  const { stream } = await decrypt(Readable.toWeb(createReadStream(path)), password);
  const hash = createHash('sha256');
  for await (const chunk of stream) hash.update(chunk);
  return hash.digest('hex');
}

test('un gros fichier est téléchargé en flux par le service worker', async ({ page, browserName }) => {
  test.skip(browserName === 'chromium', 'Chromium écrit directement sur le disque');
  test.setTimeout(300_000);

  await page.goto('./');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 });

  await page.locator('#file').setInputFiles(source);
  // Plus d'avertissement sur la mémoire : le résultat ne sera pas gardé entier.
  await expect(page.locator('#large-hint')).toBeHidden();

  const downloadStarted = page.waitForEvent('download', { timeout: 120_000 });
  await submit(page, 'gros fichier');
  const download = await downloadStarted;
  expect(download.suggestedFilename()).toBe('sauvegarde.tar.cadenas');

  await expect(page.locator('#result-detail')).toContainText('Enregistré', { timeout: 240_000 });
  await expect(page.locator('#download')).toBeHidden();

  const path = await download.path();
  expect(await hashDecrypted(path, 'gros fichier')).toBe(sourceHash);
});

test('annuler pendant le téléchargement en flux le fait échouer', async ({ page, browserName }) => {
  test.skip(browserName === 'chromium', 'Chromium écrit directement sur le disque');
  test.setTimeout(180_000);

  await page.goto('./');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 });
  await page.locator('#file').setInputFiles(source);

  const downloadStarted = page.waitForEvent('download', { timeout: 120_000 });
  await submit(page, 'annulé');
  const download = await downloadStarted;
  await page.locator('#cancel').click();
  await expect(page.locator('#form')).toBeVisible();
  await expect(page.locator('#result')).toBeHidden();

  // Le service worker fait échouer le flux : aucun fichier incomplet ne doit
  // être présenté comme terminé. Sous Firefox, Playwright laisse alors le
  // téléchargement « en cours » sans jamais signaler l'échec : on vérifie
  // seulement qu'il ne réussit pas.
  const outcome = await Promise.race([
    download.failure().then((failure) => failure ?? 'réussi'),
    new Promise((resolve) => setTimeout(() => resolve('en cours'), 15_000)),
  ]);
  if (browserName === 'firefox') expect(outcome).not.toBe('réussi');
  else expect(['réussi', 'en cours']).not.toContain(outcome);
});
