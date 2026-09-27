import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MESSAGES } from '../web/i18n.js';

const placeholders = (value) =>
  typeof value === 'string' ? [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : [];

test('toutes les langues ont les mêmes clés', () => {
  const reference = Object.keys(MESSAGES.fr).sort();
  for (const [lang, messages] of Object.entries(MESSAGES)) {
    assert.deepEqual(Object.keys(messages).sort(), reference, `langue ${lang}`);
  }
});

test('les paramètres {…} sont identiques dans chaque langue', () => {
  for (const key of Object.keys(MESSAGES.fr)) {
    for (const [lang, messages] of Object.entries(MESSAGES)) {
      assert.deepEqual(placeholders(messages[key]), placeholders(MESSAGES.fr[key]), `${lang} : ${key}`);
    }
  }
});

test('chaque clé utilisée dans le HTML existe', () => {
  const html = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
  const keys = [
    ...[...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/data-i18n-attr="([^"]+)"/g)].flatMap((m) =>
      m[1].split(';').map((pair) => pair.split(':')[1].trim()),
    ),
  ];
  assert.ok(keys.length > 20);
  for (const key of keys) assert.ok(key in MESSAGES.fr, `clé manquante : ${key}`);
});

test('chaque code d’erreur de cadenas a une traduction', () => {
  const source = readFileSync(new URL('../src/errors.js', import.meta.url), 'utf8');
  const codes = [...source.matchAll(/^ \* - ([A-Z_]+)/gm)].map((m) => m[1]);
  assert.ok(codes.length >= 8);
  for (const code of codes) assert.ok(`error.${code}` in MESSAGES.fr, `error.${code}`);
});
