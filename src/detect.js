/**
 * Détection du format d'un fichier d'après ses premiers octets.
 * Module sans dépendance : utilisable par l'interface web sans charger le code
 * cryptographique.
 */
const encoder = new TextEncoder();

export const CADENAS_MAGIC = encoder.encode('CADENAS');
export const AGE_MAGIC = encoder.encode('age-encryption.org/v1');
export const AGE_ARMOR_MAGIC = encoder.encode('-----BEGIN AGE ENCRYPTED FILE-----');

/** Nombre d'octets à lire pour détecter le format (et, pour age, la recette scrypt). */
export const DETECT_SIZE = 256;

const startsWith = (bytes, prefix) =>
  bytes.length >= prefix.length && prefix.every((byte, i) => bytes[i] === byte);

export const isCadenas = (bytes) => startsWith(bytes, CADENAS_MAGIC);
export const isAge = (bytes) => startsWith(bytes, AGE_MAGIC);
export const isAgeArmored = (bytes) => startsWith(bytes, AGE_ARMOR_MAGIC);

/**
 * @param {Uint8Array} head premiers octets du fichier
 * @returns {'cadenas' | 'age' | null}
 */
export function detectFormat(head) {
  if (isCadenas(head)) return 'cadenas';
  if (isAge(head) || isAgeArmored(head)) return 'age';
  return null;
}
