/**
 * Adaptateur vers le format age (https://age-encryption.org/v1), via la
 * bibliothèque officielle `age-encryption`. cadenas n'utilise que le mode
 * « mot de passe » d'age (scrypt) ; les fichiers age chiffrés pour une clé
 * publique sont détectés et refusés avec un message clair.
 */
import { Decrypter, Encrypter, armor } from 'age-encryption';
import { ByteQueue, streamFromBytes } from './bytes.js';
import { isAgeArmored } from './detect.js';
import { CadenasError } from './errors.js';

/**
 * Coût scrypt maximal accepté au déchiffrement (log2 de N). scrypt utilise
 * 128·r·N octets de mémoire : 18 donne 256 Mio, la même limite que pour
 * Argon2id dans le format .cadenas. C'est aussi la valeur par défaut d'age :
 * au-delà, un fichier piégé pourrait épuiser la mémoire (1 Gio à 20) avant
 * même la vérification du mot de passe.
 */
export const MAX_SCRYPT_WORK_FACTOR = 18;

/** Taille maximale de l'en-tête age : il ne contient que quelques lignes. */
const MAX_HEADER = 64 * 1024;

/**
 * Taille maximale d'un fichier age armuré (texte). Il est lu entièrement en
 * mémoire, puis décodé : on borne donc sa taille.
 */
export const MAX_ARMORED_SIZE = 128 * 1024 * 1024;

const encoder = new TextEncoder();
const HEADER_END = encoder.encode('\n--- ');

function indexOf(bytes, pattern, from = 0) {
  outer: for (let i = from; i <= bytes.length - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) if (bytes[i + j] !== pattern[j]) continue outer;
    return i;
  }
  return -1;
}

function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

/**
 * Lit l'en-tête age (jusqu'à la ligne « --- ») sans le perdre, vérifie qu'il
 * s'agit d'un chiffrement par mot de passe au coût raisonnable, et renvoie un
 * flux équivalent au fichier complet.
 */
async function checkHeader(input) {
  const reader = input.getReader();
  const fail = async (error) => {
    await reader.cancel().catch(() => {});
    throw error;
  };
  let buffer = new Uint8Array(0);
  let done = false;
  let headerEnd = -1;
  while (headerEnd < 0) {
    const marker = indexOf(buffer, HEADER_END);
    if (marker >= 0) {
      const newline = buffer.indexOf(0x0a, marker + HEADER_END.length);
      if (newline >= 0) headerEnd = newline;
    }
    if (headerEnd >= 0) break;
    if (buffer.length > MAX_HEADER || done) {
      return fail(new CadenasError('CORRUPTED', 'L’en-tête du fichier age est invalide.'));
    }
    const result = await reader.read();
    if (result.done) done = true;
    else buffer = concat(buffer, result.value);
  }
  if (headerEnd > MAX_HEADER) {
    return fail(new CadenasError('CORRUPTED', 'L’en-tête du fichier age est invalide.'));
  }

  const lines = new TextDecoder().decode(buffer.subarray(0, headerEnd)).split('\n');
  const scrypt = lines.filter((line) => line.startsWith('-> scrypt '));
  if (scrypt.length === 0) {
    return fail(
      new CadenasError(
        'UNSUPPORTED_AGE',
        'Ce fichier age est chiffré pour une clé publique, pas avec un mot de passe : cadenas ne peut pas l’ouvrir.',
      ),
    );
  }
  for (const line of scrypt) {
    const workFactor = line.split(' ')[3];
    if (!/^[1-9][0-9]?$/.test(workFactor ?? '') || Number(workFactor) > MAX_SCRYPT_WORK_FACTOR) {
      return fail(
        new CadenasError(
          'INVALID_PARAMS',
          `Coût scrypt invalide ou trop élevé (${workFactor}, maximum ${MAX_SCRYPT_WORK_FACTOR}).`,
        ),
      );
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      if (buffer.length > 0) controller.enqueue(buffer);
      if (done) controller.close();
    },
    async pull(controller) {
      const { done: end, value } = await reader.read();
      if (end) controller.close();
      else controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return { stream, cancel: () => reader.cancel().catch(() => {}) };
}

/** Lit un flux entier, en refusant au-delà de `max` octets. */
async function readAllAtMost(stream, max) {
  const reader = stream.getReader();
  const queue = new ByteQueue();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    queue.push(value);
    if (queue.length > max) {
      await reader.cancel().catch(() => {});
      throw new CadenasError(
        'TOO_LARGE',
        `Ce fichier age au format texte est trop volumineux (plus de ${max / 1024 / 1024} Mo).`,
      );
    }
  }
  return queue.takeAll();
}

function checkPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new CadenasError('EMPTY_PASSWORD', 'Le mot de passe ne peut pas être vide.');
  }
}

/**
 * Chiffre un flux au format age (mot de passe, scrypt).
 *
 * @param {ReadableStream<Uint8Array>} input
 * @param {string} password
 * @param {object} [options]
 * @param {number} [options.workFactor] log2 du coût scrypt (18 par défaut)
 * @returns {Promise<ReadableStream<Uint8Array>>}
 */
export async function encrypt(input, password, options = {}) {
  checkPassword(password);
  const encrypter = new Encrypter();
  encrypter.setPassphrase(password);
  if (options.workFactor) {
    if (options.workFactor > MAX_SCRYPT_WORK_FACTOR) {
      throw new CadenasError('INVALID_PARAMS', `Coût scrypt trop élevé (maximum ${MAX_SCRYPT_WORK_FACTOR}).`);
    }
    encrypter.setScryptWorkFactor(options.workFactor);
  }
  return encrypter.encrypt(input);
}

/**
 * Déchiffre un flux age (binaire ou armuré).
 *
 * @param {ReadableStream<Uint8Array>} input
 * @param {string} password
 * @param {Uint8Array} head  premiers octets du fichier, déjà lus pour la détection
 * @returns {Promise<ReadableStream<Uint8Array>>}
 */
export async function decrypt(input, password, head) {
  checkPassword(password);
  if (isAgeArmored(head)) {
    const text = new TextDecoder().decode(await readAllAtMost(input, MAX_ARMORED_SIZE));
    let bytes;
    try {
      bytes = armor.decode(text);
    } catch (cause) {
      throw new CadenasError('CORRUPTED', 'Le fichier age (texte) est endommagé.', { cause });
    }
    return decryptBinary(streamFromBytes(bytes), password);
  }
  return decryptBinary(input, password);
}

async function decryptBinary(input, password) {
  const { stream, cancel } = await checkHeader(input);
  const decrypter = new Decrypter();
  decrypter.addPassphrase(password);
  let output;
  try {
    output = await decrypter.decrypt(stream);
  } catch (cause) {
    await cancel();
    // age-encryption ne donne pas de code d'erreur : seul son message
    // distingue un mauvais mot de passe. test/core.test.js (« mauvais mot de
    // passe ») échoue si une mise à jour de la bibliothèque le change.
    if (/no identity matched/.test(cause?.message)) {
      throw new CadenasError('WRONG_PASSWORD', 'Mot de passe incorrect.', { cause });
    }
    throw new CadenasError('CORRUPTED', 'Le fichier chiffré est endommagé ou a été modifié.', { cause });
  }
  if (output instanceof Uint8Array) return streamFromBytes(output);
  return mapBodyErrors(output);
}

/** Relaie un flux en traduisant ses erreurs en CadenasError('CORRUPTED'). */
function mapBodyErrors(stream) {
  const reader = stream.getReader();
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (cause) {
        controller.error(
          new CadenasError('CORRUPTED', 'Le fichier chiffré est endommagé, incomplet ou a été modifié.', { cause }),
        );
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}
