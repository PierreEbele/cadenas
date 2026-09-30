import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_WORDS,
  entropyBits,
  generatePassphrase,
  loadWordlist,
  randomIndex,
} from '../src/passphrase.js';

describe('listes de mots', () => {
  for (const [lang, size] of [['fr', 8191], ['en', 7772]]) {
    test(`${lang} : ${size} mots uniques, sans espace, tiret ni majuscule`, async () => {
      const words = await loadWordlist(lang);
      assert.equal(words.length, size);
      assert.equal(new Set(words).size, size);
      assert.ok(words.every((w) => /^[a-z]+$/.test(w)));
    });
  }

  test('langue inconnue refusée', async () => {
    await assert.rejects(loadWordlist('xx'), TypeError);
  });
});

describe('génération', () => {
  test('5 mots par défaut, plus de 64 bits', async () => {
    for (const lang of ['fr', 'en']) {
      const { passphrase, bits } = await generatePassphrase({ lang });
      const words = passphrase.split('-');
      assert.equal(words.length, DEFAULT_WORDS);
      assert.ok(bits > 64, `${lang} : ${bits} bits`);
      const list = await loadWordlist(lang);
      assert.ok(words.every((w) => list.includes(w)));
    }
  });

  test('nombre de mots paramétrable et borné', async () => {
    assert.equal((await generatePassphrase({ words: 8 })).passphrase.split('-').length, 8);
    await assert.rejects(generatePassphrase({ words: 2 }), RangeError);
    await assert.rejects(generatePassphrase({ words: 21 }), RangeError);
    await assert.rejects(generatePassphrase({ words: 4.5 }), RangeError);
  });

  test('deux phrases successives diffèrent', async () => {
    const a = await generatePassphrase();
    const b = await generatePassphrase();
    assert.notEqual(a.passphrase, b.passphrase);
  });

  test('entropie', () => {
    assert.equal(entropyBits(8192, 5), 65);
    assert.ok(Math.abs(entropyBits(7776, 5) - 64.62) < 0.01);
  });

  test('randomIndex est uniforme (khi-deux grossier)', () => {
    const max = 6;
    const draws = 60_000;
    const counts = new Array(max).fill(0);
    for (let i = 0; i < draws; i++) counts[randomIndex(max)]++;
    const expected = draws / max;
    const chi2 = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0);
    // 5 degrés de liberté : chi2 > 36 n'arrive qu'environ une fois sur un million.
    assert.ok(chi2 < 36, `chi2 = ${chi2}`);
    assert.ok(counts.every((c) => c > 0));
  });
});
