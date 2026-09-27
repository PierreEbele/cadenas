# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

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

[0.2.0]: https://github.com/PierreEbele/cadenas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/PierreEbele/cadenas/releases/tag/v0.1.0
