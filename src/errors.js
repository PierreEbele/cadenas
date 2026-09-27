/**
 * Erreur métier de cadenas. `code` est stable et destiné aux programmes
 * (CLI, interface web) ; `message` est destiné aux humains.
 *
 * Codes :
 * - EMPTY_PASSWORD       le mot de passe est vide
 * - UNKNOWN_FORMAT       le fichier n'est ni un .cadenas ni un .age
 * - UNSUPPORTED_VERSION  fichier .cadenas d'une version plus récente
 * - INVALID_PARAMS       paramètres de dérivation de clé hors limites
 * - WRONG_PASSWORD       mot de passe incorrect (ou en-tête altéré)
 * - TRUNCATED            fichier incomplet
 * - CORRUPTED            contenu altéré ou endommagé
 */
export class CadenasError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'CadenasError';
    this.code = code;
  }
}
