#!/usr/bin/env node
/**
 * cadenas — chiffrer un fichier avec un mot de passe, en ligne de commande.
 */
import { randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, readFileSync } from 'node:fs';
import { lstat, open, readdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { argv, exit, stderr, stdin, stdout } from 'node:process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import {
  CadenasError,
  DETECT_SIZE,
  archiveName,
  archiveSize,
  createArchive,
  decrypt,
  decryptedName,
  detectFormat,
  encrypt,
  encryptedName,
  prepareEntries,
} from '../src/core.js';
import { DEFAULT_WORDS, LANGUAGES, MAX_WORDS, MIN_WORDS, generatePassphrase } from '../src/passphrase.js';
import { PromptCancelled, promptPassword, readPasswordFromFile, readPasswordFromStdin } from '../src/prompt.js';

const version =
  typeof __CADENAS_VERSION__ === 'string'
    ? __CADENAS_VERSION__ // injecté à la compilation des exécutables autonomes
    : JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const HELP = `cadenas ${version} — chiffrer un fichier avec un mot de passe

Utilisation :
  cadenas lock <fichier|dossier>...   chiffre (plusieurs fichiers ou un dossier → archive .zip chiffrée)
  cadenas unlock <fichier>            déchiffre un fichier .cadenas ou .age
  cadenas verify <fichier>            vérifie le fichier et le mot de passe, sans rien écrire
  cadenas passphrase                 génère une phrase de passe aléatoire

  « - » désigne l'entrée standard (fichier) ou la sortie standard (-o -).

Options :
  -o, --output <chemin>     fichier de sortie (« - » : sortie standard)
  -f, --force               écrase le fichier de sortie s'il existe
      --age                 chiffre au format age, lisible par age / rage
      --password-file <f>   lit le mot de passe dans un fichier (première ligne)
      --password-stdin      lit le mot de passe sur l'entrée standard
  -h, --help                affiche cette aide
  -v, --version             affiche la version

Options de passphrase :
  -w, --words <n>           nombre de mots (${DEFAULT_WORDS} par défaut, ${MIN_WORDS} à ${MAX_WORDS})
      --lang <fr|en>        langue des mots (fr par défaut)

Exemples :
  cadenas lock rapport.pdf                    → rapport.pdf.cadenas
  cadenas lock photos/                        → photos.zip.cadenas
  cadenas lock a.txt b.txt -o docs.zip.cadenas
  cadenas unlock rapport.pdf.cadenas
  cadenas verify sauvegarde.cadenas --password-file ~/.secret && echo intact
  tar c projet | cadenas lock - --password-file ~/.secret > projet.tar.cadenas
  cadenas unlock sauvegarde.cadenas -o - --password-file ~/.secret | tar x

Documentation : https://github.com/PierreEbele/cadenas`;

const COMMANDS = { lock: 'lock', encrypt: 'lock', unlock: 'unlock', decrypt: 'unlock', verify: 'verify' };
const STDIO = '-';

/** Erreur d'utilisation (code de sortie 2). */
class UsageError extends Error {}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv.slice(2),
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        force: { type: 'boolean', short: 'f', default: false },
        age: { type: 'boolean', default: false },
        'password-stdin': { type: 'boolean', default: false },
        'password-file': { type: 'string' },
        words: { type: 'string', short: 'w' },
        lang: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (err) {
    throw new UsageError(err.message);
  }
  const { values: options, positionals } = parsed;

  if (options.version) return stdout.write(`${version}\n`);
  if (options.help || positionals.length === 0) return stdout.write(`${HELP}\n`);

  const [commandName, ...inputs] = positionals;
  if (commandName === 'passphrase') return passphrase(options, inputs);
  const command = COMMANDS[commandName];
  if (!command) throw new UsageError(`Commande inconnue : ${commandName}. Utilisez lock, unlock, verify ou passphrase.`);
  if (inputs.length === 0) throw new UsageError(`Indiquez ce qu’il faut traiter : cadenas ${commandName} <fichier>`);

  if (inputs.includes(STDIO) && inputs.length > 1) {
    throw new UsageError('« - » (entrée standard) ne peut pas être combiné à d’autres fichiers.');
  }
  if (options['password-stdin'] && options['password-file']) {
    throw new UsageError('Choisissez --password-stdin ou --password-file, pas les deux.');
  }
  if (options['password-stdin'] && inputs.includes(STDIO)) {
    throw new UsageError('L’entrée standard sert déjà aux données : utilisez --password-file.');
  }
  if (command === 'unlock' || command === 'verify') {
    if (options.age) throw new UsageError('--age ne s’utilise qu’avec lock : le format est détecté automatiquement.');
    if (inputs.length > 1) throw new UsageError(`${commandName} traite un seul fichier à la fois.`);
  }
  if (command === 'verify' && (options.output !== undefined || options.force)) {
    throw new UsageError('verify n’écrit aucun fichier : -o et -f ne s’utilisent pas avec.');
  }

  if (command === 'lock') await lock(inputs, options);
  else if (command === 'unlock') await unlock(inputs[0], options);
  else await verify(inputs[0], options);
}

// ---------------------------------------------------------------------------
// Commandes

async function passphrase(options, extra) {
  if (extra.length > 0) throw new UsageError('passphrase ne prend pas de fichier.');
  const words = options.words === undefined ? DEFAULT_WORDS : Number(options.words);
  if (!Number.isInteger(words) || words < MIN_WORDS || words > MAX_WORDS) {
    throw new UsageError(`--words attend un nombre entier entre ${MIN_WORDS} et ${MAX_WORDS}.`);
  }
  const lang = options.lang ?? 'fr';
  if (!LANGUAGES.includes(lang)) throw new UsageError(`--lang attend ${LANGUAGES.join(' ou ')}.`);

  const { passphrase: phrase, bits } = await generatePassphrase({ lang, words });
  stdout.write(`${phrase}\n`);
  // Informations sur stderr : stdout reste exploitable par un script.
  if (stderr.isTTY) stderr.write(`(${Math.round(bits)} bits d’entropie — notez-la, elle ne pourra pas être retrouvée)\n`);
}

async function lock(inputs, options) {
  const format = options.age ? 'age' : 'cadenas';
  const source = await openSource(inputs);
  const output = resolveOutput(options.output, () => join(source.dir, encryptedName(source.name, format)), source.fromStdin);
  await ensureWritable(output, options.force);

  const password = await readPassword(options, { confirm: true, stdinIsData: source.fromStdin });
  const progress = new Progress('Chiffrement', source.size);
  progress.phase('Préparation de la clé…');
  const encrypted = await encrypt(progress.count(source.stream()), password, { format });
  await writeOutput(encrypted, output);
  progress.done();
  if (output !== STDIO) {
    const what = source.count > 1 ? `${source.count} fichiers chiffrés` : 'Fichier chiffré';
    stderr.write(`✔ ${what} : ${displayPath(output)}\n`);
  }
}

async function unlock(input, options) {
  const source = await openEncrypted(input);
  const { path, fromStdin } = source;
  const output = resolveOutput(options.output, () => join(dirname(path), decryptedName(basename(path))), fromStdin);
  await ensureWritable(output, options.force);

  const password = await readPassword(options, { confirm: false, stdinIsData: fromStdin });
  const progress = new Progress('Déchiffrement', source.size);
  progress.phase('Préparation de la clé…');
  const { stream } = await decrypt(progress.count(source.stream()), password);
  await writeOutput(stream, output);
  progress.done();
  if (output !== STDIO) stderr.write(`✔ Fichier déchiffré : ${displayPath(output)}\n`);
}

/**
 * Déchiffre tout le fichier sans rien écrire : chaque bloc est authentifié,
 * donc arriver au bout prouve que le mot de passe est bon et que le fichier
 * est intact. Code de sortie 0 dans ce cas, 1 sinon.
 */
async function verify(input, options) {
  const source = await openEncrypted(input);
  const password = await readPassword(options, { confirm: false, stdinIsData: source.fromStdin });
  const progress = new Progress('Vérification', source.size);
  progress.phase('Préparation de la clé…');
  const { format, stream } = await decrypt(progress.count(source.stream()), password);
  let size = 0;
  for await (const chunk of stream) size += chunk.length;
  progress.done();
  stderr.write(`✔ Fichier intact et mot de passe correct (format ${format}, ${formatSize(size)} une fois déchiffré).\n`);
}

// ---------------------------------------------------------------------------
// Entrées

/**
 * Décrit ce qui sera chiffré : l'entrée standard, un fichier, ou une archive
 * .zip de plusieurs fichiers / dossiers.
 */
async function openSource(inputs) {
  if (inputs[0] === STDIO) {
    return { fromStdin: true, count: 1, size: undefined, stream: () => Readable.toWeb(stdin) };
  }

  const infos = await Promise.all(inputs.map(statInput));
  if (inputs.length === 1 && infos[0].isFile()) {
    const path = resolve(inputs[0]);
    return {
      dir: dirname(path),
      name: basename(path),
      count: 1,
      size: infos[0].size,
      stream: () => Readable.toWeb(createReadStream(path)),
    };
  }

  // Plusieurs entrées ou un dossier : archive .zip.
  const files = [];
  for (const [i, input] of inputs.entries()) {
    const path = resolve(input);
    if (infos[i].isDirectory()) await collectDirectory(path, basename(path), files);
    else if (infos[i].isFile()) files.push({ absolute: path, path: basename(path), info: infos[i] });
    else throw new CadenasError('NOT_A_FILE', `${input} n’est ni un fichier ni un dossier.`);
  }
  if (files.length === 0) throw new CadenasError('EMPTY', 'Aucun fichier à chiffrer : les dossiers sont vides.');

  const entries = prepareEntries(
    files.map(({ absolute, path, info }) => ({
      path,
      size: info.size,
      lastModified: info.mtime,
      open: () => Readable.toWeb(createReadStream(absolute)),
    })),
  );
  const singleFolder = inputs.length === 1 ? basename(resolve(inputs[0])) : null;
  const first = resolve(inputs[0]);
  return {
    dir: singleFolder ? dirname(first) : resolve('.'),
    name: archiveName(singleFolder),
    count: entries.length,
    size: archiveSize(entries),
    stream: () => createArchive(entries),
  };
}

/** Parcourt un dossier récursivement ; les liens symboliques sont ignorés. */
async function collectDirectory(absolute, path, out) {
  const children = await readdir(absolute, { withFileTypes: true });
  children.sort((a, b) => a.name.localeCompare(b.name));
  for (const child of children) {
    const childAbsolute = join(absolute, child.name);
    const childPath = `${path}/${child.name}`;
    if (child.isDirectory()) await collectDirectory(childAbsolute, childPath, out);
    else if (child.isFile()) out.push({ absolute: childAbsolute, path: childPath, info: await stat(childAbsolute) });
    else stderr.write(`Ignoré (lien ou fichier spécial) : ${displayPath(childAbsolute)}\n`);
  }
}

/**
 * Ouvre un fichier chiffré (ou l'entrée standard). Le format est détecté
 * avant de demander le mot de passe : erreur immédiate si ce n'est pas un
 * fichier chiffré.
 */
async function openEncrypted(input) {
  if (input === STDIO) return { fromStdin: true, size: undefined, stream: () => Readable.toWeb(stdin) };
  const path = resolve(input);
  const info = await statInput(input);
  if (!info.isFile()) throw new CadenasError('NOT_A_FILE', `${input} n’est pas un fichier.`);
  if (!detectFormat(await readHead(path))) {
    throw new CadenasError('UNKNOWN_FORMAT', 'Ce fichier n’est ni un fichier .cadenas ni un fichier .age.');
  }
  return { fromStdin: false, path, size: info.size, stream: () => Readable.toWeb(createReadStream(path)) };
}

async function statInput(input) {
  try {
    return await lstat(input).then((info) => (info.isSymbolicLink() ? stat(input) : info));
  } catch (err) {
    if (err.code === 'ENOENT') throw new CadenasError('NOT_FOUND', `Introuvable : ${input}`);
    throw err;
  }
}

async function readHead(path) {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(DETECT_SIZE);
    const { bytesRead } = await handle.read(buffer, 0, DETECT_SIZE, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

// ---------------------------------------------------------------------------
// Mot de passe

async function readPassword(options, { confirm, stdinIsData }) {
  if (options['password-file']) return readPasswordFromFile(options['password-file']);
  if (options['password-stdin']) return readPasswordFromStdin();
  const password = await promptPassword('Mot de passe : ', { stdinIsData });
  if (confirm) {
    const again = await promptPassword('Confirmez le mot de passe : ', { stdinIsData });
    if (password !== again) throw new CadenasError('MISMATCH', 'Les deux mots de passe ne correspondent pas.');
  }
  return password;
}

// ---------------------------------------------------------------------------
// Sorties

/** « - » ou absence de -o avec l'entrée standard → sortie standard. */
function resolveOutput(option, defaultPath, fromStdin) {
  if (option === STDIO || (option === undefined && fromStdin)) {
    if (stdout.isTTY) {
      throw new UsageError('Refus d’écrire des données binaires dans le terminal : redirigez la sortie ou utilisez -o <fichier>.');
    }
    return STDIO;
  }
  return resolve(option ?? defaultPath());
}

async function ensureWritable(output, force) {
  if (force || output === STDIO) return;
  const exists = await stat(output).then(() => true, () => false);
  if (exists) {
    throw new CadenasError('EXISTS', `${displayPath(output)} existe déjà. Utilisez -f pour l’écraser ou -o pour choisir un autre nom.`);
  }
}

/**
 * Vers un fichier : écriture dans un fichier temporaire renommé à la fin, pour
 * qu'une erreur (mauvais mot de passe, fichier altéré…) ne laisse jamais de
 * fichier partiel. Vers la sortie standard : en flux ; en cas d'erreur, le
 * code de sortie non nul signale que les données sont incomplètes.
 */
async function writeOutput(webStream, output) {
  if (output === STDIO) return pipeline(Readable.fromWeb(webStream), stdout);
  const temp = join(dirname(output), `.${basename(output)}.${randomBytes(4).toString('hex')}.tmp`);
  try {
    await pipeline(Readable.fromWeb(webStream), createWriteStream(temp, { flags: 'wx' }));
    await rename(temp, output);
  } catch (err) {
    await rm(temp, { force: true });
    throw err;
  }
}

/** Progression sur stderr, uniquement dans un terminal. */
class Progress {
  #done = 0;
  #last = 0;
  constructor(label, total) {
    this.label = label;
    this.total = total;
    this.enabled = Boolean(stderr.isTTY);
  }

  phase(text) {
    if (this.enabled) stderr.write(`\r\x1b[K${text}`);
  }

  /** Relaie un flux web en comptant les octets lus. */
  count(webStream) {
    return webStream.pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          this.#done += chunk.length;
          this.#render();
          controller.enqueue(chunk);
        },
      }),
    );
  }

  #render() {
    const now = Date.now();
    if (!this.enabled || now - this.#last < 100) return;
    this.#last = now;
    const status = this.total
      ? `${Math.floor((this.#done / this.total) * 100)} %`
      : `${(this.#done / 1e6).toFixed(1)} Mo`;
    stderr.write(`\r\x1b[K${this.label}… ${status}`);
  }

  done() {
    if (this.enabled) stderr.write('\r\x1b[K');
  }
}

function formatSize(bytes) {
  if (bytes < 1000) return `${bytes} octet${bytes > 1 ? 's' : ''}`;
  const units = ['ko', 'Mo', 'Go', 'To'];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1000;
    unit++;
  } while (value >= 1000 && unit < units.length - 1);
  return `${value.toFixed(1).replace('.', ',')} ${units[unit]}`;
}

function displayPath(path) {
  const rel = relative('.', path);
  return rel && !rel.startsWith('..') ? rel : path;
}

main().catch((err) => {
  if (stderr.isTTY) stderr.write('\r\x1b[K');
  if (err instanceof PromptCancelled) {
    stderr.write('Annulé.\n');
    exit(130);
  }
  if (err instanceof UsageError) {
    stderr.write(`Erreur : ${err.message}\nAide : cadenas --help\n`);
    exit(2);
  }
  if (err instanceof CadenasError) {
    stderr.write(`Erreur : ${err.message}\n`);
    exit(1);
  }
  stderr.write(`Erreur inattendue : ${err?.message ?? err}\n`);
  exit(1);
});
