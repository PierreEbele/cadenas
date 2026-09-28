// Construit l'exécutable autonome de la CLI pour la plateforme courante
// (Node.js « Single Executable Application ») : aucun Node.js requis chez
// l'utilisateur. Usage : node scripts/build-sea.js [fichier de sortie]
//
// 1. esbuild regroupe bin/cadenas.js et ses dépendances en un seul CommonJS ;
// 2. Node en fait un « blob » SEA ;
// 3. postject l'injecte dans une copie du binaire node en cours d'exécution.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { build } from 'esbuild';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const out = join(root, 'build');
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const target = process.argv[2] ?? join(out, isWindows ? 'cadenas.exe' : 'cadenas');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', cwd: root });

// 1. Un seul fichier CommonJS (seul format pris en charge par SEA).
await build({
  entryPoints: [join(root, 'bin/cadenas.js')],
  outfile: join(out, 'cadenas.cjs'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  define: { __CADENAS_VERSION__: JSON.stringify(version) },
  // Ligne #! inutile dans un exécutable, et import.meta n'est lu qu'en dehors du binaire.
  banner: { js: `/* cadenas ${version} — https://github.com/PierreEbele/cadenas (MIT) */` },
  logOverride: { 'empty-import-meta': 'silent' },
  legalComments: 'eof',
});

// 2. Blob SEA.
writeFileSync(
  join(out, 'sea-config.json'),
  JSON.stringify({
    main: join(out, 'cadenas.cjs'),
    output: join(out, 'sea-prep.blob'),
    disableExperimentalSEAWarning: true,
    useCodeCache: true,
  }),
);
run(process.execPath, ['--experimental-sea-config', join(out, 'sea-config.json')]);

// 3. Copie de node + injection du blob.
copyFileSync(process.execPath, target);
if (isMac) run('codesign', ['--remove-signature', target]);
const postject = createRequire(import.meta.url).resolve('postject/dist/cli.js');
run(process.execPath, [
  postject,
  target,
  'NODE_SEA_BLOB',
  join(out, 'sea-prep.blob'),
  '--sentinel-fuse',
  'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ...(isMac ? ['--macho-segment-name', 'NODE_SEA'] : []),
]);
// macOS exige une signature, même ad hoc, pour lancer un binaire.
if (isMac) run('codesign', ['--sign', '-', target]);

console.log(`Exécutable prêt : ${target}`);
