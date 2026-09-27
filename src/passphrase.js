/**
 * Générateur de phrases de passe (méthode « diceware ») : des mots tirés
 * uniformément au hasard dans une liste, avec le générateur aléatoire
 * cryptographique du système.
 *
 * Listes :
 * - fr : 8191 mots, Tango pour Tails OS (CC0) → 13 bits par mot
 * - en : 7776 mots, EFF Large Wordlist (CC BY 3.0 US) → 12,9 bits par mot
 *
 * Avec 5 mots par défaut, on dépasse 64 bits d'entropie : combiné au coût
 * d'Argon2id, c'est hors de portée d'une attaque par force brute.
 */
const LOADERS = {
  fr: () => import('./wordlists/fr.js'),
  en: () => import('./wordlists/en.js'),
};

export const LANGUAGES = Object.keys(LOADERS);
export const DEFAULT_WORDS = 5;
export const MIN_WORDS = 3;
export const MAX_WORDS = 20;

const cache = new Map();

/** Charge (une seule fois) la liste de mots d'une langue. */
export async function loadWordlist(lang = 'fr') {
  const loader = LOADERS[lang];
  if (!loader) throw new TypeError(`Langue inconnue : ${lang}`);
  if (!cache.has(lang)) cache.set(lang, (await loader()).default.split(' '));
  return cache.get(lang);
}

/**
 * Entier uniforme dans [0, max) par tirage avec rejet : pas de biais,
 * même si max n'est pas une puissance de 2.
 */
export function randomIndex(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

/** Entropie en bits d'une phrase de `count` mots tirés dans `listSize` mots. */
export function entropyBits(listSize, count) {
  return count * Math.log2(listSize);
}

/**
 * Génère une phrase de passe.
 * @param {object} [options]
 * @param {'fr' | 'en'} [options.lang='fr']
 * @param {number} [options.words=5]
 * @returns {Promise<{ passphrase: string, bits: number }>}
 */
export async function generatePassphrase({ lang = 'fr', words = DEFAULT_WORDS } = {}) {
  if (!Number.isInteger(words) || words < MIN_WORDS || words > MAX_WORDS) {
    throw new RangeError(`Le nombre de mots doit être compris entre ${MIN_WORDS} et ${MAX_WORDS}.`);
  }
  const list = await loadWordlist(lang);
  const chosen = Array.from({ length: words }, () => list[randomIndex(list.length)]);
  return { passphrase: chosen.join(' '), bits: entropyBits(list.length, words) };
}
