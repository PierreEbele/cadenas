/**
 * Traductions de l'interface (français, anglais).
 *
 * Dans le HTML : data-i18n="clé" remplace le texte, data-i18n-html="clé" le
 * contenu HTML (chaînes constantes de ce fichier uniquement), et
 * data-i18n-attr="attribut:clé" un attribut.
 */
export const MESSAGES = {
  fr: {
    'meta.title': 'cadenas — chiffrer un fichier avec un mot de passe',
    'meta.description':
      "Chiffrez et déchiffrez un fichier avec un mot de passe, directement dans votre navigateur. Rien n'est envoyé sur Internet. Open source.",
    tagline: 'Chiffrez un fichier avec un mot de passe. Rien ne quitte votre navigateur.',
    'drop.title': 'Déposez un fichier ici',
    'drop.hint': 'ou <span class="link-like">parcourez vos fichiers</span>',
    'file.change': 'Changer',
    'file.badge': 'fichier',
    'file.willEncrypt': '{size} · sera chiffré',
    'file.willDecrypt': '{size} · fichier {format} chiffré, sera déchiffré',
    'password.label': 'Mot de passe',
    'password.generate': 'Générer une phrase de passe',
    'password.show': 'Afficher le mot de passe',
    'password.hide': 'Masquer le mot de passe',
    'generated.note': 'Notez cette phrase de passe maintenant : elle ne pourra pas être retrouvée.',
    'generated.copy': 'Copier',
    'generated.copied': 'Copiée ✓',
    'generated.selected': 'Sélectionnée, copiez-la',
    'confirm.label': 'Confirmez le mot de passe',
    'format.label': 'Format',
    'format.recommended': 'Recommandé',
    'format.compatible': 'Compatible age',
    hint:
      'Astuce : une phrase de 4 ou 5 mots est facile à retenir et très solide. Un mot de passe oublié ne peut pas être récupéré.',
    'action.encrypt': 'Chiffrer',
    'action.decrypt': 'Déchiffrer',
    'progress.key': 'Préparation de la clé…',
    'progress.keyDetail': 'Cette étape prend volontairement une à quelques secondes.',
    'progress.encrypting': 'Chiffrement…',
    'progress.decrypting': 'Déchiffrement…',
    'progress.of': '{done} sur {total}',
    'progress.percent': '{n} %',
    cancel: 'Annuler',
    'result.encrypted': 'Fichier chiffré',
    'result.decrypted': 'Fichier déchiffré',
    'result.download': 'Télécharger {name}',
    'result.restart': 'Traiter un autre fichier',
    'facts.label': 'Garanties',
    'facts.local.title': '100 % local',
    'facts.local.text': "Le chiffrement a lieu dans votre navigateur. Aucun fichier ni mot de passe n'est envoyé.",
    'facts.solid.title': 'Solide',
    'facts.solid.text': 'Argon2id et XChaCha20-Poly1305 : toute modification du fichier chiffré est détectée.',
    'facts.open.title': 'Ouvert',
    'facts.open.text':
      'Code source libre, format documenté, compatible avec l\'outil <a href="https://age-encryption.org" rel="noopener noreferrer">age</a>.',
    'footer.source': 'Code source',
    'footer.format': 'Format',
    'footer.security': 'Sécurité',
    'footer.license': 'Licence MIT',
    'footer.switch': 'English',
    'footer.switchLabel': 'Switch to English',
    'strength.0': 'Très faible',
    'strength.1': 'Faible',
    'strength.2': 'Correct',
    'strength.3': 'Fort',
    'strength.4': 'Excellent',
    'error.noPassword': 'Saisissez un mot de passe.',
    'error.mismatch': 'Les deux mots de passe ne correspondent pas.',
    'error.WRONG_PASSWORD': 'Mot de passe incorrect.',
    'error.CORRUPTED': 'Le fichier chiffré est endommagé ou a été modifié.',
    'error.TRUNCATED': 'Le fichier chiffré est incomplet.',
    'error.UNKNOWN_FORMAT': 'Ce fichier n’est ni un fichier .cadenas ni un fichier .age.',
    'error.UNSUPPORTED_VERSION': 'Ce fichier a été créé par une version plus récente de cadenas. Rechargez la page.',
    'error.UNSUPPORTED_AGE':
      'Ce fichier age est chiffré pour une clé publique, pas avec un mot de passe : cadenas ne peut pas l’ouvrir.',
    'error.INVALID_PARAMS': 'Ce fichier contient des paramètres invalides : il est probablement endommagé.',
    'error.EMPTY_PASSWORD': 'Le mot de passe ne peut pas être vide.',
    'error.INTERNAL':
      'Une erreur inattendue est survenue. Le fichier est peut-être trop volumineux pour ce navigateur.',
    units: ['octets', 'Ko', 'Mo', 'Go', 'To'],
  },
  en: {
    'meta.title': 'cadenas — encrypt a file with a password',
    'meta.description':
      'Encrypt and decrypt a file with a password, right in your browser. Nothing is sent over the Internet. Open source.',
    tagline: 'Encrypt a file with a password. Nothing leaves your browser.',
    'drop.title': 'Drop a file here',
    'drop.hint': 'or <span class="link-like">browse your files</span>',
    'file.change': 'Change',
    'file.badge': 'file',
    'file.willEncrypt': '{size} · will be encrypted',
    'file.willDecrypt': '{size} · encrypted {format} file, will be decrypted',
    'password.label': 'Password',
    'password.generate': 'Generate a passphrase',
    'password.show': 'Show password',
    'password.hide': 'Hide password',
    'generated.note': 'Write this passphrase down now: it cannot be recovered.',
    'generated.copy': 'Copy',
    'generated.copied': 'Copied ✓',
    'generated.selected': 'Selected, copy it',
    'confirm.label': 'Confirm password',
    'format.label': 'Format',
    'format.recommended': 'Recommended',
    'format.compatible': 'age compatible',
    hint: 'Tip: a phrase of 4 or 5 words is easy to remember and very strong. A forgotten password cannot be recovered.',
    'action.encrypt': 'Encrypt',
    'action.decrypt': 'Decrypt',
    'progress.key': 'Preparing the key…',
    'progress.keyDetail': 'This step deliberately takes one to a few seconds.',
    'progress.encrypting': 'Encrypting…',
    'progress.decrypting': 'Decrypting…',
    'progress.of': '{done} of {total}',
    'progress.percent': '{n}%',
    cancel: 'Cancel',
    'result.encrypted': 'File encrypted',
    'result.decrypted': 'File decrypted',
    'result.download': 'Download {name}',
    'result.restart': 'Process another file',
    'facts.label': 'Guarantees',
    'facts.local.title': '100% local',
    'facts.local.text': 'Encryption happens in your browser. No file or password is ever sent.',
    'facts.solid.title': 'Strong',
    'facts.solid.text': 'Argon2id and XChaCha20-Poly1305: any change to the encrypted file is detected.',
    'facts.open.title': 'Open',
    'facts.open.text':
      'Free software, documented format, compatible with the <a href="https://age-encryption.org" rel="noopener noreferrer">age</a> tool.',
    'footer.source': 'Source code',
    'footer.format': 'Format',
    'footer.security': 'Security',
    'footer.license': 'MIT license',
    'footer.switch': 'Français',
    'footer.switchLabel': 'Passer en français',
    'strength.0': 'Very weak',
    'strength.1': 'Weak',
    'strength.2': 'Fair',
    'strength.3': 'Strong',
    'strength.4': 'Excellent',
    'error.noPassword': 'Enter a password.',
    'error.mismatch': 'The two passwords do not match.',
    'error.WRONG_PASSWORD': 'Wrong password.',
    'error.CORRUPTED': 'The encrypted file is damaged or has been modified.',
    'error.TRUNCATED': 'The encrypted file is incomplete.',
    'error.UNKNOWN_FORMAT': 'This file is neither a .cadenas nor an .age file.',
    'error.UNSUPPORTED_VERSION': 'This file was created by a newer version of cadenas. Reload the page.',
    'error.UNSUPPORTED_AGE':
      'This age file is encrypted to a public key, not with a password: cadenas cannot open it.',
    'error.INVALID_PARAMS': 'This file contains invalid parameters: it is probably damaged.',
    'error.EMPTY_PASSWORD': 'The password cannot be empty.',
    'error.INTERNAL': 'An unexpected error occurred. The file may be too large for this browser.',
    units: ['bytes', 'kB', 'MB', 'GB', 'TB'],
  },
};

export const LANGUAGES = Object.keys(MESSAGES);
const STORAGE_KEY = 'cadenas.lang';

let current = detectLanguage();

/** Langue choisie par l'utilisateur, sinon celle du navigateur, sinon l'anglais. */
function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.includes(saved)) return saved;
  } catch {
    // Stockage indisponible (navigation privée…) : on ignore.
  }
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = String(tag).slice(0, 2).toLowerCase();
    if (LANGUAGES.includes(base)) return base;
  }
  return 'en';
}

export const getLanguage = () => current;

export function setLanguage(lang) {
  if (!LANGUAGES.includes(lang)) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Préférence non mémorisée : sans gravité.
  }
  applyTranslations();
}

/** Traduit une clé, en remplaçant les {paramètres}. */
export function t(key, params = {}) {
  const message = MESSAGES[current][key] ?? MESSAGES.fr[key] ?? key;
  return typeof message === 'string'
    ? message.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`)
    : message;
}

/** Applique les traductions aux éléments marqués du document. */
export function applyTranslations(root = document) {
  document.documentElement.lang = current;
  document.title = t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
}
