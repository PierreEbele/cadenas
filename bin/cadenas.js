#!/usr/bin/env node
/**
 * cadenas — chiffrer un fichier avec un mot de passe, en ligne de commande.
 */
import { randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream, readFileSync, rmSync } from 'node:fs';
import { chmod, lstat, open, readdir, rename, rm, stat } from 'node:fs/promises';
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
import { detectLanguage, translator } from './messages.js';

const version =
  typeof __CADENAS_VERSION__ === 'string'
    ? __CADENAS_VERSION__ // injecté à la compilation des exécutables autonomes
    : JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const LANG = detectLanguage();
const t = translator(LANG);

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
        'hide-name': { type: 'boolean', default: false },
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
  if (options.help || positionals.length === 0) return stdout.write(`${t('help', { version, defaultWords: DEFAULT_WORDS, minWords: MIN_WORDS, maxWords: MAX_WORDS })}\n`);

  const [commandName, ...inputs] = positionals;
  if (commandName === 'passphrase') return passphrase(options, inputs);
  const command = COMMANDS[commandName];
  if (!command) throw new UsageError(t('usage.unknownCommand', { command: commandName }));
  if (inputs.length === 0) throw new UsageError(t('usage.noInput', { command: commandName }));

  if (inputs.includes(STDIO) && inputs.length > 1) {
    throw new UsageError(t('usage.stdinCombined'));
  }
  if (options['password-stdin'] && options['password-file']) {
    throw new UsageError(t('usage.passwordSources'));
  }
  if (options['password-stdin'] && inputs.includes(STDIO)) {
    throw new UsageError(t('usage.stdinBusy'));
  }
  if (options['hide-name'] && command !== 'lock') throw new UsageError(t('usage.hideNameLockOnly'));
  if (options['hide-name'] && inputs.includes(STDIO)) {
    throw new UsageError(t('usage.hideNameStdin'));
  }
  if (command === 'unlock' || command === 'verify') {
    if (options.age) throw new UsageError(t('usage.ageLockOnly'));
    if (inputs.length > 1) throw new UsageError(t('usage.oneFile', { command: commandName }));
  }
  if (command === 'verify' && (options.output !== undefined || options.force)) {
    throw new UsageError(t('usage.verifyWrites'));
  }

  if (command === 'lock') await lock(inputs, options);
  else if (command === 'unlock') await unlock(inputs[0], options);
  else await verify(inputs[0], options);
}

// ---------------------------------------------------------------------------
// Commandes

async function passphrase(options, extra) {
  if (extra.length > 0) throw new UsageError(t('usage.passphraseFiles'));
  const words = options.words === undefined ? DEFAULT_WORDS : Number(options.words);
  if (!Number.isInteger(words) || words < MIN_WORDS || words > MAX_WORDS) {
    throw new UsageError(t('usage.words', { min: MIN_WORDS, max: MAX_WORDS }));
  }
  const lang = options.lang ?? LANG;
  if (!LANGUAGES.includes(lang)) throw new UsageError(t('usage.lang', { languages: LANGUAGES.join(t('usage.or')) }));

  const { passphrase: phrase, bits } = await generatePassphrase({ lang, words });
  stdout.write(`${phrase}\n`);
  // Informations sur stderr : stdout reste exploitable par un script.
  if (stderr.isTTY) stderr.write(`${t('passphrase.entropy', { bits: Math.round(bits) })}\n`);
}

async function lock(inputs, options) {
  const format = options.age ? 'age' : 'cadenas';
  const source = await openSource(inputs, { hideName: options['hide-name'] });
  const output = resolveOutput(options.output, () => join(source.dir, encryptedName(source.name, format)), source.fromStdin);
  await ensureWritable(output, options.force);

  const password = await readPassword(options, { confirm: true, stdinIsData: source.fromStdin });
  const progress = new Progress(t('progress.encrypt'), source.size);
  progress.phase(t('progress.key'));
  const encrypted = await encrypt(progress.count(source.stream()), password, { format });
  await writeOutput(encrypted, output, { force: options.force });
  progress.done();
  if (output !== STDIO) {
    const path = displayPath(output);
    const done = source.count > 1 ? t('done.encryptedMany', { count: source.count, path }) : t('done.encrypted', { path });
    stderr.write(`${done}\n`);
  }
}

async function unlock(input, options) {
  const source = await openEncrypted(input);
  const { path, fromStdin } = source;
  const output = resolveOutput(options.output, () => join(dirname(path), decryptedName(basename(path))), fromStdin);
  await ensureWritable(output, options.force);

  const password = await readPassword(options, { confirm: false, stdinIsData: fromStdin });
  const progress = new Progress(t('progress.decrypt'), source.size);
  progress.phase(t('progress.key'));
  const { stream } = await decrypt(progress.count(source.stream()), password);
  await writeOutput(stream, output, { force: options.force });
  progress.done();
  if (output !== STDIO) stderr.write(`${t('done.decrypted', { path: displayPath(output) })}\n`);
}

/**
 * Déchiffre tout le fichier sans rien écrire : chaque bloc est authentifié,
 * donc arriver au bout prouve que le mot de passe est bon et que le fichier
 * est intact. Code de sortie 0 dans ce cas, 1 sinon.
 */
async function verify(input, options) {
  const source = await openEncrypted(input);
  const password = await readPassword(options, { confirm: false, stdinIsData: source.fromStdin });
  const progress = new Progress(t('progress.verify'), source.size);
  progress.phase(t('progress.key'));
  const { format, stream } = await decrypt(progress.count(source.stream()), password);
  let size = 0;
  for await (const chunk of stream) size += chunk.length;
  progress.done();
  stderr.write(`${t('done.verified', { format, size: formatSize(size) })}\n`);
}

// ---------------------------------------------------------------------------
// Entrées

/**
 * Décrit ce qui sera chiffré : l'entrée standard, un fichier, ou une archive
 * .zip de plusieurs fichiers / dossiers. Avec hideName, même un fichier seul
 * est rangé dans une archive au nom neutre, qui garde son nom à l'intérieur.
 */
async function openSource(inputs, { hideName = false } = {}) {
  if (inputs[0] === STDIO) {
    return { fromStdin: true, count: 1, size: undefined, stream: () => Readable.toWeb(stdin) };
  }

  const infos = await Promise.all(inputs.map(statInput));
  if (inputs.length === 1 && infos[0].isFile() && !hideName) {
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
    else throw new CadenasError('NOT_A_FILE', t('error.NOT_A_FILE_OR_FOLDER', { path: input }));
  }
  if (files.length === 0) throw new CadenasError('EMPTY', t('error.EMPTY'));

  const entries = prepareEntries(
    files.map(({ absolute, path, info }) => ({
      path,
      size: info.size,
      lastModified: info.mtime,
      open: () => Readable.toWeb(createReadStream(absolute)),
    })),
  );
  const first = resolve(inputs[0]);
  const singleInput = inputs.length === 1;
  const singleFolder = singleInput && infos[0].isDirectory() && !hideName ? basename(first) : null;
  return {
    dir: singleInput ? dirname(first) : resolve('.'),
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
    else stderr.write(`${t('skipped', { path: displayPath(childAbsolute) })}\n`);
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
  if (!info.isFile()) throw new CadenasError('NOT_A_FILE', t('error.NOT_A_FILE', { path: input }));
  if (!detectFormat(await readHead(path))) {
    throw new CadenasError('UNKNOWN_FORMAT', t('error.UNKNOWN_FORMAT'));
  }
  return { fromStdin: false, path, size: info.size, stream: () => Readable.toWeb(createReadStream(path)) };
}

async function statInput(input) {
  try {
    return await lstat(input).then((info) => (info.isSymbolicLink() ? stat(input) : info));
  } catch (err) {
    if (err.code === 'ENOENT') throw new CadenasError('NOT_FOUND', t('error.NOT_FOUND', { path: input }));
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
  const password = await promptPassword(t('prompt.password'), { stdinIsData });
  if (confirm) {
    const again = await promptPassword(t('prompt.confirm'), { stdinIsData });
    if (password !== again) throw new CadenasError('MISMATCH', t('error.MISMATCH'));
  }
  return password;
}

// ---------------------------------------------------------------------------
// Sorties

/** « - » ou absence de -o avec l'entrée standard → sortie standard. */
function resolveOutput(option, defaultPath, fromStdin) {
  if (option === STDIO || (option === undefined && fromStdin)) {
    if (stdout.isTTY) {
      throw new UsageError(t('usage.binaryTerminal'));
    }
    return STDIO;
  }
  return resolve(option ?? defaultPath());
}

async function ensureWritable(output, force) {
  if (force || output === STDIO) return;
  const exists = await stat(output).then(() => true, () => false);
  if (exists) {
    throw new CadenasError('EXISTS', t('error.EXISTS', { path: displayPath(output) }));
  }
}

/**
 * Vers un fichier : écriture dans un fichier temporaire renommé à la fin, pour
 * qu'une erreur (mauvais mot de passe, fichier altéré…) ne laisse jamais de
 * fichier partiel. Vers la sortie standard : en flux ; en cas d'erreur, le
 * code de sortie non nul signale que les données sont incomplètes.
 */
async function writeOutput(webStream, output, { force = false } = {}) {
  if (output === STDIO) return pipeline(Readable.fromWeb(webStream), stdout);
  const temp = join(dirname(output), `.${basename(output)}.${randomBytes(4).toString('hex')}.tmp`);
  // Interruption (Ctrl+C, arrêt) : le fichier temporaire, qui peut contenir
  // une partie du clair, est supprimé avant de quitter.
  const onSignal = (signal) => {
    rmSync(temp, { force: true });
    if (stderr.isTTY) stderr.write('\r\x1b[K');
    exit(signal === 'SIGINT' ? 130 : 128 + (signal === 'SIGHUP' ? 1 : 15));
  };
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  for (const signal of signals) process.on(signal, onSignal);
  try {
    // 0600 : lisible par son seul propriétaire, comme le fichier final qui
    // en hérite (sans effet sous Windows).
    await pipeline(Readable.fromWeb(webStream), createWriteStream(temp, { flags: 'wx', mode: 0o600 }));
    await replaceFile(temp, output, force);
  } catch (err) {
    await rm(temp, { force: true });
    throw err;
  } finally {
    for (const signal of signals) process.off(signal, onSignal);
  }
}

/**
 * Renomme temp en output. Avec -f, un fichier existant en lecture seule
 * (Windows refuse alors le renommage) est d'abord supprimé.
 */
async function replaceFile(temp, output, force) {
  try {
    await rename(temp, output);
  } catch (err) {
    if (!force || (err.code !== 'EPERM' && err.code !== 'EACCES')) throw err;
    await chmod(output, 0o600).catch(() => {});
    await rm(output, { force: true });
    await rename(temp, output);
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
      : formatSize(this.#done);
    stderr.write(`\r\x1b[K${this.label}… ${status}`);
  }

  done() {
    if (this.enabled) stderr.write('\r\x1b[K');
  }
}

function formatSize(bytes) {
  if (bytes < 1000) return t(bytes > 1 ? 'size.bytes' : 'size.byte', { n: bytes });
  const units = t('size.units');
  let value = bytes;
  let unit = -1;
  do {
    value /= 1000;
    unit++;
  } while (value >= 1000 && unit < units.length - 1);
  return `${value.toFixed(1).replace('.', t('size.decimal'))} ${units[unit]}`;
}

/**
 * Message d'une CadenasError dans la langue de l'interface. Les erreurs de la
 * bibliothèque (src/) ont un message en français : elles sont traduites par
 * leur code ; celles de la CLI sont déjà dans la bonne langue.
 */
function errorMessage(err) {
  return LIBRARY_CODES.has(err.code) ? t(`error.${err.code}`) : err.message;
}

const LIBRARY_CODES = new Set([
  'EMPTY_PASSWORD',
  'UNKNOWN_FORMAT',
  'UNSUPPORTED_VERSION',
  'UNSUPPORTED_AGE',
  'INVALID_PARAMS',
  'WRONG_PASSWORD',
  'TRUNCATED',
  'CORRUPTED',
  'NO_TERMINAL',
]);

function displayPath(path) {
  const rel = relative('.', path);
  return rel && !rel.startsWith('..') ? rel : path;
}

main().catch((err) => {
  if (stderr.isTTY) stderr.write('\r\x1b[K');
  if (err instanceof PromptCancelled) {
    stderr.write(`${t('cancelled')}\n`);
    exit(130);
  }
  if (err instanceof UsageError) {
    stderr.write(`${t('error.prefix', { message: err.message })}\n${t('error.help')}\n`);
    exit(2);
  }
  if (err instanceof CadenasError) {
    stderr.write(`${t('error.prefix', { message: errorMessage(err) })}\n`);
    exit(1);
  }
  stderr.write(`${t('error.unexpected', { message: err?.message ?? err })}\n`);
  exit(1);
});
