# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [0.4.0] - 2026-09-27

### Ajouté

- Site web (`web/`), construit avec Vite en pages statiques :
  - glisser-déposer ou sélection d'un fichier, détection automatique chiffrer / déchiffrer ;
  - mot de passe avec confirmation, affichage à la demande et indicateur de solidité ;
  - choix du format `.cadenas` (recommandé) ou `.age` ;
  - chiffrement dans un Web Worker (la page ne se fige jamais) avec barre de progression ;
  - thème clair / sombre automatique, mise en page mobile, navigation au clavier ;
  - aucune ressource externe, aucune requête réseau : tout reste dans le navigateur.
- `src/detect.js` (détection de format sans dépendance) et `src/names.js` (noms des fichiers produits), partagés avec la future CLI.
- Scripts `npm run dev`, `npm run build`, `npm run preview`.

## [0.3.0] - 2026-09-27

### Ajouté

- Compatibilité avec le format [age](https://age-encryption.org) via la bibliothèque officielle `age-encryption` (`src/format-age.js`) :
  - chiffrement au format age par mot de passe (scrypt), lisible par `age -d` et `rage` ;
  - déchiffrement des fichiers age binaires et armurés (`age -a`) ;
  - message clair pour les fichiers age chiffrés pour une clé publique (non pris en charge).
- API publique unique `src/core.js` : `encrypt(flux, mot de passe, { format })` et `decrypt(flux, mot de passe)` avec détection automatique du format d'après les premiers octets.
- Nouveau code d'erreur `UNSUPPORTED_AGE`.

## [0.2.0] - 2026-09-27

### Ajouté

- Format de fichier `.cadenas` v1 (`src/format-cadenas.js`) :
  - dérivation du mot de passe par Argon2id (64 Mio, 3 passes par défaut, paramètres stockés dans l'en-tête) ;
  - clés d'en-tête et de contenu séparées par HKDF-SHA256 ;
  - en-tête authentifié par HMAC-SHA256 : un mauvais mot de passe est détecté immédiatement ;
  - contenu chiffré en XChaCha20-Poly1305 par blocs de 64 Kio, en flux (fichiers de toute taille) ;
  - détection des fichiers tronqués, modifiés ou dont les blocs ont été réordonnés.
- Spécification du format : `docs/FORMAT.md`, avec vecteur de test `test/fixtures/vector-v1.json`.
- Tests (`node:test`), dont une implémentation de référence indépendante écrite d'après la spécification.
- `SECURITY.md` : garanties, limites et signalement de vulnérabilités.

## [0.1.0] - 2026-09-27

### Ajouté

- Initialisation du projet : `package.json`, licence MIT, README, `.editorconfig`, `.gitignore`.

[0.4.0]: https://github.com/PierreEbele/cadenas/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/PierreEbele/cadenas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/PierreEbele/cadenas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/PierreEbele/cadenas/releases/tag/v0.1.0
