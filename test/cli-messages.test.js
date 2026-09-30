import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MESSAGES, detectLanguage, translator } from '../bin/messages.js';

const placeholders = (value) =>
  typeof value === 'string' ? [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : [];

test('messages de la CLI : mêmes clés et mêmes paramètres dans chaque langue', () => {
  const reference = Object.keys(MESSAGES.fr).sort();
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), reference);
  for (const key of reference) assert.deepEqual(placeholders(MESSAGES.en[key]), placeholders(MESSAGES.fr[key]), key);
});

test('chaque clé utilisée par la CLI existe', () => {
  const source = readFileSync(new URL('../bin/cadenas.js', import.meta.url), 'utf8');
  const keys = [...source.matchAll(/\bt\('([\w.]+)'/g)].map((m) => m[1]);
  assert.ok(keys.length > 30);
  for (const key of keys) assert.ok(key in MESSAGES.fr, key);
});

test('chaque code d’erreur de la bibliothèque a une traduction', () => {
  const source = readFileSync(new URL('../src/errors.js', import.meta.url), 'utf8');
  const codes = [...source.matchAll(/^ \* - ([A-Z_]+)/gm)].map((m) => m[1]);
  assert.ok(codes.length >= 8);
  for (const code of [...codes, 'NO_TERMINAL']) {
    for (const lang of ['fr', 'en']) assert.ok(`error.${code}` in MESSAGES[lang], `${lang} : error.${code}`);
  }
});

test('langue : variables d’environnement dans l’ordre de priorité', () => {
  assert.equal(detectLanguage({ LANG: 'fr_FR.UTF-8' }), 'fr');
  assert.equal(detectLanguage({ LANG: 'en_US.UTF-8' }), 'en');
  assert.equal(detectLanguage({ LANG: 'de_DE.UTF-8' }), 'en');
  assert.equal(detectLanguage({ LC_ALL: 'en_GB.UTF-8', LANG: 'fr_FR.UTF-8' }), 'en');
  assert.equal(detectLanguage({ LC_MESSAGES: 'fr_CA.UTF-8', LANG: 'en_US.UTF-8' }), 'fr');
  assert.equal(detectLanguage({ LANGUAGE: 'fr:en' }), 'fr');
  // « C » et « POSIX » ne désignent aucune langue : on passe à la suivante.
  assert.equal(detectLanguage({ LC_ALL: 'C', LANG: 'fr_FR.UTF-8' }), 'fr');
});

test('translator remplace les paramètres', () => {
  assert.equal(translator('en')('error.NOT_FOUND', { path: 'a.txt' }), 'Not found: a.txt');
  assert.equal(translator('fr')('error.NOT_FOUND', { path: 'a.txt' }), 'Introuvable : a.txt');
});
