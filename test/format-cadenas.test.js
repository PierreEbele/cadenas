import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CHUNK_SIZE,
  DEFAULT_PARAMS,
  HEADER_SIZE,
  TAG_SIZE,
  decrypt,
  decryptedSize,
  encrypt,
  encryptedSize,
  isCadenas,
} from '../src/format-cadenas.js';
import { readAll, streamFromBytes } from '../src/bytes.js';
import { CadenasError } from '../src/errors.js';

// Paramètres Argon2id faibles : les tests portent sur le format, pas sur le coût.
const FAST = { params: { m: 256, t: 1, p: 1 } };
const CT_CHUNK = CHUNK_SIZE + TAG_SIZE;

const enc = async (bytes, pwd = 'motdepasse', opts = FAST) =>
  readAll(await encrypt(streamFromBytes(bytes), pwd, opts));
const dec = async (bytes, pwd = 'motdepasse') => readAll(await decrypt(streamFromBytes(bytes), pwd));

function random(size) {
  const out = new Uint8Array(size);
  for (let i = 0; i < size; i += 65536) crypto.getRandomValues(out.subarray(i, i + 65536));
  return out;
}

function streamInPieces(bytes, pieceSize) {
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, offset + pieceSize));
      offset += pieceSize;
    },
  });
}

const hasCode = (code) => (err) => err instanceof CadenasError && err.code === code;
const hasOneOf = (...codes) => (err) => err instanceof CadenasError && codes.includes(err.code);

const SIZES = [0, 1, 1000, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 2 * CHUNK_SIZE, 3 * CHUNK_SIZE + 123];

describe('aller-retour', () => {
  for (const size of SIZES) {
    test(`${size} octets`, async () => {
      const plain = random(size);
      const sealed = await enc(plain);
      assert.equal(sealed.length, encryptedSize(size));
      assert.equal(decryptedSize(sealed.length), size);
      assert.deepEqual(await dec(sealed), plain);
    });
  }

  test('entrées découpées en morceaux irréguliers', async () => {
    const plain = random(3 * CHUNK_SIZE + 5);
    for (const piece of [7, 100_000]) {
      const sealed = await readAll(await encrypt(streamInPieces(plain, piece), 'pwd', FAST));
      const opened = await readAll(await decrypt(streamInPieces(sealed, 13), 'pwd'));
      assert.deepEqual(opened, plain);
    }
  });

  test('le mot de passe est normalisé en NFC', async () => {
    const plain = random(100);
    const sealed = await enc(plain, 'Pâté🔒'.normalize('NFC'));
    assert.deepEqual(await dec(sealed, 'Pâté🔒'.normalize('NFD')), plain);
  });

  test('deux chiffrements du même contenu diffèrent', async () => {
    const plain = random(100);
    assert.notDeepEqual(await enc(plain), await enc(plain));
  });

  test('les paramètres par défaut sont écrits dans l’en-tête', async () => {
    const sealed = await enc(new Uint8Array(0), 'pwd', {});
    const view = new DataView(sealed.buffer, sealed.byteOffset);
    assert.equal(view.getUint32(9), DEFAULT_PARAMS.m);
    assert.equal(view.getUint32(13), DEFAULT_PARAMS.t);
    assert.equal(view.getUint8(17), DEFAULT_PARAMS.p);
  });
});

describe('erreurs avant tout déchiffrement', () => {
  test('mauvais mot de passe', async () => {
    const sealed = await enc(random(10));
    await assert.rejects(dec(sealed, 'autre'), hasCode('WRONG_PASSWORD'));
  });

  test('mot de passe vide', async () => {
    await assert.rejects(enc(random(10), ''), hasCode('EMPTY_PASSWORD'));
    await assert.rejects(dec(await enc(random(10)), ''), hasCode('EMPTY_PASSWORD'));
  });

  test('fichier qui n’est pas un .cadenas', async () => {
    const text = new TextEncoder().encode('hello world '.repeat(10));
    await assert.rejects(dec(text), hasCode('UNKNOWN_FORMAT'));
    await assert.rejects(dec(new Uint8Array(0)), hasCode('UNKNOWN_FORMAT'));
  });

  test('en-tête tronqué', async () => {
    const sealed = await enc(random(10));
    await assert.rejects(dec(sealed.slice(0, 20)), hasCode('TRUNCATED'));
  });

  test('version inconnue', async () => {
    const sealed = await enc(random(10));
    sealed[7] = 2;
    await assert.rejects(dec(sealed), hasCode('UNSUPPORTED_VERSION'));
  });

  test('paramètres hors limites rejetés sans dérivation', async () => {
    const sealed = await enc(random(10));
    new DataView(sealed.buffer).setUint32(9, 0xffffffff);
    const start = performance.now();
    await assert.rejects(dec(sealed), hasCode('INVALID_PARAMS'));
    assert.ok(performance.now() - start < 500);
  });

  test('paramètres invalides au chiffrement', async () => {
    await assert.rejects(enc(random(10), 'pwd', { params: { t: 0 } }), hasCode('INVALID_PARAMS'));
  });

  test('en-tête altéré', async () => {
    const sealed = await enc(random(10));
    sealed[20] ^= 1;
    await assert.rejects(dec(sealed), hasCode('WRONG_PASSWORD'));
  });
});

describe('intégrité du corps', () => {
  const plainSize = 2 * CHUNK_SIZE + 10;

  test('octet modifié dans un bloc', async () => {
    const sealed = await enc(random(plainSize));
    sealed[HEADER_SIZE + CT_CHUNK + 1000] ^= 1;
    await assert.rejects(dec(sealed), hasCode('CORRUPTED'));
  });

  test('troncature à une frontière de bloc', async () => {
    const sealed = await enc(random(plainSize));
    await assert.rejects(dec(sealed.slice(0, HEADER_SIZE + CT_CHUNK)), hasCode('TRUNCATED'));
  });

  test('troncature au milieu d’un bloc', async () => {
    const sealed = await enc(random(plainSize));
    await assert.rejects(dec(sealed.slice(0, sealed.length - 1000)), hasOneOf('CORRUPTED', 'TRUNCATED'));
  });

  test('corps absent', async () => {
    const sealed = await enc(random(10));
    await assert.rejects(dec(sealed.slice(0, HEADER_SIZE)), hasCode('TRUNCATED'));
  });

  test('blocs réordonnés', async () => {
    const sealed = await enc(random(3 * CHUNK_SIZE));
    const first = sealed.slice(HEADER_SIZE, HEADER_SIZE + CT_CHUNK);
    const second = sealed.slice(HEADER_SIZE + CT_CHUNK, HEADER_SIZE + 2 * CT_CHUNK);
    sealed.set(second, HEADER_SIZE);
    sealed.set(first, HEADER_SIZE + CT_CHUNK);
    await assert.rejects(dec(sealed), hasCode('CORRUPTED'));
  });

  test('octets ajoutés à la fin', async () => {
    const sealed = await enc(random(CHUNK_SIZE));
    const extended = new Uint8Array(sealed.length + TAG_SIZE);
    extended.set(sealed);
    await assert.rejects(dec(extended), hasOneOf('CORRUPTED', 'TRUNCATED'));
  });
});

describe('détection', () => {
  test('isCadenas', async () => {
    assert.equal(isCadenas(await enc(random(1))), true);
    assert.equal(isCadenas(new TextEncoder().encode('hello')), false);
    assert.equal(isCadenas(new Uint8Array(0)), false);
  });
});

describe('vecteur de test v1', () => {
  const vector = JSON.parse(readFileSync(new URL('./fixtures/vector-v1.json', import.meta.url), 'utf8'));
  const hex = (bytes) => Buffer.from(bytes).toString('hex');
  const options = {
    params: vector.params,
    salt: Buffer.from(vector.salt, 'hex'),
    noncePrefix: Buffer.from(vector.noncePrefix, 'hex'),
  };

  test('le chiffrement est déterministe et stable', async () => {
    const plain = new TextEncoder().encode(vector.plaintext);
    const sealed = await enc(plain, vector.password, options);
    assert.equal(hex(sealed), vector.ciphertext);
  });

  test('le vecteur se déchiffre', async () => {
    const opened = await dec(Buffer.from(vector.ciphertext, 'hex'), vector.password);
    assert.equal(new TextDecoder().decode(opened), vector.plaintext);
  });
});
