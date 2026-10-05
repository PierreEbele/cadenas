/**
 * Format de fichier .cadenas, version 1.
 *
 * Spécification complète : docs/FORMAT.md. En résumé :
 *
 *   en-tête  = "CADENAS" ‖ version ‖ kdf ‖ m ‖ t ‖ p ‖ sel ‖ préfixe de nonce ‖ HMAC
 *   corps    = blocs de 64 Kio chiffrés en XChaCha20-Poly1305
 *
 * La clé maître est dérivée du mot de passe par Argon2id, puis HKDF-SHA256 en
 * tire une clé d'authentification de l'en-tête et une clé de chiffrement du
 * corps. Le dernier bloc est marqué dans son nonce pour détecter les
 * troncatures, et le compteur de bloc empêche de les réordonner.
 *
 * Tout fonctionne avec l'API Web Streams, disponible à l'identique dans Node.js
 * et dans les navigateurs.
 */
import { argon2id } from 'hash-wasm';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { equalBytes, randomBytes } from '@noble/ciphers/utils.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ByteQueue } from './bytes.js';
import { CADENAS_MAGIC as MAGIC, isCadenas } from './detect.js';
import { CadenasError } from './errors.js';

export { isCadenas };
export const VERSION = 1;
export const KDF_ARGON2ID = 1;

export const CHUNK_SIZE = 64 * 1024;
export const TAG_SIZE = 16;
export const SALT_SIZE = 16;
export const NONCE_PREFIX_SIZE = 16;
export const MAC_SIZE = 32;
const CT_CHUNK_SIZE = CHUNK_SIZE + TAG_SIZE;

// magic(7) version(1) kdf(1) m(4) t(4) p(1) sel(16) préfixe(16)
const FIELDS_SIZE = 7 + 1 + 1 + 4 + 4 + 1 + SALT_SIZE + NONCE_PREFIX_SIZE;
export const HEADER_SIZE = FIELDS_SIZE + MAC_SIZE;

/** Paramètres Argon2id par défaut (m en Kio). */
export const DEFAULT_PARAMS = Object.freeze({ m: 64 * 1024, t: 3, p: 1 });

/**
 * Bornes acceptées, au chiffrement comme au déchiffrement (anti-DoS). Un
 * fichier forgé impose son coût Argon2id avant toute authentification : au
 * pire 256 Mio × 16 passes, soit une vingtaine de fois le coût par défaut.
 */
export const PARAM_LIMITS = Object.freeze({
  m: { min: 8, max: 256 * 1024 }, // 8 Kio .. 256 Mio
  t: { min: 1, max: 16 },
  p: { min: 1, max: 16 },
});

const INFO_HEADER = new TextEncoder().encode('cadenas/v1/header');
const INFO_PAYLOAD = new TextEncoder().encode('cadenas/v1/payload');

/** Taille du fichier chiffré pour un clair de `size` octets. */
export function encryptedSize(size) {
  const chunks = Math.max(1, Math.ceil(size / CHUNK_SIZE));
  return HEADER_SIZE + size + chunks * TAG_SIZE;
}

/** Taille du clair pour un fichier chiffré de `size` octets. */
export function decryptedSize(size) {
  const body = size - HEADER_SIZE;
  if (body < TAG_SIZE) throw new CadenasError('TRUNCATED', 'Le fichier chiffré est incomplet.');
  const chunks = Math.ceil(body / CT_CHUNK_SIZE);
  return body - chunks * TAG_SIZE;
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new CadenasError('EMPTY_PASSWORD', 'Le mot de passe ne peut pas être vide.');
  }
}

function checkParams({ m, t, p }) {
  const ok =
    [m, t, p].every(Number.isInteger) &&
    m >= PARAM_LIMITS.m.min && m <= PARAM_LIMITS.m.max && m >= 8 * p &&
    t >= PARAM_LIMITS.t.min && t <= PARAM_LIMITS.t.max &&
    p >= PARAM_LIMITS.p.min && p <= PARAM_LIMITS.p.max;
  if (!ok) {
    throw new CadenasError('INVALID_PARAMS', `Paramètres Argon2id invalides (m=${m}, t=${t}, p=${p}).`);
  }
}

async function deriveKeys(password, salt, { m, t, p }) {
  // Effacement au mieux : la chaîne JavaScript elle-même ne peut pas l'être.
  const passwordBytes = new TextEncoder().encode(password.normalize('NFC'));
  let master;
  try {
    master = await argon2id({
      password: passwordBytes,
      salt,
      memorySize: m,
      iterations: t,
      parallelism: p,
      hashLength: 32,
      outputType: 'binary',
    });
  } finally {
    passwordBytes.fill(0);
  }
  const macKey = hkdf(sha256, master, undefined, INFO_HEADER, 32);
  const encKey = hkdf(sha256, master, undefined, INFO_PAYLOAD, 32);
  master.fill(0);
  return { macKey, encKey };
}

function encodeFields({ m, t, p }, salt, noncePrefix) {
  const fields = new Uint8Array(FIELDS_SIZE);
  const view = new DataView(fields.buffer);
  fields.set(MAGIC, 0);
  view.setUint8(7, VERSION);
  view.setUint8(8, KDF_ARGON2ID);
  view.setUint32(9, m);
  view.setUint32(13, t);
  view.setUint8(17, p);
  fields.set(salt, 18);
  fields.set(noncePrefix, 18 + SALT_SIZE);
  return fields;
}

function decodeFields(fields) {
  const view = new DataView(fields.buffer, fields.byteOffset, fields.byteLength);
  return {
    version: view.getUint8(7),
    kdf: view.getUint8(8),
    params: { m: view.getUint32(9), t: view.getUint32(13), p: view.getUint8(17) },
    salt: fields.slice(18, 18 + SALT_SIZE),
    noncePrefix: fields.slice(18 + SALT_SIZE, FIELDS_SIZE),
  };
}

function chunkNonce(prefix, counter, last) {
  const nonce = new Uint8Array(24);
  nonce.set(prefix, 0);
  const view = new DataView(nonce.buffer);
  const high = Math.floor(counter / 2 ** 32);
  view.setUint32(16, (high | (last ? 0x80000000 : 0)) >>> 0);
  view.setUint32(20, counter >>> 0);
  return nonce;
}

/**
 * Chiffre un flux.
 *
 * @param {ReadableStream<Uint8Array>} input  données en clair
 * @param {string} password
 * @param {object} [options]
 * @param {{m?: number, t?: number, p?: number}} [options.params] paramètres Argon2id
 * @param {Uint8Array} [options.salt]         imposé (vecteurs de test uniquement)
 * @param {Uint8Array} [options.noncePrefix]  imposé (vecteurs de test uniquement)
 * @returns {Promise<ReadableStream<Uint8Array>>} le fichier .cadenas ; la
 *   promesse se résout une fois la clé dérivée et l'en-tête prêt.
 */
export async function encrypt(input, password, options = {}) {
  checkPassword(password);
  const params = { ...DEFAULT_PARAMS, ...options.params };
  checkParams(params);
  const salt = options.salt ?? randomBytes(SALT_SIZE);
  const noncePrefix = options.noncePrefix ?? randomBytes(NONCE_PREFIX_SIZE);

  const fields = encodeFields(params, salt, noncePrefix);
  const { macKey, encKey } = await deriveKeys(password, salt, params);
  const header = new Uint8Array(HEADER_SIZE);
  header.set(fields, 0);
  header.set(hmac(sha256, macKey, fields), FIELDS_SIZE);
  macKey.fill(0);

  const reader = input.getReader();
  const queue = new ByteQueue();
  let inputDone = false;
  let counter = 0;

  const seal = (plain, last) => {
    const nonce = chunkNonce(noncePrefix, counter++, last);
    return xchacha20poly1305(encKey, nonce, header).encrypt(plain);
  };

  return new ReadableStream({
    start(controller) {
      controller.enqueue(header);
    },
    async pull(controller) {
      // On garde toujours au moins un octet d'avance : sans cela, impossible
      // de savoir si le bloc courant est le dernier.
      try {
        while (!inputDone && queue.length <= CHUNK_SIZE) {
          const { done, value } = await reader.read();
          if (done) inputDone = true;
          else queue.push(value);
        }
      } catch (err) {
        encKey.fill(0);
        throw err;
      }
      if (queue.length > CHUNK_SIZE) {
        controller.enqueue(seal(queue.take(CHUNK_SIZE), false));
      } else {
        controller.enqueue(seal(queue.takeAll(), true));
        encKey.fill(0);
        controller.close();
      }
    },
    cancel(reason) {
      encKey.fill(0);
      return reader.cancel(reason);
    },
  });
}

/**
 * Déchiffre un flux .cadenas.
 *
 * La promesse est rejetée avec WRONG_PASSWORD, UNKNOWN_FORMAT, etc. avant
 * qu'un seul octet de clair ne soit produit ; les erreurs dans le corps
 * (CORRUPTED, TRUNCATED) sont remontées par le flux renvoyé.
 *
 * @param {ReadableStream<Uint8Array>} input  fichier .cadenas
 * @param {string} password
 * @returns {Promise<ReadableStream<Uint8Array>>} données en clair
 */
export async function decrypt(input, password) {
  checkPassword(password);
  const reader = input.getReader();
  const queue = new ByteQueue();
  let inputDone = false;

  const fill = async (n) => {
    while (!inputDone && queue.length < n) {
      const { done, value } = await reader.read();
      if (done) inputDone = true;
      else queue.push(value);
    }
  };

  let header;
  try {
    await fill(HEADER_SIZE);
    if (queue.length < HEADER_SIZE) {
      const start = queue.takeAll();
      if (isCadenas(start)) throw new CadenasError('TRUNCATED', 'Le fichier chiffré est incomplet.');
      throw new CadenasError('UNKNOWN_FORMAT', 'Ce fichier n’est pas un fichier chiffré par cadenas.');
    }
    header = queue.take(HEADER_SIZE);
    if (!isCadenas(header)) {
      throw new CadenasError('UNKNOWN_FORMAT', 'Ce fichier n’est pas un fichier chiffré par cadenas.');
    }
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw err;
  }

  const fields = header.subarray(0, FIELDS_SIZE);
  const mac = header.subarray(FIELDS_SIZE);
  const { version, kdf, params, noncePrefix, salt } = decodeFields(fields);
  if (version !== VERSION) {
    await reader.cancel().catch(() => {});
    throw new CadenasError(
      'UNSUPPORTED_VERSION',
      `Ce fichier utilise la version ${version} du format, non prise en charge. Mettez cadenas à jour.`,
    );
  }
  try {
    if (kdf !== KDF_ARGON2ID) {
      throw new CadenasError('INVALID_PARAMS', `Fonction de dérivation de clé inconnue (${kdf}).`);
    }
    checkParams(params);
  } catch (err) {
    await reader.cancel().catch(() => {});
    throw err;
  }

  const { macKey, encKey } = await deriveKeys(password, salt, params);
  const expected = hmac(sha256, macKey, fields);
  macKey.fill(0);
  if (!equalBytes(expected, mac)) {
    encKey.fill(0);
    await reader.cancel().catch(() => {});
    throw new CadenasError('WRONG_PASSWORD', 'Mot de passe incorrect.');
  }

  let counter = 0;
  const open = (sealed, last) => {
    const nonce = chunkNonce(noncePrefix, counter, last);
    return xchacha20poly1305(encKey, nonce, header).decrypt(sealed);
  };

  return new ReadableStream({
    async pull(controller) {
      try {
        await fill(CT_CHUNK_SIZE + 1);
        if (queue.length > CT_CHUNK_SIZE) {
          controller.enqueue(openOrThrow(queue.take(CT_CHUNK_SIZE), false));
          counter++;
          return;
        }
        const final = queue.takeAll();
        if (final.length < TAG_SIZE || (final.length === TAG_SIZE && counter > 0)) {
          throw new CadenasError('TRUNCATED', 'Le fichier chiffré est incomplet.');
        }
        controller.enqueue(openOrThrow(final, true));
        encKey.fill(0);
        controller.close();
      } catch (err) {
        encKey.fill(0);
        await reader.cancel().catch(() => {});
        controller.error(err);
      }
    },
    cancel(reason) {
      encKey.fill(0);
      return reader.cancel(reason);
    },
  });

  function openOrThrow(sealed, last) {
    try {
      return open(sealed, last);
    } catch {
      // Un bloc complet qui ne s'ouvre qu'en tant que bloc intermédiaire
      // signifie que la suite du fichier a été coupée.
      if (last && sealed.length === CT_CHUNK_SIZE) {
        try {
          open(sealed, false);
          throw new CadenasError('TRUNCATED', 'Le fichier chiffré est incomplet.');
        } catch (err) {
          if (err instanceof CadenasError) throw err;
        }
      }
      throw new CadenasError('CORRUPTED', 'Le fichier chiffré est endommagé ou a été modifié.');
    }
  }
}
