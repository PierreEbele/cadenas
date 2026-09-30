import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeFilter } from '../src/prompt.js';

/** Ce que la saisie retient d'une suite de caractères reçus du terminal. */
function keys(input) {
  const isKey = escapeFilter();
  return [...input].filter(isKey).join('');
}

test('les séquences des touches de navigation ne s’ajoutent pas au mot de passe', () => {
  assert.equal(keys('abc\u001b[Ddef'), 'abcdef'); // flèche gauche
  assert.equal(keys('a\u001b[Cb'), 'ab'); // flèche droite
  assert.equal(keys('a\u001b[3~b'), 'ab'); // Suppr
  assert.equal(keys('a\u001b[1;5Db'), 'ab'); // Ctrl+flèche gauche
  assert.equal(keys('a\u001bOHb'), 'ab'); // Début (mode application)
  assert.equal(keys('a\u001bxb'), 'ab'); // Alt+x
});

test('les caractères ordinaires passent, y compris « [ », « ~ » et « O »', () => {
  assert.equal(keys('[mot~de-passe]O'), '[mot~de-passe]O');
  assert.equal(keys('é€ 🔒'), 'é€ 🔒');
});

test('une séquence coupée entre deux morceaux reste ignorée', () => {
  const isKey = escapeFilter();
  const first = [...'ab\u001b['].filter(isKey).join('');
  const second = [...'Dcd'].filter(isKey).join('');
  assert.equal(first + second, 'abcd');
});
