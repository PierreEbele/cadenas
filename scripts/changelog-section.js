// Affiche la section du CHANGELOG correspondant à une version, pour les
// notes de release. Usage : node scripts/changelog-section.js 1.2.0
import { readFileSync } from 'node:fs';

const version = process.argv[2]?.replace(/^v/, '');
if (!version) {
  console.error('Usage : node scripts/changelog-section.js <version>');
  process.exit(2);
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const start = changelog.indexOf(`## [${version}]`);
if (start < 0) {
  console.error(`La version ${version} est absente du CHANGELOG.`);
  process.exit(1);
}
const bodyStart = changelog.indexOf('\n', start) + 1;
const rest = changelog.slice(bodyStart);
const end = rest.search(/^## \[|^\[[^\]]+\]: /m);
const body = (end < 0 ? rest : rest.slice(0, end)).trim();

process.stdout.write(
  `${body}\n\n**Historique complet** : [CHANGELOG.md](https://github.com/PierreEbele/cadenas/blob/v${version}/CHANGELOG.md)\n`,
);
