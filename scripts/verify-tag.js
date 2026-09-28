/**
 * Vérifie qu'un tag de version est signé par l'une des clés de signature SSH
 * que le mainteneur a déclarées sur son compte GitHub (Settings → SSH and
 * GPG keys → Signing keys), lues via l'API publique de GitHub.
 *
 * Usage : node scripts/verify-tag.js v1.4.0
 *
 * Les workflows de publication (release, npm, Docker) l'exécutent avant de
 * publier quoi que ce soit : une version dont le tag n'est pas signé n'est
 * jamais publiée. CADENAS_ALLOWED_SIGNERS peut désigner un fichier
 * allowed_signers déjà prêt (vérification hors ligne).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAINTAINER = 'PierreEbele';

const tag = process.argv[2];
if (!tag) {
  console.error('Usage : node scripts/verify-tag.js <tag>');
  process.exit(2);
}

async function signingKeys() {
  const headers = { accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/users/${MAINTAINER}/ssh_signing_keys`, { headers });
  if (!response.ok) throw new Error(`API GitHub : ${response.status} ${response.statusText}`);
  return (await response.json()).map(({ key }) => key.trim());
}

let signersFile = process.env.CADENAS_ALLOWED_SIGNERS;
let tempDir;
if (!signersFile) {
  const keys = await signingKeys();
  if (keys.length === 0) {
    console.error(`✘ Aucune clé de signature SSH sur le compte GitHub ${MAINTAINER}.`);
    process.exit(1);
  }
  tempDir = mkdtempSync(join(tmpdir(), 'cadenas-signers-'));
  signersFile = join(tempDir, 'allowed_signers');
  // « * » : seule compte la clé, quelle que soit l'adresse du signataire.
  writeFileSync(signersFile, keys.map((key) => `* namespaces="git" ${key}\n`).join(''));
}

try {
  execFileSync('git', ['-c', `gpg.ssh.allowedSignersFile=${signersFile}`, 'verify-tag', '--', tag], {
    stdio: 'inherit',
  });
  console.log(`✔ ${tag} est signé par une clé de signature de ${MAINTAINER}.`);
} catch {
  console.error(`✘ ${tag} n'est pas signé par une clé de signature de ${MAINTAINER}.`);
  process.exitCode = 1;
} finally {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
}
