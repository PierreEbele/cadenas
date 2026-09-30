/**
 * Empreintes SHA-256 de tous les fichiers du site construit (dist/), au format
 * de sha256sum et triées par chemin : c'est le fichier site-files.sha256 joint
 * à chaque release.
 *
 * Usage : node scripts/site-hashes.js [dossier]   (par défaut : dist)
 *
 * Le build est reproductible : construit depuis le même commit, sur n'importe
 * quel système, le site donne exactement ces empreintes. La CI le vérifie sur
 * Linux, Windows et macOS ; SECURITY.md explique comment le vérifier soi-même.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] ?? 'dist';

const files = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `./${relative(root, join(entry.parentPath, entry.name)).split(sep).join('/')}`)
  // Ordre des octets, comme « LC_ALL=C sort ».
  .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

for (const file of files) {
  const hash = createHash('sha256').update(readFileSync(join(root, file))).digest('hex');
  process.stdout.write(`${hash}  ${file}\n`);
}
