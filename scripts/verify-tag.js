/**
 * Vérifie qu'un tag de version est signé par l'une des clés de signature SSH
 * que le mainteneur a déclarées sur son compte GitHub (Settings → SSH and
 * GPG keys → Signing keys), lues via l'API publique de GitHub.
 *
 * Usage : node scripts/verify-tag.js v1.4.0
 *
 * Vérifie aussi que le tag pointe sur un commit dont package.json porte la
 * même version : un tag posé sur le mauvais commit est refusé.
 *
 * Les workflows de publication (release, npm, Docker) l'exécutent avant de
 * publier quoi que ce soit : une version dont le tag n'est pas signé, ou pas
 * posé sur le commit de cette version, n'est jamais publiée.
 * CADENAS_ALLOWED_SIGNERS peut désigner un fichier allowed_signers déjà prêt
 * (vérification hors ligne).
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
if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  console.error(`✘ ${tag} n'est pas un tag de version (vX.Y.Z).`);
  process.exit(1);
}

// Clé publique SSH : type connu, puis données en base64. Tout le reste
// (commentaire, retour à la ligne, options) est refusé ou ignoré, pour qu'une
// réponse inattendue ne puisse pas ajouter de ligne au fichier allowed_signers.
const SSH_PUBLIC_KEY =
  /^(ssh-ed25519|sk-ssh-ed25519@openssh\.com|ecdsa-sha2-nistp(?:256|384|521)|sk-ecdsa-sha2-nistp256@openssh\.com|ssh-rsa) ([A-Za-z0-9+/]+={0,2})(?: [^\r\n]*)?$/;

async function signingKeys() {
  const headers = { accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/users/${MAINTAINER}/ssh_signing_keys`, { headers });
  if (!response.ok) throw new Error(`API GitHub : ${response.status} ${response.statusText}`);
  const keys = [];
  for (const { key } of await response.json()) {
    const match = SSH_PUBLIC_KEY.exec(String(key).trim());
    if (match) keys.push(`${match[1]} ${match[2]}`);
    else console.error('Clé de signature ignorée : format inattendu.');
  }
  return keys;
}

// Version lue dans le package.json du commit tagué, pas dans la copie de
// travail : le résultat ne dépend pas de ce qui est extrait sur le disque.
function taggedVersion() {
  const json = execFileSync('git', ['show', `${tag}^{commit}:package.json`], { encoding: 'utf8' });
  return JSON.parse(json).version;
}

let version;
try {
  version = taggedVersion();
} catch {
  console.error(`✘ Impossible de lire package.json au commit du tag ${tag}.`);
  process.exit(1);
}
if (tag !== `v${version}`) {
  console.error(`✘ ${tag} est posé sur un commit dont package.json est en version ${version}.`);
  process.exit(1);
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
  console.log(`✔ ${tag} est signé par une clé de signature de ${MAINTAINER}, sur le commit de la version ${version}.`);
} catch {
  console.error(`✘ ${tag} n'est pas signé par une clé de signature de ${MAINTAINER}.`);
  process.exitCode = 1;
} finally {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
}
