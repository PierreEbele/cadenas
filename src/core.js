/**
 * API publique de cadenas, partagée par la CLI et le site.
 *
 * - encrypt() produit un .cadenas (par défaut) ou un .age ;
 * - decrypt() reconnaît automatiquement le format d'après les premiers octets.
 *
 * Entrées et sorties sont des ReadableStream<Uint8Array> (API Web Streams).
 */
import * as cadenas from './format-cadenas.js';
import * as age from './format-age.js';
import { peek } from './bytes.js';
import { CadenasError } from './errors.js';

export { CadenasError } from './errors.js';
export { readAll, streamFromBytes } from './bytes.js';

export const FORMATS = Object.freeze({
  cadenas: { extension: '.cadenas', label: 'cadenas' },
  age: { extension: '.age', label: 'age' },
});

// Assez pour la signature et, pour age, la recette scrypt de l'en-tête.
const DETECT_SIZE = 256;

/**
 * Identifie le format d'un fichier d'après ses premiers octets.
 * @param {Uint8Array} head
 * @returns {'cadenas' | 'age' | null}
 */
export function detectFormat(head) {
  if (cadenas.isCadenas(head)) return 'cadenas';
  if (age.isAge(head) || age.isAgeArmored(head)) return 'age';
  return null;
}

/**
 * Chiffre un flux.
 * @param {ReadableStream<Uint8Array>} input
 * @param {string} password
 * @param {object} [options]
 * @param {'cadenas' | 'age'} [options.format='cadenas']
 * @returns {Promise<ReadableStream<Uint8Array>>}
 */
export async function encrypt(input, password, { format = 'cadenas', ...options } = {}) {
  if (format === 'cadenas') return cadenas.encrypt(input, password, options);
  if (format === 'age') return age.encrypt(input, password, options);
  throw new TypeError(`Format inconnu : ${format}`);
}

/**
 * Déchiffre un flux .cadenas ou .age.
 * @param {ReadableStream<Uint8Array>} input
 * @param {string} password
 * @returns {Promise<{ format: 'cadenas' | 'age', stream: ReadableStream<Uint8Array> }>}
 */
export async function decrypt(input, password) {
  const { head, stream } = await peek(input, DETECT_SIZE);
  const format = detectFormat(head);
  if (format === 'cadenas') return { format, stream: await cadenas.decrypt(stream, password) };
  if (format === 'age') return { format, stream: await age.decrypt(stream, password, head) };
  await stream.cancel().catch(() => {});
  throw new CadenasError('UNKNOWN_FORMAT', 'Ce fichier n’est ni un fichier .cadenas ni un fichier .age.');
}
