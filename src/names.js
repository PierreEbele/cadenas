/**
 * Noms de fichiers de sortie, partagés par la CLI et le site.
 */
export const EXTENSIONS = Object.freeze({ cadenas: '.cadenas', age: '.age' });

/** photo.jpg → photo.jpg.cadenas */
export function encryptedName(name, format = 'cadenas') {
  return name + EXTENSIONS[format];
}

/**
 * Nom de l'archive qui regroupe plusieurs fichiers : le nom du dossier s'il
 * n'y en a qu'un (photos → photos.zip), sinon cadenas-AAAA-MM-JJ.zip.
 */
export function archiveName(folder, date = new Date()) {
  if (folder) return `${folder}.zip`;
  const pad = (n) => String(n).padStart(2, '0');
  return `cadenas-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`;
}

// Caractères de contrôle bidirectionnel (LRM, RLM, ALM, LRE…RLO, LRI…PDI) :
// invisibles, ils servent à déguiser une extension
// (« facture\u202Efdp.exe » s'affiche « facture exe.pdf »).
const BIDI_CONTROLS = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * photo.jpg.cadenas → photo.jpg ; photo.jpg.age → photo.jpg.
 * Sans extension reconnue : photo.bin → photo.bin.dechiffre.
 * Le nom vient de l'expéditeur : ses contrôles bidirectionnels sont retirés.
 */
export function decryptedName(name) {
  name = name.replace(BIDI_CONTROLS, '');
  const lower = name.toLowerCase();
  for (const ext of Object.values(EXTENSIONS)) {
    if (lower.endsWith(ext) && name.length > ext.length) return name.slice(0, -ext.length);
  }
  return `${name}.dechiffre`;
}
