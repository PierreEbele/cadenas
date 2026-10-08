// Copie les documents de référence du dépôt (docs/, SECURITY, ROADMAP…) dans
// le site de documentation. Ces fichiers restent la seule source : le site les
// reprend à chaque build, sans copie à maintenir à la main.
//
// Chaque document existe en anglais (X.md) et en français (X.fr.md). Le
// français est servi à la racine du site, l'anglais sous /en/. Les liens entre
// documents copiés deviennent des liens internes au site ; les autres liens
// relatifs (code source, workflows…) pointent vers le fichier sur GitHub.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(site, '..');
const GITHUB = 'https://github.com/PierreEbele/cadenas/blob/main/';

// Page du site → fichier anglais du dépôt (le français est le même nom en .fr.md).
const PAGES = {
  'reference/format': 'docs/FORMAT.md',
  'reference/architecture': 'docs/ARCHITECTURE.md',
  'reference/assurance': 'docs/ASSURANCE.md',
  'reference/audit': 'docs/AUDIT.md',
  'reference/code-signing': 'docs/CODE_SIGNING.md',
  'reference/security': 'SECURITY.md',
  'project/roadmap': 'ROADMAP.md',
  'project/contributing': 'CONTRIBUTING.md',
  'project/governance': 'GOVERNANCE.md',
  'project/code-of-conduct': 'CODE_OF_CONDUCT.md',
  'project/changelog': 'CHANGELOG.md',
};

const frOf = (path) => path.replace(/\.md$/, '.fr.md');

// Fichier du dépôt → [page, langue].
const targets = new Map();
for (const [page, en] of Object.entries(PAGES)) {
  targets.set(en, [page, 'en']);
  targets.set(frOf(en), [page, 'fr']);
}

const pageUrl = (page, lang) => (lang === 'fr' ? `/${page}` : `/en/${page}`);

function rewriteLink(url, sourcePath) {
  if (/^([a-z]+:|#|\/)/i.test(url)) return url;
  const [path, anchor] = url.split('#');
  const resolved = posix.normalize(posix.join(posix.dirname(sourcePath), path));
  const hash = anchor === undefined ? '' : `#${anchor}`;
  const target = targets.get(resolved);
  if (target) return pageUrl(...target) + hash;
  if (resolved.startsWith('docs/images/')) return `/images/${posix.basename(resolved)}`;
  return GITHUB + resolved + hash;
}

function convert(markdown, sourcePath) {
  return (
    markdown
      // Sélecteur de langue en tête de fichier : le site a le sien.
      .replace(/^(\*\*English\*\* · \[Français\]\([^)]*\)|\[English\]\([^)]*\) · \*\*Français\*\*)\n\n/m, '')
      .replace(/\]\(([^)\s]+)\)/g, (_, url) => `](${rewriteLink(url, sourcePath)})`)
      // {{ … }} hors bloc de code serait interprété par Vue.
      .replace(/`([^`\n]*\{\{[^`\n]*)`/g, (_, code) => `<code v-pre>${code.replace(/</g, '&lt;')}</code>`)
  );
}

function sourceNote(sourcePath, lang) {
  const text = lang === 'fr' ? 'Source de cette page :' : 'Source of this page:';
  return `\n\n---\n\n<small>${text} [${sourcePath}](${GITHUB}${sourcePath})</small>\n`;
}

for (const dir of ['reference', 'project', 'en/reference', 'en/project', 'public/images']) {
  rmSync(join(site, dir), { recursive: true, force: true });
}

for (const [sourcePath, [page, lang]] of targets) {
  const markdown = readFileSync(join(repo, sourcePath), 'utf8');
  const out = join(site, lang === 'fr' ? '' : 'en', `${page}.md`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, convert(markdown, sourcePath).trimEnd() + sourceNote(sourcePath, lang));
}

mkdirSync(join(site, 'public/images'), { recursive: true });
for (const name of readdirSync(join(repo, 'docs/images'))) {
  copyFileSync(join(repo, 'docs/images', name), join(site, 'public/images', name));
}

console.log(`${targets.size} documents copiés depuis ${relative(process.cwd(), repo) || '.'}`);
