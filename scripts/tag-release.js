/**
 * Pose le tag signé d'une version, après avoir vérifié qu'il sera posé au bon
 * endroit : sur main, à jour avec GitHub, sans modification en cours, et sur
 * le commit dont package.json porte la version à publier.
 *
 * Usage : node scripts/tag-release.js "résumé de la version" [--push]
 *
 * Le tag s'appelle vX.Y.Z (version de package.json) et son message, qui
 * devient le titre de la release GitHub, est « vX.Y.Z - résumé ». Il est
 * ensuite vérifié par scripts/verify-tag.js, comme le feront les workflows de
 * publication. Avec --push, il est envoyé sur GitHub, ce qui lance la
 * publication ; sinon la commande à lancer est affichée.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const push = args.includes('--push');
const summary = args.filter((arg) => arg !== '--push').join(' ').trim();
if (!summary) {
  console.error('Usage : node scripts/tag-release.js "résumé de la version" [--push]');
  process.exit(2);
}

const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();

function fail(message) {
  console.error(`✘ ${message}`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tag = `v${version}`;

if (git('status', '--porcelain')) fail('Des modifications ne sont pas commitées.');
if (git('branch', '--show-current') !== 'main') fail('Le tag se pose depuis la branche main.');

git('fetch', '--quiet', 'origin', 'main');
if (git('rev-parse', 'HEAD') !== git('rev-parse', 'origin/main')) {
  fail('main n\'est pas à jour avec origin/main : lancez « git pull --ff-only ».');
}

if (git('tag', '--list', tag)) fail(`Le tag ${tag} existe déjà sur ce poste.`);
if (git('ls-remote', '--tags', 'origin', `refs/tags/${tag}`)) fail(`Le tag ${tag} existe déjà sur GitHub.`);

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
if (!changelog.includes(`## [${version}]`)) fail(`La version ${version} est absente du CHANGELOG.`);

console.log(`Tag ${tag} sur ${git('log', '-1', '--format=%h %s')}`);
execFileSync('git', ['tag', '-s', tag, '-m', `${tag} - ${summary}`], { stdio: 'inherit' });

try {
  execFileSync(process.execPath, [fileURLToPath(new URL('verify-tag.js', import.meta.url)), tag], { stdio: 'inherit' });
} catch {
  git('tag', '-d', tag);
  fail(`La vérification de ${tag} a échoué : le tag a été supprimé de ce poste.`);
}

if (push) {
  execFileSync('git', ['push', 'origin', `refs/tags/${tag}`], { stdio: 'inherit' });
  console.log(`✔ ${tag} envoyé : la publication démarre sur GitHub Actions.`);
} else {
  console.log(`Pour lancer la publication : git push origin ${tag}`);
}
