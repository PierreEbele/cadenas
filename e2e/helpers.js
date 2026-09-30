import { readFile } from 'node:fs/promises';
import { expect } from '@playwright/test';
import { decrypt, encrypt, readAll, streamFromBytes } from '../src/core.js';

/** Choisit des fichiers comme le ferait l'utilisateur : [{ name, content }]. */
export async function chooseFiles(page, files) {
  await page.locator('#file').setInputFiles(
    files.map(({ name, content }) => ({
      name,
      mimeType: 'application/octet-stream',
      buffer: Buffer.from(content),
    })),
  );
}

/** Saisit le mot de passe (et sa confirmation au chiffrement), puis valide. */
export async function submit(page, password, { confirm = true, format } = {}) {
  await page.locator('#password').fill(password);
  if (confirm) await page.locator('#confirm').fill(password);
  if (format) await page.locator(`input[name="format"][value="${format}"]`).check({ force: true });
  await page.locator('#submit').click();
}

/** Attend le résultat et le télécharge : { name, bytes }. */
export async function download(page) {
  await expect(page.locator('#result')).toBeVisible({ timeout: 60_000 });
  const [file] = await Promise.all([page.waitForEvent('download'), page.locator('#download').click()]);
  return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) };
}

/** Déchiffre avec la bibliothèque, côté Node : { format, bytes }. */
export async function decryptInNode(bytes, password) {
  const { format, stream } = await decrypt(streamFromBytes(new Uint8Array(bytes)), password);
  return { format, bytes: Buffer.from(await readAll(stream)) };
}

/** Chiffre avec la bibliothèque, côté Node. */
export async function encryptInNode(content, password, format = 'cadenas') {
  return Buffer.from(await readAll(await encrypt(streamFromBytes(new Uint8Array(Buffer.from(content))), password, { format })));
}

/** Données pseudo-aléatoires (crypto.getRandomValues est limité à 64 Ko par appel). */
export function randomBytes(size) {
  const data = Buffer.alloc(size);
  for (let i = 0; i < size; i += 65536) crypto.getRandomValues(data.subarray(i, i + 65536));
  return data;
}
