/**
 * Adaptateur vers le format age (https://age-encryption.org/v1), via la
 * bibliothèque officielle `age-encryption`. cadenas n'utilise que le mode
 * « mot de passe » d'age (scrypt) ; les fichiers age chiffrés pour une clé
 * publique sont détectés et refusés avec un message clair.
 */
import { Decrypter, Encrypter, armor } from 'age-encryption';
import { readAll, streamFromBytes } from './bytes.js';
import { DETECT_SIZE, isAgeArmored } from './detect.js';
import { CadenasError } from './errors.js';

/** L'en-tête age contient-il une recette scrypt (chiffrement par mot de passe) ? */
function hasScryptStanza(head) {
  return new TextDecoder().decode(head).includes('\n-> scrypt ');
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
  if (options.workFactor) encrypter.setScryptWorkFactor(options.workFactor);
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
    const text = new TextDecoder().decode(await readAll(input));
    let bytes;
    try {
      bytes = armor.decode(text);
    } catch (cause) {
      throw new CadenasError('CORRUPTED', 'Le fichier age (texte) est endommagé.', { cause });
    }
    // Seul le début sert à reconnaître la recette scrypt : décoder tout le
    // fichier en texte doublerait la mémoire, et échouerait au-delà de 512 Mo.
    return decryptBinary(bytes, password, bytes.subarray(0, DETECT_SIZE));
  }
  return decryptBinary(input, password, head);
}

async function decryptBinary(input, password, head) {
  if (!hasScryptStanza(head)) {
    throw new CadenasError(
      'UNSUPPORTED_AGE',
      'Ce fichier age est chiffré pour une clé publique, pas avec un mot de passe : cadenas ne peut pas l’ouvrir.',
    );
  }
  const decrypter = new Decrypter();
  decrypter.addPassphrase(password);
  let output;
  try {
    output = await decrypter.decrypt(input);
  } catch (cause) {
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
