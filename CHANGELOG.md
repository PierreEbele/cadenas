# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/)
et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Option « Masquer le nom du fichier » (site) et `--hide-name` (CLI) : le fichier est rangé dans une archive `.zip` avant chiffrement, et le résultat reçoit un nom neutre (`cadenas-AAAA-MM-JJ.zip.cadenas`). Le nom d'origine n'est visible qu'après déchiffrement. Aucun changement du format.
- Tests de bout en bout du site dans Chromium, Firefox et WebKit (Playwright), imposés par la CI : chiffrer puis déchiffrer, interopérabilité avec la bibliothèque et le format age, archive de plusieurs fichiers, mauvais mot de passe, fonctionnement hors ligne, CSP effectivement appliquée, aucune requête hors du site, audit d'accessibilité axe (WCAG 2.1 AA, thèmes clair et sombre) et parcours complet au clavier. `npm run test:e2e`.

## [1.4.1] - 2026-09-30

Durcissement du service worker du site. Aucun changement du format de
fichier ni du chiffrement.

### Sécurité

- Site : le service worker vérifie l'origine des messages qu'il reçoit avant d'installer une nouvelle version (alerte CodeQL « Missing origin verification in `postMessage` handler »).

## [1.4.0] - 2026-09-28

README en anglais, projet documenté (badge OpenSSF Best Practices, niveau
silver) et publication renforcée : tags de version signés, provenance jointe
aux releases. Aucun changement du format de fichier ni du chiffrement.

### Ajouté

- README en anglais (`README.md`, affiché par défaut sur GitHub et npm) ; la version française devient `README.fr.md`, avec un lien de l'un à l'autre.
- Badge OpenSSF Best Practices (niveau silver) dans le README.
- Documentation du projet : gouvernance et rôles (`GOVERNANCE.md`), code de conduite (Contributor Covenant 2.1), feuille de route (`ROADMAP.md`), architecture (`docs/ARCHITECTURE.md`), argumentaire de sécurité avec modèle de menace (`docs/ASSURANCE.md`).
- ESLint (configuration recommandée) : `npm run lint`, imposé par la CI, et style de code décrit dans `CONTRIBUTING.md`.
- CI : couverture des tests de `src/` et `bin/` mesurée à chaque push, avec un minimum de 80 % (`npm run test:coverage`).

### Modifié

- Paquet npm : description en anglais, mots-clés plus complets, page d'accueil pointant vers le site.
- Publication npm : le npm fourni avec Node.js 24 est utilisé (et sa version vérifiée) au lieu d'installer une autre version non épinglée.

### Sécurité

- Tags de version signés (SSH) : les workflows de publication (release, npm, Docker) vérifient la signature du tag avec `scripts/verify-tag.js` et refusent de publier une version non signée. Procédure dans `CONTRIBUTING.md`, vérification dans `SECURITY.md`.
- Releases GitHub : la provenance signée est jointe à chaque release (`.sigstore.json` et `.intoto.jsonl` au format SLSA), pour une vérification hors ligne.
- `SECURITY.md` : processus de traitement des signalements de vulnérabilité (délais, publication, crédit).

## [1.3.0] - 2026-09-27

Site installable et utilisable hors ligne, exécutables autonomes de la CLI.
Aucun changement du format de fichier.

### Ajouté

- Site installable et utilisable hors ligne (application web progressive) : manifeste, icônes, et service worker qui met en cache tous les fichiers du site. Une nouvelle version s'installe en arrière-plan et ne s'applique qu'après un clic sur « Mettre à jour », jamais au milieu d'un chiffrement.
- Image Docker : le service worker reçoit sa propre politique de sécurité (`connect-src 'self'`, pour mettre le site en cache) ; la page garde `connect-src 'none'`. Manifeste servi avec le bon type MIME.
- Exécutables autonomes de la CLI, sans Node.js à installer : Windows x64, macOS arm64, Linux x64 et arm64. Construits par la CI (Node.js « Single Executable Application »), testés sur chaque plateforme avant publication, joints à chaque release avec empreintes et attestation de provenance. `npm run build:exe` construit celui de la plateforme courante.
- Le workflow de release peut être lancé à la main pour tout construire et tester sans rien publier.

### Modifié

- README : captures d'écran à jour (générateur de phrase de passe, sélecteur de langue), installation hors ligne.

## [1.2.0] - 2026-09-27

Plusieurs fichiers et dossiers, fichiers de toute taille sur le site, et CLI
prête pour les scripts de sauvegarde. Aucun changement du format de fichier.

### Ajouté

- Archives : plusieurs fichiers ou un dossier sont regroupés en une archive `.zip` produite en flux (`src/archive.js`, bibliothèque client-zip), puis chiffrés en un seul fichier. Arborescence et noms Unicode préservés, chemins nettoyés (ni chemin absolu ni `..`), doublons renommés, Zip64 au-delà de 4 Go, fichiers ouverts un par un.
- Site : plusieurs fichiers ou un dossier entier, par glisser-déposer ou par sélection (bouton « Choisir un dossier entier »). Ils sont réunis dans `dossier.zip` (ou `cadenas-AAAA-MM-JJ.zip`) puis chiffrés ; au déchiffrement, le site rappelle qu'il suffit d'ouvrir l'archive.
- Site : au-delà de 256 Mio, le résultat est écrit directement sur le disque (Chrome, Edge : le site demande où l'enregistrer avant de commencer), en mémoire constante quelle que soit la taille. Sur les autres navigateurs, un message conseille Chrome, Edge ou la ligne de commande pour plusieurs Go.
- CLI : `cadenas lock` accepte plusieurs fichiers et des dossiers (parcourus récursivement, liens symboliques ignorés) → `dossier.zip.cadenas` ou `cadenas-AAAA-MM-JJ.zip.cadenas`.
- CLI : `-` pour l'entrée standard (`cadenas lock -`, `cadenas unlock -`) et `-o -` pour la sortie standard ; refus d'écrire du binaire dans un terminal.
- CLI : option `--password-file <fichier>` ; quand l'entrée standard porte les données, le mot de passe est demandé directement au terminal.

### Modifié

- CLI : les messages de réussite (« ✔ Fichier chiffré… ») passent sur la sortie d'erreur, pour que la sortie standard ne contienne que des données.

## [1.1.0] - 2026-09-27

Générateur de phrases de passe, site en anglais, et chaîne de publication
entièrement vérifiable. Aucun changement du format de fichier.

### Ajouté

- Générateur de phrases de passe : bouton « Générer une phrase de passe » sur le site (avec copie en un clic) et commande `cadenas passphrase [--words n] [--lang fr|en]`. 5 mots tirés sans biais par le générateur aléatoire du système, plus de 64 bits d'entropie. Listes de mots : Tails (français, CC0) et EFF (anglais, CC BY 3.0 US), chargées seulement à la demande sur le site.
- Site : bouton « Annuler » pendant le chiffrement ou le déchiffrement.
- Site : le navigateur demande confirmation avant de quitter la page pendant un traitement, ou si le résultat n'a pas encore été téléchargé.
- Site en anglais : langue choisie d'après le navigateur, bouton « English / Français » en pied de page, choix mémorisé. Le générateur de phrases de passe utilise la liste de mots de la langue affichée.

### Sécurité

- Dependabot : mises à jour hebdomadaires des dépendances npm, des actions GitHub et de l'image de base Docker ; correctifs de sécurité automatiques.
- Analyse CodeQL du code et des workflows à chaque push et chaque semaine.
- OpenSSF Scorecard : note publique des bonnes pratiques, badge dans le README.
- Signalement privé de vulnérabilités activé sur GitHub.
- Actions GitHub mises à jour vers leurs dernières versions majeures.
- Image Docker signée avec cosign (sans clé, Sigstore), avec SBOM et attestation de provenance.
- Releases GitHub créées automatiquement par la CI : notes tirées du CHANGELOG, site archivé (`cadenas-site-vX.Y.Z.zip`), empreintes `SHA256SUMS` et `site-files.sha256`, attestation de provenance vérifiable avec `gh attestation verify`.
- SECURITY.md : comment vérifier le paquet npm, l'image Docker, les fichiers des releases et un site auto-hébergé.
- Dépendances de la CI épinglées : actions GitHub par empreinte de commit, images Docker de base par empreinte, version de npm fixée (Dependabot les tient à jour).
- Branche `main` protégée contre la suppression et la réécriture d'historique.
- Tests de propriétés (fuzzing avec fast-check) : aller-retour pour tout contenu, mot de passe et découpage ; détection de toute modification, troncature ou ajout d'octets ; refus propre d'entrées arbitraires.

### Modifié

- README : capture d'écran du site, en version claire et sombre selon le thème du lecteur.

## [1.0.2] - 2026-09-27

Première version publiée automatiquement par GitHub Actions, avec attestation de
provenance vérifiable sur npm. Aucun changement de code.

### Ajouté

- Publication automatique sur npm à chaque tag de version (`.github/workflows/npm.yml`), par publication de confiance (OIDC) : aucun jeton stocké, attestation de provenance jointe à chaque version, contrôle que le tag correspond à `package.json`.

## [1.0.1] - 2026-09-27

Première publication sur npm : `npm install -g cadenas`. Aucun changement de code.

### Modifié

- README : installation via npm (`npm install -g cadenas`, `npx cadenas`) et badge de version npm.
- `package.json` : les tests sont lancés automatiquement avant chaque publication (`prepublishOnly`) ; publication publique par défaut.

## [1.0.0] - 2026-09-27

Première version stable. Le format `.cadenas` v1 est désormais figé : les fichiers
chiffrés avec cette version resteront lisibles par toutes les versions futures.

En résumé :

- **Site** 100 % navigateur pour chiffrer / déchiffrer un fichier avec un mot de passe,
  en ligne sur <https://pierreebele.github.io/cadenas/>.
- **Image Docker** auto-hébergeable : `docker run -p 8080:8080 ghcr.io/pierreebele/cadenas`.
- **Ligne de commande** : `cadenas lock` / `cadenas unlock`.
- **Format `.cadenas` v1** (Argon2id + XChaCha20-Poly1305), spécifié dans `docs/FORMAT.md`.
- **Compatibilité age** en lecture et en écriture.

### Ajouté

- README complet : utilisation du site, hébergement Docker, ligne de commande, comparaison des formats, sécurité, API, développement.
- `CONTRIBUTING.md` : principes du projet, règles d'évolution du format, processus de publication.

## [0.7.0] - 2026-09-27

### Ajouté

- Intégration continue GitHub Actions (`.github/workflows/ci.yml`) :
  - tests et build sur Linux, Windows et macOS avec Node.js 22 et 24 ;
  - interopérabilité réelle avec l'outil `age` officiel, dans les deux sens ;
  - construction de l'image Docker et vérification des en-têtes de sécurité, du contenu servi et de l'exécution non-root.
- Déploiement automatique du site sur GitHub Pages à chaque push sur `main` (`pages.yml`).
- Publication de l'image sur GitHub Container Registry à chaque version, pour `linux/amd64` et `linux/arm64` (`docker.yml`).

### Modifié

- Node.js 22 minimum (Node.js 20 n'est plus maintenu depuis avril 2026).

## [0.6.0] - 2026-09-27

### Ajouté

- Interface en ligne de commande `cadenas` (`bin/cadenas.js`, aucune dépendance supplémentaire) :
  - `cadenas lock <fichier>` → `<fichier>.cadenas`, ou `<fichier>.age` avec `--age` ;
  - `cadenas unlock <fichier>` : format détecté automatiquement ;
  - alias `encrypt` / `decrypt` ;
  - options `-o/--output`, `-f/--force`, `--password-stdin`, `-h/--help`, `-v/--version`.
- Saisie masquée du mot de passe avec confirmation (`src/prompt.js`).
- Écriture atomique : en cas de mauvais mot de passe ou de fichier altéré, aucun fichier partiel n'est laissé.
- Refus d'écraser un fichier existant sans `-f`.
- Progression affichée dans le terminal ; codes de sortie 0 (succès), 1 (erreur), 2 (mauvaise utilisation), 130 (annulation).
- Tests de la CLI de bout en bout (processus réels).
- `package.json` : champs `bin`, `exports` et `files` pour une future publication npm.

## [0.5.0] - 2026-09-27

### Ajouté

- Image Docker auto-hébergeable (`Dockerfile`) :
  - construction en deux étapes : Vite dans `node:24-alpine`, puis service par `nginx-unprivileged` (utilisateur non-root, port 8080) ;
  - le conteneur ne sert que des fichiers statiques : le serveur ne voit jamais ni fichier ni mot de passe ;
  - vérification de santé intégrée.
- Configuration nginx (`docker/`) : en-têtes de sécurité stricts, dont une CSP `connect-src 'none'` qui interdit techniquement à la page toute connexion réseau ; cache long pour les fichiers versionnés ; aucun journal d'accès.
- `compose.yaml` : lancement en une commande, conteneur en lecture seule sans privilèges.
- La même CSP est injectée dans le HTML au build, pour les hébergeurs sans en-têtes personnalisés (GitHub Pages).

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

[Non publié]: https://github.com/PierreEbele/cadenas/compare/v1.4.1...HEAD
[1.4.1]: https://github.com/PierreEbele/cadenas/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/PierreEbele/cadenas/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/PierreEbele/cadenas/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/PierreEbele/cadenas/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/PierreEbele/cadenas/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/PierreEbele/cadenas/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/PierreEbele/cadenas/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/PierreEbele/cadenas/compare/v0.7.0...v1.0.0
[0.7.0]: https://github.com/PierreEbele/cadenas/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/PierreEbele/cadenas/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/PierreEbele/cadenas/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/PierreEbele/cadenas/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/PierreEbele/cadenas/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/PierreEbele/cadenas/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/PierreEbele/cadenas/releases/tag/v0.1.0
