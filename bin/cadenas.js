#!/usr/bin/env node
/**
 * cadenas — chiffrer un fichier avec un mot de passe, en ligne de commande.
 */
import { randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, readFileSync } from 'node:fs';
import { open, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { argv, exit, stderr, stdout } from 'node:process';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import {
  CadenasError,
  DETECT_SIZE,
  decrypt,
  decryptedName,
  detectFormat,
  encrypt,
  encryptedName,
} from '../src/core.js';
import { DEFAULT_WORDS, LANGUAGES, MAX_WORDS, MIN_WORDS, generatePassphrase } from '../src/passphrase.js';
import { PromptCancelled, promptPassword, readPasswordFromStdin } from '../src/prompt.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const HELP = `cadenas ${version} — chiffrer un fichier avec un mot de passe

Utilisation :
  cadenas lock <fichier>     chiffre le fichier (→ <fichier>.cadenas)
  cadenas unlock <fichier>   déchiffre un fichier .cadenas ou .age
  cadenas passphrase         génère une phrase de passe aléatoire

Options :
  -o, --output <chemin>   fichier de sortie
  -f, --force             écrase le fichier de sortie s'il existe
      --age               chiffre au format age (→ <fichier>.age), lisible par age / rage
      --password-stdin    lit le mot de passe sur l'entrée standard (scripts)
  -h, --help              affiche cette aide
  -v, --version           affiche la version

Options de passphrase :
  -w, --words <n>         nombre de mots (${DEFAULT_WORDS} par défaut, ${MIN_WORDS} à ${MAX_WORDS})
      --lang <fr|en>      langue des mots (fr par défaut)

Exemples :
  cadenas lock rapport.pdf
  cadenas unlock rapport.pdf.cadenas
  cadenas passphrase --words 6
  echo "$MOT_DE_PASSE" | cadenas lock --password-stdin sauvegarde.tar

Documentation : https://github.com/PierreEbele/cadenas`;

const COMMANDS = { lock: 'lock', encrypt: 'lock', unlock: 'unlock', decrypt: 'unlock' };

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

  const [commandName, file, ...extra] = positionals;
  if (commandName === 'passphrase') return passphrase(options, positionals.slice(1));
  const command = COMMANDS[commandName];
  if (!command) throw new UsageError(`Commande inconnue : ${commandName}. Utilisez lock, unlock ou passphrase.`);
  if (!file) throw new UsageError(`Indiquez le fichier à traiter : cadenas ${commandName} <fichier>`);
  if (extra.length > 0) throw new UsageError('Un seul fichier à la fois.');
  if (command === 'unlock' && options.age) {
    throw new UsageError('--age ne s’utilise qu’avec lock : le format est détecté automatiquement au déchiffrement.');
  }

  const input = resolve(file);
  const info = await stat(input).catch((err) => {
    if (err.code === 'ENOENT') throw new CadenasError('NOT_FOUND', `Fichier introuvable : ${file}`);
    throw err;
  });
  if (!info.isFile()) throw new CadenasError('NOT_A_FILE', `${file} n’est pas un fichier.`);

  if (command === 'lock') await lock(input, info.size, options);
  else await unlock(input, info.size, options);
}

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

async function lock(input, size, options) {
  const format = options.age ? 'age' : 'cadenas';
  const output = resolve(options.output ?? join(dirname(input), encryptedName(basename(input), format)));
  await ensureWritable(output, options.force);

  let password;
  if (options['password-stdin']) {
    password = await readPasswordFromStdin();
  } else {
    password = await promptPassword('Mot de passe : ');
    const again = await promptPassword('Confirmez le mot de passe : ');
    if (password !== again) throw new CadenasError('MISMATCH', 'Les deux mots de passe ne correspondent pas.');
  }

  const progress = new Progress('Chiffrement', size);
  progress.phase('Préparation de la clé…');
  const encrypted = await encrypt(Readable.toWeb(createReadStream(input).pipe(progress.counter())), password, { format });
  await writeAtomically(Readable.fromWeb(encrypted), output);
  progress.done();
  stdout.write(`✔ Fichier chiffré : ${displayPath(output)}\n`);
}

async function unlock(input, size, options) {
  const head = await readHead(input);
  const format = detectFormat(head);
  if (!format) {
    throw new CadenasError('UNKNOWN_FORMAT', 'Ce fichier n’est ni un fichier .cadenas ni un fichier .age.');
  }
  const output = resolve(options.output ?? join(dirname(input), decryptedName(basename(input))));
  await ensureWritable(output, options.force);

  const password = options['password-stdin']
    ? await readPasswordFromStdin()
    : await promptPassword('Mot de passe : ');

  const progress = new Progress('Déchiffrement', size);
  progress.phase('Préparation de la clé…');
  const { stream } = await decrypt(Readable.toWeb(createReadStream(input).pipe(progress.counter())), password);
  await writeAtomically(Readable.fromWeb(stream), output);
  progress.done();
  stdout.write(`✔ Fichier déchiffré : ${displayPath(output)}\n`);
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

async function ensureWritable(output, force) {
  if (force) return;
  const exists = await stat(output).then(() => true, () => false);
  if (exists) {
    throw new CadenasError('EXISTS', `${displayPath(output)} existe déjà. Utilisez -f pour l’écraser ou -o pour choisir un autre nom.`);
  }
}

/**
 * Écrit dans un fichier temporaire puis le renomme : en cas d'erreur (mauvais
 * mot de passe, fichier altéré…) aucun fichier partiel n'est laissé.
 */
async function writeAtomically(readable, output) {
  const temp = join(dirname(output), `.${basename(output)}.${randomBytes(4).toString('hex')}.tmp`);
  try {
    await pipeline(readable, createWriteStream(temp, { flags: 'wx' }));
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

  counter() {
    return new Transform({
      transform: (chunk, _encoding, callback) => {
        this.#done += chunk.length;
        this.#render();
        callback(null, chunk);
      },
    });
  }

  #render() {
    const now = Date.now();
    if (!this.enabled || now - this.#last < 100) return;
    this.#last = now;
    const percent = this.total ? Math.floor((this.#done / this.total) * 100) : 100;
    stderr.write(`\r\x1b[K${this.label}… ${percent} %`);
  }

  done() {
    if (this.enabled) stderr.write('\r\x1b[K');
  }
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
