/**
 * Saisie d'un mot de passe dans le terminal, sans écho. Sans dépendance.
 */
import { openSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { platform, stderr, stdin } from 'node:process';
import { ReadStream } from 'node:tty';
import { CadenasError } from './errors.js';

export class PromptCancelled extends Error {
  constructor() {
    super('Saisie annulée.');
    this.name = 'PromptCancelled';
  }
}

let ttyInput;

/**
 * Flux clavier du terminal. Si l'entrée standard sert déjà aux données
 * (`cat f | cadenas lock -`), on ouvre directement le terminal
 * (/dev/tty, ou CONIN$ sous Windows) — uniquement dans ce cas, pour ne
 * jamais bloquer un script qui aurait simplement oublié le mot de passe.
 */
function terminalInput(stdinIsData) {
  if (stdin.isTTY) return stdin;
  if (!stdinIsData) return null;
  if (ttyInput !== undefined) return ttyInput;
  try {
    const fd = openSync(platform === 'win32' ? 'CONIN$' : '/dev/tty', 'r');
    const stream = new ReadStream(fd);
    ttyInput = stream.isTTY ? stream : null;
  } catch {
    ttyInput = null;
  }
  return ttyInput;
}

/**
 * Affiche `question` sur stderr et lit une ligne masquée depuis le terminal.
 * @param {string} question
 * @param {{ stdinIsData?: boolean }} [options] l'entrée standard transporte les données
 * @returns {Promise<string>}
 */
export function promptPassword(question, { stdinIsData = false } = {}) {
  const input = terminalInput(stdinIsData);
  if (!input) {
    return Promise.reject(
      new CadenasError(
        'NO_TERMINAL',
        'Aucun terminal pour saisir le mot de passe. Utilisez --password-file ou --password-stdin.',
      ),
    );
  }
  return new Promise((resolve, reject) => {
    const chars = [];
    stderr.write(question);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();

    // Le terminal ne doit jamais rester sans écho : mode normal rétabli si le
    // programme se termine pendant la saisie (erreur, signal).
    const restore = () => input.setRawMode(false);
    const onSignal = (signal) => {
      restore();
      process.exit(128 + (signal === 'SIGHUP' ? 1 : 15));
    };
    process.once('exit', restore);
    process.once('SIGTERM', onSignal);
    process.once('SIGHUP', onSignal);

    const finish = (error) => {
      input.off('data', onData);
      process.off('exit', restore);
      process.off('SIGTERM', onSignal);
      process.off('SIGHUP', onSignal);
      restore();
      input.pause();
      stderr.write('\n');
      if (error) reject(error);
      else resolve(chars.join(''));
    };

    const isKey = escapeFilter();

    function onData(data) {
      // Un collage arrive en un seul morceau : on traite caractère par caractère.
      for (const char of data) {
        if (!isKey(char)) continue;
        switch (char) {
          case '\r':
          case '\n':
            return finish();
          case '\u0003': // Ctrl+C
            return finish(new PromptCancelled());
          case '\u0004': // Ctrl+D
            if (chars.length === 0) return finish(new PromptCancelled());
            break;
          case '\u007f': // Retour arrière
          case '\b':
            chars.pop();
            break;
          default:
            if (char >= ' ') chars.push(char);
        }
      }
      isKey.endOfChunk();
    }

    input.on('data', onData);
  });
}

/**
 * Filtre des séquences d'échappement du terminal (flèches, Suppr, Début…) :
 * renvoie une fonction qui dit, caractère par caractère, s'il s'agit d'une
 * vraie touche. Sans ce filtre, les caractères d'une séquence (« [D »,
 * « [3~ »…) s'ajouteraient en silence au mot de passe, saisi sans écho.
 * État : 0 hors séquence, 1 après ESC, 2 dans une séquence CSI (ESC [ …
 * jusqu'à l'octet final), 3 après ESC O (une seule touche suit).
 *
 * Une séquence arrive d'un seul morceau : un ESC en fin de morceau est donc
 * une simple pression sur Échap, et `endOfChunk()` l'oublie pour que la
 * touche suivante ne soit pas avalée.
 */
export function escapeFilter() {
  let state = 0;
  const isKey = (char) => {
    if (state === 1) {
      state = char === '[' ? 2 : char === 'O' ? 3 : 0;
      return false;
    }
    if (state === 2) {
      if (char >= '@' && char <= '~') state = 0;
      return false;
    }
    if (state === 3) {
      state = 0;
      return false;
    }
    if (char === '\u001b') {
      state = 1;
      return false;
    }
    return true;
  };
  isKey.endOfChunk = () => {
    if (state === 1) state = 0;
  };
  return isKey;
}

/**
 * Première ligne d'un texte, sans le saut de ligne final ni l'indicateur
 * d'ordre des octets (BOM) qu'ajoutent le Bloc-notes de Windows ou PowerShell.
 */
const firstLine = (text) => text.replace(/^\uFEFF/, '').split(/\r?\n/)[0];

/** Lit la première ligne de l'entrée standard (pour --password-stdin). */
export async function readPasswordFromStdin() {
  let data = '';
  stdin.setEncoding('utf8');
  for await (const chunk of stdin) {
    data += chunk;
    if (data.includes('\n')) break;
  }
  return firstLine(data);
}

/** Lit la première ligne d'un fichier (pour --password-file). */
export async function readPasswordFromFile(path) {
  return firstLine(await readFile(path, 'utf8'));
}
