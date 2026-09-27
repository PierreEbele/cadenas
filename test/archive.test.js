import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
import { archiveSize, createArchive, normalizeEntryPath, prepareEntries, uniquePaths } from '../src/archive.js';
import { archiveName, decrypt, encrypt, readAll, streamFromBytes } from '../src/core.js';

const bytes = (text) => new TextEncoder().encode(text);
const entry = (path, content) => {
  const data = typeof content === 'string' ? bytes(content) : content;
  return { path, size: data.length, lastModified: new Date('2026-01-02T03:04:05Z'), open: () => streamFromBytes(data) };
};

describe('chemins', () => {
  test('normalisation : séparateurs, chemins absolus, . et ..', () => {
    assert.equal(normalizeEntryPath('dossier\\sous\\a.txt'), 'dossier/sous/a.txt');
    assert.equal(normalizeEntryPath('/etc/passwd'), 'etc/passwd');
    assert.equal(normalizeEntryPath('../../evil.sh'), 'evil.sh');
    assert.equal(normalizeEntryPath('./a/./b/../c.txt'), 'a/b/c.txt');
    assert.throws(() => normalizeEntryPath('../..'), TypeError);
  });

  test('doublons renommés, sans tenir compte de la casse', () => {
    assert.deepEqual(uniquePaths(['a.txt', 'A.txt', 'a.txt', 'd/a.txt', 'sans-ext', 'sans-ext']), [
      'a.txt',
      'A (2).txt',
      'a (3).txt',
      'd/a.txt',
      'sans-ext',
      'sans-ext (2)',
    ]);
  });

  test('nom de l’archive', () => {
    assert.equal(archiveName('photos'), 'photos.zip');
    assert.equal(archiveName(null, new Date(2026, 8, 7)), 'cadenas-2026-09-07.zip');
  });
});

describe('archive zip', () => {
  const entries = prepareEntries([
    entry('notes.txt', 'bonjour'),
    entry('dossier/été 2026/photo ☀.jpg', crypto.getRandomValues(new Uint8Array(50_000))),
    entry('vide.txt', ''),
    entry('notes.txt', 'doublon'),
  ]);

  test('contenu et arborescence préservés, noms Unicode compris', async () => {
    const zip = await readAll(createArchive(entries));
    const files = unzipSync(zip);
    assert.deepEqual(Object.keys(files).sort(), ['dossier/été 2026/photo ☀.jpg', 'notes (2).txt', 'notes.txt', 'vide.txt']);
    assert.equal(new TextDecoder().decode(files['notes.txt']), 'bonjour');
    assert.equal(new TextDecoder().decode(files['notes (2).txt']), 'doublon');
    assert.equal(files['vide.txt'].length, 0);
    assert.equal(files['dossier/été 2026/photo ☀.jpg'].length, 50_000);
  });

  test('archiveSize prédit la taille exacte', async () => {
    const zip = await readAll(createArchive(entries));
    assert.equal(archiveSize(entries), zip.length);
  });

  test('les fichiers ne sont ouverts qu’au moment d’être écrits', async () => {
    const opened = [];
    const lazy = prepareEntries(
      ['a', 'b', 'c'].map((name) => ({ path: name, size: 1, open: () => (opened.push(name), streamFromBytes(bytes('x'))) })),
    );
    const reader = createArchive(lazy).getReader();
    await reader.read();
    assert.ok(opened.length < 3, `ouverts d'avance : ${opened.join(', ')}`);
    while (!(await reader.read()).done);
    assert.deepEqual(opened, ['a', 'b', 'c']);
  });

  test('archive → chiffrement → déchiffrement → extraction', async () => {
    const zipStream = createArchive(entries);
    const sealed = await readAll(await encrypt(zipStream, 'pwd', { params: { m: 256, t: 1, p: 1 } }));
    const { stream } = await decrypt(streamFromBytes(sealed), 'pwd');
    const files = unzipSync(await readAll(stream));
    assert.equal(Object.keys(files).length, 4);
  });
});
