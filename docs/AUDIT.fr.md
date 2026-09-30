# Périmètre de l'audit de sécurité

[English](AUDIT.md) · **Français**

cadenas n'a pas encore été audité par des spécialistes indépendants. Ce
document est le cahier des charges de cet audit : ce qu'est cadenas, ce qu'il
faut relire, et les questions auxquelles nous voulons le plus une réponse. Il
s'adresse aux auditeurs et aux programmes qui financent l'audit de logiciels
libres de sécurité.

## Le projet en un paragraphe

cadenas chiffre un fichier avec un mot de passe. Il fonctionne comme site
statique (tout se passe dans le navigateur, rien n'est envoyé sur le réseau),
comme outil en ligne de commande (Node.js, ou exécutables autonomes) et comme
bibliothèque. Il écrit son propre format, `.cadenas` (Argon2id, HKDF-SHA256,
HMAC-SHA256 et XChaCha20-Poly1305 en construction STREAM), et lit et écrit le
format à phrase de passe d'[age](https://age-encryption.org) pour
l'interopérabilité. Licence MIT. Environ 1 500 lignes de JavaScript dans le
périmètre, 5 dépendances d'exécution.

## Objectifs de sécurité

Repris de [SECURITY.fr.md](../SECURITY.fr.md) et de
l'[argumentaire de sécurité](ASSURANCE.fr.md) :

1. **Confidentialité** : sans le mot de passe, le contenu d'un fichier
   chiffré est illisible.
2. **Intégrité** : toute modification, troncature ou réorganisation d'un
   fichier chiffré est détectée, et cadenas ne rend jamais un contenu altéré.
3. **Localité** : sur le site, ni les fichiers ni les mots de passe ne
   quittent l'appareil.

Le modèle de menace, les frontières de confiance et les limites connues sont
dans [ASSURANCE.fr.md](ASSURANCE.fr.md).

## Dans le périmètre

| Domaine | Fichiers | Lignes |
|---|---|---:|
| Spécification du format `.cadenas` | [docs/FORMAT.fr.md](FORMAT.fr.md) | — |
| Implémentation du format `.cadenas` | `src/format-cadenas.js` | 319 |
| Format age à phrase de passe (adaptateur autour d'`age-encryption`) | `src/format-age.js` | 104 |
| Détection du format, utilitaires de flux, API publique | `src/detect.js`, `src/bytes.js`, `src/core.js` | 179 |
| Archives zip de plusieurs fichiers (nettoyage des chemins) | `src/archive.js` | 90 |
| Génération de phrases de passe (tirage uniforme, entropie) | `src/passphrase.js` | 65 |
| Site : worker de chiffrement, service worker (cache hors ligne, téléchargements en flux) | `web/worker.js`, `web/sw-template.js` | ~250 |
| Site : politique de sécurité du contenu (CSP) | `vite.config.js`, `docker/security-headers.conf`, `docker/nginx.conf` | — |
| CLI : saisie du mot de passe, fichiers produits (aucun fichier partiel en cas d'erreur) | `bin/cadenas.js`, `src/prompt.js` | ~500 |

## Hors du périmètre

- Les primitives cryptographiques et leurs implémentations :
  `@noble/ciphers`, `@noble/hashes` (tous deux audités indépendamment),
  `hash-wasm` (Argon2id) et `age-encryption` (l'implémentation TypeScript de
  référence d'age). Leur *utilisation* par cadenas fait partie du périmètre.
- L'interface de la page (`web/main.js`, `web/index.html`), sauf là où elle
  manipule des secrets ou le téléchargement des résultats.
- La chaîne de publication. Elle est décrite dans
  [SECURITY.fr.md](../SECURITY.fr.md) (tags signés, provenance, build du site
  reproductible) et peut faire l'objet d'un lot séparé, facultatif.

## Questions pour les auditeurs

1. **Format** : la construction décrite dans [FORMAT.fr.md](FORMAT.fr.md)
   est-elle solide ? En particulier le MAC de l'en-tête et son rôle d'AAD
   pour chaque bloc, la séparation des clés par HKDF, le préfixe de nonce
   aléatoire de 16 octets avec un compteur de 64 bits et le marqueur de
   dernier bloc, et le traitement des fichiers vides et des fichiers dont la
   taille est un multiple de la taille des blocs.
2. **Implémentation et spécification** : `src/format-cadenas.js`
   implémente-t-il exactement la spécification, y compris chaque règle de
   rejet (bornes des paramètres Argon2id vérifiées avant la dérivation de
   clé, versions inconnues, fichiers tronqués ou prolongés, blocs finaux
   vides) ?
3. **Flux** : des données déchiffrées peuvent-elles être rendues avant
   d'être authentifiées ? Un fichier tronqué peut-il être présenté comme
   complet, dans la CLI (fichier temporaire puis renommage), sur la sortie
   standard, et sur le site (en mémoire, File System Access, ou en flux par
   le service worker) ?
4. **Mots de passe** : normalisation Unicode NFC, refus des mots de passe
   vides, clés effacées après usage autant que le langage le permet, aucune
   journalisation.
5. **Isolation du site** : la CSP (`connect-src 'none'`, aucun script en
   ligne, iframes limitées au site lui-même) empêche-t-elle vraiment la page
   d'envoyer des données ? Le service worker (qui peut transporter des
   résultats en flux, jamais de mot de passe) est-il un nouveau risque ?
6. **Archives** : le « zip slip » est-il exclu dans les archives que crée
   cadenas ?
7. **Déni de service** : un fichier forgé peut-il faire consommer à cadenas
   une mémoire ou un temps sans limite ?

## Ce qui existe déjà pour aider

- Un vecteur de test exact à l'octet près
  ([test/fixtures/vector-v1.json](../test/fixtures/vector-v1.json)) et une
  implémentation minimale indépendante qui sert de contre-vérification
  (`test/reference.test.js`).
- Des tests de propriétés avec fast-check sur des entrées aléatoires et
  altérées (`test/properties.test.js`).
- Des tests d'interopérabilité avec l'outil `age` officiel (CI) et des tests
  de bout en bout du site dans Chromium, Firefox et WebKit (`e2e/`).
- CodeQL (`security-extended`), ESLint, couverture des tests d'au moins
  80 %, le tout dans la CI.

## Livrables attendus

- Un rapport publiable en entier, où chaque constat est noté.
- Une contre-vérification des corrections.

Le rapport sera publié dans ce dépôt, avec un lien depuis le README,
SECURITY.md et FORMAT.md. Toute vulnérabilité est traitée selon la procédure
de [SECURITY.fr.md](../SECURITY.fr.md).

## Programmes qui financent l'audit de logiciels libres

À contacter, avec ce document :

- [OSTIF](https://ostif.org) (Open Source Technology Improvement Fund)
- [Open Technology Fund](https://www.opentech.fund), Red Team Lab
- [NLnet](https://nlnet.nl), programmes NGI Zero, dont les bénéficiaires
  peuvent obtenir un audit de sécurité
- [Alpha-Omega](https://alpha-omega.dev) (OpenSSF)

## Contact

Pierre Ebele, mainteneur — [@PierreEbele](https://github.com/PierreEbele).
