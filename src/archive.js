/**
 * Regroupe plusieurs fichiers (ou un dossier) en une archive .zip produite en
 * flux, avant chiffrement. Partagé par le site et la CLI.
 *
 * Pourquoi zip : il s'ouvre sans logiciel supplémentaire sur Windows, macOS
 * et Linux une fois le fichier déchiffré. Aucune compression (« stored ») :
 * c'est plus rapide, et la plupart des fichiers volumineux (photos, vidéos,
 * PDF) sont déjà compressés. Zip64 est géré au-delà de 4 Go.
 */
import { makeZip, predictLength } from 'client-zip';

/**
 * Nettoie un chemin relatif pour l'archive : séparateurs « / », pas de
 * chemin absolu, pas de « . » ni de « .. » (une archive ne doit jamais
 * pouvoir écrire hors du dossier où on l'extrait). Pas de lecteur Windows
 * (« C: ») ni de « : », qu'un extracteur Windows prendrait pour un flux de
 * données alternatif (NTFS) : remplacé par « _ ».
 */
export function normalizeEntryPath(path) {
  const parts = String(path)
    .replaceAll('\\', '/')
    .replace(/^[A-Za-z]:(?=\/|$)/, '')
    .split('/')
    .filter((part) => part !== '' && part !== '.' && part !== '..')
    .map((part) => part.replaceAll(':', '_'));
  if (parts.length === 0) throw new TypeError(`Chemin invalide dans l'archive : ${path}`);
  return parts.join('/');
}

/**
 * Rend les chemins uniques en suffixant les doublons : « a.txt », « a (2).txt »…
 * @param {string[]} paths chemins déjà normalisés
 */
export function uniquePaths(paths) {
  const used = new Set();
  return paths.map((path) => {
    if (!used.has(path.toLowerCase())) {
      used.add(path.toLowerCase());
      return path;
    }
    const slash = path.lastIndexOf('/');
    const dot = path.lastIndexOf('.');
    const cut = dot > slash + 1 ? dot : path.length;
    for (let n = 2; ; n++) {
      const candidate = `${path.slice(0, cut)} (${n})${path.slice(cut)}`;
      if (!used.has(candidate.toLowerCase())) {
        used.add(candidate.toLowerCase());
        return candidate;
      }
    }
  });
}

/**
 * @typedef {object} ArchiveEntry
 * @property {string} path            chemin relatif dans l'archive
 * @property {number} size            taille en octets
 * @property {Date} [lastModified]
 * @property {() => ReadableStream<Uint8Array>} open  ouvert seulement au moment de l'écrire
 */

/** Prépare les entrées : chemins nettoyés et uniques. */
export function prepareEntries(entries) {
  const paths = uniquePaths(entries.map((entry) => normalizeEntryPath(entry.path)));
  return entries.map((entry, i) => ({ ...entry, path: paths[i] }));
}

/** Taille exacte de l'archive produite (pour la barre de progression). */
export function archiveSize(entries) {
  return Number(
    predictLength(entries.map((entry) => ({ name: entry.path, size: entry.size }))),
  );
}

/**
 * Produit l'archive en flux. Les fichiers ne sont ouverts qu'un par un, au
 * moment où ils sont écrits : des milliers de fichiers ne consomment pas
 * plus de mémoire qu'un seul.
 * @param {ArchiveEntry[]} entries déjà passées par prepareEntries()
 * @returns {ReadableStream<Uint8Array>}
 */
export function createArchive(entries) {
  async function* files() {
    for (const entry of entries) {
      yield {
        name: entry.path,
        size: entry.size,
        lastModified: entry.lastModified ?? new Date(),
        input: entry.open(),
      };
    }
  }
  return makeZip(files(), { buffersAreUTF8: true });
}
