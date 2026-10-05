import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Encrypter, armor, generateIdentity, identityToRecipient } from 'age-encryption';
import {
  CadenasError,
  decrypt,
  decryptedName,
  detectFormat,
  encrypt,
  encryptedName,
  readAll,
  streamFromBytes,
} from '../src/core.js';
import { peek } from '../src/bytes.js';

// Coûts réduits pour garder des tests rapides.
const FAST_CADENAS = { format: 'cadenas', params: { m: 256, t: 1, p: 1 } };
const FAST_AGE = { format: 'age', workFactor: 10 };

const random = (size) => {
  const out = new Uint8Array(size);
  for (let i = 0; i < size; i += 65536) crypto.getRandomValues(out.subarray(i, i + 65536));
  return out;
};
const text = (s) => new TextEncoder().encode(s);
const enc = async (bytes, pwd, opts) => readAll(await encrypt(streamFromBytes(bytes), pwd, opts));
const dec = async (bytes, pwd) => {
  const { format, stream } = await decrypt(streamFromBytes(bytes), pwd);
  return { format, plain: await readAll(stream) };
};
const hasCode = (code) => (err) => err instanceof CadenasError && err.code === code;

/** Fichier age par mot de passe produit directement par la bibliothèque officielle (équivaut à `age -p`). */
async function ageFile(bytes, pwd) {
  const e = new Encrypter();
  e.setPassphrase(pwd);
  e.setScryptWorkFactor(10);
  return e.encrypt(bytes);
}

describe('format par défaut', () => {
  test('encrypt produit un .cadenas', async () => {
    const sealed = await enc(text('salut'), 'pwd', { params: FAST_CADENAS.params });
    assert.equal(detectFormat(sealed), 'cadenas');
  });

  test('aller-retour .cadenas', async () => {
    const plain = random(150_000);
    const result = await dec(await enc(plain, 'pwd', FAST_CADENAS), 'pwd');
    assert.equal(result.format, 'cadenas');
    assert.deepEqual(result.plain, plain);
  });

  test('format inconnu refusé au chiffrement', async () => {
    await assert.rejects(enc(text('x'), 'pwd', { format: 'zip' }), TypeError);
  });
});

describe('compatibilité age', () => {
  test('encrypt au format age produit un vrai fichier age', async () => {
    const sealed = await enc(text('salut'), 'pwd', FAST_AGE);
    assert.equal(detectFormat(sealed), 'age');
    assert.match(new TextDecoder().decode(sealed.subarray(0, 60)), /^age-encryption\.org\/v1\n-> scrypt /);
  });

  test('aller-retour .age en flux', async () => {
    const plain = random(200_000);
    const result = await dec(await enc(plain, 'pwd', FAST_AGE), 'pwd');
    assert.equal(result.format, 'age');
    assert.deepEqual(result.plain, plain);
  });

  test('lit un fichier age créé par la bibliothèque officielle', async () => {
    const plain = random(1000);
    const result = await dec(await ageFile(plain, 'mot de passe'), 'mot de passe');
    assert.deepEqual(result.plain, plain);
  });

  test('lit un fichier age armuré (age -a)', async () => {
    const plain = random(1000);
    const armored = text(armor.encode(await ageFile(plain, 'pwd')));
    const result = await dec(armored, 'pwd');
    assert.equal(result.format, 'age');
    assert.deepEqual(result.plain, plain);
  });

  test('mauvais mot de passe', async () => {
    await assert.rejects(dec(await ageFile(text('x'), 'pwd'), 'autre'), hasCode('WRONG_PASSWORD'));
  });

  test('corps altéré', async () => {
    const sealed = await ageFile(random(200_000), 'pwd');
    sealed[sealed.length - 100] ^= 1;
    await assert.rejects(dec(sealed, 'pwd'), hasCode('CORRUPTED'));
  });

  test('fichier age chiffré pour une clé publique', async () => {
    const e = new Encrypter();
    e.addRecipient(await identityToRecipient(await generateIdentity()));
    await assert.rejects(dec(await e.encrypt('x'), 'pwd'), hasCode('UNSUPPORTED_AGE'));
  });

  test('mot de passe vide', async () => {
    await assert.rejects(enc(text('x'), '', FAST_AGE), hasCode('EMPTY_PASSWORD'));
  });

  test('coût scrypt trop élevé refusé avant tout calcul', async () => {
    const sealed = await ageFile(text('x'), 'pwd');
    const header = new TextDecoder().decode(sealed.subarray(0, 120));
    for (const workFactor of ['19', '20', '22', '064', 'x']) {
      const forged = text(header.replace(/^(-> scrypt \S+) 10$/m, `$1 ${workFactor}`));
      const file = new Uint8Array([...forged, ...sealed.subarray(120)]);
      const start = Date.now();
      await assert.rejects(dec(file, 'pwd'), hasCode('INVALID_PARAMS'), workFactor);
      assert.ok(Date.now() - start < 1000, `refus immédiat (${workFactor})`);
    }
  });

  test('fichier age reçu octet par octet', async () => {
    const sealed = await ageFile(text('goutte à goutte'), 'pwd');
    let i = 0;
    const drip = new ReadableStream({
      pull(controller) {
        if (i >= sealed.length) return controller.close();
        controller.enqueue(sealed.slice(i, ++i));
      },
    });
    const { stream } = await decrypt(drip, 'pwd');
    assert.equal(new TextDecoder().decode(await readAll(stream)), 'goutte à goutte');
  });

  test('chiffrer avec un coût scrypt trop élevé est refusé', async () => {
    await assert.rejects(enc(text('x'), 'pwd', { format: 'age', workFactor: 19 }), hasCode('INVALID_PARAMS'));
  });

  test('en-tête age sans fin refusé sans tout lire', async () => {
    let sent = 0;
    const endless = new ReadableStream({
      pull(controller) {
        if (sent === 0) controller.enqueue(text('age-encryption.org/v1\n-> scrypt '));
        else controller.enqueue(new Uint8Array(65536).fill(0x41));
        sent++;
        if (sent > 10_000) controller.close();
      },
    });
    await assert.rejects(decrypt(endless, 'pwd'), hasCode('CORRUPTED'));
    assert.ok(sent < 10, `lecture arrêtée tôt (${sent} morceaux)`);
  });

  test('fichier age armuré trop volumineux refusé', async () => {
    const chunk = text('A'.repeat(1024 * 1024));
    let sent = 0;
    const huge = new ReadableStream({
      pull(controller) {
        controller.enqueue(sent === 0 ? text('-----BEGIN AGE ENCRYPTED FILE-----\n') : chunk);
        sent++;
      },
    });
    await assert.rejects(decrypt(huge, 'pwd'), hasCode('TOO_LARGE'));
    assert.ok(sent < 140, `lecture arrêtée à la limite (${sent} Mo)`);
  });
});

describe('détection', () => {
  test('detectFormat', () => {
    assert.equal(detectFormat(text('CADENAS\x01')), 'cadenas');
    assert.equal(detectFormat(text('age-encryption.org/v1\n')), 'age');
    assert.equal(detectFormat(text('-----BEGIN AGE ENCRYPTED FILE-----\n')), 'age');
    assert.equal(detectFormat(text('PK\x03\x04')), null);
    assert.equal(detectFormat(new Uint8Array(0)), null);
  });

  test('fichier inconnu ou vide refusé', async () => {
    await assert.rejects(dec(text('ceci n’est pas chiffré'), 'pwd'), hasCode('UNKNOWN_FORMAT'));
    await assert.rejects(dec(new Uint8Array(0), 'pwd'), hasCode('UNKNOWN_FORMAT'));
  });

  test('noms de fichiers de sortie', () => {
    assert.equal(encryptedName('photo.jpg'), 'photo.jpg.cadenas');
    assert.equal(encryptedName('photo.jpg', 'age'), 'photo.jpg.age');
    assert.equal(decryptedName('photo.jpg.cadenas'), 'photo.jpg');
    assert.equal(decryptedName('photo.jpg.AGE'), 'photo.jpg');
    assert.equal(decryptedName('.cadenas'), '.cadenas.dechiffre');
    assert.equal(decryptedName('archive.bin'), 'archive.bin.dechiffre');
  });

  test('peek ne perd aucun octet', async () => {
    const data = random(1000);
    let offset = 0;
    const source = new ReadableStream({
      pull(controller) {
        if (offset >= data.length) return controller.close();
        controller.enqueue(data.slice(offset, (offset += 7)));
      },
    });
    const { head, stream } = await peek(source, 256);
    assert.ok(head.length >= 256);
    assert.deepEqual(await readAll(stream), data);
  });
});
