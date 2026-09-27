/**
 * Saisie d'un mot de passe dans le terminal, sans écho. Sans dépendance.
 */
import { openSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { platform, stderr, stdin } from 'node:process';
import { ReadStream } from 'node:tty';

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
      new Error('Aucun terminal pour saisir le mot de passe. Utilisez --password-file ou --password-stdin.'),
    );
  }
  return new Promise((resolve, reject) => {
    const chars = [];
    stderr.write(question);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();

    const finish = (error) => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      stderr.write('\n');
      if (error) reject(error);
      else resolve(chars.join(''));
    };

    function onData(data) {
      // Un collage arrive en un seul morceau : on traite caractère par caractère.
      for (const char of data) {
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
    }

    input.on('data', onData);
  });
}

/** Première ligne d'un texte, sans le saut de ligne final. */
const firstLine = (text) => text.split(/\r?\n/)[0];

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
