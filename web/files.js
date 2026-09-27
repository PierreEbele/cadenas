/**
 * Récupère la liste des fichiers choisis, avec leur chemin relatif, depuis
 * un glisser-déposer (dossiers compris) ou un sélecteur de fichiers.
 *
 * Résultat : { items: [{ file, path }], folder } où folder est le nom du
 * dossier lorsqu'un seul dossier a été choisi (il nomme alors l'archive).
 */

/**
 * À appeler de façon synchrone dans le gestionnaire « drop » : les entrées
 * du DataTransfer ne sont plus accessibles une fois l'événement terminé.
 */
export function entriesFromDrop(dataTransfer) {
  const entries = [...(dataTransfer.items ?? [])]
    .filter((item) => item.kind === 'file')
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean);
  return { entries, files: [...dataTransfer.files] };
}

/** Parcourt les entrées déposées (récursivement pour les dossiers). */
export async function collectDrop({ entries, files }) {
  // Navigateur sans API d'entrées : fichiers seuls, sans dossiers.
  if (entries.length === 0) return { items: files.map((file) => ({ file, path: file.name })), folder: null };
  const items = [];
  for (const entry of entries) await walk(entry, '', items);
  const folder = entries.length === 1 && entries[0].isDirectory ? entries[0].name : null;
  return { items, folder };
}

async function walk(entry, prefix, out) {
  const path = prefix + entry.name;
  if (entry.isFile) {
    out.push({ file: await new Promise((resolve, reject) => entry.file(resolve, reject)), path });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    // readEntries rend les entrées par lots : on lit jusqu'à un lot vide.
    for (;;) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      for (const child of batch) await walk(child, `${path}/`, out);
    }
  }
}

/** Fichiers d'un <input type="file"> (multiple ou webkitdirectory). */
export function collectInput(fileList) {
  const items = [...fileList].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
  const roots = new Set(items.map((item) => item.path.split('/')[0]));
  const fromFolder = items.some((item) => item.file.webkitRelativePath);
  return { items, folder: fromFolder && roots.size === 1 ? [...roots][0] : null };
}
