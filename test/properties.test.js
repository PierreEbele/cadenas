// Tests de propriétés (fuzzing) : fast-check génère des centaines d'entrées,
// de découpages et d'altérations aléatoires, et vérifie des invariants qui
// doivent tenir pour toutes. En cas d'échec, il réduit l'exemple fautif au
// plus petit cas reproductible.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { CHUNK_SIZE, HEADER_SIZE, decrypt, encrypt } from '../src/format-cadenas.js';
import * as core from '../src/core.js';
import { readAll } from '../src/bytes.js';
import { CadenasError } from '../src/errors.js';

const FAST = { params: { m: 256, t: 1, p: 1 } };

/** Flux qui découpe `bytes` selon la suite de tailles `cuts` (répétée). */
function streamWithCuts(bytes, cuts) {
  let offset = 0;
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) return controller.close();
      const size = cuts[i++ % cuts.length];
      controller.enqueue(bytes.slice(offset, offset + size));
      offset += size;
    },
  });
}

/** Contenus de 0 à ~3 blocs, dont les tailles aux frontières de blocs. */
const plaintext = fc
  .oneof(
    fc.integer({ min: 0, max: 3 * CHUNK_SIZE + 100 }),
    fc.constantFrom(0, 1, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 2 * CHUNK_SIZE),
  )
  .chain((size) =>
    fc.integer().map((seed) => {
      // Contenu déterministe à partir d'une graine : plus rapide que fc.uint8Array pour de gros volumes.
      const out = new Uint8Array(size);
      let x = seed | 1;
      for (let i = 0; i < size; i++) {
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        out[i] = x & 0xff;
      }
      return out;
    }),
  );

const cuts = fc.array(fc.integer({ min: 1, max: 100_000 }), { minLength: 1, maxLength: 5 });
const password = fc.string({ minLength: 1, maxLength: 40 });

const sealWith = async (plain, pwd) => readAll(await encrypt(streamWithCuts(plain, [plain.length || 1]), pwd, FAST));
const open = async (sealed, pwd) => readAll(await decrypt(streamWithCuts(sealed, [sealed.length || 1]), pwd));

/** L'opération doit échouer proprement : par une CadenasError, jamais autrement. */
async function rejectsCleanly(promiseFactory) {
  try {
    await promiseFactory();
  } catch (err) {
    if (err instanceof CadenasError) return true;
    throw new Error(`Erreur inattendue (${err?.name}) : ${err?.message}`);
  }
  return false;
}

describe('propriétés du format .cadenas', () => {
  test('déchiffrer(chiffrer(x)) = x, quels que soient le contenu, le mot de passe et le découpage', async () => {
    await fc.assert(
      fc.asyncProperty(plaintext, password, cuts, cuts, async (plain, pwd, inCuts, outCuts) => {
        const sealed = await readAll(await encrypt(streamWithCuts(plain, inCuts), pwd, FAST));
        const opened = await readAll(await decrypt(streamWithCuts(sealed, outCuts), pwd));
        assert.deepEqual(opened, plain);
      }),
      { numRuns: 40 },
    );
  });

  test('toute modification d’un octet est détectée', async () => {
    await fc.assert(
      fc.asyncProperty(plaintext, fc.double({ min: 0, max: 1, maxExcluded: true }), fc.integer({ min: 1, max: 255 }), async (plain, where, mask) => {
        const sealed = await sealWith(plain, 'pwd');
        const index = Math.floor(where * sealed.length);
        // Octets 9-12 (mémoire Argon2id) exclus : une valeur modifiée mais encore
        // admise (jusqu'à 1 Gio) rendrait le test lent ; ce cas a son test dédié.
        fc.pre(index < 9 || index > 12);
        sealed[index] ^= mask;
        assert.ok(await rejectsCleanly(() => open(sealed, 'pwd')), `octet ${index} modifié non détecté`);
      }),
      { numRuns: 150 },
    );
  });

  test('toute troncature est détectée', async () => {
    await fc.assert(
      fc.asyncProperty(plaintext, fc.double({ min: 0, max: 1, maxExcluded: true }), async (plain, where) => {
        const sealed = await sealWith(plain, 'pwd');
        const keep = Math.floor(where * sealed.length);
        assert.ok(await rejectsCleanly(() => open(sealed.subarray(0, keep), 'pwd')), `troncature à ${keep} non détectée`);
      }),
      { numRuns: 100 },
    );
  });

  test('des octets ajoutés à la fin sont détectés', async () => {
    await fc.assert(
      fc.asyncProperty(plaintext, fc.uint8Array({ minLength: 1, maxLength: 100 }), async (plain, extra) => {
        const sealed = await sealWith(plain, 'pwd');
        const extended = new Uint8Array(sealed.length + extra.length);
        extended.set(sealed);
        extended.set(extra, sealed.length);
        assert.ok(await rejectsCleanly(() => open(extended, 'pwd')));
      }),
      { numRuns: 60 },
    );
  });

  test('un autre mot de passe ne déchiffre jamais', async () => {
    await fc.assert(
      fc.asyncProperty(password, password, async (a, b) => {
        fc.pre(a.normalize('NFC') !== b.normalize('NFC'));
        const sealed = await sealWith(new Uint8Array([1, 2, 3]), a);
        await assert.rejects(open(sealed, b), (err) => err.code === 'WRONG_PASSWORD');
      }),
      { numRuns: 60 },
    );
  });
});

describe('robustesse face à des entrées arbitraires', () => {
  const prefixes = fc.constantFrom(
    new Uint8Array(0),
    new TextEncoder().encode('CADENAS'),
    new TextEncoder().encode('CADENAS\x01\x01'),
    new TextEncoder().encode('age-encryption.org/v1\n'),
    new TextEncoder().encode('age-encryption.org/v1\n-> scrypt '),
    new TextEncoder().encode('-----BEGIN AGE ENCRYPTED FILE-----\n'),
  );

  test('des octets quelconques sont refusés proprement, jamais par un plantage', async () => {
    await fc.assert(
      fc.asyncProperty(prefixes, fc.uint8Array({ maxLength: 400 }), async (prefix, junk) => {
        const input = new Uint8Array(prefix.length + junk.length);
        input.set(prefix);
        input.set(junk, prefix.length);
        const rejected = await rejectsCleanly(async () => {
          const { stream } = await core.decrypt(streamWithCuts(input, [input.length || 1]), 'pwd');
          return readAll(stream);
        });
        assert.ok(rejected, 'des octets aléatoires ont été « déchiffrés »');
      }),
      { numRuns: 300 },
    );
  });

  test('un en-tête .cadenas aux champs aléatoires est refusé sans lancer de dérivation coûteuse', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: HEADER_SIZE - 7, maxLength: HEADER_SIZE + 50 }), async (rest) => {
        const input = new Uint8Array(7 + rest.length);
        input.set(new TextEncoder().encode('CADENAS'));
        input.set(rest, 7);
        const start = performance.now();
        assert.ok(await rejectsCleanly(() => open(input, 'pwd')));
        // Bornes des paramètres Argon2id : jamais plus de 1 Gio ni 64 passes.
        assert.ok(performance.now() - start < 20_000);
      }),
      { numRuns: 30 },
    );
  });
});
