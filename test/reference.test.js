// Implémentation de référence minimale du déchiffrement .cadenas v1, écrite
// directement d'après docs/FORMAT.md avec d'autres briques que src/ (Argon2id
// de @noble/hashes au lieu de hash-wasm). Si elle déchiffre ce que produit
// src/format-cadenas.js, la spécification et le code disent la même chose.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { argon2id } from '@noble/hashes/argon2.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { encrypt } from '../src/format-cadenas.js';
import { readAll, streamFromBytes } from '../src/bytes.js';

function referenceDecrypt(file, password) {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  assert.equal(new TextDecoder().decode(file.subarray(0, 7)), 'CADENAS');
  assert.equal(file[7], 1);
  assert.equal(file[8], 1);
  const m = view.getUint32(9);
  const t = view.getUint32(13);
  const p = file[17];
  const salt = file.subarray(18, 34);
  const prefix = file.subarray(34, 50);
  const header = file.subarray(0, 82);

  const pwd = new TextEncoder().encode(password.normalize('NFC'));
  const master = argon2id(pwd, salt, { m, t, p, dkLen: 32 });
  const macKey = hkdf(sha256, master, undefined, new TextEncoder().encode('cadenas/v1/header'), 32);
  const encKey = hkdf(sha256, master, undefined, new TextEncoder().encode('cadenas/v1/payload'), 32);
  assert.deepEqual(hmac(sha256, macKey, file.subarray(0, 50)), file.subarray(50, 82));

  const body = file.subarray(82);
  const parts = [];
  for (let offset = 0, counter = 0; offset < body.length; offset += 65552, counter++) {
    const last = offset + 65552 >= body.length;
    const nonce = new Uint8Array(24);
    nonce.set(prefix);
    new DataView(nonce.buffer).setBigUint64(16, BigInt(counter) | (last ? 1n << 63n : 0n));
    parts.push(xchacha20poly1305(encKey, nonce, header).decrypt(body.subarray(offset, offset + 65552)));
  }
  return Buffer.concat(parts);
}

test('une implémentation indépendante déchiffre les fichiers produits', async () => {
  for (const size of [0, 5, 65536, 65537, 200_000]) {
    const plain = crypto.getRandomValues(new Uint8Array(Math.min(size, 65536)));
    const full = Buffer.alloc(size, 0);
    for (let i = 0; i < size; i += plain.length) full.set(plain.subarray(0, size - i), i);
    const sealed = await readAll(
      await encrypt(streamFromBytes(full), 'réf', { params: { m: 256, t: 2, p: 2 } }),
    );
    assert.deepEqual(referenceDecrypt(sealed, 'réf'), full);
  }
});
