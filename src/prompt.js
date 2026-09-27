/**
 * Saisie d'un mot de passe dans le terminal, sans écho. Sans dépendance.
 */
import { stdin, stderr } from 'node:process';

export class PromptCancelled extends Error {
  constructor() {
    super('Saisie annulée.');
    this.name = 'PromptCancelled';
  }
}

/**
 * Affiche `question` sur stderr et lit une ligne masquée depuis le terminal.
 * @returns {Promise<string>}
 */
export function promptPassword(question) {
  if (!stdin.isTTY) {
    return Promise.reject(
      new Error('Aucun terminal pour saisir le mot de passe. Utilisez --password-stdin.'),
    );
  }
  return new Promise((resolve, reject) => {
    const chars = [];
    stderr.write(question);
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();

    const finish = (error) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
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

    stdin.on('data', onData);
  });
}

/** Lit la première ligne de l'entrée standard (pour --password-stdin). */
export async function readPasswordFromStdin() {
  let data = '';
  stdin.setEncoding('utf8');
  for await (const chunk of stdin) {
    data += chunk;
    if (data.includes('\n')) break;
  }
  return data.split(/\r?\n/)[0];
}
