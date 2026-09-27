/**
 * Noms de fichiers de sortie, partagés par la CLI et le site.
 */
export const EXTENSIONS = Object.freeze({ cadenas: '.cadenas', age: '.age' });

/** photo.jpg → photo.jpg.cadenas */
export function encryptedName(name, format = 'cadenas') {
  return name + EXTENSIONS[format];
}

/**
 * photo.jpg.cadenas → photo.jpg ; photo.jpg.age → photo.jpg.
 * Sans extension reconnue : photo.bin → photo.bin.dechiffre.
 */
export function decryptedName(name) {
  const lower = name.toLowerCase();
  for (const ext of Object.values(EXTENSIONS)) {
    if (lower.endsWith(ext) && name.length > ext.length) return name.slice(0, -ext.length);
  }
  return `${name}.dechiffre`;
}
