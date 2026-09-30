/**
 * Textes de la ligne de commande, en français et en anglais. La langue suit
 * celle du système : français si LC_ALL, LC_MESSAGES, LANG ou LANGUAGE (dans
 * cet ordre) commence par « fr », sinon anglais ; à défaut de ces variables
 * (Windows), la langue régionale du système.
 */

/** @returns {'fr' | 'en'} */
export function detectLanguage(env = process.env) {
  for (const name of ['LC_ALL', 'LC_MESSAGES', 'LANG', 'LANGUAGE']) {
    const value = env[name];
    if (value && value !== 'C' && value !== 'POSIX') return value.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }
  return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

const HELP = {
  fr: `cadenas {version} — chiffrer un fichier avec un mot de passe

Utilisation :
  cadenas lock <fichier|dossier>...   chiffre (plusieurs fichiers ou un dossier → archive .zip chiffrée)
  cadenas unlock <fichier>            déchiffre un fichier .cadenas ou .age
  cadenas verify <fichier>            vérifie le fichier et le mot de passe, sans rien écrire
  cadenas passphrase                  génère une phrase de passe aléatoire

  « - » désigne l'entrée standard (fichier) ou la sortie standard (-o -).

Options :
  -o, --output <chemin>     fichier de sortie (« - » : sortie standard)
  -f, --force               écrase le fichier de sortie s'il existe
      --age                 chiffre au format age, lisible par age / rage
      --hide-name           masque le nom : fichier(s) rangé(s) dans une archive .zip,
                            résultat nommé cadenas-AAAA-MM-JJ.zip.cadenas
      --password-file <f>   lit le mot de passe dans un fichier (première ligne)
      --password-stdin      lit le mot de passe sur l'entrée standard
  -h, --help                affiche cette aide
  -v, --version             affiche la version

Options de passphrase :
  -w, --words <n>           nombre de mots ({defaultWords} par défaut, {minWords} à {maxWords})
      --lang <fr|en>        langue des mots (par défaut : celle de l'interface)

Exemples :
  cadenas lock rapport.pdf                    → rapport.pdf.cadenas
  cadenas lock photos/                        → photos.zip.cadenas
  cadenas lock a.txt b.txt -o docs.zip.cadenas
  cadenas unlock rapport.pdf.cadenas
  cadenas verify sauvegarde.cadenas --password-file ~/.secret && echo intact
  tar c projet | cadenas lock - --password-file ~/.secret > projet.tar.cadenas
  cadenas unlock sauvegarde.cadenas -o - --password-file ~/.secret | tar x

Langue des messages : celle du système (LANG=fr_FR.UTF-8 ou LANG=en_US.UTF-8).
Documentation : https://github.com/PierreEbele/cadenas`,
  en: `cadenas {version} — encrypt a file with a password

Usage:
  cadenas lock <file|folder>...       encrypt (several files or a folder → encrypted .zip archive)
  cadenas unlock <file>               decrypt a .cadenas or .age file
  cadenas verify <file>               check the file and the password, without writing anything
  cadenas passphrase                  generate a random passphrase

  "-" means standard input (file) or standard output (-o -).

Options:
  -o, --output <path>       output file ("-": standard output)
  -f, --force               overwrite the output file if it exists
      --age                 encrypt in the age format, readable by age / rage
      --hide-name           hide the name: file(s) stored in a .zip archive,
                            result named cadenas-YYYY-MM-DD.zip.cadenas
      --password-file <f>   read the password from a file (first line)
      --password-stdin      read the password from standard input
  -h, --help                show this help
  -v, --version             show the version

Passphrase options:
  -w, --words <n>           number of words ({defaultWords} by default, {minWords} to {maxWords})
      --lang <fr|en>        language of the words (default: the interface language)

Examples:
  cadenas lock report.pdf                     → report.pdf.cadenas
  cadenas lock photos/                        → photos.zip.cadenas
  cadenas lock a.txt b.txt -o docs.zip.cadenas
  cadenas unlock report.pdf.cadenas
  cadenas verify backup.cadenas --password-file ~/.secret && echo intact
  tar c project | cadenas lock - --password-file ~/.secret > project.tar.cadenas
  cadenas unlock backup.cadenas -o - --password-file ~/.secret | tar x

Message language: the system's (LANG=en_US.UTF-8 or LANG=fr_FR.UTF-8).
Documentation: https://github.com/PierreEbele/cadenas`,
};

export const MESSAGES = {
  fr: {
    help: HELP.fr,
    'usage.unknownCommand': 'Commande inconnue : {command}. Utilisez lock, unlock, verify ou passphrase.',
    'usage.noInput': 'Indiquez ce qu’il faut traiter : cadenas {command} <fichier>',
    'usage.stdinCombined': '« - » (entrée standard) ne peut pas être combiné à d’autres fichiers.',
    'usage.passwordSources': 'Choisissez --password-stdin ou --password-file, pas les deux.',
    'usage.stdinBusy': 'L’entrée standard sert déjà aux données : utilisez --password-file.',
    'usage.hideNameLockOnly': '--hide-name ne s’utilise qu’avec lock.',
    'usage.hideNameStdin': '--hide-name ne s’utilise pas avec l’entrée standard, qui n’a pas de nom.',
    'usage.ageLockOnly': '--age ne s’utilise qu’avec lock : le format est détecté automatiquement.',
    'usage.oneFile': '{command} traite un seul fichier à la fois.',
    'usage.verifyWrites': 'verify n’écrit aucun fichier : -o et -f ne s’utilisent pas avec.',
    'usage.passphraseFiles': 'passphrase ne prend pas de fichier.',
    'usage.words': '--words attend un nombre entier entre {min} et {max}.',
    'usage.lang': '--lang attend {languages}.',
    'usage.or': ' ou ',
    'usage.binaryTerminal': 'Refus d’écrire des données binaires dans le terminal : redirigez la sortie ou utilisez -o <fichier>.',
    'passphrase.entropy': '({bits} bits d’entropie — notez-la, elle ne pourra pas être retrouvée)',
    'progress.key': 'Préparation de la clé…',
    'progress.encrypt': 'Chiffrement',
    'progress.decrypt': 'Déchiffrement',
    'progress.verify': 'Vérification',
    'prompt.password': 'Mot de passe : ',
    'prompt.confirm': 'Confirmez le mot de passe : ',
    'done.encrypted': '✔ Fichier chiffré : {path}',
    'done.encryptedMany': '✔ {count} fichiers chiffrés : {path}',
    'done.decrypted': '✔ Fichier déchiffré : {path}',
    'done.verified': '✔ Fichier intact et mot de passe correct (format {format}, {size} une fois déchiffré).',
    skipped: 'Ignoré (lien ou fichier spécial) : {path}',
    cancelled: 'Annulé.',
    'error.prefix': 'Erreur : {message}',
    'error.help': 'Aide : cadenas --help',
    'error.unexpected': 'Erreur inattendue : {message}',
    'error.NOT_FOUND': 'Introuvable : {path}',
    'error.NOT_A_FILE': '{path} n’est pas un fichier.',
    'error.NOT_A_FILE_OR_FOLDER': '{path} n’est ni un fichier ni un dossier.',
    'error.EMPTY': 'Aucun fichier à chiffrer : les dossiers sont vides.',
    'error.EXISTS': '{path} existe déjà. Utilisez -f pour l’écraser ou -o pour choisir un autre nom.',
    'error.MISMATCH': 'Les deux mots de passe ne correspondent pas.',
    'error.NO_TERMINAL': 'Aucun terminal pour saisir le mot de passe. Utilisez --password-file ou --password-stdin.',
    'error.EMPTY_PASSWORD': 'Le mot de passe ne peut pas être vide.',
    'error.UNKNOWN_FORMAT': 'Ce fichier n’est ni un fichier .cadenas ni un fichier .age.',
    'error.UNSUPPORTED_VERSION': 'Ce fichier utilise une version plus récente du format : mettez cadenas à jour.',
    'error.UNSUPPORTED_AGE': 'Ce fichier age est chiffré pour une clé publique, pas avec un mot de passe : cadenas ne peut pas l’ouvrir.',
    'error.INVALID_PARAMS': 'Les paramètres de dérivation de clé de ce fichier sont invalides.',
    'error.WRONG_PASSWORD': 'Mot de passe incorrect.',
    'error.TRUNCATED': 'Le fichier chiffré est incomplet.',
    'error.CORRUPTED': 'Le fichier chiffré est endommagé ou a été modifié.',
    'size.bytes': '{n} octets',
    'size.byte': '{n} octet',
    'size.units': ['ko', 'Mo', 'Go', 'To'],
    'size.decimal': ',',
  },
  en: {
    help: HELP.en,
    'usage.unknownCommand': 'Unknown command: {command}. Use lock, unlock, verify or passphrase.',
    'usage.noInput': 'Say what to process: cadenas {command} <file>',
    'usage.stdinCombined': '"-" (standard input) cannot be combined with other files.',
    'usage.passwordSources': 'Choose --password-stdin or --password-file, not both.',
    'usage.stdinBusy': 'Standard input already carries the data: use --password-file.',
    'usage.hideNameLockOnly': '--hide-name only works with lock.',
    'usage.hideNameStdin': '--hide-name does not work with standard input, which has no name.',
    'usage.ageLockOnly': '--age only works with lock: the format is detected automatically.',
    'usage.oneFile': '{command} processes one file at a time.',
    'usage.verifyWrites': 'verify writes no file: -o and -f cannot be used with it.',
    'usage.passphraseFiles': 'passphrase takes no file.',
    'usage.words': '--words expects a whole number between {min} and {max}.',
    'usage.lang': '--lang expects {languages}.',
    'usage.or': ' or ',
    'usage.binaryTerminal': 'Refusing to write binary data to the terminal: redirect the output or use -o <file>.',
    'passphrase.entropy': '({bits} bits of entropy — write it down, it cannot be recovered)',
    'progress.key': 'Preparing the key…',
    'progress.encrypt': 'Encrypting',
    'progress.decrypt': 'Decrypting',
    'progress.verify': 'Verifying',
    'prompt.password': 'Password: ',
    'prompt.confirm': 'Confirm the password: ',
    'done.encrypted': '✔ File encrypted: {path}',
    'done.encryptedMany': '✔ {count} files encrypted: {path}',
    'done.decrypted': '✔ File decrypted: {path}',
    'done.verified': '✔ File intact and password correct ({format} format, {size} once decrypted).',
    skipped: 'Skipped (link or special file): {path}',
    cancelled: 'Cancelled.',
    'error.prefix': 'Error: {message}',
    'error.help': 'Help: cadenas --help',
    'error.unexpected': 'Unexpected error: {message}',
    'error.NOT_FOUND': 'Not found: {path}',
    'error.NOT_A_FILE': '{path} is not a file.',
    'error.NOT_A_FILE_OR_FOLDER': '{path} is neither a file nor a folder.',
    'error.EMPTY': 'No file to encrypt: the folders are empty.',
    'error.EXISTS': '{path} already exists. Use -f to overwrite it or -o to choose another name.',
    'error.MISMATCH': 'The two passwords do not match.',
    'error.NO_TERMINAL': 'No terminal to type the password. Use --password-file or --password-stdin.',
    'error.EMPTY_PASSWORD': 'The password cannot be empty.',
    'error.UNKNOWN_FORMAT': 'This file is neither a .cadenas file nor a .age file.',
    'error.UNSUPPORTED_VERSION': 'This file uses a newer version of the format: update cadenas.',
    'error.UNSUPPORTED_AGE': 'This age file is encrypted to a public key, not with a password: cadenas cannot open it.',
    'error.INVALID_PARAMS': 'The key derivation parameters of this file are invalid.',
    'error.WRONG_PASSWORD': 'Wrong password.',
    'error.TRUNCATED': 'The encrypted file is incomplete.',
    'error.CORRUPTED': 'The encrypted file is damaged or has been modified.',
    'size.bytes': '{n} bytes',
    'size.byte': '{n} byte',
    'size.units': ['kB', 'MB', 'GB', 'TB'],
    'size.decimal': '.',
  },
};

/** Traducteur pour une langue : t('clé', { paramètre: valeur }). */
export function translator(lang) {
  const messages = MESSAGES[lang];
  return (key, params = {}) => {
    const value = messages[key];
    if (typeof value !== 'string') return value;
    return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name]));
  };
}
